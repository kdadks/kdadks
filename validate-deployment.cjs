#!/usr/bin/env node

/**
 * Deployment Validation Script
 * Checks if the project is ready for deployment
 */

const fs = require('fs');
const path = require('path');

const requiredFiles = [
  'package.json',
  'tsconfig.json',
  'vite.config.ts',
  'netlify.toml',
  'src/App.tsx',
  'src/main.tsx',
  'index.html',
  'DEPLOYMENT.md',
  'README.md'
];

const requiredDependencies = [
  'react',
  'react-dom',
  '@vitejs/plugin-react',
  'vite',
  'typescript'
];

console.log('🔍 Validating deployment readiness...\n');

let validationPassed = true;

// Check required files
console.log('📁 Checking required files:');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING`);
    validationPassed = false;
  }
});

// Check package.json structure
console.log('\n📦 Checking package.json:');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  // Check scripts
  const requiredScripts = ['dev', 'build', 'preview', 'lint'];
  requiredScripts.forEach(script => {
    if (packageJson.scripts && packageJson.scripts[script]) {
      console.log(`  ✅ Script: ${script}`);
    } else {
      console.log(`  ❌ Script: ${script} - MISSING`);
      validationPassed = false;
    }
  });

  // Check dependencies
  console.log('\n📚 Checking dependencies:');
  const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  requiredDependencies.forEach(dep => {
    if (allDeps[dep]) {
      console.log(`  ✅ ${dep}: ${allDeps[dep]}`);
    } else {
      console.log(`  ❌ ${dep} - MISSING`);
      validationPassed = false;
    }
  });

} catch (error) {
  console.log('  ❌ Error reading package.json:', error.message);
  validationPassed = false;
}

// Check netlify.toml configuration
console.log('\n🌐 Checking netlify.toml:');
try {
  const netlifyConfig = fs.readFileSync('netlify.toml', 'utf8');
  
  if (netlifyConfig.includes('publish = "dist"')) {
    console.log('  ✅ Publish directory configured');
  } else {
    console.log('  ❌ Publish directory not configured');
    validationPassed = false;
  }

  if (netlifyConfig.includes('command = "npm run build"')) {
    console.log('  ✅ Build command configured');
  } else {
    console.log('  ❌ Build command not configured');
    validationPassed = false;
  }

  if (netlifyConfig.includes('[[redirects]]')) {
    console.log('  ✅ SPA redirects configured');
  } else {
    console.log('  ⚠️  SPA redirects not found (may cause routing issues)');
  }

} catch (error) {
  console.log('  ❌ Error reading netlify.toml:', error.message);
  validationPassed = false;
}

// Check TypeScript configuration
console.log('\n📝 Checking TypeScript configuration:');
try {
  const tsConfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
  
  if (tsConfig.compilerOptions && tsConfig.compilerOptions.jsx === 'react-jsx') {
    console.log('  ✅ JSX configuration');
  } else {
    console.log('  ❌ JSX configuration missing or incorrect');
    validationPassed = false;
  }

  if (tsConfig.compilerOptions && tsConfig.compilerOptions.esModuleInterop) {
    console.log('  ✅ ES Module interop enabled');
  } else {
    console.log('  ❌ ES Module interop not enabled');
    validationPassed = false;
  }

} catch (error) {
  console.log('  ❌ Error reading tsconfig.json:', error.message);
  validationPassed = false;
}

// Check if build directory exists and is not empty (if built)
console.log('\n🏗️  Checking build status:');
if (fs.existsSync('dist')) {
  const distFiles = fs.readdirSync('dist');
  if (distFiles.length > 0) {
    console.log('  ✅ Build directory exists and contains files');
  } else {
    console.log('  ⚠️  Build directory exists but is empty');
  }
} else {
  console.log('  ℹ️  Build directory not found (run "npm run build" to generate)');
}

// Summary
console.log('\n' + '='.repeat(50));
if (validationPassed) {
  console.log('🎉 Validation PASSED! Your project is ready for deployment.');
  console.log('\n📋 Next steps:');
  console.log('1. Run "npm run build" to generate production build');
  console.log('2. Push your code to Git repository');
  console.log('3. Connect repository to Netlify');
  console.log('4. Deploy automatically or use "npm run deploy:netlify"');
} else {
  console.log('❌ Validation FAILED! Please fix the issues above before deploying.');
  process.exit(1);
}