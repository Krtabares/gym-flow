import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { Ejercicio, WodEjercicio, WodTipo } from '../models';

interface ParsedWodResult {
  titulo: string;
  tipo: WodTipo;
  descripcion: string;
  ejercicios: Array<Omit<WodEjercicio, 'id' | 'wod_id'> & { matchedEjercicioName?: string }>;
}

@Injectable({
  providedIn: 'root'
})
export class WodParserService {
  private http = inject(HttpClient);

  // Mapeo estático de sinónimos comunes a IDs de ejercicios (e1 a e130...)
  // Esto cubre traducción e interpretaciones habituales de CrossFit
  private synonymToIdMap: Record<string, string> = {
    // Gimnasia
    "chest to bar pull up": "e4", "chest-to-bar pull-up": "e4", "chest to bar": "e4", "c2b": "e4", "chest-to-bar": "e4",
    "bar muscle up": "e5", "bar muscle-up": "e5", "bmu": "e5",
    "ring muscle up": "e6", "ring muscle-up": "e6", "rmu": "e6",
    "toes to bar": "e7", "toes-to-bar": "e7", "t2b": "e7", "pies a la barra": "e7", "pies a barra": "e7",
    "knees to elbows": "e8", "knees-to-elbows": "e8", "k2e": "e8", "rodillas a los codos": "e8", "rodillas a codos": "e8",
    "handstand push up": "e9", "handstand push-up": "e9", "hspu": "e9", "flexiones de pino": "e9", "flexiones haciendo el pino": "e9",
    "handstand walk": "e10", "caminar de manos": "e10", "caminata de manos": "e10", "hsw": "e10",
    "burpee box jump over": "e57", "burpee box jump-over": "e57", "bbjo": "e57",
    "burpee pull up": "e58", "burpee pull-up": "e58", "bpu": "e58",
    "burpee": "e11", "burpees": "e11",
    "pistol squat": "e12", "pistol squats": "e12", "pistols": "e12", "sentadilla a una pierna": "e12",
    "ghd sit up": "e13", "ghd sit-up": "e13", "ghd sit ups": "e13", "abdominales ghd": "e13", "ghd": "e13",
    "rope climb": "e14", "rope climbs": "e14", "trepa de cuerda": "e14", "subida de cuerda": "e14",
    "strict pull-up": "e59", "strict pull up": "e59", "dominada estricta": "e59", "dominadas estrictas": "e59",
    "strict chest-to-bar pull-up": "e60", "strict chest-to-bar": "e60", "dominadas estrictas al pecho": "e60",
    "strict handstand push-up": "e61", "strict hspu": "e61", "flexiones de pino estrictas": "e61",
    "deficit handstand push-up": "e62", "deficit hspu": "e62",
    "wall walk": "e63", "wall walks": "e63", "caminata a la barra": "e63",
    "cossack squat": "e64", "cossack squats": "e64", "sentadilla cosaca": "e64",
    "bulgarian split squat": "e65", "bulgarian split squats": "e65", "sentadilla bulgara": "e65",
    "ring dips": "e73", "fondos en anillas": "e73",
    "bar dips": "e74", "fondos en paralelas": "e74",
    "l-sit": "e75", "l sit": "e75",
    "v-ups": "e76", "v-up": "e76", "v ups": "e76", "abdominales en v": "e76",
    "hollow rock": "e77", "hollow rocks": "e77",
    "toes-to-rings": "e78", "t2r": "e78",
    "air squat": "e1", "sentadilla libre": "e1", "sentadillas libres": "e1", "sentadillas": "e1", "sentadilla": "e1",
    "push-up": "e2", "push-ups": "e2", "pushup": "e2", "pushups": "e2", "flexiones de brazos": "e2", "flexiones": "e2", "lagartijas": "e2",
    "pull-up": "e3", "pull-ups": "e3", "pullup": "e3", "pullups": "e3", "dominadas": "e3", "dominada": "e3",
    "plank": "e101", "plancha": "e101", "side plank": "e102", "plancha lateral": "e102",
    "superman hold": "e103", "dead bug": "e106", "bird dog": "e107", "wall sit": "e110",

    // Monoestructural
    "double under": "e15", "double-under": "e15", "double unders": "e15", "double-unders": "e15", "saltos dobles": "e15", "dobles de comba": "e15", "du": "e15", "dus": "e15",
    "single under": "e79", "single unders": "e79", "saltos simples": "e79", "simples de comba": "e79",
    "crossover double under": "e80", "crossover du": "e80",
    "assault bike": "e81", "echo bike": "e81", "bici assault": "e81", "assault": "e81",
    "skierg": "e82", "ski erg": "e82",
    "sled push": "e83", "empuje de trineo": "e83", "trineo": "e83",
    "sled pull": "e84",
    "row": "e16", "remo": "e16", "rower": "e16",
    "run": "e17", "carrera": "e17", "correr": "e17", "running": "e17",
    "box jump over": "e19", "box jump-over": "e19", "bjo": "e19", "saltos sobre cajon": "e19",
    "box jump": "e18", "box jumps": "e18", "salto al cajon": "e18", "saltos al cajon": "e18",
    "wall ball shot": "e20", "wall ball shots": "e20", "wall ball": "e20", "wallball": "e20", "wall balls": "e20", "wallballs": "e20", "lanzamiento de balon": "e20",
    "broad jump": "e128",

    // Halterofilia
    "clean & jerk": "e21", "clean and jerk": "e21", "dos tiempos": "e21", "cargada y envion": "e21",
    "power clean": "e22", "cargada de fuerza": "e22",
    "squat clean": "e23", "cargada en sentadilla": "e23",
    "hang clean": "e24", "cargada colgante": "e24",
    "cargada": "e22", "clean": "e22",
    "power snatch": "e26", "arrancada de fuerza": "e26",
    "squat snatch": "e27", "arrancada en sentadilla": "e27",
    "hang snatch": "e28", "arrancada colgante": "e28",
    "snatch": "e25", "arrancada": "e25",
    "sumo deadlift high pull": "e30", "sdhp": "e30",
    "deadlift": "e29", "peso muerto": "e29", "pesos muertos": "e29",
    "dumbbell snatch": "e38", "db snatch": "e38", "arrancada con mancuerna": "e38",
    "devils press": "e39", "devil press": "e39", "press del diablo": "e39",
    "turkish get up": "e40", "turkish get-up": "e40", "tgu": "e40", "levantamiento turco": "e40",
    "medicine ball clean": "e41", "med ball clean": "e41",
    "dumbbell power clean": "e43", "db power clean": "e43",
    "dumbbell squat clean": "e44", "db squat clean": "e44",
    "double dumbbell snatch": "e45", "db snatch doble": "e45",
    "dumbbell thruster": "e46", "db thruster": "e46", "thruster con mancuernas": "e46",
    "single-arm dumbbell thruster": "e47", "db thruster a un brazo": "e47",
    "kettlebell thruster": "e48", "kb thruster": "e48", "thruster con kettlebell": "e48",
    "kettlebell snatch": "e49", "kb snatch": "e49", "arrancada con kettlebell": "e49",
    "kettlebell clean": "e50", "kb clean": "e50", "cargada con kettlebell": "e50",
    "dumbbell deadlift": "e51", "db deadlift": "e51", "peso muerto con mancuernas": "e51",
    "kettlebell deadlift": "e52", "kb deadlift": "e52", "peso muerto con pesa rusa": "e52",
    "dumbbell front squat": "e53", "db front squat": "e53", "sentadilla frontal con mancuernas": "e53",
    "goblet squat": "e54", "sentadilla goblet": "e54",
    "kettlebell swing (americano)": "e37", "kettlebell swing americano": "e37", "american swing": "e37", "american kb swing": "e37",
    "kettlebell swing (ruso)": "e55", "kettlebell swing ruso": "e55", "russian swing": "e55", "russian kb swing": "e55", "swing ruso": "e55",
    "kettlebell swing": "e37", "kb swing": "e37", "swing de pesa rusa": "e37", "swing de kettlebell": "e37",
    "dumbbell walking lunge": "e56", "db walking lunge": "e56", "zancadas con mancuernas": "e56",
    "dumbbell push press": "e66", "db push press": "e66",
    "dumbbell push jerk": "e67", "db push jerk": "e67",
    "kettlebell windmill": "e68", "kb windmill": "e68",
    "dumbbell overhead carry": "e69", "db overhead carry": "e69",
    "farmers carry": "e70", "farmer carry": "e70", "farmer walk": "e70", "paseo del granjero": "e70",
    "barbell walking lunge": "e72", "zancadas con barra": "e72",
    "dumbbell bench press": "e87", "db bench press": "e87", "press de banca con mancuernas": "e87",
    "man maker": "e88", "manmaker": "e88",
    "cluster": "e89", "clusters": "e89",
    "dumbbell cluster": "e94", "db cluster": "e94",
    "barbell row": "e95", "remo con barra": "e95",
    "dumbbell row": "e96", "remo con mancuerna": "e96", "db row": "e96",
    "strict press": "e97", "press militar": "e97", "press estricto": "e97",
    "overhead lunge": "e98", "zancadas sobre la cabeza": "e98",
    "dumbbell lunge": "e99", "zancadas con mancuerna": "e99",
    "kettlebell goblet lunge": "e100", "zancadas goblet": "e100",
    "good morning": "e104", "buenos dias": "e104",
    "dumbbell good morning": "e105", "db buenos dias": "e105",
    "jefferson curl": "e108",
    "barbell hip thrust": "e112", "hip thrust con barra": "e112",
    "dumbbell hip thrust": "e113", "hip thrust con mancuerna": "e113",
    "thruster": "e31", "thrusters": "e31",
    "front squat": "e32", "sentadilla frontal": "e32",
    "back squat": "e33", "sentadilla trasera": "e33", "back squats": "e33",
    "overhead squat": "e34", "ohs": "e34", "sentadilla de arranque": "e34",
    "push press": "e35",
    "push jerk": "e36",
    "walking lunge": "e71", "walking lunges": "e71", "zancadas caminando": "e71", "zancadas": "e71", "zancada": "e71"
  };

