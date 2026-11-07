# Zimbra CRM - frontend

## Requisitos

- Node.js 20 o superior.
- API backend activa en `http://localhost:3000`.
- Esquema CRM ya importado en MySQL.

## Inicio

1. Copia `.env.example` como `.env` si la API no está en la URL predeterminada.
2. Ejecuta `npm install` dentro de `frontend/`.
3. Ejecuta `npm run dev` y abre la URL que indique Vite (por defecto `http://localhost:5173`).

El inicio de sesión usa `POST /api/auth/login`. Después del login, el frontend consume `GET /api/products` y muestra formularios para `POST /api/clients`, `POST /api/trials`, `POST /api/assignments` y `POST /api/sales`.

El token se conserva en `sessionStorage` y se envía como `Authorization: Bearer <token>`. La pantalla de asignaciones solo aparece habilitada para el rol `Administrador`.

Para iniciar sesión, usa una cuenta y contraseña válidas de la tabla `usuarios`. El archivo SQL compartido contiene hashes de contraseña, no contraseñas en texto claro.

## Estructura del frontend

- `src/api/`: cliente HTTP y configuración de solicitudes.
- `src/services/`: llamadas por recurso a la API.
- `src/context/`: sesión y autenticación compartidas.
- `src/hooks/`: acciones HTTP y carga de datos reutilizables.
- `src/routes/`: selección de pantallas de la aplicación.
- `src/pages/`: pantallas separadas por módulo del CRM.
- `src/components/`: componentes comunes y estructura visual.
- `src/assets/`: estilos e imágenes.
- `src/utils/`: funciones auxiliares.

Los servicios y las pantallas de los seis flujos tienen comentarios `HU` y `Endpoint` pendientes. Se completarán con los identificadores e historias que se compartan; no se asignaron historias por suposición.
