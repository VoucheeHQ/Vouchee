import React from 'react'
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
      <p>Moving into a new home is one of those rare moments where you get to start completely fresh. The previous occupants are gone, the place is empty, and if you're lucky it's been given a decent clean before you arrived. In practice, even well-maintained properties have corners that haven't been properly cleaned in years.</p>
      <p>We put this guide together based on what Vouchee cleaners actually bring to new-home cleans in Horsham. These are the products that consistently come up when we ask our vetted cleaners what they'd recommend a homeowner stock up on from day one.</p>

      <h2>Start with the surfaces</h2>
      <p>The most-used surfaces in any home are worktops, sinks, and bathrooms. These need products that can handle everyday grime but are safe to use repeatedly without damaging surfaces.</p>
      <p>For kitchen and bathroom surfaces, <strong>Flash Multi-Surface Spray</strong> is the everyday workhorse. It handles most situations without needing anything more specialist. Pair it with a pack of good quality microfibre cloths (get more than you think you need; 12 isn't excessive for a new home setup) and you have the foundation of any cleaning kit.</p>

      <h2>The products that do the heavy lifting</h2>
      <p>Once the basics are covered, there are a handful of products that professional cleaners reach for when the standard spray isn't enough. These are the ones that come up repeatedly when we talk to cleaners on the Vouchee platform about what's actually in their kit bags.</p>

      <ul>
        <li><strong>Bar Keepers Friend</strong> is a powder cleanser that removes limescale, rust stains, and tarnish from sinks, ceramic hobs, and stainless steel. One of the most versatile products available, and almost every cleaner on our platform swears by it.</li>
        <li><strong>The Pink Stuff</strong> is a paste that works on ovens, grout, pots and pans, and almost anything else with baked-on residue. It sounds gimmicky but cleaners who've tried it rarely go back.</li>
        <li><strong>Viakal</strong>. Horsham is a hard water area, which means limescale builds up faster than most homeowners expect. Viakal is the best product for shower screens, taps, and showerheads, and our cleaners use it on almost every bathroom job in the area.</li>
        <li><strong>HG Mould Spray</strong>. Bathroom mould is almost inevitable over time, especially in older Horsham properties with less ventilation. HG removes it properly rather than just bleaching it temporarily.</li>
      </ul>

      <div className="not-prose flex flex-wrap gap-2 my-6">
        <ProductLink name="Bar Keepers Friend" href="https://www.amazon.co.uk/s?k=Bar+Keepers+Friend+Powder&tag=vouchee-21" />
        <ProductLink name="The Pink Stuff" href="https://www.amazon.co.uk/s?k=The+Pink+Stuff+Miracle+Paste&tag=vouchee-21" />
        <ProductLink name="Viakal" href="https://www.amazon.co.uk/s?k=Viakal+Limescale+Remover&tag=vouchee-21" />
        <ProductLink name="HG Mould Spray" href="https://www.amazon.co.uk/s?k=HG+Mould+Spray&tag=vouchee-21" />
      </div>

      <h2>Floors</h2>
      <p>For hard floors, <strong>Flash Floor Cleaner</strong> works across tiles, laminate, and vinyl without leaving residue. If you have carpets, a good hoover is the most important investment you'll make. The <strong>Henry Hoover</strong> remains the benchmark for reliability and value, and it's what the majority of professional cleaners in our network use day to day.</p>

      <h2>Tools that make the difference</h2>
      <p>Products are only half the story. The right tools mean you actually use them correctly, and this is where a lot of homeowners underinvest compared to the professionals who clean for a living.</p>
      <ul>
        <li><strong>Scrub Daddy sponge</strong>. Changes texture with water temperature and doesn't scratch surfaces the way standard scourers do. It's become something of a staple among our cleaners for exactly this reason.</li>
        <li><strong>Extendable duster</strong>. Ceiling corners, light fittings, and high shelves collect dust quickly. An extendable duster means you don't need a stepladder for weekly maintenance.</li>
        <li><strong>Rubber gloves</strong>. Standard kitchen gloves tear too quickly. Buy professional-grade ones from the start and your hands will thank you.</li>
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
      <p>Finding a reliable cleaner used to mean asking neighbours for a recommendation, posting in a local Facebook group, or taking a chance on someone you knew nothing about. The result was often inconsistent. A great cleaner for six months, then they disappear, and you're back to square one.</p>
      <p>We built Vouchee specifically because this was the most common frustration we heard from homeowners in Horsham. This guide covers what to look for, whether you're using Vouchee or searching on your own.</p>

      <h2>Know what you actually need first</h2>
      <p>Before you start looking, it's worth being clear on what you want. The main question is whether you need a <strong>regular cleaner</strong> (weekly or fortnightly) or a <strong>one-off clean</strong> (end of tenancy, post-renovation, or a seasonal deep clean).</p>
      <p>Regular cleaning relationships are the most valuable. Once you find someone good, life genuinely gets easier. From the requests we see come through on Vouchee, the majority of Horsham homeowners are looking for fortnightly regular cleans, usually covering 3-4 hours for a mid-sized family home.</p>

      <h2>What to look for in a cleaner</h2>
      <p>A professional domestic cleaner operating in your home should be able to demonstrate three things. We require all three from every cleaner on Vouchee before they can apply for a single job:</p>
      <ul>
        <li><strong>A valid DBS certificate.</strong> A Disclosure and Barring Service check confirms that the cleaner has no relevant criminal record. Standard checks are the minimum; enhanced checks are available for households with vulnerable adults or children.</li>
        <li><strong>Public liability insurance.</strong> This covers damage to your property or belongings during a clean. The minimum you should accept is £1,000,000 of coverage.</li>
        <li><strong>Right to work in the UK.</strong> Any cleaner working legally in the UK should be able to confirm this without hesitation.</li>
      </ul>

      <Callout emoji="✅">
        All cleaners on Vouchee have been DBS checked, hold public liability insurance of at least £1,000,000, and have confirmed their right to work in the UK before being approved. We monitor these accreditations continuously, and if anything lapses the cleaner is suspended until it's resolved.
      </Callout>

      <h2>Questions to ask before you book</h2>
      <p>Even once you've found a cleaner who looks good on paper, a short conversation before your first session makes a big difference. When customers message cleaners through Vouchee before accepting an application, the most useful questions tend to be:</p>
      <ul>
        <li>Do you bring your own supplies, or do you prefer to use the household's products?</li>
        <li>What areas do you typically cover in a standard session?</li>
        <li>How do you handle fragile items or surfaces that need special care?</li>
        <li>What's your policy if you need to cancel at short notice?</li>
      </ul>

      <h2>How Vouchee works</h2>
      <p>Vouchee is a marketplace built specifically for Horsham and the surrounding areas. You post a cleaning request with your property details, the tasks you need covering, your preferred days, and the hourly rate you're happy to pay. Vetted local cleaners then apply, and you choose based on their profile, reviews from other Vouchee customers, and their application message.</p>
      <p>Your full address is never shared until you've accepted an application. We introduced that specifically because several customers told us they were uncomfortable with their address being visible before they'd chosen anyone.</p>

      <Callout emoji="🏠">
        Ready to find a cleaner in Horsham? <Link href="/request/property" className="font-semibold underline">Post your first request on Vouchee</Link>. It takes about 3 minutes and the first applications often arrive the same day.
      </Callout>
    </>
  )
}

