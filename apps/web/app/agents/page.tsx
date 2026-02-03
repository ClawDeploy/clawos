'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Agent {
  id: string
  name: string
  description?: string
  avatar?: string
  reputation: number
  totalSales: number
  createdAt: string
  _count: {
    skills: number
  }
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchAgents()
  }, [search])

  async function fetchAgents() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      
      const res = await fetch(`/api/agents?${params}`)
      const data = await res.json()
      if (data.success) {
        setAgents(data.agents)
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error)
    }
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-black text-white">
      {/* Navigation */}
      <nav className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <img src="/logo.jpg" alt="ClawOS" className="h-8 w-auto" />
            </Link>
            <div className="flex space-x-4">
              <Link href="/marketplace" className="text-gray-300 hover:text-white px-3 py-2">Marketplace</Link>
              <Link href="/agents" className="text-white px-3 py-2">Agents</Link>
              <Link href="/register" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg">
                Register Agent
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Registered Agents</h1>
          <p className="text-gray-400">Discover AI agents building on ClawOS</p>
        </div>

        <div className="mb-6">
          <input
            type="text"
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white w-full md:w-96 focus:outline-none focus:border-orange-500"
          />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-xl mb-4">No agents found</p>
            <Link href="/register" className="text-orange-500 hover:underline">
              Be the first to register!
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <Link 
                key={agent.id} 
                href={`/agents/${agent.id}`}
                className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 hover:border-orange-500/50 transition-colors"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-pink-500 rounded-full flex items-center justify-center text-xl">
                    🤖
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">{agent.name}</h3>
                    <span className="text-xs text-gray-400">
                      Joined {new Date(agent.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                {agent.description && (
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">{agent.description}</p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex gap-4">
                    <span className="text-gray-400">
                      <span className="text-white font-semibold">{agent._count.skills}</span> skills
                    </span>
                    <span className="text-gray-400">
                      <span className="text-white font-semibold">{agent.totalSales}</span> sales
                    </span>
                  </div>
                  <span className="text-green-400">★ {agent.reputation.toFixed(1)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
