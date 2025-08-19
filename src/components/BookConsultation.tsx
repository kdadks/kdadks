import React, { useState, useRef } from 'react'
import { Calendar, Clock, Video, Users, ArrowLeft, Send, CheckCircle, User, MapPin, Shield } from 'lucide-react'
import ReCaptcha, { ReCaptchaRef } from './ui/ReCaptcha'

const BookConsultation = () => {
  const [selectedService, setSelectedService] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [consultationType, setConsultationType] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    purpose: '',
    details: ''
  })
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [recaptchaToken, setRecaptchaToken] = useState<string | null>(null)
  const recaptchaRef = useRef<ReCaptchaRef>(null)

  const handleRecaptchaChange = (token: string | null) => {
    setRecaptchaToken(token)
  }

  const handleRecaptchaExpired = () => {
    setRecaptchaToken(null)
  }

  const consultationServices = [
    {
      id: 'it-strategy',
      title: 'IT Strategy Consultation',
      brand: 'IT Wala',
      duration: '60 minutes',
      price: 'Free initial consultation',
      description: 'Strategic IT planning and digital transformation guidance',
      expertise: ['Cloud Migration', 'Cybersecurity', 'Digital Transformation', 'System Architecture']
    },
    {
      id: 'health-checkup',
      title: 'Health Consultation',
      brand: 'Ayuh Clinic',
      duration: '30-45 minutes',
      price: 'Starting from ₹500',
      description: 'Professional healthcare consultation with experienced doctors',
      expertise: ['General Medicine', 'Preventive Care', 'Health Screening', 'Wellness Planning']
    },
    {
      id: 'fashion-design',
      title: 'Fashion Design Consultation',
      brand: 'Nirchal',
      duration: '45 minutes',
      price: 'Free for custom orders',
      description: 'Personal styling and custom fashion design consultation',
      expertise: ['Custom Tailoring', 'Style Advisory', 'Wedding Outfits', 'Corporate Wear']
    },
    {
      id: 'travel-planning',
      title: 'Travel Planning Consultation',
      brand: 'Raahirides',
      duration: '30 minutes',
      price: 'Free consultation',
      description: 'Comprehensive travel planning and transportation solutions',
      expertise: ['Trip Planning', 'Corporate Travel', 'Event Transportation', 'Logistics']
    }
  ]

  const timeSlots = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
    '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM'
  ]

  const consultationTypes = [
    {
      id: 'in-person',
      title: 'In-Person Meeting',
      icon: Users,
      description: 'Face-to-face consultation at our office',
      availability: 'Mon-Fri, 9:00 AM - 6:00 PM'
    },
    {
      id: 'video-call',
      title: 'Video Consultation',
      icon: Video,
      description: 'Online consultation via video call',
      availability: 'Mon-Sat, 9:00 AM - 8:00 PM'
    },
    {
      id: 'phone-call',
      title: 'Phone Consultation',
      icon: Clock,
      description: 'Consultation over phone call',
      availability: 'Mon-Sat, 9:00 AM - 8:00 PM'
    }
  ]

  // Generate next 14 days for date selection
  const getAvailableDates = () => {
    const dates = []
    const today = new Date()
    for (let i = 1; i <= 14; i++) {
      const date = new Date(today)
      date.setDate(today.getDate() + i)
      // Skip Sundays
      if (date.getDay() !== 0) {
        dates.push(date)
      }
    }
    return dates
  }

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    }
    return date.toLocaleDateString('en-US', options)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate reCAPTCHA
    if (!recaptchaToken) {
      alert('Please complete the reCAPTCHA verification')
      return
    }

    setIsSubmitting(true)
    
    try {
      // Prepare email data
      const emailData = {
        to: 'support@kdadks.com',
        subject: `Consultation Booking - ${selectedServiceData?.title} - ${formData.name}`,
        html: generateEmailHTML(),
        recaptchaToken: recaptchaToken
      }

      // Send email
      const response = await fetch('/api/send-email', {
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
            purpose: '',
            details: ''
          })
          setSelectedService('')
          setSelectedDate('')
          setSelectedTime('')
          setConsultationType('')
          setRecaptchaToken(null)
          recaptchaRef.current?.reset()
        }, 3000)
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to send email')
      }
    } catch (error) {
      console.error('Error sending email:', error)
      alert(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`)
      // Reset reCAPTCHA on error
      setRecaptchaToken(null)
      recaptchaRef.current?.reset()
    } finally {
      setIsSubmitting(false)
    }
  }

  const generateEmailHTML = () => {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
        <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #1f2937; margin: 0; font-size: 24px;">Consultation Booking Request</h1>
            <p style="color: #6b7280; margin: 10px 0 0 0;">New consultation booking from Kdadks website</p>
          </div>
          
          <div style="background-color: #dcfce7; padding: 20px; border-radius: 6px; margin-bottom: 25px; border-left: 4px solid #16a34a;">
            <h2 style="color: #374151; margin: 0 0 15px 0; font-size: 18px;">Consultation Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4b5563; width: 120px;">Service:</td>
                <td style="padding: 8px 0; color: #1f2937;">${selectedServiceData?.title} (${selectedServiceData?.brand})</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4b5563;">Date:</td>
                <td style="padding: 8px 0; color: #1f2937;">${new Date(selectedDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4b5563;">Time:</td>
                <td style="padding: 8px 0; color: #1f2937;">${selectedTime}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4b5563;">Type:</td>
                <td style="padding: 8px 0; color: #1f2937;">${selectedConsultationType?.title}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; font-weight: bold; color: #4b5563;">Duration:</td>
                <td style="padding: 8px 0; color: #1f2937;">${selectedServiceData?.duration}</td>
              </tr>
            </table>
          </div>

          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
            <h2 style="color: #374151; margin: 0 0 15px 0; font-size: 18px;">Client Information</h2>
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
            <h2 style="color: #374151; margin: 0 0 15px 0; font-size: 18px;">Consultation Purpose</h2>
            <p style="color: #1f2937; margin: 0 0 15px 0; line-height: 1.6; font-weight: bold;">${formData.purpose}</p>
            ${formData.details ? `
            <div>
              <h3 style="color: #4b5563; margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">Additional Details:</h3>
              <p style="color: #1f2937; margin: 0; line-height: 1.6; white-space: pre-wrap;">${formData.details}</p>
            </div>
            ` : ''}
          </div>

          <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              <strong>Action Required:</strong> Please confirm this consultation booking and send meeting details to the client within 30 minutes.
            </p>
          </div>

          <div style="margin-top: 30px; text-align: center; color: #6b7280; font-size: 12px;">
            <p style="margin: 0;">This email was sent from the Kdadks Consultation Booking form</p>
            <p style="margin: 5px 0 0 0;">Submitted on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</p>
          </div>
        </div>
      </div>
    `
  }

  const selectedServiceData = consultationServices.find(s => s.id === selectedService)
  const selectedConsultationType = consultationTypes.find(c => c.id === consultationType)

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
            <Calendar className="w-12 h-12 text-primary-600 mr-3" />
            <h1 className="text-4xl font-bold text-secondary-900">Book Consultation</h1>
          </div>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Schedule a consultation with our experts across IT, healthcare, fashion, and travel services. 
            Get personalized advice and solutions for your needs.
          </p>
        </div>

        {isSubmitted ? (
          <div className="bg-white rounded-lg shadow-lg p-12 max-w-2xl mx-auto text-center">
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
            <h2 className="text-3xl font-semibold text-green-700 mb-4">Consultation Booked!</h2>
            <div className="text-gray-600 space-y-2 mb-6">
              <p><strong>Service:</strong> {selectedServiceData?.title}</p>
              <p><strong>Date:</strong> {selectedDate}</p>
              <p><strong>Time:</strong> {selectedTime}</p>
              <p><strong>Type:</strong> {selectedConsultationType?.title}</p>
            </div>
            <p className="text-gray-600">
              We'll send you a confirmation email with meeting details within 30 minutes.
            </p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {/* Step 1: Service Selection */}
            <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-semibold text-secondary-900 mb-6">Step 1: Choose Consultation Type</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {consultationServices.map((service) => (
                  <div
                    key={service.id}
                    onClick={() => setSelectedService(service.id)}
                    className={`border-2 rounded-lg p-6 cursor-pointer transition-all duration-200 ${
                      selectedService === service.id 
                        ? 'border-primary-500 bg-primary-50' 
                        : 'border-gray-200 hover:border-primary-300'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-secondary-900">{service.title}</h3>
                      <span className="text-sm text-primary-600 font-medium">{service.brand}</span>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">{service.description}</p>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Duration: {service.duration}</span>
                      <span className="text-green-600 font-medium">{service.price}</span>
                    </div>
                    <div className="mt-3">
                      <div className="flex flex-wrap gap-1">
                        {service.expertise.slice(0, 2).map((skill, index) => (
                          <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                            {skill}
                          </span>
                        ))}
                        {service.expertise.length > 2 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                            +{service.expertise.length - 2} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 2: Consultation Method */}
            {selectedService && (
              <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
                <h2 className="text-2xl font-semibold text-secondary-900 mb-6">Step 2: Consultation Method</h2>
                <div className="grid md:grid-cols-3 gap-4">
                  {consultationTypes.map((type) => {
                    const Icon = type.icon
                    return (
                      <div
                        key={type.id}
                        onClick={() => setConsultationType(type.id)}
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 text-center ${
                          consultationType === type.id 
                            ? 'border-primary-500 bg-primary-50' 
                            : 'border-gray-200 hover:border-primary-300'
                        }`}
                      >
                        <Icon className={`w-8 h-8 mx-auto mb-3 ${
                          consultationType === type.id ? 'text-primary-600' : 'text-gray-400'
                        }`} />
                        <h3 className="font-semibold text-secondary-900 mb-2">{type.title}</h3>
                        <p className="text-gray-600 text-sm mb-2">{type.description}</p>
                        <p className="text-xs text-gray-500">{type.availability}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Date & Time Selection */}
            {consultationType && (
              <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
                <h2 className="text-2xl font-semibold text-secondary-900 mb-6">Step 3: Select Date & Time</h2>
                
                {/* Date Selection */}
                <div className="mb-6">
                  <h3 className="font-medium text-gray-700 mb-3">Choose Date</h3>
                  <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-7 gap-2">
                    {getAvailableDates().map((date, index) => {
                      const dateStr = date.toISOString().split('T')[0]
                      return (
                        <button
                          key={index}
                          onClick={() => setSelectedDate(dateStr)}
                          className={`p-3 rounded-lg text-sm transition-all duration-200 ${
                            selectedDate === dateStr
                              ? 'bg-primary-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-primary-100'
                          }`}
                        >
                          {formatDate(date)}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Time Selection */}
                {selectedDate && (
                  <div>
                    <h3 className="font-medium text-gray-700 mb-3">Choose Time</h3>
                    <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                      {timeSlots.map((time) => (
                        <button
                          key={time}
                          onClick={() => setSelectedTime(time)}
                          className={`p-2 rounded-lg text-sm transition-all duration-200 ${
                            selectedTime === time
                              ? 'bg-primary-600 text-white'
                              : 'bg-gray-100 text-gray-700 hover:bg-primary-100'
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Personal Information */}
            {selectedTime && (
              <div className="bg-white rounded-lg shadow-lg p-8">
                <h2 className="text-2xl font-semibold text-secondary-900 mb-6">Step 4: Your Information</h2>
                
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
                      Purpose of Consultation *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.purpose}
                      onChange={(e) => setFormData({...formData, purpose: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Brief description of what you want to discuss"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Details
                    </label>
                    <textarea
                      rows={4}
                      value={formData.details}
                      onChange={(e) => setFormData({...formData, details: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Any specific topics, questions, or requirements you'd like to discuss"
                    />
                  </div>

                  {/* Booking Summary */}
                  <div className="bg-gray-50 rounded-lg p-4 mt-6">
                    <h3 className="font-semibold text-secondary-900 mb-3">Booking Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Service:</span>
                        <span className="font-medium">{selectedServiceData?.title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Date:</span>
                        <span className="font-medium">{selectedDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Time:</span>
                        <span className="font-medium">{selectedTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Type:</span>
                        <span className="font-medium">{selectedConsultationType?.title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Duration:</span>
                        <span className="font-medium">{selectedServiceData?.duration}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-gray-600">Price:</span>
                        <span className="font-medium text-green-600">{selectedServiceData?.price}</span>
                      </div>
                    </div>
                  </div>

                  {/* reCAPTCHA */}
                  <div className="flex flex-col items-center">
                    <div className="flex items-center mb-2">
                      <Shield className="w-4 h-4 text-gray-600 mr-2" />
                      <span className="text-sm text-gray-600">Security Verification</span>
                    </div>
                    <ReCaptcha
                      ref={recaptchaRef}
                      onVerify={handleRecaptchaChange}
                      onExpired={handleRecaptchaExpired}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!recaptchaToken || isSubmitting}
                    className="w-full bg-primary-600 text-white py-3 px-4 rounded-md hover:bg-primary-700 transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {isSubmitting ? 'Submitting...' : 'Confirm Consultation Booking'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default BookConsultation
