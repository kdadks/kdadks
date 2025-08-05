# KDADKS Website

A modern website for KDADKS Service Private Limited showcasing our d## 🔌 Integration with Other Projects

The Invoice Management System is designed to be modular and can be integrated into other TypeScript projects:

### Integration Features
- **Self-contained Components**: Modular React components
- **Service Layer API**: Clean API for data access
- **Type Definitions**: Complete TypeScript types
- **Database Scripts**: Ready-to-use database setup

### Integration Steps

1. **Database Setup**: Run schema migration in your Supabase project
2. **Copy Core Files**: Services, components, types, and utilities
3. **Environment Configuration**: Set up Supabase connection
4. **Import Components**: Use the InvoiceManagement component
5. **Customize**: Adapt styling and business logic as needed

For detailed integration instructions, see [docs/INTEGRATION_GUIDE.md](./docs/INTEGRATION_GUIDE.md)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn package manager
- Git for version controlportfolio across IT consulting, healthcare, fashion, and travel services.

## 🔐 Admin Access

The website includes a secure admin console for authorized personnel:

- **Admin URL**: `/admin/login`
- **Hidden Access**: Quintuple-click "Made with ❤️ in India" in the footer
- **Authentication**: Supabase Auth with email/password login

**Admin Features:**
- Invoice management and generation
- Business settings configuration
- Supabase database integration
- Secure authentication system

**Authentication Method:**
- **Email/Password**: Sign in with email and password

**Note**: Admin users need to be created in Supabase. Contact the administrator for access.

## 🌟 Features

- **Responsive Design**: Optimized for all devices and screen sizes
- **Modern UI/UX**: Clean, professional design with smooth animations
- **Multi-Brand Portfolio**: Showcases all KDADKS service brands
- **SEO Optimized**: Meta tags and structured content for better search visibility
- **Fast Performance**: Optimized build with code splitting and lazy loading
- **Accessibility**: WCAG compliant with keyboard navigation support
- **🔐 Admin Console**: Secure admin panel for managing contact submissions and site content
- **📧 Email Integration**: Professional email system with Brevo SMTP
- **📊 Analytics Dashboard**: Real-time contact and email statistics

## 🏢 Our Brands

- **IT Wala**: Technology education and consulting services
- **Ayuh Clinic**: Comprehensive healthcare services
- **Nirchal**: Fashion design and custom tailoring
- **Raahirides**: Travel solutions and transportation services

## 🔐 Admin Console & Invoice Management System

The website includes a comprehensive admin console with a full invoice management system:

- **Admin URL**: `/admin/login` (protected by Supabase Auth)
- **Hidden Access**: Quintuple-click "Made with ❤️ in India" in the footer
- **Authentication**: Secure Supabase email/password authentication

### 🧾 Invoice Management Features

- **Dashboard Overview**: 
  - Invoice statistics and financial metrics
  - Status-based tracking (Draft, Sent, Paid, Overdue)
  - Recent activity and pending payments

- **Invoice Generation**: 
  - Professional IGST-compliant invoices
  - Automatic invoice numbering (format: `INV/YYYY/MM/###`)
  - Multi-currency support based on customer country
  - Line item management with HSN/SAC codes

- **Customer Management**:
  - Complete customer database with IGST details
  - Address and contact information
  - Payment terms and credit limits
  - Country-specific settings

- **Product/Service Catalog**:
  - Product database with descriptions
  - HSN/SAC codes for IGST compliance
  - Pricing and tax configuration
  - Active/inactive status management

- **Business Settings**:
  - Company profile with branding
  - IGST/Tax configuration
  - Invoice templates and numbering
  - Terms and conditions templates

- **Email Integration**:
  - Send invoices directly to customers
  - Professional email templates
  - Delivery tracking and notifications

For detailed documentation on the invoice system, see [docs/INVOICE_SYSTEM_SETUP.md](./docs/INVOICE_SYSTEM_SETUP.md)

## �🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn package manager
- Git for version control

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repository-url>
   cd kdadks-website
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your actual Brevo credentials and JWT secret
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   Navigate to `http://localhost:3000`

## 🛠️ Development Scripts

```bash
# Development
npm run dev          # Start development server
npm run preview      # Preview production build locally

# Building
npm run build        # Build for production
npm run lint         # Run ESLint for code quality

# Deployment
npm run deploy       # Full deployment script with checks
npm run deploy:netlify    # Deploy to Netlify using CLI
npm run deploy:preview    # Deploy preview to Netlify
```

## 📦 Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 4
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Linting**: ESLint with TypeScript rules

## 🌐 Deployment

### Automated Deployment with Netlify

This project is configured for seamless deployment with Netlify:

#### Method 1: Git-based Deployment (Recommended)

