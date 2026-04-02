import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Cleaning Supplies Recommended by Vouchee | Professional Cleaning Products',
  description: 'Hand-picked cleaning products recommended by Vouchee and our professional cleaners. From everyday essentials to specialist tools — everything you need for a spotless home.',
}

// ── Affiliate disclosure (required by Amazon Associates) ──────
// Vouchee is a participant in the Amazon EU Associates Programme,
// an affiliate advertising programme designed to provide a means
// for sites to earn advertising fees by advertising and linking
// to Amazon.co.uk.

const CATEGORIES = [
  {
    id: 'kitchen-bathroom',
    emoji: '🧴',
    name: 'Kitchen & Bathroom',
    description: 'The heavy hitters. Products our cleaners reach for every single session.',
    color: 'blue',
    count: 9,
  },
  {
    id: 'floors',
    emoji: '🧹',
    name: 'Floors',
    description: 'From hardwood to tile — keep every floor type looking its best.',
    color: 'green',
    count: 1,
  },
  {
    id: 'large-items',
    emoji: '🧳',
    name: 'Large Items & Equipment',
    description: 'The big kit. Hoovers, steam mops, carpet cleaners and more.',
    color: 'purple',
    count: 7,
  },
  {
    id: 'tools',
    emoji: '🪣',
    name: 'Tools & Accessories',
    description: 'The small things that make a huge difference. Scrubbers, cloths, gloves.',
    color: 'amber',
    count: 9,
  },
  {
    id: 'specialist',
    emoji: '⚗️',
    name: 'Specialist',
    description: 'For the tough jobs. Targeted products for specific problem areas.',
    color: 'red',
    count: 0,
    comingSoon: true,
  },
  {
    id: 'eco',
    emoji: '🌿',
    name: 'Eco & Sensitive',
    description: 'Effective cleaning without harsh chemicals. Kind to skin, home, and planet.',
    color: 'teal',
    count: 0,
    comingSoon: true,
  },
]

