const formatter = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatMoney(value: string | number): string {
  const numeric = typeof value === 'string' ? Number(value) : value
  if (Number.isNaN(numeric)) {
    return '0.00'
  }
  return formatter.format(numeric)
}

export function parseMoneyInput(value: string): string {
  const trimmed = value.trim()
  if (trimmed === '') {
    return '0.00'
  }
  const numeric = Number(trimmed)
  if (Number.isNaN(numeric) || numeric < 0) {
    throw new Error('invalid amount')
  }
  return numeric.toFixed(2)
}
