# API del CRM Zimbra

## Propósito

El backend organiza las solicitudes del CRM en rutas, controladores, servicios y repositorios. Las rutas reciben las solicitudes; los controladores preparan la respuesta; los servicios revisan las reglas del negocio; y los repositorios consultan o modifican la base de datos. Las entidades describen las tablas utilizadas.

Las capas que trabajan con una tabla usan su nombre SQL como base del nombre de archivo. Por ejemplo, la solicitud de campañas recorre: `api/routes/CampanasMarketing.routes.js` → `apicontroller/CampanasMarketing.controller.js` → `service/CampanasMarketing.service.js` → `serviceimpl/CampanasMarketing.service.impl.js` → `repository/CampanasMarketing.repository.js` → `entity/CampanasMarketing.entity.js`. Los nombres de las URLs públicas se conservan para no cambiar las solicitudes de Postman.

Las tablas principales con esta convención son `empresas`, `clientes`, `vendedores`, `usuarios`, `recuperacion_claves`, `productos`, `campanas_marketing`, `acciones_marketing`, `actividad_web`, `ventas`, `descargas_prueba`, `asignaciones_crm`, `interacciones`, `detalle_ventas` y `auditoria_cambios`. Los detalles de venta se gestionan junto con `ventas`; la recuperación de claves forma parte de la autenticación; y la auditoría se registra internamente, por lo que estas tablas no tienen rutas públicas independientes. Los módulos de panel, reportes y salud reúnen información de varias tablas y mantienen nombres propios.

El alcance documentado en este apartado cubre las historias HU-10 a HU-21 y HU-34.

## Preparación

1. Crear o seleccionar la base de datos `zimbra_bd`.
2. Configurar `backend/.env` con las credenciales de MySQL y una clave para `JWT_SECRET`. El archivo `.env.example` sirve como referencia.
3. Instalar las dependencias desde la raíz del proyecto con `npm install`.
4. Iniciar el backend con `npm run dev --workspace=backend`.

El archivo `database/CRM Zimbra.sql` crea la base `zimbra_bd` desde cero: contiene instrucciones `DROP DATABASE` y elimina la base con ese nombre antes de crearla nuevamente. Por ello, su importación reemplaza los datos existentes de esa base. La aplicación no ejecuta el archivo SQL automáticamente.

La API se encuentra en `http://localhost:3000`. Todas las rutas de este alcance requieren el encabezado `Authorization: Bearer <token>`, obtenido mediante el inicio de sesión. Las operaciones de administración requieren el rol `Administrador`; las consultas del panel aceptan `Administrador` o `Vendedor`. El panel y el historial limitan los datos de un vendedor a sus clientes asignados.

## Productos y licencias — HU-10 a HU-12

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/products` | Usuario autenticado | Consulta el catálogo. Admite `tipo_licencia`, `estado`, `q`, `page` y `limit`. El vendedor recibe solo productos activos. |
| POST | `/api/products` | Administrador | Registra una licencia activa. |
| POST | `/api/products/actualizar` | Administrador | Actualiza nombre, tipo y precio. Las ventas conservan el precio que tenían al crearse. |
| POST | `/api/products/cambiar-estado` | Administrador | Activa o desactiva el producto sin borrar su historial. |

Ejemplo de alta: `{ "nombre_producto": "Zimbra Básico", "tipo_licencia": "Comercial", "precio": 120000 }`. Los tipos permitidos son `Gratuita`, `Prueba 60 dias` y `Comercial`. Las licencias gratuitas y de prueba tienen precio cero; la comercial debe tener precio positivo. No se permite repetir el nombre con el mismo tipo de licencia.

Ejemplo de actualización: `{ "id_producto": 1, "nombre_producto": "Zimbra Básico", "tipo_licencia": "Comercial", "precio": 125000 }`. Ejemplo de cambio de estado: `{ "id_producto": 1, "estado": false }`.

## Pruebas de producto — HU-13 a HU-15

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/trials` | Usuario autenticado | Registra una prueba de 60 días y la actividad de descarga que suma puntaje al cliente. |
| GET | `/api/trials` | Usuario autenticado | Consulta pruebas. Admite `estado_prueba`, `id_cliente`, `id_producto`, `vence_desde`, `vence_hasta`, `page` y `limit`. |
| POST | `/api/trials/actualizar-vencimientos` | Administrador | Marca como vencidas las pruebas activas cuya fecha terminó y devuelve el total actualizado. |