// ── 3. Deep clean vs regular clean ────────────────────────────

function DeepCleanVsRegular() {
  return (
    <>
      <p>If you've never had a professional cleaner before, the terminology can be confusing. "Deep clean" and "regular clean" sound self-explanatory, but in practice they're quite different services. Different time, different cost, and suited to different situations.</p>
      <p>It's one of the questions that comes up most often when customers post their first request on Vouchee, so we've put together a straightforward breakdown.</p>

      <h2>What is a regular clean?</h2>
      <p>A regular clean is a recurring maintenance service, usually weekly or fortnightly. The cleaner keeps your home at a consistent standard: hoovering, mopping, wiping surfaces, cleaning bathrooms and kitchens, and generally maintaining what's already there.</p>
      <p>A typical regular clean for a 3-bedroom home in Horsham takes 2–3 hours. It works best when done consistently. The longer between cleans, the more time each session takes to get back to standard.</p>

      <h2>What is a deep clean?</h2>
      <p>A deep clean is a much more intensive, one-off service. It covers everything a regular clean does but goes significantly further: inside cupboards and appliances, behind furniture, grout lines, limescale buildup, skirting boards, window frames, and anything else that accumulates over months rather than weeks.</p>
      <p>Deep cleans typically take 4–8 hours depending on property size and condition. When cleaners on Vouchee quote for deep clean jobs, they usually ask for more information about the property's current condition before confirming a time estimate. That's normal, and a good sign they're being realistic rather than just telling you what you want to hear.</p>

      <h2>When do you need a deep clean?</h2>
      <ul>
        <li><strong>Moving into a new property.</strong> Even a well-maintained home benefits from a proper clean before you settle in. This is the most common one-off request we see on Vouchee.</li>
        <li><strong>End of tenancy.</strong> Most tenancy agreements require the property to be returned in the condition it was let, and landlords in the Horsham area increasingly expect professional evidence of this.</li>
        <li><strong>After renovation or building work.</strong> Construction dust gets everywhere and requires specialist attention.</li>
        <li><strong>Before starting a regular cleaning service.</strong> Many cleaners prefer to start from a clean baseline rather than spend the first several regular sessions catching up.</li>
        <li><strong>Seasonal.</strong> Some households do a deep clean once or twice a year regardless.</li>
      </ul>

      <h2>Which one should you book?</h2>
      <p>If your home is in reasonable condition and you want to start a regular cleaning routine, a regular clean from a good cleaner is usually sufficient. If the property hasn't had a thorough clean in a while, or you've just moved in, a one-off deep clean first makes the ongoing maintenance much easier. In our experience, it also leads to a better long-term relationship with your cleaner.</p>

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
      <p>Booking your first professional cleaner is one of those things that sounds simple but comes with a surprising amount of low-level uncertainty. Who is this person coming into my home? What will they actually do? How do I know if it went well?</p>
      <p>We've seen this play out hundreds of times through Vouchee, and the customers who get the most out of their first session are the ones who prepare a little beforehand and communicate clearly. Here's what that looks like in practice.</p>

      <h2>Before the session: preparation matters</h2>
      <p>A cleaner isn't a tidier. Their job is to clean surfaces, floors, and fixtures, not to move your belongings around in order to do it. The more decluttered the space is before they arrive, the more actual cleaning gets done in the time you're paying for.</p>
      <p>You don't need to do a deep tidy. Just a quick pass to clear surfaces, put dishes away, and move anything you don't want disturbed. We'd estimate 10 minutes of prep adds the equivalent of 20–30 minutes of cleaning time to a session.</p>

      <h2>What a standard session covers</h2>
      <p>A typical 2–3 hour regular clean in a 3-bedroom Horsham home will usually cover:</p>
      <ul>
        <li>Hoovering all carpeted areas and hard floors</li>
        <li>Mopping hard floors</li>
        <li>Wiping kitchen surfaces, hob, and sink</li>
        <li>Cleaning bathrooms (toilet, sink, bath/shower, and surfaces)</li>
        <li>Dusting accessible surfaces and skirting boards</li>
        <li>Emptying bins</li>
      </ul>
      <p>It won't typically include inside ovens, inside fridges, inside cupboards, or windows. Those are either specialist add-ons or deep clean tasks. If you're not sure what's included, the application messages cleaners send through Vouchee are a good opportunity to ask before you accept.</p>

      <h2>Tell them about the things that matter to you</h2>
      <p>Every home is different. If you have a fragile ornament, a surface that marks easily, a pet that must not go upstairs, or a strong preference for eco-friendly products, say so before the first session, not after. This is probably the single most consistent piece of feedback we hear from cleaners: they'd much rather know in advance than find out by accident.</p>
      <p>Through Vouchee's chat, you can share any of this before you've even confirmed the booking.</p>

      <h2>After the first session</h2>
      <p>The first session is always slightly longer than subsequent ones, because the cleaner is getting to know the property. Over time, they become faster and more efficient because they know where everything is and what needs the most attention.</p>
      <p>If something wasn't done to your standard, say something politely and directly. Good cleaners want to know. It's how they get better, and it's much better for the relationship than quietly being dissatisfied. On Vouchee, you can message your cleaner directly through the platform after the session.</p>

      <Callout emoji="⭐">
        On Vouchee, you can leave a review after each session. This helps other customers find great cleaners, and it helps cleaners build the reputation that earns them better opportunities on the platform.
      </Callout>
    </>
  )
}

