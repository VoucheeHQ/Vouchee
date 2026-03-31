import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getArticle, getRelatedArticles, articles, type ArticleAudience } from '../articles'
import { ArticleContent } from './content'

interface Props {
  params: { slug: string }
}

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

export async function generateStaticParams() {
  return articles.map(a => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = getArticle(params.slug)
  if (!article) return {}
  return {
    title: `${article.title} | Vouchee Blog`,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      images: [article.image],
      type: 'article',
      publishedTime: article.publishedAt,
    },
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

export default function ArticlePage({ params }: Props) {
  const article = getArticle(params.slug)
  if (!article) notFound()

  const related = getRelatedArticles(params.slug, article.audience)

  return (
    <main className="min-h-screen bg-white">

      {/* Breadcrumb */}
      <div className="container max-w-3xl mx-auto px-6 pt-8 pb-2">
        <nav className="flex items-center gap-2 text-sm text-gray-400">
          <Link href="/" className="hover:text-gray-600 transition-colors">Home</Link>
          <span>›</span>
          <Link href="/blog" className="hover:text-gray-600 transition-colors">Blog</Link>
          <span>›</span>
          <span className="text-gray-600 truncate">{article.title}</span>
        </nav>
      </div>

      {/* Article header */}
      <section className="container max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${AUDIENCE_COLORS[article.audience]}`}>
            {AUDIENCE_LABELS[article.audience]}
          </span>
          <span className="text-xs text-gray-400">{article.category}</span>
          <span className="text-xs text-gray-300">·</span>
          <span className="text-xs text-gray-400">{article.readingTime} min read</span>
          <span className="text-xs text-gray-300">·</span>
          <span className="text-xs text-gray-400">{formatDate(article.publishedAt)}</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight" style={{ fontFamily: 'Lora, serif' }}>
          {article.title}
        </h1>

        <p className="text-lg text-gray-500 leading-relaxed mb-8">
          {article.excerpt}
        </p>
      </section>

      {/* Hero image */}
      <div className="container max-w-4xl mx-auto px-6 mb-12">
        <div className="rounded-2xl overflow-hidden aspect-video">
          <img
            src={article.image}
            alt={article.imageAlt}
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* Article body */}
      <section className="container max-w-3xl mx-auto px-6 pb-16">
        <div className="prose prose-gray prose-lg max-w-none
          prose-headings:font-bold prose-headings:text-gray-900
          prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
          prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
          prose-p:text-gray-600 prose-p:leading-relaxed
          prose-li:text-gray-600
          prose-strong:text-gray-800
          prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline
          prose-blockquote:border-blue-200 prose-blockquote:bg-blue-50 prose-blockquote:rounded-xl prose-blockquote:px-6 prose-blockquote:py-4 prose-blockquote:not-italic
          prose-img:rounded-xl prose-img:shadow-sm
        ">
          <ArticleContent slug={params.slug} />
        </div>

        {/* CTA based on audience */}
        <div className={`mt-12 rounded-2xl p-8 text-center ${
          article.audience === 'cleaner'
            ? 'bg-green-50 border border-green-100'
            : 'bg-blue-50 border border-blue-100'
        }`}>
          {article.audience === 'cleaner' ? (
            <>
              <h3 className="font-bold text-gray-900 text-xl mb-2" style={{ fontFamily: 'Lora, serif' }}>
                Ready to find cleaning work in Horsham?
              </h3>
              <p className="text-gray-500 text-sm mb-5">
                Join Vouchee and start applying for local cleaning jobs today.
              </p>
              <Link
                href="/cleaner"
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
              >
                Apply as a cleaner →
              </Link>
            </>
          ) : (
            <>
              <h3 className="font-bold text-gray-900 text-xl mb-2" style={{ fontFamily: 'Lora, serif' }}>
                Find a vetted cleaner in Horsham
              </h3>
              <p className="text-gray-500 text-sm mb-5">
                Browse DBS-checked local cleaners and post your first cleaning request today.
              </p>
              <Link
                href="/request/property"
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm"
              >
                Find a cleaner →
              </Link>
            </>
          )}
        </div>
      </section>

      {/* Related articles */}
      {related.length > 0 && (
        <section className="border-t border-gray-100 bg-gray-50 py-14">
          <div className="container max-w-4xl mx-auto px-6">
            <h2 className="text-xl font-bold text-gray-900 mb-8" style={{ fontFamily: 'Lora, serif' }}>
              Related articles
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {related.map(rel => (
                <Link key={rel.slug} href={`/blog/${rel.slug}`} className="group block bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-sm transition-shadow">
                  <div className="aspect-video overflow-hidden">
                    <img
                      src={rel.image}
                      alt={rel.imageAlt}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-4">
                    <p className="text-xs text-gray-400 mb-2">{rel.readingTime} min read</p>
                    <h3 className="text-sm font-bold text-gray-900 leading-snug group-hover:text-blue-600 transition-colors" style={{ fontFamily: 'Lora, serif' }}>
                      {rel.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

    </main>
  )
}
