import { randomInt } from 'node:crypto';

// No look-alike characters (0/o, 1/l/i) so codes are easy to read out loud.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

const chunk = (n) => Array.from({ length: n }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');

/** Meet-style room code, e.g. "kqf-m7xa-r3d" */
export const generateRoomId = () => `${chunk(3)}-${chunk(4)}-${chunk(3)}`;

export const ROOM_ID_PATTERN = /^[a-z0-9]{3}-[a-z0-9]{4}-[a-z0-9]{3}$/;
