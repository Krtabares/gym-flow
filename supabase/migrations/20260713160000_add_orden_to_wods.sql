-- Migración para añadir la columna 'orden' a la tabla 'wods'
ALTER TABLE wods ADD COLUMN orden INTEGER NOT NULL DEFAULT 1;
