import React from 'react'
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin, Code, Heart, Users, Car } from 'lucide-react'

const Footer = () => {
  const footerLinks = {
    company: [
      { name: 'About Us', href: '#about' },
      { name: 'Our Vision', href: '#about' },
      { name: 'Core Values', href: '#about' },
      { name: 'Contact Us', href: '#contact' },
    ],
    brands: [
      { name: 'IT Wala', href: 'https://it-wala.com/', external: true },
      { name: 'Ayuh Clinic', href: 'https://www.ayuhclinic.com/', external: true },
      { name: 'Nirchal', href: 'https://nirchal.com/', external: true },
      { name: 'Raahirides', href: 'https://raahirides.com/', external: true },
    ],
    services: [
      { name: 'IT Consulting & Training', href: '#services' },
      { name: 'Healthcare Services', href: '#services' },
      { name: 'Fashion & Tailoring', href: '#services' },
      { name: 'Travel Solutions', href: '#services' },
    ],
    support: [
      { name: 'Customer Support', href: '#contact' },
      { name: 'Service Inquiry', href: '#contact' },
      { name: 'Book Consultation', href: '#contact' },
      { name: 'Partnership', href: '#contact' },
    ],
    legal: [
      { name: 'Privacy Policy', href: '#privacy' },
      { name: 'Terms & Conditions', href: '#terms' },
      { name: 'Shipping Policy', href: '#shipping' },
      { name: 'Cancellation & Refund', href: '#refund' },
    ],
  }

  const socialLinks = [
    { name: 'Facebook', icon: Facebook, href: '#' },
    { name: 'Twitter', icon: Twitter, href: '#' },
    { name: 'Instagram', icon: Instagram, href: '#' },
    { name: 'LinkedIn', icon: Linkedin, href: '#' },
  ]

  const brandIcons = [
    { name: 'IT Wala', icon: Code, logo: '/IT - WALA_logo (1).png', color: 'text-blue-400' },
    { name: 'Ayuh Clinic', icon: Heart, logo: '/AYUH_Logo_2.png', color: 'text-red-400' },
    { name: 'Nirchal', icon: Users, logo: '/Nirchal_Logo.png', color: 'text-purple-400' },
    { name: 'Raahirides', icon: Car, color: 'text-orange-400' },
  ]

  return (
    <footer className="bg-secondary-900 text-white">
      {/* Main Footer */}
      <div className="container-custom py-12">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <img
                src="/Logo.png"
                alt="Kdadks Logo"
                className="h-6 w-auto"
              />
              <h3 className="text-lg font-bold text-white">
                Kdadks Service Private Limited
              </h3>
            </div>
            <p className="text-gray-400 text-sm mb-4 leading-relaxed">
              Multi-industry excellence in IT, healthcare, fashion, and travel solutions.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center space-x-2 text-sm">
                <Mail className="w-4 h-4 text-primary-400" />
                <span className="text-gray-400">support@kdadks.com</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Phone className="w-4 h-4 text-primary-400" />
                <span className="text-gray-400">+91 7982303199</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <MapPin className="w-4 h-4 text-primary-400" />
                <span className="text-gray-400">Lucknow, UP, India</span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex space-x-3">
              {socialLinks.map((social) => {
                const Icon = social.icon
                return (
                  <a
                    key={social.name}
                    href={social.href}
                    className="w-8 h-8 bg-secondary-800 rounded-md flex items-center justify-center hover:bg-primary-600 transition-colors duration-200"
                    aria-label={social.name}
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                )
              })}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-white mb-3 text-sm uppercase tracking-wide">Quick Links</h4>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-gray-400 hover:text-white transition-colors duration-200 text-sm"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Our Brands */}
          <div>
            <h4 className="font-semibold text-white mb-3 text-sm uppercase tracking-wide">Our Brands</h4>
            <ul className="space-y-2">
              {footerLinks.brands.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    target={link.external ? '_blank' : '_self'}
                    rel={link.external ? 'noopener noreferrer' : ''}
                    className="text-gray-400 hover:text-white transition-colors duration-200 text-sm flex items-center"
                  >
                    {link.name}
                    {link.external && (
                      <span className="ml-1 text-xs">↗</span>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal & Support */}
          <div>
            <h4 className="font-semibold text-white mb-3 text-sm uppercase tracking-wide">Legal & Support</h4>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-gray-400 hover:text-white transition-colors duration-200 text-sm"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href="#contact"
                  className="text-gray-400 hover:text-white transition-colors duration-200 text-sm"
                >
                  Contact Support
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="border-t border-secondary-800">
        <div className="container-custom py-4">
          <div className="flex flex-col md:flex-row items-center justify-between text-sm">
            <p className="text-gray-500 mb-2 md:mb-0">
              © 2025 Kdadks Service Private Limited. All rights reserved.
            </p>
            <div className="flex items-center space-x-4 text-gray-500">

            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer