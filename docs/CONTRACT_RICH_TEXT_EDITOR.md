# Contract Rich Text Editor Implementation

## Overview
Implemented a rich text editor for contract section details, allowing admins to easily format text and insert tables with a WYSIWYG interface. Also made Party A and Party B fields readonly in Edit Contract mode since they are fetched from database tables.

## Changes Made

### 1. Rich Text Editor Component
**File**: `src/components/ui/RichTextEditor.tsx`

- Created reusable rich text editor using react-quill
- Features:
  - Text formatting (bold, italic, underline, strike-through)
  - Headers (H1, H2, H3)
  - Lists (ordered and bullet)
  - Text alignment
  - Indentation
  - Links
  - Blockquotes
  - Table insertion via custom button
  - Clean formatting button

**Table Insertion**:
- Custom "Table" button in toolbar
- Inserts a 3x3 table template that users can edit
- Tables are fully editable with proper borders and styling
- Header row with gray background
- Alternating row colors for better readability

### 2. Modal Updates

#### CreateContractModal.tsx
- Imported RichTextEditor component
- Replaced `<textarea>` with `<RichTextEditor>` for section content
- Users can now format text and insert tables visually
- Backward compatible with existing plain text content

#### EditContractModal.tsx
- Imported RichTextEditor component
- Replaced `<textarea>` with `<RichTextEditor>` for section content
- **Party A and Party B fields made readonly**:
  - All Party A fields (name, address, contact, GSTIN, PAN) are readonly
  - All Party B fields (name, address, contact, GSTIN, PAN) are readonly
  - Gray background with cursor-not-allowed to indicate readonly state
  - Helper text shows data source: "(from Company Settings)" and "(from Customer)"
  - Reason: Party A comes from `company_settings` table, Party B comes from `customers` table

### 3. PDF Generator Enhancement
**File**: `src/utils/contractPDFGenerator.ts`

Enhanced to handle both HTML (from rich text editor) and plain text (backward compatibility):

**New Methods**:
- `renderHTMLContent()`: Parses HTML from rich text editor
- `renderHTMLTable()`: Renders HTML tables in PDF
- `renderPlainText()`: Strips HTML tags and renders plain text
- `renderPlainTextContent()`: Handles pipe-format tables (backward compatibility)

**Features**:
- Automatically detects HTML vs plain text
- Extracts and renders HTML tables properly
- Strips HTML tags for text content while preserving structure
- Converts lists to bullet points
- Handles paragraphs with proper spacing
- Maintains table formatting with borders and headers
- Backward compatible with old pipe-format tables (|col1|col2|)

### 4. Styling
**File**: `src/index.css`

- Added `@import 'react-quill/dist/quill.snow.css'` for rich text editor styling
- Custom CSS in RichTextEditor component for:
  - Minimum editor height (200px)
  - Table styling with borders
  - Header row background color
  - Alternating row colors
  - Word wrapping in table cells

## Package Dependencies

Added packages:
```json
{
  "react-quill": "^2.0.0",
  "quill-table-ui": "^0.1.8"
}
```

Install with:
```bash
npm install react-quill quill-table-ui
```

## Usage

### Creating/Editing Contracts

1. Navigate to Contract Management
2. Click "Create Contract" or "Edit" on existing contract
3. Go to "Sections" tab
4. In "Section Content" field:
   - Use toolbar buttons for text formatting
   - Click "⊞ Table" button to insert a table
   - Edit table cells directly in the editor
   - Format text inside table cells
   - Use other formatting options as needed

### Party Information (Edit Mode)

When editing contracts:
- **Party A (First Party)**: All fields are readonly, sourced from Company Settings
- **Party B (Second Party)**: All fields are readonly, sourced from Customer data
- To update party information:
  - Party A: Update Company Settings in admin dashboard
  - Party B: Update Customer record in customer management

## PDF Output

### HTML Tables
Rich text editor tables are rendered in PDF with:
- Proper borders (gray, thin lines)
- Header row with light gray background (240, 240, 240 RGB)
- Bold text for headers
- Automatic column width distribution
- Text wrapping within cells
- 7.5pt font size for table content

### Text Formatting
- Headers, bold, italic preserved in layout
- Lists converted to bullet points with "•" prefix
- Paragraphs properly spaced
- Links stripped (plain text shown)
- Blockquotes rendered as regular text with indentation

## Backward Compatibility

### Pipe-Format Tables
Old contracts with pipe-format tables still work:
```
| Header 1 | Header 2 | Header 3 |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |
```

The PDF generator automatically detects and renders these correctly.

### Plain Text Content
Contracts with plain text content (no HTML) continue to work without any changes.

## Technical Details

### HTML Detection
```typescript
const isHTML = /<[a-z][\s\S]*>/i.test(content);
```

### HTML Table Parsing
- Uses regex to extract `<table>`, `<tr>`, `<th>`, `<td>` elements
- Strips HTML tags from cell content
- Converts HTML entities (&nbsp;, &amp;, etc.)
- Renders in PDF with jsPDF

### Content Rendering Flow
1. Check if content is HTML or plain text
2. If HTML:
   - Extract tables separately
   - Render text between tables
   - Render each table with proper formatting
3. If plain text:
   - Look for pipe-format tables
   - Render tables and text accordingly

## Testing Checklist

- [x] Create new contract with rich text sections
- [x] Insert tables in sections
- [x] Format text (bold, italic, lists, headers)
- [x] Generate PDF and verify formatting
- [x] Edit existing contract with plain text (backward compatibility)
- [x] Edit existing contract with pipe-format tables
- [x] Verify Party A/B fields are readonly in edit mode
- [x] Verify Party A/B fields show correct source labels
- [x] Build project successfully
- [x] Test in development environment

## Known Limitations

1. **Table Editing**: Basic table editing in Quill - no advanced features like merge cells, row/column manipulation
2. **Images**: Image insertion not enabled (can be added if needed)
3. **Colors**: Text color and background color not enabled (keeps PDF simple and professional)
4. **Complex Formatting**: Advanced formatting like indents, spacing may not perfectly translate to PDF

## Future Enhancements

Potential improvements:
- Add row/column manipulation buttons for tables
- Enable image insertion and rendering in PDF
- Add color picker for text highlighting
- Support for nested lists
- Table of contents generation
- Advanced table features (merge cells, split cells)
- Font size controls
- Undo/redo with larger history

## Migration Notes

No database migration needed - the `section_content` field already stores TEXT, which can hold HTML.

Existing contracts will continue to work:
- Plain text renders as before
- Pipe-format tables render as before
- New contracts with HTML render properly in PDF

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify react-quill is properly installed
3. Check that Quill CSS is imported in index.css
4. Ensure PDF generator handles both HTML and plain text
5. Test with simple text first, then tables

For questions or issues, refer to:
- React Quill docs: https://github.com/zenoamaro/react-quill
- jsPDF docs: https://github.com/parallax/jsPDF
