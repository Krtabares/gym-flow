-- Migración para añadir la columna contrasena a la tabla usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS contrasena TEXT DEFAULT '123456' NOT NULL;
