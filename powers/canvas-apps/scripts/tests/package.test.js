'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const { validatePackage, ACCEPTANCE_VALIDATOR, PACKAGE_ROOT } = require('../validate-package');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'canvas-package-'));
  fs.cpSync(PACKAGE_ROOT, root, { recursive: true });
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test('portable package checks pass without claiming app readiness', () => {
  const result = validatePackage();
  assert.deepEqual(result.errors, []);
  if (!result.acceptanceValidatorAvailable) {
    assert.match(result.warnings.join('\n'), /Acceptance Validator Unavailable/);
  }
});

test('missing acceptance validator fails authoring but not packaging', (t) => {
  const root = fixture(t);
  fs.rmSync(path.join(root, ACCEPTANCE_VALIDATOR), { force: true, recursive: true });
  assert.deepEqual(validatePackage(root).errors, []);
  assert.match(validatePackage(root, { authoring: true }).errors.join('\n'), /app authoring is blocked/);
});

test('a directory is not an acceptance validator', (t) => {
  const root = fixture(t);
  fs.rmSync(path.join(root, ACCEPTANCE_VALIDATOR), { force: true, recursive: true });
  fs.mkdirSync(path.join(root, ACCEPTANCE_VALIDATOR));
  assert.equal(validatePackage(root, { authoring: true }).acceptanceValidatorAvailable, false);
});

test('metadata drift is rejected', (t) => {
  const root = fixture(t);
  const file = path.join(root, 'plugin.json');
  const manifest = JSON.parse(fs.readFileSync(file));
  manifest.version = '99.0.0';
  fs.writeFileSync(file, JSON.stringify(manifest));
  assert.match(validatePackage(root).errors.join('\n'), /portable metadata/);
});

test('nonstandard MCP transport or launcher is rejected', (t) => {
  const root = fixture(t);
  const file = path.join(root, 'mcp.json');
  const config = JSON.parse(fs.readFileSync(file));
  config.mcpServers['canvas-authoring'].type = 'http';
  config.mcpServers['canvas-authoring'].args = ['unrelated-package'];
  fs.writeFileSync(file, JSON.stringify(config));
  assert.match(validatePackage(root).errors.join('\n'), /portable MCP launcher/);
});

test('missing bundled reference is rejected', (t) => {
  const root = fixture(t);
  fs.rmSync(path.join(root, 'references/BehaviorGuide.md'));
  assert.match(validatePackage(root).errors.join('\n'), /references missing references\/BehaviorGuide.md/);
});

test('missing host bootstrap is rejected', (t) => {
  const root = fixture(t);
  const file = path.join(root, 'skills/add-data-source/SKILL.md');
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('[HostCompatibility.md]', '[removed]'));
  assert.match(validatePackage(root).errors.join('\n'), /skill entry points/);
});

test('both specialist instruction files are required', (t) => {
  const root = fixture(t);
  fs.rmSync(path.join(root, 'agents/canvas-app-planner.md'));
  assert.match(validatePackage(root).errors.join('\n'), /host and safety contracts/);
});

test('authoring guard must precede workspace synchronization', (t) => {
  const root = fixture(t);
  const file = path.join(root, 'skills/canvas-app/SKILL.md');
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').replace('## Authoring readiness', '## Removed readiness'));
  assert.match(validatePackage(root).errors.join('\n'), /host and safety contracts/);
});

test('CLI reports missing validator with a failing exit code', (t) => {
  const root = fixture(t);
  fs.rmSync(path.join(root, ACCEPTANCE_VALIDATOR), { force: true, recursive: true });
  const result = spawnSync(process.execPath, [path.join(root, 'scripts/validate-package.js'), '--authoring'],
    { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Acceptance Validator Unavailable/);
  assert.doesNotMatch(result.stdout, /checks passed/);
});

test('CLI rejects misspelled readiness flags', () => {
  const result = spawnSync(process.execPath, [path.join(PACKAGE_ROOT, 'scripts/validate-package.js'), '--author'],
    { encoding: 'utf8' });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Usage:/);
});
