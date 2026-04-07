// Horsham postcode sectors mapping
// Built from real Royal Mail street-level data cross-referenced against Vouchee service area map v2
// Last updated: Feb 2026
//
// IMPORTANT: Keys are sorted longest-first in the lookup function so more specific
// entries always override broader ones. Never add a key without considering conflicts.
//
// NOT in coverage: RH13 7, RH13 8 (Partridge Green/Cowfold), RH13 9 (Southwater)
// Southwater was removed from coverage in map v2.

export type Sector =
  | 'Central / South East'
  | 'North West'
  | 'North East / Roffey'
  | 'South West'
  | 'Warnham / Surrounding North'
  | 'Broadbridge Heath'
  | 'Mannings Heath'
  | 'Faygate / Kilnwood Vale'
  | 'Christs Hospital'

export interface PostcodeSector {
  sector: Sector
  description: string
}

// ─────────────────────────────────────────────────────────────────────────────
// POSTCODE MAP
// Ordered in the file from most specific to least specific within each zone.
// The lookup function sorts all keys longest-first at runtime, so ordering
// here is for readability only.
// ─────────────────────────────────────────────────────────────────────────────

const POSTCODE_SECTORS: Record<string, PostcodeSector> = {

  // ── FAYGATE / KILNWOOD VALE ───────────────────────────────────────────────
  // RH12 4G: Durrants Drive/Faygate confirmed from street data
  // RH12 4S/4T/4U: Allingham Gardens = Kilnwood Vale confirmed
  'RH12 4G': { sector: 'Faygate / Kilnwood Vale', description: 'Faygate' },
  'RH12 4S': { sector: 'Faygate / Kilnwood Vale', description: 'Kilnwood Vale' },
  'RH12 4T': { sector: 'Faygate / Kilnwood Vale', description: 'Kilnwood Vale' },
  'RH12 4U': { sector: 'Faygate / Kilnwood Vale', description: 'Kilnwood Vale' },
  'RH12 4W': { sector: 'Faygate / Kilnwood Vale', description: 'Kilnwood Vale' },
  'RH12 4Y': { sector: 'Faygate / Kilnwood Vale', description: 'Kilnwood Vale' },
  'RH12 4Z': { sector: 'Faygate / Kilnwood Vale', description: 'Kilnwood Vale' },
  'RH12 0A': { sector: 'Faygate / Kilnwood Vale', description: 'Kilnwood Vale' },
'RH12 0B': { sector: 'Faygate / Kilnwood Vale', description: 'Kilnwood Vale' },
'RH12 0': { sector: 'Faygate / Kilnwood Vale', description: 'Kilnwood Vale' },

  // ── WARNHAM / SURROUNDING NORTH ──────────────────────────────────────────
  // RH12 3S: Sullington Mead = Warnham confirmed. Also covers Warnham village area
  // RH12 3U: Southwater Bypass road — edge of coverage, assigned to Warnham/North
  'RH12 3S': { sector: 'Warnham / Surrounding North', description: 'Warnham village and surrounds' },
  'RH12 3U': { sector: 'Warnham / Surrounding North', description: 'Warnham / north fringe' },

  // ── BROADBRIDGE HEATH ────────────────────────────────────────────────────
  // Confirmed from street data: 3A, 3H, 3J, 3L, 3N, 3P, 3T all contain BBH streets
  // 3N also contains some Warnham streets (Sullington Mead) but BBH is dominant
  'RH12 3A': { sector: 'Broadbridge Heath', description: 'Broadbridge Heath' },
  'RH12 3H': { sector: 'Broadbridge Heath', description: 'Broadbridge Heath' },
  'RH12 3J': { sector: 'Broadbridge Heath', description: 'Broadbridge Heath' },
  'RH12 3L': { sector: 'Broadbridge Heath', description: 'Broadbridge Heath' },
  'RH12 3N': { sector: 'Broadbridge Heath', description: 'Broadbridge Heath' },
  'RH12 3P': { sector: 'Broadbridge Heath', description: 'Broadbridge Heath' },
  'RH12 3T': { sector: 'Broadbridge Heath', description: 'Broadbridge Heath' },

  // ── CHRISTS HOSPITAL ─────────────────────────────────────────────────────
  // RH13 0: Split zone. 0A/0J = Tower Hill / south Horsham fringe (South West)
  // 0L/0N/0T = Christs Hospital school campus specifically
  // 0LA/0PG = Two Mile Ash Road area — Christs Hospital fringe
  'RH13 0T': { sector: 'Christs Hospital', description: 'Christs Hospital' },
  'RH13 0N': { sector: 'Christs Hospital', description: 'Christs Hospital' },
  'RH13 0L': { sector: 'Christs Hospital', description: 'Christs Hospital' },
  'RH13 0J': { sector: 'Christs Hospital', description: 'Christs Hospital / Tower Hill' },
  'RH13 0P': { sector: 'Christs Hospital', description: 'Christs Hospital fringe' },
  // RH13 0A covers Worthing Road, Tower Hill, Denne Park, Chesworth Lane — south Horsham fringe
  // Assigned to South West as it borders the town, not the Christs Hospital campus
  'RH13 0A': { sector: 'South West', description: 'South Horsham fringe / Tower Hill' },

  // ── MANNINGS HEATH ───────────────────────────────────────────────────────
  // RH13 6L: Hammerpond Road, Doomsday Lane, Manor Lane = Mannings Heath confirmed
  // RH13 6P: St Leonards Forest, Owlbeech, Manor Lane = Mannings Heath/St Leonards Forest
  // RH13 6Q: Sedgwick Lane, Sedgwick Park = Mannings Heath confirmed
  'RH13 6L': { sector: 'Mannings Heath', description: 'Mannings Heath' },
  'RH13 6P': { sector: 'Mannings Heath', description: 'Mannings Heath / St Leonards Forest' },
  'RH13 6Q': { sector: 'Mannings Heath', description: 'Mannings Heath / Sedgwick' },

  // ── NORTH EAST / ROFFEY ──────────────────────────────────────────────────
  // RH12 4B/4D/4E/4H: Rusper Road, Farhalls Crescent, Crawley Road, Lambs Farm Road
  // RH12 4N: Church Road, Forest Road, Birches Road = Roffey confirmed
  // RH12 4J: Littlehaven Lane, Meadow Close, Lockwood Close = North East
  // RH12 4L: Amberley Road, Greenfields, Beeding Close = North West Horsham
  // RH12 4Q/4R: Langhurstwood Road, Kingsmead Close = North East outer
  // RH12 5: All confirmed as North (North Heath Lane, Pondtail, Blenheim Road etc)
  'RH12 4B': { sector: 'North East / Roffey', description: 'North East Horsham' },
  'RH12 4D': { sector: 'North East / Roffey', description: 'North East Horsham' },
  'RH12 4E': { sector: 'North East / Roffey', description: 'North East Horsham' },
  'RH12 4F': { sector: 'North East / Roffey', description: 'North East Horsham' },
  'RH12 4H': { sector: 'North East / Roffey', description: 'North East Horsham' },
  'RH12 4J': { sector: 'North East / Roffey', description: 'Littlehaven / North East' },
  'RH12 4N': { sector: 'North East / Roffey', description: 'Roffey' },
  'RH12 4Q': { sector: 'North East / Roffey', description: 'North East outer' },
  'RH12 4R': { sector: 'North East / Roffey', description: 'North East outer' },
  'RH12 4X': { sector: 'North East / Roffey', description: 'North East Horsham' },
  'RH12 5':  { sector: 'North East / Roffey', description: 'North Horsham / Roffey' },

  // ── NORTH WEST ───────────────────────────────────────────────────────────
  // RH12 2: North Parade, Hurst Road, Springfield, Rushams Road = North West confirmed
  // RH12 4A: Parsonage Road, Ringley Road = North West fringe
  // RH12 4C: Broadwood Close, Coppice Road = North West
  // RH12 4L: Amberley Road, Greenfields, Shepherds Way = North West Horsham
  // RH12 4M: Millthorpe Road = North West
  // RH12 4P: Forest Close, Northdown Close = North West outer
  'RH12 2':  { sector: 'North West', description: 'North West Horsham' },
  'RH12 4A': { sector: 'North West', description: 'North West Horsham' },
  'RH12 4C': { sector: 'North West', description: 'North West Horsham' },
  'RH12 4L': { sector: 'North West', description: 'North West Horsham' },
  'RH12 4M': { sector: 'North West', description: 'North West Horsham' },
  'RH12 4P': { sector: 'North West', description: 'North West Horsham outer' },

  // ── SOUTH WEST ───────────────────────────────────────────────────────────
  // RH13 5: Large sector. Needs splitting carefully.
  // 5A/5D/5E = Central/South East (Station Road, New Street, Queens Street)
  // 5B = South West (Brighton Road south, Tanyard Close, South Grove, Gorings Mead)
  // 5H/5J = South West (Depot Road, Macleod Road, Eversfield Road, Leonard Way)
  // 5L/5N = South West (Highlands Road, Oakhill Road, Orchard Road, Comptons Lane west)
  // 5P/5R/5S = South West (Kings Road, Ayshe Court, Stirling Way, Clarence Road, Barrington)
  // 5T/5U = South West (Kennedy Road upper, Falklands Drive, Jubilee Estate)
  // 5G = South West (Corunna Drive, Crawford Gardens, Chesworth area)
  'RH13 5B': { sector: 'South West', description: 'South West Horsham' },
  'RH13 5G': { sector: 'South West', description: 'South West Horsham' },
  'RH13 5H': { sector: 'South West', description: 'South West Horsham' },
  'RH13 5J': { sector: 'Central / South East', description: 'Central Horsham' },
  'RH13 5L': { sector: 'South West', description: 'South West Horsham' },
  'RH13 5N': { sector: 'South West', description: 'South West Horsham' },
  'RH13 5P': { sector: 'South West', description: 'South West Horsham' },
  'RH13 5Q': { sector: 'South West', description: 'South West Horsham' },
  'RH13 5R': { sector: 'South West', description: 'South West Horsham' },
  'RH13 5S': { sector: 'South West', description: 'South West Horsham' },
  'RH13 5T': { sector: 'South West', description: 'South West Horsham' },
  'RH13 5U': { sector: 'South West', description: 'South West Horsham' },

  // ── CENTRAL / SOUTH EAST ────────────────────────────────────────────────
  // RH12 1: Town centre confirmed (Carfax, North Street, East Street, Bishopric, Denne Road)
  // RH12 3: Broadly Central/West but covered above by BBH/Warnham specific overrides
  // RH13 5A/5D/5E: Station Road, New Street, Queens Street, Victoria Street = Central
  // RH13 6A/6B/6D/6E/6G/6H: South East confirmed (Fitzalan, Howard Rd, Heron Way, St Leonards Rd)
  // RH13 6R/6S/6T: South East residential (Manor Fields, Wallis Way, Delius Gardens)
  'RH12 1':  { sector: 'Central / South East', description: 'Central Horsham' },
  'RH12 3':  { sector: 'Central / South East', description: 'Horsham west fringe' }, // fallback - specific BBH/Warnham override above
  'RH13 5A': { sector: 'Central / South East', description: 'Central Horsham' },
  'RH13 5D': { sector: 'Central / South East', description: 'Central Horsham' },
  'RH13 5E': { sector: 'Central / South East', description: 'Central Horsham' },
  'RH13 5F': { sector: 'Central / South East', description: 'Central Horsham' },
  'RH13 6A': { sector: 'Central / South East', description: 'South East Horsham' },
  'RH13 6B': { sector: 'Central / South East', description: 'South East Horsham' },
  'RH13 6D': { sector: 'Central / South East', description: 'South East Horsham' },
  'RH13 6E': { sector: 'Central / South East', description: 'South East Horsham' },
  'RH13 6G': { sector: 'Central / South East', description: 'South East Horsham' },
  'RH13 6H': { sector: 'Central / South East', description: 'South East Horsham' },
  'RH13 6N': { sector: 'Central / South East', description: 'South East Horsham' },
  'RH13 6R': { sector: 'Central / South East', description: 'South East Horsham' },
  'RH13 6S': { sector: 'Central / South East', description: 'South East Horsham' },
  'RH13 6T': { sector: 'Central / South East', description: 'South East Horsham' },

}

