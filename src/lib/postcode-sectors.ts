// Horsham postcode sectors mapping
// Built from real Royal Mail street-level data cross-referenced against Vouchee service area map v2
// Last updated: Feb 2026
//
// IMPORTANT: Keys are sorted longest-first in the lookup function so more specific
// entries always override broader ones. Never add a key without considering conflicts.
//
// NOT in coverage: RH13 7, RH13 8 (Partridge Green/Cowfold)

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
  | 'Southwater'

export interface PostcodeSector {
  sector: Sector
  description: string
}

const POSTCODE_SECTORS: Record<string, PostcodeSector> = {

  // ── FAYGATE / KILNWOOD VALE ───────────────────────────────────────────────
  'RH12 4G': { sector: 'Faygate / Kilnwood Vale', description: 'Faygate' },
  'RH12 4S': { sector: 'Faygate / Kilnwood Vale', description: 'Kilnwood Vale' },
  'RH12 4T': { sector: 'Faygate / Kilnwood Vale', description: 'Kilnwood Vale' },
  'RH12 4U': { sector: 'Faygate / Kilnwood Vale', description: 'Kilnwood Vale' },
  'RH12 4W': { sector: 'Faygate / Kilnwood Vale', description: 'Kilnwood Vale' },
  'RH12 4Y': { sector: 'Faygate / Kilnwood Vale', description: 'Kilnwood Vale' },
  'RH12 4Z': { sector: 'Faygate / Kilnwood Vale', description: 'Kilnwood Vale' },
  'RH12 0A': { sector: 'Faygate / Kilnwood Vale', description: 'Kilnwood Vale' },
  'RH12 0B': { sector: 'Faygate / Kilnwood Vale', description: 'Kilnwood Vale' },
  'RH12 0':  { sector: 'Faygate / Kilnwood Vale', description: 'Kilnwood Vale / Faygate' },

  // ── SOUTHWATER ────────────────────────────────────────────────────────────
  'RH13 9':  { sector: 'Southwater', description: 'Southwater' },

  // ── WARNHAM / SURROUNDING NORTH ──────────────────────────────────────────
  'RH12 3S': { sector: 'Warnham / Surrounding North', description: 'Warnham village and surrounds' },
  'RH12 3U': { sector: 'Warnham / Surrounding North', description: 'Warnham / north fringe' },

  // ── BROADBRIDGE HEATH ────────────────────────────────────────────────────
  'RH12 3A': { sector: 'Broadbridge Heath', description: 'Broadbridge Heath' },
  'RH12 3H': { sector: 'Broadbridge Heath', description: 'Broadbridge Heath' },
  'RH12 3J': { sector: 'Broadbridge Heath', description: 'Broadbridge Heath' },
  'RH12 3L': { sector: 'Broadbridge Heath', description: 'Broadbridge Heath' },
  'RH12 3N': { sector: 'Broadbridge Heath', description: 'Broadbridge Heath' },
  'RH12 3P': { sector: 'Broadbridge Heath', description: 'Broadbridge Heath' },
  'RH12 3T': { sector: 'Broadbridge Heath', description: 'Broadbridge Heath' },

  // ── CHRISTS HOSPITAL ─────────────────────────────────────────────────────
  'RH13 0T': { sector: 'Christs Hospital', description: 'Christs Hospital' },
  'RH13 0N': { sector: 'Christs Hospital', description: 'Christs Hospital' },
  'RH13 0L': { sector: 'Christs Hospital', description: 'Christs Hospital' },
  'RH13 0J': { sector: 'Christs Hospital', description: 'Christs Hospital / Tower Hill' },
  'RH13 0P': { sector: 'Christs Hospital', description: 'Christs Hospital fringe' },
  'RH13 0A': { sector: 'South West', description: 'South Horsham fringe / Tower Hill' },

  // ── MANNINGS HEATH ───────────────────────────────────────────────────────
  'RH13 6L': { sector: 'Mannings Heath', description: 'Mannings Heath' },
  'RH13 6P': { sector: 'Mannings Heath', description: 'Mannings Heath / St Leonards Forest' },
  'RH13 6Q': { sector: 'Mannings Heath', description: 'Mannings Heath / Sedgwick' },

  // ── NORTH EAST / ROFFEY ──────────────────────────────────────────────────
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
  'RH12 2':  { sector: 'North West', description: 'North West Horsham' },
  'RH12 4A': { sector: 'North West', description: 'North West Horsham' },
  'RH12 4C': { sector: 'North West', description: 'North West Horsham' },
  'RH12 4L': { sector: 'North West', description: 'North West Horsham' },
  'RH12 4M': { sector: 'North West', description: 'North West Horsham' },
  'RH12 4P': { sector: 'North West', description: 'North West Horsham outer' },

  // ── SOUTH WEST ───────────────────────────────────────────────────────────
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
  'RH12 1':  { sector: 'Central / South East', description: 'Central Horsham' },
  'RH12 3':  { sector: 'Central / South East', description: 'Horsham west fringe' },
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

  return null
}

export function isValidHorshamPostcode(postcode: string): boolean {
  const cleaned = postcode.replace(/\s/g, '').toUpperCase()
  return cleaned.startsWith('RH12') || cleaned.startsWith('RH13')
}

export function isInCoverageArea(postcode: string): boolean {
  return getPostcodeSector(postcode) !== null
}

export const OUT_OF_COVERAGE_PREFIXES = [
  'RH13 7', // Rural south
  'RH13 8', // Partridge Green, Cowfold
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
  'Southwater',
]