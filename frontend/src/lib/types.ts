export type UserRole = 'admin' | 'tech'

export interface UserOut {
  id: number
  username: string
  full_name: string
  role: UserRole
  is_active: boolean
}

export interface GenusOut {
  id: number
  name: string
}

export interface SpeciesOut {
  id: number
  genus_id: number
  name: string
  morphology: string | null
  genus: GenusOut
}

export interface CatalogItemOut {
  id: number
  catalog_code: string
  species_id: number
  status: string
  species: SpeciesOut
}

export type DiscardReason =
  | 'hongos'
  | 'endofitos'
  | 'bacterias'
  | 'oxidacion'
  | 'error_manejo'
  | 'otro'

export const DISCARD_REASONS: { value: DiscardReason; label: string }[] = [
  { value: 'hongos', label: 'Hongos' },
  { value: 'endofitos', label: 'Endófitos' },
  { value: 'bacterias', label: 'Bacterias' },
  { value: 'oxidacion', label: 'Oxidación' },
  { value: 'error_manejo', label: 'Error de manejo' },
  { value: 'otro', label: 'Otro' },
]

export interface InventoryLogOut {
  id: number
  catalog_item_id: number
  normal_jars: number
  ready_jars: number
  rescue_1_jars: number
  rescue_2_jars: number
  discarded_jars: number
  discard_reason: DiscardReason | null
  last_subculture_date: string
  notes: string | null
  updated_by: number
  created_at: string
  updated_at: string
  dias_transcurridos: number
  semaforo_antiguedad: 'verde' | 'amarillo' | 'rojo'
  estado_critico: boolean
}

export interface DashboardSummaryOut {
  periodo_desde: string
  periodo_hasta: string
  total_frascos_laboratorio: number
  frascos_en_rescate_activos: number
  catalogos_con_estado: number
  porcentaje_merma: number
}

export interface DashboardUrgenteOut {
  catalog_item_id: number
  catalog_code: string
  genus: string
  species: string
  log_id: number
  last_subculture_date: string
  dias_transcurridos: number
  semaforo_antiguedad: 'verde' | 'amarillo' | 'rojo'
  estado_critico: boolean
  normal_jars: number
  ready_jars: number
  rescue_1_jars: number
  rescue_2_jars: number
}
