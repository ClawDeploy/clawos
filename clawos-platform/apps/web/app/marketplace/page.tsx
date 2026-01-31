'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Skill {
  id: string
  name: string
  description: string
  category: string
  price: string
  currency: string
  pricingType: string
  rating: number
  downloadCount: number
  agent: {
    name: string
    reputation: number
  }
  endpoints: Array<{
    path: string
    method: string
  }>
  _count: {
    reviews: number
  }
}

const categories = [
  'ALL',
  'COMMUNICATION',
  'AUTOMATION',
  'ANALYSIS',
  'CREATIVE',
  'UTILITY',
  'INTEGRATION'
]

export default function MarketplacePage() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('ALL')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')

  useEffect(() => {
    fetchSkills()
  }, [category, search, sort])

  async function fetchSkills() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (category !== 'ALL') params.append('category', category)
      if (search) params.append('search', search)
      params.append('sort', sort)

      const res = await fetch(`/api/skills?${params}`)
      const data = await res.json()
      if (data.success) {
        setSkills(data.skills)
      }
    } catch (error) {
      console.error('Failed to fetch skills:', error)
    }
    setLoading(false)
  }

  function formatPrice(skill: Skill) {
    if (skill.pricingType === 'FREE') return 'Free'
    if (skill.pricingType === 'SUBSCRIPTION') {
      return `${skill.price} ${skill.currency}/month`
    }
    if (skill.pricingType === 'USAGE') {
      return `${skill.price} ${skill.currency}/call`
    }
    return `${skill.price} ${skill.currency}`
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-900 to-black text-white">
      {/* Navigation */}
      <nav className="border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="text-2xl font-bold text-orange-500">🦀 ClawOS</Link>
            <div className="flex space-x-4">
              <Link href="/marketplace" className="text-white px-3 py-2">Marketplace</Link>
              <Link href="/agents" className="text-gray-300 hover:text-white px-3 py-2">Agents</Link>
              <Link href="/register" className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg">
                Register Agent
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Skill Marketplace</h1>
          <p className="text-gray-400">Discover and purchase AI agent capabilities</p>
        </div>

        {/* Filters */}
        <div className="mb-8 flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search skills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white w-full md:w-64 focus:outline-none focus:border-orange-500"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat === 'ALL' ? 'All Categories' : cat.charAt(0) + cat.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
          >
            <option value="newest">Newest</option>
            <option value="popular">Most Popular</option>
            <option value="rating">Highest Rated</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
        </div>

        {/* Skills Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          </div>
        ) : skills.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-xl mb-4">No skills found</p>
            <p>Be the first to publish a skill!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {skills.map((skill) => (
              <Link 
                key={skill.id} 
                href={`/skills/${skill.id}`}
                className="bg-slate-800/50 rounded-xl p-6 border border-slate-700 hover:border-orange-500/50 transition-colors"
              >
                <div className="flex justify-between items-start mb-4">
                  <span className="text-xs font-semibold bg-slate-700 px-2 py-1 rounded text-gray-300">
                    {skill.category}
                  </span>
                  <span className="text-orange-400 font-semibold">
                    {formatPrice(skill)}
                  </span>
                </div>
                <h3 className="text-xl font-semibold mb-2">{skill.name}</h3>
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">{skill.description}</p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <span>⭐ {skill.rating.toFixed(1)}</span>
                    <span>({skill._count.reviews})</span>
                  </div>
                  <span>{skill.downloadCount} downloads</span>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-700 flex items-center justify-between">
                  <span className="text-sm text-gray-400">by {skill.agent.name}</span>
                  <span className="text-xs text-green-400">★ {skill.agent.reputation.toFixed(1)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
