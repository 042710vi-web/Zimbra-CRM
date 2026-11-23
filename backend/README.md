# API del CRM Zimbra

Aplicación del CRM conectada a MySQL, base `zimbra_bd`. Esta guía explica las historias **HU-07 a HU-17 y HU-31**, según `Caso_Zimbra_Historias_Endpoints_Responsables.docx`.

## Preparación

1. Preparar `zimbra_bd` con el esquema del equipo. **`database/CRM Zimbra.sql` elimina y recrea la base**: ejecutarlo únicamente sobre datos de desarrollo que se puedan reiniciar.
2. Copiar `.env.example` a `.env` y configurar MySQL, JWT y servidor de correo. Configurar `ZIMBRA_TRACKING_KEY` para el emisor de eventos.
3. Instalar dependencias dentro del backend con `npm install --prefix . --workspaces=false`.
4. Iniciar con `npm start` o `npm run dev`.

Las rutas protegidas usan `Authorization: Bearer <token>`. La sesión existente entrega `req.user.id`, `role`, `vendorId` y `email`. Sin sesión: `401`; sin permisos: `403`; datos inválidos: `400`; duplicados: `409`; errores internos: `500` mediante el middleware del equipo.

El sitio de demostración usa `GET /api/public/catalog`, `POST /api/public/leads`, `POST /api/public/descargas` y `POST /api/public/activities` sin sesión del CRM. El catálogo devuelve productos activos, campañas activas (sin datos internos de presupuesto) y acciones del recorrido. La ruta de actividad para la simulación limita los eventos por IP. El rastreo integrado productivo continúa en `POST /api/tracking/eventos`, que requiere `ZIMBRA_TRACKING_KEY`; esa clave no debe exponerse en el código del navegador.

## Arquitectura

Cada carpeta tiene una tarea:

| Carpeta | Qué hace |
|---|---|
| `api` | Define las direcciones disponibles y quién puede usarlas. `app.js` reúne las rutas de cada módulo. |
| `apicontroller` | Recibe la solicitud y devuelve los datos o el mensaje de error. |
| `service` | Permite usar las operaciones del módulo desde otras partes de la aplicación. |
| `serviceimpl` | Revisa los datos recibidos y coordina la operación. |
| `repository` | Llama a los procedimientos de la base de datos y prepara sus resultados. |
| `entity` | Describe los campos de las tablas que usa la aplicación. |
| `database` | Define las tablas y las reglas para guardar, consultar y actualizar la información. |
| `scheduler` | Actualiza los vencimientos al iniciar el servidor y cada 24 horas. |
| `config` | Reúne la configuración de conexión y del entorno. |
| `utils` | Contiene ayudas compartidas para revisar datos y preparar respuestas. |

Cada repositorio llama a las operaciones de su propio módulo. La base de datos se encarga de guardar juntos los cambios relacionados o deshacerlos si ocurre un error. Al terminar, el repositorio deja disponible la conexión para otras solicitudes.

Las reglas SQL de estas historias están en el bloque «HISTORIAS DE USUARIO 7 A 17 Y 31», las consultas guardadas en «Consultas del panel y pruebas por vencer» y las ayudas de búsqueda en «Ayudas para buscar los datos con mayor rapidez» de `database/CRM Zimbra.sql`.

Los avisos de prueba usan el servicio de correos después de guardar la descarga. Si el correo falla, la descarga se conserva.

`DescargasPrueba.routes.js` define las operaciones autenticadas de `/api/trials` y el registro público `POST /api/public/descargas`. El registro público no exige sesión; ambos accesos comparten el controlador y las reglas de descarga. En `ActividadWeb.routes.js`, las rutas del CRM usan sesión Bearer y la entrada automática de Tracking usa `x-tracking-key`. Los comentarios de cada grupo describen su acceso y finalidad.

