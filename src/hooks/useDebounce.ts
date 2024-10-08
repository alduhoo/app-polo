import { useState, useEffect } from 'react'

export function useDebounce<T> (value: T, delayMs: number = 500): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebounced(value)
    }, delayMs)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delayMs])

  return debounced
}
