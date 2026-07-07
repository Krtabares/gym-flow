-- Migración para agregar fecha de cumpleaños, fecha de ingreso y fecha de cobro a miembros

ALTER TABLE miembros ADD COLUMN IF NOT EXISTS fecha_nacimiento DATE;
ALTER TABLE miembros ADD COLUMN IF NOT EXISTS fecha_ingreso DATE DEFAULT CURRENT_DATE;
ALTER TABLE miembros ADD COLUMN IF NOT EXISTS fecha_cobro DATE;

-- Establecer valores predeterminados razonables para los miembros existentes
UPDATE miembros 
SET fecha_ingreso = COALESCE(fecha_inicio, created_at::date, CURRENT_DATE)
WHERE fecha_ingreso IS NULL;

UPDATE miembros 
SET fecha_cobro = fecha_inicio
WHERE fecha_cobro IS NULL AND fecha_inicio IS NOT NULL;