// ── 5. Cleaning products professionals use ────────────────────

function CleaningProductsProfessionals() {
  return (
    <>
      <p>Walk into any professional cleaner's kit bag and you won't find the same products that fill the cleaning aisle at the supermarket. Over time, cleaners learn which products actually work and which ones are mostly marketing, and the two lists don't overlap as much as you'd hope.</p>
      <p>We asked cleaners across our Vouchee network what they actually reach for on a daily basis. Not what they'd recommend for a brand deal, but what they'd repurchase without hesitation. These are the results.</p>

      <h2>Bar Keepers Friend: the Swiss army knife</h2>
      <p>If there's one product that appears in every professional cleaner's bag in our network, it's Bar Keepers Friend. The powder formulation cuts through limescale, rust stains, and mineral deposits on sinks, ceramic hobs, stainless steel, and porcelain, all without scratching.</p>
      <p>It's the kind of product that makes stubborn stains look easy. Apply with a damp cloth, work it in, rinse off. More than one Vouchee cleaner has described it as "the product I recommend to every customer I work for."</p>

      <div className="not-prose my-4">
        <ProductLink name="Bar Keepers Friend" href="https://www.amazon.co.uk/s?k=Bar+Keepers+Friend+Powder&tag=vouchee-21" />
      </div>

      <h2>HG Mould Spray: the one that actually works</h2>
      <p>Standard bleach-based bathroom sprays bleach mould temporarily; they don't remove it. HG Mould Spray penetrates the mould at the root and removes it properly. Leave it on for a few minutes, wipe off, and the mould is genuinely gone rather than lightened.</p>
      <p>For grout lines and silicone around baths and showers in Horsham's older housing stock, it's the best product available at any price point. We hear about it consistently from cleaners who work on properties that haven't had regular professional attention.</p>

      <div className="not-prose my-4">
        <ProductLink name="HG Mould Spray" href="https://www.amazon.co.uk/s?k=HG+Mould+Spray+Remover&tag=vouchee-21" />
      </div>

      <h2>Elbow Grease: kitchen degreasing</h2>
      <p>Kitchen grease is different from bathroom grime. It's sticky and layered, and washing-up liquid mostly smears it around. Elbow Grease is a concentrated degreaser that cuts through cooking residue on hobs, extractor fans, oven doors, and behind appliances.</p>
      <p>Spray, leave for 30 seconds, wipe. The difference on a neglected extractor fan is immediate and honestly quite satisfying.</p>

      <div className="not-prose my-4">
        <ProductLink name="Elbow Grease Degreaser" href="https://www.amazon.co.uk/s?k=Elbow+Grease+Degreaser+Spray&tag=vouchee-21" />
      </div>

      <h2>Viakal: limescale in hard water areas</h2>
      <p>Horsham sits in a hard water area, which means limescale builds up faster than most homeowners expect, often visibly within a few weeks on shower screens and taps. Standard cleaners slow it down; Viakal removes it. It's one of the most commonly mentioned products when we ask our cleaners what they'd tell a new customer to buy immediately.</p>

      <div className="not-prose my-4">
        <ProductLink name="Viakal" href="https://www.amazon.co.uk/s?k=Viakal+Limescale+Remover+Spray&tag=vouchee-21" />
      </div>

      <h2>The Scrub Daddy: for surfaces you can't scratch</h2>
      <p>The sponge with the face actually does something clever: it's firm in cold water for scrubbing, and soft in warm water for gentle wiping. This means you can use it on surfaces where a standard scourer would leave scratches, like glass hob surfaces, stainless steel sinks, and ceramic tiles. Several cleaners in our network have switched to these entirely and won't go back to standard sponges.</p>

      <div className="not-prose my-4">
        <ProductLink name="Scrub Daddy" href="https://www.amazon.co.uk/s?k=Scrub+Daddy+Sponge&tag=vouchee-21" />
      </div>

      <Callout emoji="🧹">
        See the full list of products Vouchee recommends (including large equipment, tools, and floor cleaners) on our <Link href="/cleaning-supplies" className="font-semibold underline">Cleaning Supplies page</Link>.
      </Callout>
    </>
  )
}

