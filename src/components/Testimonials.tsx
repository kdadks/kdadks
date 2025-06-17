import React from 'react'
import { Star, Quote, Code, Heart, Users, Car } from 'lucide-react'

const Testimonials = () => {
  const testimonials = [
    {
      name: 'Rajesh Sharma',
      role: 'Senior Developer, Tech Solutions Pvt Ltd',
      image: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=400',
      content: 'IT Wala\'s AI/ML training program completely transformed my career. The practical approach and expert guidance helped me transition into product management successfully.',
      rating: 5,
      brand: 'IT Wala',
      icon: Code,
      brandColor: 'bg-blue-100 text-blue-600'
    },
    {
      name: 'Priya Patel',
      role: 'Patient',
      image: 'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=400',
      content: 'Ayuh Clinic provided exceptional homeopathic treatment for my chronic condition. The personalized care and holistic approach made all the difference.',
      rating: 5,
      brand: 'Ayuh Clinic',
      icon: Heart,
      brandColor: 'bg-red-100 text-red-600'
    },
    {
      name: 'Anita Desai',
      role: 'Fashion Enthusiast',
      image: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=400',
      content: 'Nirchal\'s custom tailoring service is outstanding! The quality of fabrics and attention to detail in crafting my wedding outfit was beyond my expectations.',
      rating: 5,
      brand: 'Nirchal',
      icon: Users,
      brandColor: 'bg-purple-100 text-purple-600'
    },
    {
      name: 'Vikram Singh',
      role: 'Corporate Executive',
      image: 'https://images.pexels.com/photos/697509/pexels-photo-697509.jpeg?auto=compress&cs=tinysrgb&w=400',
      content: 'Raahirides organized our company retreat perfectly. From airport pickups to hotel arrangements, every detail was handled professionally and seamlessly.',
      rating: 5,
      brand: 'Raahirides',
      icon: Car,
      brandColor: 'bg-orange-100 text-orange-600'
    },
    {
      name: 'Neha Gupta',
      role: 'Product Manager, StartupCo',
      image: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=400',
      content: 'The consulting services from IT Wala helped us streamline our product development process. Their expertise in agile methodologies was invaluable.',
      rating: 5,
      brand: 'IT Wala',
      icon: Code,
      brandColor: 'bg-blue-100 text-blue-600'
    },
    {
      name: 'Dr. Amit Kumar',
      role: 'Healthcare Professional',
      image: 'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=400',
      content: 'As a fellow healthcare professional, I highly recommend Ayuh Clinic. Their integrated approach to patient care and use of modern technology is impressive.',
      rating: 5,
      brand: 'Ayuh Clinic',
      icon: Heart,
      brandColor: 'bg-red-100 text-red-600'
    },
  ]

  return (
    <section className="section-padding bg-white">
      <div className="container-custom">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-secondary-900 mb-6">
            What Our Clients
            <span className="block text-gradient">Say About Us</span>
          </h2>
          <p className="text-xl text-secondary-600 max-w-3xl mx-auto leading-relaxed">
            Real experiences from satisfied clients across IT education, healthcare, fashion, and travel services.
            Discover why they trust Kdadks for excellence.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => {
            const BrandIcon = testimonial.icon
            return (
              <div
                key={testimonial.name}
                className={`card p-8 animate-fade-in relative`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Brand Badge */}
                <div className="absolute top-4 right-4">
                  <div className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${testimonial.brandColor}`}>
                    <BrandIcon className="w-3 h-3" />
                    <span>{testimonial.brand}</span>
                  </div>
                </div>

                {/* Quote Icon */}
                <div className="mb-6">
                  <Quote className="w-8 h-8 text-primary-300" />
                </div>

                {/* Content */}
                <p className="text-secondary-700 mb-6 leading-relaxed italic">
                  "{testimonial.content}"
                </p>

                {/* Rating */}
                <div className="flex items-center mb-6">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                  ))}
                </div>

                {/* Author */}
                <div className="flex items-center">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover mr-4"
                  />
                  <div>
                    <div className="font-semibold text-secondary-900">
                      {testimonial.name}
                    </div>
                    <div className="text-sm text-secondary-600">
                      {testimonial.role}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Stats Section - Updated with actual company stats */}
        <div className="mt-16 bg-gradient-primary rounded-2xl p-8 md:p-12 text-white text-center">
          <h3 className="text-2xl md:text-3xl font-bold mb-8">
            Excellence Across Industries
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="text-3xl md:text-4xl font-bold mb-2">4</div>
              <div className="text-blue-200">Diverse Brands</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold mb-2">100+</div>
              <div className="text-blue-200">Success Stories</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold mb-2">99%</div>
              <div className="text-blue-200">Client Satisfaction</div>
            </div>
            <div>
              <div className="text-3xl md:text-4xl font-bold mb-2">5+</div>
              <div className="text-blue-200">Years Experience</div>
            </div>
          </div>
          
          {/* Brand Icons */}
          <div className="mt-8 pt-8 border-t border-white/20">
            <p className="text-blue-100 mb-4">Trusted services across multiple industries</p>
            <div className="flex justify-center items-center space-x-8 flex-wrap gap-4">
              <div className="flex items-center space-x-2 text-blue-200">
                <img
                  src="/IT - WALA_logo (1).png"
                  alt="IT Wala logo"
                  className="w-5 h-5 object-contain"
                />
                <span className="text-sm">IT Solutions</span>
              </div>
              <div className="flex items-center space-x-2 text-blue-200">
                <img
                  src="/AYUH_Logo_2.png"
                  alt="Ayuh Clinic logo"
                  className="w-5 h-5 object-contain"
                />
                <span className="text-sm">Healthcare</span>
              </div>
              <div className="flex items-center space-x-2 text-blue-200">
                <img
                  src="/Nirchal_Logo.png"
                  alt="Nirchal logo"
                  className="w-5 h-5 object-contain"
                />
                <span className="text-sm">Fashion</span>
              </div>
              <div className="flex items-center space-x-2 text-blue-200">
                <Car className="w-5 h-5" />
                <span className="text-sm">Travel</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Testimonials