  /**
   * PARSER LOCAL: Analiza el texto e intenta identificar múltiples bloques de entrenamiento.
   * Si no encuentra delimitadores de bloques, trata el texto completo como un solo bloque.
   * Funciona completamente offline y sin configuración.
   */
  parseWodText(text: string, catalog: Ejercicio[]): { bloques: ParsedWodResult[] } {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const bloques: ParsedWodResult[] = [];

    if (lines.length === 0) return { bloques };

    // Expresión regular para detectar el inicio de un bloque
    const blockHeaderRegex = /^\s*(?:\d+[\.\)]|bloque\s+[a-z0-9]|warm\s*up|calentamiento|fuerza|strength|weightlifting|metcon|finisher|w\.u|w\.d|f\.w)\b/i;

    interface RawBlock {
      header: string;
      lines: string[];
    }

    const rawBlocks: RawBlock[] = [];
    let currentBlock: RawBlock | null = null;

    for (const line of lines) {
      if (blockHeaderRegex.test(line)) {
        if (currentBlock) {
          rawBlocks.push(currentBlock);
        }
        currentBlock = {
          header: line,
          lines: []
        };
      } else {
        if (!currentBlock) {
          currentBlock = {
            header: 'Entrenamiento Principal',
            lines: []
          };
        }
        currentBlock.lines.push(line);
      }
    }

