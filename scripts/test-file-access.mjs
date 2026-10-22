import assert from 'node:assert/strict';
import { pickJson, saveJson } from '../src/fileAccess.js';
const calls = [], writes = [];
const input = { getFile: async () => ({ name: 'test.json' }) };
const output = { createWritable: async () => ({ write: async value => writes.push(value), close: async () => writes.push('closed') }) };
globalThis.window = {
  showOpenFilePicker: async options => { calls.push(options); return [input]; },
  showSaveFilePicker: async options => { calls.push(options); return output; },
};
assert.equal((await pickJson()).name, 'test.json');
await pickJson();
assert.equal(calls[1].startIn, input);
await saveJson('{"name":"level"}', 'level.json');
await saveJson('{}', 'other.json');
assert.equal(calls[3].startIn, output);
assert.notEqual(calls[0].id, calls[2].id);
assert.equal(calls[2].suggestedName, 'level.json');
assert.deepEqual(writes, ['{"name":"level"}', 'closed', '{}', 'closed']);
window.showOpenFilePicker = async () => { throw new DOMException('Cancelled', 'AbortError'); };
await assert.rejects(pickJson(), { name: 'AbortError' });
console.log('File picker checks passed: separate import/export locations, repeated use, writes and cancellation.');
