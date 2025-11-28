import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { 
  Brain, 
  Shield, 
  TrendingUp, 
  Zap, 
  Users, 
  BarChart3,
  ArrowRight,
  Sparkles,
  CheckCircle,
  Star
} from 'lucide-react'

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Insights',
    description: 'Get intelligent financial recommendations powered by advanced AI agents that understand your unique situation.',
    gradient: 'from-blue-500 to-cyan-500',
  },
  {
    icon: Shield,
    title: 'Risk Assessment',
    description: 'Comprehensive risk analysis and portfolio optimization to protect and grow your wealth.',
    gradient: 'from-red-500 to-orange-500',
  },
  {
    icon: TrendingUp,
    title: 'Smart Planning',
    description: 'Create personalized financial plans with AI-driven goal setting and progress tracking.',
    gradient: 'from-green-500 to-emerald-500',
  },
  {
    icon: Zap,
    title: 'Real-time Nudges',
    description: 'Receive timely alerts and suggestions to optimize your financial decisions.',
    gradient: 'from-yellow-500 to-amber-500',
  },
  {
    icon: Users,
    title: 'For Everyone',
    description: 'Whether you\'re an individual or a startup, our AI adapts to your specific needs.',
    gradient: 'from-purple-500 to-pink-500',
  },
  {
    icon: BarChart3,
    title: 'Cash Flow Mastery',
    description: 'Forecast and optimize your cash flow with intelligent predictions and recommendations.',
    gradient: 'from-teal-500 to-cyan-500',
  },
]

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Startup Founder',
    content: 'CFOSync helped me understand my runway and make better financial decisions. It\'s like having a CFO on demand!',
    avatar: '👩‍💼',
    rating: 5,
  },
  {
    name: 'Michael Roberts',
    role: 'Software Engineer',
    content: 'Finally, a financial tool that speaks my language. The AI insights are incredibly accurate and actionable.',
    avatar: '👨‍💻',
    rating: 5,
  },
  {
    name: 'Emily Watson',
    role: 'Freelance Designer',
    content: 'Managing irregular income was always stressful. CFOSync made it so much easier to plan ahead.',
    avatar: '👩‍🎨',
    rating: 5,
  },
]

const stats = [
  { value: '50K+', label: 'Active Users' },
  { value: '$2B+', label: 'Assets Managed' },
  { value: '99.9%', label: 'Uptime' },
  { value: '4.9/5', label: 'User Rating' },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-grid">
      {/* Background Orbs */}
      <div className="gradient-orb gradient-orb-1" />
      <div className="gradient-orb gradient-orb-2" />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-card rounded-none border-x-0 border-t-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">CFOSync</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="nav-link">Features</a>
            <Link to="/agents" className="nav-link">Agents</Link>
            <a href="#testimonials" className="nav-link">Testimonials</a>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/login" className="btn-secondary hidden sm:flex items-center gap-2">
              Sign In
            </Link>
            <Link to="/register" className="btn-primary flex items-center gap-2">
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-gray-300">Powered by Advanced AI Agents</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              Your AI-Powered
              <br />
              <span className="gradient-text">Financial Brain</span>
            </h1>

            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
              CFOSync combines 11 specialized AI agents to give you personalized financial 
              intelligence. Perfect for individuals managing personal wealth or startups 
              navigating growth.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register" className="btn-primary text-lg px-8 py-4 flex items-center gap-2">
                Start Free Trial <ArrowRight className="w-5 h-5" />
              </Link>
              <Link to="/chat" className="btn-secondary text-lg px-8 py-4 flex items-center gap-2">
                <Brain className="w-5 h-5" /> Try AI Demo
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6"
          >
            {stats.map((stat, index) => (
              <div key={index} className="glass-card p-6 text-center">
                <div className="text-3xl font-bold gradient-text">{stat.value}</div>
                <div className="text-gray-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">
              Powerful Features for <span className="gradient-text">Smart Finance</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Our suite of AI agents work together to provide comprehensive financial intelligence
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="glass-card-hover p-8"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-gray-400">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Agents Showcase */}
      <section className="py-20 px-6 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">
              Meet Your <span className="gradient-text">AI Team</span>
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              11 specialized agents working together to optimize your financial future
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { name: 'Profile', emoji: '👤', desc: 'Understands you' },
              { name: 'Insights', emoji: '💡', desc: 'Analyzes data' },
              { name: 'Risk', emoji: '⚠️', desc: 'Assesses threats' },
              { name: 'Planning', emoji: '📋', desc: 'Sets goals' },
              { name: 'Simulation', emoji: '🎯', desc: 'Models scenarios' },
              { name: 'Cash Flow', emoji: '💰', desc: 'Tracks money' },
              { name: 'CFO Strategy', emoji: '📊', desc: 'Advises strategy' },
              { name: 'Nudge', emoji: '🔔', desc: 'Sends alerts' },
              { name: 'Compliance', emoji: '✅', desc: 'Ensures legal' },
              { name: 'Document', emoji: '📄', desc: 'Processes docs' },
              { name: 'Coordinator', emoji: '🤖', desc: 'Orchestrates all' },
              { name: 'You', emoji: '⭐', desc: 'In control' },
            ].map((agent, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="glass-card p-4 text-center hover:bg-white/10 transition-colors cursor-default"
              >
                <div className="text-3xl mb-2">{agent.emoji}</div>
                <div className="font-medium text-sm">{agent.name}</div>
                <div className="text-xs text-gray-500">{agent.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">
              Loved by <span className="gradient-text">Thousands</span>
            </h2>
            <p className="text-gray-400">See what our users have to say</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="glass-card p-8"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-300 mb-6">"{testimonial.content}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-2xl">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-gray-400">{testimonial.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card p-12 text-center relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 to-accent-500/10" />
            <div className="relative z-10">
              <h2 className="text-4xl font-bold mb-4">
                Ready to Transform Your Finances?
              </h2>
              <p className="text-gray-400 mb-8 max-w-xl mx-auto">
                Join thousands of individuals and startups who trust CFOSync for their financial intelligence.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/onboarding" className="btn-primary text-lg px-8 py-4 flex items-center gap-2">
                  Get Started Free <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
              <div className="mt-6 flex items-center justify-center gap-6 text-sm text-gray-400">
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" /> No credit card required
                </span>
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" /> 14-day free trial
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold">CFOSync</span>
            </div>
            <div className="text-gray-400 text-sm">
              © 2025 CFOSync. All rights reserved.
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-400">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