const PRODUCTS: Record<string, Array<{
  name: string
  description: string
  why: string
  tag?: string
  amazonSearch: string
}>> = {
  'kitchen-bathroom': [
    {
      name: "Bar Keepers Friend",
      description: "Powder cleanser that works on sinks, taps, ceramic hobs, and stubborn stains.",
      why: "Our most-recommended product. Removes limescale and rust without scratching.",
      tag: "Cleaner favourite",
      amazonSearch: "Bar+Keepers+Friend+Powder+Cleanser",
    },
    {
      name: "The Pink Stuff",
      description: "All-purpose miracle paste for ovens, grout, pots, and almost everything else.",
      why: "Incredible at cutting through baked-on grease with minimal effort.",
      tag: "Viral for a reason",
      amazonSearch: "The+Pink+Stuff+Miracle+Cleaning+Paste",
    },
    {
      name: "HG Mould Spray",
      description: "Professional-strength mould remover for bathrooms, grouting, and silicone.",
      why: "Works where other sprays give up. Leave it on, rinse off — done.",
      tag: "Professional grade",
      amazonSearch: "HG+Mould+Spray+Remover",
    },
    {
      name: "Magic Mould Remover",
      description: "Gel-formula mould treatment that clings to vertical surfaces.",
      why: "The gel sticks to grout lines so you don't need to keep reapplying.",
      amazonSearch: "Magic+Mould+Remover+Gel",
    },
    {
      name: "Viakal Limescale Remover",
      description: "The go-to for shower screens, taps, and showerheads.",
      why: "Nothing cuts through limescale buildup faster. A single spray and wipe.",
      tag: "Hard water essential",
      amazonSearch: "Viakal+Limescale+Remover+Spray",
    },
    {
      name: "Harpic Power Plus",
      description: "Thick bleach formula that clings under the toilet rim.",
      why: "The shape of the bottle gets right under the rim where other products can't reach.",
      amazonSearch: "Harpic+Power+Plus+Toilet+Cleaner",
    },
    {
      name: "Flash Multi-Surface Spray",
      description: "Everyday all-purpose cleaner for worktops, tiles, and kitchen surfaces.",
      why: "Fast, effective, and the scent is clean without being overpowering.",
      amazonSearch: "Flash+All+Purpose+Cleaning+Spray",
    },
    {
      name: "Elbow Grease Degreaser",
      description: "Heavy-duty degreaser for kitchen cookers, extractor fans, and surfaces.",
      why: "Cuts through cooking grease that washing-up liquid just smears around.",
      tag: "Kitchen must-have",
      amazonSearch: "Elbow+Grease+All+Purpose+Degreaser+Spray",
    },
    {
      name: "Cillit Bang Limescale & Shine",
      description: "Fast-acting spray for bathroom fixtures, taps, and shower trays.",
      why: "Good for a quick blast when Viakal is overkill — everyday maintenance cleaner.",
      amazonSearch: "Cillit+Bang+Limescale+Shine+Spray",
    },
  ],
  'floors': [
    {
      name: "Flash Floor Cleaner",
      description: "Multi-surface floor cleaner for tiles, laminate, vinyl, and hardwood.",
      why: "Works across all floor types without leaving a streaky residue.",
      tag: "All floor types",
      amazonSearch: "Flash+Floor+Cleaner+Multi+Surface",
    },
  ],
  'large-items': [
    {
      name: "Henry Hoover (HVR200)",
      description: "The iconic red cylinder hoover. Used by professional cleaners everywhere.",
      why: "Robust, powerful, and the bags last a long time. The industry standard for a reason.",
      tag: "Industry standard",
      amazonSearch: "Henry+Hoover+HVR200",
    },
    {
      name: "Shark Cordless Handheld Hoover",
      description: "Lightweight handheld for stairs, upholstery, and car interiors.",
      why: "Picks up pet hair and dust in tight spots that a cylinder hoover can't reach.",
      tag: "Pet hair specialist",
      amazonSearch: "Shark+Cordless+Handheld+Vacuum+Cleaner",
    },
    {
      name: "Steam Mop",
      description: "Chemical-free floor cleaning using high-temperature steam.",
      why: "Sanitises hard floors without any product — great for households with young children or allergies.",
      amazonSearch: "Steam+Mop+Hard+Floor+Cleaner",
    },
    {
      name: "Mop and Bucket Set",
      description: "Flat mop with wringer bucket — the professional's choice for hard floors.",
      why: "Microfibre flat mops cover more ground and pick up more dirt than traditional string mops.",
      amazonSearch: "Flat+Mop+and+Bucket+Set+Microfibre",
    },
    {
      name: "Carpet Cleaner Machine",
      description: "Upright or portable carpet washer for deep cleaning carpets and rugs.",
      why: "Transforms tired-looking carpets. Ideal for end of tenancy cleans.",
      tag: "End of tenancy essential",
      amazonSearch: "Carpet+Cleaner+Machine+Upright",
    },
    {
      name: "Cleaner Travel Bag",
      description: "Heavy-duty tote or trolley bag for carrying cleaning supplies between jobs.",
      why: "Keeps products organised and prevents leaks in transit. A proper bag makes the job easier.",
      amazonSearch: "Cleaning+Supplies+Carrier+Bag+Professional",
    },
    {
      name: "Eurow Microfibre Flat Mop",
      description: "Professional-grade flat mop with washable microfibre pads.",
      why: "Reusable pads save money long-term and are more hygienic than disposable alternatives.",
      amazonSearch: "Microfibre+Flat+Mop+Professional+Washable",
    },
  ],
  'tools': [
    {
      name: "Scrub Daddy Sponge",
      description: "Scratch-free sponge that changes texture with water temperature.",
      why: "Firm in cold water for scrubbing, soft in warm for wiping. Genuinely clever design.",
      tag: "Worth the hype",
      amazonSearch: "Scrub+Daddy+Sponge+Multi+Pack",
    },
    {
      name: "Microfibre Cloths (bulk pack)",
      description: "The everyday workhorse of professional cleaning. Pack of 12 or more.",
      why: "Lint-free, streak-free, and reusable. Buy in bulk and always have a clean one to hand.",
      tag: "Stock up",
      amazonSearch: "Microfibre+Cleaning+Cloths+Bulk+Pack+12",
    },
    {
      name: "Rubber Gloves (professional)",
      description: "Thick, durable gloves that protect hands during heavy cleaning sessions.",
      why: "Standard kitchen gloves tear too easily. Professional-grade gloves last far longer.",
      amazonSearch: "Professional+Rubber+Cleaning+Gloves+Thick",
    },
    {
      name: "Electric Spin Scrubber",
      description: "Cordless electric scrubber with interchangeable heads for grout, tiles, and baths.",
      why: "Saves serious elbow grease on grout lines and around taps. Worth every penny.",
      tag: "Game changer",
      amazonSearch: "Electric+Spin+Scrubber+Cordless+Interchangeable+Heads",
    },
    {
      name: "Grout Brush / Grout Scrubber",
      description: "Narrow stiff-bristled brush for getting into grout lines between tiles.",
      why: "No electric scrubber? This is the manual alternative. Narrow enough to fit into tight grout lines.",
      amazonSearch: "Grout+Brush+Scrubber+Tile+Cleaning",
    },
    {
      name: "Pet Hair Scraper / Rubber Broom",
      description: "Rubber-headed tool that attracts and lifts pet hair from carpets and upholstery.",
      why: "Picks up pet hair that a hoover leaves behind. Essential for any house with animals.",
      tag: "Pet hair essential",
      amazonSearch: "Pet+Hair+Scraper+Rubber+Broom+Carpet",
    },
    {
      name: "Window Scraper / Razor Scraper",
      description: "Stainless steel scraper for removing paint, sticker residue, and dried-on marks.",
      why: "Removes things that no spray will touch. Keep one for end of tenancy jobs.",
      amazonSearch: "Window+Scraper+Razor+Blade+Cleaner",
    },
    {
      name: "Extendable Duster",
      description: "Long-handled microfibre duster for ceiling fans, light fittings, and high shelves.",
      why: "Gets into spots that are impossible to reach with a cloth. Telescopic handle is key.",
      amazonSearch: "Extendable+Microfibre+Duster+Telescopic",
    },
    {
      name: "Caddy / Cleaning Organiser",
      description: "Portable cleaning caddy for carrying sprays and tools room to room.",
      why: "Keeps everything to hand so you're not running back and forth. Simple but effective.",
      amazonSearch: "Cleaning+Caddy+Organiser+Carry",
    },
  ],
}

