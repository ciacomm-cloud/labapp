export type Rol = "admin" | "operador";

export interface User {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
}

export interface Genero {
  id: number;
  nombre: string;
}

export interface Especie {
  id: number;
  genero_id: number;
  nombre: string;
  morfologia: string | null;
  numero_id: string | null;
}

export interface TipoFrasco {
  id: number;
  nombre: string;
  capacidad: string | null;
}

export interface TipoMedio {
  id: number;
  nombre: string;
}

export interface Lote {
  id: number;
  especie_id: number;
  tipo_frasco_id: number;
  tipo_medio_id: number;
  cantidad_sembrada: number;
  fecha_siembra: string;
  folio: string | null;
  notas: string | null;
  created_at: string;
}

export type Fase =
  | "inicio"
  | "multiplicacion"
  | "enraizamiento"
  | "endurecimiento"
  | "rescate_1"
  | "rescate_2"
  | "normal"
  | "contaminado"
  | "descartado";

export interface Cohorte {
  id: number;
  lote_id: number;
  parent_cohorte_id: number | null;
  codigo: string | null;
  fase: Fase;
  cantidad: number;
  fecha_ultima_revision: string | null;
  created_at: string;
}

export type TipoEvento =
  | "sin_cambios"
  | "multiplicacion"
  | "contaminacion"
  | "endofitos"
  | "rescate_exito"
  | "rescate_persiste"
  | "rescate_falla"
  | "enraizamiento"
  | "endurecimiento";

export interface EventoCohorte {
  id: number;
  cohorte_padre_id: number;
  cohorte_hija_id: number | null;
  tipo_evento: TipoEvento;
  cantidad: number | null;
  motivo: string | null;
  notas: string | null;
  fecha: string;
  usuario_id: number;
  created_at: string;
}

export interface CohorteConHistorial extends Cohorte {
  eventos_como_padre: EventoCohorte[];
}

export interface LoteDashboardItem {
  lote_id: number;
  folio: string | null;
  genero_nombre: string;
  especie_nombre: string;
  tipo_frasco_nombre: string;
  tipo_medio_nombre: string;
  fecha_siembra: string;
  total_frascos: number;
  dias_mas_antiguos: number | null;
  semaforo: "verde" | "amarillo" | "rojo";
  cohortes: Cohorte[];
}