// ─────────────────────────────────────────────────────────────────────────────
// LOOKUP FUNCTION
// Sorts keys longest-first so specific entries (e.g. RH13 5J) always
// match before broader ones (e.g. RH13 5).
// ─────────────────────────────────────────────────────────────────────────────

export function getPostcodeSector(postcode: string): PostcodeSector | null {
  const cleaned = postcode.replace(/\s/g, '').toUpperCase()

  const sortedKeys = Object.keys(POSTCODE_SECTORS).sort((a, b) => {
    const aClean = a.replace(/\s/g, '')
    const bClean = b.replace(/\s/g, '')
    return bClean.length - aClean.length
  })

  for (const key of sortedKeys) {
    const keyClean = key.replace(/\s/g, '')
    if (cleaned.startsWith(keyClean)) {
      return POSTCODE_SECTORS[key]
    }
  }

  // Out of coverage area
  return null
}

export function isValidHorshamPostcode(postcode: string): boolean {
  const cleaned = postcode.replace(/\s/g, '').toUpperCase()
  return cleaned.startsWith('RH12') || cleaned.startsWith('RH13')
}

export function isInCoverageArea(postcode: string): boolean {
  return getPostcodeSector(postcode) !== null
}

// ─────────────────────────────────────────────────────────────────────────────
// OUT OF COVERAGE POSTCODES (explicit list for error messaging)
// ─────────────────────────────────────────────────────────────────────────────
export const OUT_OF_COVERAGE_PREFIXES = [
  'RH13 7', // Rural south
  'RH13 8', // Partridge Green, Cowfold
  'RH13 9', // Southwater (removed from coverage map v2)
]

export function isOutOfCoverage(postcode: string): boolean {
  const cleaned = postcode.replace(/\s/g, '').toUpperCase()
  return OUT_OF_COVERAGE_PREFIXES.some(prefix =>
    cleaned.startsWith(prefix.replace(/\s/g, ''))
  )
}

export const AVAILABLE_SECTORS: Sector[] = [
  'Central / South East',
  'North West',
  'North East / Roffey',
  'South West',
  'Warnham / Surrounding North',
  'Broadbridge Heath',
  'Mannings Heath',
  'Faygate / Kilnwood Vale',
  'Christs Hospital',
]