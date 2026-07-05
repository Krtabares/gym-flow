-- Migración para añadir la sección de Anamnesis Dinámica

-- 1. Añadir columna 'anamnesis' (JSONB) en la tabla 'miembros' para guardar respuestas
ALTER TABLE miembros ADD COLUMN IF NOT EXISTS anamnesis JSONB DEFAULT NULL;

-- 2. Crear tabla 'anamnesis_plantilla' para guardar la plantilla de preguntas
CREATE TABLE IF NOT EXISTS anamnesis_plantilla (
    id TEXT PRIMARY KEY,
    preguntas JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS para la nueva tabla
ALTER TABLE anamnesis_plantilla ENABLE ROW LEVEL SECURITY;

-- Crear políticas permisivas para desarrollo rápido
CREATE POLICY "Permitir todo acceso público a plantilla" ON "public"."anamnesis_plantilla" FOR ALL USING (true) WITH CHECK (true);

-- Insertar la plantilla de preguntas por defecto si no existe
INSERT INTO anamnesis_plantilla (id, preguntas)
VALUES ('default', '[
  {"id": "q1", "texto": "¿Sufre de alguna enfermedad crónica (diabetes, hipertensión, asma, etc.)?", "tipo": "sino", "requerido": true},
  {"id": "q2", "texto": "¿Toma algún medicamento regularmente? ¿Cuál y con qué frecuencia?", "tipo": "texto", "requerido": false},
  {"id": "q3", "texto": "¿Tiene alguna lesión activa o recurrente (rodillas, hombros, columna, etc.)?", "tipo": "texto", "requerido": false},
  {"id": "q4", "texto": "¿Tiene alergias conocidas a medicamentos, alimentos o sustancias?", "tipo": "texto", "requerido": false},
  {"id": "q5", "texto": "Grupo Sanguíneo (e.g. O+, A-)", "tipo": "texto", "requerido": false},
  {"id": "q6", "texto": "¿Ha tenido alguna cirugía reciente o implantes médicos?", "tipo": "texto", "requerido": false},
  {"id": "q7", "texto": "Nombre y teléfono del contacto de emergencia", "tipo": "texto", "requerido": true}
]'::jsonb)
ON CONFLICT (id) DO NOTHING;
