export type ArticleAudience = 'customer' | 'cleaner' | 'both'

export interface Article {
  slug: string
  title: string
  excerpt: string
  audience: ArticleAudience
  readingTime: number // minutes
  publishedAt: string
  image: string // Unsplash URL
  imageAlt: string
  category: string
}

export const articles: Article[] = [
  {
    slug: 'essential-cleaning-kit-new-home',
    title: 'The essential cleaning kit for a new home',
    excerpt: 'Moving into a new property? Here\'s exactly what to stock up on — from the basics that every home needs to the specialist products that make the tricky jobs easy.',
    audience: 'both',
    readingTime: 6,
    publishedAt: '2026-03-28',
    image: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=800&q=80',
    imageAlt: 'Cleaning supplies arranged on a kitchen counter',
    category: 'Cleaning Guides',
  },
  {
    slug: 'how-to-find-a-cleaner-horsham',
    title: 'How to find a cleaner in Horsham',
    excerpt: 'Finding a reliable, vetted cleaner in Horsham doesn\'t have to be a gamble. Here\'s what to look for, what questions to ask, and how Vouchee makes the whole process straightforward.',
    audience: 'customer',
    readingTime: 5,
    publishedAt: '2026-03-27',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    imageAlt: 'Bright clean living room in a Horsham home',
    category: 'For Customers',
  },
  {
    slug: 'deep-clean-vs-regular-clean',
    title: 'Deep clean vs regular clean — what\'s the difference?',
    excerpt: 'Not sure whether you need a one-off deep clean or a regular cleaning service? We break down what each involves, how much they typically cost, and which one is right for your home.',
    audience: 'customer',
    readingTime: 4,
    publishedAt: '2026-03-26',
    image: 'https://images.unsplash.com/photo-1527515637462-cff94aca55f6?w=800&q=80',
    imageAlt: 'Professional cleaner scrubbing a kitchen surface',
    category: 'For Customers',
  },
  {
    slug: 'what-to-expect-from-your-first-professional-clean',
    title: 'What to expect from your first professional clean',
    excerpt: 'Booking your first professional cleaner? Here\'s how to prepare your home, what a good cleaner will cover, and how to build a routine that keeps your home consistently clean.',
    audience: 'customer',
    readingTime: 5,
    publishedAt: '2026-03-25',
    image: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=800&q=80',
    imageAlt: 'Spotless kitchen after a professional clean',
    category: 'For Customers',
  },
  {
    slug: 'cleaning-products-professionals-use',
    title: 'The cleaning products professional cleaners actually use',
    excerpt: 'Forget the gimmicks. Here are the products that Vouchee\'s vetted cleaners genuinely reach for every session — from Bar Keepers Friend to HG Mould Spray — and why they work.',
    audience: 'both',
    readingTime: 7,
    publishedAt: '2026-03-24',
    image: 'https://images.unsplash.com/photo-1596265371388-43b3e4e42ac5?w=800&q=80',
    imageAlt: 'Professional cleaning products lined up on a shelf',
    category: 'Cleaning Guides',
  },
  {
    slug: 'how-to-go-self-employed-as-a-cleaner-uk',
    title: 'How to go self-employed as a cleaner in the UK',
    excerpt: 'Thinking about going self-employed as a cleaner? This guide covers HMRC registration, tax obligations, what insurance you need, and how to find your first clients — without the jargon.',
    audience: 'cleaner',
    readingTime: 8,
    publishedAt: '2026-03-23',
    image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80',
    imageAlt: 'Person reviewing self-employment paperwork at a desk',
    category: 'For Cleaners',
  },
  {
    slug: 'dbs-checks-explained-what-cleaners-need-to-know',
    title: 'DBS checks explained — what cleaners need to know',
    excerpt: 'A DBS check is one of the first things clients ask about. Here\'s what the different check types mean, how to apply, how long it takes, and why having one puts you ahead of the competition.',
    audience: 'cleaner',
    readingTime: 5,
    publishedAt: '2026-03-22',
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80',
    imageAlt: 'Official documents and a pen on a desk',
    category: 'For Cleaners',
  },
  {
    slug: 'how-to-build-a-cleaning-round-horsham',
    title: 'How to build a cleaning round in Horsham',
    excerpt: 'A well-built cleaning round means reliable income, local clients, and a diary that works around your life. Here\'s how to structure yours from day one — and how Vouchee helps you fill it faster.',
    audience: 'cleaner',
    readingTime: 6,
    publishedAt: '2026-03-21',
    image: 'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800&q=80',
    imageAlt: 'Person planning their schedule on a laptop',
    category: 'For Cleaners',
  },
]

export function getArticle(slug: string): Article | undefined {
  return articles.find(a => a.slug === slug)
}

export function getRelatedArticles(slug: string, audience: ArticleAudience, count = 3): Article[] {
  return articles
    .filter(a => a.slug !== slug && (a.audience === audience || a.audience === 'both' || audience === 'both'))
    .slice(0, count)
}