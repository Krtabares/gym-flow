-- Migración para crear la tabla de WODs y la relación de ejercicios programados

-- 1. Crear la tabla de WODs
CREATE TABLE IF NOT EXISTS wods (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    tipo TEXT NOT NULL,
    fecha DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Habilitar RLS para wods
ALTER TABLE wods ENABLE ROW LEVEL SECURITY;

-- 3. Crear política permisiva para wods
CREATE POLICY "Permitir todo acceso público a wods" ON wods FOR ALL USING (true) WITH CHECK (true);

-- 4. Crear la tabla puente para los ejercicios del WOD
CREATE TABLE IF NOT EXISTS wod_ejercicios (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wod_id UUID NOT NULL REFERENCES wods(id) ON DELETE CASCADE,
    ejercicio_id UUID NOT NULL REFERENCES ejercicios(id) ON DELETE CASCADE,
    series INTEGER,
    repeticiones TEXT,
    detalles TEXT,
    orden INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Habilitar RLS para wod_ejercicios
ALTER TABLE wod_ejercicios ENABLE ROW LEVEL SECURITY;

-- 6. Crear política permisiva para wod_ejercicios
CREATE POLICY "Permitir todo acceso público a wod_ejercicios" ON wod_ejercicios FOR ALL USING (true) WITH CHECK (true);
