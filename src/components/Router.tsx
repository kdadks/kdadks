import React, { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Header from './Header'
import Hero from './Hero'
import Features from './Features'
import About from './About'
import Services from './Services'
import Testimonials from './Testimonials'
import Contact from './Contact'
import Footer from './Footer'
import SEO from './SEO'
import SEOContent from './SEOContent'
import ScrollToTop from './ScrollToTop'
import { ToastProvider } from './ui/ToastProvider'

// Loading component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
  </div>
)

// Lazy load large components
const Team = lazy(() => import('./Team'))
const PrivacyPolicy = lazy(() => import('./PrivacyPolicy'))
const TermsConditions = lazy(() => import('./TermsConditions'))
const ShippingPolicy = lazy(() => import('./ShippingPolicy'))
const CancellationRefund = lazy(() => import('./CancellationRefund'))
const CustomerSupport = lazy(() => import('./CustomerSupport'))
const ServiceInquiry = lazy(() => import('./ServiceInquiry'))
const BookConsultation = lazy(() => import('./BookConsultation'))
const Partnership = lazy(() => import('./Partnership'))

// Admin Components (lazy loaded)
const AdminLogin = lazy(() => import('./admin/AdminLogin'))
const SimpleAdminDashboard = lazy(() => import('./admin/SimpleAdminDashboard'))

// Employee Portal Components (lazy loaded)
const EmployeeLayout = lazy(() => import('./employee/EmployeeLayout'))
const EmployeeDashboard = lazy(() => import('./employee/EmployeeDashboard'))
const LeaveManagement = lazy(() => import('./employee/LeaveManagement'))
const AttendanceMarking = lazy(() => import('./employee/AttendanceMarking'))
const EmployeeProfile = lazy(() => import('./employee/EmployeeProfile'))
const EmployeeSalarySlips = lazy(() => import('./employee/EmployeeSalarySlips'))
const EmployeeDocuments = lazy(() => import('./employee/EmployeeDocuments'))
const EmployeePerformanceFeedback = lazy(() => import('./employee/EmployeePerformanceFeedback'))
const EmployeeCompensation = lazy(() => import('./employee/EmployeeCompensation'))
const EmployeeLogin = lazy(() => import('./employee/EmployeeLogin'))
const ChangePassword = lazy(() => import('./employee/ChangePassword'))
const ProtectedEmployeeRoute = lazy(() => import('./employee/ProtectedEmployeeRoute'))

// Payment Gateway Components (lazy loaded)
const CheckoutPage = lazy(() => import('./payment/CheckoutPage').then(m => ({ default: m.CheckoutPage })))
const PaymentSuccessPage = lazy(() => import('./payment/PaymentSuccessPage').then(m => ({ default: m.PaymentSuccessPage })))
const PaymentPage = lazy(() => import('./payment/PaymentPage').then(m => ({ default: m.PaymentPage })))

// Home page component
const HomePage = () => (
  <div className="min-h-screen bg-white">
    <SEO page="home" />
    <SEOContent />
    <Header />
    <main>
      <Hero />
      <Features />
      <About />
      <Services />
      <Testimonials />
      <Contact />
    </main>
    <Footer />
  </div>
)

// Privacy policy page
const PrivacyPage = () => (
  <div className="min-h-screen bg-white">
    <SEO page="privacy" />
    <Header />
    <Suspense fallback={<LoadingFallback />}>
      <PrivacyPolicy />
    </Suspense>
    <Footer />
  </div>
)

// Terms page
const TermsPage = () => (
  <div className="min-h-screen bg-white">
    <SEO page="terms" />
    <Header />
    <Suspense fallback={<LoadingFallback />}>
      <TermsConditions />
    </Suspense>
    <Footer />
  </div>
)

// Shipping policy page
const ShippingPage = () => (
  <div className="min-h-screen bg-white">
    <SEO customData={{ title: "Shipping Policy - Kdadks Service Private Limited", description: "Shipping and delivery policy for Kdadks services including fashion products from Nirchal and other physical goods." }} />
    <Header />
    <Suspense fallback={<LoadingFallback />}>
      <ShippingPolicy />
    </Suspense>
    <Footer />
  </div>
)

// Refund policy page
const RefundPage = () => (
  <div className="min-h-screen bg-white">
    <SEO customData={{ title: "Cancellation & Refund Policy - Kdadks Service Private Limited", description: "Cancellation and refund policy for Kdadks services across IT consulting, healthcare, fashion, and travel sectors." }} />
    <Header />
    <Suspense fallback={<LoadingFallback />}>
      <CancellationRefund />
    </Suspense>
    <Footer />
  </div>
)

// Team page
const TeamPage = () => (
  <div className="min-h-screen bg-white">
    <SEO customData={{ title: "Our Team - Kdadks Service Private Limited", description: "Meet the expert team behind Kdadks' success across IT consulting, healthcare, fashion, and travel industries." }} />
    <Header />
    <Suspense fallback={<LoadingFallback />}>
      <Team />
    </Suspense>
    <Footer />
  </div>
)

