import React from 'react'
import { CheckCircle, Award, Target, TrendingUp } from 'lucide-react'

const About = () => {
  const achievements = [
    { number: '500+', label: 'Projects Completed' },
    { number: '50+', label: 'Team Members' },
    { number: '10+', label: 'Years Experience' },
    { number: '99%', label: 'Client Satisfaction' },
  ]

  const values = [
    {
      icon: Target,
      title: 'Mission Driven',
      description: 'We focus on delivering solutions that create real value and drive meaningful results for our clients.',
    },
    {
      icon: Award,
      title: 'Excellence First',
      description: 'Quality is at the heart of everything we do. We never compromise on standards or attention to detail.',
    },
    {
      icon: TrendingUp,
      title: 'Innovation Focus',
      description: 'We stay ahead of trends and continuously evolve our approaches to deliver cutting-edge solutions.',
    },
  ]

  return (
    <section id="about" className="section-padding bg-white">
      <div className="container-custom">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-secondary-900 mb-6">
              About Our
              <span className="block text-gradient">Company</span>
            </h2>
            
            <p className="text-xl text-secondary-600 mb-8 leading-relaxed">
              We are a forward-thinking digital agency dedicated to transforming businesses 
              through innovative technology solutions and exceptional user experiences.
            </p>

            <div className="space-y-4 mb-8">
              {[
                'Industry-leading expertise and proven track record',
                'Cutting-edge technology stack and modern methodologies',
                'Dedicated support team available 24/7',
                'Scalable solutions that grow with your business'
              ].map((item, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-secondary-700">{item}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <a href="#services" className="btn-primary">
                Our Services
              </a>
              <a href="#contact" className="btn-outline">
                Get In Touch
              </a>
            </div>
          </div>

          {/* Visual Content */}
          <div className="relative">
            {/* Main Image Placeholder */}
            <div className="relative bg-gradient-to-br from-primary-100 to-accent-100 rounded-2xl p-8 shadow-xl">
              <img
                src="https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="Team collaboration"
                className="w-full h-80 object-cover rounded-xl shadow-lg"
              />
              
              {/* Floating Stats Card */}
              <div className="absolute -bottom-6 -left-6 bg-white rounded-xl p-6 shadow-xl border border-gray-100">
                <div className="grid grid-cols-2 gap-4">
                  {achievements.map((achievement, index) => (
                    <div key={index} className="text-center">
                      <div className="text-2xl font-bold text-primary-600 mb-1">
                        {achievement.number}
                      </div>
                      <div className="text-xs text-secondary-600">
                        {achievement.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Background Elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-accent-200 rounded-full opacity-50"></div>
            <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-primary-200 rounded-full opacity-30"></div>
          </div>
        </div>

        {/* Values Section */}
        <div className="mt-24">
          <div className="text-center mb-16">
            <h3 className="text-2xl md:text-3xl font-bold text-secondary-900 mb-4">
              Our Core Values
            </h3>
            <p className="text-secondary-600 max-w-2xl mx-auto">
              The principles that guide our work and define our commitment to excellence
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {values.map((value, index) => {
              const Icon = value.icon
              return (
                <div
                  key={value.title}
                  className="text-center p-6 rounded-xl hover:bg-gray-50 transition-colors duration-300"
                >
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Icon className="w-8 h-8 text-primary-600" />
                  </div>
                  <h4 className="text-xl font-semibold text-secondary-900 mb-4">
                    {value.title}
                  </h4>
                  <p className="text-secondary-600 leading-relaxed">
                    {value.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

export default About