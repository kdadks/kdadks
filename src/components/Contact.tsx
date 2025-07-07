import React, { useState } from 'react'
import { Mail, Phone, MapPin, Send, Clock, CheckCircle, Car } from 'lucide-react'
import { EmailService } from '../services/emailService'
import { ContactFormData } from '../config/brevo'

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: '',
  })
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitError('')

    try {
      // Validate form data
      if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
        throw new Error('Please fill in all required fields.')
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email)) {
        throw new Error('Please enter a valid email address.')
      }

      // Prepare contact data
      const contactData: ContactFormData = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        company: formData.company?.trim(),
        message: formData.message.trim(),
      }

      // Send email using Brevo service
      await EmailService.sendContactEmail(contactData)

      // Reset form and show success message
      setFormData({
        name: '',
        email: '',
        company: '',
        message: '',
      })
      setIsSubmitted(true)
      setTimeout(() => setIsSubmitted(false), 5000)
    } catch (error) {
      console.error('Email sending failed:', error)
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Failed to send message. Please try again or contact us directly at kdadks@outlook.com'
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const contactInfo = [
    {
      icon: Mail,
      title: 'Email Us',
      details: 'support@kdadks.com',
      description: 'Send us an email anytime',
    },
    {
      icon: Phone,
      title: 'Call Us', 
      details: '+91 7982303199',
      description: 'Mon-Fri from 8am to 5pm',
    },
    {
      icon: MapPin,
      title: 'Visit Us',
      details: 'Lucknow, India',
      description: 'Lucknow, Uttar Pradesh, India',
    },
    {
      icon: Clock,
      title: 'Business Hours',
      details: 'Mon - Fri: 8am - 5pm',
      description: 'Weekend support available',
    },
  ]

  return (
    <section id="contact" className="section-padding bg-gradient-secondary" itemScope itemType="https://schema.org/ContactPage" role="main" aria-labelledby="contact-heading">
      <div className="container-custom">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 id="contact-heading" className="text-3xl md:text-4xl lg:text-5xl font-bold text-secondary-900 mb-6" itemProp="name">
            Get In Touch
            <span className="block text-gradient">With Our Team</span>
          </h2>
          <p className="text-xl text-secondary-600 max-w-3xl mx-auto leading-relaxed mb-8" itemProp="description">
            Ready to start your next project? We'd love to hear from you.
            Send us a message and we'll respond as soon as possible.
          </p>
          
          {/* Brand Logos */}
          <div className="flex flex-wrap justify-center items-center space-x-12 mb-8">
            {/* ITwala clickable logo */}
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('itwala-service');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="text-center focus:outline-none focus:ring-2 focus:ring-blue-400"
              aria-label="Scroll to ITwala Service section"
              style={{ background: 'none', border: 'none', padding: '8px', margin: '4px' }}
            >
              <img
                src="/IT - WALA_logo (1).png"
                alt="IT Wala logo"
                className="h-12 w-auto mx-auto mb-4 object-contain"
              />
              <p className="text-sm text-secondary-500 mt-3">IT Training & Consulting</p>
            </button>
            {/* Ayuh Clinic clickable logo */}
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('ayuh-clinic-service');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="text-center focus:outline-none focus:ring-2 focus:ring-red-400"
              aria-label="Scroll to Ayuh Clinic Service section"
              style={{ background: 'none', border: 'none', padding: '8px', margin: '4px' }}
            >
              <img
                src="/AYUH_Logo_2.png"
                alt="Ayuh Clinic logo"
                className="h-12 w-auto mx-auto mb-4 object-contain"
              />
              <p className="text-sm text-secondary-500 mt-3">Healthcare Services</p>
            </button>
            {/* Nirchal clickable logo */}
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('nirchal-service');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="text-center focus:outline-none focus:ring-2 focus:ring-purple-400"
              aria-label="Scroll to Nirchal Service section"
              style={{ background: 'none', border: 'none', padding: '8px', margin: '4px' }}
            >
              <img
                src="/Nirchal_Logo.png"
                alt="Nirchal logo"
                className="h-12 w-auto mx-auto mb-4 object-contain"
              />
              <p className="text-sm text-secondary-500 mt-3">Fashion & Tailoring</p>
            </button>
            {/* Raahirides clickable logo */}
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('raahirides-service');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="text-center focus:outline-none focus:ring-2 focus:ring-orange-400"
              aria-label="Scroll to Raahirides Service section"
              style={{ background: 'none', border: 'none', padding: '8px', margin: '4px' }}
            >
              <img
                src="/raahi_rides_logo.png"
                alt="Raahirides logo"
                className="h-12 w-auto mx-auto mb-4 object-contain"
              />
              <p className="text-sm text-secondary-500 mt-3">Travel Solutions</p>
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-16" itemScope itemType="https://schema.org/LocalBusiness">
          {/* Contact Form */}
          <div className="card p-8">
            <h3 className="text-2xl font-bold text-secondary-900 mb-6">
              Send us a message
            </h3>
            
            {isSubmitted ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h4 className="text-xl font-semibold text-secondary-900 mb-2">
                  Message Sent Successfully!
                </h4>
                <p className="text-secondary-600">
                  Thank you for reaching out. We'll get back to you within 24 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6" role="form" aria-label="Contact form">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-secondary-700 mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-secondary-700 mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-secondary-700 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                    placeholder="Your Company"
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-secondary-700 mb-2">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    value={formData.message}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200 resize-none"
                    placeholder="Tell us about your project..."
                  />
                </div>

                {submitError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">{submitError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full btn-primary flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Message
                      <Send className="ml-2 w-5 h-5" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Contact Information */}
          <div className="space-y-8" itemScope itemType="https://schema.org/Organization">
            <div>
              <h3 className="text-2xl font-bold text-secondary-900 mb-6">
                Contact Information
              </h3>
              <p className="text-secondary-600 mb-8 leading-relaxed">
                We're here to help and answer any question you might have.
                We look forward to hearing from you.
              </p>
              <meta itemProp="name" content="Kdadks Service Private Limited" />
              <meta itemProp="url" content="https://kdadks.com" />
              <meta itemProp="email" content="support@kdadks.com" />
              <meta itemProp="telephone" content="+91-7982303199" />
              <div itemProp="address" itemScope itemType="https://schema.org/PostalAddress">
                <meta itemProp="addressLocality" content="Lucknow" />
                <meta itemProp="addressRegion" content="Uttar Pradesh" />
                <meta itemProp="addressCountry" content="India" />
              </div>
            </div>

            <div className="space-y-6">
              {contactInfo.map((info, index) => {
                const Icon = info.icon
                return (
                  <div key={info.title} className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-secondary-900 mb-1">
                        {info.title}
                      </h4>
                      <p className="text-secondary-800 font-medium mb-1">
                        {info.details}
                      </p>
                      <p className="text-secondary-600 text-sm">
                        {info.description}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Interactive Google Map */}
            <div className="rounded-lg overflow-hidden shadow-lg border border-gray-200" itemScope itemType="https://schema.org/Place">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d227749.21470693277!2d80.77769745!3d26.8466777!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x399bfd991f32b16b%3A0x93ccba8909978be7!2sLucknow%2C%20Uttar%20Pradesh!5e0!3m2!1sen!2sin!4v1697808000000!5m2!1sen!2sin"
                width="100%"
                height="300"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="KDADKS Location - Lucknow, Uttar Pradesh"
                className="w-full h-64 md:h-80"
                aria-label="Interactive map showing Kdadks location in Lucknow, Uttar Pradesh"
              />
              <meta itemProp="name" content="Kdadks Service Private Limited Office" />
              <div itemProp="address" itemScope itemType="https://schema.org/PostalAddress">
                <meta itemProp="addressLocality" content="Lucknow" />
                <meta itemProp="addressRegion" content="Uttar Pradesh" />
                <meta itemProp="addressCountry" content="India" />
              </div>
              <div className="bg-white p-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-5 h-5 text-primary-600" />
                    <span className="font-medium text-secondary-900">Lucknow, Uttar Pradesh, India</span>
                  </div>
                  <a
                    href="https://www.google.com/maps/dir/?api=1&destination=Lucknow,Uttar+Pradesh,India"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary text-sm"
                  >
                    Get Directions
                  </a>
                </div>
                <p className="text-sm text-secondary-600 mt-2">
                  Contact us at +91 7982303199 for specific location details and directions
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Contact
