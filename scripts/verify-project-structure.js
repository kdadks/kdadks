#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.dirname(__dirname);

console.log('🔍 Verifying project structure...\n');

// Check for .md files in root (except README.md)
console.log('📋 Checking for documentation files in root directory...');
const rootFiles = fs.readdirSync(rootDir);
const rootMdFiles = rootFiles.filter(file => 
  file.endsWith('.md') && file !== 'README.md'
);

if (rootMdFiles.length > 0) {
  console.log('❌ Found documentation files in root directory:');
  rootMdFiles.forEach(file => console.log(`  - ${file}`));
  console.log('💡 These should be moved to docs/ folder');
} else {
  console.log('✅ No documentation files found in root (correct!)');
}

// Check for test files in root
console.log('\n🧪 Checking for test files in root directory...');
const testPatterns = [
  /^test-/,
  /^check-/,
  /^debug-/,
  /^investigate-/,
  /^manual-/,
  /^validate-/,
  /^fix-.*\.js$/,
  /^server\.(js|cjs)$/,
  /setup-test/
];

const testFiles = rootFiles.filter(file => 
  testPatterns.some(pattern => pattern.test(file))
);

if (testFiles.length > 0) {
  console.log('❌ Found test/debug files in root directory:');
  testFiles.forEach(file => console.log(`  - ${file}`));
  console.log('💡 These should be removed or moved to appropriate folders');
} else {
  console.log('✅ No test files found in root (correct!)');
}

// Check if tests directory exists
console.log('\n📁 Checking for tests directory...');
const testsDir = path.join(rootDir, 'tests');
if (fs.existsSync(testsDir)) {
  console.log('❌ Tests directory still exists');
  console.log('💡 This directory should be removed');
} else {
  console.log('✅ Tests directory does not exist (correct!)');
}

// Check docs directory
console.log('\n📚 Checking docs directory...');
const docsDir = path.join(rootDir, 'docs');
if (fs.existsSync(docsDir)) {
  const docsFiles = fs.readdirSync(docsDir);
  const docsMdFiles = docsFiles.filter(file => file.endsWith('.md'));
  console.log(`✅ Docs directory exists with ${docsMdFiles.length} .md files`);
} else {
  console.log('❌ Docs directory does not exist');
}

// Summary
console.log('\n📊 Summary:');
if (rootMdFiles.length === 0 && testFiles.length === 0 && !fs.existsSync(testsDir)) {
  console.log('🎉 Project structure is clean and organized!');
  console.log('✅ All documentation is in docs/ folder');
  console.log('✅ No test files in root directory');
  console.log('✅ No tests directory');
} else {
  console.log('⚠️  Project structure needs cleanup');
  console.log('Run the cleanup commands to fix the issues above');
}

console.log('\n💡 To maintain this structure:');
console.log('1. Always add new documentation to docs/ folder');
console.log('2. Remove any test files that appear in root');
console.log('3. Use .gitignore to prevent unwanted files');
console.log('4. Run this verification script regularly');
