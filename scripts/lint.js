#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..');
const srcDir = path.join(projectRoot, 'src');

// Check if src directory exists and has TypeScript files
let hasSrcFiles = false;
if (fs.existsSync(srcDir)) {
  const srcFiles = fs.readdirSync(srcDir, { recursive: true })
    .filter(f => f.endsWith('.ts'));
  hasSrcFiles = srcFiles.length > 0;
}

// Check if tests directory exists and has TypeScript files
const testsDir = path.join(projectRoot, 'tests');
let hasTestFiles = false;
if (fs.existsSync(testsDir)) {
  const testFiles = fs.readdirSync(testsDir, { recursive: true })
    .filter(f => f.endsWith('.ts'));
  hasTestFiles = testFiles.length > 0;
}

const args = process.argv.slice(2);
const isFix = args.includes('--fix');

if (!hasSrcFiles && !hasTestFiles) {
  console.log('No TypeScript files to lint.');
  process.exit(0);
}

const command = [
  'eslint',
  hasSrcFiles ? 'src' : null,
  hasTestFiles ? 'tests' : null,
  '--ext', '.ts',
  isFix ? '--fix' : null,
].filter(Boolean).join(' ');

try {
  execSync(command, { stdio: 'inherit', cwd: projectRoot });
} catch (error) {
  process.exit(error.status || 1);
}
