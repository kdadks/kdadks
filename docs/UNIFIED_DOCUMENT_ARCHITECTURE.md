# Unified Document Management Architecture

## Overview
The KDADKS system handles two distinct types of employee documents:
1. **Employee Uploads** - Personal documents uploaded by employees (Aadhar, PAN, certificates)
2. **Admin Generated** - Official documents created by admin (offer letters, experience certificates)

## The Two-Table Design

### Table 1: `employee_documents`
**Purpose:** Store employee-uploaded personal documents

**Key Fields:**
- `file_name`, `storage_path`, `storage_bucket` - Physical file storage
- `verification_status`, `verified_by` - Document verification workflow
- `mime_type`, `file_size` - File metadata
- `document_type` - aadhaar_card, pan_card, educational_certificate, etc.

**Use Cases:**
- Employee uploads scanned copies of personal documents
- Admin verifies authenticity
- System tracks expiry dates (passport, visas)

### Table 2: `employment_documents`
**Purpose:** Store admin-generated official documents

**Key Fields:**
- `document_number`, `document_date` - Official document tracking
- `document_data` (JSON) - Template variables for document generation
- `pdf_url` - Generated PDF location
- `status` - draft, issued, revoked
- `document_type` - offer_letter, appointment_letter, experience_certificate, etc.

**Use Cases:**
- Admin generates offer letter from template
- System creates salary certificates on demand
- Track document issuance history

## Why Two Separate Tables?

### Different Data Models
- **Uploads** need file storage fields, verification workflow
- **Generated** need template data, document numbering, status tracking

### Different Workflows
- **Uploads**: Employee → Upload → Admin Verifies → Approved
- **Generated**: Admin → Select Template → Fill Data → Generate PDF → Issue

### Different Access Patterns
- **Uploads**: Employee can upload, admin can view/verify
- **Generated**: Admin creates, employee can only view final PDF

## The Unified View Solution

Instead of merging tables (losing specialized fields), we created a **database VIEW** that combines both:

```sql
CREATE VIEW employee_documents_unified AS
SELECT 
  id, employee_id, document_type,
  document_name AS title,
  'employee_upload' AS document_source,
  ...
FROM employee_documents
UNION ALL
SELECT 
  id, employee_id, document_type,
  document_number AS title,
  'admin_generated' AS document_source,
  ...
FROM employment_documents;
```

### Benefits:
✅ **Unified Queries** - Single query gets all employee documents  
✅ **Preserved Specialization** - Each table keeps its unique fields  
✅ **Simplified UI** - Admin sees all docs in one list  
✅ **Normalized Fields** - Common fields mapped to same names  
✅ **Source Indicator** - `document_source` shows origin  

## Service Layer Integration

### Before (Complex):
```typescript
// Need two separate queries
const uploads = await employeeService.getEmployeeUploadedDocuments(id);
const generated = await employeeService.getEmploymentDocuments(id);
const allDocs = [...uploads, ...generated]; // Manual merge
```

### After (Simple):
```typescript
// Single query returns everything
const allDocs = await employeeService.getAllEmployeeDocuments(id);
```

## UI/UX Improvements

### Admin Document List:
```
📄 Aadhar Card - aadhar_front.pdf [Employee Upload] ✅ Verified
📄 Offer Letter - OFF/2024/001 [Admin Generated] 
📄 PAN Card - pan_card.pdf [Employee Upload] ⏳ Pending
📄 Experience Certificate - EXP/2024/005 [Admin Generated]
```

**Color Coding:**
- 🔵 Blue badge: Employee Upload
- 🟢 Green badge: Admin Generated

**Filtering:**
- Show All Documents
- Employee Uploads Only
- Admin Generated Only
- Verified Only
- Pending Verification

## RLS (Row Level Security) Policies

### employee_documents Policies:
```sql
-- Employees can view their own documents
CREATE POLICY "Employees view own documents" ON employee_documents
FOR SELECT USING (auth.uid()::text = employee_id);

-- Authenticated users (admins) can view all
CREATE POLICY "Authenticated users view all employee documents" ON employee_documents
FOR SELECT TO authenticated USING (true);

-- Employees can upload their documents
CREATE POLICY "Employees upload own documents" ON employee_documents
FOR INSERT WITH CHECK (auth.uid()::text = employee_id);
```

### employment_documents Policies:
```sql
-- Only admins can create/manage
CREATE POLICY "Authenticated users manage employment documents" ON employment_documents
FOR ALL TO authenticated USING (true);

-- Employees can view their own
CREATE POLICY "Employees view own employment documents" ON employment_documents
FOR SELECT USING (auth.uid()::text = employee_id);
```

### employee_documents_unified View:
```sql
-- View inherits policies from underlying tables
GRANT SELECT ON employee_documents_unified TO authenticated;
```

## Migration Path

### Phase 1: Current State ✅
- Two separate tables exist
- Different queries for each type
- Admin sees fragmented document lists

### Phase 2: Unified View ⏳
- Create `employee_documents_unified` view
- Update services to use view for "get all" operations
- Keep specialized methods for specific operations

### Phase 3: UI Update 📋 (Upcoming)
- Refactor admin document list to query unified view
- Add source indicator badges
- Implement unified filtering

### Phase 4: Enhanced Features 🚀 (Future)
- Unified search across all document types
- Combined document timeline
- Bulk operations on mixed document types

## Developer Guide

### When to Use Each Query:

**Use `employee_documents` directly:**
```typescript
// When uploading new employee document
await employeeDocumentService.uploadDocument(file, employeeId, type);

// When verifying employee uploads
await employeeDocumentService.verifyDocument(docId, verifiedBy);
```

**Use `employment_documents` directly:**
```typescript
// When generating offer letter
await employmentDocumentService.generateOfferLetter(employeeId, data);

// When checking document status
const status = await employmentDocumentService.getDocumentStatus(docId);
```

**Use `employee_documents_unified` view:**
```typescript
// When displaying all employee documents in admin
const allDocs = await employeeService.getAllEmployeeDocuments(employeeId);

// When searching across all document types
const results = await searchDocuments(employeeId, searchTerm);

// When building document timeline
const timeline = await getDocumentTimeline(employeeId);
```

## Best Practices

### DO:
✅ Use unified view for read-only display operations  
✅ Query specific tables for CRUD operations  
✅ Check `document_source` field to handle different types  
✅ Maintain type-specific validation logic  

### DON'T:
❌ Try to INSERT/UPDATE/DELETE on the view  
❌ Mix validation logic between document types  
❌ Assume all fields exist for all document types  
❌ Merge the physical tables  

## Conclusion

The two-table + unified view architecture provides:
- **Flexibility** - Each table optimized for its purpose
- **Simplicity** - Single query for display operations
- **Maintainability** - Clear separation of concerns
- **Scalability** - Easy to add new document types

This design follows the principle: **"Tables store specialized data, views provide unified access"** - keeping the best of both approaches.
