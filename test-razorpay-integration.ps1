# Razorpay Integration Test Script
# Run this after deployment to verify the integration

Write-Host "🔧 Testing Razorpay Integration..." -ForegroundColor Yellow
Write-Host ""

# Test 1: Check if Razorpay SDK is installed
Write-Host "1. Checking Razorpay SDK installation..." -ForegroundColor Cyan
try {
    $packageJson = Get-Content "package.json" | ConvertFrom-Json
    if ($packageJson.dependencies.razorpay) {
        Write-Host "   ✅ Razorpay SDK installed: v$($packageJson.dependencies.razorpay)" -ForegroundColor Green
    } else {
        Write-Host "   ❌ Razorpay SDK not found in dependencies" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Error reading package.json" -ForegroundColor Red
}

# Test 2: Check if Netlify function exists
Write-Host "2. Checking Netlify function..." -ForegroundColor Cyan
if (Test-Path "netlify/functions/create-razorpay-order.cjs") {
    Write-Host "   ✅ Netlify function file exists" -ForegroundColor Green
} else {
    Write-Host "   ❌ Netlify function file missing" -ForegroundColor Red
}

# Test 3: Check if API route is configured
Write-Host "3. Checking Netlify configuration..." -ForegroundColor Cyan
try {
    $netlifyConfig = Get-Content "netlify.toml" -Raw
    if ($netlifyConfig -match "api/create-razorpay-order") {
        Write-Host "   ✅ API route configured in netlify.toml" -ForegroundColor Green
    } else {
        Write-Host "   ❌ API route not found in netlify.toml" -ForegroundColor Red
    }
} catch {
    Write-Host "   ❌ Error reading netlify.toml" -ForegroundColor Red
}

# Test 4: Check if success page exists
Write-Host "4. Checking success page..." -ForegroundColor Cyan
if (Test-Path "src/components/payment/PaymentSuccessPage.tsx") {
    Write-Host "   ✅ Payment success page exists" -ForegroundColor Green
} else {
    Write-Host "   ❌ Payment success page missing" -ForegroundColor Red
}

# Test 5: Verify build status
Write-Host "5. Checking last build..." -ForegroundColor Cyan
if (Test-Path "dist") {
    Write-Host "   ✅ Project built successfully" -ForegroundColor Green
} else {
    Write-Host "   ❌ Build directory not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎯 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Deploy to Netlify to test the server-side function" -ForegroundColor White
Write-Host "2. Verify your Razorpay credentials are in the database" -ForegroundColor White
Write-Host "3. Test the complete payment flow" -ForegroundColor White
Write-Host "4. Check console logs for any API errors" -ForegroundColor White
Write-Host ""
Write-Host "📋 Manual Test Checklist:" -ForegroundColor Yellow
Write-Host "□ Admin login works" -ForegroundColor White
Write-Host "□ Create invoice and payment request" -ForegroundColor White
Write-Host "□ Payment link opens checkout page" -ForegroundColor White
Write-Host "□ Razorpay modal opens without 'Payment Failed' error" -ForegroundColor White
Write-Host "□ Test payment completes successfully" -ForegroundColor White
Write-Host "□ Redirects to success page" -ForegroundColor White