// Customer Support page
const CustomerSupportPage = () => (
  <div className="min-h-screen bg-white">
    <SEO customData={{ title: "Customer Support - Kdadks Service Private Limited", description: "Get comprehensive customer support for all Kdadks services including IT Wala, Ayuh Clinic, Nirchal, and Raahirides." }} />
    <Header />
    <Suspense fallback={<LoadingFallback />}>
      <CustomerSupport />
    </Suspense>
    <Footer />
  </div>
)

// Service Inquiry page
const ServiceInquiryPage = () => (
  <div className="min-h-screen bg-white">
    <SEO customData={{ title: "Service Inquiry - Kdadks Service Private Limited", description: "Explore our comprehensive services across IT, healthcare, fashion, and travel. Get detailed information and request quotes." }} />
    <Header />
    <Suspense fallback={<LoadingFallback />}>
      <ServiceInquiry />
    </Suspense>
    <Footer />
  </div>
)

// Book Consultation page
const BookConsultationPage = () => (
  <div className="min-h-screen bg-white">
    <SEO customData={{ title: "Book Consultation - Kdadks Service Private Limited", description: "Schedule consultations with our experts across IT, healthcare, fashion, and travel services." }} />
    <Header />
    <Suspense fallback={<LoadingFallback />}>
      <BookConsultation />
    </Suspense>
    <Footer />
  </div>
)

// Partnership page
const PartnershipPage = () => (
  <div className="min-h-screen bg-white">
    <SEO customData={{ title: "Partnership Opportunities - Kdadks Service Private Limited", description: "Explore partnership opportunities with Kdadks across technology, healthcare, fashion, and travel sectors." }} />
    <Header />
    <Suspense fallback={<LoadingFallback />}>
      <Partnership />
    </Suspense>
    <Footer />
  </div>
)

const Router = () => {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <ToastProvider>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            {/* Main site routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/shipping" element={<ShippingPage />} />
            <Route path="/refund" element={<RefundPage />} />
            <Route path="/team" element={<TeamPage />} />
            
            {/* Support routes */}
            <Route path="/support" element={<CustomerSupportPage />} />
            <Route path="/service-inquiry" element={<ServiceInquiryPage />} />
            <Route path="/consultation" element={<BookConsultationPage />} />
            <Route path="/partnership" element={<PartnershipPage />} />
            
            {/* Admin routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<SimpleAdminDashboard />} />
            
            {/* Employee Portal routes */}
            <Route path="/employee/login" element={<EmployeeLogin />} />
            <Route path="/employee/change-password" element={<ChangePassword />} />
            <Route path="/employee" element={<ProtectedEmployeeRoute><EmployeeLayout><EmployeeDashboard /></EmployeeLayout></ProtectedEmployeeRoute>} />
            <Route path="/employee/leaves" element={<ProtectedEmployeeRoute><EmployeeLayout><LeaveManagement /></EmployeeLayout></ProtectedEmployeeRoute>} />
            <Route path="/employee/attendance" element={<ProtectedEmployeeRoute><EmployeeLayout><AttendanceMarking /></EmployeeLayout></ProtectedEmployeeRoute>} />
            <Route path="/employee/profile" element={<ProtectedEmployeeRoute><EmployeeLayout><EmployeeProfile /></EmployeeLayout></ProtectedEmployeeRoute>} />
            <Route path="/employee/salary" element={<ProtectedEmployeeRoute><EmployeeLayout><EmployeeSalarySlips /></EmployeeLayout></ProtectedEmployeeRoute>} />
            <Route path="/employee/documents" element={<ProtectedEmployeeRoute><EmployeeLayout><EmployeeDocuments /></EmployeeLayout></ProtectedEmployeeRoute>} />
            <Route path="/employee/performance" element={<ProtectedEmployeeRoute><EmployeeLayout><EmployeePerformanceFeedback /></EmployeeLayout></ProtectedEmployeeRoute>} />
            <Route path="/employee/compensation" element={<ProtectedEmployeeRoute><EmployeeLayout><EmployeeCompensation /></EmployeeLayout></ProtectedEmployeeRoute>} />
            
            {/* Payment routes */}
            <Route path="/payment/:token" element={<CheckoutPage />} />
            <Route path="/payment/checkout/:requestId" element={<CheckoutPage />} />
            <Route path="/payment/success/:requestId" element={<PaymentSuccessPage />} />
            <Route path="/payment/status/:requestId" element={<PaymentPage />} />
            <Route path="/payment/success/:requestId" element={<PaymentPage />} />
            <Route path="/payment/failure/:requestId" element={<PaymentPage />} />
            
            {/* Catch all route - redirect to home */}
            <Route path="*" element={<HomePage />} />
          </Routes>
        </Suspense>
      </ToastProvider>
    </BrowserRouter>
  )
}

export default Router