// ── 6. How to go self-employed as a cleaner ───────────────────

function SelfEmployedCleaner() {
  return (
    <>
      <p>Going self-employed as a cleaner is one of the most straightforward ways to run your own business in the UK. The startup costs are low, the demand is consistent, and you're genuinely in control of your hours, your clients, and your income.</p>
      <p>We've seen cleaners come through Vouchee's onboarding at every stage of this process. Some are fully set up from day one, others are still sorting their HMRC registration when they apply. This guide covers what you need to have in place, and when.</p>

      <h2>Step 1: Register as self-employed with HMRC</h2>
      <p>The first thing to do is register as self-employed with HMRC. You must do this <strong>by 5 October in your second tax year</strong> of trading, but doing it immediately is far better practice. If you earn more than £1,000 from self-employment in a tax year, you're legally required to register.</p>
      <p>You can register online at <a href="https://www.gov.uk/set-up-sole-trader" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">gov.uk/set-up-sole-trader</a>. It takes about 20 minutes and you'll receive your Unique Taxpayer Reference (UTR) number by post within 10 working days. Vouchee requires cleaners to be registered before accepting their first booking.</p>

      <h2>Step 2: Understand your tax obligations</h2>
      <p>As a self-employed sole trader, you pay tax through the Self Assessment system. Each year you submit a tax return covering the previous tax year (April to April) and pay:</p>
      <ul>
        <li><strong>Income Tax</strong> on profits above the personal allowance (currently £12,570)</li>
        <li><strong>Class 2 National Insurance</strong>, a flat weekly rate if your profits are above the Small Profits Threshold</li>
        <li><strong>Class 4 National Insurance</strong>, a percentage of profits above a set threshold</li>
      </ul>
      <p>The simplest way to manage this is to put aside 20–25% of everything you earn into a separate savings account. It's advice that sounds obvious but is genuinely the thing that catches most new self-employed cleaners out in their first year.</p>

      <Callout emoji="📊">
        HMRC's free guidance at <a href="https://www.gov.uk/self-employed-national-insurance-rates" target="_blank" rel="noopener noreferrer" className="font-semibold underline">gov.uk</a> explains current rates clearly. If your income grows significantly, one session with a local accountant is money well spent.
      </Callout>

      <h2>Step 3: Get your credentials in order</h2>
      <p>To work professionally in customers' homes, and to be approved on Vouchee, you need three things:</p>
      <ul>
        <li><strong>DBS certificate.</strong> A standard check costs £18 and can be obtained through a registered umbrella body. See our <Link href="/blog/dbs-checks-explained-what-cleaners-need-to-know" className="text-blue-600 underline">guide to DBS checks</Link> for the full process and how to use the Update Service to avoid reapplying for every new client.</li>
        <li><strong>Public liability insurance.</strong> Cover starts from around £60–£80 a year for £1,000,000 of coverage. Providers like Protectivity and Simply Business offer policies specifically for domestic cleaners, and the application takes about 10 minutes online.</li>
        <li><strong>Right to work documentation.</strong> A passport or biometric residence permit confirming you're legally entitled to work in the UK.</li>
      </ul>

      <h2>Step 4: Set your rates</h2>
      <p>Domestic cleaning in the Horsham area typically ranges from £14–£18 per hour for self-employed cleaners. Based on what we see through Vouchee job listings, the majority of customers in the area set their budget in the £15–£16 range for regular cleans. Setting your rate at the low end to get started is understandable, but it's worth increasing it as your reviews build. Clients who find good cleaners are rarely price-sensitive enough to switch for a pound an hour.</p>

      <h2>Step 5: Find your first clients</h2>
      <p>Word of mouth is powerful but slow to get started. Platforms like Vouchee connect you with homeowners in Horsham who are actively looking for vetted cleaners, shortcutting the months it can take to build a client base through referrals alone.</p>

      <Callout emoji="🧹">
        If you're ready to start finding clients in Horsham, <Link href="/cleaner" className="font-semibold underline">apply to join Vouchee</Link>. We handle the matching, you focus on the cleaning.
      </Callout>
    </>
  )
}

