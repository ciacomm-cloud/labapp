import { useMemo, useState } from 'react'

export type SortDirection = 'asc' | 'desc'

export function useSort<T, K extends string>(items: T[], getValue: (item: T, key: K) => string | number) {
  const [sortKey, setSortKey] = useState<K | null>(null)
  const [direction, setDirection] = useState<SortDirection>('asc')

  const toggle = (key: K) => {
    if (sortKey === key) {
      setDirection((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setDirection('asc')
    }
  }

  const sorted = useMemo(() => {
    if (!sortKey) return items
    const copy = [...items]
    copy.sort((a, b) => {
      const va = getValue(a, sortKey)
      const vb = getValue(b, sortKey)
      const cmp = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es')
      return direction === 'asc' ? cmp : -cmp
    })
    return copy
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, sortKey, direction])

  return { sorted, sortKey, direction, toggle }
}
