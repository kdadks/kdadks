#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 Scanning for PDF Branding related .md files...');

// Define patterns for PDF Branding related files
const pdfPatterns = [
  /.*PDF.*BRANDING.*/i,
  /.*HEADER.*FOOTER.*/i,
  /.*IMAGE.*DELETION.*/i,
  /.*EMAIL.*PDF.*/i,
  /.*DUPLICATE.*TEXT.*/i,
  /.*LAYOUT.*ENHANCEMENT.*/i,
  /.*OVERLAY.*FIXES.*/i
];

// Get current working directory (parent of scripts directory)
const rootDir = path.dirname(__dirname);
const docsDir = path.join(rootDir, 'docs');
const archiveDir = path.join(docsDir, 'archive');

// Create directories if they don't exist
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}
if (!fs.existsSync(archiveDir)) {
  fs.mkdirSync(archiveDir, { recursive: true });
}

// Find all .md files in root directory
const allFiles = fs.readdirSync(rootDir);
const mdFiles = allFiles.filter(file => 
  file.endsWith('.md') && 
  file !== 'README.md' &&
  pdfPatterns.some(pattern => pattern.test(file))
);

if (mdFiles.length === 0) {
  console.log('  ℹ️  No PDF Branding related .md files found in root directory');
  process.exit(0);
}

console.log(`\n📋 Found ${mdFiles.length} PDF Branding related files:`);
mdFiles.forEach(file => console.log(`  ✅ Found: ${file}`));

// Create timestamp for archive
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] + '_' + 
                 new Date().toTimeString().split(' ')[0].replace(/:/g, '');
const timestampArchiveDir = path.join(archiveDir, timestamp);
fs.mkdirSync(timestampArchiveDir, { recursive: true });

console.log('\n📝 Merging files into comprehensive documentation...');

// Start building the merged content
const mergedFilePath = path.join(docsDir, 'PDF_BRANDING_SYSTEM_COMPLETE.md');

const header = `# PDF BRANDING SYSTEM - COMPLETE IMPLEMENTATION GUIDE

> **Comprehensive documentation of all PDF branding features, fixes, and enhancements for KDADKS Invoice Management System**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Recent Updates](#recent-updates)
3. [Technical Architecture](#technical-architecture)
4. [Implementation Details](#implementation-details)
5. [Testing & Verification](#testing--verification)
6. [Build & Deployment](#build--deployment)

---

## 🎯 Overview

The PDF Branding System enables complete customization of invoice PDFs with professional header, footer, and logo images. This system provides:

- **Edge-to-edge image positioning** with maintained aspect ratios
- **Professional text overlays** with proper visibility
- **Smart layout optimization** for different content scenarios
- **Complete consistency** between download and email PDFs
- **Automatic image optimization** to keep PDF size under 2MB
- **Comprehensive storage management** with cleanup capabilities

---

## 📅 Recent Updates

`;

let mergedContent = header;

// Process each file
mdFiles.forEach((file, index) => {
  console.log(`  📄 Processing: ${file}`);
  
  const filePath = path.join(rootDir, file);
  const fileContent = fs.readFileSync(filePath, 'utf8');
  
  // Add separator and file header
  mergedContent += `\n---\n\n### 📄 ${file}\n\n`;
  
  // Add file content (skip the main title line)
  const lines = fileContent.split('\n');
  const contentWithoutTitle = lines.slice(1).join('\n');
  mergedContent += contentWithoutTitle;
  
  // Move file to archive
  const archiveFilePath = path.join(timestampArchiveDir, file);
  fs.renameSync(filePath, archiveFilePath);
  console.log(`  📦 Archived: ${file} -> ${timestampArchiveDir}/`);
});

// Add footer
const footer = `

---

## 📈 Summary

The PDF Branding System provides a comprehensive solution for professional invoice customization with all features fully implemented and tested.

### **Status**: ✅ **COMPLETE** 
All PDF branding components are fully functional and ready for production use.

---

**Last Updated**: ${new Date().toLocaleString()}
**Archive Location**: docs/archive/
**Merged Files**: All PDF branding related documentation
`;

mergedContent += footer;

// Write the merged file
fs.writeFileSync(mergedFilePath, mergedContent);

console.log('\n✅ Merge complete!');
console.log(`  📄 Comprehensive document: ${mergedFilePath}`);
console.log(`  📦 Original files archived in: ${timestampArchiveDir}`);
console.log(`  🗂️  Total files processed: ${mdFiles.length}`);

console.log('\n📋 Archive contents:');
const archivedFiles = fs.readdirSync(timestampArchiveDir);
archivedFiles.forEach(file => console.log(`  - ${file}`));

console.log('\n🎉 PDF Branding documentation merge completed successfully!');
