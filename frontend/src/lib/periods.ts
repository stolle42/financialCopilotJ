export type DateRange = {
  from: string
  to: string
}

export type PeriodPreset = {
  id: string
  label: string
}

export const periodPresets: PeriodPreset[] = [
  { id: 'this-month', label: 'This month' },
  { id: 'last-month', label: 'Last month' },
  { id: 'last-3-months', label: 'Last 3 months' },
  { id: 'year-to-date', label: 'Year to date' },
]

function parseIso(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatIso(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function monthEnd(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function currentMonth(reference = new Date()): DateRange {
  const start = monthStart(reference)
  const end = monthEnd(reference)
  return { from: formatIso(start), to: formatIso(end) }
}

export function resolvePreset(id: string, reference = new Date()): DateRange {
  switch (id) {
    case 'this-month':
      return currentMonth(reference)
    case 'last-month': {
      const prev = new Date(reference.getFullYear(), reference.getMonth() - 1, 1)
      return { from: formatIso(monthStart(prev)), to: formatIso(monthEnd(prev)) }
    }
    case 'last-3-months': {
      const start = new Date(reference.getFullYear(), reference.getMonth() - 2, 1)
      return {
        from: formatIso(monthStart(start)),
        to: formatIso(monthEnd(reference)),
      }
    }
    case 'year-to-date':
      return {
        from: formatIso(new Date(reference.getFullYear(), 0, 1)),
        to: formatIso(monthEnd(reference)),
      }
    default:
      return currentMonth(reference)
  }
}

export function isWithinOneMonth(from: string, to: string): boolean {
  const start = parseIso(from)
  const end = parseIso(to)
  return (
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth()
  )
}