Las rutas se definen en el archivo de su módulo. `AccionesMarketing.routes.js` atiende `/api/actions` y el alias `/api/marketing/actions`; `ActividadWeb.routes.js` atiende el registro autenticado en `/api/activities`, la consulta en `/api/web-activity` y la recepción automática con clave en `/api/tracking/eventos`; `Calificacion.routes.js` atiende `/api/scoring/recalificar` y el alias `/api/marketing/scoring/recalculate`. La recalificación utiliza `Calificacion.controller.js`.

## Transacciones y automatizaciones de MySQL

El script requiere MySQL 8.0.16 o superior, tablas InnoDB y permisos para crear rutinas, triggers, vistas e índices. Antes de iniciar el backend, los objetos `sp_*`, `trg_*`, `fn_calificacion` y `vw_*` deben estar instalados. En una base con información existente, aplicar los bloques de estas historias con un cambio preparado para conservar los datos existentes; el script completo recrea la base de desarrollo.

Un procedimiento almacenado es una operación guardada en la base de datos que el backend puede solicitar. `START TRANSACTION` inicia el trabajo, `COMMIT` guarda todos sus cambios y `ROLLBACK` los deshace si ocurre un error. Un trigger es una regla que se ejecuta al guardar o actualizar datos; sus cambios forman parte de la misma operación. También se registra quién solicitó el cambio.

| HU | Procedimientos del backend | Automatización |
|---|---|---|
| 07/08 | `sp_guardar_producto`, `sp_estado_producto`, `sp_listar_productos` | Licencia/precio, valores únicos e historial de cambios del catálogo. |
| 09/10/11 | `sp_registrar_prueba`, `sp_listar_pruebas`, `sp_vencer_pruebas` | Descarga, actividad y calificación guardadas juntas; vencimientos y alertas. |
| 12/13 | `sp_guardar_campana`, `sp_estado_campana`, `sp_listar_campanas` | Fechas, presupuesto, reactivación, métricas y auditoría. |
| 14 | `sp_guardar_accion`, `sp_estado_accion`, `sp_listar_acciones` | Catálogo de puntajes y usos históricos. |
| 15 | `sp_registrar_actividad`, `sp_actividad_lote`, `sp_listar_actividad` | Validación del evento, puntos y alertas mediante triggers. |
| 16 | `sp_recalificar` | Nueva suma de los puntos del historial y nuevas calificaciones. |
| 17 | `sp_listar_alertas`, `sp_atender_alerta` | Permisos de atención, fecha, historial y control de avisos repetidos. |
| 31 | `sp_dashboard` | Indicadores consultados juntos. |

El lote de actividad utiliza `SAVEPOINT sp_evento` por elemento. Un dato inválido ejecuta `ROLLBACK TO SAVEPOINT`, registra el rechazo y permite continuar; `RELEASE SAVEPOINT` cierra ese punto. El COMMIT final confirma los válidos. Un error de infraestructura revierte el lote completo. Una descarga individual se confirma o revierte completa, junto con su actividad, puntaje, auditoría y alertas.

`fn_calificacion` define los umbrales. Los triggers de actividad capturan el puntaje vigente y actualizan al cliente exactamente una vez. El trigger de descarga registra su actividad. Los triggers de auditoría registran cambios dentro de la misma transacción. Las rutinas internas `sp_actividad_interno` y `sp_alerta_interno` se ejecutan desde los procedimientos o triggers de este módulo.

## Endpoints oficiales

Todas las rutas oficiales utilizan GET o POST. Los IDs de actualización, cambio de estado y atención se reciben en JSON. Las columnas de archivos se refieren a `apicontroller/` y `serviceimpl/`.

