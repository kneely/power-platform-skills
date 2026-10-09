#!/usr/bin/env node
'use strict';

// Packaging checks must not masquerade as the missing upstream app validator.
// Normal mode checks distribution integrity; --authoring separately fails closed
// when that required file is absent. Neither mode executes Power Apps operations.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const PACKAGE_ROOT = path.resolve(__dirname, '..');
const ACCEPTANCE_VALIDATOR = 'scripts/validate-canvas-acceptance.cs';
const SKILLS = ['add-data-source', 'canvas-app', 'configure-canvas-mcp', 'report-issue'];

function filesBelow(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) return []; // CLAUDE.md is a legacy AGENTS.md alias.
    return entry.isDirectory() ? filesBelow(file) : [file];
  });
}

function validatePackage(root = PACKAGE_ROOT, { authoring = false } = {}) {
  const errors = [];
  const warnings = [];
  const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
  const json = (relative) => JSON.parse(read(relative));
  const check = (name, action) => {
    try { action(); } catch (error) { errors.push(`${name}: ${error.message}`); }
  };

  check('portable metadata', () => {
    const { $schema, ...manifest } = json('plugin.json');
    assert.equal($schema, 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json');
    assert.deepEqual(manifest, json('.plugin/plugin.json'));
    assert.deepEqual(manifest, json('.claude-plugin/plugin.json'));
    assert.equal(manifest.name, 'canvas-apps');
    assert.match(manifest.version, /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/);
    assert.deepEqual(Object.keys(manifest).sort(),
      ['name', 'version', 'description', 'author', 'homepage', 'repository', 'license', 'keywords'].sort());
    for (const key of ['description', 'homepage', 'repository', 'license']) {
      assert.equal(typeof manifest[key], 'string');
      assert.ok(manifest[key].trim(), `${key} must not be blank`);
    }
    assert.equal(typeof manifest.author.name, 'string');
    assert.ok(manifest.author.name.trim());
    assert.ok(Object.keys(manifest.author).every((key) => ['name', 'email', 'url'].includes(key)));
    assert.ok(Object.values(manifest.author).every((value) => typeof value === 'string'));
    assert.ok(Array.isArray(manifest.keywords) && manifest.keywords.length > 0);
    assert.ok(manifest.keywords.every((word) => typeof word === 'string' && word === word.toLowerCase()));
  });

  check('portable MCP launcher', () => {
    const canonical = json('mcp.json');
    assert.equal(canonical.$schema, 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json');
    assert.deepEqual(Object.keys(canonical).sort(), ['$schema', 'mcpServers']);
    assert.deepEqual(Object.keys(canonical.mcpServers), ['canvas-authoring']);
    const { type, ...launcher } = canonical.mcpServers['canvas-authoring'];
    assert.equal(type, 'stdio');
    assert.deepEqual(launcher, json('.mcp.json').mcpServers['canvas-authoring']);
    assert.deepEqual(launcher, {
      command: 'dnx', args: ['Microsoft.PowerApps.CanvasAuthoring.McpServer', '--yes'],
    });
  });

  check('skill entry points', () => {
    const skills = fs.readdirSync(path.join(root, 'skills'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
    assert.deepEqual(skills, SKILLS);
    for (const name of SKILLS) {
      const content = read(`skills/${name}/SKILL.md`);
      assert.match(content, /^---\r?\n/);
      assert.match(content, new RegExp(`^name: ${name}$`, 'm'));
      assert.match(content, /^description:/m);
      assert.ok(content.includes('[HostCompatibility.md](../../references/HostCompatibility.md)'));
    }
  });

  check('reference closure', () => {
    // Prose paths use a verified installed root, not runtime shell expansion.
    // The sole known upstream omission stays visible below, including in strict mode.
    for (const file of filesBelow(root).filter((file) => file.endsWith('.md'))) {
      const content = fs.readFileSync(file, 'utf8');
      for (const match of content.matchAll(/\$\{PLUGIN_ROOT\}\/([A-Za-z0-9/._-]+)/g)) {
        if (match[1] === ACCEPTANCE_VALIDATOR) continue;
        assert.ok(fs.existsSync(path.join(root, match[1])),
          `${path.relative(root, file)} references missing ${match[1]}`);
      }
    }
  });

  check('host and safety contracts', () => {
    const guide = read('references/HostCompatibility.md');
    for (const marker of ['sequentially', '44 named QA checks', 'actual permission denial',
      'namespaces', 'Missing UI widgets never imply approval', 'kneely/power-platform-skills']) {
      assert.ok(guide.includes(marker), `missing host contract: ${marker}`);
    }
    const skill = read('skills/canvas-app/SKILL.md');
    const readiness = skill.indexOf('## Authoring readiness');
    const workspace = skill.indexOf('## Establish the Workspace');
    assert.ok(readiness >= 0 && workspace > readiness);
    assert.ok(skill.includes('Status: Acceptance Validator Unavailable'));
    assert.ok(skill.includes('Do not synchronize, generate,'));
    assert.ok(read('docs/kiro.md').includes('Status: Acceptance Validator Unavailable'));
    for (const role of ['canvas-app-planner', 'canvas-screen-builder']) {
      assert.ok(read(`agents/${role}.md`).includes(`name: ${role}`));
    }
    assert.ok(read('references/QAChecks.md').includes('QACHK-SHARED-SOURCE-DERIVATION'));
    assert.ok(read('LICENSE').includes('Copyright (c) Microsoft Corporation.'));
  });

  let acceptanceValidatorAvailable = false;
  try {
    const target = path.join(root, ACCEPTANCE_VALIDATOR);
    acceptanceValidatorAvailable = fs.statSync(target).isFile();
    fs.accessSync(target, fs.constants.R_OK);
  } catch { acceptanceValidatorAvailable = false; }
  if (!acceptanceValidatorAvailable) {
    const message = `Acceptance Validator Unavailable: ${ACCEPTANCE_VALIDATOR}; app authoring is blocked`;
    (authoring ? errors : warnings).push(message);
  }
  return { errors, warnings, acceptanceValidatorAvailable };
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--authoring')) {
    console.error('Usage: node validate-package.js [--authoring]');
    process.exitCode = 2;
  } else {
    const result = validatePackage(PACKAGE_ROOT, { authoring: args.includes('--authoring') });
    for (const warning of result.warnings) console.warn(`WARNING: ${warning}`);
    for (const error of result.errors) console.error(`ERROR: ${error}`);
    if (result.errors.length) process.exitCode = 1;
    else console.log('Canvas package checks passed. App acceptance and live runtime evaluation were NOT RUN.');
  }
}

module.exports = { validatePackage, ACCEPTANCE_VALIDATOR, PACKAGE_ROOT };
