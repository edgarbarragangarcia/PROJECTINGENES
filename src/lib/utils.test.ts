import { expect, test, describe } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  test('merges class names correctly', () => {
    expect(cn('c-1', 'c-2')).toBe('c-1 c-2')
  })

  test('handles conditional classes', () => {
    expect(cn('c-1', true && 'c-2', false && 'c-3')).toBe('c-1 c-2')
  })

  test('merges tailwind classes', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2')
    expect(cn('px-2 py-2', 'p-4')).toBe('p-4')
  })
})
