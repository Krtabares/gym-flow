export interface Plan {
  id: string;
  nombre: string;
  precio: number;
  duracion_dias: number;
  beneficios: string[];
  created_at?: string;
}

export interface PreguntaAnamnesis {
  id: string;
  texto: string;
  tipo: 'sino' | 'texto';
  requerido: boolean;
}

export interface RespuestaAnamnesis {
  pregunta_id: string;
  pregunta_texto: string;
  tipo: 'sino' | 'texto';
  respuesta: string;
}

export interface AnamnesisMiembro {
  fecha_completado: string;
  respuestas: RespuestaAnamnesis[];
}

export interface Miembro {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  plan_id: string | null;
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'activo' | 'inactivo' | 'vencido';
  anamnesis?: AnamnesisMiembro | null;
  created_at?: string;
  plan?: Plan;
  fecha_nacimiento?: string;
  fecha_ingreso?: string;
  fecha_cobro?: string;
}

export interface Pago {
  id: string;
  miembro_id: string;
  monto: number;
  fecha_pago: string;
  metodo_pago: string;
  estado: string;
  created_at?: string;
  miembro?: Miembro;
}

export interface Asistencia {
  id: string;
  miembro_id: string;
  fecha_hora: string;
  miembro?: Miembro;
}

export enum EjercicioCategoria {
  Gimnasia = 'Gimnasia',
  Halterofilia = 'Halterofilia',
  Monoestructural = 'Monoestructural',
  Estiramiento = 'Estiramiento',
  Calentamiento = 'Calentamiento'
}

export const EJERCICIO_CATEGORIAS = [
  EjercicioCategoria.Gimnasia,
  EjercicioCategoria.Halterofilia,
  EjercicioCategoria.Monoestructural,
  EjercicioCategoria.Estiramiento,
  EjercicioCategoria.Calentamiento
] as const;

export interface Ejercicio {
  id: string;
  nombre: string;
  categoria: EjercicioCategoria | string;
  descripcion: string;
  equipamiento: string;
  url_video?: string;
  created_at?: string;
}

export const WOD_TYPES = [
  'AMRAP', 
  'EMOM', 
  'EOMOM',
  'For Time', 
  'RFT',
  'Chipper', 
  'Tabata', 
  'HIIT', 
  'Death by', 
  'Ladder',
  'MetCon',
  'Fuerza', 
  'Complejo', 
  'Halterofilia',
  'Gimnasia',
  'Calentamiento',
  'Partner WOD',
  'Otro'
] as const;
export type WodTipo = typeof WOD_TYPES[number];

export type TimerMetodo = 'countdown' | 'stopwatch' | 'interval' | 'none';

export const WOD_TIMER_MAP: Record<WodTipo, TimerMetodo> = {
  'AMRAP': 'countdown',
  'For Time': 'stopwatch',
  'RFT': 'stopwatch',
  'Chipper': 'stopwatch',
  'EMOM': 'interval',
  'EOMOM': 'interval',
  'Tabata': 'interval',
  'HIIT': 'interval',
  'Death by': 'interval',
  'Ladder': 'stopwatch',
  'MetCon': 'stopwatch',
  'Fuerza': 'none',
  'Complejo': 'none',
  'Halterofilia': 'none',
  'Gimnasia': 'none',
  'Calentamiento': 'none',
  'Partner WOD': 'stopwatch',
  'Otro': 'none'
};

export interface WodEjercicio {
  id?: string;
  wod_id?: string;
  ejercicio_id: string;
  series?: number | null;
  repeticiones?: string | null;
  detalles?: string | null;
  orden: number;
  ejercicio?: Ejercicio;
  created_at?: string;
}

export interface Wod {
  id: string;
  titulo: string;
  descripcion?: string;
  tipo: WodTipo;
  fecha: string; // YYYY-MM-DD
  wod_ejercicios?: WodEjercicio[];
  created_at?: string;
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: 'admin' | 'coach' | 'recepcion';
  telefono?: string;
  contrasena?: string;
  activo: boolean;
  created_at?: string;
}

export interface MarcaMiembro {
  id: string;
  miembro_id: string;
  ejercicio_id: string;
  valor: number;
  unidad: string;
  fecha: string;
  notas?: string;
  created_at?: string;
  miembro?: Miembro;
  ejercicio?: Ejercicio;
}

export interface Configuracion {
  clave: string;
  valor: string;
  updated_at?: string;
}