| HU | Método | Ruta | Controlador | Servicio impl | Acceso |
|---|---|---|---|---|---|
| 07 | POST | `/api/products` | `productos.controller.js` | `productos.service.impl.js` | Administrador |
| 08 | GET | `/api/products` | `productos.controller.js` | `productos.service.impl.js` | Autenticado |
| 08 | POST | `/api/products/actualizar` | `productos.controller.js` | `productos.service.impl.js` | Administrador |
| 08 | POST | `/api/products/cambiar-estado` | `productos.controller.js` | `productos.service.impl.js` | Administrador |
| 09 | POST | `/api/trials` | `DescargasPrueba.controller.js` | `DescargasPrueba.service.impl.js` | Autenticado |
| 09 | POST | `/api/public/descargas` | `DescargasPrueba.controller.js` | `DescargasPrueba.service.impl.js` | Público |
| 10 | GET | `/api/trials` | `DescargasPrueba.controller.js` | `DescargasPrueba.service.impl.js` | Autenticado |
| 11 | POST | `/api/trials/actualizar-vencimientos` | `DescargasPrueba.controller.js` | `DescargasPrueba.service.impl.js` | Administrador |
| 12 | POST | `/api/campaigns` | `CampanasMarketing.controller.js` | `CampanasMarketing.service.impl.js` | Administrador |
| 13 | GET | `/api/campaigns` | `CampanasMarketing.controller.js` | `CampanasMarketing.service.impl.js` | Administrador |
| 13 | POST | `/api/campaigns/actualizar` | `CampanasMarketing.controller.js` | `CampanasMarketing.service.impl.js` | Administrador |
| 13 | POST | `/api/campaigns/cambiar-estado` | `CampanasMarketing.controller.js` | `CampanasMarketing.service.impl.js` | Administrador |
| 14 | GET | `/api/actions` | `AccionesMarketing.controller.js` | `AccionesMarketing.service.impl.js` | Administrador |
| 14 | POST | `/api/actions` | `AccionesMarketing.controller.js` | `AccionesMarketing.service.impl.js` | Administrador |
| 14 | POST | `/api/actions/actualizar` | `AccionesMarketing.controller.js` | `AccionesMarketing.service.impl.js` | Administrador |
| 15 | POST | `/api/tracking/eventos` | `ActividadWeb.controller.js` | `ActividadWeb.service.impl.js` | Clave de rastreo |
| 15 | GET | `/api/web-activity` | `ActividadWeb.controller.js` | `ActividadWeb.service.impl.js` | Autenticado |
| 16 | POST | `/api/scoring/recalificar` | `Calificacion.controller.js` | `Calificacion.service.impl.js` | Administrador |
| 17 | GET | `/api/alerts` | `Alertas.controller.js` | `Alertas.service.impl.js` | Administrador/Vendedor |
| 17 | POST | `/api/alerts/atender` | `Alertas.controller.js` | `Alertas.service.impl.js` | Administrador/Vendedor |
| 31 | GET | `/api/dashboard` | `Dashboard.controller.js` | `Dashboard.service.impl.js` | Administrador/Vendedor |

`Calificacion.routes.js`, `Calificacion.controller.js`, `Calificacion.service.js`, `Calificacion.service.impl.js` y `Calificacion.repository.js` forman el módulo HU-16. El repositorio llama a `sp_recalificar` para reconstruir el puntaje y actualizar la clasificación en MySQL.

## Alias de compatibilidad

| Alias | Equivalencia o función |
|---|---|
| GET/POST `/api/campanas_marketing` | GET/POST `/api/campaigns` |
| POST `/api/campanas_marketing/actualizar` | POST `/api/campaigns/actualizar` |
| POST `/api/campanas_marketing/cambiar-estado` | POST `/api/campaigns/cambiar-estado` |
| GET/POST `/api/marketing/actions` | GET/POST `/api/actions` |
| POST `/api/marketing/actions/actualizar` | POST `/api/actions/actualizar` |
| POST `/api/marketing/actions/cambiar-estado` | Activa/desactiva acciones sin borrarlas |
| POST `/api/marketing/scoring/recalculate` | POST `/api/scoring/recalificar` |
| POST `/api/activities` | Registro individual autenticado |
| POST `/api/activities/bulk` | Carga autenticada de hasta 50 actividades |
| GET `/api/clients/:id/activities` | Historial conservado en el router existente |
| PUT `/api/products/:id` | POST `/api/products/actualizar` |
| PATCH `/api/products/:id/estado` | POST `/api/products/cambiar-estado` |

