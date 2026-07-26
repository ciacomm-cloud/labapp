export function SortableTh<K extends string>({
  label,
  sortKeyName,
  activeKey,
  direction,
  onClick,
}: {
  label: string
  sortKeyName: K
  activeKey: K | null
  direction: 'asc' | 'desc'
  onClick: (key: K) => void
}) {
  const isActive = activeKey === sortKeyName
  return (
    <th
      className="cursor-pointer select-none px-3 py-2 hover:text-stone-700"
      onClick={() => onClick(sortKeyName)}
    >
      {label}
      {isActive && <span className="ml-1">{direction === 'asc' ? '▲' : '▼'}</span>}
    </th>
  )
}
