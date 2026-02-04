import React, { useState, useRef } from 'react'
import { Search, Laptop, Heart, Shirt, Car, ArrowLeft, Send, CheckCircle, Star, Shield } from 'lucide-react'
import ReCaptchaEnterprise, { ReCaptchaEnterpriseRef } from './ui/ReCaptchaEnterprise'
import { useToast } from './ui/ToastProvider'

const ServiceInquiry = () => {
  const { showError } = useToast();
  const [selectedService, setSelectedService] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    serviceType: '',
    budget: '',
    timeline: '',
    description: '',
    requirements: ''
  })
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const recaptchaRef = useRef<ReCaptchaEnterpriseRef>(null)

  const services = [
    {
      id: 'it-consulting',
      icon: Laptop,
      title: 'IT Consulting & Training',
      brand: 'IT Wala',
      description: 'Comprehensive IT solutions for businesses',
      services: [
        'Software Development',
        'Cloud Migration & Management',
        'Cybersecurity Consulting',
        'IT Infrastructure Setup',
        'Digital Transformation',
        'Technical Training Programs',
        'System Integration',
        'Database Management'
      ],
      timeline: '2-12 weeks depending on complexity'
    },
    {
      id: 'healthcare',
      icon: Heart,
      title: 'Healthcare Services',
      brand: 'Ayuh Clinic',
      description: 'Comprehensive healthcare and wellness services',
      services: [
        'General Consultation',
        'Specialist Consultations',
        'Health Checkups',
        'Diagnostic Services',
        'Preventive Care',
        'Wellness Programs',
        'Telemedicine',
        'Health Monitoring'
      ],
      timeline: 'Same day to 1 week for appointments'
    },
    {
      id: 'fashion',
      icon: Shirt,
      title: 'Fashion & Tailoring',
      brand: 'Nirchal',
      description: 'Custom fashion and tailoring services',
      services: [
        'Custom Tailoring',
        'Fashion Design',
        'Alterations & Repairs',
        'Wedding Outfits',
        'Corporate Wear',
        'Ethnic Wear',
        'Western Wear',
        'Accessories'
      ],
      timeline: '1-3 weeks for custom orders'
    },
    {
      id: 'travel',
      icon: Car,
      title: 'Travel Solutions',
      brand: 'Raahirides',
      description: 'Complete travel and transportation services',
      services: [
        'Airport Transfers',
        'City Tours',
        'Long Distance Travel',
        'Corporate Transportation',
        'Event Transportation',
        'Luxury Car Rentals',
        'Driver Services',
        'Travel Planning'
      ],
      timeline: 'Immediate to advance booking'
    }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    try {
      // Execute reCAPTCHA Enterprise verification
      const token = await recaptchaRef.current?.execute()
      if (!token) {
        throw new Error('reCAPTCHA verification failed')
      }

      // Prepare email data
      const emailData = {
        to: 'support@kdadks.com',
        subject: `Service Inquiry - ${formData.serviceType || 'General'} - ${formData.name}`,
        html: generateEmailHTML(),
        recaptchaToken: token,
        recaptchaAction: 'service_inquiry'
      }

      // Send email
      const isProduction = import.meta.env.MODE === 'production' || window.location.hostname !== 'localhost';
      const apiEndpoint = isProduction ? '/.netlify/functions/send-email' : '/api/send-email';
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData)
      })

      if (response.ok) {
        setIsSubmitted(true)
        // Reset form after 3 seconds
        setTimeout(() => {
          setIsSubmitted(false)
          setFormData({
            name: '',
            email: '',
            phone: '',
            company: '',
            serviceType: '',
            budget: '',
            timeline: '',
            description: '',
            requirements: ''
          })
          setSelectedService('')
        }, 3000)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send email')
      }
    } catch (error) {
      console.error('Error sending email:', error)
      showError(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false)
    }
  }

  const generateEmailHTML = () => {
    const selectedServiceData = services.find(s => s.id === formData.serviceType)
    
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1f2937; margin: 0; font-size: 24px;">Service Inquiry Submission</h1>
            <p style="color: #6b7280; margin: 10px 0 0 0;">New service inquiry from Kdadks website</p>
          </div>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
            <h2 style="color: #374151; margin: 0 0 15px 0; font-size: 18px;">Contact Information</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4b5563; width: 120px;">Name:</td>
                <td style="padding: 8px 0; color: #1f2937;">${formData.name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4b5563;">Email:</td>
                <td style="padding: 8px 0; color: #1f2937;">${formData.email}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4b5563;">Phone:</td>
                <td style="padding: 8px 0; color: #1f2937;">${formData.phone}</td>
              </tr>
              ${formData.company ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4b5563;">Company:</td>
                <td style="padding: 8px 0; color: #1f2937;">${formData.company}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <div style="background-color: #eff6ff; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
            <h2 style="color: #374151; margin: 0 0 15px 0; font-size: 18px;">Service Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4b5563; width: 120px;">Service Type:</td>
                <td style="padding: 8px 0; color: #1f2937;">${selectedServiceData?.title || formData.serviceType} (${selectedServiceData?.brand || ''})</td>
              </tr>
              ${formData.budget ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4b5563;">Budget:</td>
                <td style="padding: 8px 0; color: #1f2937;">${formData.budget}</td>
              </tr>
              ` : ''}
              ${formData.timeline ? `
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4b5563;">Timeline:</td>
                <td style="padding: 8px 0; color: #1f2937;">${formData.timeline}</td>
              </tr>
              ` : ''}
            </table>
          </div>

          <div style="background-color: #f0fdf4; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
            <h2 style="color: #374151; margin: 0 0 15px 0; font-size: 18px;">Project Details</h2>
            <div style="margin-bottom: 15px;">
              <h3 style="color: #4b5563; margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">Description:</h3>
              <p style="color: #1f2937; margin: 0; line-height: 1.6; white-space: pre-wrap;">${formData.description}</p>
            </div>
            ${formData.requirements ? `
            <div>
              <h3 style="color: #4b5563; margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">Specific Requirements:</h3>
              <p style="color: #1f2937; margin: 0; line-height: 1.6; white-space: pre-wrap;">${formData.requirements}</p>
            </div>
            ` : ''}
          </div>

          <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              <strong>Next Steps:</strong> Please follow up with the customer within 24 hours to discuss their requirements and provide a detailed proposal.
            </p>
          </div>

          <div style="margin-top: 30px; text-align: center; color: #6b7280; font-size: 12px;">
            <p style="margin: 0;">This email was sent from the Kdadks Service Inquiry form</p>
            <p style="margin: 5px 0 0 0;">Submitted on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
          </div>
        </div>
      </div>
    `
  }

  const selectedServiceData = services.find(s => s.id === selectedService)

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
            <Search className="w-12 h-12 text-primary-600 mr-3" />
            <h1 className="text-4xl font-bold text-secondary-900">Service Inquiry</h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Explore our comprehensive services across IT, healthcare, fashion, and travel. 
            Get detailed information and request quotes for your specific needs.
          </p>
        </div>

        {/* Service Selection */}
        <div className="mb-12">
          <h2 className="text-2xl font-semibold text-secondary-900 mb-6 text-center">Choose Your Service</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service) => {
              const Icon = service.icon
              return (
                <div
                  key={service.id}
                  onClick={() => setSelectedService(service.id)}
                  className={`bg-white rounded-lg shadow-lg p-6 cursor-pointer transition-all duration-200 border-2 ${
                    selectedService === service.id 
                      ? 'border-primary-500 ring-2 ring-primary-200' 
                      : 'border-transparent hover:border-primary-300'
                  }`}
                >
                  <Icon className={`w-12 h-12 mx-auto mb-4 ${
                    selectedService === service.id ? 'text-primary-600' : 'text-gray-400'
                  }`} />
                  <h3 className="text-lg font-semibold text-secondary-900 text-center mb-2">
                    {service.title}
                  </h3>
                  <p className="text-sm text-primary-600 text-center mb-2 font-medium">
                    {service.brand}
                  </p>
                  <p className="text-gray-600 text-sm text-center">
                    {service.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Service Details */}
          {selectedServiceData && (
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="flex items-center mb-6">
                <selectedServiceData.icon className="w-8 h-8 text-primary-600 mr-3" />
                <div>
                  <h3 className="text-2xl font-semibold text-secondary-900">
                    {selectedServiceData.title}
                  </h3>
                  <p className="text-primary-600 font-medium">{selectedServiceData.brand}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold text-secondary-900 mb-3">Our Services Include:</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedServiceData.services.map((item, index) => (
                      <div key={index} className="flex items-center text-sm">
                        <Star className="w-3 h-3 text-yellow-500 mr-2 flex-shrink-0" />
                        <span className="text-gray-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h5 className="font-semibold text-blue-800 mb-1">Timeline</h5>
                  <p className="text-blue-700 text-sm">{selectedServiceData.timeline}</p>
                </div>
              </div>
            </div>
          )}

          {/* Inquiry Form */}
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-2xl font-semibold text-secondary-900 mb-6">Request Service Information</h2>
            
            {isSubmitted ? (
              <div className="text-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-green-700 mb-2">Inquiry Submitted!</h3>
                <p className="text-gray-600">Our team will contact you within 24 hours with detailed information.</p>
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
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Company/Organization
                    </label>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({...formData, company: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Service Required *
                  </label>
                  <select
                    required
                    value={formData.serviceType}
                    onChange={(e) => {
                      setFormData({...formData, serviceType: e.target.value})
                      setSelectedService(e.target.value)
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select Service Type</option>
                    <option value="it-consulting">IT Consulting & Training (IT Wala)</option>
                    <option value="healthcare">Healthcare Services (Ayuh Clinic)</option>
                    <option value="fashion">Fashion & Tailoring (Nirchal)</option>
                    <option value="travel">Travel Solutions (Raahirides)</option>
                  </select>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Budget Range
                    </label>
                    <select
                      value={formData.budget}
                      onChange={(e) => setFormData({...formData, budget: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select Budget Range</option>
                      <option value="under-25k">Under ₹25,000</option>
                      <option value="25k-50k">₹25,000 - ₹50,000</option>
                      <option value="50k-1l">₹50,000 - ₹1,00,000</option>
                      <option value="1l-5l">₹1,00,000 - ₹5,00,000</option>
                      <option value="above-5l">Above ₹5,00,000</option>
                      <option value="discuss">Discuss with team</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Timeline
                    </label>
                    <select
                      value={formData.timeline}
                      onChange={(e) => setFormData({...formData, timeline: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select Timeline</option>
                      <option value="immediate">Immediate (Within 1 week)</option>
                      <option value="month">Within 1 month</option>
                      <option value="quarter">Within 3 months</option>
                      <option value="flexible">Flexible timeline</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Description *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Please describe your project or service requirements in detail"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Specific Requirements
                  </label>
                  <textarea
                    rows={3}
                    value={formData.requirements}
                    onChange={(e) => setFormData({...formData, requirements: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Any specific requirements, technologies, or preferences"
                  />
                </div>

                {/* reCAPTCHA */}
                <div className="flex flex-col items-center">
                  <div className="flex items-center mb-2">
                    <Shield className="w-4 h-4 text-gray-600 mr-2" />
                    <span className="text-sm text-gray-600">Security Verification</span>
                  </div>
                  <ReCaptchaEnterprise
                    ref={recaptchaRef}
                    action="service_inquiry"
                    onVerify={() => {}} // Invisible reCAPTCHA doesn't need this
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-primary-600 text-white py-3 px-4 rounded-md hover:bg-primary-700 transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isSubmitting ? 'Submitting...' : 'Submit Service Inquiry'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ServiceInquiry
