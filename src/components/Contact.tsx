import React, { useState } from 'react'
import { Mail, Phone, MapPin, Send, Clock, CheckCircle, Car } from 'lucide-react'
import emailjs from '@emailjs/browser'
import { EMAILJS_CONFIG, EmailTemplateParams } from '../config/emailjs'

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
      // Check if EmailJS is properly configured
      if (
        EMAILJS_CONFIG.PUBLIC_KEY === 'YOUR_PUBLIC_KEY' ||
        EMAILJS_CONFIG.SERVICE_ID === 'YOUR_SERVICE_ID' ||
        EMAILJS_CONFIG.TEMPLATE_ID === 'YOUR_TEMPLATE_ID'
      ) {
        throw new Error('EmailJS not configured. Please set up your EmailJS credentials.')
      }

      // Initialize EmailJS with your public key
      emailjs.init(EMAILJS_CONFIG.PUBLIC_KEY)

      // Prepare template parameters
      const templateParams: EmailTemplateParams = {
        to_email: 'kdadks@outlook.com',
        from_name: formData.name,
        from_email: formData.email,
        company: formData.company || 'Not specified',
        message: formData.message,
        reply_to: formData.email,
      }

      // Send email using EmailJS
      await emailjs.send(
        EMAILJS_CONFIG.SERVICE_ID,
        EMAILJS_CONFIG.TEMPLATE_ID,
        templateParams
      )

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
      details: 'kdadks@outlook.com',
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
          <div className="flex justify-center items-center space-x-8 mb-8">
            <div className="text-center">
              <img
                src="/IT - WALA_logo (1).png"
                alt="IT Wala logo"
                className="h-12 w-auto mx-auto mb-2 object-contain"
              />
              <p className="text-sm text-secondary-500">IT Training & Consulting</p>
            </div>
            <div className="text-center">
              <img
                src="/AYUH_Logo_2.png"
                alt="Ayuh Clinic logo"
                className="h-12 w-auto mx-auto mb-2 object-contain"
              />
              <p className="text-sm text-secondary-500">Healthcare Services</p>
            </div>
            <div className="text-center">
              <img
                src="/Nirchal_Logo.png"
                alt="Nirchal logo"
                className="h-12 w-auto mx-auto mb-2 object-contain"
              />
              <p className="text-sm text-secondary-500">Fashion & Tailoring</p>
            </div>
            <div className="text-center">
              <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Car className="w-6 h-6 text-orange-600" />
              </div>
              <p className="text-sm text-secondary-500">Travel Solutions</p>
            </div>
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
              <meta itemProp="email" content="kdadks@outlook.com" />
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