# Email Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         KDADKS Website                               │
│                     Contact Form Submissions                         │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ User fills form & submits
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Contact Forms (5 types)                        │
├─────────────────────────────────────────────────────────────────────┤
│  1. Main Contact Form           (Contact.tsx)                       │
│  2. Book Consultation           (BookConsultation.tsx)              │
│  3. Service Inquiry             (ServiceInquiry.tsx)                │
│  4. Partnership Application     (Partnership.tsx)                   │
│  5. Customer Support Request    (CustomerSupport.tsx)               │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ Sends email data
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Netlify Function                                │
│                   /.netlify/functions/send-email                     │
├─────────────────────────────────────────────────────────────────────┤
│  • Validates reCAPTCHA token                                        │
│  • Validates email format                                           │
│  • Prepares email with proper headers                               │
│  • Connects to SMTP server                                          │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ SMTP Connection
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  Microsoft 365 Exchange SMTP Server                  │
│                      smtp.office365.com:587                          │
├─────────────────────────────────────────────────────────────────────┤
│  Host: smtp.office365.com                                           │
│  Port: 587 (STARTTLS)                                               │
│  Auth: SMTP_USER / SMTP_PASSWORD                                    │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ Delivers email
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         📧 INBOX                                     │
│                    contact@kdadks.com                                │
├─────────────────────────────────────────────────────────────────────┤
│  From: KDADKS Service Private Limited <contact@kdadks.com>         │
│  Reply-To: customer@example.com                                     │
│  To: contact@kdadks.com                                             │
│  Subject: [Form Type] - [Customer Name]                            │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ Support team reads & replies
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      📨 Reply to Customer                            │
├─────────────────────────────────────────────────────────────────────┤
│  From: contact@kdadks.com                                           │
│  To: customer@example.com (automatically filled from Reply-To)      │
│  Subject: Re: [Original Subject]                                    │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 │ Sends via Microsoft 365 Exchange SMTP
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    👤 Customer's Inbox                               │
│                    customer@example.com                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Email Header Configuration

```
┌────────────────────────────────────────────────────────────────┐
│  Email Headers (What the system configures)                    │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  From: "KDADKS Service Private Limited" <contact@kdadks.com>  │
│        ↑                                                       │
│        └─ Professional company name displayed in inbox        │
│                                                                │
│  To: contact@kdadks.com                                        │
│      ↑                                                         │
│      └─ All form submissions go here                          │
│                                                                │
│  Reply-To: customer@example.com                                │
│            ↑                                                   │
│            └─ Customer's email for easy replies               │
│                                                                │
│  Subject: [Form Type] - [Details]                             │
│           ↑                                                    │
│           └─ Descriptive subject for easy filtering           │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Environment Variables Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    Netlify Dashboard                              │
│                  Environment Variables                            │
├──────────────────────────────────────────────────────────────────┤
│  SMTP_USER = contact@kdadks.com                                  │
│  SMTP_PASSWORD = *********************                           │
└──────────────────────────────────────────────────────────────────┘
                           │
                           │ Injected at runtime
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│              Netlify Serverless Function                          │
│              (send-email.js)                                      │
├──────────────────────────────────────────────────────────────────┤
│  const user = process.env.SMTP_USER;                             │
│  const password = process.env.SMTP_PASSWORD;                     │
│                                                                   │
│  const transporter = nodemailer.createTransport({                │
│    host: 'smtp.office365.com',                                   │
│    port: 587,                                                    │
│    secure: false, // STARTTLS                                    │
│    auth: { user, pass: password }                                │
│  });                                                             │
└──────────────────────────────────────────────────────────────────┘
```

---

## Form Submission Flow (Detailed)

```
User fills form                    Server processes
     │                                   │
     ▼                                   ▼
┌─────────┐     Submit      ┌────────────────────┐
│ Browser │ ───────────────▶│  Netlify Function  │
│  Form   │                 │   (send-email.js)  │
└─────────┘                 └────────────────────┘
     │                               │
     │ Include:                      │ Validates:
     │ - name                        │ - reCAPTCHA
     │ - email                       │ - email format
     │ - message                     │ - required fields
     │ - reCAPTCHA                   │
     │                               ▼
     │                      ┌────────────────────┐
     │                      │   SMTP Transport   │
     │                      │  (Microsoft 365)   │
     │                      └────────────────────┘
     │                               │
     │                               ▼
     │                      ┌────────────────────┐
     │                      │    Email Sent!     │
     │                      │ contact@kdadks.com │
     │                      └────────────────────┘
     │                               │
     ▼                               ▼
┌─────────┐                 ┌────────────────────┐
│ Success │                 │   Email Inbox      │
│ Message │                 │  (Microsoft 365)   │
└─────────┘                 └────────────────────┘
```

---

## Security & Spam Protection

```
User submits form
     │
     ▼
┌─────────────────────────────────────┐
│  reCAPTCHA Verification             │
│  (Google Enterprise)                │
│  ✓ Checks if user is human          │
│  ✓ Scores request (0.0 - 1.0)       │
└─────────────────────────────────────┘
     │ Score > 0.5
     ▼
┌─────────────────────────────────────┐
│  Server-Side Validation             │
│  ✓ Email format check               │
│  ✓ Required fields present          │
│  ✓ Sanitize input                   │
└─────────────────────────────────────┘
     │ All valid
     ▼
┌─────────────────────────────────────┐
│  SMTP Authentication                │
│  ✓ STARTTLS encryption             │
│  ✓ Microsoft 365 credentials       │
│  ✓ Authenticated sender             │
└─────────────────────────────────────┘
     │ Authenticated
     ▼
┌─────────────────────────────────────┐
│  Email Delivered ✅                 │
│  To: contact@kdadks.com             │
└─────────────────────────────────────┘
```

---

**Visual Summary**: Every contact form → Netlify Function → Microsoft 365 Exchange SMTP → contact@kdadks.com