const colorClasses: Record<string, { card: string; icon: string; badge: string; hover: string }> = {
  blue:   { card: 'border-blue-100 hover:border-blue-300 hover:bg-blue-50/50',   icon: 'bg-blue-100',   badge: 'bg-blue-100 text-blue-700',   hover: 'group-hover:text-blue-600' },
  green:  { card: 'border-green-100 hover:border-green-300 hover:bg-green-50/50', icon: 'bg-green-100',  badge: 'bg-green-100 text-green-700',  hover: 'group-hover:text-green-600' },
  purple: { card: 'border-purple-100 hover:border-purple-300 hover:bg-purple-50/50', icon: 'bg-purple-100', badge: 'bg-purple-100 text-purple-700', hover: 'group-hover:text-purple-600' },
  amber:  { card: 'border-amber-100 hover:border-amber-300 hover:bg-amber-50/50', icon: 'bg-amber-100',  badge: 'bg-amber-100 text-amber-700',  hover: 'group-hover:text-amber-600' },
  red:    { card: 'border-red-100 hover:border-red-200 hover:bg-red-50/30',       icon: 'bg-red-100',    badge: 'bg-red-100 text-red-700',      hover: 'group-hover:text-red-600' },
  teal:   { card: 'border-teal-100 hover:border-teal-300 hover:bg-teal-50/50',   icon: 'bg-teal-100',   badge: 'bg-teal-100 text-teal-700',   hover: 'group-hover:text-teal-600' },
}