    if (currentBlock) {
      rawBlocks.push(currentBlock);
    }

    // Analizar individualmente cada bloque detectado
    for (const rawBlock of rawBlocks) {
      const result: ParsedWodResult = {
        titulo: '',
        tipo: 'AMRAP',
        descripcion: '',
        ejercicios: []
      };

      // Limpiar el número inicial si tiene (ej. "1. Calentamiento" -> "Calentamiento")
      const cleanTitle = rawBlock.header.replace(/^\s*\d+[\.\)]\s*/, '').trim();
      result.titulo = cleanTitle || 'Bloque de Entrenamiento';

      // Detectar Tipo de WOD de acuerdo a palabras clave en título y cuerpo
      const blockTextLower = (rawBlock.header + '\n' + rawBlock.lines.join('\n')).toLowerCase();
      if (blockTextLower.includes('eomom')) result.tipo = 'EOMOM';
      else if (blockTextLower.includes('emom')) result.tipo = 'EMOM';
      else if (blockTextLower.includes('amrap')) result.tipo = 'AMRAP';
      else if (blockTextLower.includes('tabata')) result.tipo = 'Tabata';
      else if (blockTextLower.includes('hiit')) result.tipo = 'HIIT';
      else if (blockTextLower.includes('death by')) result.tipo = 'Death by';
      else if (blockTextLower.includes('chipper')) result.tipo = 'Chipper';
      else if (blockTextLower.includes('rft')) result.tipo = 'RFT';
      else if (blockTextLower.includes('ladder')) result.tipo = 'Ladder';
      else if (blockTextLower.includes('metcon')) result.tipo = 'MetCon';
      else if (blockTextLower.includes('fuerza') || blockTextLower.includes('strength') || blockTextLower.includes('max') || blockTextLower.includes('weightlifting') || blockTextLower.includes('halterofilia')) result.tipo = 'Fuerza';
      else if (blockTextLower.includes('gimnasia') || blockTextLower.includes('gymnastic')) result.tipo = 'Gimnasia';
      else if (blockTextLower.includes('calentamiento') || blockTextLower.includes('warmup') || blockTextLower.includes('warm-up') || blockTextLower.includes('w.u')) result.tipo = 'Calentamiento';
      else if (blockTextLower.includes('partner') || blockTextLower.includes('pareja') || blockTextLower.includes('por parejas')) result.tipo = 'Partner WOD';
      else if (blockTextLower.includes('for time') || blockTextLower.includes('por tiempo') || blockTextLower.includes('rondas por tiempo')) result.tipo = 'For Time';
      else result.tipo = 'Otro';

