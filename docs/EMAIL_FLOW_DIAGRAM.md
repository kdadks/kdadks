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
│                      Hostinger SMTP Server                           │
│                      smtp.hostinger.com:465                          │
├─────────────────────────────────────────────────────────────────────┤
│  Host: smtp.hostinger.com                                           │
│  Port: 465 (SSL)                                                    │
│  Auth: HOSTINGER_SMTP_USER / PASSWORD                               │
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
                                 │ Sends via Hostinger SMTP
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
│  HOSTINGER_SMTP_USER = contact@kdadks.com                        │
│  HOSTINGER_SMTP_PASSWORD = *********************                 │
└──────────────────────────────────────────────────────────────────┘
                           │
                           │ Injected at runtime
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│              Netlify Serverless Function                          │
│              (send-email.js)                                      │
├──────────────────────────────────────────────────────────────────┤
│  const user = process.env.HOSTINGER_SMTP_USER;                   │
│  const password = process.env.HOSTINGER_SMTP_PASSWORD;           │
│                                                                   │
│  const transporter = nodemailer.createTransport({                │
│    host: 'smtp.hostinger.com',                                   │
│    port: 465,                                                    │
│    secure: true,                                                 │
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
     │                      │  (Hostinger SMTP)  │
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
│ Message │                 │  (Hostinger Mail)  │
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
│  ✓ SSL/TLS encryption               │
│  ✓ Hostinger credentials            │
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

**Visual Summary**: Every contact form → Netlify Function → Hostinger SMTP → contact@kdadks.com
