#!/usr/bin/env node
'use strict';

// Keep the original plugin's loader selection unchanged. Kiro gets a complete
// generated package, not symlinks into a repository it will not have after import.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'plugins/canvas-apps');
const ADAPTER = path.join(ROOT, 'adapters/kiro/canvas-apps');
const OUTPUT = path.join(ROOT, 'powers/canvas-apps');

function files(root, prefix = '') {
  return fs.readdirSync(path.join(root, prefix), { withFileTypes: true }).flatMap((entry) => {
    const relative = path.join(prefix, entry.name);
    // Read source symlinks as bytes below, so Windows installations need no links.
    return entry.isDirectory() ? files(root, relative) : [relative];
  }).sort();
}

function copyRegularFiles(source, destination) {
  for (const relative of files(source)) {
    const target = path.join(destination, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, fs.readFileSync(path.join(source, relative)));
  }
}

const bootstrap = `
## Host compatibility (read first)

Read [HostCompatibility.md](../../references/HostCompatibility.md), resolved relative
to this installed SKILL.md, before following this workflow. It defines package-path
resolution, host tool equivalents, and the sequential specialist fallback. Preserve
every workflow and QA gate below. This guide takes precedence for host mechanics and
the setup-completion message; missing validation never implies authoring readiness.

`;

const PLUGIN_ROOT_TOKEN = '${PLUGIN_ROOT}';
const readiness = `## Authoring readiness (before synchronization or app changes)

Check that \`${PLUGIN_ROOT_TOKEN}/scripts/validate-canvas-acceptance.cs\` exists and is readable.
This is the required acceptance gate from ValidationWorkflow.md; it is absent from
the current upstream package. If unavailable, stop with
\`Status: Acceptance Validator Unavailable\`, show the exact missing path, and explain
that setup and read-only discovery can still be used. Do not synchronize, generate,
edit, or compile app files, fabricate a PASS result, replace the validator with this
package's static packaging tests, or silently downgrade to manual review. Resume
only when the genuine validator and its dependencies are supplied and verified.

`;

function build(destination) {
  fs.mkdirSync(destination, { recursive: true });
  copyRegularFiles(SOURCE, destination);
  copyRegularFiles(ADAPTER, destination);
  const read = (file) => fs.readFileSync(path.join(destination, file), 'utf8');
  const write = (file, content) => fs.writeFileSync(path.join(destination, file), content);
  const manifest = JSON.parse(read('.plugin/plugin.json'));
  manifest.version += '-kiro.1';
  manifest.repository = 'https://github.com/kneely/power-platform-skills/';
  manifest.homepage = manifest.repository;
  for (const name of ['.plugin/plugin.json', '.claude-plugin/plugin.json']) {
    write(name, JSON.stringify(manifest, null, 2) + '\n');
  }
  write('plugin.json', JSON.stringify({
    $schema: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json', ...manifest,
  }, null, 2) + '\n');
  const legacyMcp = JSON.parse(read('.mcp.json'));
  write('mcp.json', JSON.stringify({
    $schema: 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json',
    mcpServers: Object.fromEntries(Object.entries(legacyMcp.mcpServers)
      .map(([name, config]) => [name, { type: 'stdio', ...config }])),
  }, null, 2) + '\n');
  write('LICENSE', fs.readFileSync(path.join(ROOT, 'LICENSE')));

  for (const name of ['canvas-app', 'configure-canvas-mcp', 'add-data-source', 'report-issue']) {
    const file = `skills/${name}/SKILL.md`;
    const original = read(file);
    const match = original.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
    assert.ok(match, `${file}: missing frontmatter`);
    let frontmatter = match[0];
    if (['configure-canvas-mcp', 'add-data-source'].includes(name)) {
      frontmatter = frontmatter.replace('allowed-tools: ', 'allowed-tools: Read, ');
    }
    // Insert host mechanics without rewriting the upstream workflow body.
    let body = original.slice(match[0].length);
    if (name === 'canvas-app') {
      assert.ok(body.includes('## Establish the Workspace'), 'canvas-app workspace anchor changed');
      body = body.replace('## Establish the Workspace', readiness + '## Establish the Workspace');
    }
    write(file, frontmatter + bootstrap + body);
  }

  const intro = '# Generated Canvas Apps Power for Kiro\n\n' +
    'This is a Kiro adapter maintained in the kneely fork, using Microsoft’s MIT-licensed\n' +
    'Canvas workflows. See [the Kiro guide](docs/kiro.md) before using the upstream\n' +
    'instructions below. Import this folder, not the original plugin directory.\n\n' +
    '**Known blocker:** the required upstream acceptance validator is absent. Setup and\n' +
    'discovery are available; app authoring fails closed before mutations. Live Kiro/MCP/\n' +
    'Power Apps runtime behavior has not been verified by packaging tests.\n\n' +
    'Generated by `node scripts/build-canvas-kiro-power.js`; do not edit this copy.\n' +
    'Existing Claude/Copilot users should keep using `plugins/canvas-apps`.\n\n';
  write('README.md', intro + read('README.md').replace('[LICENSE](../../LICENSE)', '[LICENSE](LICENSE)'));
  const agentIntro = '# Kiro distribution guidance\n\n' +
    'Read `references/HostCompatibility.md` first. It overrides host-specific tool\n' +
    'mechanics and setup claims below without weakening workflow/QA gates. This is a\n' +
    'generated Kiro package; original plugin clients retain their separate installation.\n\n';
  write('AGENTS.md', agentIntro + read('AGENTS.md'));
  write('CLAUDE.md', read('AGENTS.md'));
}

function compare(expected, actual) {
  if (!fs.existsSync(actual)) return ['generated directory is missing'];
  const expectedFiles = files(expected);
  const actualFiles = files(actual);
  const all = [...new Set([...expectedFiles, ...actualFiles])].sort();
  return all.filter((file) => !expectedFiles.includes(file) || !actualFiles.includes(file) ||
    fs.lstatSync(path.join(actual, file)).isSymbolicLink() ||
    !fs.readFileSync(path.join(expected, file)).equals(fs.readFileSync(path.join(actual, file))));
}

if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== '--check')) {
    console.error('Usage: node scripts/build-canvas-kiro-power.js [--check]');
    process.exitCode = 2;
  } else {
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'canvas-kiro-build-'));
    try {
      build(temporary);
      if (args.includes('--check')) {
        const differences = compare(temporary, OUTPUT);
        if (differences.length) {
          console.error('Canvas Kiro Power is out of date:\n' + differences.join('\n'));
          process.exitCode = 1;
        } else console.log('Canvas Kiro Power matches its source and adapter.');
      } else {
        // Only this explicitly generated directory is replaced. Source and adapter
        // trees are never modified; edit the adapter, not generated output.
        fs.rmSync(OUTPUT, { recursive: true, force: true });
        copyRegularFiles(temporary, OUTPUT);
        console.log('Generated powers/canvas-apps. Run package checks before committing.');
      }
    } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
  }
}

module.exports = { build, compare, OUTPUT, SOURCE, bootstrap, readiness };
