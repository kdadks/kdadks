import React, { useState } from 'react'
import { Headphones, Mail, Phone, MessageCircle, Clock, ArrowLeft, Send, CheckCircle } from 'lucide-react'

const CustomerSupport = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    serviceType: '',
    priority: 'medium',
    subject: '',
    message: ''
  })
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Simulate form submission
    setIsSubmitted(true)
    // Reset form after 3 seconds
    setTimeout(() => {
      setIsSubmitted(false)
      setFormData({
        name: '',
        email: '',
        phone: '',
        serviceType: '',
        priority: 'medium',
        subject: '',
        message: ''
      })
    }, 3000)
  }

  const supportChannels = [
    {
      icon: Phone,
      title: 'Phone Support',
      description: 'Speak with our support team',
      contact: '+91 7982303199',
      availability: 'Mon-Fri, 9:00 AM - 6:00 PM IST',
      action: 'Call Now'
    },
    {
      icon: Mail,
      title: 'Email Support',
      description: 'Send us a detailed message',
      contact: 'support@kdadks.com',
      availability: 'Response within 24 hours',
      action: 'Send Email'
    },
    {
      icon: MessageCircle,
      title: 'Live Chat',
      description: 'Chat with our support team',
      contact: 'Available on website',
      availability: 'Mon-Fri, 9:00 AM - 6:00 PM IST',
      action: 'Start Chat'
    }
  ]

  const faqCategories = [
    {
      category: 'IT Services',
      questions: [
        {
          q: 'What IT consulting services do you provide?',
          a: 'We offer comprehensive IT consulting including software development, system integration, cloud migration, cybersecurity, and digital transformation services.'
        },
        {
          q: 'Do you provide 24/7 technical support?',
          a: 'Yes, we offer 24/7 technical support for our enterprise clients with SLA agreements. Standard support is available during business hours.'
        }
      ]
    },
    {
      category: 'Healthcare (Ayuh Clinic)',
      questions: [
        {
          q: 'How do I book an appointment at Ayuh Clinic?',
          a: 'You can book appointments through our website, by calling our helpline, or visiting the clinic directly. Online booking is available 24/7.'
        },
        {
          q: 'What are your consultation fees?',
          a: 'Consultation fees vary by specialist and type of consultation. Please check our website or call for current pricing.'
        }
      ]
    },
    {
      category: 'Fashion (Nirchal)',
      questions: [
        {
          q: 'What is your return policy for fashion items?',
          a: 'We offer a 7-day return policy for all fashion items in original condition with tags. Custom tailored items are non-returnable.'
        },
        {
          q: 'Do you provide custom tailoring services?',
          a: 'Yes, Nirchal specializes in custom tailoring for both men and women. We offer fitting sessions and delivery within 7-14 days.'
        }
      ]
    },
    {
      category: 'Travel (Raahirides)',
      questions: [
        {
          q: 'How do I cancel or modify my travel booking?',
          a: 'You can cancel or modify bookings through your account dashboard or by contacting our travel support team. Cancellation charges may apply based on timing.'
        },
        {
          q: 'What safety measures do you have in place?',
          a: 'All our vehicles are regularly sanitized, drivers are background-verified, and we provide real-time tracking for all trips.'
        }
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="container-custom">
        {/* Back Button */}
        <div className="mb-8">
          <a
            href="/"
            className="inline-flex items-center text-primary-600 hover:text-primary-700 transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </a>
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <Headphones className="w-12 h-12 text-primary-600 mr-3" />
            <h1 className="text-4xl font-bold text-secondary-900">Customer Support</h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            We're here to help! Get support for all Kdadks Service Private Limited brands including 
            IT Wala, Ayuh Clinic, Nirchal, and Raahirides.
          </p>
        </div>

        {/* Support Channels */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {supportChannels.map((channel, index) => {
            const Icon = channel.icon
            return (
              <div key={index} className="bg-white rounded-lg shadow-lg p-6 text-center">
                <Icon className="w-12 h-12 text-primary-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-secondary-900 mb-2">{channel.title}</h3>
                <p className="text-gray-600 mb-3">{channel.description}</p>
                <p className="font-semibold text-secondary-900 mb-2">{channel.contact}</p>
                <div className="flex items-center justify-center text-sm text-gray-500 mb-4">
                  <Clock className="w-4 h-4 mr-1" />
                  {channel.availability}
                </div>
                <button className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors duration-200">
                  {channel.action}
                </button>
              </div>
            )
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Contact Form */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-secondary-900 mb-6">Submit a Support Request</h2>
            
            {isSubmitted ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-green-700 mb-2">Request Submitted!</h3>
                <p className="text-gray-600">We'll get back to you within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Service Type *
                    </label>
                    <select
                      required
                      value={formData.serviceType}
                      onChange={(e) => setFormData({...formData, serviceType: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select Service</option>
                      <option value="it-consulting">IT Consulting (IT Wala)</option>
                      <option value="healthcare">Healthcare (Ayuh Clinic)</option>
                      <option value="fashion">Fashion (Nirchal)</option>
                      <option value="travel">Travel (Raahirides)</option>
                      <option value="general">General Inquiry</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority Level *
                  </label>
                  <select
                    required
                    value={formData.priority}
                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="low">Low - General Question</option>
                    <option value="medium">Medium - Need Assistance</option>
                    <option value="high">High - Urgent Issue</option>
                    <option value="critical">Critical - Service Down</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Brief description of your issue"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message *
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={formData.message}
                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Please provide detailed information about your issue or question"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-primary-600 text-white py-3 px-4 rounded-md hover:bg-primary-700 transition-colors duration-200 flex items-center justify-center"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Submit Support Request
                </button>
              </form>
            )}
          </div>

          {/* FAQ Section */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-secondary-900 mb-6">Frequently Asked Questions</h2>
            
            <div className="space-y-6">
              {faqCategories.map((category, categoryIndex) => (
                <div key={categoryIndex}>
                  <h3 className="text-lg font-semibold text-primary-600 mb-3">{category.category}</h3>
                  <div className="space-y-3">
                    {category.questions.map((faq, faqIndex) => (
                      <div key={faqIndex} className="border-l-2 border-gray-200 pl-4">
                        <h4 className="font-medium text-secondary-900 mb-1">{faq.q}</h4>
                        <p className="text-gray-600 text-sm">{faq.a}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Can't find what you're looking for?</strong><br/>
                Use the contact form or reach out through any of our support channels above.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomerSupport
