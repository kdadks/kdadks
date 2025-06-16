import React from 'react'
import { Code, Palette, Search, Smartphone, Cloud, Headphones } from 'lucide-react'

const Services = () => {
  const services = [
    {
      icon: Code,
      title: 'Web Development',
      description: 'Custom web applications built with modern frameworks and best practices for optimal performance.',
      features: ['React & Next.js', 'Node.js Backend', 'Database Design', 'API Integration'],
      price: 'Starting at $2,999',
      popular: false,
    },
    {
      icon: Palette,
      title: 'UI/UX Design',
      description: 'Beautiful, intuitive designs that enhance user experience and drive engagement.',
      features: ['User Research', 'Wireframing', 'Prototyping', 'Design Systems'],
      price: 'Starting at $1,999',
      popular: true,
    },
    {
      icon: Search,
      title: 'SEO Optimization',
      description: 'Comprehensive SEO strategies to improve your search rankings and organic traffic.',
      features: ['Keyword Research', 'On-page SEO', 'Technical SEO', 'Content Strategy'],
      price: 'Starting at $999',
      popular: false,
    },
    {
      icon: Smartphone,
      title: 'Mobile Apps',
      description: 'Native and cross-platform mobile applications for iOS and Android devices.',
      features: ['React Native', 'Flutter', 'App Store Optimization', 'Push Notifications'],
      price: 'Starting at $4,999',
      popular: false,
    },
    {
      icon: Cloud,
      title: 'Cloud Solutions',
      description: 'Scalable cloud infrastructure and deployment solutions for modern applications.',
      features: ['AWS/Azure Setup', 'DevOps Pipeline', 'Auto Scaling', 'Monitoring'],
      price: 'Starting at $1,499',
      popular: false,
    },
    {
      icon: Headphones,
      title: 'Support & Maintenance',
      description: '24/7 support and ongoing maintenance to keep your applications running smoothly.',
      features: ['24/7 Monitoring', 'Regular Updates', 'Bug Fixes', 'Performance Optimization'],
      price: 'Starting at $499/mo',
      popular: false,
    },
  ]

  return (
    <section id="services" className="section-padding bg-gradient-secondary">
      <div className="container-custom">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-secondary-900 mb-6">
            Our Professional
            <span className="block text-gradient">Services</span>
          </h2>
          <p className="text-xl text-secondary-600 max-w-3xl mx-auto leading-relaxed">
            Comprehensive digital solutions tailored to your business needs. 
            From concept to deployment, we've got you covered.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => {
            const Icon = service.icon
            return (
              <div
                key={service.title}
                className={`card p-8 relative group ${
                  service.popular ? 'ring-2 ring-primary-500 scale-105' : ''
                }`}
              >
                {/* Popular Badge */}
                {service.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Icon */}
                <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary-600 group-hover:scale-110 transition-all duration-300">
                  <Icon className="w-8 h-8 text-primary-600 group-hover:text-white transition-colors duration-300" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-secondary-900 mb-4">
                  {service.title}
                </h3>
                <p className="text-secondary-600 mb-6 leading-relaxed">
                  {service.description}
                </p>

                {/* Features */}
                <ul className="space-y-2 mb-6">
                  {service.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center text-sm text-secondary-600">
                      <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mr-3"></div>
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* Price */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-2xl font-bold text-secondary-900">
                      {service.price}
                    </span>
                  </div>
                  <button className="w-full btn-primary group-hover:bg-primary-700">
                    Get Started
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16 p-8 bg-white rounded-2xl shadow-lg">
          <h3 className="text-2xl font-bold text-secondary-900 mb-4">
            Need a Custom Solution?
          </h3>
          <p className="text-secondary-600 mb-6 max-w-2xl mx-auto">
            Every business is unique. Let's discuss your specific requirements and create a tailored solution that fits your needs perfectly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#contact" className="btn-primary">
              Schedule Consultation
            </a>
            <a href="tel:+1234567890" className="btn-outline">
              Call Us Now
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Services