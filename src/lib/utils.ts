import clsx, { type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatCurrency(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
}

// All date-only values in this app are stored as UTC midnight (`new Date('YYYY-MM-DD')`
// parses that way). Formatting must stay in UTC too, or a server west of Greenwich
// displays every date one day behind what was actually entered.
export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: '2-digit', timeZone: 'UTC',
  })
}
