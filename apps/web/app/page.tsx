'use client';

import { Button } from '../components/ui/button';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { GoogleSignInButton } from '../components/auth/google-sign-in-button';
import Image from 'next/image';

/**
 * Landing Page Component
 * Professional landing page for Agent Base with modern UI inspired by
 * top tech platforms like Airbnb, Stripe, Booking.com and TooGoodToGo
 */
export default function Home() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-gray-100 bg-white/80 backdrop-blur-lg fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">Agent Base</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-blue-600 text-sm font-medium transition-colors">Features</a>
              <a href="#capabilities" className="text-gray-600 hover:text-blue-600 text-sm font-medium transition-colors">Capabilities</a>
              <a href="#" className="text-gray-600 hover:text-blue-600 text-sm font-medium transition-colors">Documentation</a>
              <a href="#" className="text-gray-600 hover:text-blue-600 text-sm font-medium transition-colors">Pricing</a>
              <Button variant="outline" size="sm" className="ml-2" onClick={() => router.push('/chat')}>
                Demo Chat
              </Button>
              <Button variant="default" size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800">
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-28 pb-16 md:pt-32 md:pb-24 bg-white relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50 z-0"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="inline-flex items-center rounded-full px-3 py-1 text-sm bg-blue-50 text-blue-700 border border-blue-100">
                <span className="flex h-2 w-2 rounded-full bg-blue-600 mr-2"></span>
                Developer-First AI Infrastructure
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 leading-tight">
                Build powerful <span className="bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">AI agents</span> with ease
              </h1>
              <p className="text-xl text-gray-600 max-w-lg">
                Deploy, monitor, and scale your AI agents with our serverless infrastructure designed specifically for developers.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <GoogleSignInButton />
                <Button variant="outline" className="border-gray-300" onClick={() => window.open('#', '_blank')}>
                  View Documentation →
                </Button>
              </div>
              <div className="pt-6">
                <p className="text-gray-500 text-sm flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Free tier with 100,000 API calls per month
                </p>
              </div>
            </div>
            <div className="hidden md:block relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg blur opacity-20"></div>
              <div className="relative bg-white p-5 rounded-lg shadow-xl border border-gray-100">
                <div className="text-xs font-mono text-gray-500 mb-2">// AI Agent API</div>
                <pre className="bg-gray-50 p-4 rounded text-sm font-mono overflow-x-auto">
                  <code className="text-gray-800">
{`const agent = await AgentBase.create({
  model: "gpt-4",
  memory: true,
  tools: [search, calculator]
});

// Stream the agent response
const stream = await agent.chat({
  messages: [{ role: "user", content }]
});`}
                  </code>
                </pre>
              </div>
            </div>
          </div>
          
          {/* Logos Section */}
          <div className="mt-16 pt-10 border-t border-gray-100">
            <p className="text-center text-gray-500 text-sm mb-6">TRUSTED BY ENGINEERING TEAMS AT</p>
            <div className="flex flex-wrap justify-center gap-x-12 gap-y-6 opacity-70">
              {/* Replace with actual logos */}
              <div className="h-8 text-gray-400 font-semibold">COMPANY ONE</div>
              <div className="h-8 text-gray-400 font-semibold">COMPANY TWO</div>
              <div className="h-8 text-gray-400 font-semibold">COMPANY THREE</div>
              <div className="h-8 text-gray-400 font-semibold">COMPANY FOUR</div>
              <div className="h-8 text-gray-400 font-semibold">COMPANY FIVE</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Developers Choose Agent Base</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Our platform provides everything developers need to build, deploy, and scale AI agents without the operational overhead.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg mb-5 flex items-center justify-center text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">Serverless Architecture</h3>
              <p className="text-gray-600 mb-4">Zero infrastructure management with auto-scaling capabilities and 99.9% uptime SLA.</p>
              <a href="#" className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center">
                Learn more
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg mb-5 flex items-center justify-center text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">Transparent Pricing</h3>
              <p className="text-gray-600 mb-4">Free tier for development. Pay only for what you use in production with transparent usage-based pricing.</p>
              <a href="#" className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center">
                View pricing
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg mb-5 flex items-center justify-center text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-900">API Ecosystem</h3>
              <p className="text-gray-600 mb-4">RESTful APIs with SDK support for JavaScript, Python, Go, and Ruby. WebSockets for real-time communication.</p>
              <a href="#" className="text-blue-600 hover:text-blue-800 text-sm font-medium inline-flex items-center">
                API docs
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Technical Features Section */}
      <section id="capabilities" className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Technical Capabilities</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Built with LangGraph and LangSmith for state-of-the-art AI agent orchestration and monitoring.</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-10">
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-md bg-blue-100 text-blue-600 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900">AI Agent Infrastructure</h3>
              </div>
              <ul className="space-y-4 text-gray-600">
                <li className="flex items-start">
                  <svg className="w-5 h-5 mt-0.5 mr-3 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span>
                    <span className="font-medium text-gray-900">Vectorized data storage</span> for efficient agent memory and retrieval
                  </span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 mt-0.5 mr-3 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span>
                    <span className="font-medium text-gray-900">Streaming API responses</span> with WebSocket support for real-time interaction
                  </span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 mt-0.5 mr-3 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span>
                    <span className="font-medium text-gray-900">Tool-calling framework</span> with custom actions and function calling
                  </span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 mt-0.5 mr-3 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span>
                    <span className="font-medium text-gray-900">Multi-model orchestration</span> with fallbacks and automatic retries
                  </span>
                </li>
              </ul>
            </div>
            
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center h-12 w-12 rounded-md bg-blue-100 text-blue-600 mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-gray-900">Developer Tools</h3>
              </div>
              <ul className="space-y-4 text-gray-600">
                <li className="flex items-start">
                  <svg className="w-5 h-5 mt-0.5 mr-3 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span>
                    <span className="font-medium text-gray-900">Interactive API playground</span> for testing and prototyping your agents
                  </span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 mt-0.5 mr-3 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span>
                    <span className="font-medium text-gray-900">Open-source SDKs</span> with TypeScript, Python, and Go libraries
                  </span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 mt-0.5 mr-3 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span>
                    <span className="font-medium text-gray-900">Trace visualization</span> powered by LangSmith for agent debugging
                  </span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 mt-0.5 mr-3 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span>
                    <span className="font-medium text-gray-900">Detailed analytics</span> with usage metrics, latency tracking, and cost estimation
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What Developers Say</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Hear from the engineers who build with Agent Base</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 rounded-full bg-gray-200 flex-shrink-0"></div>
                <div className="ml-3">
                  <h4 className="font-medium text-gray-900">Alex Rodriguez</h4>
                  <p className="text-sm text-gray-500">Lead Engineer, TechCorp</p>
                </div>
              </div>
              <p className="text-gray-600">"Agent Base has cut our AI development time in half. The serverless architecture means we can focus on our agent logic instead of infrastructure."</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 rounded-full bg-gray-200 flex-shrink-0"></div>
                <div className="ml-3">
                  <h4 className="font-medium text-gray-900">Maria Chen</h4>
                  <p className="text-sm text-gray-500">CTO, StartupX</p>
                </div>
              </div>
              <p className="text-gray-600">"The debugging tools are exceptional. Being able to visualize the exact flow of our agents has improved our iteration speed dramatically."</p>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 rounded-full bg-gray-200 flex-shrink-0"></div>
                <div className="ml-3">
                  <h4 className="font-medium text-gray-900">James Wilson</h4>
                  <p className="text-sm text-gray-500">AI Engineer, EnterpriseAI</p>
                </div>
              </div>
              <p className="text-gray-600">"With Agent Base, we deployed our first production AI agent in two weeks. The APIs are intuitive and the documentation is comprehensive."</p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 px-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to build powerful AI agents?</h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">Get started with 100,000 free API calls per month. No credit card required.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              className="bg-white text-blue-700 hover:bg-blue-50 font-medium px-6 py-3 text-base"
              onClick={() => window.open('#', '_blank')}
            >
              Start Building
            </Button>
            <Button 
              variant="outline" 
              className="border-white text-white hover:bg-white/10 font-medium px-6 py-3 text-base"
              onClick={() => window.open('#', '_blank')}
            >
              Schedule a Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-white font-semibold mb-4">Agent Base</h3>
              <p className="text-sm text-gray-400 mb-4">Building the future of AI agent infrastructure.</p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white">
                  <span className="sr-only">Twitter</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white">
                  <span className="sr-only">GitHub</span>
                  <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-400 hover:text-white">Features</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Pricing</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Integrations</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Beta Program</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-400 hover:text-white">Documentation</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">API Reference</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Tutorials</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Blog</a></li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-gray-400 hover:text-white">About</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Careers</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Privacy</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white">Terms</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm">© 2023 Agent Base. All rights reserved.</p>
            <div className="mt-4 md:mt-0">
              <p className="text-sm">Made with ❤️ for developers</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 