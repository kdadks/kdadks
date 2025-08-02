# Documentation Management Scripts

This directory contains automated scripts for managing PDF Branding related documentation.

## 🎯 Purpose

These scripts automatically merge all PDF Branding related `.md` files into a comprehensive documentation file and archive the individual files to maintain a clean project structure.

## 📁 Scripts Available

### 1. `merge-pdf-docs.js` (Node.js - Recommended)
- **Platform**: Cross-platform (Windows, macOS, Linux)
- **Usage**: `npm run merge-pdf-docs`
- **Features**: 
  - Automatic detection of PDF Branding related `.md` files
  - Timestamped archiving
  - Console output with progress indicators
  - Integrated with npm scripts

### 2. `merge-pdf-docs.bat` (Windows Batch)
- **Platform**: Windows only
- **Usage**: Double-click or run `merge-pdf-docs.bat` from command prompt
- **Features**: 
  - Native Windows implementation
  - Visual progress indicators
  - Automatic pause at completion

### 3. `merge-pdf-docs.sh` (Bash Script)
- **Platform**: Unix-like systems (macOS, Linux, WSL)
- **Usage**: `chmod +x merge-pdf-docs.sh && ./merge-pdf-docs.sh`
- **Features**: 
  - Unix shell implementation
  - Colored output
  - Detailed file listing

## 🔍 Detection Patterns

The scripts automatically detect files matching these patterns:
- `*PDF*BRANDING*`
- `*HEADER*FOOTER*`
- `*IMAGE*DELETION*`
- `*EMAIL*PDF*`
- `*DUPLICATE*TEXT*`
- `*LAYOUT*ENHANCEMENT*`
- `*OVERLAY*FIXES*`

## 📋 Process Flow

1. **Scan**: Searches root directory for PDF Branding related `.md` files
2. **Merge**: Combines all files into `docs/PDF_BRANDING_SYSTEM_COMPLETE.md`
3. **Archive**: Moves original files to `docs/archive/TIMESTAMP/`
4. **Report**: Shows summary of processed files

## 🚀 Usage Examples

### Automatic Execution (Recommended)
```bash
npm run merge-pdf-docs
```

### Manual Execution
```bash
# Windows
scripts\merge-pdf-docs.bat

# Unix/Linux/macOS
chmod +x scripts/merge-pdf-docs.sh
./scripts/merge-pdf-docs.sh

# Node.js (any platform)
node scripts/merge-pdf-docs.js
```

## 📄 Output Structure

```
docs/
├── PDF_BRANDING_SYSTEM_COMPLETE.md  # Comprehensive merged documentation
└── archive/
    └── YYYYMMDD_HHMMSS/              # Timestamped archive folder
        ├── PDF_BRANDING_FIXES_COMPLETE.md
        ├── HEADER_FOOTER_OVERLAY_FIXES_COMPLETE.md
        ├── EMAIL_PDF_CONSISTENCY_FIXES_COMPLETE.md
        └── ... (other archived files)
```

## 🔄 Automation

### When to Run
- After implementing new PDF Branding features
- When new `.md` files are generated in the root directory
- During documentation cleanup
- Before major releases

### Integration Options
1. **Manual**: Run `npm run merge-pdf-docs` when needed
2. **Pre-commit Hook**: Add to git hooks for automatic execution
3. **CI/CD**: Include in build pipeline for documentation maintenance

## 🛠️ Customization

### Adding New Patterns
Edit the `pdfPatterns` array in `merge-pdf-docs.js`:
```javascript
const pdfPatterns = [
  /.*PDF.*BRANDING.*/i,
  /.*YOUR_NEW_PATTERN.*/i,  // Add your pattern here
  // ... existing patterns
];
```

### Changing Output Location
Modify the `docsDir` variable:
```javascript
const docsDir = path.join(rootDir, 'documentation'); // Change from 'docs'
```

## 📈 Benefits

### For Developers
- ✅ **Automated Documentation**: No manual file management
- ✅ **Clean Root Directory**: Keeps project structure organized
- ✅ **Version History**: Timestamped archives preserve history
- ✅ **Easy Integration**: Works with existing npm workflows

### For Documentation
- ✅ **Comprehensive View**: Single file with all PDF branding information
- ✅ **Structured Content**: Organized with table of contents
- ✅ **Historical Tracking**: Archived versions show evolution
- ✅ **Search Friendly**: Single file easier to search and reference

## 🚨 Important Notes

- **Backup**: Original files are moved to archive, not deleted
- **Non-destructive**: Can be reversed by moving files back from archive
- **README.md**: Specifically excluded from processing
- **Case-insensitive**: Pattern matching works regardless of case

## 🔧 Troubleshooting

### No Files Found
- Check if `.md` files exist in root directory
- Verify file names match the detection patterns
- Ensure files are not already in the docs directory

### Permission Errors
- Windows: Run as Administrator if needed
- Unix: Ensure execute permissions with `chmod +x`
- Node.js: Check file system permissions

### Script Errors
- Verify Node.js is installed for `.js` script
- Check that npm dependencies are installed
- Ensure all paths are accessible

---

**Status**: ✅ **Ready for Use** - All scripts tested and ready for documentation management automation.
