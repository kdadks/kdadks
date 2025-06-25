import React from 'react'
import { CheckCircle, Award, Target, TrendingUp, Heart, Users, Shield, Lightbulb, Eye, Compass, LucideIcon } from 'lucide-react'

interface Objective {
  logo: string;
  title: string;
  description: string;
  brand: string;
}

const About = () => {
  const achievements = [
    { number: '4', label: 'Diverse Brands' },
    { number: '100+', label: 'Success Stories' },
    { number: '5+', label: 'Years Experience' },
    { number: '99%', label: 'Client Satisfaction' },
  ]

  const objectives = [
    {
      logo: '/IT - WALA_logo (1).png',
      title: 'Empowering Individuals',
      description: 'Providing tailored education in product management, program management, software testing, software development, and personality development to help individuals excel in their careers and personal growth.',
      brand: 'IT Wala'
    },
    {
      logo: '/AYUH_Logo_2.png',
      title: 'Delivering Exceptional Healthcare',
      description: 'Offering personalized and comprehensive medical care that integrates each patient\'s unique needs and preferences, utilizing the latest medical technology and evidence-based practices.',
      brand: 'Ayuh Clinic'
    },
    {
      logo: '/Nirchal_Logo.png',
      title: 'Inspiring Confidence and Style',
      description: 'Designing and retailing high-quality, fashionable garments that cater to the diverse clothing needs of our customers, whether readymade or tailored.',
      brand: 'Nirchal'
    },
    {
      logo: '/raahi_rides_logo.png',
      title: 'Creating Memorable Travel Experiences',
      description: 'Providing seamless and exceptional travel services, including point-to-point journeys, package travel solutions, and travel arrangements for companies and business retreats.',
      brand: 'Raahirides'
    },
  ]

  const coreValues = [
    {
      icon: Lightbulb,
      title: 'Innovation',
      description: 'We strive to continuously innovate and improve our products, services, and processes to stay ahead of the competition.',
    },
    {
      icon: Users,
      title: 'Customer Centricity',
      description: 'We prioritize customer satisfaction and strive to deliver exceptional service and support.',
    },
    {
      icon: Shield,
      title: 'Reliability',
      description: 'We commit to delivering high-quality products and services that meet the highest standards of reliability and performance.',
    },
    {
      icon: CheckCircle,
      title: 'Integrity',
      description: 'We maintain the highest levels of honesty, transparency, and ethics in all our business dealings.',
    },
    {
      icon: Heart,
      title: 'Empathy',
      description: 'We understand the importance of empathy and compassion in our services and strive to provide a warm and caring environment for our clients.',
    },
  ]

  const brands = [
    { name: 'IT Wala', focus: 'Technology Education', color: 'bg-blue-100 text-blue-600' },
    { name: 'Ayuh Clinic', focus: 'Healthcare Services', color: 'bg-green-100 text-green-600' },
    { name: 'Nirchal', focus: 'Fashion & Style', color: 'bg-purple-100 text-purple-600' },
    { name: 'Raahirides', focus: 'Travel Experiences', color: 'bg-orange-100 text-orange-600' },
  ]

  return (
    <section id="about" className="section-padding bg-white" itemScope itemType="https://schema.org/AboutPage" role="main" aria-labelledby="about-heading">
      <div className="container-custom">
        {/* Header Section */}
        <div className="text-center mb-16">
          <h2 id="about-heading" className="text-3xl md:text-4xl lg:text-5xl font-bold text-secondary-900 mb-6" itemProp="name">
            About
            <span className="block text-gradient">Kdadks Service Pvt. Ltd</span>
          </h2>
          
          <p className="text-xl text-secondary-600 mb-8 leading-relaxed max-w-4xl mx-auto" itemProp="description">
            At <strong>Kdadks Service Pvt. Ltd</strong>, our objective is to lead with innovation, compassion, and excellence across our diverse range of services. Through our brands <em>IT Wala</em>, <em>Ayuh Clinic</em>, <em>Nirchal</em>, and <em>Raahirides</em>, we are committed to transforming lives and creating lasting impact.
          </p>

          {/* Brand Pills */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {brands.map((brand, index) => (
              <div key={index} className={`px-6 py-3 rounded-full ${brand.color} font-medium`}>
                <span className="font-semibold">{brand.name}</span>
                <span className="ml-2 opacity-75">• {brand.focus}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Brand Showcase Section */}
        <div className="mb-24" itemScope itemType="https://schema.org/Organization">
          <div className="text-center mb-12">
            <h3 className="text-2xl md:text-3xl font-bold text-secondary-900 mb-4">
              Our Brands
            </h3>
            <p className="text-secondary-600 max-w-2xl mx-auto">
              Excellence delivered through our diverse portfolio of specialized brands
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* ITwala clickable logo */}
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('itwala-service');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="text-center p-6 bg-blue-50 rounded-xl hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
              aria-label="Scroll to ITwala Service section"
            >
              <img
                src="/IT - WALA_logo (1).png"
                alt="IT Wala logo"
                className="h-16 w-auto mx-auto mb-4 object-contain"
              />
              <h4 className="font-semibold text-secondary-900 mb-2">IT Wala</h4>
              <p className="text-sm text-secondary-600">Technology Education & Consulting</p>
            </button>
            {/* Ayuh Clinic clickable logo */}
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('ayuh-clinic-service');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="text-center p-6 bg-red-50 rounded-xl hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-400"
              aria-label="Scroll to Ayuh Clinic Service section"
            >
              <img
                src="/AYUH_Logo_2.png"
                alt="Ayuh Clinic logo"
                className="h-16 w-auto mx-auto mb-4 object-contain"
              />
              <h4 className="font-semibold text-secondary-900 mb-2">Ayuh Clinic</h4>
              <p className="text-sm text-secondary-600">Comprehensive Healthcare Services</p>
            </button>
            {/* Nirchal clickable logo */}
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('nirchal-service');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="text-center p-6 bg-purple-50 rounded-xl hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-400"
              aria-label="Scroll to Nirchal Service section"
            >
              <img
                src="/Nirchal_Logo.png"
                alt="Nirchal logo"
                className="h-16 w-auto mx-auto mb-4 object-contain"
              />
              <h4 className="font-semibold text-secondary-900 mb-2">Nirchal</h4>
              <p className="text-sm text-secondary-600">Fashion & Custom Tailoring</p>
            </button>
            {/* Raahirides clickable logo */}
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('raahirides-service');
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
              className="text-center p-6 bg-orange-50 rounded-xl hover:shadow-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-400"
              aria-label="Scroll to Raahirides Service section"
            >
              <img
                src="/raahi_rides_logo.png"
                alt="Raahirides logo"
                className="h-16 w-auto mx-auto mb-4 object-contain"
              />
              <h4 className="font-semibold text-secondary-900 mb-2">Raahirides</h4>
              <p className="text-sm text-secondary-600">Travel & Transportation</p>
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-2 gap-16 items-center mb-24">
          {/* Visual Content */}
          <div className="relative order-2 lg:order-1">
            <div className="relative bg-gradient-to-br from-primary-100 to-accent-100 rounded-2xl p-8 shadow-xl">
              <img
                src="https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="Kdadks team collaboration"
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

          {/* Content */}
          <div className="order-1 lg:order-2">
            <div className="space-y-4 mb-8">
              {[
                'Multi-industry expertise across IT, healthcare, fashion, and travel',
                'Innovative solutions tailored to individual and business needs',
                'Comprehensive support with dedicated customer service',
                'Commitment to excellence and continuous improvement'
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
        </div>

        {/* Our Objectives Section */}
        <div className="mb-24">
          <div className="text-center mb-16">
            <h3 className="text-2xl md:text-3xl font-bold text-secondary-900 mb-4">
              Our Objectives
            </h3>
            <p className="text-secondary-600 max-w-3xl mx-auto">
              Through our diverse brands, we are committed to excellence in every sector we serve
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {objectives.map((objective, index) => {
              // Map brand to service section id
              const brandToId: Record<string, string> = {
                'IT Wala': 'itwala-service',
                'Ayuh Clinic': 'ayuh-clinic-service',
                'Nirchal': 'nirchal-service',
                'Raahirides': 'raahirides-service',
              };
              const sectionId = brandToId[objective.brand] || 'services';
              return (
                <div
                  key={objective.title}
                  className="bg-white p-8 rounded-xl border border-gray-100 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <a href={`#${sectionId}`} aria-label={`Go to ${objective.brand} service`}>
                        <img
                          src={objective.logo}
                          alt={`${objective.brand} logo`}
                          className="w-8 h-8 object-contain"
                        />
                      </a>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xl font-semibold text-secondary-900">
                          {objective.title}
                        </h4>
                        <span className="text-sm px-3 py-1 bg-accent-100 text-accent-600 rounded-full font-medium">
                          {objective.brand}
                        </span>
                      </div>
                      <p className="text-secondary-600 leading-relaxed">
                        {objective.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Vision Statement Section */}
        <div className="mb-24" itemScope itemType="https://schema.org/Mission">
          <div className="bg-gradient-to-r from-primary-50 to-accent-50 rounded-2xl p-12 text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Eye className="w-8 h-8 text-primary-600" aria-hidden="true" />
            </div>
            <h3 className="text-2xl md:text-3xl font-bold text-secondary-900 mb-6">
              Our Vision
            </h3>
            <p className="text-lg text-secondary-700 leading-relaxed max-w-4xl mx-auto mb-8" itemProp="description">
              At <strong>Kdadks Service Pvt. Ltd</strong>, through our brands <em>IT Wala</em>, <em>Ayuh Clinic</em>, <em>Nirchal</em>, and <em>Raahirides</em>, we envision a future where we lead with innovation, compassion, and excellence in our respective fields. Our unified vision is to empower individuals through tailored education, deliver comprehensive and compassionate healthcare, inspire confidence and style with high-quality garments, and offer seamless and memorable travel experiences.
            </p>
            <p className="text-secondary-600 leading-relaxed max-w-3xl mx-auto">
              We are committed to continuously innovating and adapting to the latest trends and technologies, striving to exceed customer expectations and create a lasting impact. Our goal is to transform lives, uplift communities, and set new standards of excellence across the IT, healthcare, fashion, and travel industries.
            </p>
          </div>
        </div>

        {/* Core Values Section */}
        <div>
          <div className="text-center mb-16">
            <h3 className="text-2xl md:text-3xl font-bold text-secondary-900 mb-4">
              Our Core Values
            </h3>
            <p className="text-secondary-600 max-w-2xl mx-auto">
              The principles that guide our work and define our commitment to excellence across all our brands
            </p>
          </div>

          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-6">
            {coreValues.map((value, index) => {
              const Icon = value.icon
              return (
                <div
                  key={value.title}
                  className="text-center p-6 rounded-xl hover:bg-gray-50 transition-colors duration-300"
                >
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Icon className="w-8 h-8 text-primary-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-secondary-900 mb-4">
                    {value.title}
                  </h4>
                  <p className="text-secondary-600 leading-relaxed text-sm">
                    {value.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-16 pt-16 border-t border-gray-200">
          <h3 className="text-2xl font-bold text-secondary-900 mb-4">
            Ready to Experience Excellence?
          </h3>
          <p className="text-secondary-600 mb-8 max-w-2xl mx-auto">
            Discover how our diverse expertise across IT, healthcare, fashion, and travel can transform your experience and exceed your expectations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#services" className="btn-primary">
              Explore Our Services
            </a>
            <a href="#contact" className="btn-outline">
              Start Your Journey
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

export default About
