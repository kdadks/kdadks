import React from 'react'
import { Code, Heart, Users, Car, Award, Shield, Lightbulb, CheckCircle, Target, Compass } from 'lucide-react'

const Features = () => {
  const features = [
    {
      icon: Code,
      logo: '/IT - WALA_logo (1).png',
      title: 'IT Solutions & Education',
      description: 'Comprehensive AI/ML training, product management consulting, and cutting-edge software development services.',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      brand: 'IT Wala'
    },
    {
      icon: Heart,
      logo: '/AYUH_Logo_2.png',
      title: 'Quality Healthcare',
      description: 'Personalized medical care with homeopathic treatments, specialized care, and telemedicine services.',
      color: 'text-red-500',
      bgColor: 'bg-red-50',
      brand: 'Ayuh Clinic'
    },
    {
      icon: Users,
      logo: '/Nirchal_Logo.png',
      title: 'Fashion & Style',
      description: 'High-quality, fashionable garments with custom tailoring and readymade options for every occasion.',
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
      brand: 'Nirchal'
    },
    {
      icon: Car,
      title: 'Travel Excellence',
      description: 'Seamless travel experiences from point-to-point journeys to comprehensive corporate travel solutions.',
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
      brand: 'Raahirides'
    },
    {
      icon: Award,
      title: 'Proven Excellence',
      description: 'Over 5 years of industry experience with 99% client satisfaction across all service verticals.',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
      brand: 'Company-wide'
    },
    {
      icon: Shield,
      title: 'Reliable & Secure',
      description: 'Enterprise-grade security, reliability, and data protection across all our service offerings.',
      color: 'text-green-500',
      bgColor: 'bg-green-50',
      brand: 'Company-wide'
    },
  ]

  const coreValues = [
    { icon: Lightbulb, title: 'Innovation', description: 'Continuously improving and staying ahead' },
    { icon: CheckCircle, title: 'Integrity', description: 'Highest standards of ethics and transparency' },
    { icon: Target, title: 'Excellence', description: 'Delivering quality in every service' },
    { icon: Compass, title: 'Guidance', description: 'Expert consultation across all industries' }
  ]

  return (
    <section className="section-padding bg-gradient-secondary">
      <div className="container-custom">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-secondary-900 mb-6">
            Why Choose
            <span className="block text-gradient">Kdadks Service</span>
          </h2>
          <p className="text-xl text-secondary-600 max-w-3xl mx-auto leading-relaxed">
            Multi-industry expertise delivering exceptional results across IT, healthcare, fashion, and travel.
            Experience the difference of working with true professionals.
          </p>
        </div>

        {/* Main Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className={`card p-8 group hover:scale-105 animate-fade-in`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Icon or Logo */}
                <div className={`w-16 h-16 ${feature.bgColor} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  {feature.logo ? (
                    <img
                      src={feature.logo}
                      alt={`${feature.brand} logo`}
                      className="w-10 h-10 object-contain"
                    />
                  ) : (
                    <Icon className={`w-8 h-8 ${feature.color}`} />
                  )}
                </div>

                {/* Content */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-semibold text-secondary-900 group-hover:text-primary-600 transition-colors duration-300">
                      {feature.title}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      feature.brand === 'IT Wala' ? 'bg-blue-100 text-blue-600' :
                      feature.brand === 'Ayuh Clinic' ? 'bg-red-100 text-red-600' :
                      feature.brand === 'Nirchal' ? 'bg-purple-100 text-purple-600' :
                      feature.brand === 'Raahirides' ? 'bg-orange-100 text-orange-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {feature.brand}
                    </span>
                  </div>
                </div>
                
                <p className="text-secondary-600 leading-relaxed">
                  {feature.description}
                </p>

                {/* Hover Effect */}
                <div className="mt-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="w-12 h-1 bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"></div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Core Values Section */}
        <div className="bg-white rounded-2xl p-8 md:p-12 shadow-lg">
          <div className="text-center mb-12">
            <h3 className="text-2xl md:text-3xl font-bold text-secondary-900 mb-4">
              Our Core Values
            </h3>
            <p className="text-secondary-600 max-w-2xl mx-auto">
              The principles that guide our work across all industries and define our commitment to excellence
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {coreValues.map((value, index) => {
              const Icon = value.icon
              return (
                <div
                  key={value.title}
                  className="text-center p-6 rounded-xl hover:bg-gray-50 transition-colors duration-300"
                >
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-primary-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-secondary-900 mb-2">
                    {value.title}
                  </h4>
                  <p className="text-secondary-600 text-sm">
                    {value.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <p className="text-secondary-600 mb-6">
            Ready to experience excellence across multiple industries?
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#services"
              className="btn-primary inline-flex items-center"
            >
              Explore Our Services
              <Award className="ml-2 w-5 h-5" />
            </a>
            <a
              href="#contact"
              className="btn-outline inline-flex items-center"
            >
              Get Started Today
              <Target className="ml-2 w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Features