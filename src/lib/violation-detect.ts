// Shared violation-keyword detection.
//
// The chat-widget uses this for the pre-send warning UX; /api/log-violation
// uses it server-side to refuse to log "violations" that don't actually
// match (and to defend against a tampered client that sends bogus keywords).
//
// We normalise the message before substring-matching so that obvious
// bypasses still trigger:
//
//   "w h a t s a p p"   → strips single-character gaps between letters
//   "0 7 5 1 2 …"        → strips gaps inside digit runs
//   "Whats App!"         → lowercased, punctuation kept (some keywords
//                          like "+44" rely on punctuation)
//
// Anything fancier than that needs an actual moderation service. This is
// enough to catch lazy "circumvent the filter" attempts while keeping the
// false-positive rate manageable.

export function normaliseForDetection(input: string): string {
  if (!input) return ''
  const lower = input.toLowerCase()
  // Collapse runs of whitespace
  const collapsed = lower.replace(/\s+/g, ' ')
  // Strip single-character spaces between letters/digits:
  //   "w h a t s" → "whats"
  //   "0 7 5 1 2" → "075 12"  (last token left alone, then re-collapsed below)
  // We run the pattern repeatedly because each pass only removes every other
  // space (the regex consumes the trailing space too).
  let despaced = collapsed
  for (let i = 0; i < 4; i++) {
    const next = despaced.replace(/([a-z0-9]) (?=[a-z0-9](?:\b| |$))/g, '$1')
    if (next === despaced) break
    despaced = next
  }
  return despaced
}

// Returns the keywords from the watchlist that appear in the (normalised)
// message. Each keyword is itself normalised so a list entry like "+44"
// still matches inside "+ 4 4".
export function detectTriggeredKeywords(message: string, watchlist: string[]): string[] {
  const haystack = normaliseForDetection(message)
  if (!haystack) return []
  const hits: string[] = []
  for (const raw of watchlist) {
    const needle = normaliseForDetection(raw)
    if (needle && haystack.includes(needle)) hits.push(raw)
  }
  return hits
}
