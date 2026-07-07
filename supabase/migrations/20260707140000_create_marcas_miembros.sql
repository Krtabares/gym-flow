-- Migración para crear la tabla de marcas/records de miembros (scores)
CREATE TABLE IF NOT EXISTS marcas_miembros (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    miembro_id UUID REFERENCES miembros(id) ON DELETE CASCADE NOT NULL,
    ejercicio_id UUID REFERENCES ejercicios(id) ON DELETE CASCADE NOT NULL,
    valor NUMERIC NOT NULL,
    unidad TEXT NOT NULL, -- 'kg', 'lbs', 'reps', 'segundos', 'metros', etc.
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE marcas_miembros ENABLE ROW LEVEL SECURITY;

-- Crear política permisiva para desarrollo rápido
CREATE POLICY "Permitir todo acceso público a marcas_miembros" ON marcas_miembros FOR ALL USING (true) WITH CHECK (true);
