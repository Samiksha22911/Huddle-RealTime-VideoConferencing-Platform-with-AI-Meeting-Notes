import { z } from 'zod';
import { env } from '../config/env.js';
import { fallbackSummary } from './fallbackSummary.js';

const resultSchema = z.object({
  summary: z.string().default(''),
  keyPoints: z.array(z.string()).default([]),
  decisions: z.array(z.string()).default([]),
  actionItems: z.array(z.object({ task: z.string(), owner: z.string().default('Unassigned') })).default([]),
});

const SYSTEM_PROMPT = `You write concise, accurate meeting notes.
The input is a speech-to-text transcript (it may contain recognition errors) followed by the in-meeting chat.
Reply with ONLY a JSON object, no markdown, in exactly this shape:
{"summary": string (3-5 sentences), "keyPoints": string[], "decisions": string[], "actionItems": [{"task": string, "owner": string}]}
Rules: use the speaker names given; use "Unassigned" when no owner is clear; never invent facts that are not in the input; use empty arrays when nothing applies.`;

const MAX_CHARS = 60_000; // keep the prompt bounded (and the bill predictable)

export function buildPrompt(meeting) {
  const t = (meeting.transcript || []).map((l) => `${l.speaker}: ${l.text}`).join('\n');
  const c = (meeting.chat || []).map((l) => `${l.sender}: ${l.text}`).join('\n');
  const body = `Meeting title: ${meeting.title}\n\n## Transcript\n${t || '(none)'}\n\n## Chat\n${c || '(none)'}`;
  return body.length > MAX_CHARS ? body.slice(-MAX_CHARS) : body; // keep the most recent part
}

function extractJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON in model reply');
  return JSON.parse(text.slice(start, end + 1));
}

/** Google Gemini (has a free tier). Key: https://aistudio.google.com/apikey */
async function callGemini(meeting) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(env.geminiModel)}:generateContent`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-goog-api-key': env.geminiKey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: buildPrompt(meeting) }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2000,
        responseMimeType: 'application/json',
      },
    }),
  });
  if (!res.ok) throw new Error(`Gemini API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
  return resultSchema.parse(extractJson(text));
}

/** Anthropic Claude (paid). Used only if GEMINI_API_KEY is not set. */
async function callClaude(meeting) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': env.anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: env.anthropicModel,
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildPrompt(meeting) }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('');
  return resultSchema.parse(extractJson(text));
}

/** Returns the summary object to store on the meeting. Never throws for AI failures. */
export async function generateSummary(meeting) {
  let result;
  let source = 'basic';
  const provider = env.geminiKey ? callGemini : env.anthropicKey ? callClaude : null;
  if (provider) {
    try {
      result = await provider(meeting);
      source = 'ai';
    } catch (err) {
      console.error('AI summary failed, using basic notes:', err.message);
    }
  }
  if (!result) result = fallbackSummary(meeting.transcript, meeting.chat);
  return {
    text: result.summary,
    keyPoints: result.keyPoints,
    decisions: result.decisions,
    actionItems: result.actionItems,
    source,
    generatedAt: new Date(),
  };
}
