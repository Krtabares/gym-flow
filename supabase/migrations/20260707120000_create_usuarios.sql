-- Migración para crear la tabla de usuarios del sistema
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

-- Habilitar Row Level Security (RLS) en la tabla
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Crear política permisiva para desarrollo rápido (permite todo acceso público)
CREATE POLICY "Permitir todo acceso público a usuarios" ON usuarios FOR ALL USING (true) WITH CHECK (true);

-- Insertar usuarios iniciales por defecto (incluyendo usuario root)
INSERT INTO usuarios (nombre, email, rol, telefono, activo) VALUES
('Usuario Root', 'root@gymflow.com', 'admin', '555-0000', true),
('Administrador GymFlow', 'admin@gymflow.com', 'admin', '555-0100', true),
('Coach Entrenador', 'coach@gymflow.com', 'coach', '555-0200', true),
('Recepcionista GymFlow', 'recepcion@gymflow.com', 'recepcion', '555-0300', true)
ON CONFLICT (email) DO NOTHING;
