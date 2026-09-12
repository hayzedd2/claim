import type { AnyFieldApi } from "@tanstack/react-form"


export const getErrorMessage = (field: AnyFieldApi): string | undefined => {
  const { isTouched,isBlurred, errors } = field.state.meta
  return isTouched && isBlurred && errors.length > 0 ? errors.map((err)=> err.message)[0] : undefined
}


/**
 * Generates an array of unique promo code suggestions based on a given name.
 * e.g., "bigprime" -> ["BIGPRIME024X", "BGIPRIME-24", "CLAIM-BIGPRIME", "BIGPRIME2026"]
 */
export const suggestCodeBasedOnName = (
  name: string,
  count: number = 4
): string[] => {
  const cleanName = name
    .trim()
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
  if (!cleanName) return []

  const currentYear = new Date().getFullYear().toString()
  const shortYear = currentYear.slice(-2)

  // Generate random alphanumeric tail
  const randomTail = (len: number = 3) => {
    const chars = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ"
    let res = ""
    for (let i = 0; i < len; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return res
  }

  // Remove vowels (keep first letter intact)
  const disemvowel = (str: string) => {
    if (str.length <= 3) return str
    return str[0] + str.slice(1).replace(/[AEIOU]/g, "")
  }

  // Anagram/swap variation (e.g. bigprime -> bgiprime)
  const swapped = () => {
    if (cleanName.length < 4) return cleanName
    const arr = cleanName.split("")
    const temp = arr[1]
    arr[1] = arr[2]
    arr[2] = temp
    return arr.join("")
  }

  const suggestions = new Set<string>()

  // 1. Swapped / stylized with tail (e.g. BGIPRIME024X)
  suggestions.add(`${swapped()}${randomTail(3)}`)

  // 2. Direct name + year / random digits (e.g. BIGPRIME2026 or BIGPRIME26)
  suggestions.add(`${cleanName}${shortYear}${randomTail(1)}`)

  // 3. Hyphenated with CLAIM prefix (e.g. CLAIM-BIGPRIME)
  suggestions.add(`CLAIM-${cleanName}`)

  // 4. Compact disemvoweled variation (e.g. BGPRM-99)
  const short = disemvowel(cleanName)
  if (short !== cleanName) {
    suggestions.add(`${short}-${randomTail(3)}`)
  }

  // 5. Classic promo style (e.g. BIGPRIME-VIP / BIGPRIME-500)
  suggestions.add(`${cleanName}-${randomTail(4)}`)

  return Array.from(suggestions).slice(0, count)
}

export const defaultExpiry = (days: number = 14): string => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split("T")[0]
}

export const tomorrowStr = (): string => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split("T")[0]
}
