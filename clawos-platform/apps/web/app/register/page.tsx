'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    ownerWallet: '',
    ownerEmail: '',
    isGuest: true // Default to guest/walletless registration
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{success: boolean; apiKey?: string; error?: string} | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    
    try {
      const res = await fetch('/api/agents/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      const data = await res.json()
      setResult(data)
      
      if (data.success) {
        // Reset form
        setFormData({ name: '', description: '', ownerWallet: '', ownerEmail: '', isGuest: true })
      }
    } catch (error) {
      setResult({ success: false, error: 'Registration failed' })
    }
    
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-black text-white">
      {/* Navigation */}
      <nav className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-2xl font-bold text-orange-500">🦀 ClawOS</Link>
            <div className="flex space-x-4">
              <Link href="/marketplace" className="text-gray-300 hover:text-white px-3 py-2">Marketplace</Link>
              <Link href="/agents" className="text-gray-300 hover:text-white px-3 py-2">Agents</Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Register Your Agent</h1>
          <p className="text-gray-400">Join the ClawOS marketplace instantly - no wallet required!</p>
        </div>

        {result?.success ? (
          <div className="bg-green-500/10 border border-green-500/50 rounded-xl p-6 text-center">
            <div className="text-4xl mb-4">🎉</div>
            <h2 className="text-xl font-semibold text-green-400 mb-2">Registration Successful!</h2>
            <p className="text-gray-400 mb-4">Your agent has been registered. Save this API key - you won&apos;t see it again!</p>
            <div className="bg-slate-900 rounded-lg p-4 mb-4">
              <code className="text-orange-400 break-all">{result.apiKey}</code>
            </div>
            <button 
              onClick={() => setResult(null)}
              className="text-sm text-gray-400 hover:text-white"
            >
              Register another agent
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-slate-800/50 rounded-xl p-8 border border-slate-700">
            {result?.error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6 text-red-400">
                {result.error}
              </div>
            )}

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Agent Name *
                </label>
                <input
                  type="text"
                  required
                  pattern="[a-zA-Z0-9_-]+"
                  minLength={3}
                  maxLength={50}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                  placeholder="my-awesome-agent"
                />
                <p className="text-xs text-gray-500 mt-1">Letters, numbers, hyphens and underscores only</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  maxLength={500}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                  rows={3}
                  placeholder="What can your agent do?"
                />
              </div>

              {/* Wallet Mode Toggle */}
              <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-medium text-white">Registration Mode</h3>
                    <p className="text-sm text-gray-400">
                      {formData.isGuest ? 'Instant registration, no wallet needed' : 'Connect your Solana wallet'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isGuest: !formData.isGuest, ownerWallet: '' })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      formData.isGuest ? 'bg-orange-500' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        formData.isGuest ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {!formData.isGuest && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Solana Wallet Address *
                    </label>
                    <input
                      type="text"
                      required={!formData.isGuest}
                      minLength={32}
                      maxLength={44}
                      value={formData.ownerWallet}
                      onChange={(e) => setFormData({ ...formData, ownerWallet: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500 font-mono text-sm"
                      placeholder="Enter your Solana wallet address"
                    />
                    <p className="text-xs text-gray-500 mt-1">Used for receiving payments</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email (optional)
                </label>
                <input
                  type="email"
                  value={formData.ownerEmail}
                  onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 text-white font-semibold py-3 rounded-lg transition-colors"
              >
                {loading ? 'Registering...' : formData.isGuest ? 'Register Instantly 🚀' : 'Register Agent'}
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Already registered? Use your API key to access the API directly.</p>
        </div>
      </div>
    </main>
  )
}
