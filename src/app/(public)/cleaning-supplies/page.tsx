import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cleaning Supplies Recommended by Professionals | Vouchee',
  description: 'Hand-picked cleaning products recommended by Vouchee and our professional cleaners. From everyday essentials to specialist tools — everything you need for a spotless home.',
}

const BASE_IMG = 'https://m.media-amazon.com/images/I/'

const CATEGORIES = [
  {
    id: 'kitchen-bathroom',
    emoji: '🧴',
    name: 'Kitchen & Bathroom',
    description: 'Everything from limescale, mould, grease and restoring shine.',
    color: 'blue',
    count: 9,
  },
  {
    id: 'floors',
    emoji: '🧹',
    name: 'Floors',
    description: 'From hardwood to tile, these keep every floor looking their best.',
    color: 'green',
    count: 1,
  },
  {
    id: 'large-items',
    emoji: '🧳',
    name: 'Large Items & Equipment',
    description: 'Hoovers, steam mops, carpet cleaners — all the big tools for big jobs.',
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

interface Product {
  name: string
  description: string
  why: string
  tag?: string
  url: string
  img: string
}

const PRODUCTS: Record<string, Product[]> = {
  'kitchen-bathroom': [
    { name: 'Bar Keepers Friend', description: 'Powder cleanser that works on sinks, taps, ceramic hobs, and stubborn stains.', why: 'Our most-recommended product. Removes limescale and rust without scratching.', tag: 'Cleaner favourite', url: 'https://amzn.to/4e0ttq8', img: BASE_IMG + '71AHharn3CL.jpg' },
    { name: 'The Pink Stuff', description: 'All-purpose miracle paste for ovens, grout, pots, and almost everything else.', why: 'Incredible at cutting through baked-on grease with minimal effort.', tag: 'Viral for a reason', url: 'https://amzn.to/4sS1OfP', img: BASE_IMG + '71JVOV7dQvL.jpg' },
    { name: 'The Pink Stuff — Triple Pack', description: 'Three-pack of the miracle paste. Best value if you use it regularly.', why: 'Buying in bulk makes sense — this is one you will always reach for.', url: 'https://amzn.to/4bPdxWr', img: BASE_IMG + '619cOCMe5mL.jpg' },
    { name: 'HG Mould Spray', description: 'Professional-strength mould remover for bathrooms, grouting, and silicone.', why: 'Works where other sprays give up. Leave it on, rinse off — done.', tag: 'Professional grade', url: 'https://amzn.to/4m5Zz5U', img: BASE_IMG + '61Q+Wc6BJBL.jpg' },
    { name: 'Viakal Limescale Remover', description: 'The go-to for shower screens, taps, and showerheads.', why: "Nothing cuts through limescale faster. Essential in Horsham's hard water area.", tag: 'Hard water essential', url: 'https://amzn.to/3PPxeor', img: BASE_IMG + '71JScZyEm0L.jpg' },
    { name: 'Harpic Power Plus', description: 'Thick bleach formula that clings under the toilet rim.', why: "The shape of the bottle gets right under the rim where other products can't reach.", url: 'https://amzn.to/4c5oMJ0', img: BASE_IMG + '71dBu93xcaL.jpg' },
    { name: 'Flash Multi-Surface Spray', description: 'Everyday all-purpose cleaner for worktops, tiles, and kitchen surfaces.', why: 'Fast, effective, and the scent is clean without being overpowering.', url: 'https://amzn.to/3PPxxj5', img: BASE_IMG + '61cpzPfXQ6L.jpg' },
    { name: 'Elbow Grease Degreaser', description: 'Heavy-duty degreaser for kitchen cookers, extractor fans, and surfaces.', why: 'Cuts through cooking grease that washing-up liquid just smears around.', tag: 'Kitchen must-have', url: 'https://amzn.to/4dqQAtV', img: BASE_IMG + '61t0TIrCkzL.jpg' },
    { name: 'Cillit Bang Limescale Remover', description: 'Fast-acting spray for bathroom fixtures, taps, and shower trays.', why: 'Good for everyday maintenance when Viakal is overkill.', url: 'https://amzn.to/41GXZxY', img: BASE_IMG + '71lnEkoRyxL.jpg' },
  ],
  'floors': [
    { name: 'Flash Floor Cleaner', description: 'Multi-surface floor cleaner for tiles, laminate, vinyl, and hardwood.', why: 'Works across all floor types without leaving a streaky residue.', tag: 'All floor types', url: 'https://amzn.to/418zoSz', img: BASE_IMG + '810EtK37AFL.jpg' },
  ],
  'large-items': [
    { name: 'Henry Hoover', description: 'The iconic red cylinder hoover. Used by professional cleaners everywhere.', why: 'Robust, powerful, and reliable. The industry standard for a reason.', tag: 'Industry standard', url: 'https://amzn.to/4v8opX1', img: BASE_IMG + '51JoiICAzXL.jpg' },
    { name: 'Dyson V11 Cordless', description: 'Lightweight cordless hoover for stairs, upholstery, and quick cleans.', why: 'Powerful suction without the cable. Perfect for between sessions.', tag: 'Cordless freedom', url: 'https://amzn.to/4m8c7d9', img: BASE_IMG + '518ee1h7cfL.jpg' },
    { name: 'Shark Steam Mop', description: 'Chemical-free floor cleaning using high-temperature steam.', why: 'Sanitises hard floors without any product — great for allergy households.', url: 'https://amzn.to/3Oj9Pv6', img: BASE_IMG + '61VpOt4X1UL.jpg' },
    { name: 'Flat Mop and Bucket', description: "Flat mop with wringer bucket — the professional's choice for hard floors.", why: 'Microfibre flat mops cover more ground and pick up more dirt than string mops.', url: 'https://amzn.to/4m9sGp3', img: BASE_IMG + '81pyye40tnL.jpg' },
    { name: 'Vax Platinum Carpet Cleaner', description: 'Upright carpet washer for deep cleaning carpets and rugs.', why: 'Transforms tired-looking carpets. Ideal for end of tenancy cleans.', tag: 'End of tenancy', url: 'https://amzn.to/3Okz00i', img: BASE_IMG + '71IsZdvhKPL.jpg' },
    { name: 'Cleaner Travel Bag', description: 'Multi-compartment tote bag for carrying cleaning supplies between jobs.', why: 'Keeps products organised and prevents leaks in transit.', url: 'https://amzn.to/4si13vt', img: BASE_IMG + '81R1FtooOxL.jpg' },
    { name: 'Microfibre Flat Mop', description: 'Professional-grade flat mop with washable microfibre pads.', why: 'Reusable pads save money long-term and are more hygienic than disposable alternatives.', url: 'https://amzn.to/418zoSz', img: BASE_IMG + '810EtK37AFL.jpg' },
  ],
  'tools': [
    { name: 'Scrub Daddy Sponge — 3 Pack', description: 'Scratch-free sponge that changes texture with water temperature.', why: 'Firm in cold water for scrubbing, soft in warm for wiping. Genuinely clever.', tag: 'Worth the hype', url: 'https://amzn.to/4mewkOy', img: BASE_IMG + '71AgZsmCo0L.jpg' },
    { name: 'Microfibre Cloths — 24 Pack', description: 'The everyday workhorse of professional cleaning.', why: "Lint-free, streak-free, reusable. Buy in bulk — you'll always need more.", tag: 'Stock up', url: 'https://amzn.to/4mbf2Sg', img: BASE_IMG + '81yNkLEBVsL.jpg' },
    { name: 'Elbow Grease Rubber Gloves', description: 'Thick, durable gloves that protect hands during heavy cleaning sessions.', why: 'Standard kitchen gloves tear too easily. These last far longer.', url: 'https://amzn.to/4m9qNIL', img: BASE_IMG + '81TWpbEP1zL.jpg' },
    { name: 'Electric Spin Scrubber', description: 'Cordless electric scrubber with interchangeable heads for grout, tiles, and baths.', why: 'Saves serious elbow grease on grout lines and around taps.', tag: 'Game changer', url: 'https://amzn.to/41exhwx', img: BASE_IMG + '81p5vCyFJvL.jpg' },
    { name: 'Grout Brush', description: 'Narrow angled brush for getting into grout lines between tiles.', why: 'Narrow enough to fit into tight grout lines. The manual alternative to an electric scrubber.', url: 'https://amzn.to/4sKS86J', img: BASE_IMG + '61iD9mj9l7L.jpg' },
    { name: 'Pet Hair Scraper', description: 'Rubber-headed tool that lifts pet hair from carpets and upholstery.', why: 'Picks up pet hair that a hoover leaves behind. Essential for any house with animals.', tag: 'Pet hair essential', url: 'https://amzn.to/4bPXrf7', img: BASE_IMG + '71T9eWlsiaL.jpg' },
    { name: 'Glass & Razor Scraper', description: 'Stainless steel scraper for removing paint, sticker residue, and dried-on marks.', why: 'Removes things that no spray will touch. Keep one for end of tenancy jobs.', url: 'https://amzn.to/4bYT3ux', img: BASE_IMG + '7138TSQr+ML.jpg' },
    { name: 'Extendable Duster', description: 'Long-handled microfibre duster for ceiling fans, light fittings, and high shelves.', why: 'Gets into spots that are impossible to reach with a cloth.', url: 'https://amzn.to/4dnK1Ix', img: BASE_IMG + '616OoA4nOOL.jpg' },
    { name: 'Cleaning Caddy Bag', description: 'Portable cleaning caddy for carrying sprays and tools room to room.', why: "Keeps everything to hand so you're not running back and forth.", url: 'https://amzn.to/4si13vt', img: BASE_IMG + '81R1FtooOxL.jpg' },
  ],
}

const STARTER_KIT_URL =
  'https://www.amazon.co.uk/gp/aws/cart/add.html?' +
  'ASIN.1=B000QYLEBE&Quantity.1=1&' +
  'ASIN.2=B00DU5SRIY&Quantity.2=1&' +
  'ASIN.3=B000IU40HQ&Quantity.3=1&' +
  'ASIN.4=B0FVGGGR52&Quantity.4=1&' +
  'ASIN.5=B085F1YNM8&Quantity.5=1&' +
  'ASIN.6=B00PHH3HVK&Quantity.6=1&' +
  'ASIN.7=B010N0N7PQ&Quantity.7=1&' +
  'ASIN.8=B08HZ6TNWJ&Quantity.8=1&' +
  'ASIN.9=B0FCF12NXG&Quantity.9=1&' +
  'tag=vouchee-21'

const colorClasses: Record<string, {
  card: string
  icon: string
  badge: string
  hover: string
  imgHue: string
  imgHover: string
}> = {
  blue:   { card: 'border-blue-100 hover:border-blue-300 hover:shadow-blue-100',     icon: 'bg-blue-100',   badge: 'bg-blue-100 text-blue-700',   hover: 'group-hover:text-blue-600',   imgHue: 'bg-blue-50/40',   imgHover: 'group-hover:bg-blue-50/70' },
  green:  { card: 'border-green-100 hover:border-green-300 hover:shadow-green-100',   icon: 'bg-green-100',  badge: 'bg-green-100 text-green-700',  hover: 'group-hover:text-green-600',  imgHue: 'bg-green-50/40',  imgHover: 'group-hover:bg-green-50/70' },
  purple: { card: 'border-purple-100 hover:border-purple-300 hover:shadow-purple-100', icon: 'bg-purple-100', badge: 'bg-purple-100 text-purple-700', hover: 'group-hover:text-purple-600', imgHue: 'bg-purple-50/40', imgHover: 'group-hover:bg-purple-50/70' },
  amber:  { card: 'border-amber-100 hover:border-amber-300 hover:shadow-amber-100',   icon: 'bg-amber-100',  badge: 'bg-amber-100 text-amber-700',  hover: 'group-hover:text-amber-600',  imgHue: 'bg-amber-50/40',  imgHover: 'group-hover:bg-amber-50/70' },
  red:    { card: 'border-red-100 hover:border-red-200 hover:shadow-red-50',           icon: 'bg-red-100',    badge: 'bg-red-100 text-red-700',      hover: 'group-hover:text-red-600',    imgHue: 'bg-red-50/30',    imgHover: 'group-hover:bg-red-50/50' },
  teal:   { card: 'border-teal-100 hover:border-teal-300 hover:shadow-teal-100',       icon: 'bg-teal-100',   badge: 'bg-teal-100 text-teal-700',    hover: 'group-hover:text-teal-600',   imgHue: 'bg-teal-50/40',   imgHover: 'group-hover:bg-teal-50/70' },
}

export default function CleaningSuppliesPage() {
  return (
    <main className="min-h-screen bg-white">

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-green-50 border-b border-gray-100 py-16">
        <div className="container max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3 leading-tight">
            Cleaning products that actually work
          </h1>
          <p className="text-lg text-gray-500 mb-8">Recommended by professionals</p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1.5">✅ Cleaner-tested</span>
            <span className="flex items-center gap-1.5">✅ Honest recommendations</span>
            <span className="flex items-center gap-1.5">✅ Available on Amazon UK</span>
          </div>
        </div>
      </section>

      {/* Affiliate disclosure */}
      <div className="bg-gray-50 border-b border-gray-100 py-3">
        <p className="text-center text-xs text-gray-400 px-4">
          Vouchee is a participant in the Amazon EU Associates Programme. We may earn a small commission if you purchase through our links — at no extra cost to you. This never influences our recommendations.
        </p>
      </div>

      {/* Starter Kit Banner */}
      <section className="container max-w-5xl mx-auto px-6 py-10">
        <div className="bg-gradient-to-r from-blue-600 to-green-500 rounded-2xl p-8 text-white flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1">
            <div className="text-xs font-bold uppercase tracking-wider opacity-80 mb-2">⭐ Starter Kit Bundle</div>
            <h2 className="text-2xl font-bold mb-2">
              Everything you need to get started
            </h2>
            <p className="text-blue-100 text-sm leading-relaxed">
              Bar Keepers Friend, The Pink Stuff, HG Mould Spray, Viakal, Elbow Grease, Scrub Daddy, microfibre cloths, rubber gloves, and a microfibre mop — added to your Amazon basket in one click.
            </p>
          </div>
          <div className="flex-shrink-0">
            <a
              href={STARTER_KIT_URL}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="inline-flex items-center gap-2 bg-amber-400 hover:bg-amber-500 text-amber-900 font-bold px-6 py-3 rounded-xl transition-colors text-sm no-underline shadow-lg"
            >
              🛒 Add starter kit to basket →
            </a>
            <p className="text-xs text-blue-100 mt-2 text-center">9 products · One click</p>
          </div>
        </div>
      </section>

      {/* Category grid */}
      <section className="container max-w-5xl mx-auto px-6 pb-12">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-gray-900">Browse by category</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {CATEGORIES.map((cat) => {
            const c = colorClasses[cat.color]
            const content = (
              <div className={`group relative rounded-2xl border-2 bg-white p-6 transition-all duration-200 ${c.card} ${cat.comingSoon ? 'opacity-60 cursor-default' : 'hover:shadow-md hover:-translate-y-0.5 cursor-pointer'}`}>
                {cat.comingSoon && (
                  <span className="absolute top-4 right-4 text-xs font-semibold text-gray-400 bg-gray-100 rounded-full px-2.5 py-1">Coming soon</span>
                )}
                <div className={`w-12 h-12 ${c.icon} rounded-xl flex items-center justify-center text-2xl mb-4`}>{cat.emoji}</div>
                <h3 className={`font-bold text-gray-900 text-lg mb-2 transition-colors ${!cat.comingSoon ? c.hover : ''}`}>{cat.name}</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-4">{cat.description}</p>
                {!cat.comingSoon && (
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.badge}`}>{cat.count} products →</span>
                )}
              </div>
            )
            return cat.comingSoon ? (
              <div key={cat.id}>{content}</div>
            ) : (
              <a key={cat.id} href={`#${cat.id}`} className="no-underline">{content}</a>
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
              <div className="flex items-center gap-4 mb-10">
                <div className={`w-12 h-12 ${c.icon} rounded-xl flex items-center justify-center text-2xl flex-shrink-0`}>{cat.emoji}</div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{cat.name}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{cat.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {products.map((product, i) => (
                  <div
                    key={i}
                    className={`group rounded-xl border-2 bg-white overflow-hidden hover:shadow-lg transition-all duration-200 flex flex-col ${c.card}`}
                  >
                    <a
                      href={product.url}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      className={`block p-4 flex items-center justify-center h-48 transition-colors duration-200 ${c.imgHue} ${c.imgHover}`}
                    >
                      <img
                        src={product.img}
                        alt={product.name}
                        className="max-h-40 max-w-full object-contain"
                        loading="lazy"
                      />
                    </a>

                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h3 className={`font-bold text-gray-900 text-sm leading-tight transition-colors ${c.hover}`}>{product.name}</h3>
                        {product.tag && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${c.badge}`}>{product.tag}</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed mb-3">{product.description}</p>
                      <div className="bg-gray-50 rounded-lg px-3 py-2 mb-4 flex-1">
                        <p className="text-xs text-gray-500 leading-relaxed">
                          <span className="font-semibold text-gray-700">Why we recommend it: </span>
                          {product.why}
                        </p>
                      </div>
                      <a
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer sponsored"
                        className="inline-flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-500 text-amber-900 font-semibold text-sm px-4 py-2.5 rounded-lg transition-colors no-underline w-full"
                      >
                        Available on Amazon →
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )
      })}

      {/* Coming soon */}
      <section className="border-t border-gray-100 bg-gray-50 py-16">
        <div className="container max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-xl font-bold text-gray-700 mb-3">Specialist & Eco picks coming soon</h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto">We're currently testing and reviewing products for our Specialist and Eco & Sensitive categories. Check back soon.</p>
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
