import React, { useState } from 'react'
import { Mail, Phone, MapPin, Send, Clock, CheckCircle, Car } from 'lucide-react'

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    message: '',
  })
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission here
    setIsSubmitted(true)
    setTimeout(() => setIsSubmitted(false), 3000)
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
    <section id="contact" className="section-padding bg-gradient-secondary">
      <div className="container-custom">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-secondary-900 mb-6">
            Get In Touch
            <span className="block text-gradient">With Our Team</span>
          </h2>
          <p className="text-xl text-secondary-600 max-w-3xl mx-auto leading-relaxed mb-8">
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

        <div className="grid lg:grid-cols-2 gap-16">
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
              <form onSubmit={handleSubmit} className="space-y-6">
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

                <button
                  type="submit"
                  className="w-full btn-primary flex items-center justify-center"
                >
                  Send Message
                  <Send className="ml-2 w-5 h-5" />
                </button>
              </form>
            )}
          </div>

          {/* Contact Information */}
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold text-secondary-900 mb-6">
                Contact Information
              </h3>
              <p className="text-secondary-600 mb-8 leading-relaxed">
                We're here to help and answer any question you might have. 
                We look forward to hearing from you.
              </p>
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

            {/* Map Placeholder */}
            <div className="bg-gray-200 rounded-lg h-64 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Interactive Map</p>
                <p className="text-sm text-gray-500">Location visualization</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Contact