Ejemplo: `{ "id_cliente": 1, "id_producto": 4 }`. La prueba solo se registra para un cliente habilitado y un producto activo de tipo prueba; no se duplica una prueba activa del mismo producto para el cliente. La consulta presenta días restantes, alerta cuando faltan siete días o menos, y el contrato de venta asociado cuando la prueba se convierte. El esquema crea primero `ventas` y declara `id_venta` como clave foránea dentro de `descargas_prueba`. El servidor también actualiza los vencimientos al iniciar y cada 24 horas.

## Campañas de marketing — HU-16 a HU-18

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/campanas_marketing` | Usuario autenticado | Consulta campañas y sus visitas, visitantes únicos y prospectos calificados. Admite `estado`, `desde`, `hasta`, `page` y `limit`. |
| POST | `/api/campanas_marketing` | Administrador | Crea una campaña. |
| POST | `/api/campanas_marketing/actualizar` | Administrador | Actualiza los datos de una campaña sin desvincular su actividad histórica. |
| POST | `/api/campanas_marketing/cambiar-estado` | Administrador | Activa o pausa una campaña. |

Ejemplo: `{ "nombre_campana": "Lanzamiento", "descripcion": "Campaña de producto", "presupuesto": 500000, "fecha_inicio": "2026-11-01", "fecha_fin": "2026-11-30", "estado": "Activa" }`. Las fechas deben ser válidas, la fecha final no puede ser anterior a la inicial y el presupuesto no puede ser negativo.

## Acciones de marketing y puntaje — HU-19 y HU-21

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/marketing/actions` | Administrador | Consulta acciones, puntaje y cantidad de usos. Admite `q`, `estado`, `page` y `limit`. |
| POST | `/api/marketing/actions` | Administrador | Registra una acción disponible para actividades futuras. |
| POST | `/api/marketing/actions/actualizar` | Administrador | Cambia nombre o puntaje; las actividades anteriores conservan el puntaje que recibieron. |
| POST | `/api/marketing/actions/cambiar-estado` | Administrador | Activa o desactiva la acción sin borrar el historial. |
| POST | `/api/marketing/scoring/recalculate` | Administrador | Recalcula los puntajes y estados a partir de las actividades guardadas. |

Ejemplo de acción: `{ "nombre_accion": "Consulta de precios", "puntaje": 15 }`. El puntaje debe ser un entero entre 0 y 100. El puntaje acumulado clasifica al prospecto como `Frio` (menos de 30), `Tibio` (30 a 69) o `Calificado` (70 o más). Los estados `Cliente` e `Inactivo` se conservan al registrar o recalcular actividades.

## Actividad web — HU-20

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| POST | `/api/activities` | Usuario autenticado | Registra una actividad, guarda el puntaje aplicado y actualiza la clasificación del cliente en una misma operación. |
| POST | `/api/activities/bulk` | Usuario autenticado | Recibe hasta 50 actividades e informa cuáles se registraron y cuáles fueron rechazadas. Cada registro se procesa por separado. |
| GET | `/api/clients/:id/activities` | Usuario autenticado | Consulta el historial del cliente, con acción, campaña, puntaje, origen y fecha. |

Ejemplo individual: `{ "id_cliente": 1, "id_accion": 2, "id_campana": 1, "direccion_origen": "Formulario web", "detalle": "Solicitó información" }`. La campaña es opcional. Solo se aceptan clientes, acciones y campañas habilitados; la campaña debe estar dentro de sus fechas. Para el envío masivo, el cuerpo usa `{ "actividades": [ { "id_cliente": 1, "id_accion": 2 }, { "id_cliente": 2, "id_accion": 3 } ] }`.

## Panel comercial — HU-34

| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| GET | `/api/dashboard` | Administrador o Vendedor | Presenta prospectos calificados, pruebas por vencer, ventas pendientes y asignaciones activas. |

La administración puede enviar `?id_vendedor=1` para filtrar por vendedor o no enviar el filtro para consultar el consolidado. El vendedor recibe únicamente los datos de su usuario y no puede consultar a otro vendedor.

## Registro y trazabilidad

Las operaciones de registro o actualización que cambian datos relevantes se ejecutan dentro de transacciones de base de datos. Si una operación falla, los cambios de esa operación se revierten juntos. Los cambios de puntaje y estado del cliente, así como las modificaciones de catálogo, campañas, pruebas y conversiones, dejan registro de auditoría cuando corresponde. Las actividades guardan una copia del puntaje aplicado para que un cambio posterior del catálogo no altere el historial.

## Reglas de integridad del negocio

- **Referencias entre registros:** antes de guardar, el backend comprueba que los identificadores relacionados sean válidos y que sus registros existan. La base de datos conserva las claves foráneas como protección adicional contra referencias inexistentes.
- **Empresa del cliente:** cuando se informa una empresa para un cliente, el backend verifica que esa empresa exista. La empresa puede omitirse cuando el cliente no pertenece a una organización registrada.
- **Asignaciones comerciales:** cada asignación relaciona un cliente existente con un vendedor activo. El backend permite una sola asignación activa por cliente; al reasignarlo, finaliza la anterior antes de crear la nueva. Si el cliente pasa a estado `Inactivo`, la asignación activa también se finaliza.
- **Interacciones:** cada interacción requiere una asignación existente y activa. Si la solicitud la realiza un vendedor, el backend comprueba que esa asignación le pertenezca.
- **Actividades web:** cada actividad requiere un cliente habilitado y una acción activa. Si se informa una campaña, esta debe existir, estar activa y encontrarse dentro de su periodo vigente.
- **Puntaje del cliente:** el backend guarda en cada actividad el puntaje vigente de la acción y calcula el acumulado a partir del historial. La recalificación conserva los estados `Cliente` e `Inactivo`.
- **Pruebas de producto:** una prueba requiere un cliente habilitado y un producto activo de tipo prueba. El sistema no permite pruebas activas duplicadas del mismo producto para el mismo cliente. La fecha de vencimiento se calcula a 60 días; si una prueba activa ya venció, el sistema la marca como vencida antes de permitir una nueva.
- **Ventas:** una venta requiere un cliente habilitado, un vendedor activo y una asignación activa entre ambos. Para completarla, el backend verifica que incluya productos comerciales activos, cantidades y subtotales válidos, y que el total coincida con la suma de sus productos.
- **Conversión de pruebas:** al completarse una venta, solo se convierten las pruebas vigentes del mismo cliente que correspondan a productos incluidos en esa venta. La venta y la prueba quedan relacionadas en el registro. Como cada tipo de licencia aparece en una fila distinta, el backend identifica la familia comparando el nombre normalizado: elimina acentos, `(prueba)` y sufijos de duración como `1 año` o `3 años`.
- **Auditoría:** cada cambio auditado queda guardado en la misma transacción que el cambio principal. El backend solo permite tablas definidas para auditoría y comprueba que el registro asociado exista antes de guardar el movimiento.
- **Conservación de historia y acceso:** los catálogos con historial se desactivan en vez de eliminarse. El panel presenta al vendedor solo la información de sus clientes asignados; la administración puede consultar el consolidado o filtrar por vendedor.

La relación entre las licencias de prueba y comerciales depende de la forma actual de sus nombres. Si esa convención cambia, el backend deberá utilizar un identificador común de familia de producto.

## Respuestas y errores

Los listados presentan `data` y `pagination` con página, tamaño, total y cantidad de páginas. Las solicitudes con datos inválidos responden con un mensaje comprensible; las referencias inexistentes se rechazan y los valores duplicados se informan como conflicto. Para probar los endpoints de negocio en Postman, primero se debe iniciar sesión y copiar el token en la autorización Bearer.
