// Pure allocation math, shared by the RUBS form's live client-side preview and the server-side
// posting route — the server always recomputes from the same inputs rather than trusting
// client-submitted per-lease amounts, but both need identical rounding behavior so the preview
// matches what actually posts.
export type RubsMethod = 'sqft' | 'beds' | 'equal'

export function rubsWeight(method: RubsMethod, unit: { sqft: number | null; beds: number }): number {
  if (method === 'equal') return 1
  if (method === 'beds') return Math.max(unit.beds, 1)
  return unit.sqft ?? 0
}

// Proportional split that sums exactly to totalAmount — the last positive-weight entry absorbs
// any rounding remainder so cents never go missing from the total bill.
export function allocateRubs(totalAmount: number, weights: number[]): number[] {
  const totalWeight = weights.reduce((s, w) => s + w, 0)
  if (totalWeight <= 0) return weights.map(() => 0)
  const shares = weights.map(w => Math.round((totalAmount * w / totalWeight) * 100) / 100)
  const sum = Math.round(shares.reduce((s, a) => s + a, 0) * 100) / 100
  const diff = Math.round((totalAmount - sum) * 100) / 100
  if (diff !== 0) {
    for (let i = shares.length - 1; i >= 0; i--) {
      if (weights[i] > 0) { shares[i] = Math.round((shares[i] + diff) * 100) / 100; break }
    }
  }
  return shares
}
