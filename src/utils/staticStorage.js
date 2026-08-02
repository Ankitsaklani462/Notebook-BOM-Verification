export function readStoredJSON(key, fallback, storage = typeof window !== 'undefined' ? window.localStorage : undefined) {
  if (!storage) {
    return fallback
  }

  const storedValue = storage.getItem(key)
  if (!storedValue) {
    return fallback
  }

  try {
    return JSON.parse(storedValue)
  } catch {
    return fallback
  }
}

export function writeStoredJSON(key, value, storage = typeof window !== 'undefined' ? window.localStorage : undefined) {
  if (!storage) {
    return
  }

  storage.setItem(key, JSON.stringify(value))
}

export async function loadDataWithFallback(endpoint, storageKey, fallback) {
  if (typeof window === 'undefined') {
    return fallback
  }

  try {
    const response = await fetch(endpoint)
    if (response.ok) {
      const data = await response.json()
      if (data !== null) {
        writeStoredJSON(storageKey, data)
        return data
      }
    }
  } catch {
    // Fall back to localStorage when the backend is unavailable.
  }

  return readStoredJSON(storageKey, fallback)
}
