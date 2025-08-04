#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.dirname(__dirname);

console.log('🧹 Starting project cleanup...\n');

// Move .md files from root to docs (except README.md)
console.log('📋 Moving documentation files to docs/ folder...');
const docsDir = path.join(rootDir, 'docs');
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
  console.log('📁 Created docs/ directory');
}

const rootFiles = fs.readdirSync(rootDir);
const rootMdFiles = rootFiles.filter(file => 
  file.endsWith('.md') && file !== 'README.md'
);

let movedFiles = 0;
rootMdFiles.forEach(file => {
  const sourcePath = path.join(rootDir, file);
  const destPath = path.join(docsDir, file);
  
  try {
    if (fs.existsSync(destPath)) {
      console.log(`⚠️  ${file} already exists in docs/ - removing from root`);
      fs.unlinkSync(sourcePath);
    } else {
      fs.renameSync(sourcePath, destPath);
      console.log(`📄 Moved: ${file} → docs/`);
    }
    movedFiles++;
  } catch (error) {
    console.log(`❌ Error moving ${file}: ${error.message}`);
  }
});

if (movedFiles === 0) {
  console.log('✅ No documentation files to move');
}

// Remove test files from root
console.log('\n🧪 Removing test files from root...');
const testPatterns = [
  /^test-/,
  /^check-/,
  /^debug-/,
  /^investigate-/,
  /^manual-/,
  /^validate-/,
  /^fix-.*\.js$/,
  /^server\.(js|cjs)$/,
  /setup-test/,
  /inspect-db/,
  /create-user/
];

const testFiles = rootFiles.filter(file => 
  testPatterns.some(pattern => pattern.test(file))
);

let removedFiles = 0;
testFiles.forEach(file => {
  const filePath = path.join(rootDir, file);
  try {
    fs.unlinkSync(filePath);
    console.log(`🗑️  Removed: ${file}`);
    removedFiles++;
  } catch (error) {
    console.log(`❌ Error removing ${file}: ${error.message}`);
  }
});

if (removedFiles === 0) {
  console.log('✅ No test files to remove');
}

// Remove tests directory if it exists
console.log('\n📁 Checking tests directory...');
const testsDir = path.join(rootDir, 'tests');
if (fs.existsSync(testsDir)) {
  try {
    fs.rmSync(testsDir, { recursive: true, force: true });
    console.log('🗑️  Removed tests/ directory');
  } catch (error) {
    console.log(`❌ Error removing tests directory: ${error.message}`);
  }
} else {
  console.log('✅ Tests directory does not exist');
}

// Remove test components
console.log('\n🧪 Checking for test components...');
const testComponentsDir = path.join(rootDir, 'src', 'components', 'test');
if (fs.existsSync(testComponentsDir)) {
  try {
    fs.rmSync(testComponentsDir, { recursive: true, force: true });
    console.log('🗑️  Removed src/components/test/ directory');
  } catch (error) {
    console.log(`❌ Error removing test components: ${error.message}`);
  }
} else {
  console.log('✅ Test components directory does not exist');
}

console.log('\n🎉 Cleanup completed!');
console.log('\n💡 Next steps:');
console.log('1. Run: git add -A');
console.log('2. Run: git commit -m "Clean up project structure"');
console.log('3. Run: git push origin main');
console.log('4. Run: npm run verify-structure to confirm cleanup');
