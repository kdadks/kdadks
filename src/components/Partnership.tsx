import React, { useState } from 'react'
import { Building, Target, Globe, ArrowLeft, Send, CheckCircle, TrendingUp, Users, Award } from 'lucide-react'

const Partnership = () => {
  const [selectedPartnership, setSelectedPartnership] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    website: '',
    industry: '',
    partnershipType: '',
    companySize: '',
    revenue: '',
    experience: '',
    proposal: '',
    goals: ''
  })
  const [isSubmitted, setIsSubmitted] = useState(false)

  const partnershipTypes = [
    {
      id: 'technology',
      title: 'Technology Partnership',
      icon: Globe,
      description: 'Collaborate on IT solutions and technology integration',
      benefits: [
        'Joint technology development',
        'Shared technical expertise',
        'Co-innovation opportunities',
        'Technical support collaboration'
      ],
      suitable: 'Software companies, IT service providers, Tech startups'
    },
    {
      id: 'channel',
      title: 'Channel Partnership',
      icon: TrendingUp,
      description: 'Become a reseller or distributor of our services',
      benefits: [
        'Revenue sharing model',
        'Sales support and training',
        'Marketing collaboration',
        'Territory protection'
      ],
      suitable: 'Sales agencies, Business consultants, Service integrators'
    },
    {
      id: 'strategic',
      title: 'Strategic Alliance',
      icon: Award,
      description: 'Long-term strategic business partnership',
      benefits: [
        'Joint go-to-market strategies',
        'Shared business development',
        'Cross-promotional opportunities',
        'Strategic planning collaboration'
      ],
      suitable: 'Established enterprises, Industry leaders, Investment firms'
    },
    {
      id: 'healthcare',
      title: 'Healthcare Partnership',
      icon: Users,
      description: 'Collaborate with Ayuh Clinic for healthcare services',
      benefits: [
        'Healthcare service integration',
        'Patient referral programs',
        'Medical expertise sharing',
        'Healthcare technology collaboration'
      ],
      suitable: 'Hospitals, Clinics, Healthcare providers, Medical equipment companies'
    }
  ]

  const partnershipBenefits = [
    {
      title: 'Market Expansion',
      description: 'Access new markets and customer segments through our established network',
      icon: Globe
    },
    {
      title: 'Revenue Growth',
      description: 'Increase revenue through joint ventures and revenue sharing models',
      icon: TrendingUp
    },
    {
      title: 'Technical Expertise',
      description: 'Leverage our technical knowledge and experience across multiple industries',
      icon: Building
    },
    {
      title: 'Brand Association',
      description: 'Associate with our trusted brand across IT, healthcare, fashion, and travel',
      icon: Award
    }
  ]

  const requirements = [
    'Established business with minimum 2 years of operation',
    'Proven track record in your industry',
    'Financial stability and growth potential',
    'Alignment with our values and business ethics',
    'Commitment to long-term partnership',
    'Dedicated resources for partnership activities'
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitted(true)
    // Reset form after 3 seconds
    setTimeout(() => {
      setIsSubmitted(false)
      setFormData({
        name: '',
        email: '',
        phone: '',
        company: '',
        website: '',
        industry: '',
        partnershipType: '',
        companySize: '',
        revenue: '',
        experience: '',
        proposal: '',
        goals: ''
      })
      setSelectedPartnership('')
    }, 3000)
  }

  const selectedPartnershipData = partnershipTypes.find(p => p.id === selectedPartnership)

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
            <Users className="w-12 h-12 text-primary-600 mr-3" />
            <h1 className="text-4xl font-bold text-secondary-900">Partnership Opportunities</h1>
          </div>
          <p className="text-gray-600 max-w-3xl mx-auto">
            Join forces with Kdadks Service Private Limited to create mutual growth opportunities. 
            Explore various partnership models across our IT, healthcare, fashion, and travel business verticals.
          </p>
        </div>

        {/* Partnership Benefits */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {partnershipBenefits.map((benefit, index) => {
            const Icon = benefit.icon
            return (
              <div key={index} className="bg-white rounded-lg shadow-lg p-6 text-center">
                <Icon className="w-12 h-12 text-primary-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-secondary-900 mb-2">{benefit.title}</h3>
                <p className="text-gray-600 text-sm">{benefit.description}</p>
              </div>
            )
          })}
        </div>

        {isSubmitted ? (
          <div className="bg-white rounded-lg shadow-lg p-12 max-w-2xl mx-auto text-center">
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
            <h2 className="text-3xl font-semibold text-green-700 mb-4">Partnership Application Submitted!</h2>
            <p className="text-gray-600 mb-4">
              Thank you for your interest in partnering with Kdadks Service Private Limited.
            </p>
            <p className="text-gray-600">
              Our partnership team will review your application and contact you within 5-7 business days 
              to discuss next steps.
            </p>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto">
            {/* Partnership Types */}
            <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-semibold text-secondary-900 mb-6">Partnership Types</h2>
              <div className="grid md:grid-cols-2 gap-6">
                {partnershipTypes.map((type) => {
                  const Icon = type.icon
                  return (
                    <div
                      key={type.id}
                      onClick={() => setSelectedPartnership(type.id)}
                      className={`border-2 rounded-lg p-6 cursor-pointer transition-all duration-200 ${
                        selectedPartnership === type.id 
                          ? 'border-primary-500 bg-primary-50' 
                          : 'border-gray-200 hover:border-primary-300'
                      }`}
                    >
                      <div className="flex items-start mb-4">
                        <Icon className={`w-8 h-8 mr-3 flex-shrink-0 ${
                          selectedPartnership === type.id ? 'text-primary-600' : 'text-gray-400'
                        }`} />
                        <div>
                          <h3 className="font-semibold text-secondary-900 mb-2">{type.title}</h3>
                          <p className="text-gray-600 text-sm mb-3">{type.description}</p>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <h4 className="font-medium text-secondary-900 mb-2">Key Benefits:</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {type.benefits.map((benefit, index) => (
                            <li key={index} className="flex items-center">
                              <span className="w-1.5 h-1.5 bg-primary-500 rounded-full mr-2 flex-shrink-0"></span>
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="bg-gray-50 p-3 rounded">
                        <p className="text-xs text-gray-600">
                          <strong>Suitable for:</strong> {type.suitable}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Partnership Application Form */}
              <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-8">
                <h2 className="text-2xl font-semibold text-secondary-900 mb-6">Partnership Application</h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Contact Information */}
                  <div className="border-b border-gray-200 pb-6">
                    <h3 className="text-lg font-medium text-secondary-900 mb-4">Contact Information</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Contact Person Name *
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
                    <div className="grid md:grid-cols-2 gap-4 mt-4">
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
                          Company Website
                        </label>
                        <input
                          type="url"
                          value={formData.website}
                          onChange={(e) => setFormData({...formData, website: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="https://"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Company Information */}
                  <div className="border-b border-gray-200 pb-6">
                    <h3 className="text-lg font-medium text-secondary-900 mb-4">Company Information</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Company Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.company}
                          onChange={(e) => setFormData({...formData, company: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Industry *
                        </label>
                        <select
                          required
                          value={formData.industry}
                          onChange={(e) => setFormData({...formData, industry: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="">Select Industry</option>
                          <option value="technology">Technology</option>
                          <option value="healthcare">Healthcare</option>
                          <option value="fashion">Fashion & Retail</option>
                          <option value="travel">Travel & Tourism</option>
                          <option value="finance">Finance & Banking</option>
                          <option value="education">Education</option>
                          <option value="manufacturing">Manufacturing</option>
                          <option value="consulting">Consulting</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Company Size *
                        </label>
                        <select
                          required
                          value={formData.companySize}
                          onChange={(e) => setFormData({...formData, companySize: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="">Select Company Size</option>
                          <option value="startup">Startup (1-10 employees)</option>
                          <option value="small">Small (11-50 employees)</option>
                          <option value="medium">Medium (51-200 employees)</option>
                          <option value="large">Large (201-1000 employees)</option>
                          <option value="enterprise">Enterprise (1000+ employees)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Annual Revenue (Optional)
                        </label>
                        <select
                          value={formData.revenue}
                          onChange={(e) => setFormData({...formData, revenue: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="">Select Revenue Range</option>
                          <option value="under-1cr">Under ₹1 Crore</option>
                          <option value="1-5cr">₹1-5 Crores</option>
                          <option value="5-25cr">₹5-25 Crores</option>
                          <option value="25-100cr">₹25-100 Crores</option>
                          <option value="above-100cr">Above ₹100 Crores</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Partnership Details */}
                  <div className="border-b border-gray-200 pb-6">
                    <h3 className="text-lg font-medium text-secondary-900 mb-4">Partnership Details</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Partnership Type *
                        </label>
                        <select
                          required
                          value={formData.partnershipType}
                          onChange={(e) => {
                            setFormData({...formData, partnershipType: e.target.value})
                            setSelectedPartnership(e.target.value)
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="">Select Partnership Type</option>
                          <option value="technology">Technology Partnership</option>
                          <option value="channel">Channel Partnership</option>
                          <option value="strategic">Strategic Alliance</option>
                          <option value="healthcare">Healthcare Partnership</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Years of Experience *
                        </label>
                        <select
                          required
                          value={formData.experience}
                          onChange={(e) => setFormData({...formData, experience: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="">Select Experience</option>
                          <option value="2-5">2-5 years</option>
                          <option value="5-10">5-10 years</option>
                          <option value="10-20">10-20 years</option>
                          <option value="above-20">Above 20 years</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Partnership Proposal */}
                  <div>
                    <h3 className="text-lg font-medium text-secondary-900 mb-4">Partnership Proposal</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Partnership Proposal *
                        </label>
                        <textarea
                          required
                          rows={4}
                          value={formData.proposal}
                          onChange={(e) => setFormData({...formData, proposal: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Describe your partnership proposal, what you bring to the table, and how you envision the collaboration"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Partnership Goals *
                        </label>
                        <textarea
                          required
                          rows={3}
                          value={formData.goals}
                          onChange={(e) => setFormData({...formData, goals: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="What are your goals and expectations from this partnership?"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-primary-600 text-white py-3 px-4 rounded-md hover:bg-primary-700 transition-colors duration-200 flex items-center justify-center"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Submit Partnership Application
                  </button>
                </form>
              </div>

              {/* Partnership Requirements */}
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-secondary-900 mb-4">Partnership Requirements</h3>
                  <ul className="space-y-3">
                    {requirements.map((requirement, index) => (
                      <li key={index} className="flex items-start text-sm">
                        <span className="w-2 h-2 bg-primary-500 rounded-full mr-3 mt-1.5 flex-shrink-0"></span>
                        <span className="text-gray-700">{requirement}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {selectedPartnershipData && (
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-secondary-900 mb-4">
                      {selectedPartnershipData.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4">
                      {selectedPartnershipData.description}
                    </p>
                    <div>
                      <h4 className="font-medium text-secondary-900 mb-2">Benefits:</h4>
                      <ul className="space-y-1">
                        {selectedPartnershipData.benefits.map((benefit, index) => (
                          <li key={index} className="flex items-center text-sm">
                            <CheckCircle className="w-3 h-3 text-green-500 mr-2 flex-shrink-0" />
                            <span className="text-gray-700">{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <div className="bg-blue-50 rounded-lg p-6">
                  <h4 className="font-semibold text-blue-800 mb-2">Need More Information?</h4>
                  <p className="text-blue-700 text-sm mb-3">
                    Contact our partnership team for detailed discussions about collaboration opportunities.
                  </p>
                  <p className="text-blue-700 text-sm">
                    Email: partnerships@kdadks.com<br/>
                    Phone: +91 7982303199
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Partnership
