import type { MetadataRoute } from 'next'
import { articles } from './(public)/blog/articles'

const SITE_URL = 'https://www.vouchee.co.uk'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const staticRoutes: { path: string; priority: number; changeFrequency: 'daily' | 'weekly' | 'monthly' | 'yearly' }[] = [
    { path: '/', priority: 1.0, changeFrequency: 'weekly' },
    { path: '/horsham', priority: 0.9, changeFrequency: 'weekly' },
    { path: '/how-it-works', priority: 0.8, changeFrequency: 'monthly' },
    { path: '/pricing', priority: 0.9, changeFrequency: 'monthly' },
    { path: '/coverage', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/faq', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/why-vouchee', priority: 0.6, changeFrequency: 'monthly' },
    { path: '/one-off', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/jobs', priority: 0.7, changeFrequency: 'weekly' },
    { path: '/cleaning-supplies', priority: 0.5, changeFrequency: 'monthly' },
    { path: '/blog', priority: 0.5, changeFrequency: 'weekly' },
    { path: '/cleaner', priority: 0.7, changeFrequency: 'monthly' },
    { path: '/cleaner/going-solo', priority: 0.5, changeFrequency: 'monthly' },
    { path: '/cleaner/established', priority: 0.5, changeFrequency: 'monthly' },
    { path: '/cleaner/new-to-cleaning', priority: 0.5, changeFrequency: 'monthly' },
    { path: '/cleaner/returning', priority: 0.5, changeFrequency: 'monthly' },
    { path: '/cleaner/no-presence', priority: 0.5, changeFrequency: 'monthly' },
    { path: '/legal/privacy', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/legal/cookies', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/legal/terms/customer', priority: 0.3, changeFrequency: 'yearly' },
    { path: '/legal/terms/cleaner', priority: 0.3, changeFrequency: 'yearly' },
  ]

  const staticEntries: MetadataRoute.Sitemap = staticRoutes.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }))

  const blogEntries: MetadataRoute.Sitemap = articles.map((article) => ({
    url: `${SITE_URL}/blog/${article.slug}`,
    lastModified: article.publishedAt ? new Date(article.publishedAt) : now,
    changeFrequency: 'monthly',
    priority: 0.5,
  }))

  return [...staticEntries, ...blogEntries]
}
