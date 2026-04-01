'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { articles, type ArticleAudience } from './articles'

const AUDIENCE_LABELS: Record<ArticleAudience, string> = {
  customer: 'For Customers',
  cleaner: 'For Cleaners',
  both: 'For Everyone',
}

const AUDIENCE_COLORS: Record<ArticleAudience, string> = {
  customer: 'bg-blue-100 text-blue-700',
  cleaner: 'bg-green-100 text-green-700',
  both: 'bg-purple-100 text-purple-700',
}

type FilterState = 'all' | 'customer' | 'cleaner'

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function BlogPage() {
  const [filter, setFilter] = useState<FilterState>('all')
  const [userRole, setUserRole] = useState<string | null>(null)
  const [roleLoaded, setRoleLoaded] = useState(false)

  // Auto-filter based on logged-in role
  useEffect(() => {
    async function getRole() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await (supabase as any)
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
          const role = profile?.role ?? null
          setUserRole(role)
          // Auto-set filter based on role
          if (role === 'cleaner') setFilter('cleaner')
          else if (role === 'customer') setFilter('customer')
        }
      } catch {}
      setRoleLoaded(true)
    }
    getRole()
  }, [])

  const filtered = articles.filter(article => {
    if (filter === 'all') return true
    return article.audience === filter || article.audience === 'both'
  })

  const filterButtons: { key: FilterState; label: string }[] = [
    { key: 'all', label: 'All articles' },
    { key: 'customer', label: 'For customers' },
    { key: 'cleaner', label: 'For cleaners' },
  ]

  return (
    <main className="min-h-screen bg-white">

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-green-50 border-b border-gray-100 py-16">
        <div className="container max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 text-xs font-semibold text-blue-700 mb-6">
            ✍️ Vouchee Blog
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4" style={{ fontFamily: 'Lora, serif' }}>
            Cleaning advice, guides, and resources
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto">
            Practical guides for homeowners and professional cleaners in Horsham and beyond.
          </p>
        </div>
      </section>

      {/* Filter buttons */}
      <section className="border-b border-gray-100 sticky top-16 z-10 bg-white/95 backdrop-blur">
        <div className="container max-w-4xl mx-auto px-6 py-4 flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider mr-1">
            Filter:
          </span>
          {filterButtons.map(btn => (
            <button
              key={btn.key}
              onClick={() => setFilter(btn.key)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                filter === btn.key
                  ? 'bg-gray-900 text-white border-gray-900'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:text-gray-900'
              }`}
            >
              {btn.label}
              {btn.key !== 'all' && roleLoaded && userRole === btn.key && (
                <span className="ml-1.5 text-xs opacity-70">· you</span>
              )}
            </button>
          ))}
          <span className="ml-auto text-xs text-gray-400">
            {filtered.length} article{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
      </section>

      {/* Article feed */}
      <section className="container max-w-4xl mx-auto px-6 py-12">
        <div className="flex flex-col gap-0">
          {filtered.map((article, i) => (
            <article
              key={article.slug}
              className={`group flex flex-col md:flex-row gap-6 py-10 ${
                i < filtered.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              {/* Image */}
              <Link
                href={`/blog/${article.slug}`}
                className="flex-shrink-0 block w-full md:w-64 h-48 md:h-44 rounded-2xl overflow-hidden"
              >
                <img
                  src={article.image}
                  alt={article.imageAlt}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </Link>

              {/* Content */}
              <div className="flex flex-col justify-center flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${AUDIENCE_COLORS[article.audience]}`}>
                    {AUDIENCE_LABELS[article.audience]}
                  </span>
                  <span className="text-xs text-gray-400">{article.category}</span>
                  <span className="text-xs text-gray-300">·</span>
                  <span className="text-xs text-gray-400">{article.readingTime} min read</span>
                </div>

                <Link href={`/blog/${article.slug}`}>
                  <h2 className="text-xl font-bold text-gray-900 mb-2 leading-tight group-hover:text-blue-600 transition-colors" style={{ fontFamily: 'Lora, serif' }}>
                    {article.title}
                  </h2>
                </Link>

                <p className="text-gray-500 text-sm leading-relaxed mb-4 line-clamp-2">
                  {article.excerpt}
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{formatDate(article.publishedAt)}</span>
                  <Link
                    href={`/blog/${article.slug}`}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Read article →
                  </Link>
                </div>
              </div>
            </article>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <div className="text-4xl mb-3">📖</div>
              <p className="font-medium text-gray-600 mb-1">No articles match this filter</p>
              <button
                onClick={() => setFilter('all')}
                className="text-sm text-blue-500 hover:underline mt-1"
              >
                Show all articles
              </button>
            </div>
          )}
        </div>
      </section>

    </main>
  )
}
