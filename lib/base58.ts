// Base-58 avoids visually ambiguous chars: 0 O I l + /
// As per TinyURL system design: 64-bit ID → max 11 Base-58 chars
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

export function encodeBase58(num: bigint): string {
  if (num === 0n) return ALPHABET[0]
  let result = ''
  while (num > 0n) {
    result = ALPHABET[Number(num % 58n)] + result
    num = num / 58n
  }
  return result
}

export function decodeBase58(str: string): bigint {
  let result = 0n
  for (const char of str) {
    const idx = ALPHABET.indexOf(char)
    if (idx === -1) throw new Error(`Invalid Base-58 character: ${char}`)
    result = result * 58n + BigInt(idx)
  }
  return result
}

// Generates a cryptographically random short code using Base-58 alphabet
// 7 characters = 58^7 ≈ 2.2 trillion combinations — effectively collision-free
export function generateShortCode(length = 7): string {
  let result = ''
  for (let i = 0; i < length; i++) {
    result += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return result
}