      // Procesar líneas del bloque
      const descriptionLines: string[] = [];
      for (const line of rawBlock.lines) {
        const parsedExercise = this.parseExerciseLine(line, catalog);
        if (parsedExercise) {
          result.ejercicios.push(parsedExercise);
        } else {
          descriptionLines.push(line);
        }
      }

      // Asignar orden de visualización de ejercicios
      result.ejercicios.forEach((we, index) => {
        we.orden = index;
      });

      result.descripcion = descriptionLines.join('\n');
      bloques.push(result);
    }

    return { bloques };
  }

  /**
   * PARSER POR API DE GEMINI: Envía el texto a Gemini API solicitando dividir el entrenamiento
   * en uno o más bloques independientes en formato JSON.
   * Cuenta con un sistema de fallback secuencial para probar diferentes modelos en caso de error.
   */
  parseWithGemini(text: string, apiKey: string, catalog: Ejercicio[], image?: { data: string; mimeType: string }): Observable<{ bloques: ParsedWodResult[] }> {
    const models = [
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-2.0-flash-lite',
      'gemini-flash-latest'
    ];
    return this.tryModelsSequentially(models, 0, text, apiKey, catalog, image);
  }

  private tryModelsSequentially(
    models: string[],
    index: number,
    text: string,
    apiKey: string,
    catalog: Ejercicio[],
    image?: { data: string; mimeType: string }
  ): Observable<{ bloques: ParsedWodResult[] }> {
    if (index >= models.length) {
      console.warn("Todos los modelos de Gemini fallaron o no están disponibles. Usando parser local.");
      return of(this.parseWodText(text, catalog));
    }

    const modelName = models[index];
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;
    const headers = {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    };

    let prompt = `Analiza el siguiente entrenamiento y divídelo en uno o más bloques independientes (por ejemplo: Calentamiento, Fuerza, Metcon/Trabajo Final).
Devuelve la respuesta estrictamente en formato JSON que contenga un arreglo de bloques ("bloques").

Para cada bloque, identifica:
- titulo: El nombre o título del bloque (ej. "Calentamiento", "Trabajo de Fuerza").
- tipo: El tipo de WOD. Debe ser exactamente una de estas opciones: "AMRAP", "EMOM", "EOMOM", "For Time", "RFT", "Chipper", "Tabata", "HIIT", "Death by", "Ladder", "MetCon", "Fuerza", "Complejo", "Halterofilia", "Gimnasia", "Calentamiento", "Partner WOD", "Otro". Si no estás seguro o no encaja, usa "Otro".
- descripcion: Descripción general del bloque (notas, calentamientos, intervalos, tempos) o null/vacío si no hay.
- ejercicios: Lista de ejercicios específicos del bloque.

Para cada ejercicio, extrae:
- nombre_ejercicio: El nombre del ejercicio en inglés o español.
- series: Número entero de series si se especifica (ej. 4 en "4 series" o "4x10"). Debe ser estrictamente un número entero (integer) o null. Nunca incluyas texto como "sets" o "series".
- repeticiones: Repeticiones o esquema (ej. "10", "21-15-9", "400m", "15 cal", "10/10") o null.
- detalles: Detalles de peso, ritmo, tempo o notas (ej. "RX 43/30 kg", "sosteniendo abajo 2\"", "(4\" x 1\" x 1\")") o null.`;

    if (image) {
      prompt += `\n\nAnaliza la imagen adjunta que contiene la pizarra, pantalla o texto del entrenamiento para extraer esta información.`;
      if (text) {
        prompt += `\n\nTexto adicional o transcripción proporcionada por el usuario:\n"""\n${text}\n"""`;
      }
    } else {
      prompt += `\n\nTexto del entrenamiento:\n"""\n${text}\n"""`;
    }

    const parts: any[] = [{ text: prompt }];
    if (image) {
      parts.push({
        inlineData: {
          mimeType: image.mimeType,
          data: image.data
        }
      });
    }

    const requestBody = {
      contents: [{
        parts: parts
      }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            bloques: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  titulo: { type: "string" },
                  tipo: { 
                    type: "string", 
                    enum: ["AMRAP", "EMOM", "EOMOM", "For Time", "RFT", "Chipper", "Tabata", "HIIT", "Death by", "Ladder", "MetCon", "Fuerza", "Complejo", "Halterofilia", "Gimnasia", "Calentamiento", "Partner WOD", "Otro"] 
                  },
                  descripcion: { type: "string", nullable: true },
                  ejercicios: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        nombre_ejercicio: { type: "string" },
                        series: { type: "integer", nullable: true },
                        repeticiones: { type: "string", nullable: true },
                        detalles: { type: "string", nullable: true }
                      },
                      required: ["nombre_ejercicio"]
                    }
                  }
                },
                required: ["titulo", "tipo", "ejercicios"]
              }
            }
          },
          required: ["bloques"]
        }
      }
    };

    return this.http.post<any>(url, requestBody, { headers }).pipe(
      map(res => {
        try {
          const candidate = res.candidates?.[0];
          const rawText = candidate?.content?.parts?.[0]?.text;
          if (!rawText) {
            console.warn(`No text content returned from Gemini API for model ${modelName}`);
            throw new Error("No text content returned from Gemini API");
          }
          const parsed = JSON.parse(rawText);
          const bloques: ParsedWodResult[] = [];

          if (parsed && Array.isArray(parsed.bloques)) {
            parsed.bloques.forEach((bloque: any) => {
              const exercisesMapped: Array<Omit<WodEjercicio, 'id' | 'wod_id'> & { matchedEjercicioName?: string }> = [];
              
              if (Array.isArray(bloque.ejercicios)) {
                bloque.ejercicios.forEach((item: any, idx: number) => {
                  const matchedEx = this.findMatchingExercise(item.nombre_ejercicio, catalog);
                  const seriesVal = (item.series !== undefined && item.series !== null) ? Number(item.series) : null;
                  const repeticionesVal = (item.repeticiones !== undefined && item.repeticiones !== null) ? String(item.repeticiones) : null;
                  const detallesVal = (item.detalles !== undefined && item.detalles !== null) ? String(item.detalles) : null;
                  
                  const isSeriesNaN = seriesVal !== null && isNaN(seriesVal);
                  const parsedSeries = isSeriesNaN ? null : seriesVal;

                  if (matchedEx) {
                    exercisesMapped.push({
                      ejercicio_id: matchedEx.id,
                      series: parsedSeries,
                      repeticiones: repeticionesVal,
                      detalles: detallesVal,
                      orden: idx,
                      matchedEjercicioName: matchedEx.nombre
                    });
                  } else {
                    const partialMatch = this.findPartialMatch(item.nombre_ejercicio, catalog);
                    if (partialMatch) {
                      exercisesMapped.push({
                        ejercicio_id: partialMatch.id,
                        series: parsedSeries,
                        repeticiones: repeticionesVal,
                        detalles: detallesVal,
                        orden: idx,
                        matchedEjercicioName: partialMatch.nombre
                      });
                    } else {
                      // Guardar como ejercicio no coincidente para permitir registro/mapeo manual en la UI
                      exercisesMapped.push({
                        ejercicio_id: '',
                        series: parsedSeries,
                        repeticiones: repeticionesVal,
                        detalles: detallesVal,
                        orden: idx,
                        matchedEjercicioName: item.nombre_ejercicio
                      });
                    }
                  }
                });
              }

              bloques.push({
                titulo: bloque.titulo || `Entrenamiento ${bloque.tipo}`,
                tipo: (bloque.tipo || 'AMRAP') as WodTipo,
                descripcion: bloque.descripcion || '',
                ejercicios: exercisesMapped
              });
            });
          }

          return { bloques };
        } catch (e) {
          console.error(`Error parsing Gemini JSON response for model ${modelName}`, e);
          throw e; // Propagate error to trigger fallback in catchError
        }
      }),
      catchError(err => {
        console.warn(`Gemini API request failed for model ${modelName}, trying next fallback model...`, err);
        return this.tryModelsSequentially(models, index + 1, text, apiKey, catalog, image);
      })
    );
  }

  // --- MÉTODOS AUXILIARES DE COINCIDENCIAS Y EXTRACCIÓN ---

  private detectIfLineIsExercise(line: string, catalog: Ejercicio[]): boolean {
    const lineClean = this.cleanLineText(line);
    if (!lineClean) return false;

    // Si coincide con alguna clave estática de sinónimos
    for (const key of Object.keys(this.synonymToIdMap)) {
      if (lineClean.includes(key)) return true;
    }

    // O si coincide con algún nombre del catálogo directamente
    for (const ex of catalog) {
      if (lineClean.includes(ex.nombre.toLowerCase())) return true;
    }

    // O si contiene número de repeticiones + palabras comunes de ejercicio
    const hasNumbers = /\d+/.test(lineClean);
    const hasWorkoutsWords = /(reps|cal|mts|m|rounds|rondas|min|seg|kg|lbs|unbroken)/i.test(lineClean);
    if (hasNumbers && hasWorkoutsWords) return true;

    return false;
  }

  private parseExerciseLine(line: string, catalog: Ejercicio[]): (Omit<WodEjercicio, 'id' | 'wod_id'> & { matchedEjercicioName?: string }) | null {
    const origLine = line.trim();
    // Quitar viñetas iniciales como "-", "*", "1.", "Min 1:"
    let cleaned = origLine.replace(/^[-*+\d.]+\s*/, '') // remueve bullets e indices simples
                         .replace(/^(min|minute|minuto|ronda|round|rft|amrap)\s*\d*[:.-]?\s*/i, '') // remueve "Min 1:" o similar
                         .trim();

    if (!cleaned) return null;

    const cleanedLower = cleaned.toLowerCase();
    let exerciseId: string | null = null;
    let matchedName = '';

    // 1. Buscar en sinónimos estáticos ordenados por longitud descendente para emparejar el más largo primero
    const sortedSynonyms = Object.keys(this.synonymToIdMap).sort((a, b) => b.length - a.length);
    for (const key of sortedSynonyms) {
      if (cleanedLower.includes(key)) {
        exerciseId = this.synonymToIdMap[key];
        const matchInCatalog = catalog.find(e => e.id === exerciseId);
        matchedName = matchInCatalog ? matchInCatalog.nombre : key;
        break;
      }
    }

    // 2. Si no, buscar coincidencia exacta en el catálogo del sistema
    if (!exerciseId) {
      const sortedCatalog = [...catalog].sort((a, b) => b.nombre.length - a.nombre.length);
      for (const ex of sortedCatalog) {
        const nameLower = ex.nombre.toLowerCase();
        if (cleanedLower.includes(nameLower)) {
          exerciseId = ex.id;
          matchedName = ex.nombre;
          break;
        }
      }
    }

    // Si no se encuentra en el catálogo, verificamos si la línea califica como un posible ejercicio
    // Ej: empieza por bullet de letra A., B. o viñetas -, *, o contiene ':' con números
    if (!exerciseId) {
      const isLikelyExercise = /^[A-Z][-.\s]/i.test(origLine) || /^[-*•]\s/.test(origLine) || (/:/.test(origLine) && /\d+/.test(origLine));
      if (!isLikelyExercise) {
        return null;
      }
      // Intentar extraer el nombre del ejercicio (por ejemplo, el texto antes del primer carácter numérico o dos puntos)
      const nameParts = cleaned.split(/[:\d]/);
      matchedName = nameParts[0].trim();
      if (!matchedName || matchedName.length < 3) {
        matchedName = cleaned;
      }
    }

    // 3. Extraer cantidades (Series, Repeticiones y Detalles) del resto del texto
    let series: number | null = null;
    let repeticiones: string | null = null;
    let detalles: string | null = null;

    // Quitar el nombre detectado del ejercicio de la cadena para aislar los números y detalles
    // Ejemplo: de "15 Wall Ball Shots (9kg)" -> sacamos "Wall Ball Shots" -> queda "15  (9kg)"
    const exerciseNameRegex = new RegExp(matchedName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + 's?', 'i');
    let numbersAndDetails = cleaned.replace(exerciseNameRegex, '').trim();

    // Si la cadena original tenía sinónimo, también lo quitamos si es diferente
    const matchedSynonym = sortedSynonyms.find(syn => cleanedLower.includes(syn) && matchedName.toLowerCase() !== syn);
    if (matchedSynonym) {
      numbersAndDetails = numbersAndDetails.replace(new RegExp(matchedSynonym + 's?', 'i'), '').trim();
    }

    // Buscar patrón tipo "5x5" o "3 x 12"
    const xPattern = /\b(\d+)\s*[xX]\s*(\d+)\b/;
    const xMatch = numbersAndDetails.match(xPattern);
    if (xMatch) {
      series = parseInt(xMatch[1], 10);
      repeticiones = xMatch[2];
      numbersAndDetails = numbersAndDetails.replace(xPattern, '').trim();
    } else {
      // Buscar repeticiones directas, esquemas "21-15-9" o números sueltos
      const repPattern = /\b(\d+(?:[-/]\d+)*|\d+\s*(?:cal|calorias|m|meters|metros|reps|unidades)?)\b/i;
      const repMatch = numbersAndDetails.match(repPattern);
      if (repMatch) {
        repeticiones = repMatch[1];
        numbersAndDetails = numbersAndDetails.replace(repPattern, '').trim();
      }
    }

    // Lo restante (ej. "(9kg)", "@ 40kg", "RX", "unbroken") se asigna a detalles
    // Limpiar paréntesis extras y comas
    let remaining = numbersAndDetails.replace(/^[,:\s@()]+|[,:\s@()]+$/g, '').trim();
    if (remaining) {
      detalles = remaining;
    }

    // Si no pudimos extraer repeticiones pero había un número al principio de la línea original,
    // ej: "15 Burpees".
    if (!repeticiones) {
      const leadingNumberMatch = origLine.match(/^(\d+(?:[-/]\d+)*)\b/);
      if (leadingNumberMatch) {
        repeticiones = leadingNumberMatch[1];
      }
    }

    return {
      ejercicio_id: exerciseId || '',
      series,
      repeticiones: repeticiones || null,
      detalles: detalles || null,
      orden: 0,
      matchedEjercicioName: matchedName
    };
  }

  private cleanLineText(line: string): string {
    return line.toLowerCase()
      .replace(/^[-*+\d.]+\s*/, '')
      .trim();
  }

  private findMatchingExercise(name: string, catalog: Ejercicio[]): Ejercicio | null {
    const cleanName = name.toLowerCase().trim();
    
    // Coincidencia exacta
    let matched = catalog.find(e => e.nombre.toLowerCase() === cleanName);
    if (matched) return matched;

    // Coincidencia en sinónimos
    const synonymId = this.synonymToIdMap[cleanName];
    if (synonymId) {
      matched = catalog.find(e => e.id === synonymId);
      if (matched) return matched;
    }

    return null;
  }

  private findPartialMatch(name: string, catalog: Ejercicio[]): Ejercicio | null {
    const cleanName = name.toLowerCase().trim();

    // Ver si el nombre contiene o está contenido en algún ejercicio del catálogo
    const matched = catalog.find(e => {
      const catName = e.nombre.toLowerCase();
      return cleanName.includes(catName) || catName.includes(cleanName);
    });

    return matched || null;
  }
}
