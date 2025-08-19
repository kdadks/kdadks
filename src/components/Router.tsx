import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Header from './Header'
import Hero from './Hero'
import Features from './Features'
import About from './About'
import Services from './Services'
import Testimonials from './Testimonials'
import Contact from './Contact'
import Footer from './Footer'
import Team from './Team'
import PrivacyPolicy from './PrivacyPolicy'
import TermsConditions from './TermsConditions'
import ShippingPolicy from './ShippingPolicy'
import CancellationRefund from './CancellationRefund'
import CustomerSupport from './CustomerSupport'
import ServiceInquiry from './ServiceInquiry'
import BookConsultation from './BookConsultation'
import Partnership from './Partnership'
import SEO from './SEO'
import SEOContent from './SEOContent'
import AdminLogin from './admin/AdminLogin'
import SimpleAdminDashboard from './admin/SimpleAdminDashboard'
import { ToastProvider } from './ui/ToastProvider'

// Payment Gateway Components (Lazy loaded)
import { CheckoutPage } from './payment/CheckoutPage'
import { PaymentSuccessPage } from './payment/PaymentSuccessPage'
import { PaymentPage } from './payment/PaymentPage'

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
    <PrivacyPolicy />
    <Footer />
  </div>
)

// Terms page
const TermsPage = () => (
  <div className="min-h-screen bg-white">
    <SEO page="terms" />
    <Header />
    <TermsConditions />
    <Footer />
  </div>
)

// Shipping policy page
const ShippingPage = () => (
  <div className="min-h-screen bg-white">
    <SEO customData={{ title: "Shipping Policy - Kdadks Service Private Limited", description: "Shipping and delivery policy for Kdadks services including fashion products from Nirchal and other physical goods." }} />
    <Header />
    <ShippingPolicy />
    <Footer />
  </div>
)

// Refund policy page
const RefundPage = () => (
  <div className="min-h-screen bg-white">
    <SEO customData={{ title: "Cancellation & Refund Policy - Kdadks Service Private Limited", description: "Cancellation and refund policy for Kdadks services across IT consulting, healthcare, fashion, and travel sectors." }} />
    <Header />
    <CancellationRefund />
    <Footer />
  </div>
)

// Team page
const TeamPage = () => (
  <div className="min-h-screen bg-white">
    <SEO customData={{ title: "Our Team - Kdadks Service Private Limited", description: "Meet the expert team behind Kdadks' success across IT consulting, healthcare, fashion, and travel industries." }} />
    <Header />
    <Team />
    <Footer />
  </div>
)

// Customer Support page
const CustomerSupportPage = () => (
  <div className="min-h-screen bg-white">
    <SEO customData={{ title: "Customer Support - Kdadks Service Private Limited", description: "Get comprehensive customer support for all Kdadks services including IT Wala, Ayuh Clinic, Nirchal, and Raahirides." }} />
    <Header />
    <CustomerSupport />
    <Footer />
  </div>
)

// Service Inquiry page
const ServiceInquiryPage = () => (
  <div className="min-h-screen bg-white">
    <SEO customData={{ title: "Service Inquiry - Kdadks Service Private Limited", description: "Explore our comprehensive services across IT, healthcare, fashion, and travel. Get detailed information and request quotes." }} />
    <Header />
    <ServiceInquiry />
    <Footer />
  </div>
)

// Book Consultation page
const BookConsultationPage = () => (
  <div className="min-h-screen bg-white">
    <SEO customData={{ title: "Book Consultation - Kdadks Service Private Limited", description: "Schedule consultations with our experts across IT, healthcare, fashion, and travel services." }} />
    <Header />
    <BookConsultation />
    <Footer />
  </div>
)

// Partnership page
const PartnershipPage = () => (
  <div className="min-h-screen bg-white">
    <SEO customData={{ title: "Partnership Opportunities - Kdadks Service Private Limited", description: "Explore partnership opportunities with Kdadks across technology, healthcare, fashion, and travel sectors." }} />
    <Header />
    <Partnership />
    <Footer />
  </div>
)

const Router = () => {
  return (
    <BrowserRouter>
      <ToastProvider>
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
      </ToastProvider>
    </BrowserRouter>
  )
}

export default Router