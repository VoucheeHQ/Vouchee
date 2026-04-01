import Link from 'next/link'

// ── Reusable content components ───────────────────────────────

function Callout({ emoji, children }: { emoji: string; children: React.ReactNode }) {
  return (
    <div className="not-prose bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 my-6 flex gap-3">
      <span className="text-xl flex-shrink-0 mt-0.5">{emoji}</span>
      <div className="text-sm text-blue-800 leading-relaxed">{children}</div>
    </div>
  )
}

function ProductLink({ name, href }: { name: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 text-amber-800 font-semibold text-sm px-3 py-1 rounded-lg no-underline hover:bg-amber-100 transition-colors"
    >
      {name} → Amazon
    </a>
  )
}

function InlineImage({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  return (
    <figure className="not-prose my-8">
      <img src={src} alt={alt} className="w-full rounded-xl shadow-sm object-cover max-h-80" />
      {caption && <figcaption className="text-center text-xs text-gray-400 mt-2">{caption}</figcaption>}
    </figure>
  )
}

// ── Article content switcher ───────────────────────────────────

export function ArticleContent({ slug }: { slug: string }) {
  switch (slug) {
    case 'essential-cleaning-kit-new-home':
      return <EssentialCleaningKit />
    case 'how-to-find-a-cleaner-horsham':
      return <HowToFindACleaner />
    case 'deep-clean-vs-regular-clean':
      return <DeepCleanVsRegular />
    case 'what-to-expect-from-your-first-professional-clean':
      return <WhatToExpect />
    case 'cleaning-products-professionals-use':
      return <CleaningProductsProfessionals />
    case 'how-to-go-self-employed-as-a-cleaner-uk':
      return <SelfEmployedCleaner />
    case 'dbs-checks-explained-what-cleaners-need-to-know':
      return <DBSChecksExplained />
    case 'how-to-build-a-cleaning-round-horsham':
      return <BuildACleaningRound />
    default:
      return <p>Article content coming soon.</p>
  }
}

// ── 1. Essential cleaning kit for a new home ──────────────────

function EssentialCleaningKit() {
  return (
    <>
      <p>Moving into a new home is one of those rare moments where you get to start completely fresh. The previous occupants are gone, the place is empty, and — if you're lucky — it's been given a decent clean before you arrived. But even the best end-of-tenancy clean leaves something behind, and building your own kit from scratch is something most people only do once or twice in their lives.</p>
      <p>Here's what to actually buy, what order to buy it in, and why.</p>

      <h2>Start with the surfaces</h2>
      <p>The most-used surfaces in any home are worktops, sinks, and bathrooms. These need products that can handle everyday grime but are safe to use repeatedly without damaging surfaces.</p>
      <p>For kitchen and bathroom surfaces, <strong>Flash Multi-Surface Spray</strong> is the everyday workhorse — it handles most situations without needing anything more specialist. Pair it with a pack of good quality microfibre cloths (get more than you think you need — 12 is not excessive) and you have the foundation of any cleaning kit.</p>

      <InlineImage
        src="https://images.unsplash.com/photo-1585421514738-01798e348b17?w=800&q=80"
        alt="Cleaning products laid out on a kitchen counter ready for unpacking"
        caption="Getting organised from day one makes maintaining a clean home much easier."
      />

      <h2>The products that do the heavy lifting</h2>
      <p>Once the basics are covered, there are a handful of products that professional cleaners reach for when the standard spray isn't enough.</p>

      <ul>
        <li><strong>Bar Keepers Friend</strong> — a powder cleanser that removes limescale, rust stains, and tarnish from sinks, ceramic hobs, and stainless steel. One of the most versatile products available.</li>
        <li><strong>The Pink Stuff</strong> — a paste that works on ovens, grout, pots and pans, and almost anything else with baked-on residue. Sounds gimmicky but is genuinely effective.</li>
        <li><strong>Viakal</strong> — if you're in a hard water area (Horsham included), limescale will become your main enemy. Viakal is the best product for shower screens, taps, and showerheads.</li>
        <li><strong>HG Mould Spray</strong> — bathroom mould is almost inevitable over time. HG is professional-grade and removes it completely rather than just bleaching it temporarily.</li>
      </ul>

      <div className="not-prose flex flex-wrap gap-2 my-6">
        <ProductLink name="Bar Keepers Friend" href="https://www.amazon.co.uk/s?k=Bar+Keepers+Friend+Powder&tag=YOURTAG-21" />
        <ProductLink name="The Pink Stuff" href="https://www.amazon.co.uk/s?k=The+Pink+Stuff+Miracle+Paste&tag=YOURTAG-21" />
        <ProductLink name="Viakal" href="https://www.amazon.co.uk/s?k=Viakal+Limescale+Remover&tag=YOURTAG-21" />
        <ProductLink name="HG Mould Spray" href="https://www.amazon.co.uk/s?k=HG+Mould+Spray&tag=YOURTAG-21" />
      </div>

      <h2>Floors</h2>
      <p>For hard floors, <strong>Flash Floor Cleaner</strong> works across tiles, laminate, and vinyl without leaving residue. If you have carpets, a good hoover is the most important investment you'll make — the <strong>Henry Hoover</strong> remains the benchmark for reliability and value.</p>

      <InlineImage
        src="https://images.unsplash.com/photo-1563453392212-326f5e854473?w=800&q=80"
        alt="Clean kitchen floors after moving in"
        caption="Hard floors show everything — the right cleaner makes maintenance much faster."
      />

      <h2>Tools that make the difference</h2>
      <p>Products are only half the story. The right tools mean you actually use them correctly.</p>
      <ul>
        <li><strong>Scrub Daddy sponge</strong> — changes texture with water temperature and doesn't scratch surfaces the way standard scourers do.</li>
        <li><strong>Extendable duster</strong> — ceiling corners, light fittings, and high shelves collect dust quickly. An extendable duster means you don't need a stepladder for weekly maintenance.</li>
        <li><strong>Rubber gloves</strong> — standard kitchen gloves tear too quickly. Buy professional-grade ones and your hands will thank you.</li>
      </ul>

      <Callout emoji="🏠">
        If you'd rather hand the first deep clean to a professional, <Link href="/request/property" className="font-semibold underline">post a request on Vouchee</Link> and find a vetted local cleaner in Horsham who can get the place properly clean before you unpack.
      </Callout>

      <h2>The full shopping list</h2>
      <p>To summarise, here's everything you need for a complete first-home cleaning kit, roughly in order of priority:</p>
      <ol>
        <li>Microfibre cloths (pack of 12+)</li>
        <li>Flash Multi-Surface Spray</li>
        <li>Bar Keepers Friend powder</li>
        <li>Viakal Limescale Remover</li>
        <li>The Pink Stuff paste</li>
        <li>HG Mould Spray</li>
        <li>Flash Floor Cleaner</li>
        <li>Scrub Daddy sponges</li>
        <li>Rubber gloves (professional-grade)</li>
        <li>Henry Hoover or equivalent</li>
        <li>Extendable duster</li>
        <li>Cleaning caddy to keep it all organised</li>
      </ol>
      <p>You can find our full recommendations with links on the <Link href="/cleaning-supplies" className="font-semibold text-blue-600">Vouchee Cleaning Supplies page</Link>.</p>
    </>
  )
}

// ── 2. How to find a cleaner in Horsham ───────────────────────

function HowToFindACleaner() {
  return (
    <>
      <p>Finding a reliable cleaner used to mean asking neighbours for a recommendation, posting in a local Facebook group, or taking a chance on someone you knew nothing about. The result was often inconsistent — a great cleaner for six months, then they disappear, and you're back to square one.</p>
      <p>Here's how to find a cleaner in Horsham who's reliable, vetted, and right for your home.</p>

      <h2>Know what you actually need first</h2>
      <p>Before you start looking, it's worth being clear on what you want. The main question is whether you need a <strong>regular cleaner</strong> (weekly or fortnightly) or a <strong>one-off clean</strong> (end of tenancy, post-renovation, or a seasonal deep clean).</p>
      <p>Regular cleaning relationships are the most valuable — once you find someone good, life genuinely gets easier. One-off cleans are more transactional and the bar for finding someone is slightly lower.</p>

      <InlineImage
        src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80"
        alt="A bright and spotlessly clean Horsham home living room"
        caption="A good cleaner makes a real, visible difference to how your home feels day to day."
      />

      <h2>What to look for in a cleaner</h2>
      <p>A professional domestic cleaner operating in your home should be able to demonstrate three things:</p>
      <ul>
        <li><strong>A valid DBS certificate</strong> — a Disclosure and Barring Service check confirms that the cleaner has no relevant criminal record. Standard checks are the minimum; enhanced checks are available for households with vulnerable adults or children.</li>
        <li><strong>Public liability insurance</strong> — this covers damage to your property or belongings during a clean. The minimum you should accept is £1,000,000 of coverage.</li>
        <li><strong>Right to work in the UK</strong> — any cleaner working legally in the UK should be able to confirm this.</li>
      </ul>

      <Callout emoji="✅">
        All cleaners on Vouchee have been DBS checked, hold public liability insurance of at least £1,000,000, and have confirmed their right to work in the UK before being approved. We monitor these accreditations continuously.
      </Callout>

      <h2>Questions to ask before you book</h2>
      <p>Even once you've found a cleaner who looks good on paper, a short conversation before your first session makes a big difference. Good questions to ask:</p>
      <ul>
        <li>Do you bring your own supplies, or do you prefer to use the household's products?</li>
        <li>What areas do you typically cover in a standard session?</li>
        <li>How do you handle fragile items or surfaces that need special care?</li>
        <li>What's your policy if you need to cancel at short notice?</li>
      </ul>

      <InlineImage
        src="https://images.unsplash.com/photo-1527515637462-cff94aca55f6?w=800&q=80"
        alt="Professional cleaner discussing requirements with a homeowner"
        caption="A brief chat before the first session sets expectations and leads to better results."
      />

      <h2>How Vouchee works</h2>
      <p>Vouchee is a marketplace specifically built for Horsham homeowners. You post a cleaning request with your property details, the tasks you need covering, your preferred days, and the hourly rate you're happy to pay. Vetted local cleaners then apply, and you choose the one that feels right — based on their profile, reviews from other Vouchee customers, and their application message.</p>
      <p>Your full address is never shared until you've accepted an application. You're always in control of who comes into your home.</p>

      <Callout emoji="🏠">
        Ready to find a cleaner in Horsham? <Link href="/request/property" className="font-semibold underline">Post your first request on Vouchee</Link> — it takes about 3 minutes and the first applications often arrive the same day.
      </Callout>
    </>
  )
}

// ── 3. Deep clean vs regular clean ────────────────────────────

function DeepCleanVsRegular() {
  return (
    <>
      <p>If you've never had a professional cleaner before, the terminology can be confusing. "Deep clean" and "regular clean" sound self-explanatory, but in practice they're quite different services — different time, different cost, and suited to different situations.</p>

      <h2>What is a regular clean?</h2>
      <p>A regular clean is a recurring maintenance service, usually weekly or fortnightly. The cleaner keeps your home at a consistent standard — hoovering, mopping, wiping surfaces, cleaning bathrooms and kitchens, and generally maintaining what's already there.</p>
      <p>A typical regular clean for a 3-bedroom home takes 2–3 hours. It works best when done consistently — the longer between cleans, the more time each one takes.</p>

      <InlineImage
        src="https://images.unsplash.com/photo-1563453392212-326f5e854473?w=800&q=80"
        alt="Clean and tidy kitchen maintained by a regular cleaner"
        caption="Regular cleaning keeps your home consistently presentable without the big one-off effort."
      />

      <h2>What is a deep clean?</h2>
      <p>A deep clean is a much more intensive, one-off service. It covers everything a regular clean does but goes significantly further — inside cupboards and appliances, behind furniture, grout lines, limescale buildup, skirting boards, window frames, and anything else that accumulates over months rather than weeks.</p>
      <p>Deep cleans typically take 4–8 hours depending on property size and condition. They're priced accordingly.</p>

      <h2>When do you need a deep clean?</h2>
      <ul>
        <li><strong>Moving into a new property</strong> — even a well-maintained home benefits from a proper clean before you settle in.</li>
        <li><strong>End of tenancy</strong> — most tenancy agreements require the property to be returned in the condition it was let.</li>
        <li><strong>After renovation or building work</strong> — construction dust gets everywhere and requires specialist attention.</li>
        <li><strong>Before starting a regular cleaning service</strong> — many cleaners prefer to start from a clean baseline.</li>
        <li><strong>Seasonal</strong> — some households do a deep clean once or twice a year regardless.</li>
      </ul>

      <InlineImage
        src="https://images.unsplash.com/photo-1585421514738-01798e348b17?w=800&q=80"
        alt="Cleaning products used during a professional deep clean"
        caption="A deep clean uses more specialist products and takes significantly longer than a standard session."
      />

      <h2>Which one should you book?</h2>
      <p>If your home is in reasonable condition and you want to start a regular cleaning routine, a regular clean from a good cleaner is usually sufficient. If the property hasn't had a thorough clean in a while — or you've just moved in — a one-off deep clean first makes the ongoing maintenance much easier.</p>

      <Callout emoji="💡">
        Not sure what you need? When you <Link href="/request/property" className="font-semibold underline">post a request on Vouchee</Link>, you can describe your situation and cleaners will advise on what they'd recommend before you commit to anything.
      </Callout>
    </>
  )
}

// ── 4. What to expect from your first professional clean ──────

function WhatToExpect() {
  return (
    <>
      <p>Booking your first professional cleaner is one of those things that sounds simple but comes with a surprising amount of low-level anxiety. Who is this person coming into my home? What will they actually do? How do I know if it went well?</p>
      <p>Here's what a good first session looks like — and how to set it up for success.</p>

      <h2>Before the session: preparation matters</h2>
      <p>A cleaner isn't a tidier. Their job is to clean surfaces, floors, and fixtures — not to move your belongings around in order to do it. The more decluttered the space is before they arrive, the more actual cleaning gets done in the time you're paying for.</p>
      <p>You don't need to do a deep tidy — just a quick pass to clear surfaces, put dishes away, and move anything you don't want disturbed. 10 minutes of prep significantly improves the outcome.</p>

      <InlineImage
        src="https://images.unsplash.com/photo-1527515637462-cff94aca55f6?w=800&q=80"
        alt="Homeowner welcoming a professional cleaner at the door"
        caption="A quick conversation before the first session helps the cleaner understand your priorities."
      />

      <h2>What a standard session covers</h2>
      <p>A typical 2–3 hour regular clean in a 3-bedroom home will usually cover:</p>
      <ul>
        <li>Hoovering all carpeted areas and hard floors</li>
        <li>Mopping hard floors</li>
        <li>Wiping kitchen surfaces, hob, and sink</li>
        <li>Cleaning bathrooms — toilet, sink, bath/shower, and surfaces</li>
        <li>Dusting accessible surfaces and skirting boards</li>
        <li>Emptying bins</li>
      </ul>
      <p>It won't typically include inside ovens, inside fridges, inside cupboards, or windows — those are either specialist add-ons or deep clean tasks.</p>

      <h2>Tell them about the things that matter to you</h2>
      <p>Every home is different. If you have a fragile ornament, a surface that marks easily, a pet that must not go upstairs, or a strong preference for eco-friendly products — say so before the first session, not after.</p>
      <p>Professional cleaners are used to working around individual preferences. They'd much rather know in advance than find out by accident.</p>

      <InlineImage
        src="https://images.unsplash.com/photo-1563453392212-326f5e854473?w=800&q=80"
        alt="Spotless kitchen after a professional cleaning session"
        caption="After a good first session, your home should feel noticeably cleaner than when the cleaner arrived."
      />

      <h2>After the first session</h2>
      <p>The first session is always slightly longer than subsequent ones — the cleaner is getting to know the property. Over time, they become faster and more efficient because they know where everything is and what needs the most attention.</p>
      <p>If something wasn't done to your standard, say something politely and directly. Good cleaners want to know — it's how they get better, and it's much better for the relationship than quietly being dissatisfied.</p>

      <Callout emoji="⭐">
        On Vouchee, you can leave a review after each session. This helps other customers find great cleaners — and it helps cleaners build the reputation that earns them better opportunities on the platform.
      </Callout>
    </>
  )
}

// ── 5. Cleaning products professionals use ────────────────────

function CleaningProductsProfessionals() {
  return (
    <>
      <p>Walk into any professional cleaner's kit bag and you won't find the same products that fill the cleaning aisle at the supermarket. Over time, cleaners learn which products actually work and which ones are mostly marketing — and the two lists don't overlap as much as you'd hope.</p>
      <p>Here are the products Vouchee's vetted cleaners reach for most often, and why.</p>

      <h2>Bar Keepers Friend — the Swiss army knife</h2>
      <p>If there's one product that appears in every professional cleaner's bag, it's Bar Keepers Friend. The powder formulation cuts through limescale, rust stains, and mineral deposits on sinks, ceramic hobs, stainless steel, and porcelain — without scratching.</p>
      <p>It's the kind of product that makes stubborn stains look easy. Apply with a damp cloth, work it in, rinse off.</p>

      <div className="not-prose my-4">
        <ProductLink name="Bar Keepers Friend" href="https://www.amazon.co.uk/s?k=Bar+Keepers+Friend+Powder&tag=YOURTAG-21" />
      </div>

      <InlineImage
        src="https://images.unsplash.com/photo-1596265371388-43b3e4e42ac5?w=800&q=80"
        alt="Professional cleaning products on a shelf"
        caption="The products professionals use are rarely the ones with the biggest supermarket displays."
      />

      <h2>HG Mould Spray — the one that actually works</h2>
      <p>Standard bleach-based bathroom sprays bleach mould temporarily — they don't remove it. HG Mould Spray penetrates the mould at the root and removes it properly. Leave it on for a few minutes, wipe off, and the mould is genuinely gone rather than lightened.</p>
      <p>For grout lines and silicone around baths and showers, it's the best product available at any price point.</p>

      <div className="not-prose my-4">
        <ProductLink name="HG Mould Spray" href="https://www.amazon.co.uk/s?k=HG+Mould+Spray+Remover&tag=YOURTAG-21" />
      </div>

      <h2>Elbow Grease — kitchen degreasing</h2>
      <p>Kitchen grease is different from bathroom grime — it's sticky and layered, and washing-up liquid mostly smears it around. Elbow Grease is a concentrated degreaser that cuts through cooking residue on hobs, extractor fans, oven doors, and behind appliances.</p>
      <p>Spray, leave for 30 seconds, wipe. The difference is immediate.</p>

      <div className="not-prose my-4">
        <ProductLink name="Elbow Grease Degreaser" href="https://www.amazon.co.uk/s?k=Elbow+Grease+Degreaser+Spray&tag=YOURTAG-21" />
      </div>

      <h2>Viakal — limescale in hard water areas</h2>
      <p>Horsham is a hard water area, which means limescale builds up quickly on taps, showerheads, and glass shower screens. Standard cleaners slow it down; Viakal removes it. A single spray and wipe restores fixtures to looking new.</p>

      <div className="not-prose my-4">
        <ProductLink name="Viakal" href="https://www.amazon.co.uk/s?k=Viakal+Limescale+Remover+Spray&tag=YOURTAG-21" />
      </div>

      <InlineImage
        src="https://images.unsplash.com/photo-1585421514738-01798e348b17?w=800&q=80"
        alt="Cleaning products used by professional cleaners"
        caption="The right products make a genuine difference to both the quality and the speed of a clean."
      />

      <h2>The Scrub Daddy — for surfaces you can't scratch</h2>
      <p>The viral-looking sponge with the face actually does something clever: it's firm in cold water for scrubbing, and soft in warm water for gentle wiping. This means you can use it on surfaces where a standard scourer would leave scratches — glass hob surfaces, stainless steel sinks, ceramic tiles.</p>

      <div className="not-prose my-4">
        <ProductLink name="Scrub Daddy" href="https://www.amazon.co.uk/s?k=Scrub+Daddy+Sponge&tag=YOURTAG-21" />
      </div>

      <Callout emoji="🧹">
        See the full list of products Vouchee recommends — including large equipment, tools, and floor cleaners — on our <Link href="/cleaning-supplies" className="font-semibold underline">Cleaning Supplies page</Link>.
      </Callout>
    </>
  )
}

// ── 6. How to go self-employed as a cleaner ───────────────────

function SelfEmployedCleaner() {
  return (
    <>
      <p>Going self-employed as a cleaner is one of the most straightforward ways to run your own business in the UK. The startup costs are low, the demand is consistent, and you're genuinely in control of your hours, your clients, and your income. But "straightforward" doesn't mean there's nothing to know — and getting the admin right from day one saves a lot of headaches later.</p>

      <h2>Step 1: Register as self-employed with HMRC</h2>
      <p>The first thing to do is register as self-employed with HMRC. You must do this <strong>by 5 October in your second tax year</strong> of trading — but doing it immediately is far better practice. If you earn more than £1,000 from self-employment in a tax year, you're legally required to register.</p>
      <p>You can register online at <a href="https://www.gov.uk/set-up-sole-trader" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">gov.uk/set-up-sole-trader</a>. It takes about 20 minutes and you'll receive your Unique Taxpayer Reference (UTR) number by post within 10 working days.</p>

      <InlineImage
        src="https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&q=80"
        alt="Self-employed cleaner reviewing paperwork at home"
        caption="Getting the paperwork right from the start is much easier than catching up later."
      />

      <h2>Step 2: Understand your tax obligations</h2>
      <p>As a self-employed sole trader, you pay tax through the Self Assessment system. Each year you submit a tax return covering the previous tax year (April to April) and pay:</p>
      <ul>
        <li><strong>Income Tax</strong> — on profits above the personal allowance (currently £12,570)</li>
        <li><strong>Class 2 National Insurance</strong> — a flat weekly rate if your profits are above the Small Profits Threshold</li>
        <li><strong>Class 4 National Insurance</strong> — a percentage of profits above a set threshold</li>
      </ul>
      <p>The simplest way to manage this is to put aside 20–25% of everything you earn. Keep that in a separate savings account and you'll never be caught short when the tax bill arrives.</p>

      <Callout emoji="📊">
        HMRC's free guidance at <a href="https://www.gov.uk/self-employed-national-insurance-rates" target="_blank" rel="noopener noreferrer" className="font-semibold underline">gov.uk</a> explains current rates in plain English. If your income grows significantly, speaking to an accountant for one session is money well spent.
      </Callout>

      <h2>Step 3: Get your credentials in order</h2>
      <p>To work professionally in customers' homes, you need three things:</p>
      <ul>
        <li><strong>DBS certificate</strong> — a standard check costs £18 and can be obtained through the DBS update service or via a registered umbrella body. See our <Link href="/blog/dbs-checks-explained-what-cleaners-need-to-know" className="text-blue-600 underline">guide to DBS checks</Link> for the full process.</li>
        <li><strong>Public liability insurance</strong> — this covers damage to clients' property while you're working. Cover starts from around £60–£80 a year for £1,000,000 of coverage. Providers like Protectivity and Simply Business offer policies specifically for domestic cleaners.</li>
        <li><strong>Right to work documentation</strong> — a passport or biometric residence permit confirming you're legally entitled to work in the UK.</li>
      </ul>

      <h2>Step 4: Set your rates</h2>
      <p>Domestic cleaning in the Horsham area typically ranges from £14–£18 per hour for self-employed cleaners. Setting your rate too low undervalues your work and attracts clients who'll push for more for less. Setting it at a fair market rate and delivering excellent work is a much better long-term strategy.</p>
      <p>Factor in travel time, the cost of your own supplies if you provide them, and any equipment costs when deciding what to charge.</p>

      <InlineImage
        src="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800&q=80"
        alt="Self-employed cleaner planning their schedule"
        caption="Building a consistent, well-priced client base is the foundation of a sustainable cleaning business."
      />

      <h2>Step 5: Find your first clients</h2>
      <p>Word of mouth is powerful but slow to get started. Platforms like Vouchee connect you with homeowners in Horsham who are actively looking for vetted cleaners — shortcutting the months it can take to build a client base through referrals alone.</p>

      <Callout emoji="🧹">
        If you're ready to start finding clients in Horsham, <Link href="/cleaner" className="font-semibold underline">apply to join Vouchee</Link>. We handle the matching — you focus on the cleaning.
      </Callout>
    </>
  )
}

// ── 7. DBS checks explained ───────────────────────────────────

function DBSChecksExplained() {
  return (
    <>
      <p>A DBS check is one of the first things a client or platform will ask a domestic cleaner to provide. It's straightforward to obtain, doesn't take long, and makes an immediate difference to how trustworthy you appear to potential clients — but there's more to it than most guides explain.</p>

      <h2>What is a DBS check?</h2>
      <p>DBS stands for Disclosure and Barring Service — the government body that issues criminal records checks in England and Wales. A DBS check lets clients see whether you have any relevant criminal history before allowing you into their home.</p>
      <p>There are three types of DBS check. For domestic cleaning, a <strong>standard check</strong> is the usual requirement. It shows spent and unspent convictions, cautions, reprimands, and final warnings.</p>

      <InlineImage
        src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80"
        alt="DBS certificate and official documents on a desk"
        caption="A DBS certificate is one of the most important documents in a professional cleaner's portfolio."
      />

      <h2>How to get a DBS check</h2>
      <p>You can't apply for a DBS check directly as an individual for employment purposes — you need to go through an <strong>umbrella body</strong> (an organisation registered to submit DBS applications). For self-employed cleaners, the most common options are:</p>
      <ul>
        <li><strong>Disclosure Scotland</strong> — the equivalent body in Scotland, though for England and Wales you need the DBS</li>
        <li><strong>uCheck, Capita, or similar commercial umbrella bodies</strong> — these charge a small admin fee (typically £5–£15) on top of the DBS fee itself</li>
      </ul>
      <p>The DBS fee for a standard check is <strong>£18</strong>. With an umbrella body's admin fee, expect to pay £23–£33 total. Processing typically takes 2–4 weeks, though it can be faster.</p>

      <h2>The DBS Update Service</h2>
      <p>Once you have a DBS certificate, the most useful thing you can do is register for the <strong>DBS Update Service</strong> within 30 days of the certificate being issued. This costs £13 per year and allows clients and employers to check whether your certificate is still current — without you needing to apply for a new one every time you change jobs or clients.</p>
      <p>For a self-employed cleaner with multiple clients, this is essential. A single certificate on the Update Service is valid indefinitely (as long as you pay the annual fee), and clients can verify it online in seconds.</p>

      <Callout emoji="💡">
        Register for the Update Service at <a href="https://www.gov.uk/dbs-update-service" target="_blank" rel="noopener noreferrer" className="font-semibold underline">gov.uk/dbs-update-service</a> within 30 days of receiving your certificate. After that window closes, you'll need a new DBS to join.
      </Callout>

      <h2>How long does a DBS certificate last?</h2>
      <p>Technically, a DBS certificate has no expiry date — it reflects your record at the date it was issued. In practice, most professional clients and platforms expect a certificate issued within the last 2–3 years, or an active DBS Update Service registration.</p>
      <p>Vouchee requires all cleaners to have a valid DBS certificate and encourages Update Service registration so accreditations can be monitored without repeatedly re-applying.</p>

      <Callout emoji="🧹">
        Ready to get started? Once you have your DBS, <Link href="/cleaner" className="font-semibold underline">apply to join Vouchee</Link> and start finding clients in Horsham.
      </Callout>
    </>
  )
}

// ── 8. How to build a cleaning round in Horsham ───────────────

function BuildACleaningRound() {
  return (
    <>
      <p>A cleaning round — a set of regular clients in a defined area — is what turns self-employed cleaning from a side hustle into a proper, reliable income. Done well, it means a full diary, minimal travel between jobs, consistent pay, and genuine control over your working week.</p>
      <p>Here's how to build one deliberately, rather than just hoping it happens over time.</p>

      <h2>Start with geography</h2>
      <p>The most important structural decision in building a cleaning round is where you want to work. Cleaning jobs that are scattered across a wide area waste time and fuel between sessions. A tight geographic area — ideally within 2–3 miles of your home — means more sessions in the same day and lower running costs.</p>
      <p>Horsham's areas vary quite significantly in terms of housing density and property type. Central Horsham, Roffey, and Broadbridge Heath tend to have higher concentrations of working households with consistent demand. Pick the areas where you'd most like to work and focus your early efforts there.</p>

      <InlineImage
        src="https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800&q=80"
        alt="Map and planning materials for building a cleaning route"
        caption="A well-planned geographic round reduces travel time and increases the number of clients you can serve."
      />

      <h2>The economics of a full round</h2>
      <p>A full-time cleaning round typically involves 5–6 clients per day for a 5-day week — around 25–30 regular sessions per week. At a rate of £15–£17 per hour with sessions averaging 2.5–3 hours, a full round generates £900–£1,300 per week before expenses.</p>
      <p>Building to that point takes time. Most cleaners reach a consistent 15–20 clients after 6–12 months of actively finding work. The first 5 clients are the hardest to find; the next 15 often come through referrals from the first five.</p>

      <h2>How to find your first clients</h2>
      <p>The three most effective routes for a self-employed cleaner starting out in Horsham:</p>
      <ul>
        <li><strong>Online platforms like Vouchee</strong> — the fastest route to your first clients. Customers post requests, you apply, and you can start building a round with real clients from day one rather than waiting for word of mouth.</li>
        <li><strong>Local Facebook groups</strong> — Horsham has several active community groups. A well-written post introducing yourself, mentioning your DBS and insurance, and asking for enquiries still generates work.</li>
        <li><strong>Existing clients' referrals</strong> — once you have 3–4 happy clients, ask them directly if they know anyone who might need a cleaner. Most people do, and a personal recommendation carries far more weight than any advertisement.</li>
      </ul>

      <InlineImage
        src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80"
        alt="Professional cleaner working in a Horsham home"
        caption="Consistent, high-quality work builds the reputation that fills a round through referrals."
      />

      <h2>Protecting your round</h2>
      <p>Once you've built a round, the biggest risk is losing clients to life changes — people moving, financial circumstances changing, or simply trying someone different. The best protection is simply being excellent and easy to work with: reliable, communicative, and consistent.</p>
      <p>Secondary protection is having enough clients that losing one or two doesn't destabilise your income. Aim for a small waitlist rather than a completely full diary — it keeps you in the habit of finding new clients and means you can replace anyone who leaves quickly.</p>

      <Callout emoji="🧹">
        Vouchee makes it easy to find new clients in Horsham as your round grows. <Link href="/cleaner" className="font-semibold underline">Apply to join</Link> and start receiving job requests from vetted homeowners in your area.
      </Callout>
    </>
  )
}
