import { describe, expect, it } from 'vitest'
import { createModelEntry, normalizeMaterial, verifyScannedMaterial } from './verifyMaterials'

describe('verifyMaterials utilities', () => {
  it('normalizes material values', () => {
    expect(normalizeMaterial(' Steel ')).toBe('steel')
    expect(normalizeMaterial({ name: ' Bolt ', number: ' B-200 ' })).toBe('b-200')
  })

  it('creates model entries with default line and shift', () => {
    const model = createModelEntry({ name: 'Test Model', materials: ['Part A', 'Part B'] })

    expect(model.name).toBe('Test Model')
    expect(model.line).toBe('Line 1')
    expect(model.shift).toBe('A')
    expect(model.materials).toEqual([{ name: 'Part A', number: '' }, { name: 'Part B', number: '' }])
  })
})

describe('verifyScannedMaterial', () => {
  it('validates scanned materials against the selected BOM', () => {
    const result = verifyScannedMaterial('steel', ['Steel', 'Aluminum', 'Rubber'])

    expect(result.isMatch).toBe(true)
    expect(result.material).toBe('steel')
  })

  it('matches scanned codes against part numbers when BOM rows include both name and number', () => {
    const result = verifyScannedMaterial('p-1001', [{ name: 'Steel Cover', number: 'P-1001' }, { name: 'Aluminum Frame', number: 'P-1002' }])

    expect(result.isMatch).toBe(true)
    expect(result.material).toBe('p-1001')
  })
})
