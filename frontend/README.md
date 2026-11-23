# Zimbra CRM - frontend

## Requisitos

- Node.js 20 o superior.
- API backend activa en `http://localhost:3000`.
- Esquema CRM ya importado en MySQL.

## Inicio

1. Copia `.env.example` como `.env` si la API no está en la URL predeterminada.
2. Ejecuta `npm install` dentro de `frontend/`.
3. Ejecuta `npm run dev` y abre `http://localhost:5175`.

El inicio de sesión usa `POST /api/auth/login`. Después del login, el frontend consume `GET /api/products` y muestra formularios para `POST /api/clients`, `POST /api/trials`, `POST /api/assignments` y `POST /api/sales`.

La portada `/` (también disponible en `/solicitar-prueba`) es el recorrido público y no requiere iniciar sesión. Permite navegar por el catálogo, registrar visitas anónimas, enviar los datos del prospecto a `POST /api/public/leads` y crear la prueba con `POST /api/public/descargas`. Los eventos de la simulación usan `POST /api/public/activities`; la integración productiva de rastreo conserva `POST /api/tracking/eventos` con la clave configurada en el backend. El equipo entra por `/login` y, tras autenticarse, llega al panel en `/crm`.

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

Los comentarios de servicios y pantallas usan los identificadores de la estructura actualizada de 33 historias. Las carpetas vacías `src/pages/alertas`, `src/pages/correo_automatizado` y `src/pages/salesforce` preparan los módulos de alertas (HU-17), correo automatizado (HU-18 y HU-19) y Salesforce.com (HU-23 y HU-24).