PUT y PATCH son exclusivamente alias. `body.id_producto` tiene prioridad sobre `params.id`.

## Productos y pruebas HU-07 a HU-11

Se admiten licencias Gratuita, Prueba 60 dias y Comercial. Las dos primeras requieren precio cero; Comercial exige precio positivo representable con dos decimales. Nombre y licencia son únicos. Los vendedores solo consultan productos activos. Editar el catálogo no altera `detalle_ventas` ni sus precios históricos.

Registro de producto:

```json
{ "nombre_producto": "Zimbra Comercial", "tipo_licencia": "Comercial", "precio": 120000 }
```

Actualización y cambio de disponibilidad:

```json
{ "id_producto": 1, "nombre_producto": "Zimbra Comercial", "tipo_licencia": "Comercial", "precio": 125000 }
```

```json
{ "id_producto": 1, "estado": false }
```

GET `/api/products` admite `tipo_licencia`, `estado`, `q`, `page` y `limit`.

Registro de descarga en ambas rutas:

```json
{ "id_cliente": 1, "id_producto": 4 }
```

Los IDs de ejemplo deben corresponder a registros reales válidos. El cliente debe existir y no estar Inactivo; el producto debe estar activo y ser Gratuita o Prueba 60 dias, rechazando Comercial. El formulario público identifica al cliente mediante el flujo existente `/api/public/leads` (HU-04) y luego envía su `id_cliente`; descargas no crea ni modifica clientes por su cuenta.

La prueba inicia Activa, con fechas de MySQL y fin 60 días después. Si hay otra activa vigente para el mismo cliente/producto responde `409`, indicando su fecha de vencimiento. Las activas caducadas se vencen antes de permitir una nueva. La acción configurada `Descarga de prueba (60 días)` registra el puntaje histórico y recalifica en la misma transacción. Después del COMMIT se solicita el correo `prueba_iniciada`, con variables `nombre` y `fecha_fin`.

GET `/api/trials` admite `estado_prueba`, `id_producto`, `id_cliente`, `vence_desde`, `vence_hasta`, `page`, `limit`; también los alias `fecha_fin_desde` y `fecha_fin_hasta`. Fechas: `AAAA-MM-DD`. El filtro Activa excluye las fechas caducadas, aunque el proceso diario aún no haya ejecutado. Las activas se ordenan por vencimiento ascendente. Devuelve `dias_restantes`, `urgente` y su alias previo `proxima_a_vencer` para activas entre hoy y siete días; conserva `id_venta` y `numero_contrato` para convertidas. El vendedor consulta únicamente pruebas de sus asignaciones activas.

POST `/api/trials/actualizar-vencimientos` no requiere cuerpo. Vence únicamente Activa con `fecha_fin < CURRENT_DATE`, conserva Convertida, genera alertas Prueba por vencer entre hoy y siete días y solicita `prueba_por_vencer` después del COMMIT. Devuelve `vencidas`, `alertas_generadas`, `correos_solicitados` y `correos_fallidos`.

`scheduler/vencimiento.scheduler.js` invoca el mismo servicio al arrancar con conexión MySQL y cada 24 horas, deteniendo el temporizador al cerrar el servidor. La conversión por compra sigue a cargo de ventas y de los flujos existentes de Yisel.

## Campañas y acciones HU-12 a HU-14

Registro de campaña; para actualizar se envían estos datos junto con `id_campana`:

```json
{ "codigo_campana": "CAMP-ZIMBRA-2026", "nombre_campana": "Lanzamiento Zimbra", "descripcion": "Campaña comercial", "presupuesto": 500000, "fecha_inicio": "2026-11-01", "fecha_fin": "2026-12-31", "estado": "Activa" }
```

