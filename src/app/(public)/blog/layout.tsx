import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cleaning Tips & Guides, The Vouchee Blog',
  description: 'Practical cleaning advice, guides for finding the right cleaner, and tips for self-employed cleaners, written by the Vouchee team and our professional cleaners in Horsham.',
  alternates: { canonical: '/blog' },
  openGraph: {
    title: 'The Vouchee Blog, Cleaning Tips & Guides',
    description: 'Practical cleaning advice, guides for finding the right cleaner, and tips for self-employed cleaners.',
    url: '/blog',
    images: ['/og-image.jpg'],
  },
}

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
