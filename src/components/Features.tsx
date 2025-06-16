import React from 'react'
import { Zap, Shield, Smartphone, Globe, Users, BarChart3 } from 'lucide-react'

const Features = () => {
  const features = [
    {
      icon: Zap,
      title: 'Lightning Fast',
      description: 'Optimized performance with sub-second loading times and seamless user experience.',
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-50',
    },
    {
      icon: Shield,
      title: 'Secure & Reliable',
      description: 'Enterprise-grade security with 99.9% uptime guarantee and data protection.',
      color: 'text-green-500',
      bgColor: 'bg-green-50',
    },
    {
      icon: Smartphone,
      title: 'Mobile First',
      description: 'Responsive design that works perfectly on all devices and screen sizes.',
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      icon: Globe,
      title: 'Global Reach',
      description: 'CDN-powered delivery ensuring fast access from anywhere in the world.',
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Built-in tools for seamless team collaboration and project management.',
      color: 'text-pink-500',
      bgColor: 'bg-pink-50',
    },
    {
      icon: BarChart3,
      title: 'Analytics & Insights',
      description: 'Comprehensive analytics to track performance and user engagement.',
      color: 'text-indigo-500',
      bgColor: 'bg-indigo-50',
    },
  ]

  return (
    <section className="section-padding bg-gradient-secondary">
      <div className="container-custom">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-secondary-900 mb-6">
            Powerful Features for
            <span className="block text-gradient">Modern Businesses</span>
          </h2>
          <p className="text-xl text-secondary-600 max-w-3xl mx-auto leading-relaxed">
            Everything you need to build, scale, and succeed in today's digital landscape. 
            Our comprehensive suite of tools empowers your business growth.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className={`card p-8 group hover:scale-105 animate-fade-in`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Icon */}
                <div className={`w-16 h-16 ${feature.bgColor} rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-8 h-8 ${feature.color}`} />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-secondary-900 mb-4 group-hover:text-primary-600 transition-colors duration-300">
                  {feature.title}
                </h3>
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

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <p className="text-secondary-600 mb-6">
            Ready to experience these features yourself?
          </p>
          <a
            href="#contact"
            className="btn-primary inline-flex items-center"
          >
            Start Your Free Trial
            <Zap className="ml-2 w-5 h-5" />
          </a>
        </div>
      </div>
    </section>
  )
}

export default Features