Presupuesto opcional (`NULL` si se omite), no negativo cuando se informa; nombre y `codigo_campana` únicos, y `fecha_fin >= fecha_inicio`. El código admite letras, números, guion y guion bajo; se normaliza a mayúsculas. Si se omite al crear, MySQL genera uno; al editar, omitirlo conserva el código existente. Los duplicados se rechazan con `409`, sin confirmación para crear otro registro. La actualización recibe el conjunto de datos mostrado. Filtros: `estado`, `desde`, `hasta`, `page`, `limit`. Las métricas incluyen `visitas`, `visitantes` únicos y `prospectos_calificados`; desactivar conserva las actividades históricas.

Cambio de estado con extensión opcional:

```json
{ "id_campana": 1, "estado": "Activa", "fecha_fin": "2026-12-31" }
```

Para desactivar basta `id_campana` y `estado: "Inactiva"`. Reactivar una campaña vencida sin una nueva fecha vigente y coherente devuelve `400`.

Registro de acción; para actualizar se añade `id_accion`:

```json
{ "nombre_accion": "Consulta de precios", "puntaje": 15 }
```

El nombre es único y el puntaje entero entre 0 y 100. El catálogo devuelve `veces_registrada`. Actualizar puntajes solo afecta a eventos futuros: no cambia `puntaje_otorgado` histórico ni recalcula automáticamente.

## Actividad y calificación HU-15 y HU-16

POST `/api/tracking/eventos` exige `x-tracking-key` igual a `ZIMBRA_TRACKING_KEY`. Sin configuración devuelve `503`; clave ausente o inválida, `401`. El emisor envía `id_cliente` si el visitante está identificado, o una `clave_rastreo` propia del visitante si aún es anónimo. Esta clave de identidad es diferente de la clave de acceso del sitio que envía los eventos `x-tracking-key`. Los alias `/api/activities` y `/api/activities/bulk` mantienen autenticación Bearer.

```json
{ "id_cliente": 1, "id_accion": 2, "id_campana": 1, "direccion_origen": "Formulario web", "detalle": "Solicitó información" }
```

Se valida cliente no Inactivo y acción activa. Campaña inexistente o Inactiva: se guarda `NULL` y una observación en `detalle`, sin perder el evento. El trigger captura los puntos vigentes y, para prospectos identificados que pueden acumular puntos, actualiza acumulado y estado evitando que dos solicitudes cambien al cliente al mismo tiempo en la misma transacción. Los eventos anónimos conservan la copia del puntaje, pero no lo aplican hasta identificarse. La carga masiva recibe `{ "actividades": [ ... ] }`; el procedimiento aplica un savepoint por elemento y devuelve aceptados/rechazados por índice, con máximo 50 elementos.

Un evento anónimo utiliza el mismo endpoint de Tracking con un cuerpo como:

```json
{ "clave_rastreo": "visitante-8f2a", "id_accion": 2, "direccion_origen": "Página de precios" }
```

La respuesta indica `pendiente_identificacion: true` y cero puntos agregados al cliente. Al enviar el formulario público se incluyen nombre, correo y la misma clave:

```json
{ "nombre_completo": "Ana Pérez", "correo_electronico": "ana@example.com", "clave_rastreo": "visitante-8f2a" }
```

Los rechazos de clave de acceso y de datos se registran en el registro de mensajes del servidor sin registrar el valor de la clave de acceso.

GET `/api/web-activity?id_cliente=1` requiere `id_cliente`, permite `page` y `limit` y ordena por `fecha_actividad DESC`. Un vendedor solo consulta sus clientes asignados.

