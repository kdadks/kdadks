import React, { useState, useEffect } from 'react'
import { Menu, X, ChevronDown } from 'lucide-react'

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navigation = [
    { name: 'Home', href: '#home' },
    { name: 'About', href: '#about' },
    { name: 'Services', href: '#services' },
    { name: 'Team', href: '#team' },
    { name: 'Contact', href: '#contact' },
  ]

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-lg'
          : 'bg-black/20 backdrop-blur-sm'
      }`}
      role="banner"
      aria-label="Main navigation"
    >
      <nav className="container-custom" role="navigation" aria-label="Primary navigation">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <div className="flex-shrink-0">
            <a
              href="#home"
              className="flex items-center space-x-2 hover:scale-105 transition-transform duration-200"
              aria-label="Kdadks Home"
            >
              <img
                src="/Logo.png"
                alt="Kdadks Logo"
                className="h-8 w-auto"
              />
              <span className={`text-2xl font-bold ${isScrolled ? 'text-gradient' : 'text-white drop-shadow-sm'}`}>
                Kdadks
              </span>
            </a>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <nav className="ml-10 flex items-baseline space-x-8" role="menubar" aria-label="Main menu">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className={`px-3 py-2 text-sm font-medium transition-colors duration-200 hover:text-primary-600 ${
                    isScrolled ? 'text-secondary-700' : 'text-white drop-shadow-sm'
                  }`}
                  role="menuitem"
                  aria-label={`Navigate to ${item.name} section`}
                >
                  {item.name}
                </a>
              ))}
            </nav>
          </div>

          {/* CTA Button */}
          <div className="hidden md:block">
            <a
              href="#contact"
              className="btn-primary"
              aria-label="Get started with Kdadks services - Contact us"
            >
              Get Started
            </a>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-2 rounded-md transition-colors duration-200 ${
                isScrolled
                  ? 'text-secondary-700 hover:bg-secondary-100'
                  : 'text-white hover:bg-white/10 drop-shadow-sm'
              }`}
              aria-expanded={isMenuOpen}
              aria-label="Toggle navigation menu"
              aria-controls="mobile-menu"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden" id="mobile-menu">
            <nav className="px-2 pt-2 pb-3 space-y-1 bg-white/95 backdrop-blur-md rounded-lg mt-2 shadow-lg" role="menu" aria-label="Mobile navigation menu">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="block px-3 py-2 text-base font-medium text-secondary-700 hover:text-primary-600 hover:bg-secondary-50 rounded-md transition-colors duration-200"
                  onClick={() => setIsMenuOpen(false)}
                  role="menuitem"
                  aria-label={`Navigate to ${item.name} section`}
                >
                  {item.name}
                </a>
              ))}
              <div className="pt-2" role="none">
                <a
                  href="#contact"
                  className="block w-full text-center btn-primary"
                  onClick={() => setIsMenuOpen(false)}
                  role="menuitem"
                  aria-label="Get started with Kdadks services - Contact us"
                >
                  Get Started
                </a>
              </div>
            </nav>
          </div>
        )}
      </nav>
    </header>
  )
}

export default Header