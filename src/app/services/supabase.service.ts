import { Injectable, NgZone, inject, signal } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Observable, from, of, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Plan, Miembro, Pago, Asistencia, PreguntaAnamnesis, Ejercicio, Wod, WodEjercicio, Usuario, MarcaMiembro } from '../models';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient | null = null;
  public isMockMode = true;
  private zone = inject(NgZone);

  private currentUserSignal = signal<Usuario | null>(this.loadCurrentUserFromStorage());
  public currentUser = this.currentUserSignal.asReadonly();

  private loadCurrentUserFromStorage(): Usuario | null {
    const saved = localStorage.getItem('gf_current_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  }

  login(email: string, password?: string): Observable<Usuario> {
    return this.getUsuarios().pipe(
      switchMap(usuarios => {
        const found = usuarios.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (found) {
          if (!found.activo) {
            return throwError(() => new Error('El usuario está inactivo en el sistema.'));
          }
          const userPassword = found.contrasena || '123456';
          if (password && userPassword !== password) {
            return throwError(() => new Error('La contraseña ingresada es incorrecta.'));
          }
          this.currentUserSignal.set(found);
          localStorage.setItem('gf_current_user', JSON.stringify(found));
          return of(found);
        } else {
          return throwError(() => new Error('El correo electrónico no corresponde a ningún usuario registrado.'));
        }
      })
    );
  }

  logout(): void {
    this.currentUserSignal.set(null);
    localStorage.removeItem('gf_current_user');
  }

  private supabaseQuery<T>(promise: PromiseLike<T>): Observable<T> {
    return new Observable<T>(observer => {
      Promise.resolve(promise).then(
        res => {
          this.zone.run(() => {
            observer.next(res);
            observer.complete();
          });
        },
        err => {
          this.zone.run(() => {
            observer.error(err);
          });
        }
      );
    });
  }

  constructor() {
    const url = environment.supabaseUrl;
    const key = environment.supabaseKey;

    if (url && key && url !== 'YOUR_SUPABASE_URL' && key !== 'YOUR_SUPABASE_ANON_KEY') {
      try {
        this.supabase = createClient(url, key);
        this.isMockMode = false;
        console.log('GymFlow: Conectado a Supabase exitosamente.');
      } catch (error) {
        console.error('GymFlow: Error al inicializar Supabase. Entrando en Modo Demo.', error);
        this.isMockMode = true;
      }
    } else {
      console.log('GymFlow: Credenciales no configuradas. Iniciando en Modo Demo (localStorage).');
      this.isMockMode = true;
      this.initializeMockData();
    }
  }

  // --- INICIALIZACIÓN DE DATOS DE PRUEBA (LOCAL STORAGE) ---
  private initializeMockData() {
    if (!localStorage.getItem('gf_anamnesis_plantilla')) {
      const mockPreguntas: PreguntaAnamnesis[] = [
        { id: 'q1', texto: '¿Sufre de alguna enfermedad crónica (diabetes, hipertensión, asma, etc.)?', tipo: 'sino', requerido: true },
        { id: 'q2', texto: '¿Toma algún medicamento regularmente? ¿Cuál y con qué frecuencia?', tipo: 'texto', requerido: false },
        { id: 'q3', texto: '¿Tiene alguna lesión activa o recurrente (rodillas, hombros, columna, etc.)?', tipo: 'texto', requerido: false },
        { id: 'q4', texto: '¿Tiene alergias conocidas a medicamentos, alimentos o sustancias?', tipo: 'texto', requerido: false },
        { id: 'q5', texto: 'Grupo Sanguíneo (e.g. O+, A-)', tipo: 'texto', requerido: false },
        { id: 'q6', texto: '¿Ha tenido alguna cirugía reciente o implantes médicos?', tipo: 'texto', requerido: false },
        { id: 'q7', texto: 'Nombre y teléfono del contacto de emergencia', tipo: 'texto', requerido: true }
      ];
      localStorage.setItem('gf_anamnesis_plantilla', JSON.stringify(mockPreguntas));
    }

    if (!localStorage.getItem('gf_planes')) {
      const mockPlanes: Plan[] = [
        {
          id: 'p1',
          nombre: 'Pase Diario',
          precio: 10,
          duracion_dias: 1,
          beneficios: ['Acceso a sala de musculación', 'Uso de casilleros']
        },
        {
          id: 'p2',
          nombre: 'Pase Mensual',
          precio: 45,
          duracion_dias: 30,
          beneficios: ['Acceso a sala de musculación', 'Clases de Cardio ilimitadas', 'Evaluación física mensual']
        },
        {
          id: 'p3',
          nombre: 'Trimestre Fit',
          precio: 120,
          duracion_dias: 90,
          beneficios: ['Acceso a sala de musculación', 'Clases ilimitadas (Crossfit/Cardio)', '1 sesión de nutrición al mes']
        },
        {
          id: 'p4',
          nombre: 'Anual Elite',
          precio: 400,
          duracion_dias: 365,
          beneficios: ['Acceso a sala de musculación', 'Acceso ilimitado a todas las clases', 'Evaluación física semanal', 'Casillero exclusivo', '1 camiseta de regalo']
        }
      ];
      localStorage.setItem('gf_planes', JSON.stringify(mockPlanes));
    }

    if (!localStorage.getItem('gf_miembros')) {
      const mockMiembros: Miembro[] = [
        {
          id: 'm1',
          nombre: 'Carlos Gómez',
          email: 'carlos.gomez@email.com',
          telefono: '555-0192',
          plan_id: 'p2',
          fecha_inicio: this.getDateOffset(-15),
          fecha_fin: this.getDateOffset(15),
          estado: 'activo',
          fecha_nacimiento: '1992-05-15',
          fecha_ingreso: '2025-01-10',
          fecha_cobro: this.getDateOffset(-15),
          anamnesis: {
            fecha_completado: this.getDateOffset(-14),
            respuestas: [
              { pregunta_id: 'q1', pregunta_texto: '¿Sufre de alguna enfermedad crónica (diabetes, hipertensión, asma, etc.)?', tipo: 'sino', respuesta: 'no' },
              { pregunta_id: 'q2', pregunta_texto: '¿Toma algún medicamento regularmente? ¿Cuál y con qué frecuencia?', tipo: 'texto', respuesta: 'Ninguno' },
              { pregunta_id: 'q3', pregunta_texto: '¿Tiene alguna lesión activa o recurrente (rodillas, hombros, columna, etc.)?', tipo: 'texto', respuesta: 'Molestia leve en rodilla izquierda al hacer sentadillas pesadas.' },
              { pregunta_id: 'q4', pregunta_texto: '¿Tiene alergias conocidas a medicamentos, alimentos o sustancias?', tipo: 'texto', respuesta: 'Alergia a la penicilina' },
              { pregunta_id: 'q5', pregunta_texto: 'Grupo Sanguíneo (e.g. O+, A-)', tipo: 'texto', respuesta: 'O+' },
              { pregunta_id: 'q6', pregunta_texto: '¿Ha tenido alguna cirugía reciente o implantes médicos?', tipo: 'texto', respuesta: 'No' },
              { pregunta_id: 'q7', pregunta_texto: 'Nombre y teléfono del contacto de emergencia', tipo: 'texto', respuesta: 'María Gómez (Esposa) - 555-9876' }
            ]
          }
        },
        {
          id: 'm2',
          nombre: 'Sofía Rodríguez',
          email: 'sofia.r@email.com',
          telefono: '555-0143',
          plan_id: 'p3',
          fecha_inicio: this.getDateOffset(-45),
          fecha_fin: this.getDateOffset(45),
          estado: 'activo',
          fecha_nacimiento: '1995-10-22',
          fecha_ingreso: '2025-02-14',
          fecha_cobro: this.getDateOffset(-45)
        },
        {
          id: 'm3',
          nombre: 'Martín Silva',
          email: 'martin.silva@email.com',
          telefono: '555-0187',
          plan_id: 'p1',
          fecha_inicio: this.getDateOffset(-2),
          fecha_fin: this.getDateOffset(-1),
          estado: 'vencido',
          fecha_nacimiento: '1988-03-05',
          fecha_ingreso: '2026-06-01',
          fecha_cobro: this.getDateOffset(-2)
        },
        {
          id: 'm4',
          nombre: 'Lucía Fernández',
          email: 'lucia.f@email.com',
          telefono: '555-0121',
          plan_id: 'p4',
          fecha_inicio: this.getDateOffset(-200),
          fecha_fin: this.getDateOffset(165),
          estado: 'activo',
          fecha_nacimiento: '2000-07-30',
          fecha_ingreso: '2024-11-20',
          fecha_cobro: this.getDateOffset(-200)
        },
        {
          id: 'm5',
          nombre: 'Andrés Mendoza',
          email: 'andres.m@email.com',
          telefono: '555-0155',
          plan_id: null,
          fecha_inicio: this.getDateOffset(-10),
          fecha_fin: this.getDateOffset(-10),
          estado: 'inactivo',
          fecha_nacimiento: '1990-12-12',
          fecha_ingreso: '2026-06-15',
          fecha_cobro: this.getDateOffset(-10)
        }
      ];
      localStorage.setItem('gf_miembros', JSON.stringify(mockMiembros));
    }

    if (!localStorage.getItem('gf_pagos')) {
      const mockPagos: Pago[] = [
        {
          id: 'pay1',
          miembro_id: 'm1',
          monto: 45,
          fecha_pago: this.getDateTimeOffset(-15),
          metodo_pago: 'Efectivo',
          estado: 'completado'
        },
        {
          id: 'pay2',
          miembro_id: 'm2',
          monto: 120,
          fecha_pago: this.getDateTimeOffset(-45),
          metodo_pago: 'Tarjeta de Crédito',
          estado: 'completado'
        },
        {
          id: 'pay3',
          miembro_id: 'm3',
          monto: 10,
          fecha_pago: this.getDateTimeOffset(-2),
          metodo_pago: 'Transferencia',
          estado: 'completado'
        },
        {
          id: 'pay4',
          miembro_id: 'm4',
          monto: 400,
          fecha_pago: this.getDateTimeOffset(-200),
          metodo_pago: 'Tarjeta de Crédito',
          estado: 'completado'
        }
      ];
      localStorage.setItem('gf_pagos', JSON.stringify(mockPagos));
    }

    if (!localStorage.getItem('gf_asistencia')) {
      const mockAsistencia: Asistencia[] = [
        { id: 'a1', miembro_id: 'm1', fecha_hora: this.getDateTimeOffset(-1) },
        { id: 'a2', miembro_id: 'm2', fecha_hora: this.getDateTimeOffset(-2) },
        { id: 'a3', miembro_id: 'm4', fecha_hora: this.getDateTimeOffset(0) },
        { id: 'a4', miembro_id: 'm1', fecha_hora: this.getDateTimeOffset(0) }
      ];
      localStorage.setItem('gf_asistencia', JSON.stringify(mockAsistencia));
    }

    if (!localStorage.getItem('gf_ejercicios')) {
      const mockEjercicios: Ejercicio[] = [
        { id: 'e1', nombre: 'Air Squat', categoria: 'Gimnasia', descripcion: 'Sentadilla libre con el peso corporal. Mantener talones apoyados, espalda recta y romper el paralelo.', equipamiento: 'Ninguno' },
        { id: 'e2', nombre: 'Push-up', categoria: 'Gimnasia', descripcion: 'Flexiones de brazos rozando el pecho contra el suelo y extendiendo los codos por completo.', equipamiento: 'Ninguno' },
        { id: 'e3', nombre: 'Pull-up', categoria: 'Gimnasia', descripcion: 'Dominadas en barra fija. Pasar la barbilla por encima de la barra utilizando kipping, mariposa o estricta.', equipamiento: 'Barra de dominadas' },
        { id: 'e4', nombre: 'Chest-to-Bar Pull-up', categoria: 'Gimnasia', descripcion: 'Dominadas tocando el pecho con la barra debajo de las clavículas.', equipamiento: 'Barra de dominadas' },
        { id: 'e5', nombre: 'Bar Muscle-up', categoria: 'Gimnasia', descripcion: 'Transición gimnástica para pasar desde suspensión a apoyo sobre la barra extendiendo los codos.', equipamiento: 'Barra de dominadas' },
        { id: 'e6', nombre: 'Ring Muscle-up', categoria: 'Gimnasia', descripcion: 'Transición gimnástica en anillas desde suspensión a apoyo sobre las mismas extendiendo los codos.', equipamiento: 'Anillas de gimnasia' },
        { id: 'e7', nombre: 'Toes-to-Bar (T2B)', categoria: 'Gimnasia', descripcion: 'Colgado de la barra, llevar ambos pies simultáneamente a tocar la barra entre las manos.', equipamiento: 'Barra de dominadas' },
        { id: 'e8', nombre: 'Knees-to-Elbows (K2E)', categoria: 'Gimnasia', descripcion: 'Colgado de la barra, llevar las rodillas a tocar los codos.', equipamiento: 'Barra de dominadas' },
        { id: 'e9', nombre: 'Handstand Push-up (HSPU)', categoria: 'Gimnasia', descripcion: 'Flexiones haciendo el pino apoyado contra la pared. Se permite kipping o estricto.', equipamiento: 'Pared / Abmat' },
        { id: 'e10', nombre: 'Handstand Walk', categoria: 'Gimnasia', descripcion: 'Caminar sobre las manos con el cuerpo invertido manteniendo el core activo.', equipamiento: 'Ninguno' },
        { id: 'e11', nombre: 'Burpee', categoria: 'Gimnasia', descripcion: 'Llevar el pecho al suelo, ponerse de pie y realizar un salto con aplauso sobre la cabeza.', equipamiento: 'Ninguno' },
        { id: 'e12', nombre: 'Pistol Squat', categoria: 'Gimnasia', descripcion: 'Sentadilla profunda a una sola pierna manteniendo la otra extendida hacia el frente sin tocar el suelo.', equipamiento: 'Ninguno' },
        { id: 'e13', nombre: 'GHD Sit-up', categoria: 'Gimnasia', descripcion: 'Abdominales en el banco de GHD, tocando el suelo detrás con las manos y luego regresando a tocar el rodillo.', equipamiento: 'Banco GHD' },
        { id: 'e14', nombre: 'Rope Climb', categoria: 'Gimnasia', descripcion: 'Trepar por la cuerda hasta una marca determinada utilizando técnica de pies (J-cup o wrap).', equipamiento: 'Cuerda de trepa' },
        { id: 'e15', nombre: 'Double Under (DU)', categoria: 'Monoestructural', descripcion: 'Salto doble de comba. La cuerda pasa dos veces por debajo de los pies en un solo salto.', equipamiento: 'Comba / Cuerda' },
        { id: 'e16', nombre: 'Row (Remo)', categoria: 'Monoestructural', descripcion: 'Ejercicio cardiovascular en remo indoor medido en calorías o metros.', equipamiento: 'Remo Concept2' },
        { id: 'e17', nombre: 'Run (Carrera)', categoria: 'Monoestructural', descripcion: 'Carrera a pie al aire libre o en cinta para desarrollo aeróbico.', equipamiento: 'Ninguno' },
        { id: 'e18', nombre: 'Box Jump', categoria: 'Monoestructural', descripcion: 'Salto a un cajón de madera o espuma, extendiendo la cadera por completo arriba.', equipamiento: 'Cajón (Box)' },
        { id: 'e19', nombre: 'Box Jump Over', categoria: 'Monoestructural', descripcion: 'Salto sobre el cajón sin necesidad de extender la cadera en el tope, descendiendo por el otro lado.', equipamiento: 'Cajón (Box)' },
        { id: 'e20', nombre: 'Wall Ball Shot', categoria: 'Monoestructural', descripcion: 'Lanzamiento de balón medicinal a una diana a 9 o 10 pies tras hacer una sentadilla profunda.', equipamiento: 'Balón Medicinal' },
        { id: 'e21', nombre: 'Clean & Jerk', categoria: 'Halterofilia', descripcion: 'Levantamiento de la barra en dos tiempos: desde el suelo a los hombros (clean) y luego sobre la cabeza (jerk).', equipamiento: 'Barra' },
        { id: 'e22', nombre: 'Power Clean', categoria: 'Halterofilia', descripcion: 'Cargar la barra del suelo a los hombros recibiéndola en una posición de media sentadilla.', equipamiento: 'Barra' },
        { id: 'e23', nombre: 'Squat Clean', categoria: 'Halterofilia', descripcion: 'Cargar la barra del suelo a los hombros recibiéndola en sentadilla profunda.', equipamiento: 'Barra' },
        { id: 'e24', nombre: 'Hang Clean', categoria: 'Halterofilia', descripcion: 'Cargar la barra comenzando desde una posición colgante (sobre las rodillas) hasta los hombros.', equipamiento: 'Barra' },
        { id: 'e25', nombre: 'Snatch', categoria: 'Halterofilia', descripcion: 'Arrancada. Levantamiento de la barra en un solo movimiento desde el suelo a por encima de la cabeza recibiendo abajo.', equipamiento: 'Barra' },
        { id: 'e26', nombre: 'Power Snatch', categoria: 'Halterofilia', descripcion: 'Arrancada recibiendo la barra por encima de la cabeza en media sentadilla.', equipamiento: 'Barra' },
        { id: 'e27', nombre: 'Squat Snatch', categoria: 'Halterofilia', descripcion: 'Arrancada recibiendo la barra en sentadilla profunda con extensión completa de brazos.', equipamiento: 'Barra' },
        { id: 'e28', nombre: 'Hang Snatch', categoria: 'Halterofilia', descripcion: 'Arrancada comenzando desde una posición colgante (sobre las rodillas) directo a sobre la cabeza.', equipamiento: 'Barra' },
        { id: 'e29', nombre: 'Deadlift', categoria: 'Halterofilia', descripcion: 'Peso muerto. Levantar la barra desde el suelo hasta la extensión completa de la cadera.', equipamiento: 'Barra' },
        { id: 'e30', nombre: 'Sumo Deadlift High Pull', categoria: 'Halterofilia', descripcion: 'Peso muerto con postura ancha (sumo) y jalón alto llevando la barra hasta la barbilla.', equipamiento: 'Barra' },
        { id: 'e31', nombre: 'Thruster', categoria: 'Halterofilia', descripcion: 'Combinación de una sentadilla frontal profunda seguida de un press de hombros en un solo movimiento continuo.', equipamiento: 'Barra' },
        { id: 'e32', nombre: 'Front Squat', categoria: 'Halterofilia', descripcion: 'Sentadilla con la barra apoyada en la parte delantera de los hombros en posición de rack.', equipamiento: 'Barra' },
        { id: 'e33', nombre: 'Back Squat', categoria: 'Halterofilia', descripcion: 'Sentadilla con la barra cargada en la parte trasera de los hombros.', equipamiento: 'Barra' },
        { id: 'e34', nombre: 'Overhead Squat', categoria: 'Halterofilia', descripcion: 'Sentadilla manteniendo la barra completamente extendida sobre la cabeza con agarre ancho (snatch grip).', equipamiento: 'Barra' },
        { id: 'e35', nombre: 'Push Press', categoria: 'Halterofilia', descripcion: 'Press de hombros utilizando un ligero impulso de piernas (dip & drive) sin volver a flexionar rodillas.', equipamiento: 'Barra' },
        { id: 'e36', nombre: 'Push Jerk', categoria: 'Halterofilia', descripcion: 'Press de hombros impulsado con piernas y recibiendo con flexión de rodillas bajo la barra antes de extender.', equipamiento: 'Barra' },
        { id: 'e37', nombre: 'Kettlebell Swing (Americano)', categoria: 'Halterofilia', descripcion: 'Balanceo de kettlebell terminando con la pesa completamente vertical sobre la cabeza.', equipamiento: 'Pesa Rusa (Kettlebell)' },
        { id: 'e38', nombre: 'Dumbbell Snatch', categoria: 'Halterofilia', descripcion: 'Arrancada con mancuerna a una sola mano desde el suelo hasta arriba de la cabeza en un solo movimiento.', equipamiento: 'Mancuerna (Dumbbell)' },
        { id: 'e39', nombre: 'Devils Press', categoria: 'Halterofilia', descripcion: 'Combinación de un burpee sobre las mancuernas seguido de un swing/snatch con ambas mancuernas sobre la cabeza.', equipamiento: 'Mancuernas' },
        { id: 'e40', nombre: 'Turkish Get-up', categoria: 'Halterofilia', descripcion: 'Levantamiento turco. Pasar de acostado a estar de pie sosteniendo una mancuerna o kettlebell extendida arriba.', equipamiento: 'Pesa Rusa o Mancuerna' },
        { id: 'e41', nombre: 'Medicine Ball Clean', categoria: 'Halterofilia', descripcion: 'Cargar el balón medicinal desde el suelo recibiéndolo en una sentadilla profunda.', equipamiento: 'Balón Medicinal' },
        { id: 'e42', nombre: 'Jumping Squat', categoria: 'Gimnasia', descripcion: 'Sentadilla libre seguida de una extensión explosiva de cadera y rodillas para despegar los pies del suelo.', equipamiento: 'Ninguno' },
        { id: 'e43', nombre: 'Dumbbell Power Clean', categoria: 'Halterofilia', descripcion: 'Cargar las mancuernas desde el suelo hasta los hombros recibiéndolas en posición de media sentadilla.', equipamiento: 'Mancuernas' },
        { id: 'e44', nombre: 'Dumbbell Squat Clean', categoria: 'Halterofilia', descripcion: 'Cargar las mancuernas desde el suelo hasta los hombros recibiéndolas en una sentadilla profunda.', equipamiento: 'Mancuernas' },
        { id: 'e45', nombre: 'Double Dumbbell Snatch', categoria: 'Halterofilia', descripcion: 'Arrancada con dos mancuernas de manera simultánea desde el suelo hasta por encima de la cabeza.', equipamiento: 'Mancuernas' },
        { id: 'e46', nombre: 'Dumbbell Thruster', categoria: 'Halterofilia', descripcion: 'Sentadilla frontal profunda con mancuernas seguida de un empuje sobre la cabeza en un movimiento fluido.', equipamiento: 'Mancuernas' },
        { id: 'e47', nombre: 'Single-arm Dumbbell Thruster', categoria: 'Halterofilia', descripcion: 'Sentadilla profunda sosteniendo una sola mancuerna en posición de rack, seguida de un press sobre la cabeza.', equipamiento: 'Mancuerna (Dumbbell)' },
        { id: 'e48', nombre: 'Kettlebell Thruster', categoria: 'Halterofilia', descripcion: 'Sentadilla profunda sosteniendo una pesa rusa en rack, seguido de press sobre la cabeza.', equipamiento: 'Pesa Rusa (Kettlebell)' },
        { id: 'e49', nombre: 'Kettlebell Snatch', categoria: 'Halterofilia', descripcion: 'Arrancada con pesa rusa desde una posición de balanceo (swing) directo a sobre la cabeza a un brazo.', equipamiento: 'Pesa Rusa (Kettlebell)' },
        { id: 'e50', nombre: 'Kettlebell Clean', categoria: 'Halterofilia', descripcion: 'Cargar la pesa rusa desde el balanceo (swing) hasta la posición de rack en los hombros.', equipamiento: 'Pesa Rusa (Kettlebell)' },
        { id: 'e51', nombre: 'Dumbbell Deadlift', categoria: 'Halterofilia', descripcion: 'Peso muerto con dos mancuernas, tocando un extremo de cada mancuerna en el suelo a los costados del cuerpo.', equipamiento: 'Mancuernas' },
        { id: 'e52', nombre: 'Kettlebell Deadlift', categoria: 'Halterofilia', descripcion: 'Peso muerto levantando una o dos pesas rusas desde el suelo manteniendo la espalda neutra.', equipamiento: 'Pesa Rusa (Kettlebell)' },
        { id: 'e53', nombre: 'Dumbbell Front Squat', categoria: 'Halterofilia', descripcion: 'Sentadilla frontal sosteniendo un par de mancuernas sobre los hombros.', equipamiento: 'Mancuernas' },
        { id: 'e54', nombre: 'Goblet Squat', categoria: 'Halterofilia', descripcion: 'Sentadilla profunda sosteniendo una mancuerna o pesa rusa pegada al pecho.', equipamiento: 'Pesa Rusa o Mancuerna' },
        { id: 'e55', nombre: 'Kettlebell Swing (Ruso)', categoria: 'Halterofilia', descripcion: 'Balanceo de pesa rusa llevando el peso hasta la altura de los ojos.', equipamiento: 'Pesa Rusa (Kettlebell)' },
        { id: 'e56', nombre: 'Dumbbell Walking Lunge', categoria: 'Halterofilia', descripcion: 'Zancadas caminando sosteniendo mancuernas a los costados del cuerpo o sobre los hombros.', equipamiento: 'Mancuernas' },
        { id: 'e57', nombre: 'Burpee Box Jump Over', categoria: 'Monoestructural', descripcion: 'Realizar un burpee en el suelo y luego saltar por encima del cajón hacia el otro lado.', equipamiento: 'Cajón (Box)' },
        { id: 'e58', nombre: 'Burpee Pull-up', categoria: 'Gimnasia', descripcion: 'Realizar un burpee y, al ponerse de pie de un salto, colgarse de la barra y realizar una dominada.', equipamiento: 'Barra de dominadas' },
        { id: 'e59', nombre: 'Strict Pull-up', categoria: 'Gimnasia', descripcion: 'Dominadas estrictas en barra sin ayuda de impulso ni balanceo de piernas (kipping).', equipamiento: 'Barra de dominadas' },
        { id: 'e60', nombre: 'Strict Chest-to-Bar Pull-up', categoria: 'Gimnasia', descripcion: 'Dominadas estrictas llevando el pecho a tocar la barra fija por debajo de las clavículas.', equipamiento: 'Barra de dominadas' },
        { id: 'e61', nombre: 'Strict Handstand Push-up', categoria: 'Gimnasia', descripcion: 'Flexiones haciendo el pino de forma estrictamente de fuerza, sin balanceo de cadera (kipping).', equipamiento: 'Pared / Abmat' },
        { id: 'e62', nombre: 'Deficit Handstand Push-up', categoria: 'Gimnasia', descripcion: 'Flexiones de pino con las manos elevadas sobre discos o bloques para aumentar el rango de movimiento.', equipamiento: 'Pared / Discos' },
        { id: 'e63', nombre: 'Wall Walk', categoria: 'Gimnasia', descripcion: 'Caminar hacia atrás en la pared con las manos y los pies desde el suelo hasta quedar en vertical de pino de cara a la pared.', equipamiento: 'Pared' },
        { id: 'e64', nombre: 'Cossack Squat', categoria: 'Gimnasia', descripcion: 'Sentadilla lateral profunda a una sola pierna desplazando el peso hacia un lado mientras la otra pierna permanece extendida.', equipamiento: 'Ninguno' },
        { id: 'e65', nombre: 'Bulgarian Split Squat', categoria: 'Halterofilia', descripcion: 'Zancada estática con un pie elevado por detrás sobre un banco o cajón.', equipamiento: 'Banco / Cajón' },
        { id: 'e66', nombre: 'Dumbbell Push Press', categoria: 'Halterofilia', descripcion: 'Press de hombros con mancuernas utilizando impulso de piernas (dip and drive).', equipamiento: 'Mancuernas' },
        { id: 'e67', nombre: 'Dumbbell Push Jerk', categoria: 'Halterofilia', descripcion: 'Press de hombros con mancuernas impulsado con piernas y recibiendo con flexión de rodillas bajo el peso.', equipamiento: 'Mancuernas' },
        { id: 'e68', nombre: 'Kettlebell Windmill', categoria: 'Halterofilia', descripcion: 'Molino con pesa rusa, flexionando la cadera lateralmente mientras se sostiene una pesa rusa con el brazo totalmente extendido sobre la cabeza.', equipamiento: 'Pesa Rusa (Kettlebell)' },
        { id: 'e69', nombre: 'Dumbbell Overhead Carry', categoria: 'Halterofilia', descripcion: 'Caminar manteniendo una o dos mancuernas completamente extendidas sobre la cabeza.', equipamiento: 'Mancuernas' },
        { id: 'e70', nombre: 'Farmers Carry', categoria: 'Halterofilia', descripcion: 'Paseo del granjero cargando objetos pesados (mancuernas, kettlebells o barras de paseo) en cada mano a los costados del cuerpo.', equipamiento: 'Mancuernas o Pesas Rusas' },
        { id: 'e71', nombre: 'Walking Lunges', categoria: 'Gimnasia', descripcion: 'Zancadas alternas avanzando de manera continua hacia el frente tocando el suelo suavemente con la rodilla trasera.', equipamiento: 'Ninguno' },
        { id: 'e72', nombre: 'Barbell Walking Lunge', categoria: 'Halterofilia', descripcion: 'Zancadas caminando sosteniendo una barra cargada sobre los hombros (por detrás o por delante).', equipamiento: 'Barra' },
        { id: 'e73', nombre: 'Ring Dips', categoria: 'Gimnasia', descripcion: 'Fondos gimnásticos en anillas suspendidas, bajando hasta que los hombros toquen las anillas y extendiendo por completo.', equipamiento: 'Anillas de gimnasia' },
        { id: 'e74', nombre: 'Bar Dips', categoria: 'Gimnasia', descripcion: 'Fondos en barras paralelas descendiendo hasta romper los 90 grados en el codo y extendiendo arriba.', equipamiento: 'Barras Paralelas' },
        { id: 'e75', nombre: 'L-Sit', categoria: 'Gimnasia', descripcion: 'Sostener el cuerpo con brazos extendidos (en anillas, paralelas o suelo) manteniendo las piernas extendidas horizontalmente formando una L.', equipamiento: 'Barras Paralelas o Anillas' },
        { id: 'e76', nombre: 'V-ups', categoria: 'Gimnasia', descripcion: 'Abdominales en forma de V. Acostado, elevar simultáneamente el torso y las piernas extendidas para tocar las puntas de los pies.', equipamiento: 'Ninguno' },
        { id: 'e77', nombre: 'Hollow Rock', categoria: 'Gimnasia', descripcion: 'Balanceo en posición de hollow (barquito) manteniendo core activo y lumbares pegadas al suelo.', equipamiento: 'Ninguno' },
        { id: 'e78', nombre: 'Toes-to-rings (T2R)', categoria: 'Gimnasia', descripcion: 'Colgado de anillas, elevar las piernas hasta que ambos pies toquen simultáneamente las anillas de gimnasia.', equipamiento: 'Anillas de gimnasia' },
        { id: 'e79', nombre: 'Single Under', categoria: 'Monoestructural', descripcion: 'Salto simple de comba donde la cuerda pasa una sola vez bajo los pies.', equipamiento: 'Comba / Cuerda' },
        { id: 'e80', nombre: 'Crossover Double Under', categoria: 'Monoestructural', descripcion: 'Salto de comba cruzado doble. Combinación de saltos dobles cruzando los brazos alternamente en cada repetición.', equipamiento: 'Comba / Cuerda' },
        { id: 'e81', nombre: 'Assault Bike / Echo Bike', categoria: 'Monoestructural', descripcion: 'Trabajo aeróbico o interválico en bicicleta estática con ventilador y palancas de brazos.', equipamiento: 'Assault Bike' },
        { id: 'e82', nombre: 'SkiErg', categoria: 'Monoestructural', descripcion: 'Simulación de esquí de fondo en máquina Concept2 para acondicionamiento metabólico y fuerza de tracción.', equipamiento: 'SkiErg Concept2' },
        { id: 'e83', nombre: 'Sled Push', categoria: 'Monoestructural', descripcion: 'Empujar un trineo cargado con discos en una distancia determinada para fuerza y resistencia de piernas.', equipamiento: 'Trineo (Sled)' },
        { id: 'e84', nombre: 'Sled Pull', categoria: 'Monoestructural', descripcion: 'Arrastrar un trineo cargado hacia el cuerpo mediante una cuerda o arnés.', equipamiento: 'Trineo y Cuerda' },
        { id: 'e85', nombre: 'Sandbag Clean to Shoulder', categoria: 'Halterofilia', descripcion: 'Cargar un saco de arena (sandbag) desde el suelo hasta apoyarlo sobre uno de los hombros.', equipamiento: 'Saco de Arena (Sandbag)' },
        { id: 'e86', nombre: 'D-Ball Clean to Shoulder', categoria: 'Halterofilia', descripcion: 'Cargar una pelota pesada de goma (D-ball) desde el suelo y llevarla hasta el hombro.', equipamiento: 'D-Ball / Balón Pesado' },
        { id: 'e87', nombre: 'Dumbbell Bench Press', categoria: 'Halterofilia', descripcion: 'Press de banca acostado sobre un banco plano empujando un par de mancuernas.', equipamiento: 'Mancuernas y Banco' },
        { id: 'e88', nombre: 'Man Maker', categoria: 'Halterofilia', descripcion: 'Combinación de burpee sobre mancuernas, remo a una mano con cada brazo en plancha, flexión y thruster con las mancuernas al ponerse de pie.', equipamiento: 'Mancuernas' },
        { id: 'e89', nombre: 'Cluster', categoria: 'Halterofilia', descripcion: 'Combinación de un Squat Clean seguido directamente de un Thruster en una sola repetición continua.', equipamiento: 'Barra' },
        { id: 'e90', nombre: 'Baby Maker', categoria: 'Gimnasia', descripcion: 'Estiramiento y ejercicio de movilidad en cuclillas profundas abriendo las rodillas con los codos y sosteniendo los pies.', equipamiento: 'Ninguno' },
        { id: 'e91', nombre: 'Monster Walk', categoria: 'Gimnasia', descripcion: 'Caminar lateralmente o hacia adelante con una banda de resistencia alrededor de los tobillos o rodillas manteniendo una media sentadilla.', equipamiento: 'Banda elástica (Band)' },
        { id: 'e92', nombre: 'Bear Crawl', categoria: 'Gimnasia', descripcion: 'Caminar en cuatro puntos de apoyo (manos y pies) con las rodillas suspendidas cerca del suelo y la espalda recta.', equipamiento: 'Ninguno' },
        { id: 'e93', nombre: 'Crab Walk', categoria: 'Gimnasia', descripcion: 'Desplazamiento cuadrupédico boca arriba apoyado sobre las manos y las plantas de los pies.', equipamiento: 'Ninguno' },
        { id: 'e94', nombre: 'Dumbbell Cluster', categoria: 'Halterofilia', descripcion: 'Cargar las mancuernas desde el suelo hasta los hombros en sentadilla profunda y realizar un thruster.', equipamiento: 'Mancuernas' },
        { id: 'e95', nombre: 'Barbell Row', categoria: 'Halterofilia', descripcion: 'Remo con barra inclinando el torso al frente y jalando la barra hacia el abdomen.', equipamiento: 'Barra' },
        { id: 'e96', nombre: 'Dumbbell Row', categoria: 'Halterofilia', descripcion: 'Remo con mancuerna, apoyado en un banco o de pie con el torso inclinado.', equipamiento: 'Mancuerna (Dumbbell)' },
        { id: 'e97', nombre: 'Strict Press', categoria: 'Halterofilia', descripcion: 'Press militar estricto de hombros empujando la barra hacia arriba desde el pecho sin impulso de piernas.', equipamiento: 'Barra' },
        { id: 'e98', nombre: 'Overhead Lunge', categoria: 'Halterofilia', descripcion: 'Zancadas sosteniendo la barra, mancuerna o pesa rusa completamente extendida sobre la cabeza.', equipamiento: 'Barra o Mancuerna' },
        { id: 'e99', nombre: 'Dumbbell Lunge', categoria: 'Halterofilia', descripcion: 'Zancadas sosteniendo mancuernas a los costados del cuerpo.', equipamiento: 'Mancuernas' },
        { id: 'e100', nombre: 'Kettlebell Goblet Lunge', categoria: 'Halterofilia', descripcion: 'Zancadas sosteniendo una pesa rusa pegada al pecho en posición de goblet.', equipamiento: 'Pesa Rusa (Kettlebell)' },
        { id: 'e101', nombre: 'Plank (Plancha)', categoria: 'Gimnasia', descripcion: 'Sostener el cuerpo en línea recta apoyado sobre los antebrazos y las puntas de los pies, activando el core.', equipamiento: 'Ninguno' },
        { id: 'e102', nombre: 'Side Plank', categoria: 'Gimnasia', descripcion: 'Sostener el cuerpo lateralmente apoyado en un antebrazo y el lateral del pie.', equipamiento: 'Ninguno' },
        { id: 'e103', nombre: 'Superman Hold', categoria: 'Gimnasia', descripcion: 'Acostado boca abajo, elevar pecho, brazos y piernas extendidos contrayendo la cadena posterior.', equipamiento: 'Ninguno' },
        { id: 'e104', nombre: 'Good Morning', categoria: 'Halterofilia', descripcion: 'Bisagra de cadera inclinando el torso adelante con la barra sobre los hombros por detrás.', equipamiento: 'Barra' },
        { id: 'e105', nombre: 'Dumbbell Good Morning', categoria: 'Halterofilia', descripcion: 'Inclinación de torso adelante sosteniendo una mancuerna o disco pegado al pecho.', equipamiento: 'Mancuerna (Dumbbell)' },
        { id: 'e106', nombre: 'Dead Bug', categoria: 'Gimnasia', descripcion: 'Ejercicio de estabilidad de core coordinando la extensión de brazo y pierna contraria boca arriba.', equipamiento: 'Ninguno' },
        { id: 'e107', nombre: 'Bird Dog', categoria: 'Gimnasia', descripcion: 'Ejercicio cuadrupédico extendiendo simultáneamente un brazo y la pierna opuesta manteniendo la espalda neutra.', equipamiento: 'Ninguno' },
        { id: 'e108', nombre: 'Jefferson Curl', categoria: 'Halterofilia', descripcion: 'Flexión progresiva vértebra por vértebra de la columna hacia abajo sosteniendo un peso ligero desde un cajón.', equipamiento: 'Pesa Rusa o Mancuerna' },
        { id: 'e109', nombre: 'Russian Twist', categoria: 'Gimnasia', descripcion: 'Giros rusos para abdomen, sentado con piernas elevadas rotando el torso de lado a lado con o sin peso.', equipamiento: 'Disco o Balón Medicinal' },
        { id: 'e110', nombre: 'Wall Sit', categoria: 'Gimnasia', descripcion: 'Sostener sentadilla isométrica a 90 grados apoyando la espalda contra la pared.', equipamiento: 'Ninguno' },
        { id: 'e111', nombre: 'Glute Bridge', categoria: 'Gimnasia', descripcion: 'Elevación de cadera boca arriba apoyando hombros y plantas de pies.', equipamiento: 'Ninguno' },
        { id: 'e112', nombre: 'Barbell Hip Thrust', categoria: 'Halterofilia', descripcion: 'Empuje de cadera apoyando la espalda alta en un banco con una barra cargada sobre la pelvis.', equipamiento: 'Barra y Banco' },
        { id: 'e113', nombre: 'Dumbbell Hip Thrust', categoria: 'Halterofilia', descripcion: 'Empuje de cadera apoyando la espalda en banco con una mancuerna sobre la pelvis.', equipamiento: 'Mancuerna y Banco' },
        { id: 'e114', nombre: 'Single-leg Glute Bridge', categoria: 'Gimnasia', descripcion: 'Puente de glúteo a una sola pierna manteniendo la otra elevada.', equipamiento: 'Ninguno' },
        { id: 'e115', nombre: 'Calf Raises', categoria: 'Gimnasia', descripcion: 'Elevación de talones para trabajar los gemelos de pie.', equipamiento: 'Ninguno' },
        { id: 'e116', nombre: 'Triple Under', categoria: 'Monoestructural', descripcion: 'Salto triple de comba. La cuerda pasa tres veces por debajo de los pies en un solo salto.', equipamiento: 'Comba / Cuerda' },
        { id: 'e117', nombre: 'Hand Release Push-up', categoria: 'Gimnasia', descripcion: 'Flexión de brazos despegando brevemente las manos del suelo al tocar con el pecho antes de empujar.', equipamiento: 'Ninguno' },
        { id: 'e118', nombre: 'Clapping Push-up', categoria: 'Gimnasia', descripcion: 'Flexión pliométrica empujando con fuerza para dar un aplauso en el aire antes de recibir el cuerpo.', equipamiento: 'Ninguno' },
        { id: 'e119', nombre: 'Deficit Push-up', categoria: 'Gimnasia', descripcion: 'Flexión con manos elevadas sobre discos o paralelas para lograr mayor profundidad y rango.', equipamiento: 'Discos o Paralelas' },
        { id: 'e120', nombre: 'Strict Ring Dip', categoria: 'Gimnasia', descripcion: 'Fondos en anillas realizados estrictamente con fuerza de tríceps and pectoral, sin balanceo.', equipamiento: 'Anillas de gimnasia' },
        { id: 'e121', nombre: 'Kipping Ring Dip', categoria: 'Gimnasia', descripcion: 'Fondos en anillas utilizando flexión e impulso de cadera y rodillas (kipping) para subir.', equipamiento: 'Anillas de gimnasia' },
        { id: 'e122', nombre: 'Kipping Handstand Push-up', categoria: 'Gimnasia', descripcion: 'Flexiones de pino contra la pared utilizando el impulso de las piernas y la cadera.', equipamiento: 'Pared / Abmat' },
        { id: 'e123', nombre: 'Dragon Flag', categoria: 'Gimnasia', descripcion: 'Ejercicio abdominal avanzado elevando el cuerpo en una sola línea apoyado solo en hombros y cuello agarrando un soporte.', equipamiento: 'Soporte Fijo' },
        { id: 'e124', nombre: 'Toes-to-Bar (Strict)', categoria: 'Gimnasia', descripcion: 'Llevar los pies a la barra colgado de forma estrictamente de fuerza sin balanceo.', equipamiento: 'Barra de dominadas' },
        { id: 'e125', nombre: 'Chin-up', categoria: 'Gimnasia', descripcion: 'Dominadas con agarre supino (palmas hacia la cara), enfocando el esfuerzo en bíceps y dorsales.', equipamiento: 'Barra de dominadas' },
        { id: 'e126', nombre: 'Chest-to-Bar Chin-up', categoria: 'Gimnasia', descripcion: 'Dominadas supinas llevando el pecho a tocar la barra fija.', equipamiento: 'Barra de dominadas' },
        { id: 'e127', nombre: 'Tuck Jump', categoria: 'Gimnasia', descripcion: 'Salto vertical llevando las rodillas lo más alto posible hacia el pecho en el aire.', equipamiento: 'Ninguno' },
        { id: 'e128', nombre: 'Broad Jump', categoria: 'Monoestructural', descripcion: 'Salto largo desde parado buscando cubrir la máxima distancia horizontal.', equipamiento: 'Ninguno' },
        { id: 'e129', nombre: 'Banded Face Pull', categoria: 'Gimnasia', descripcion: 'Jalón hacia la cara con banda elástica para trabajar deltoides posterior y rotadores.', equipamiento: 'Banda elástica (Band)' },
        { id: 'e130', nombre: 'Banded Pull Apart', categoria: 'Gimnasia', descripcion: 'Abrir los brazos extendidos estirando una banda elástica frente al pecho.', equipamiento: 'Banda elástica (Band)' }
      ];
      localStorage.setItem('gf_ejercicios', JSON.stringify(mockEjercicios));
    }

    if (!localStorage.getItem('gf_wods')) {
      const mockWods = [
        {
          id: 'w1',
          titulo: 'WOD Hero: Murph',
          descripcion: 'El clásico Hero WOD en memoria del teniente Michael P. Murphy. Partición libre de flexiones, dominadas y sentadillas.',
          tipo: 'For Time',
          fecha: this.getDateOffset(0),
          created_at: new Date().toISOString()
        },
        {
          id: 'w2',
          titulo: 'AMRAP Acondicionamiento',
          descripcion: 'Mantener un ritmo constante en la carrera y acelerar en los burpees.',
          tipo: 'AMRAP',
          fecha: this.getDateOffset(-1),
          created_at: new Date().toISOString()
        },
        {
          id: 'w3',
          titulo: 'HIIT Quemador',
          descripcion: 'Tabata / HIIT metabólico de intervalos de alta intensidad.',
          tipo: 'HIIT',
          fecha: this.getDateOffset(1),
          created_at: new Date().toISOString()
        }
      ];
      localStorage.setItem('gf_wods', JSON.stringify(mockWods));
    }

    if (!localStorage.getItem('gf_wod_ejercicios')) {
      const mockWodEjercicios = [
        // Murph exercises
        { id: 'we1', wod_id: 'w1', ejercicio_id: 'e17', series: 1, repeticiones: '1.6 km', detalles: 'Correr al inicio', orden: 0 },
        { id: 'we2', wod_id: 'w1', ejercicio_id: 'e3', series: 10, repeticiones: '10', detalles: 'Dominadas estrictas o con kipping', orden: 1 },
        { id: 'we3', wod_id: 'w1', ejercicio_id: 'e2', series: 20, repeticiones: '20', detalles: 'Flexiones de brazos', orden: 2 },
        { id: 'we4', wod_id: 'w1', ejercicio_id: 'e1', series: 30, repeticiones: '30', detalles: 'Sentadillas libres', orden: 3 },
        { id: 'we5', wod_id: 'w1', ejercicio_id: 'e17', series: 1, repeticiones: '1.6 km', detalles: 'Correr al final', orden: 4 },
        
        // AMRAP exercises
        { id: 'we6', wod_id: 'w2', ejercicio_id: 'e11', series: null, repeticiones: '15', detalles: 'Burpees rápidos', orden: 0 },
        { id: 'we7', wod_id: 'w2', ejercicio_id: 'e15', series: null, repeticiones: '50', detalles: 'Saltos dobles de comba', orden: 1 },
        
        // HIIT exercises
        { id: 'we8', wod_id: 'w3', ejercicio_id: 'e20', series: 8, repeticiones: '20s/10s', detalles: 'Wall ball pesada', orden: 0 },
        { id: 'we9', wod_id: 'w3', ejercicio_id: 'e16', series: 8, repeticiones: '20s/10s', detalles: 'Remo Concept2 caloría máxima', orden: 1 }
      ];
      localStorage.setItem('gf_wod_ejercicios', JSON.stringify(mockWodEjercicios));
    }

    if (!localStorage.getItem('gf_usuarios')) {
      const mockUsuarios: Usuario[] = [
        { id: 'u_root', nombre: 'Usuario Root', email: 'root@gymflow.com', rol: 'admin', telefono: '555-0000', contrasena: '123456', activo: true, created_at: new Date().toISOString() },
        { id: 'u1', nombre: 'Administrador GymFlow', email: 'admin@gymflow.com', rol: 'admin', telefono: '555-0100', contrasena: '123456', activo: true, created_at: new Date().toISOString() },
        { id: 'u2', nombre: 'Coach Entrenador', email: 'coach@gymflow.com', rol: 'coach', telefono: '555-0200', contrasena: '123456', activo: true, created_at: new Date().toISOString() },
        { id: 'u3', nombre: 'Recepcionista GymFlow', email: 'recepcion@gymflow.com', rol: 'recepcion', telefono: '555-0300', contrasena: '123456', activo: true, created_at: new Date().toISOString() }
      ];
      localStorage.setItem('gf_usuarios', JSON.stringify(mockUsuarios));
    }

    if (!localStorage.getItem('gf_marcas_miembros')) {
      const mockMarcas: MarcaMiembro[] = [
        // Carlos Gómez (m1)
        { id: 'sc1', miembro_id: 'm1', ejercicio_id: 'e33', valor: 140, unidad: 'kg', fecha: this.getDateOffset(-30), notas: 'RP anterior, se sintió pesado' },
        { id: 'sc2', miembro_id: 'm1', ejercicio_id: 'e33', valor: 145, unidad: 'kg', fecha: this.getDateOffset(-10), notas: 'Nuevo RP! Sentadilla trasera sólida' },
        { id: 'sc3', miembro_id: 'm1', ejercicio_id: 'e29', valor: 180, unidad: 'kg', fecha: this.getDateOffset(-25), notas: 'Peso muerto RP' },
        { id: 'sc4', miembro_id: 'm1', ejercicio_id: 'e21', valor: 100, unidad: 'kg', fecha: this.getDateOffset(-5), notas: 'Clean & Jerk split jerk' },
        { id: 'sc5', miembro_id: 'm1', ejercicio_id: 'e3', valor: 25, unidad: 'reps', fecha: this.getDateOffset(-20), notas: 'Pull-ups unbroken kipping' },
        { id: 'sc6', miembro_id: 'm1', ejercicio_id: 'e17', valor: 390, unidad: 'segundos', fecha: this.getDateOffset(-15), notas: 'Carrera 1600m PR (6:30)' },

        // Sofía Rodríguez (m2)
        { id: 'sc7', miembro_id: 'm2', ejercicio_id: 'e33', valor: 95, unidad: 'kg', fecha: this.getDateOffset(-15), notas: 'Back squat PR' },
        { id: 'sc8', miembro_id: 'm2', ejercicio_id: 'e29', valor: 115, unidad: 'kg', fecha: this.getDateOffset(-8), notas: 'Deadlift PR' },
        { id: 'sc9', miembro_id: 'm2', ejercicio_id: 'e3', valor: 32, unidad: 'reps', fecha: this.getDateOffset(-12), notas: 'Pull-ups unbroken butterflies' },
        { id: 'sc10', miembro_id: 'm2', ejercicio_id: 'e5', valor: 12, unidad: 'reps', fecha: this.getDateOffset(-3), notas: 'Bar muscle-ups unbroken' },
        { id: 'sc11', miembro_id: 'm2', ejercicio_id: 'e17', valor: 375, unidad: 'segundos', fecha: this.getDateOffset(-22), notas: '1600m run PR (6:15)' },

        // Martín Silva (m3)
        { id: 'sc12', miembro_id: 'm3', ejercicio_id: 'e33', valor: 110, unidad: 'kg', fecha: this.getDateOffset(-30), notas: 'Back squat' },
        { id: 'sc13', miembro_id: 'm3', ejercicio_id: 'e29', valor: 140, unidad: 'kg', fecha: this.getDateOffset(-20), notas: 'Deadlift' },
        { id: 'sc14', miembro_id: 'm3', ejercicio_id: 'e3', valor: 15, unidad: 'reps', fecha: this.getDateOffset(-5), notas: 'Strict pull-ups' },

        // Lucía Fernández (m4)
        { id: 'sc15', miembro_id: 'm4', ejercicio_id: 'e33', valor: 105, unidad: 'kg', fecha: this.getDateOffset(-40), notas: 'RP anterior' },
        { id: 'sc16', miembro_id: 'm4', ejercicio_id: 'e33', valor: 110, unidad: 'kg', fecha: this.getDateOffset(-5), notas: 'Back squat PR' },
        { id: 'sc17', miembro_id: 'm4', ejercicio_id: 'e25', valor: 70, unidad: 'kg', fecha: this.getDateOffset(-12), notas: 'Snatch squat' },
        { id: 'sc18', miembro_id: 'm4', ejercicio_id: 'e21', valor: 85, unidad: 'kg', fecha: this.getDateOffset(-2), notas: 'Clean & Jerk PR' }
      ];
      localStorage.setItem('gf_marcas_miembros', JSON.stringify(mockMarcas));
    }
  }

  private getDateOffset(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

  private getDateTimeOffset(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
  }

  // --- CRUD DE PLANES ---
  getPlanes(): Observable<Plan[]> {
    if (this.isMockMode) {
      const planes = JSON.parse(localStorage.getItem('gf_planes') || '[]');
      return of(planes);
    }

    return this.supabaseQuery(
      this.supabase!.from('planes').select('*').order('precio', { ascending: true })
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data || [];
      }),
      catchError(err => throwError(() => err))
    );
  }

  createPlan(plan: Omit<Plan, 'id' | 'created_at'>): Observable<Plan> {
    if (this.isMockMode) {
      const planes = JSON.parse(localStorage.getItem('gf_planes') || '[]');
      const newPlan: Plan = {
        ...plan,
        id: 'p_' + Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString()
      };
      planes.push(newPlan);
      localStorage.setItem('gf_planes', JSON.stringify(planes));
      return of(newPlan);
    }

    return this.supabaseQuery(
      this.supabase!.from('planes').insert([plan]).select().single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data;
      }),
      catchError(err => throwError(() => err))
    );
  }

  updatePlan(id: string, plan: Partial<Plan>): Observable<Plan> {
    if (this.isMockMode) {
      const planes = JSON.parse(localStorage.getItem('gf_planes') || '[]');
      const index = planes.findIndex((p: Plan) => p.id === id);
      if (index !== -1) {
        planes[index] = { ...planes[index], ...plan };
        localStorage.setItem('gf_planes', JSON.stringify(planes));
        return of(planes[index]);
      }
      return throwError(() => new Error('Plan no encontrado'));
    }

    return this.supabaseQuery(
      this.supabase!.from('planes').update(plan).eq('id', id).select().single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data;
      }),
      catchError(err => throwError(() => err))
    );
  }

  deletePlan(id: string): Observable<boolean> {
    if (this.isMockMode) {
      let planes = JSON.parse(localStorage.getItem('gf_planes') || '[]');
      planes = planes.filter((p: Plan) => p.id !== id);
      localStorage.setItem('gf_planes', JSON.stringify(planes));
      return of(true);
    }

    return this.supabaseQuery(
      this.supabase!.from('planes').delete().eq('id', id)
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return true;
      }),
      catchError(err => throwError(() => err))
    );
  }

  // --- CRUD DE MIEMBROS ---
  getMiembros(): Observable<Miembro[]> {
    if (this.isMockMode) {
      const miembros = JSON.parse(localStorage.getItem('gf_miembros') || '[]');
      const planes = JSON.parse(localStorage.getItem('gf_planes') || '[]');
      const populated = miembros.map((m: Miembro) => ({
        ...m,
        plan: planes.find((p: Plan) => p.id === m.plan_id) || undefined
      }));
      return of(populated);
    }

    return this.supabaseQuery(
      this.supabase!.from('miembros').select('*, planes(*)').order('nombre')
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return (response.data || []).map((m: any) => {
          const { planes, ...miembro } = m;
          return {
            ...miembro,
            plan: planes || undefined
          };
        });
      }),
      catchError(err => throwError(() => err))
    );
  }

  createMiembro(miembro: Omit<Miembro, 'id' | 'created_at'>): Observable<Miembro> {
    if (this.isMockMode) {
      const miembros = JSON.parse(localStorage.getItem('gf_miembros') || '[]');
      const newMiembro: Miembro = {
        ...miembro,
        id: 'm_' + Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString()
      };
      miembros.push(newMiembro);
      localStorage.setItem('gf_miembros', JSON.stringify(miembros));
      
      const planes = JSON.parse(localStorage.getItem('gf_planes') || '[]');
      newMiembro.plan = planes.find((p: Plan) => p.id === newMiembro.plan_id) || undefined;
      return of(newMiembro);
    }

    return this.supabaseQuery(
      this.supabase!.from('miembros').insert([miembro]).select().single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data;
      }),
      catchError(err => throwError(() => err))
    );
  }

  updateMiembro(id: string, miembro: Partial<Miembro>): Observable<Miembro> {
    if (this.isMockMode) {
      const miembros = JSON.parse(localStorage.getItem('gf_miembros') || '[]');
      const index = miembros.findIndex((m: Miembro) => m.id === id);
      if (index !== -1) {
        miembros[index] = { ...miembros[index], ...miembro };
        localStorage.setItem('gf_miembros', JSON.stringify(miembros));
        
        const planes = JSON.parse(localStorage.getItem('gf_planes') || '[]');
        miembros[index].plan = planes.find((p: Plan) => p.id === miembros[index].plan_id) || undefined;
        return of(miembros[index]);
      }
      return throwError(() => new Error('Miembro no encontrado'));
    }

    return this.supabaseQuery(
      this.supabase!.from('miembros').update(miembro).eq('id', id).select().single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data;
      }),
      catchError(err => throwError(() => err))
    );
  }

  deleteMiembro(id: string): Observable<boolean> {
    if (this.isMockMode) {
      let miembros = JSON.parse(localStorage.getItem('gf_miembros') || '[]');
      miembros = miembros.filter((m: Miembro) => m.id !== id);
      localStorage.setItem('gf_miembros', JSON.stringify(miembros));
      return of(true);
    }

    return this.supabaseQuery(
      this.supabase!.from('miembros').delete().eq('id', id)
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return true;
      }),
      catchError(err => throwError(() => err))
    );
  }

  // --- GESTIÓN DE PAGOS ---
  getPagos(): Observable<Pago[]> {
    if (this.isMockMode) {
      const pagos = JSON.parse(localStorage.getItem('gf_pagos') || '[]');
      const miembros = JSON.parse(localStorage.getItem('gf_miembros') || '[]');
      const populated = pagos.map((p: Pago) => ({
        ...p,
        miembro: miembros.find((m: Miembro) => m.id === p.miembro_id) || undefined
      })).sort((a: Pago, b: Pago) => new Date(b.fecha_pago).getTime() - new Date(a.fecha_pago).getTime());
      return of(populated);
    }

    return this.supabaseQuery(
      this.supabase!.from('pagos').select('*, miembros(*)').order('fecha_pago', { ascending: false })
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return (response.data || []).map((p: any) => {
          const { miembros, ...pago } = p;
          return {
            ...pago,
            miembro: miembros || undefined
          };
        });
      }),
      catchError(err => throwError(() => err))
    );
  }

  createPago(pago: Omit<Pago, 'id' | 'created_at' | 'fecha_pago'>): Observable<Pago> {
    if (this.isMockMode) {
      const pagos = JSON.parse(localStorage.getItem('gf_pagos') || '[]');
      const newPago: Pago = {
        ...pago,
        id: 'pay_' + Math.random().toString(36).substr(2, 9),
        fecha_pago: new Date().toISOString(),
        created_at: new Date().toISOString()
      };
      pagos.push(newPago);
      localStorage.setItem('gf_pagos', JSON.stringify(pagos));

      const miembros = JSON.parse(localStorage.getItem('gf_miembros') || '[]');
      newPago.miembro = miembros.find((m: Miembro) => m.id === newPago.miembro_id) || undefined;
      return of(newPago);
    }

    return this.supabaseQuery(
      this.supabase!.from('pagos').insert([pago]).select().single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data;
      }),
      catchError(err => throwError(() => err))
    );
  }

  // --- GESTIÓN DE ASISTENCIA ---
  getAsistencia(): Observable<Asistencia[]> {
    if (this.isMockMode) {
      const asistencia = JSON.parse(localStorage.getItem('gf_asistencia') || '[]');
      const miembros = JSON.parse(localStorage.getItem('gf_miembros') || '[]');
      const populated = asistencia.map((a: Asistencia) => ({
        ...a,
        miembro: miembros.find((m: Miembro) => m.id === a.miembro_id) || undefined
      })).sort((a: Asistencia, b: Asistencia) => new Date(b.fecha_hora).getTime() - new Date(a.fecha_hora).getTime());
      return of(populated);
    }

    return this.supabaseQuery(
      this.supabase!.from('asistencia').select('*, miembros(*)').order('fecha_hora', { ascending: false })
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return (response.data || []).map((a: any) => {
          const { miembros, ...asist } = a;
          return {
            ...asist,
            miembro: miembros || undefined
          };
        });
      }),
      catchError(err => throwError(() => err))
    );
  }

  createAsistencia(miembroId: string): Observable<Asistencia> {
    if (this.isMockMode) {
      const asistencia = JSON.parse(localStorage.getItem('gf_asistencia') || '[]');
      const newAsistencia: Asistencia = {
        id: 'ast_' + Math.random().toString(36).substr(2, 9),
        miembro_id: miembroId,
        fecha_hora: new Date().toISOString()
      };
      asistencia.push(newAsistencia);
      localStorage.setItem('gf_asistencia', JSON.stringify(asistencia));

      const miembros = JSON.parse(localStorage.getItem('gf_miembros') || '[]');
      newAsistencia.miembro = miembros.find((m: Miembro) => m.id === miembroId) || undefined;
      return of(newAsistencia);
    }

    const payload = { miembro_id: miembroId };
    return this.supabaseQuery(
      this.supabase!.from('asistencia').insert([payload]).select().single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data;
      }),
      catchError(err => throwError(() => err))
    );
  }

  // --- PLANTILLA DE ANAMNESIS ---
  getAnamnesisPlantilla(): Observable<PreguntaAnamnesis[]> {
    if (this.isMockMode) {
      const preguntas = JSON.parse(localStorage.getItem('gf_anamnesis_plantilla') || '[]');
      return of(preguntas);
    }

    return this.supabaseQuery(
      this.supabase!.from('anamnesis_plantilla').select('preguntas').eq('id', 'default').single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data?.preguntas || [];
      }),
      catchError(err => throwError(() => err))
    );
  }

  saveAnamnesisPlantilla(preguntas: PreguntaAnamnesis[]): Observable<boolean> {
    if (this.isMockMode) {
      localStorage.setItem('gf_anamnesis_plantilla', JSON.stringify(preguntas));
      return of(true);
    }

    return this.supabaseQuery(
      this.supabase!.from('anamnesis_plantilla').upsert({ id: 'default', preguntas: preguntas })
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return true;
      }),
      catchError(err => throwError(() => err))
    );
  }

  // --- CRUD DE EJERCICIOS ---
  getEjercicios(): Observable<Ejercicio[]> {
    if (this.isMockMode) {
      const ejercicios = JSON.parse(localStorage.getItem('gf_ejercicios') || '[]');
      return of(ejercicios);
    }

    return this.supabaseQuery(
      this.supabase!.from('ejercicios').select('*').order('nombre', { ascending: true })
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data || [];
      }),
      catchError(err => throwError(() => err))
    );
  }

  createEjercicio(ejercicio: Omit<Ejercicio, 'id' | 'created_at'>): Observable<Ejercicio> {
    if (this.isMockMode) {
      const ejercicios = JSON.parse(localStorage.getItem('gf_ejercicios') || '[]');
      const newEjercicio: Ejercicio = {
        ...ejercicio,
        id: 'e_' + Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString()
      };
      ejercicios.push(newEjercicio);
      localStorage.setItem('gf_ejercicios', JSON.stringify(ejercicios));
      return of(newEjercicio);
    }

    return this.supabaseQuery(
      this.supabase!.from('ejercicios').insert([ejercicio]).select().single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data;
      }),
      catchError(err => throwError(() => err))
    );
  }

  updateEjercicio(id: string, ejercicio: Partial<Ejercicio>): Observable<Ejercicio> {
    if (this.isMockMode) {
      const ejercicios = JSON.parse(localStorage.getItem('gf_ejercicios') || '[]');
      const index = ejercicios.findIndex((e: Ejercicio) => e.id === id);
      if (index !== -1) {
        ejercicios[index] = { ...ejercicios[index], ...ejercicio };
        localStorage.setItem('gf_ejercicios', JSON.stringify(ejercicios));
        return of(ejercicios[index]);
      }
      return throwError(() => new Error('Ejercicio no encontrado'));
    }

    return this.supabaseQuery(
      this.supabase!.from('ejercicios').update(ejercicio).eq('id', id).select().single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data;
      }),
      catchError(err => throwError(() => err))
    );
  }

  deleteEjercicio(id: string): Observable<boolean> {
    if (this.isMockMode) {
      let ejercicios = JSON.parse(localStorage.getItem('gf_ejercicios') || '[]');
      ejercicios = ejercicios.filter((e: Ejercicio) => e.id !== id);
      localStorage.setItem('gf_ejercicios', JSON.stringify(ejercicios));
      return of(true);
    }

    return this.supabaseQuery(
      this.supabase!.from('ejercicios').delete().eq('id', id)
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return true;
      }),
      catchError(err => throwError(() => err))
    );
  }

  // --- CRUD DE WODs ---
  getWods(fecha?: string): Observable<Wod[]> {
    if (this.isMockMode) {
      const wods: Wod[] = JSON.parse(localStorage.getItem('gf_wods') || '[]');
      const wodEjercicios: WodEjercicio[] = JSON.parse(localStorage.getItem('gf_wod_ejercicios') || '[]');
      const ejercicios: Ejercicio[] = JSON.parse(localStorage.getItem('gf_ejercicios') || '[]');

      let filteredWods = wods;
      if (fecha) {
        filteredWods = wods.filter(w => w.fecha === fecha);
      }

      const populated = filteredWods.map(w => {
        const matchingEjercicios = wodEjercicios
          .filter(we => we.wod_id === w.id)
          .map(we => ({
            ...we,
            ejercicio: ejercicios.find(e => e.id === we.ejercicio_id)
          }))
          .sort((a, b) => a.orden - b.orden);
        return {
          ...w,
          wod_ejercicios: matchingEjercicios
        };
      });

      return of(populated);
    }

    let query = this.supabase!.from('wods').select(`
      *,
      wod_ejercicios (
        *,
        ejercicio:ejercicios (*)
      )
    `);

    if (fecha) {
      query = query.eq('fecha', fecha);
    }

    return this.supabaseQuery(query).pipe(
      map(response => {
        if (response.error) throw response.error;
        const data = response.data || [];
        return data.map((wod: any) => {
          if (wod.wod_ejercicios) {
            wod.wod_ejercicios.sort((a: any, b: any) => a.orden - b.orden);
          }
          return wod as Wod;
        });
      }),
      catchError(err => throwError(() => err))
    );
  }

  createWod(wod: Omit<Wod, 'id' | 'created_at'>, ejercicios: Omit<WodEjercicio, 'id' | 'wod_id'>[]): Observable<Wod> {
    if (this.isMockMode) {
      const wods: Wod[] = JSON.parse(localStorage.getItem('gf_wods') || '[]');
      const wodEjercicios: WodEjercicio[] = JSON.parse(localStorage.getItem('gf_wod_ejercicios') || '[]');
      
      const newWodId = 'w_' + Math.random().toString(36).substr(2, 9);
      const newWod: Wod = {
        ...wod,
        id: newWodId,
        created_at: new Date().toISOString()
      };
      
      const newWodEjercicios: WodEjercicio[] = ejercicios.map((we, index) => ({
        ...we,
        id: 'we_' + Math.random().toString(36).substr(2, 9),
        wod_id: newWodId,
        orden: we.orden !== undefined ? we.orden : index
      }));
      
      wods.push(newWod);
      wodEjercicios.push(...newWodEjercicios);
      
      localStorage.setItem('gf_wods', JSON.stringify(wods));
      localStorage.setItem('gf_wod_ejercicios', JSON.stringify(wodEjercicios));
      
      const ejerciciosCatalog: Ejercicio[] = JSON.parse(localStorage.getItem('gf_ejercicios') || '[]');
      newWod.wod_ejercicios = newWodEjercicios.map(we => ({
        ...we,
        ejercicio: ejerciciosCatalog.find(e => e.id === we.ejercicio_id)
      })).sort((a, b) => a.orden - b.orden);
      
      return of(newWod);
    }

    return this.supabaseQuery(
      this.supabase!.from('wods').insert([wod]).select().single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data as Wod;
      }),
      switchMap((createdWod: Wod) => {
        if (ejercicios.length === 0) {
          return of({ ...createdWod, wod_ejercicios: [] });
        }
        const relationPayload = ejercicios.map((we, idx) => ({
          wod_id: createdWod.id,
          ejercicio_id: we.ejercicio_id,
          series: we.series,
          repeticiones: we.repeticiones,
          detalles: we.detalles,
          orden: we.orden !== undefined ? we.orden : idx
        }));
        
        return this.supabaseQuery(
          this.supabase!.from('wod_ejercicios').insert(relationPayload).select(`
            *,
            ejercicio:ejercicios (*)
          `)
        ).pipe(
          map(response2 => {
            if (response2.error) throw response2.error;
            const insertedRelations = (response2.data || []) as WodEjercicio[];
            insertedRelations.sort((a, b) => a.orden - b.orden);
            return {
              ...createdWod,
              wod_ejercicios: insertedRelations
            };
          })
        );
      }),
      catchError(err => throwError(() => err))
    );
  }

  updateWod(id: string, wod: Partial<Wod>, ejercicios: Omit<WodEjercicio, 'id' | 'wod_id'>[]): Observable<Wod> {
    if (this.isMockMode) {
      const wods: Wod[] = JSON.parse(localStorage.getItem('gf_wods') || '[]');
      let wodEjercicios: WodEjercicio[] = JSON.parse(localStorage.getItem('gf_wod_ejercicios') || '[]');
      
      const index = wods.findIndex(w => w.id === id);
      if (index === -1) return throwError(() => new Error('WOD no encontrado'));
      
      wods[index] = {
        ...wods[index],
        ...wod
      };
      
      wodEjercicios = wodEjercicios.filter(we => we.wod_id !== id);
      
      const newWodEjercicios: WodEjercicio[] = ejercicios.map((we, idx) => ({
        ...we,
        id: 'we_' + Math.random().toString(36).substr(2, 9),
        wod_id: id,
        orden: we.orden !== undefined ? we.orden : idx
      }));
      
      wodEjercicios.push(...newWodEjercicios);
      
      localStorage.setItem('gf_wods', JSON.stringify(wods));
      localStorage.setItem('gf_wod_ejercicios', JSON.stringify(wodEjercicios));
      
      const ejerciciosCatalog: Ejercicio[] = JSON.parse(localStorage.getItem('gf_ejercicios') || '[]');
      const updatedWod = {
        ...wods[index],
        wod_ejercicios: newWodEjercicios.map(we => ({
          ...we,
          ejercicio: ejerciciosCatalog.find(e => e.id === we.ejercicio_id)
        })).sort((a, b) => a.orden - b.orden)
      };
      
      return of(updatedWod);
    }

    const cleanWod = { ...wod };
    delete cleanWod.wod_ejercicios;

    return this.supabaseQuery(
      this.supabase!.from('wods').update(cleanWod).eq('id', id).select().single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data as Wod;
      }),
      switchMap((updatedWod: Wod) => {
        return this.supabaseQuery(
          this.supabase!.from('wod_ejercicios').delete().eq('wod_id', id)
        ).pipe(
          switchMap(() => {
            if (ejercicios.length === 0) {
              return of({ ...updatedWod, wod_ejercicios: [] });
            }
            const relationPayload = ejercicios.map((we, idx) => ({
              wod_id: id,
              ejercicio_id: we.ejercicio_id,
              series: we.series,
              repeticiones: we.repeticiones,
              detalles: we.detalles,
              orden: we.orden !== undefined ? we.orden : idx
            }));
            
            return this.supabaseQuery(
              this.supabase!.from('wod_ejercicios').insert(relationPayload).select(`
                *,
                ejercicio:ejercicios (*)
              `)
            ).pipe(
              map(response2 => {
                if (response2.error) throw response2.error;
                const insertedRelations = (response2.data || []) as WodEjercicio[];
                insertedRelations.sort((a, b) => a.orden - b.orden);
                return {
                  ...updatedWod,
                  wod_ejercicios: insertedRelations
                };
              })
            );
          })
        );
      }),
      catchError(err => throwError(() => err))
    );
  }

  deleteWod(id: string): Observable<boolean> {
    if (this.isMockMode) {
      let wods: Wod[] = JSON.parse(localStorage.getItem('gf_wods') || '[]');
      let wodEjercicios: WodEjercicio[] = JSON.parse(localStorage.getItem('gf_wod_ejercicios') || '[]');
      
      wods = wods.filter(w => w.id !== id);
      wodEjercicios = wodEjercicios.filter(we => we.wod_id !== id);
      
      localStorage.setItem('gf_wods', JSON.stringify(wods));
      localStorage.setItem('gf_wod_ejercicios', JSON.stringify(wodEjercicios));
      
      return of(true);
    }

    return this.supabaseQuery(
      this.supabase!.from('wods').delete().eq('id', id)
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return true;
      }),
      catchError(err => throwError(() => err))
    );
  }

  // --- CRUD DE USUARIOS ---
  getUsuarios(): Observable<Usuario[]> {
    if (this.isMockMode) {
      const usuarios = JSON.parse(localStorage.getItem('gf_usuarios') || '[]');
      return of(usuarios);
    }

    return this.supabaseQuery(
      this.supabase!.from('usuarios').select('*').order('nombre', { ascending: true })
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data || [];
      }),
      catchError(err => throwError(() => err))
    );
  }

  createUsuario(usuario: Omit<Usuario, 'id' | 'created_at'>): Observable<Usuario> {
    if (this.isMockMode) {
      const usuarios = JSON.parse(localStorage.getItem('gf_usuarios') || '[]');
      const newUsuario: Usuario = {
        ...usuario,
        id: 'u_' + Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString()
      };
      usuarios.push(newUsuario);
      localStorage.setItem('gf_usuarios', JSON.stringify(usuarios));
      return of(newUsuario);
    }

    return this.supabaseQuery(
      this.supabase!.from('usuarios').insert([usuario]).select().single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data;
      }),
      catchError(err => throwError(() => err))
    );
  }

  updateUsuario(id: string, usuario: Partial<Usuario>): Observable<Usuario> {
    if (this.isMockMode) {
      const usuarios = JSON.parse(localStorage.getItem('gf_usuarios') || '[]');
      const index = usuarios.findIndex((u: Usuario) => u.id === id);
      if (index !== -1) {
        usuarios[index] = { ...usuarios[index], ...usuario };
        localStorage.setItem('gf_usuarios', JSON.stringify(usuarios));
        return of(usuarios[index]);
      }
      return throwError(() => new Error('Usuario no encontrado'));
    }

    return this.supabaseQuery(
      this.supabase!.from('usuarios').update(usuario).eq('id', id).select().single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return response.data;
      }),
      catchError(err => throwError(() => err))
    );
  }

  deleteUsuario(id: string): Observable<boolean> {
    if (this.isMockMode) {
      let usuarios = JSON.parse(localStorage.getItem('gf_usuarios') || '[]');
      usuarios = usuarios.filter((u: Usuario) => u.id !== id);
      localStorage.setItem('gf_usuarios', JSON.stringify(usuarios));
      return of(true);
    }

    return this.supabaseQuery(
      this.supabase!.from('usuarios').delete().eq('id', id)
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return true;
      }),
      catchError(err => throwError(() => err))
    );
  }

  // --- RENDIMIENTO / MARCAS DE MIEMBROS ---
  getMarcas(miembroId?: string, ejercicioId?: string): Observable<MarcaMiembro[]> {
    if (this.isMockMode) {
      let marcas: MarcaMiembro[] = JSON.parse(localStorage.getItem('gf_marcas_miembros') || '[]');
      const miembros: Miembro[] = JSON.parse(localStorage.getItem('gf_miembros') || '[]');
      const ejercicios: Ejercicio[] = JSON.parse(localStorage.getItem('gf_ejercicios') || '[]');

      if (miembroId) {
        marcas = marcas.filter(m => m.miembro_id === miembroId);
      }
      if (ejercicioId) {
        marcas = marcas.filter(m => m.ejercicio_id === ejercicioId);
      }

      const populated = marcas.map(m => ({
        ...m,
        miembro: miembros.find(athlete => athlete.id === m.miembro_id),
        ejercicio: ejercicios.find(ex => ex.id === m.ejercicio_id)
      })).sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

      return of(populated);
    }

    let query = this.supabase!.from('marcas_miembros').select('*, miembros(*), ejercicios(*)');
    if (miembroId) {
      query = query.eq('miembro_id', miembroId);
    }
    if (ejercicioId) {
      query = query.eq('ejercicio_id', ejercicioId);
    }

    return this.supabaseQuery(query).pipe(
      map(response => {
        if (response.error) throw response.error;
        return (response.data || []).map((row: any) => {
          const { miembros, ejercicios, ...marca } = row;
          return {
            ...marca,
            miembro: miembros || undefined,
            ejercicio: ejercicios || undefined
          } as MarcaMiembro;
        });
      }),
      catchError(err => throwError(() => err))
    );
  }

  createMarca(marca: Omit<MarcaMiembro, 'id' | 'created_at'>): Observable<MarcaMiembro> {
    if (this.isMockMode) {
      const marcas: MarcaMiembro[] = JSON.parse(localStorage.getItem('gf_marcas_miembros') || '[]');
      const newMarca: MarcaMiembro = {
        ...marca,
        id: 'brand_' + Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString()
      };
      marcas.push(newMarca);
      localStorage.setItem('gf_marcas_miembros', JSON.stringify(marcas));

      // Populate relations for response
      const miembros: Miembro[] = JSON.parse(localStorage.getItem('gf_miembros') || '[]');
      const ejercicios: Ejercicio[] = JSON.parse(localStorage.getItem('gf_ejercicios') || '[]');
      newMarca.miembro = miembros.find(athlete => athlete.id === newMarca.miembro_id);
      newMarca.ejercicio = ejercicios.find(ex => ex.id === newMarca.ejercicio_id);

      return of(newMarca);
    }

    return this.supabaseQuery(
      this.supabase!.from('marcas_miembros').insert([marca]).select('*, miembros(*), ejercicios(*)').single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        const row = response.data;
        const { miembros, ejercicios, ...res } = row;
        return {
          ...res,
          miembro: miembros || undefined,
          ejercicio: ejercicios || undefined
        } as MarcaMiembro;
      }),
      catchError(err => throwError(() => err))
    );
  }

  updateMarca(id: string, marca: Partial<MarcaMiembro>): Observable<MarcaMiembro> {
    if (this.isMockMode) {
      const marcas: MarcaMiembro[] = JSON.parse(localStorage.getItem('gf_marcas_miembros') || '[]');
      const index = marcas.findIndex(m => m.id === id);
      if (index !== -1) {
        marcas[index] = { ...marcas[index], ...marca };
        localStorage.setItem('gf_marcas_miembros', JSON.stringify(marcas));

        const miembros: Miembro[] = JSON.parse(localStorage.getItem('gf_miembros') || '[]');
        const ejercicios: Ejercicio[] = JSON.parse(localStorage.getItem('gf_ejercicios') || '[]');
        marcas[index].miembro = miembros.find(athlete => athlete.id === marcas[index].miembro_id);
        marcas[index].ejercicio = ejercicios.find(ex => ex.id === marcas[index].ejercicio_id);

        return of(marcas[index]);
      }
      return throwError(() => new Error('Marca no encontrada'));
    }

    return this.supabaseQuery(
      this.supabase!.from('marcas_miembros').update(marca).eq('id', id).select('*, miembros(*), ejercicios(*)').single()
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        const row = response.data;
        const { miembros, ejercicios, ...res } = row;
        return {
          ...res,
          miembro: miembros || undefined,
          ejercicio: ejercicios || undefined
        } as MarcaMiembro;
      }),
      catchError(err => throwError(() => err))
    );
  }

  deleteMarca(id: string): Observable<boolean> {
    if (this.isMockMode) {
      let marcas = JSON.parse(localStorage.getItem('gf_marcas_miembros') || '[]');
      marcas = marcas.filter((m: MarcaMiembro) => m.id !== id);
      localStorage.setItem('gf_marcas_miembros', JSON.stringify(marcas));
      return of(true);
    }

    return this.supabaseQuery(
      this.supabase!.from('marcas_miembros').delete().eq('id', id)
    ).pipe(
      map(response => {
        if (response.error) throw response.error;
        return true;
      }),
      catchError(err => throwError(() => err))
    );
  }
}

