import React, { useState, useEffect } from 'react'
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

const Router = () => {
  const [currentPage, setCurrentPage] = useState('home')

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '')
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

    // Set initial page based on current hash
    handleHashChange()

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange)

    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  const renderPage = () => {
    switch (currentPage) {
      case 'privacy':
        return (
          <div className="min-h-screen bg-white">
            <Header />
            <PrivacyPolicy />
            <Footer />
          </div>
        )
      case 'terms':
        return (
          <div className="min-h-screen bg-white">
            <Header />
            <TermsConditions />
            <Footer />
          </div>
        )
      case 'shipping':
        return (
          <div className="min-h-screen bg-white">
            <Header />
            <ShippingPolicy />
            <Footer />
          </div>
        )
      case 'refund':
        return (
          <div className="min-h-screen bg-white">
            <Header />
            <CancellationRefund />
            <Footer />
          </div>
        )
      case 'team':
        return (
          <div className="min-h-screen bg-white">
            <Header />
            <Team />
            <Footer />
          </div>
        )
      default:
        return (
          <div className="min-h-screen bg-white">
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

  return renderPage()
}

export default Router