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

## Instalación e inicio

Desde la raíz, prepara las variables de entorno e instala todas las dependencias de ambos workspaces con un solo comando:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
npm install
```

Configura `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` y `JWT_SECRET` en `backend/.env`. Si la API no está en `http://localhost:3000/api`, actualiza `VITE_API_URL` en `frontend/.env`.

Para iniciar API y frontend juntos, desde la raíz ejecuta:

```powershell
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

Los flujos iniciales están relacionados en sus comentarios de código con HU-01, HU-05, HU-11, HU-13, HU-23 y HU-28. La validación de acceso y errores también referencia HU-03 y HU-36. Los módulos aún no implementados quedan pendientes de asociar a sus historias.