export default function CleaningSuppliesPage() {
  return (
    <main className="min-h-screen bg-white">

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-green-50 border-b border-gray-100 py-16">
        <div className="container max-w-4xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-green-50 border border-green-100 rounded-full px-4 py-1.5 text-xs font-semibold text-green-700 mb-6">
            🧹 Recommended by Vouchee cleaners
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-5 leading-tight" style={{ fontFamily: 'Lora, serif' }}>
            The cleaning kit that<br className="hidden md:block" /> professionals actually use
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto mb-8 leading-relaxed">
            Hand-picked products recommended by Vouchee and our vetted local cleaners. No fluff — just the products that earn their place in the kit bag.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">✅ Cleaner-tested</span>
            <span className="flex items-center gap-1.5">✅ Honest recommendations</span>
            <span className="flex items-center gap-1.5">✅ Links to Amazon UK</span>
          </div>
        </div>
      </section>

      {/* Affiliate disclosure */}
      <div className="bg-gray-50 border-b border-gray-100 py-3">
        <p className="text-center text-xs text-gray-400 px-4">
          Vouchee is a participant in the Amazon EU Associates Programme. We may earn a small commission if you purchase through our links — at no extra cost to you. This never influences our recommendations.
        </p>
      </div>

      {/* Category grid */}
      <section className="container max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-3" style={{ fontFamily: 'Lora, serif' }}>
            Browse by category
          </h2>
          <p className="text-gray-500">Click a category to see our recommended products.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {CATEGORIES.map((cat) => {
            const c = colorClasses[cat.color]
            const content = (
              <div className={`group relative rounded-2xl border-2 bg-white p-6 transition-all duration-200 cursor-pointer ${c.card} ${cat.comingSoon ? 'opacity-60 cursor-default' : 'hover:shadow-md hover:-translate-y-0.5'}`}>
                {cat.comingSoon && (
                  <span className="absolute top-4 right-4 text-xs font-semibold text-gray-400 bg-gray-100 rounded-full px-2.5 py-1">
                    Coming soon
                  </span>
                )}
                <div className={`w-12 h-12 ${c.icon} rounded-xl flex items-center justify-center text-2xl mb-4`}>
                  {cat.emoji}
                </div>
                <h3 className={`font-bold text-gray-900 text-lg mb-2 transition-colors ${!cat.comingSoon ? c.hover : ''}`}>
                  {cat.name}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">
                  {cat.description}
                </p>
                {!cat.comingSoon && (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.badge}`}>
                    {cat.count} products →
                  </span>
                )}
              </div>
            )

            return cat.comingSoon ? (
              <div key={cat.id}>{content}</div>
            ) : (
              <a key={cat.id} href={`#${cat.id}`} className="no-underline">
                {content}
              </a>
            )
          })}
        </div>
      </section>

      {/* Product sections */}
      {CATEGORIES.filter(c => !c.comingSoon).map((cat) => {
        const products = PRODUCTS[cat.id] ?? []
        const c = colorClasses[cat.color]

        return (
          <section key={cat.id} id={cat.id} className="border-t border-gray-100 scroll-mt-20">
            <div className="container max-w-5xl mx-auto px-6 py-14">

              {/* Section header */}
              <div className="flex items-center gap-4 mb-10">
                <div className={`w-12 h-12 ${c.icon} rounded-xl flex items-center justify-center text-2xl flex-shrink-0`}>
                  {cat.emoji}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Lora, serif' }}>
                    {cat.name}
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">{cat.description}</p>
                </div>
              </div>

              {/* Product cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {products.map((product, i) => (
                  <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="font-bold text-gray-900 text-base leading-tight">
                        {product.name}
                      </h3>
                      {product.tag && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${c.badge}`}>
                          {product.tag}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed mb-3">
                      {product.description}
                    </p>
                    <div className="bg-gray-50 rounded-lg px-3 py-2 mb-4">
                      <p className="text-xs text-gray-500 leading-relaxed">
                        <span className="font-semibold text-gray-700">Why we recommend it: </span>
                        {product.why}
                      </p>
                    </div>
                    <a
                      href={`https://www.amazon.co.uk/s?k=${product.amazonSearch}&tag=vouchee-21`}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-amber-900 font-semibold text-sm px-4 py-2 rounded-lg transition-colors no-underline"
                    >
                      View on Amazon →
                    </a>
                  </div>
                ))}
              </div>

            </div>
          </section>
        )
      })}

      {/* Coming soon sections */}
      <section className="border-t border-gray-100 bg-gray-50 py-16">
        <div className="container max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-xl font-bold text-gray-700 mb-3" style={{ fontFamily: 'Lora, serif' }}>
            Specialist & Eco picks coming soon
          </h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            We're currently testing and reviewing products for our Specialist and Eco & Sensitive categories. Check back soon.
          </p>
        </div>
      </section>

      {/* Footer disclosure */}
      <section className="border-t border-gray-100 py-8">
        <div className="container max-w-3xl mx-auto px-6">
          <p className="text-xs text-gray-400 leading-relaxed text-center">
            As an Amazon Associate, Vouchee earns from qualifying purchases. Product prices and availability are accurate as of the date of last update and are subject to change. All prices shown on Amazon at the time of purchase will apply. Vouchee recommends only products that our cleaners genuinely use and endorse.
          </p>
        </div>
      </section>

    </main>
  )
}
