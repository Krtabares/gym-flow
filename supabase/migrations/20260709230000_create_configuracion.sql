-- Crear tabla de configuración
CREATE TABLE IF NOT EXISTS configuracion (
    clave TEXT PRIMARY KEY,
    valor TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;

-- Crear política permisiva para desarrollo rápido
CREATE POLICY "Permitir todo acceso público a configuracion" ON configuracion FOR ALL USING (true) WITH CHECK (true);

-- Insertar valores por defecto iniciales
INSERT INTO configuracion (clave, valor) VALUES
('gemini_api_key', ''),
('gemini_api_key_images', ''),
('ai_provider', 'local')
ON CONFLICT (clave) DO NOTHING;
