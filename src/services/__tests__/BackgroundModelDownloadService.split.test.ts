import { describe, it, expect } from '@jest/globals'

// Import private helpers by duplicating minimal logic for testing
function detectSplitFile(filename: string): { baseName: string; currentPart: number; totalParts: number; padding: number } | null {
  const match = filename.match(/^(.+)-(\d+)-of-(\d+)\.gguf$/)
  if (!match) { return null }
  const baseName = match[1]!
  const currentPartStr = match[2]!
  const totalPartsStr = match[3]!
  return {
    baseName,
    currentPart: parseInt(currentPartStr, 10),
    totalParts: parseInt(totalPartsStr, 10),
    padding: Math.max(5, Math.max(currentPartStr.length, totalPartsStr.length)),
  }
}

function generateSplitFilenames(filename: string): string[] {
  const info = detectSplitFile(filename)
  if (!info) { return [filename] }
  const { baseName, totalParts, padding } = info
  const parts: string[] = []
  for (let i = 1; i <= totalParts; i += 1) {
    const p = i.toString().padStart(padding, '0')
    parts.push(`${baseName}-${p}-of-${totalParts.toString().padStart(padding, '0')}.gguf`)
  }
  return parts
}

describe('split gguf detection & expansion', () => {
  it('returns null for non-split files', () => {
    expect(detectSplitFile('model.gguf')).toBeNull()
    expect(generateSplitFilenames('model.gguf')).toEqual(['model.gguf'])
  })

  it('detects split pattern and padding', () => {
    const info = detectSplitFile('llama-00001-of-00003.gguf')!
    expect(info.baseName).toBe('llama')
    expect(info.currentPart).toBe(1)
    expect(info.totalParts).toBe(3)
    expect(info.padding).toBe(5)
  })

  it('generates all parts with correct zero padding', () => {
    expect(generateSplitFilenames('foo-00001-of-00003.gguf')).toEqual([
      'foo-00001-of-00003.gguf',
      'foo-00002-of-00003.gguf',
      'foo-00003-of-00003.gguf',
    ])
  })
})

