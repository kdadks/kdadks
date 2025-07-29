import React, { useState, useEffect } from 'react'
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
import SEO from './SEO'
import SEOContent from './SEOContent'
import AdminLogin from './admin/AdminLogin'
import SimpleAdminDashboard from './admin/SimpleAdminDashboard'
import { ToastProvider } from './ui/ToastProvider'

const Router = () => {
  const [currentPage, setCurrentPage] = useState('home')

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '')
      const path = window.location.pathname

      // Handle admin routes - these will be handled by react-router-dom
      if (path.startsWith('/admin')) {
        return
      }

      // Handle regular routes
      switch (hash) {
        case 'privacy':
          setCurrentPage('privacy')
          break
        case 'terms':
          setCurrentPage('terms')
          break
        case 'shipping':
          setCurrentPage('shipping')
          break
        case 'refund':
          setCurrentPage('refund')
          break
        case 'team':
          setCurrentPage('team')
          break
        default:
          setCurrentPage('home')
      }
    }

    // Set initial page based on current hash/path
    handleHashChange()

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange)
    // Listen for popstate (back/forward button)
    window.addEventListener('popstate', handleHashChange)

    return () => {
      window.removeEventListener('hashchange', handleHashChange)
      window.removeEventListener('popstate', handleHashChange)
    }
  }, [])

  const renderPage = () => {
    switch (currentPage) {
      case 'privacy':
        return (
          <div className="min-h-screen bg-white">
            <SEO page="privacy" />
            <Header />
            <PrivacyPolicy />
            <Footer />
          </div>
        )
      case 'terms':
        return (
          <div className="min-h-screen bg-white">
            <SEO page="terms" />
            <Header />
            <TermsConditions />
            <Footer />
          </div>
        )
      case 'shipping':
        return (
          <div className="min-h-screen bg-white">
            <SEO customData={{ title: "Shipping Policy - Kdadks Service Private Limited", description: "Shipping and delivery policy for Kdadks services including fashion products from Nirchal and other physical goods." }} />
            <Header />
            <ShippingPolicy />
            <Footer />
          </div>
        )
      case 'refund':
        return (
          <div className="min-h-screen bg-white">
            <SEO customData={{ title: "Cancellation & Refund Policy - Kdadks Service Private Limited", description: "Cancellation and refund policy for Kdadks services across IT consulting, healthcare, fashion, and travel sectors." }} />
            <Header />
            <CancellationRefund />
            <Footer />
          </div>
        )
      case 'team':
        return (
          <div className="min-h-screen bg-white">
            <SEO customData={{ title: "Our Team - Kdadks Service Private Limited", description: "Meet the expert team behind Kdadks' success across IT consulting, healthcare, fashion, and travel industries." }} />
            <Header />
            <Team />
            <Footer />
          </div>
        )
      default:
        return (
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
    }
  }

  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          {/* Admin routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<SimpleAdminDashboard />} />
          
          {/* Main site routes - render the existing hash-based routing */}
          <Route path="/*" element={renderPage()} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  )
}

export default Router