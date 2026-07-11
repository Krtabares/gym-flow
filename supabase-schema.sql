-- Script de inicialización de Base de Datos para GymFlow en Supabase

-- 1. Tabla de Planes de Suscripción
CREATE TABLE IF NOT EXISTS planes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    precio NUMERIC NOT NULL,
    duracion_dias INTEGER NOT NULL,
    beneficios TEXT[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla de Miembros
CREATE TABLE IF NOT EXISTS miembros (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    email TEXT UNIQUE,
    telefono TEXT,
    plan_id UUID REFERENCES planes(id) ON DELETE SET NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'vencido')) NOT NULL,
    anamnesis JSONB DEFAULT NULL,
    fecha_nacimiento DATE,
    fecha_ingreso DATE DEFAULT CURRENT_DATE NOT NULL,
    fecha_cobro DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabla de Pagos
CREATE TABLE IF NOT EXISTS pagos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    miembro_id UUID REFERENCES miembros(id) ON DELETE CASCADE NOT NULL,
    monto NUMERIC NOT NULL,
    fecha_pago TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    metodo_pago TEXT NOT NULL,
    estado TEXT DEFAULT 'completado' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabla de Asistencia
CREATE TABLE IF NOT EXISTS asistencia (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    miembro_id UUID REFERENCES miembros(id) ON DELETE CASCADE NOT NULL,
    fecha_hora TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabla de Plantilla de Anamnesis
CREATE TABLE IF NOT EXISTS anamnesis_plantilla (
    id TEXT PRIMARY KEY,
    preguntas JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabla de Usuarios (Administradores / Personal)
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    rol TEXT DEFAULT 'coach' CHECK (rol IN ('admin', 'coach', 'recepcion')) NOT NULL,
    telefono TEXT,
    contrasena TEXT DEFAULT '123456' NOT NULL,
    activo BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Tabla de Configuración
CREATE TABLE IF NOT EXISTS configuracion (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS) en todas las tablas
ALTER TABLE planes ENABLE ROW LEVEL SECURITY;
ALTER TABLE miembros ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE anamnesis_plantilla ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;

-- Crear políticas permisivas para desarrollo rápido (permite leer/escribir públicamente)
CREATE POLICY "Permitir todo acceso público a planes" ON planes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo acceso público a miembros" ON miembros FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo acceso público a pagos" ON pagos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo acceso público a asistencia" ON asistencia FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo acceso público a plantilla" ON anamnesis_plantilla FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo acceso público a usuarios" ON usuarios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo acceso público a configuracion" ON configuracion FOR ALL USING (true) WITH CHECK (true);

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

-- Insertar valores de configuración por defecto
INSERT INTO configuracion (clave, valor) VALUES
('gemini_api_key', ''),
('gemini_api_key_images', ''),
('ai_provider', 'local')
ON CONFLICT (clave) DO NOTHING;