La regla común clasifica `< 30`: Frio; `30..69`: Tibio; `>= 70`: Calificado. Solo Frio, Tibio, Calificado y En Negociacion acumulan puntos; En Negociacion conserva su estado comercial. Cliente, Convertido y Descartado pueden conservar actividad con cero puntos nuevos. Inactivo no admite eventos ni asociación de eventos pendientes. Al pasar a Calificado marca `clientes.estado_salesforce = 'Pendiente'` y genera alerta para el vendedor activo o administradores sin asignación. Una nueva actividad de un Calificado genera Retorno al sitio. No se invoca ni se modifica Salesforce.

POST `/api/scoring/recalificar` no requiere cuerpo: suma `actividad_web.puntaje_otorgado` para todos los clientes guardando juntos los cambios, conserva estados protegidos y genera las alertas de nuevas calificaciones, incluidas las sin vendedor.

Los triggers `trg_actividad_bi` y `trg_actividad_ai` validan y registran el puntaje del evento, actualizan la clasificación y generan las alertas correspondientes. La función SQL conserva los estados comerciales protegidos. El registro de pruebas también utiliza esta automatización mediante su trigger de descarga. El formulario público `/api/public/leads` recibe la misma `clave_rastreo` del visitante y asocia sus eventos pendientes al cliente dentro de su transacción. Los triggers aplican cada puntaje una sola vez y conservan la fecha y acción originales. `visitantes_web` mantiene esa asociación para los eventos posteriores. El historial expone `es_retorno` incluso cuando ya existe una alerta pendiente del mismo motivo.

## Alertas HU-17

GET `/api/alerts`: filtros `estado_alerta` (Pendiente/Atendida), `tipo_alerta`, `page`, `limit`. El administrador ve todas, incluidas las sin vendedor, y puede filtrar `id_vendedor`. El vendedor queda limitado al `vendorId` de sesión; pedir otro vendedor devuelve `403`.

POST `/api/alerts/atender`:

```json
{ "id_alerta": 1, "nota_atencion": "Cliente contactado y seguimiento programado" }
```

El vendedor no puede atender alertas ajenas ni sin asignación (`403`); el administrador sí. Se guarda Atendida, fecha e ID del usuario de sesión, conservando el registro. Nota opcional, máximo 500 caracteres. Repetir la atención no sobrescribe responsable ni fecha originales.

Las alertas automáticas usan una clave única por tipo y cliente, evitando que dos solicitudes cambien al cliente al mismo tiempo. Si varias pruebas van a vencer, una sola alerta agrupa productos y el próximo vencimiento; cada descarga conserva su aviso por correo independiente. Atender libera `clave_evento` (`NULL`, permitido por SQL), conservando la alerta para permitir un futuro evento del mismo motivo.

## Dashboard HU-31

GET `/api/dashboard` devuelve `prospectos_calificados` por puntaje descendente, `alertas_pendientes`, `pruebas_por_vencer`, `asignaciones_activas` y `ventas_pendientes` con cantidad y total proyectado. El vendedor solo ve su grupo de datos permitido aunque envíe otro `id_vendedor`. El administrador recibe el consolidado con calificados sin asignación, o filtra `?id_vendedor=1`.

## Integración y operación


Los eventos `prueba_iniciada` y `prueba_por_vencer` incluyen `id_descarga`: se deduplican por evento, cliente y descarga. `sp_reservar_correo_prueba` reserva el aviso antes de servidor de correo y `sp_resultado_correo_prueba` registra su resultado después. Repetir el mismo aviso no lo envía otra vez; una descarga distinta tiene su propia clave. Los fallidos utilizan el reintento de HU-19. Las llamadas de correo sin `id_descarga` conservan la control de avisos repetidos general por evento y cliente. `correos_solicitados` cuenta solicitudes aceptadas, incluidas las ya enviadas.

El servidor necesita MySQL con las rutinas instaladas y servidor de correo configurado para el envío de avisos. Los tiempos de respuesta dependen de los índices, el volumen de datos y la cantidad de solicitudes al mismo tiempo. Los nombres de archivos e importaciones deben respetar mayúsculas y minúsculas al desplegar en un sistema que las distinga.
