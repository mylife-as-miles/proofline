// Dependency-free static checks only; no build, browser, backend, or AI calls.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const models = read('src/lib/models.ts');
const reader = read('src/components/reader/Reader.tsx');
const exports = read('src/lib/export.ts');
const readme = read('README.md');
assert.ok(models.includes('label: "Gemini Flash"'));
assert.ok(models.includes('id: "gemini-3.8-flash"'), 'Preserve the existing internal model ID');
assert.ok(models.includes('PLATFORM_MODEL = "gemini_3_flash"'), 'Preserve the runtime model slug');
assert.ok(reader.includes('Proofs are powered by Gemini Flash.'));
assert.ok(!models.includes('Gemini 3.8 Flash') && !reader.includes('Gemini 3.8 Flash'));
for (const text of ['tags: [proofline]', 'Notes from Proofline,', '`Proofline/${base}.md`', '`proofline-notes-${']) {
  assert.ok(exports.includes(text), `Missing export branding: ${text}`);
}
for (const text of ['Notes from Gloss,', '`Gloss/${base}.md`', '`gloss-notes-${']) {
  assert.ok(!exports.includes(text), `Stale export branding: ${text}`);
}
assert.ok(readme.includes('Pushing commits here does not automatically update or publish the live app.'));
assert.ok(readme.includes('[Source recovery and limitations](SOURCE_RECOVERY.md)'));
assert.ok(read('SOURCE_RECOVERY.md').includes('recovery'));
console.log('PASS: submission text, runtime model identifiers, and recovery notice (static checks only).');