1. **Push to Git repository**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Connect to Netlify**
   - Go to [Netlify Dashboard](https://app.netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect your Git provider and select this repository

3. **Configure build settings** (Auto-detected from `netlify.toml`)
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Node.js version: 18

4. **Deploy**
   - Netlify will automatically build and deploy
   - Future pushes to main branch will trigger automatic deployments

#### Method 2: Manual Deployment

1. **Build the project**
   ```bash
   npm run build
   ```

2. **Deploy via drag-and-drop**
   - Go to Netlify Dashboard
   - Drag the `dist` folder to the deploy area

#### Method 3: Netlify CLI

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Deploy**
   ```bash
   npm run deploy:netlify
   ```

### GitHub Actions CI/CD

The project includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that:

- Runs on every push to main branch
- Installs dependencies and runs tests
- Builds the project
- Deploys to Netlify automatically

#### Setting up GitHub Actions

1. **Add Netlify secrets to GitHub**
   - Go to your GitHub repository → Settings → Secrets and variables → Actions
   - Add the following secrets:
     - `NETLIFY_AUTH_TOKEN`: Your Netlify personal access token
     - `NETLIFY_SITE_ID`: Your Netlify site ID

2. **Get Netlify credentials**
   ```bash
   # Install Netlify CLI
   npm install -g netlify-cli
   
   # Login to Netlify
   netlify login
   
   # Get site ID (run in project directory after connecting)
   netlify status
   ```

## 📋 Configuration Files

### `netlify.toml`
- Build and deployment settings
- Redirect rules for SPA routing
- Security headers and caching policies

### `tsconfig.json`
- TypeScript configuration
- Build and development settings

### `vite.config.ts`
- Vite build configuration
- Plugin settings and optimization

### `tailwind.config.js`
- Tailwind CSS configuration
- Custom colors and theme settings

## 🔧 Project Structure

```
kdadks-website/
├── public/                 # Static assets
│   ├── favicon.png
│   └── brand-logos/
├── src/
│   ├── components/         # React components
│   │   ├── Header.tsx
│   │   ├── Hero.tsx
│   │   ├── About.tsx
│   │   ├── Services.tsx
│   │   ├── Contact.tsx
│   │   └── Footer.tsx
│   ├── App.tsx            # Main app component
│   ├── main.tsx           # App entry point
│   └── index.css          # Global styles
├── dist/                  # Build output (auto-generated)
├── netlify.toml           # Netlify configuration
├── deploy.sh              # Deployment script
├── DEPLOYMENT.md          # Detailed deployment guide
└── README.md              # This file
```

## 🎨 Customization

### Colors and Branding
Edit `tailwind.config.js` to customize:
- Primary and secondary colors
- Brand-specific color schemes
- Typography settings

### Content Updates
- **Text content**: Edit respective component files in `src/components/`
- **Images**: Replace files in `public/` directory
- **Contact information**: Update in `src/components/Contact.tsx` and `src/components/Footer.tsx`

### Invoice System Customization
- **Company Settings**: Update in admin dashboard or directly in database
- **Invoice Templates**: Modify `InvoicePdf.tsx` for design changes
- **Email Templates**: Customize in `emailService.ts`
- **Tax Rates**: Configure in admin dashboard settings
- **Invoice Numbering**: Set format in invoice settings

### Adding New Sections
1. Create new component in `src/components/`
2. Import and add to `src/components/Router.tsx`
3. Update navigation in `src/components/Header.tsx`

## 🔍 SEO and Performance

### Built-in Optimizations
- **Code splitting**: Automatic chunking for faster loading
- **Image optimization**: Optimized image formats and sizes
- **Caching**: Aggressive caching for static assets
- **Compression**: Gzip compression enabled
- **Security headers**: CSP and security headers configured

### SEO Features
- Meta tags for social sharing
- Structured data for search engines
- Sitemap generation ready
- Mobile-first responsive design

## 🐛 Troubleshooting

### Common Issues

1. **Build fails with TypeScript errors**
   ```bash
   npm run lint  # Check for linting issues
   ```

2. **Development server not starting**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   npm run dev
   ```

3. **Deployment issues**
   - Check `netlify.toml` configuration
   - Verify build command and publish directory
   - Check Netlify deploy logs for specific errors

### Getting Help

- Check the [deployment guide](./DEPLOYMENT.md) for detailed instructions
- Review Netlify documentation for deployment issues
- Check browser console for runtime errors

## 📞 Support

For technical support or questions about this website:

- **Email**: kdadks@outlook.com
- **Phone**: +91 7982303199
- **Address**: Lucknow, Uttar Pradesh, India

## 📄 License

This project is proprietary and confidential to KDADKS Service Private Limited.

## 🚀 Contributing

This is a private project for KDADKS Service Private Limited. For internal development:

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit for review
5. Deploy to staging first
6. Deploy to production after approval

---

**Built with ❤️ by the KDADKS Team**