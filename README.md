# GymFlow ⚡

Sistema premium e interactivo de gestión de suscripciones, miembros, pagos y asistencias para gimnasios, boxes de crossfit y centros de entrenamiento. Desarrollado con **Angular** y preparado para conectarse con **Supabase**.

---

## 🚀 Características
- **Modo Híbrido Auto-Demo**: Si no configuras las claves de Supabase, la aplicación arranca automáticamente en **Modo Demo**, guardando la información en el `localStorage` del navegador con datos de prueba ya listos para usar.
- **Diseño Cyber-Gym Premium**: Interfaz moderna en modo oscuro, efectos de glassmorphism, micro-animaciones y acentos de color neón.
- **Métricas e Indicadores**: Total de miembros activos, ingresos mensuales estimados, check-ins del día y alertas de membresías vencidas.
- **Gráficos en tiempo real**: Distribución de suscripciones mediante gráficos circulares interactivos con Chart.js.
- **Gestión Completa (CRUD)**: Miembros, planes de entrenamiento y transacciones de facturación.
- **Control de Acceso / Asistencia**: Terminal de check-in rápido con validación de estado en vivo (autorizado / bloqueado).

---

## 🛠️ Configuración del Backend en Supabase

Si decides conectar GymFlow a tu base de datos de Supabase, sigue estos pasos:

### 1. Crear las Tablas y Políticas RLS
Ve a la consola de tu proyecto de Supabase, abre el **SQL Editor** y ejecuta el script [supabase-schema.sql](file:///home/tabares/Documentos/Workspace/gym-flow/supabase-schema.sql) que hemos incluido en la raíz de este proyecto. Este script creará:
- La tabla de `planes`
- La tabla de `miembros`
- La tabla de `pagos`
- La tabla de `asistencia`
- Las políticas de seguridad (RLS) necesarias para interactuar con la aplicación.

### 2. Configurar Claves en Angular
Copia la URL de tu proyecto de Supabase y la clave Anon Key, y colócalas en los archivos de configuración de Angular:
- [environment.ts](file:///home/tabares/Documentos/Workspace/gym-flow/src/environments/environment.ts) (para producción)
- [environment.development.ts](file:///home/tabares/Documentos/Workspace/gym-flow/src/environments/environment.development.ts) (para desarrollo)

```typescript
export const environment = {
  production: false, // o true en environment.ts
  supabaseUrl: 'TU_SUPABASE_URL_AQUÍ',
  supabaseKey: 'TU_SUPABASE_ANON_KEY_AQUÍ'
};
```

---

## 🏃 Cómo Ejecutar el Proyecto en Local

### 1. Iniciar Servidor de Desarrollo
Para arrancar el proyecto en modo desarrollo en tu máquina:
```bash
npm start
```
Abre tu navegador en `http://localhost:4200` para interactuar con el sistema.

### 2. Compilar para Producción
Para compilar la aplicación optimizada para producción:
```bash
npm run build
```

---

## 📂 Estructura del Código Creado

- **Modelos**: [models.ts](file:///home/tabares/Documentos/Workspace/gym-flow/src/app/models.ts) - Define las interfaces compartidas de datos.
- **Servicio Supabase**: [supabase.service.ts](file:///home/tabares/Documentos/Workspace/gym-flow/src/app/services/supabase.service.ts) - Lógica de base de datos híbrida (Supabase / LocalStorage).
- **Diseño General**: [styles.css](file:///home/tabares/Documentos/Workspace/gym-flow/src/styles.css) - Tokens de diseño y hojas globales.
- **Vistas y Componentes**:
  - [Dashboard](file:///home/tabares/Documentos/Workspace/gym-flow/src/app/components/dashboard.ts) - Métricas y gráficos.
  - [Miembros](file:///home/tabares/Documentos/Workspace/gym-flow/src/app/components/members.ts) - Altas, bajas, ediciones y pagos rápidos.
  - [Planes](file:///home/tabares/Documentos/Workspace/gym-flow/src/app/components/plans.ts) - Catálogo y configurador de precios.
  - [Facturación](file:///home/tabares/Documentos/Workspace/gym-flow/src/app/components/payments.ts) - Transacciones y recibos.
  - [Check-In](file:///home/tabares/Documentos/Workspace/gym-flow/src/app/components/attendance.ts) - Consola de recepción y registro de accesos.
