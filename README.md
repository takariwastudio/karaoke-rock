# 🎸 Karaoke Rock — Demo

App web demo para el evento Karaoke Rock de Maracay. Todo corre en el navegador, sin backend, sin costo.

## Rutas

| Ruta      | Quién la usa       | Descripción                             |
|-----------|--------------------|-----------------------------------------|
| `/`       | Público            | Login simulado con Google               |
| `/home`   | Usuarios           | Pedir canción, calificar, ver la lista  |
| `/admin`  | DJ / Host          | Panel de control completo               |

**Password de admin:** `rockadmin`

---

## Cómo correr el demo

```bash
npm install
npm run dev
# Abre http://localhost:3000
```

## Cómo mostrar el demo al cliente

1. Abre **dos pestañas** del navegador
2. En la primera: entra como usuario (`/`) → prueba pedir canciones y calificar
3. En la segunda: entra como admin (`/admin`) → controla la cola, avanza cantantes, ve estadísticas
4. Para poblar con datos de ejemplo: Admin → Config → "Cargar datos demo"

---

## Funcionalidades implementadas

### Usuario
- ✅ Login simulado con Google (nombre + avatar automático)
- ✅ Búsqueda de canciones con autocompletado (150+ canciones de rock)
- ✅ Cooldown configurable entre pedidos (30 min por defecto)
- ✅ Ver la lista de espera en tiempo real (vía localStorage)
- ✅ Ver su posición en la cola
- ✅ Calificar cantantes con estrellas (1–5)
- ✅ Solo puede calificar: el que está cantando + los últimos 5
- ✅ La calificación no se puede editar una vez dada

### Admin
- ✅ Login con password
- ✅ Control de DJ: Iniciar, Siguiente, No Show
- ✅ Estadísticas: usuarios, canciones, cantaron, no-shows
- ✅ Canción más pedida
- ✅ Usuario más activo
- ✅ Usuarios fantasma (registrados pero nunca pidieron)
- ✅ Usuarios que piden pero nunca aparecen
- ✅ Top 10 cantantes mejor valorados
- ✅ Control de ban por usuario
- ✅ Control del cooldown (slider + presets)
- ✅ Botón de datos demo para presentaciones
- ✅ Reset completo

---

## Stack

- Next.js 14 + TypeScript + Tailwind CSS
- Estado 100% en localStorage (sin backend)
- Sin dependencias de pago
