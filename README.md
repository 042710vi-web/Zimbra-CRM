# Zimbra CRM

Sistema CRM para gestionar prospectos, pruebas de producto, asignaciones comerciales y ventas de Zimbra. El proyecto está dividido en una API REST y una aplicación web.

## Tecnologías

- **Backend:** Node.js, Express, Sequelize y MySQL.
- **Frontend:** React y Vite.
- **Autenticación:** JWT.

## Requisitos

- Node.js 20 o superior y npm.
- MySQL disponible localmente o en un servidor accesible.

## Base de datos

El SQL del proyecto está en [`backend/database/CRM Zimbra.sql`](backend/database/CRM%20Zimbra.sql). **Antes de importarlo, revisa su contenido:** incluye `DROP DATABASE IF EXISTS zimbra_bd`, por lo que elimina esa base si ya existe y luego la vuelve a crear. Impórtalo con MySQL Workbench solo si estás de acuerdo con reemplazarla.

## Inicio del backend

En PowerShell, desde la raíz del proyecto:

```powershell
Copy-Item backend/.env.example backend/.env
Set-Location backend
npm install
npm run dev
```

Configura `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` y `JWT_SECRET` en `backend/.env`. La API inicia en `http://localhost:3000`; puedes comprobarla en `GET /api/health`.

## Inicio del frontend

Abre otra terminal en la raíz del proyecto:

```powershell
Copy-Item frontend/.env.example frontend/.env
Set-Location frontend
npm install
npm run dev
```

El frontend corre en `http://localhost:5175`. Si la API corre en otra dirección, actualiza `VITE_API_URL` en `frontend/.env`.

## Endpoints implementados

| Método | Ruta | Uso |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Iniciar sesión y obtener un JWT |
| `POST` | `/api/clients` | Registrar un cliente |
| `GET` | `/api/products` | Consultar productos activos |
| `POST` | `/api/trials` | Registrar una prueba de 60 días y sumar puntaje |
| `POST` | `/api/assignments` | Asignar un cliente a un vendedor; requiere rol Administrador |
| `POST` | `/api/sales` | Registrar venta, detalle y auditoría en una transacción |

Salvo el login y la ruta de salud, las rutas requieren `Authorization: Bearer <token>`. Las cuentas para iniciar sesión deben existir en la tabla `usuarios`; el SQL conserva hashes de contraseña y no informa las contraseñas en texto claro.

## Estructura

```text
backend/   API, capas de servicio, repositorios, entidades Sequelize y SQL
frontend/  aplicación React organizada por páginas, servicios y componentes
```

Las historias de usuario y su correspondencia con los endpoints del frontend quedan pendientes de la información que se comparta para documentarlas.
