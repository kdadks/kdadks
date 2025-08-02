#!/bin/bash

# PDF Branding Documentation Merger Script
# This script automatically merges all PDF branding related .md files and moves them to docs folder

echo "🔍 Scanning for PDF Branding related .md files..."

# Define patterns for PDF Branding related files
PDF_PATTERNS=(
    "*PDF*BRANDING*"
    "*HEADER*FOOTER*"
    "*IMAGE*DELETION*"
    "*EMAIL*PDF*"
    "*DUPLICATE*TEXT*PDF*"
    "*LAYOUT*ENHANCEMENT*"
    "*OVERLAY*FIXES*"
)

# Find all .md files in root directory matching patterns
FOUND_FILES=()
for pattern in "${PDF_PATTERNS[@]}"; do
    for file in $pattern.md; do
        if [[ -f "$file" && "$file" != "README.md" ]]; then
            FOUND_FILES+=("$file")
            echo "  ✅ Found: $file"
        fi
    done
done

# Check if any files were found
if [ ${#FOUND_FILES[@]} -eq 0 ]; then
    echo "  ℹ️  No PDF Branding related .md files found in root directory"
    exit 0
fi

echo ""
echo "📋 Found ${#FOUND_FILES[@]} PDF Branding related files"

# Create docs directory if it doesn't exist
mkdir -p docs
mkdir -p docs/archive

# Get current timestamp for backup
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
ARCHIVE_DIR="docs/archive/$TIMESTAMP"
mkdir -p "$ARCHIVE_DIR"

echo ""
echo "📝 Merging files into comprehensive documentation..."

# Start building the merged content
MERGED_FILE="docs/PDF_BRANDING_SYSTEM_COMPLETE.md"
cat > "$MERGED_FILE" << 'EOF'
# PDF BRANDING SYSTEM - COMPLETE IMPLEMENTATION GUIDE

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

EOF

# Add each file's content to the merged document
for file in "${FOUND_FILES[@]}"; do
    echo "  📄 Processing: $file"
    
    # Add separator and file header
    cat >> "$MERGED_FILE" << EOF

---

### 📄 $file

EOF
    
    # Add the file content (skip the main title line)
    tail -n +2 "$file" >> "$MERGED_FILE"
    
    # Move file to archive
    mv "$file" "$ARCHIVE_DIR/"
    echo "  📦 Archived: $file -> $ARCHIVE_DIR/"
done

# Add footer to merged document
cat >> "$MERGED_FILE" << 'EOF'

---

## 📈 Summary

The PDF Branding System provides a comprehensive solution for professional invoice customization with all features fully implemented and tested.

### **Status**: ✅ **COMPLETE** 
All PDF branding components are fully functional and ready for production use.

---

**Last Updated**: $(date)
**Archive Location**: docs/archive/
**Merged Files**: All PDF branding related documentation
EOF

echo ""
echo "✅ Merge complete!"
echo "  📄 Comprehensive document: $MERGED_FILE"
echo "  📦 Original files archived in: $ARCHIVE_DIR"
echo "  🗂️  Total files processed: ${#FOUND_FILES[@]}"

echo ""
echo "📋 Archive contents:"
ls -la "$ARCHIVE_DIR"

echo ""
echo "🎉 PDF Branding documentation merge completed successfully!"