// ── 7. DBS checks explained ───────────────────────────────────

function DBSChecksExplained() {
  return (
    <>
      <p>A DBS check is one of the first things a client or platform will ask a domestic cleaner to provide. It's straightforward to obtain, doesn't take long, and makes an immediate difference to how professional you appear. But there's more to it than most guides cover, particularly around the Update Service, which most new cleaners don't know about.</p>
      <p>At Vouchee, a valid DBS certificate is a non-negotiable requirement before any cleaner can be approved. Here's everything you need to know.</p>

      <h2>What is a DBS check?</h2>
      <p>DBS stands for Disclosure and Barring Service, the government body that issues criminal records checks in England and Wales. A DBS check lets clients see whether you have any relevant criminal history before allowing you into their home.</p>
      <p>There are three types of DBS check. For domestic cleaning, a <strong>standard check</strong> is the usual requirement. It shows spent and unspent convictions, cautions, reprimands, and final warnings. Enhanced checks, which also include information held by local police, are typically only required for cleaners working in environments with vulnerable adults or children.</p>

      <h2>How to get a DBS check</h2>
      <p>You can't apply for a DBS check directly as an individual for employment purposes. You need to go through an <strong>umbrella body</strong>. For self-employed cleaners, the most practical options are commercial umbrella bodies like uCheck or Capita, which charge a small admin fee (typically £5–£15) on top of the DBS fee.</p>
      <p>The DBS fee for a standard check is <strong>£18</strong>. With an umbrella body's admin fee, expect to pay £23–£33 total. Processing typically takes 2–4 weeks, though it can be faster. We recommend applying before you need it rather than when you're waiting for an approval, as it's one of the most common delays we see in getting new cleaners onto the Vouchee platform.</p>

      <h2>The DBS Update Service: the thing most cleaners miss</h2>
      <p>Once you have a DBS certificate, the most useful thing you can do is register for the <strong>DBS Update Service</strong> within 30 days of the certificate being issued. This costs £13 per year and allows clients and employers to check whether your certificate is still current, without you needing to apply for a new one each time.</p>
      <p>For a self-employed cleaner with multiple clients, this is genuinely essential. A single certificate on the Update Service is valid indefinitely (as long as you pay the annual fee), and clients can verify it online in seconds. Several customers have told us they specifically look for Update Service registration when reviewing applications on Vouchee.</p>

      <Callout emoji="💡">
        Register for the Update Service at <a href="https://www.gov.uk/dbs-update-service" target="_blank" rel="noopener noreferrer" className="font-semibold underline">gov.uk/dbs-update-service</a> within 30 days of receiving your certificate. After that window closes, you'll need to apply for a new DBS to join. You can't register retrospectively.
      </Callout>

      <h2>How long does a DBS certificate last?</h2>
      <p>Technically, a DBS certificate has no expiry date. It reflects your record at the date it was issued. In practice, most professional clients and platforms expect a certificate issued within the last 2–3 years, or an active DBS Update Service registration. At Vouchee, we accept either and flag certificates that are approaching the 3-year mark so cleaners can plan their renewal in advance.</p>

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
      <p>A cleaning round (a set of regular clients in a defined area) is what turns self-employed cleaning from a side hustle into a proper, reliable income. Done well, it means a full diary, minimal travel between jobs, consistent pay, and genuine control over your working week.</p>
      <p>Based on what we see from cleaners who come through Vouchee and build successful rounds in Horsham, the ones who do it fastest are the ones who are deliberate about geography and quality from the start, rather than taking anything that comes and hoping it works out.</p>

      <h2>Start with geography</h2>
      <p>The most important structural decision in building a cleaning round is where you want to work. Cleaning jobs scattered across a wide area waste significant time and fuel between sessions. A tight geographic focus, ideally within 2–3 miles of your home, means more sessions in the same day and lower running costs.</p>
      <p>Horsham's areas vary quite significantly in terms of housing density and property type. From job requests we see on Vouchee, Central Horsham, Roffey, and Broadbridge Heath tend to generate the most consistent demand. North West Horsham and Warnham have a higher concentration of larger properties with longer session times. Pick the areas that suit your schedule and working style.</p>

      <h2>The economics of a full round</h2>
      <p>A full-time cleaning round typically involves 5–6 clients per day for a 5-day week, which works out to around 25–30 regular sessions per week. At a rate of £15–£17 per hour with sessions averaging 2.5–3 hours, a full round generates £900–£1,300 per week before expenses.</p>
      <p>Building to that point takes time. From what we observe across the Vouchee platform, cleaners who are active and responsive typically reach 10–15 regular clients within 3–6 months. The first 5 clients are the hardest to find; the next 10–15 often come through referrals from the first five.</p>

      <h2>How to find your first clients</h2>
      <p>The three most effective routes for a self-employed cleaner starting out in Horsham:</p>
      <ul>
        <li><strong>Vouchee</strong> is the fastest route to your first clients in the area. Customers post requests, you apply, and you can start building a round with real paying clients from day one. You can filter by area so you're only applying for jobs in the zones you want to cover.</li>
        <li><strong>Local Facebook groups.</strong> Horsham has several active community groups. A well-written post introducing yourself, mentioning your DBS and insurance, and asking for enquiries still generates leads, particularly in the village communities around Horsham.</li>
        <li><strong>Existing clients' referrals.</strong> Once you have 3–4 happy clients, ask them directly if they know anyone who might need a cleaner. Most people in Horsham know several households that don't have a regular cleaner. A personal recommendation carries far more weight than any advertisement.</li>
      </ul>

      <h2>Protecting your round</h2>
      <p>Once you've built a round, the biggest risk is losing clients to life changes: people moving, financial circumstances changing, or simply trying someone different. The best protection is being excellent and easy to work with: reliable, communicative, and consistent.</p>
      <p>Secondary protection is having enough clients that losing one or two doesn't destabilise your income. Aim for a small waitlist rather than a completely full diary. It keeps you in the habit of finding new clients and means you can replace anyone who leaves without a gap in income. Cleaners on Vouchee who maintain their profile actively find this easier to manage because new applications come in passively.</p>

      <Callout emoji="🧹">
        Vouchee makes it straightforward to find new clients in Horsham as your round grows. <Link href="/cleaner" className="font-semibold underline">Apply to join</Link> and start receiving job requests from vetted homeowners in the areas you want to cover.
      </Callout>
    </>
  )
}
