# API CRM Zimbra

## Inicio

1. Crear la base `zimbra_bd` en MySQL e importar el SQL de `database/CRM Zimbra.sql`. Ese script borra y vuelve a crear la base si ya existe; revisa el contenido antes de ejecutarlo.
2. Desde la raíz del proyecto, ejecutar `npm install` para instalar las dependencias de backend y frontend.
3. Copiar `backend/.env.example` como `backend/.env` y configurar las credenciales MySQL y `JWT_SECRET`.
4. Ejecutar `npm run dev --workspace=backend` desde la raíz, o `npm run dev` para iniciar backend y frontend.

La API queda en `http://localhost:3000`. Rutas implementadas:

- `POST /api/auth/login` `{ "email": "...", "password": "..." }`
- `POST /api/clients` `{ "nombre_completo": "...", "correo_electronico": "...", "telefono": "...", "id_empresa": 1 }` (también acepta `nombre_empresa`, `sector_industria`, `sitio_web` para crearla)
- `GET /api/products`
- `POST /api/trials` `{ "id_cliente": 1, "id_producto": 4 }`
- `POST /api/assignments` `{ "id_cliente": 1, "id_vendedor": 1 }` (solo Administrador)
- `POST /api/sales` `{ "id_cliente": 1, "id_vendedor": 1, "metodo_pago": "PSE", "items": [{ "id_producto": 11, "cantidad": 2 }] }`

Todas las rutas salvo login y health requieren `Authorization: Bearer <token>`. La base de datos debe tener importado el esquema y datos de acceso de prueba.

## Endpoints del alcance de desarrollo

| Método | Ruta | HU |
|---|---|---|
| GET, POST | `/api/vendors` | Catálogo de vendedores (sin HU asignada en la matriz recibida) |
| GET, POST | `/api/assignments` | HU-24, HU-23 |
| POST | `/api/assignments/reasignar` | HU-25 |
| POST | `/api/assignments/finalizar` | HU-25 |
| GET, POST | `/api/interactions` | HU-27, HU-26 |
| GET, POST | `/api/sales` | HU-29, HU-28 |
| POST | `/api/sales/actualizar` | HU-30 |
| POST | `/api/sales/cambiar-estado` | HU-31 |
| GET | `/api/reports/sales`, `/api/reports/clients`, `/api/reports/campaigns` | HU-32 |
| GET | `/api/reports/interactions` | HU-33 |

Los listados reciben `page` y `limit`; permiten los filtros descritos en cada historia. El alta de ventas requiere `numero_contrato`, `metodo_pago` y `items: [{ "id_producto": 1, "cantidad": 1 }]`. Los reportes reciben `desde` y `hasta` (`YYYY-MM-DD`) y `format=csv` devuelve CSV.
