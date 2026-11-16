import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateRoomId, ROOM_ID_PATTERN } from '../src/utils/roomId.js';

test('room ids match the xxx-xxxx-xxx pattern', () => {
  for (let i = 0; i < 200; i++) assert.match(generateRoomId(), ROOM_ID_PATTERN);
});

test('room ids are effectively unique', () => {
  const ids = new Set(Array.from({ length: 2000 }, generateRoomId));
  assert.equal(ids.size, 2000);
});
