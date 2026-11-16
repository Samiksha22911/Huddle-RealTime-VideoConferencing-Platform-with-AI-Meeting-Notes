// Rule-based notes used when no AI key is configured (or the AI call fails).
// Pure function on purpose: easy to unit test and easy for you to improve.

const ACTION_RE = /\b(i will|i'll|we will|we'll|need to|needs to|should|must|todo|to-do|action item|going to|let's|please)\b/i;
const DECISION_RE = /\b(decided|we agreed|agreed to|let's go with|we'll go with|final decision)\b/i;

const clean = (s) => String(s || '').replace(/\s+/g, ' ').trim();

/**
 * @param {{speaker:string,text:string}[]} transcript
 * @param {{sender:string,text:string}[]} chat
 */
export function fallbackSummary(transcript = [], chat = []) {
  const lines = [
    ...transcript.map((t) => ({ who: t.speaker, text: clean(t.text) })),
    ...chat.map((c) => ({ who: c.sender, text: clean(c.text) })),
  ].filter((l) => l.text.length > 3);

  const actionItems = lines
    .filter((l) => ACTION_RE.test(l.text))
    .slice(0, 8)
    .map((l) => ({ task: l.text, owner: l.who || 'Unassigned' }));

  const decisions = lines
    .filter((l) => DECISION_RE.test(l.text))
    .slice(0, 5)
    .map((l) => l.text);

  const keyPoints = [...lines]
    .sort((a, b) => b.text.length - a.text.length)
    .slice(0, 5)
    .map((l) => `${l.who}: ${l.text}`);

  const speakers = [...new Set(lines.map((l) => l.who).filter(Boolean))];
  const summary = lines.length
    ? `${speakers.length} participant${speakers.length === 1 ? '' : 's'} (${speakers.join(', ')}) contributed ${lines.length} message${lines.length === 1 ? '' : 's'}. Opening: "${lines[0].text}"`
    : 'No transcript or chat was recorded for this meeting.';

  return { summary, keyPoints, decisions, actionItems };
}
