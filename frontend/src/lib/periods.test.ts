import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  currentMonth,
  isWithinOneMonth,
  periodPresets,
  resolvePreset,
} from './periods'

describe('periods', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-09-15T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('currentMonth returns the calendar month bounds', () => {
    expect(currentMonth()).toEqual({ from: '2026-09-01', to: '2026-09-30' })
  })

  it('periodPresets include common ranges from planning (R-13 bucket companion)', () => {
    expect(periodPresets.map((preset) => preset.id)).toEqual([
      'this-month',
      'last-month',
      'last-3-months',
      'year-to-date',
    ])
  })

  it('resolvePreset maps preset ids to inclusive ISO date ranges', () => {
    expect(resolvePreset('this-month')).toEqual({
      from: '2026-09-01',
      to: '2026-09-30',
    })
    expect(resolvePreset('last-month')).toEqual({
      from: '2026-08-01',
      to: '2026-08-31',
    })
    expect(resolvePreset('last-3-months')).toEqual({
      from: '2026-07-01',
      to: '2026-09-30',
    })
    expect(resolvePreset('year-to-date')).toEqual({
      from: '2026-01-01',
      to: '2026-09-30',
    })
  })

  it('isWithinOneMonth is true only for a single calendar month', () => {
    expect(isWithinOneMonth('2026-09-01', '2026-09-30')).toBe(true)
    expect(isWithinOneMonth('2026-08-15', '2026-09-01')).toBe(false)
  })
})
