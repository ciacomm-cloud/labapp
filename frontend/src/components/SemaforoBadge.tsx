const COLORS: Record<string, string> = {
  verde: 'bg-green-100 text-green-800',
  amarillo: 'bg-amber-100 text-amber-800',
  rojo: 'bg-red-100 text-red-800',
}

export function SemaforoBadge({ semaforo }: { semaforo: string }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${COLORS[semaforo] ?? 'bg-stone-100 text-stone-800'}`}>
      {semaforo}
    </span>
  )
}
