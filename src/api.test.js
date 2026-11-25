import { describe, expect, it } from 'vitest'

describe('frontend configuration', () => {
  it('uses a relative application structure without embedded secrets', () => {
    expect(import.meta.env.VITE_OPENAI_API_KEY).toBeUndefined()
  })
})
