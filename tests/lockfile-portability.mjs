import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

// Offline check: installation must work on Render and other external hosts too.
const lock = JSON.parse(await readFile(new URL('../package-lock.json', import.meta.url), 'utf8'));
for (const [name, entry] of Object.entries(lock.packages)) {
  if (!name) continue;
  assert.ok(entry.resolved, `Missing archive URL for ${name}`);
  const url = new URL(entry.resolved);
  assert.equal(url.protocol, 'https:', `Insecure dependency archive for ${name}`);
  assert.equal(url.hostname, 'registry.npmjs.org', `Non-portable registry for ${name}`);
  assert.ok(entry.integrity, `Missing integrity for ${name}`);
}
console.log('PASS: dependency lockfile uses public HTTPS archives with integrity checks');
