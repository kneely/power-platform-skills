'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { build, compare, OUTPUT, SOURCE, bootstrap, readiness } = require('../build-canvas-kiro-power');

function temporary(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'canvas-build-test-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

test('committed Power is a reproducible build', (t) => {
  const expected = temporary(t);
  build(expected);
  assert.deepEqual(compare(expected, OUTPUT), []);
});

test('build preserves all source references and specialist instructions exactly', (t) => {
  const generated = temporary(t);
  build(generated);
  for (const folder of ['references', 'agents']) {
    for (const name of fs.readdirSync(path.join(SOURCE, folder))) {
      const relative = path.join(folder, name);
      assert.deepEqual(fs.readFileSync(path.join(generated, relative)),
        fs.readFileSync(path.join(SOURCE, relative)), relative);
    }
  }
});

test('skill workflow bodies survive additive host adaptation unchanged', (t) => {
  const generated = temporary(t);
  build(generated);
  const body = (content) => content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
  for (const name of fs.readdirSync(path.join(SOURCE, 'skills'))) {
    const relative = path.join('skills', name, 'SKILL.md');
    const sourceBody = body(fs.readFileSync(path.join(SOURCE, relative), 'utf8'));
    const generatedBody = body(fs.readFileSync(path.join(generated, relative), 'utf8'))
      .replace(bootstrap, '').replace(readiness, '');
    assert.equal(generatedBody, sourceBody, relative);
  }
});

test('source manifests stay unchanged and canonical manifest is isolated', (t) => {
  assert.equal(fs.existsSync(path.join(SOURCE, 'plugin.json')), false,
    'upstream now has a canonical manifest: review loader assumptions before updating this test');
  const files = ['.plugin/plugin.json', '.claude-plugin/plugin.json', '.mcp.json', 'hooks.json'];
  const before = files.map((file) => fs.readFileSync(path.join(SOURCE, file)));
  const generated = temporary(t);
  build(generated);
  files.forEach((file, index) => assert.deepEqual(fs.readFileSync(path.join(SOURCE, file)), before[index]));
  assert.ok(fs.existsSync(path.join(generated, 'plugin.json')));
  assert.equal(fs.lstatSync(path.join(generated, 'CLAUDE.md')).isSymbolicLink(), false);
});

test('drift detects missing, changed, extra, and symlink files', (t) => {
  const expected = temporary(t);
  const actual = temporary(t);
  build(expected);
  build(actual);
  fs.rmSync(path.join(actual, 'plugin.json'));
  fs.appendFileSync(path.join(actual, 'README.md'), '\nUnexpected change\n');
  fs.writeFileSync(path.join(actual, 'extra.txt'), 'extra');
  fs.rmSync(path.join(actual, 'CLAUDE.md'));
  fs.symlinkSync('AGENTS.md', path.join(actual, 'CLAUDE.md'));
  const differences = compare(expected, actual);
  for (const file of ['plugin.json', 'README.md', 'extra.txt', 'CLAUDE.md']) {
    assert.ok(differences.includes(file), file);
  }
});
