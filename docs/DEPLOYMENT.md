# Netlify Deployment Guide

This guide explains how to set up automated deployment for the KDADKS website using Netlify.

## Prerequisites

1. A GitHub/GitLab/Bitbucket repository containing your project
2. A Netlify account (free at [netlify.com](https://netlify.com))

## Automatic Deployment Setup

### Step 1: Connect Repository to Netlify

1. **Login to Netlify Dashboard**
   - Go to [app.netlify.com](https://app.netlify.com)
   - Sign in with your Git provider (GitHub, GitLab, or Bitbucket)

2. **Create New Site**
   - Click "Add new site" → "Import an existing project"
   - Choose your Git provider
   - Select the repository containing this project

3. **Configure Build Settings**
   - **Base directory**: Leave empty (or use `.` if required)
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Node.js version**: 18.x (set in Environment Variables)

### Step 2: Environment Variables (if needed)

If your project uses environment variables:

1. Go to Site Settings → Environment Variables
2. Add any required environment variables (e.g., API keys)
3. Variables should be prefixed with `VITE_` for Vite to include them in the build

Example:
```
VITE_API_URL=https://api.example.com
VITE_SITE_URL=https://your-site.netlify.app
```

### Step 3: Custom Domain (Optional)

1. Go to Site Settings → Domain Management
2. Click "Add custom domain"
3. Follow the DNS configuration instructions

## Build Configuration

The project includes a [`netlify.toml`](./netlify.toml) file that automatically configures:

- **Build Settings**: Uses `npm run build` and publishes from `dist/`
- **Node.js Version**: Set to version 18
- **SPA Routing**: Redirects all routes to `index.html` for client-side routing
- **Security Headers**: Adds security headers for better protection
- **Caching**: Optimizes caching for static assets

## Deployment Process

Once connected, Netlify will automatically:

1. **Trigger builds** on every push to the main branch
2. **Install dependencies** using `npm install`
3. **Run the build command** (`npm run build`)
4. **Deploy the generated files** from the `dist/` directory
5. **Provide a unique URL** for each deployment

## Build Status

Monitor your deployments:
- **Deploy logs**: Available in the Netlify dashboard
- **Build status**: Shows success/failure for each deployment
- **Preview URLs**: Available for pull requests (if enabled)

## Branch Deployments

To enable branch deployments:
1. Go to Site Settings → Build & Deploy → Continuous Deployment
2. Configure branch deploy settings
3. Enable deploy previews for pull requests

## Performance Optimizations

The configuration includes:
- **Asset caching**: 1-year cache for static assets
- **Compression**: Automatic gzip compression
- **Security headers**: Enhanced security
- **SPA support**: Proper routing for React Router

## Troubleshooting

### Common Issues

1. **Build Fails**
   - Check Node.js version (should be 18.x)
   - Verify all dependencies are in `package.json`
   - Check build logs for specific errors

2. **404 on Page Refresh**
   - Ensure the redirect rule in `netlify.toml` is present
   - Verify SPA routing configuration

3. **Environment Variables Not Working**
   - Ensure variables are prefixed with `VITE_`
   - Check they're set in Netlify dashboard

4. **Slow Build Times**
   - Consider enabling Netlify's build cache
   - Optimize dependencies and build process

### Build Commands Reference

```bash
# Development
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Lint code
npm run lint
```

## Additional Features

### Form Handling
If you add contact forms, uncomment the form handling section in `netlify.toml` and use:
```html
<form name="contact" method="POST" data-netlify="true">
  <!-- form fields -->
</form>
```

### Functions
For serverless functions, create a `netlify/functions/` directory:
```
netlify/
  functions/
    hello.js
```

### Analytics
Enable Netlify Analytics in the dashboard for traffic insights.

## Support

- [Netlify Documentation](https://docs.netlify.com/)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html#netlify)
- [React Router and SPAs](https://docs.netlify.com/routing/redirects/redirect-options/#history-pushstate-and-single-page-apps)