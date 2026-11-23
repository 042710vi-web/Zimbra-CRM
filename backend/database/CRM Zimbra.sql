-- =====================================================================
-- 1. Creación y selección de la base de datos
-- =====================================================================

DROP DATABASE IF EXISTS zimbra_bd;
CREATE DATABASE zimbra_bd;
USE zimbra_bd;
SET NAMES utf8mb4;

-- =====================================================================
-- 2. Tablas y ajustes de su estructura
-- =====================================================================

/* Almacena la información de la empresa a las que pertenecen los clientes. */
CREATE TABLE empresas (
    id_empresa INT AUTO_INCREMENT PRIMARY KEY,
    nombre_empresa VARCHAR(150) NOT NULL UNIQUE,
    sector_industria VARCHAR(100),
    sitio_web VARCHAR(150)
);

/* Registra la información personal de los visitantes, su estado de
   calificación y puntaje acumulado. */
CREATE TABLE clientes (
    id_cliente INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT,
    nombre_completo VARCHAR(150) NOT NULL,
    correo_electronico VARCHAR(100) NOT NULL UNIQUE,
    telefono VARCHAR(50),
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    puntaje_total INT DEFAULT 0,
    estado_cliente VARCHAR(50) DEFAULT 'Frio',
    estado_salesforce ENUM('No requerido','Pendiente','Sincronizado','Fallido') NOT NULL DEFAULT 'No requerido',
    CONSTRAINT chk_estado_cliente CHECK (estado_cliente IN
        ('Frio','Tibio','Calificado','En Negociacion','Cliente','Convertido','Descartado','Inactivo')),
    FOREIGN KEY (id_empresa) REFERENCES empresas(id_empresa)
);

/* Almacena la información del personal del equipo de ventas. */
CREATE TABLE vendedores (
    id_vendedor INT AUTO_INCREMENT PRIMARY KEY,
    nombre_vendedor VARCHAR(150) NOT NULL,
    correo_vendedor VARCHAR(100) NOT NULL UNIQUE,
    estado BOOLEAN DEFAULT TRUE
);

/* Administra los usuarios de acceso al sistema, roles y credenciales. */
CREATE TABLE usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    id_vendedor INT NULL,
    correo_acceso VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL,
    estado BOOLEAN DEFAULT TRUE,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_rol CHECK (rol IN ('Administrador','Vendedor')),
    FOREIGN KEY (id_vendedor) REFERENCES vendedores(id_vendedor)
);

/* Controla la generación y validación de tokens temporales para
   recuperación de contraseñas. */
CREATE TABLE recuperacion_claves (
    id_recuperacion BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    token_hash CHAR(64) NOT NULL,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    expira_en DATETIME NOT NULL,
    usado_en DATETIME NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario)
);

/* Catálogo de las licencias de software, tanto de prueba como comerciales. */
CREATE TABLE productos (
    id_producto INT AUTO_INCREMENT PRIMARY KEY,
    nombre_producto VARCHAR(100) NOT NULL,
    tipo_licencia VARCHAR(50) NOT NULL,
    precio DECIMAL(10,2) NOT NULL,
    estado BOOLEAN DEFAULT TRUE,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_tipo_licencia CHECK (tipo_licencia IN ('Gratuita','Prueba 60 dias','Comercial')),
    CONSTRAINT chk_precio CHECK (precio >= 0),
    CONSTRAINT chk_precio_por_licencia CHECK (
        (tipo_licencia IN ('Gratuita','Prueba 60 dias') AND precio = 0)
        OR (tipo_licencia = 'Comercial' AND precio > 0)
    ),
    CONSTRAINT uq_producto_nombre_tipo UNIQUE (nombre_producto, tipo_licencia)
);

/* Registra las distintas iniciativas de marketing diseñadas para atraer
   tráfico con control de fechas. */
CREATE TABLE campanas_marketing (
    id_campana INT AUTO_INCREMENT PRIMARY KEY,
    codigo_campana VARCHAR(50) NULL UNIQUE,
    nombre_campana VARCHAR(150) NOT NULL UNIQUE,
    descripcion TEXT,
    presupuesto DECIMAL(12,2) NOT NULL,
    fecha_inicio DATE,
    fecha_fin DATE,
    estado VARCHAR(20) DEFAULT 'Activa',
    CONSTRAINT chk_presupuesto_campana CHECK (presupuesto >= 0),
    CONSTRAINT chk_estado_campana CHECK (estado IN ('Activa','Inactiva')),
    CONSTRAINT chk_fechas_campana CHECK (fecha_fin >= fecha_inicio)
);

/* Catálogo de acciones rastreables y el puntaje asignado a cada una. */
CREATE TABLE acciones_marketing (
    id_accion INT AUTO_INCREMENT PRIMARY KEY,
    nombre_accion VARCHAR(100) NOT NULL UNIQUE,
    puntaje INT NOT NULL,
    estado BOOLEAN DEFAULT TRUE,
    CONSTRAINT chk_puntaje_positivo CHECK (puntaje BETWEEN 0 AND 100)
);

/* HU-15: El visitante conserva una clave hasta identificarse en HU-04.
    Su fila se bloquea antes del cliente para coordinar formularios y eventos
   concurrentes. La asociación persiste para las visitas posteriores. */
CREATE TABLE visitantes_web (
    clave_rastreo VARCHAR(100) PRIMARY KEY,
    id_cliente INT NULL,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente)
) ENGINE = InnoDB;

/* Registra cada interacción o evento que un cliente realiza dentro del
   sitio web. */
CREATE TABLE actividad_web (
    id_actividad INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT NULL,
    id_accion INT NOT NULL,
    id_campana INT,
    clave_rastreo VARCHAR(100) NULL,
    es_retorno BOOLEAN NOT NULL DEFAULT FALSE,
    fecha_actividad DATETIME DEFAULT CURRENT_TIMESTAMP,
    puntaje_otorgado INT NOT NULL DEFAULT 0,
    direccion_origen VARCHAR(255),
    detalle VARCHAR(255),
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente),
    FOREIGN KEY (id_accion) REFERENCES acciones_marketing(id_accion),
    FOREIGN KEY (id_campana) REFERENCES campanas_marketing(id_campana),
    CONSTRAINT chk_actividad_identidad CHECK (id_cliente IS NOT NULL OR clave_rastreo IS NOT NULL)
);

/* Almacena la información general de cada contrato, método de pago y
   el total consolidado. */
CREATE TABLE ventas (
    id_venta INT AUTO_INCREMENT PRIMARY KEY,
    numero_contrato VARCHAR(100) UNIQUE,
    id_cliente INT NOT NULL,
    id_vendedor INT NOT NULL,
    fecha_venta DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado_venta VARCHAR(30) DEFAULT 'Pendiente',
    metodo_pago VARCHAR(50),
    total_venta DECIMAL(12,2) DEFAULT 0,
    CONSTRAINT chk_estado_venta CHECK (estado_venta IN ('Pendiente','Completada','Cancelada')),
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente),
    FOREIGN KEY (id_vendedor) REFERENCES vendedores(id_vendedor)
);

/* Controla las descargas de las versiones de prueba y sus respectivas
   fechas de vencimiento. */
CREATE TABLE descargas_prueba (
    id_descarga INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT NOT NULL,
    id_producto INT NOT NULL,
    id_venta INT NULL,
    fecha_inicio DATE DEFAULT (CURRENT_DATE),
    fecha_fin DATE NOT NULL,
    estado_prueba VARCHAR(30) DEFAULT 'Activa',
    CONSTRAINT chk_estado_prueba CHECK (estado_prueba IN ('Activa','Vencida','Cancelada','Convertida')),
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente),
    FOREIGN KEY (id_producto) REFERENCES productos(id_producto),
    CONSTRAINT fk_descargas_venta FOREIGN KEY (id_venta) REFERENCES ventas(id_venta)
);

/* Gestiona la asignación histórica y actual de los clientes a los
   vendedores. */
CREATE TABLE asignaciones_crm (
    id_asignacion INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT NOT NULL,
    id_vendedor INT NOT NULL,
    fecha_asignacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_fin DATETIME NULL,
    estado VARCHAR(20) DEFAULT 'Activa',
    CONSTRAINT chk_estado_asignacion CHECK (estado IN ('Activa','Finalizada')),
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente),
    FOREIGN KEY (id_vendedor) REFERENCES vendedores(id_vendedor)
);

/* Registra la bitácora de comunicaciones, resultados y gestiones
   comerciales con los clientes. */
CREATE TABLE interacciones (
    id_interaccion INT AUTO_INCREMENT PRIMARY KEY,
    id_asignacion INT NOT NULL,
    tipo_interaccion VARCHAR(40) NOT NULL,
    resultado VARCHAR(60),
    fecha_interaccion DATETIME DEFAULT CURRENT_TIMESTAMP,
    notas TEXT,
    CONSTRAINT chk_tipo_interaccion CHECK (tipo_interaccion IN
        ('Llamada','Correo','Meeting','Alerta Automática')),
    FOREIGN KEY (id_asignacion) REFERENCES asignaciones_crm(id_asignacion)
);

/* Detalla los productos específicos, cantidades, precios y subtotales
   acordados en cada venta. */
CREATE TABLE detalle_ventas (
    id_detalle INT AUTO_INCREMENT PRIMARY KEY,
    id_venta INT NOT NULL,
    id_producto INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL,
    CONSTRAINT chk_cantidad CHECK (cantidad > 0),
    FOREIGN KEY (id_venta) REFERENCES ventas(id_venta),
    FOREIGN KEY (id_producto) REFERENCES productos(id_producto)
);

/* Conserva la trazabilidad histórica de los cambios. */
CREATE TABLE auditoria_cambios (
    id_auditoria BIGINT AUTO_INCREMENT PRIMARY KEY,
    tabla VARCHAR(50) NOT NULL,
    id_registro INT NOT NULL,
    campo VARCHAR(50),
    valor_anterior TEXT,
    valor_nuevo TEXT,
    usuario_bd VARCHAR(100),
    fecha_cambio DATETIME DEFAULT CURRENT_TIMESTAMP
);

/* Conserva alertas comerciales para prospectos calificados, actividad de
   retorno y vencimientos de prueba. */
CREATE TABLE alertas (
    id_alerta BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT NOT NULL,
    id_vendedor INT NULL,
    id_descarga INT NULL,
    tipo_alerta VARCHAR(40) NOT NULL,
    mensaje VARCHAR(255) NOT NULL,
    clave_evento VARCHAR(120) UNIQUE,
    estado_alerta VARCHAR(20) NOT NULL DEFAULT 'Pendiente',
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_atencion DATETIME NULL,
    id_usuario_atendio INT NULL,
    nota_atencion VARCHAR(500) NULL,
    CONSTRAINT chk_tipo_alerta CHECK (tipo_alerta IN
        ('Prospecto calificado','Retorno al sitio','Prueba por vencer','Prueba vencida')),
    CONSTRAINT chk_estado_alerta CHECK (estado_alerta IN ('Pendiente','Atendida')),
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente),
    FOREIGN KEY (id_vendedor) REFERENCES vendedores(id_vendedor),
    FOREIGN KEY (id_descarga) REFERENCES descargas_prueba(id_descarga),
    FOREIGN KEY (id_usuario_atendio) REFERENCES usuarios(id_usuario),
    INDEX idx_alertas_vendedor_estado (id_vendedor, estado_alerta, fecha_creacion),
    INDEX idx_alertas_cliente (id_cliente, fecha_creacion)
);

/* Define plantillas por evento y permite una sola plantilla activa para
   cada evento. */
CREATE TABLE plantillas_correo (
    id_plantilla INT AUTO_INCREMENT PRIMARY KEY,
    evento VARCHAR(80) NOT NULL,
    nombre_plantilla VARCHAR(120) NOT NULL,
    asunto VARCHAR(200) NOT NULL,
    cuerpo TEXT NOT NULL,
    estado BOOLEAN NOT NULL DEFAULT TRUE,
    evento_activo VARCHAR(80) GENERATED ALWAYS AS
        (CASE WHEN estado = TRUE THEN evento ELSE NULL END) STORED,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT uq_plantilla_activa_por_evento UNIQUE (evento_activo)
);

/* Guarda el resultado, los intentos y la clave de idempotencia de cada
   correo automatizado. */
CREATE TABLE correos_enviados (
    id_correo BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT NOT NULL,
    id_plantilla INT NOT NULL,
    clave_idempotencia VARCHAR(160) NOT NULL UNIQUE,
    evento VARCHAR(80) NOT NULL,
    correo_destino VARCHAR(150) NOT NULL,
    asunto_enviado VARCHAR(200) NOT NULL,
    cuerpo_enviado TEXT NOT NULL,
    estado_correo VARCHAR(20) NOT NULL DEFAULT 'Pendiente',
    intentos TINYINT UNSIGNED NOT NULL DEFAULT 0,
    ultimo_error TEXT NULL,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_envio DATETIME NULL,
    proximo_intento DATETIME NULL,
    CONSTRAINT chk_estado_correo CHECK (estado_correo IN ('Pendiente','Enviado','Fallido')),
    CONSTRAINT chk_intentos_correo CHECK (intentos BETWEEN 0 AND 3),
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente),
    FOREIGN KEY (id_plantilla) REFERENCES plantillas_correo(id_plantilla),
    INDEX idx_correos_cliente (id_cliente, fecha_creacion)
);

/* Una fila por sincronización lógica; intentos cuenta las
   llamadas hechas (máximo inicial + 3 reintentos = 4). */
CREATE TABLE salesforce_sincronizaciones (
    id_sincronizacion BIGINT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT NOT NULL,
    objeto_salesforce VARCHAR(30) NOT NULL,
    operacion ENUM('Crear','Actualizar','Upsert') NOT NULL DEFAULT 'Upsert',
    estado ENUM('Pendiente','Sincronizado','Fallido') NOT NULL DEFAULT 'Pendiente',
    intentos TINYINT UNSIGNED NOT NULL DEFAULT 0,
    salesforce_id VARCHAR(30) NULL,
    respuesta_salesforce JSON NULL,
    mensaje_error TEXT NULL,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT chk_sf_objeto CHECK (objeto_salesforce IN ('Lead','Contact')),
    CONSTRAINT chk_sf_intentos CHECK (intentos <= 4),
    CONSTRAINT fk_sf_cliente FOREIGN KEY (id_cliente)
        REFERENCES clientes(id_cliente)
        ON UPDATE RESTRICT ON DELETE RESTRICT,
    INDEX idx_sf_estado_fecha (estado, fecha_creacion),
    INDEX idx_sf_cliente_fecha (id_cliente, fecha_creacion)
);

-- =====================================================================
-- 3. Inserciones y preparación de los datos iniciales
-- =====================================================================

-- Empresas
INSERT INTO empresas (id_empresa, nombre_empresa, sector_industria, sitio_web) VALUES
(1,'Tech Solutions SAS','Tecnología','https://www.techsolutionssas.co'),
(2,'Grupo Horizonte','Logística','https://www.grupohorizonte.co'),
(3,'Innovación Andina','Agroindustria','https://www.innovacionandina.co'),
(4,'Grupo Digital','Construcción','https://www.grupodigital.co'),
(5,'Next Solutions','Salud','https://www.nextsolutions.co'),
(6,'Softline Colombia','Educación','https://www.softlinecolombia.co'),
(7,'Andes Logística','Finanzas','https://www.andeslogistica.co'),
(8,'Café del Valle SAS','Seguros','https://www.cafedelvallesas.co'),
(9,'Constructora Altamira','Comercio','https://www.constructoraaltamira.co'),
(10,'Clínica Santa Aurora','Manufactura','https://www.clinicasantaaurora.co'),
(11,'Universidad Libre del Norte','Hotelería','https://www.universidadlibredelnorte.co'),
(12,'Banco Meridiano','Transporte','https://www.bancomeridiano.co'),
(13,'Seguros Pacífico','Inmobiliario','https://www.segurospacifico.co'),
(14,'Distribuidora El Roble','Servicios profesionales','https://www.distribuidoraelroble.co'),
(15,'Textiles Cundinamarca','Alimentos','https://www.textilescundinamarca.co'),
(16,'AgroSabana Ltda','Energía','https://www.agrosabanaltda.co'),
(17,'Hotel Bacatá Plaza','Medios','https://www.hotelbacataplaza.co'),
(18,'Transportes Muisca','Minería','https://www.transportesmuisca.co'),
(19,'Farmacias Salud Total','Telecomunicaciones','https://www.farmaciassaludtotal.co'),
(20,'Inmobiliaria Cerros','Sin ánimo de lucro','https://www.inmobiliariacerros.co'),
(21,'Ingeniería y Redes SAS','Tecnología','https://www.ingenieriayredessas.co'),
(22,'Estudio Creativo Nova','Logística','https://www.estudiocreativonova.co'),
(23,'Alimentos La Campiña','Agroindustria','https://www.alimentoslacampina.co'),
(24,'Energía Solar del Caribe','Construcción','https://www.energiasolardelcaribe.co'),
(25,'Consultores Libertad','Salud','https://www.consultoreslibertad.co'),
(26,'Gráficas Capital','Educación','https://www.graficascapital.co'),
(27,'Minería Los Andes','Finanzas','https://www.minerialosandes.co'),
(28,'Editorial Páramo','Seguros','https://www.editorialparamo.co'),
(29,'Telecomunicaciones Orinoco','Comercio','https://www.telecomunicacionesorinoco.co'),
(30,'Fundación Educar Futuro','Manufactura','https://www.fundacioneducarfuturo.co');

-- Vendedores
INSERT INTO vendedores (id_vendedor, nombre_vendedor, correo_vendedor, estado) VALUES
(1,'Carlos Mendoza','ventas.carlos@zimbra.local',1),
(2,'Laura Gómez','ventas.laura@zimbra.local',1),
(3,'Andrés Ramírez','ventas.andresram@zimbra.local',1),
(4,'Paula Herrera','ventas.paulaher@zimbra.local',1),
(5,'Julián Castro','ventas.juliancas@zimbra.local',1),
(6,'Diana Rojas','ventas.dianaroj@zimbra.local',1),
(7,'Felipe Ortiz','ventas.felipeort@zimbra.local',1),
(8,'Natalia Vargas','ventas.nataliavar@zimbra.local',1),
(9,'Sebastián Pardo','ventas.sebastianpar@zimbra.local',1),
(10,'Camila Beltrán','ventas.camilabel@zimbra.local',1),
(11,'Mauricio León','ventas.mauricioleo@zimbra.local',1),
(12,'Valentina Cruz','ventas.valentinacru@zimbra.local',1),
(13,'Ricardo Salazar','ventas.ricardosal@zimbra.local',1),
(14,'Juliana Peña','ventas.julianapen@zimbra.local',1),
(15,'Esteban Molina','ventas.estebanmol@zimbra.local',1),
(16,'Carolina Duarte','ventas.carolinadua@zimbra.local',1),
(17,'Santiago Arias','ventas.santiagoari@zimbra.local',1),
(18,'Mariana Torres','ventas.marianator@zimbra.local',1),
(19,'Daniel Quintero','ventas.danielqui@zimbra.local',1),
(20,'Luisa Fernández','ventas.luisafer@zimbra.local',1),
(21,'Jorge Cárdenas','ventas.jorgecar@zimbra.local',1),
(22,'Sofía Ibáñez','ventas.sofiaiba@zimbra.local',1),
(23,'Camilo Zapata','ventas.camilozap@zimbra.local',1),
(24,'Isabela Ruiz','ventas.isabelarui@zimbra.local',1),
(25,'Nicolás Cortés','ventas.nicolascor@zimbra.local',1),
(26,'Gabriela Navarro','ventas.gabrielanav@zimbra.local',1),
(27,'Héctor Bernal','ventas.hectorber@zimbra.local',1),
(28,'Angela Suárez','ventas.angelasua@zimbra.local',1),
(29,'Mateo Acosta','ventas.mateoaco@zimbra.local',0),
(30,'Daniela Rincón','ventas.danielarin@zimbra.local',0);

-- Usuarios
INSERT INTO usuarios (id_usuario, id_vendedor, correo_acceso, password_hash, rol, estado, fecha_creacion) VALUES
(1,NULL,'admin@zimbra.local','$2a$12$x3ZaAnnH6vWElJPgo3Pjhuqy4SIeWJlhOOjT7ARN.dvfoTK/LngfC','Administrador',1,'2026-06-01 08:00:00'),
(2,NULL,'coordinacion@zimbra.local','$2a$12$x3ZaAnnH6vWElJPgo3Pjhuqy4SIeWJlhOOjT7ARN.dvfoTK/LngfC','Administrador',1,'2026-06-01 08:05:00'),
(3,1,'ventas.carlos@zimbra.local','$2a$12$x3ZaAnnH6vWElJPgo3Pjhuqy4SIeWJlhOOjT7ARN.dvfoTK/LngfC','Vendedor',1,'2026-06-02 09:10:00'),
(4,2,'ventas.laura@zimbra.local','$2a$12$x3ZaAnnH6vWElJPgo3Pjhuqy4SIeWJlhOOjT7ARN.dvfoTK/LngfC','Vendedor',1,'2026-06-02 09:20:00'),
(5,3,'ventas.andresram@zimbra.local','$2a$12$x3ZaAnnH6vWElJPgo3Pjhuqy4SIeWJlhOOjT7ARN.dvfoTK/LngfC','Vendedor',1,'2026-06-02 09:30:00'),
(6,4,'ventas.paulaher@zimbra.local','$2a$12$x3ZaAnnH6vWElJPgo3Pjhuqy4SIeWJlhOOjT7ARN.dvfoTK/LngfC','Vendedor',1,'2026-06-02 09:40:00'),
(7,5,'ventas.juliancas@zimbra.local','$2a$12$x3ZaAnnH6vWElJPgo3Pjhuqy4SIeWJlhOOjT7ARN.dvfoTK/LngfC','Vendedor',1,'2026-06-02 09:50:00'),
(8,6,'ventas.dianaroj@zimbra.local','$2a$12$x3ZaAnnH6vWElJPgo3Pjhuqy4SIeWJlhOOjT7ARN.dvfoTK/LngfC','Vendedor',1,'2026-06-02 10:00:00'),
(9,7,'ventas.felipeort@zimbra.local','$2a$12$x3ZaAnnH6vWElJPgo3Pjhuqy4SIeWJlhOOjT7ARN.dvfoTK/LngfC','Vendedor',1,'2026-06-02 10:10:00'),
(10,8,'ventas.nataliavar@zimbra.local','$2a$12$x3ZaAnnH6vWElJPgo3Pjhuqy4SIeWJlhOOjT7ARN.dvfoTK/LngfC','Vendedor',1,'2026-06-02 10:20:00'),
(11,9,'ventas.sebastianpar@zimbra.local','$2a$12$x3ZaAnnH6vWElJPgo3Pjhuqy4SIeWJlhOOjT7ARN.dvfoTK/LngfC','Vendedor',1,'2026-06-02 10:30:00'),
(12,10,'ventas.camilabel@zimbra.local','$2a$12$x3ZaAnnH6vWElJPgo3Pjhuqy4SIeWJlhOOjT7ARN.dvfoTK/LngfC','Vendedor',1,'2026-06-02 10:40:00'),
(13,11,'ventas.mauricioleo@zimbra.local','$2a$12$x3ZaAnnH6vWElJPgo3Pjhuqy4SIeWJlhOOjT7ARN.dvfoTK/LngfC','Vendedor',1,'2026-06-02 10:50:00'),
(14,12,'ventas.valentinacru@zimbra.local','$2a$12$x3ZaAnnH6vWElJPgo3Pjhuqy4SIeWJlhOOjT7ARN.dvfoTK/LngfC','Vendedor',1,'2026-06-02 11:00:00'),
(15,13,'ventas.ricardosal@zimbra.local','$2a$12$x3ZaAnnH6vWElJPgo3Pjhuqy4SIeWJlhOOjT7ARN.dvfoTK/LngfC','Vendedor',1,'2026-06-02 11:10:00'),
(16,14,'ventas.julianapen@zimbra.local','$2a$12$x3ZaAnnH6vWElJPgo3Pjhuqy4SIeWJlhOOjT7ARN.dvfoTK/LngfC','Vendedor',1,'2026-06-02 11:20:00'),
(17,15,'ventas.estebanmol@zimbra.local','$2a$12$x3ZaAnnH6vWElJPgo3Pjhuqy4SIeWJlhOOjT7ARN.dvfoTK/LngfC','Vendedor',1,'2026-06-02 11:30:00'),
(18,16,'ventas.carolinadua@zimbra.local','$2a$12$x3ZaAnnH6vWElJPgo3Pjhuqy4SIeWJlhOOjT7ARN.dvfoTK/LngfC','Vendedor',1,'2026-06-02 11:40:00'),
(19,17,'ventas.santiagoari@zimbra.local','$2a$12$x3ZaAnnH6vWElJPgo3Pjhuqy4SIeWJlhOOjT7ARN.dvfoTK/LngfC','Vendedor',1,'2026-06-02 11:50:00'),
(20,18,'ventas.marianator@zimbra.local','$2a$12$x3ZaAnnH6vWElJPgo3Pjhuqy4SIeWJlhOOjT7ARN.dvfoTK/LngfC','Vendedor',1,'2026-06-02 12:00:00'),
(21,19,'ventas.danielqui@zimbra.local','$2a$12$x3ZaAnnH6vWElJPgo3Pjhuqy4SIeWJlhOOjT7ARN.dvfoTK/LngfC','Vendedor',1,'2026-06-02 12:10:00'),
(22,20,'ventas.luisafer@zimbra.local','$2a$12$x3ZaAnnH6vWElJPgo3Pjhuqy4SIeWJlhOOjT7ARN.dvfoTK/LngfC','Vendedor',1,'2026-06-02 12:20:00'),
(23,21,'ventas.jorgecar@zimbra.local','$2a$12$x3ZaAnnH6vWElJPgo3Pjhuqy4SIeWJlhOOjT7ARN.dvfoTK/LngfC','Vendedor',1,'2026-06-02 12:30:00'),
(24,22,'ventas.sofiaiba@zimbra.local','$2a$12$x3ZaAnnH6vWElJPgo3Pjhuqy4SIeWJlhOOjT7ARN.dvfoTK/LngfC','Vendedor',1,'2026-06-02 12:40:00'),
(25,23,'ventas.camilozap@zimbra.local','$2a$12$x3ZaAnnH6vWElJPgo3Pjhuqy4SIeWJlhOOjT7ARN.dvfoTK/LngfC','Vendedor',1,'2026-06-02 12:50:00'),
(26,24,'ventas.isabelarui@zimbra.local','$2a$12$x3ZaAnnH6vWElJPgo3Pjhuqy4SIeWJlhOOjT7ARN.dvfoTK/LngfC','Vendedor',1,'2026-06-02 13:00:00'),
(27,25,'ventas.nicolascor@zimbra.local','$2a$12$x3ZaAnnH6vWElJPgo3Pjhuqy4SIeWJlhOOjT7ARN.dvfoTK/LngfC','Vendedor',1,'2026-06-02 13:10:00'),
(28,26,'ventas.gabrielanav@zimbra.local','$2a$12$x3ZaAnnH6vWElJPgo3Pjhuqy4SIeWJlhOOjT7ARN.dvfoTK/LngfC','Vendedor',1,'2026-06-02 13:20:00'),
(29,27,'ventas.hectorber@zimbra.local','$2a$12$x3ZaAnnH6vWElJPgo3Pjhuqy4SIeWJlhOOjT7ARN.dvfoTK/LngfC','Vendedor',1,'2026-06-02 13:30:00'),
(30,28,'ventas.angelasua@zimbra.local','$2a$12$x3ZaAnnH6vWElJPgo3Pjhuqy4SIeWJlhOOjT7ARN.dvfoTK/LngfC','Vendedor',1,'2026-06-02 13:40:00');

-- Productos
INSERT INTO productos (id_producto, nombre_producto, tipo_licencia, precio, estado) VALUES
(1,'Zimbra Open Source Edition','Gratuita',0,1),
(2,'Zimbra Community Webmail','Gratuita',0,1),
(3,'Zimbra Desktop Cliente','Gratuita',0,1),
(4,'Zimbra Collaboration Standard (prueba)','Prueba 60 dias',0,1),
(5,'Zimbra Collaboration Professional (prueba)','Prueba 60 dias',0,1),
(6,'Zimbra Collaboration Plus (prueba)','Prueba 60 dias',0,1),
(7,'Zimbra Mobile Sync (prueba)','Prueba 60 dias',0,1),
(8,'Zimbra Talk Voz y Video (prueba)','Prueba 60 dias',0,1),
(9,'Zimbra Archiving (prueba)','Prueba 60 dias',0,1),
(10,'Zimbra Backup Pro (prueba)','Prueba 60 dias',0,1),
(11,'Zimbra Collaboration Standard 1 año','Comercial',85000,1),
(12,'Zimbra Collaboration Standard 3 años','Comercial',225000,1),
(13,'Zimbra Collaboration Professional 1 año','Comercial',120000,1),
(14,'Zimbra Collaboration Professional 3 años','Comercial',320000,1),
(15,'Zimbra Collaboration Plus 1 año','Comercial',160000,1),
(16,'Zimbra Collaboration Plus 3 años','Comercial',430000,1),
(17,'Zimbra Mobile Sync 1 año','Comercial',45000,1),
(18,'Zimbra Talk Voz y Video 1 año','Comercial',70000,1),
(19,'Zimbra Archiving 1 año','Comercial',95000,1),
(20,'Zimbra Backup Pro 1 año','Comercial',110000,1),
(21,'Zimbra Pack Educativo 1 año','Comercial',60000,1),
(22,'Zimbra Pack ONG 1 año','Comercial',55000,1),
(23,'Zimbra Soporte Básico','Comercial',150000,1),
(24,'Zimbra Soporte Premium 24x7','Comercial',480000,1),
(25,'Zimbra Migración asistida','Comercial',900000,1),
(26,'Zimbra Capacitación administradores','Comercial',650000,1),
(27,'Zimbra Licencia Enterprise 50 usuarios','Comercial',3800000,1),
(28,'Zimbra Licencia Enterprise 100 usuarios','Comercial',7000000,1),
(29,'Zimbra Licencia Enterprise 250 usuarios','Comercial',15500000,0),
(30,'Zimbra Licencia Heredada 2024','Comercial',40000,0);

-- Campanas_marketing
INSERT INTO campanas_marketing (id_campana, nombre_campana, descripcion, presupuesto, fecha_inicio, fecha_fin, estado) VALUES
(1,'Prueba gratuita de 60 días','Iniciativa de marketing: prueba gratuita de 60 días.',12000000,'2026-06-01','2026-12-31','Activa'),
(2,'Migra a Zimbra Q1','Iniciativa de marketing: migra a zimbra q1.',25000000,'2026-09-24','2027-01-14','Activa'),
(3,'Webinar colaboración segura','Iniciativa de marketing: webinar colaboración segura.',12000000,'2026-02-26','2026-04-25','Inactiva'),
(4,'Black Friday Software','Iniciativa de marketing: black friday software.',8000000,'2026-11-19','2027-02-28','Inactiva'),
(5,'Campaña educación superior','Iniciativa de marketing: campaña educación superior.',25000000,'2026-10-25','2027-02-02','Activa'),
(6,'Correo corporativo sin riesgo','Iniciativa de marketing: correo corporativo sin riesgo.',8000000,'2026-09-13','2026-12-27','Activa'),
(7,'Zimbra para pymes','Iniciativa de marketing: zimbra para pymes.',12000000,'2026-05-07','2026-06-06','Inactiva'),
(8,'Cierre de año 2026','Iniciativa de marketing: cierre de año 2026.',5000000,'2026-02-15','2026-03-31','Inactiva'),
(9,'Retorno de prospectos fríos','Iniciativa de marketing: retorno de prospectos fríos.',2000000,'2026-02-24','2026-05-22','Inactiva'),
(10,'Alianza con distribuidores','Iniciativa de marketing: alianza con distribuidores.',5000000,'2026-09-13','2027-01-07','Activa'),
(11,'Seminario virtual ciberseguridad','Iniciativa de marketing: seminario virtual ciberseguridad.',5000000,'2026-04-22','2026-07-11','Inactiva'),
(12,'Referidos que ganan','Iniciativa de marketing: referidos que ganan.',25000000,'2026-07-02','2026-09-15','Inactiva'),
(13,'Descarga la guía de migración','Iniciativa de marketing: descarga la guía de migración.',18000000,'2026-07-16','2026-10-19','Inactiva'),
(14,'Zimbra vs. competencia','Iniciativa de marketing: zimbra vs. competencia.',2000000,'2026-02-13','2026-04-27','Inactiva'),
(15,'Lanzamiento Zimbra Talk','Iniciativa de marketing: lanzamiento zimbra talk.',5000000,'2026-10-17','2027-01-23','Activa'),
(16,'Newsletter mensual','Iniciativa de marketing: newsletter mensual.',3000000,'2026-06-01','2026-08-28','Inactiva'),
(17,'Campaña ONG y fundaciones','Iniciativa de marketing: campaña ong y fundaciones.',2000000,'2026-10-27','2027-01-04','Activa'),
(18,'Eventos regionales Bogotá','Iniciativa de marketing: eventos regionales bogotá.',8000000,'2026-07-12','2026-09-26','Inactiva'),
(19,'Eventos regionales Medellín','Iniciativa de marketing: eventos regionales medellín.',8000000,'2026-08-09','2026-09-19','Inactiva'),
(20,'Eventos regionales Cali','Iniciativa de marketing: eventos regionales cali.',8000000,'2026-10-31','2027-02-08','Activa'),
(21,'Anuncios en buscadores','Iniciativa de marketing: anuncios en buscadores.',12000000,'2026-03-05','2026-05-28','Inactiva'),
(22,'Anuncios en redes profesionales','Iniciativa de marketing: anuncios en redes profesionales.',8000000,'2026-11-08','2027-02-08','Inactiva'),
(23,'Casos de éxito en video','Iniciativa de marketing: casos de éxito en video.',25000000,'2026-09-30','2026-12-02','Activa'),
(24,'Prueba extendida para clientes','Iniciativa de marketing: prueba extendida para clientes.',8000000,'2026-08-08','2026-11-18','Activa'),
(25,'Promoción de soporte premium','Iniciativa de marketing: promoción de soporte premium.',25000000,'2026-09-24','2026-12-29','Activa'),
(26,'Campaña de reactivación','Iniciativa de marketing: campaña de reactivación.',3000000,'2026-01-17','2026-04-30','Inactiva'),
(27,'Demo personalizada','Iniciativa de marketing: demo personalizada.',18000000,'2026-03-12','2026-04-17','Inactiva'),
(28,'Zimbra para gobierno','Iniciativa de marketing: zimbra para gobierno.',2000000,'2026-09-29','2027-01-22','Activa'),
(29,'Semana de la productividad','Iniciativa de marketing: semana de la productividad.',8000000,'2026-11-19','2027-02-11','Inactiva'),
(30,'Programa de partners','Iniciativa de marketing: programa de partners.',3000000,'2026-03-18','2026-06-17','Inactiva');

-- Acciones_marketing
INSERT INTO acciones_marketing (id_accion, nombre_accion, puntaje, estado) VALUES
(1,'Visita a página de inicio',1,1),
(2,'Visita a página de precios',10,1),
(3,'Apertura de correo electrónico',5,1),
(4,'Clic en enlace de correo',10,1),
(5,'Descarga de prueba (60 días)',20,1),
(6,'Asistencia a Meeting (Demo)',30,1),
(7,'Suscripción a boletín / Newsletter',15,1),
(8,'Visita a página de producto',3,1),
(9,'Lectura de artículo del blog',1,1),
(10,'Visualización de video demo',8,1),
(11,'Descarga de ficha técnica',12,1),
(12,'Solicitud de cotización',40,1),
(13,'Registro en webinar',15,1),
(14,'Asistencia a webinar',25,1),
(15,'Clic en anuncio',2,1),
(16,'Compartir contenido en redes',4,1),
(17,'Visita a página de contacto',6,1),
(18,'Chat con soporte',8,1),
(19,'Descarga de documentación',10,1),
(20,'Regreso al sitio (3 visitas en la semana)',7,1),
(21,'Inicio de sesión en la prueba',10,1),
(22,'Uso de la prueba por 7 días',15,1),
(23,'Invitación a colegas a la prueba',20,1),
(24,'Consulta de planes',8,1),
(25,'Visita a página de comparación',9,1),
(26,'Solicitud de llamada',35,1),
(27,'Respuesta a correo comercial',12,1),
(28,'Visita a casos de éxito',6,1),
(29,'Cancelación de suscripción a boletín',0,1),
(30,'Visita a página de licenciamiento',7,1);

-- Clientes
INSERT INTO clientes (id_cliente, id_empresa, nombre_completo, correo_electronico, telefono, fecha_registro, puntaje_total, estado_cliente) VALUES
(1,4,'Tatiana Ospina Silva','tatiana.ospina25@grupodigital.co','+57 328 397 2383','2026-09-18 20:50:50',44,'Tibio'),
(2,26,'Felipe Ruiz Vargas','felipe.ruiz76@graficascapital.co','+57 316 115 1938','2026-08-29 10:05:00',208,'Cliente'),
(3,10,'Ana López Torres','ana.lopez16@clinicasantaaurora.co','+57 306 692 3069','2026-07-19 05:27:59',128,'En Negociacion'),
(4,13,'Santiago Quintero Castaño','santiago.quintero31@segurospacifico.co','+57 328 800 7502','2026-09-20 17:56:03',20,'Descartado'),
(5,8,'Tatiana Díaz Vargas','tatiana.diaz3@cafedelvallesas.co','+57 326 914 1614','2026-07-04 05:20:31',90,'Calificado'),
(6,10,'Isabel Ruiz Rojas','isabel.ruiz48@clinicasantaaurora.co','+57 320 502 7235','2026-10-15 03:55:15',10,'Frio'),
(7,NULL,'Sebastián Mejía Ruiz','sebastian.mejia66@gmail.com','+57 305 799 8470','2026-07-21 08:58:10',95,'En Negociacion'),
(8,3,'Rodrigo Córdoba Silva','rodrigo.cordoba9@innovacionandina.co','+57 305 324 8593','2026-07-18 01:29:21',124,'Calificado'),
(9,23,'Sofía Londoño Ruiz','sofia.londono40@alimentoslacampina.co','+57 324 436 1460','2026-07-17 08:47:00',217,'Cliente'),
(10,28,'Mateo Mejía Martínez','mateo.mejia12@editorialparamo.co','+57 302 673 4646','2026-09-21 02:34:40',61,'Tibio'),
(11,20,'Santiago Jiménez Castaño','santiago.jimenez82@inmobiliariacerros.co','+57 319 590 9860','2026-07-10 08:47:31',24,'Frio'),
(12,5,'Laura Vargas Ramírez','laura.vargas4@nextsolutions.co','+57 328 270 9689','2026-07-21 10:02:56',156,'En Negociacion'),
(13,26,'Ana Córdoba Silva','ana.cordoba28@graficascapital.co','+57 303 823 2895','2026-07-15 18:05:46',45,'Tibio'),
(14,22,'Tatiana Jiménez Patiño','tatiana.jimenez5@estudiocreativonova.co','+57 314 173 9954','2026-09-08 01:32:14',39,'Descartado'),
(15,19,'Mateo Patiño Mejía','mateo.patino70@farmaciassaludtotal.co','+57 308 304 9271','2026-07-24 02:33:12',44,'Inactivo'),
(16,9,'Daniela Ramírez Castaño','daniela.ramirez83@constructoraaltamira.co','+57 328 897 4984','2026-08-02 19:12:18',1,'Frio'),
(17,22,'Verónica Ospina Vargas','veronica.ospina42@estudiocreativonova.co','+57 314 980 6130','2026-08-04 02:51:02',104,'Calificado'),
(18,20,'Verónica Ruiz Gómez','veronica.ruiz71@inmobiliariacerros.co','+57 325 760 9789','2026-07-06 22:46:18',24,'Frio'),
(19,18,'Paola Martínez Londoño','paola.martinez39@transportesmuisca.co','+57 301 341 4527','2026-10-14 10:13:54',110,'Calificado'),
(20,13,'Mateo Ospina Londoño','mateo.ospina61@segurospacifico.co','+57 307 715 6685','2026-07-31 13:03:05',12,'Frio'),
(21,14,'Isabel Mejía Gómez','isabel.mejia31@distribuidoraelroble.co','+57 315 537 6091','2026-09-01 08:52:53',153,'En Negociacion'),
(22,6,'Andrés Londoño Mejía','andres.londono68@softlinecolombia.co','+57 317 698 6315','2026-09-20 08:57:47',53,'Tibio'),
(23,NULL,'Carolina Castaño Silva','carolina.castano2@gmail.com','+57 324 653 9924','2026-08-04 14:03:24',35,'Inactivo'),
(24,25,'Nicolás Pérez Gómez','nicolas.perez43@consultoreslibertad.co','+57 302 253 4181','2026-09-22 20:07:34',182,'Cliente'),
(25,13,'Sebastián Díaz Gómez','sebastian.diaz33@segurospacifico.co','+57 320 169 5769','2026-09-30 10:32:03',55,'Tibio'),
(26,29,'Daniela Quintero Rojas','daniela.quintero26@telecomunicacionesorinoco.co','+57 321 751 1340','2026-08-09 08:02:27',66,'Tibio'),
(27,21,'Felipe Jiménez Pérez','felipe.jimenez77@ingenieriayredessas.co','+57 315 831 4912','2026-07-08 16:09:44',63,'Tibio'),
(28,3,'Manuel Ramírez Patiño','manuel.ramirez25@innovacionandina.co','+57 319 516 8643','2026-08-22 00:54:31',20,'Frio'),
(29,9,'Verónica Jiménez Pérez','veronica.jimenez93@constructoraaltamira.co','+57 305 929 6203','2026-08-26 08:17:39',25,'Frio'),
(30,22,'Andrés Díaz Londoño','andres.diaz35@estudiocreativonova.co','+57 322 698 3777','2026-07-03 15:01:50',230,'Cliente'),
(31,3,'Sofía Londoño Mejía','sofia.londono95@innovacionandina.co','+57 321 624 7873','2026-08-06 22:44:52',20,'Frio'),
(32,28,'Ana Silva Patiño','ana.silva16@editorialparamo.co','+57 328 236 2564','2026-07-27 06:45:03',124,'Calificado'),
(33,21,'Gabriela Córdoba Castaño','gabriela.cordoba14@ingenieriayredessas.co','+57 310 566 1685','2026-07-17 23:26:10',20,'Inactivo'),
(34,7,'Laura Ruiz Vargas','laura.ruiz70@andeslogistica.co','+57 301 273 5424','2026-09-17 13:33:21',24,'Frio'),
(35,3,'Andrés López Silva','andres.lopez54@innovacionandina.co','+57 301 432 5156','2026-09-04 18:48:27',12,'Frio');

-- Actividad_web
INSERT INTO actividad_web (id_actividad, id_cliente, id_accion, id_campana, fecha_actividad, detalle) VALUES
(1,1,10,1,'2026-10-01 21:47:53','Acción registrada desde el sitio web (8 pts)'),
(2,1,3,25,'2026-10-15 09:35:21','Acción registrada desde el sitio web (5 pts)'),
(3,1,21,6,'2026-10-19 17:14:06','Acción registrada desde el sitio web (10 pts)'),
(4,1,5,25,'2026-10-21 07:45:46','Acción registrada desde el sitio web (20 pts)'),
(5,2,18,NULL,'2026-08-29 21:35:53','Acción registrada desde el sitio web (8 pts)'),
(6,2,21,18,'2026-09-07 11:09:03','Acción registrada desde el sitio web (10 pts)'),
(7,2,8,24,'2026-09-07 14:31:17','Acción registrada desde el sitio web (3 pts)'),
(8,2,2,1,'2026-09-10 02:01:58','Acción registrada desde el sitio web (10 pts)'),
(9,2,25,10,'2026-09-15 09:14:07','Acción registrada desde el sitio web (9 pts)'),
(10,2,4,19,'2026-09-19 05:35:38','Acción registrada desde el sitio web (10 pts)'),
(11,2,6,24,'2026-09-30 01:18:38','Acción registrada desde el sitio web (30 pts)'),
(12,2,10,1,'2026-10-01 19:53:54','Acción registrada desde el sitio web (8 pts)'),
(13,2,27,2,'2026-10-13 11:10:03','Acción registrada desde el sitio web (12 pts)'),
(14,2,5,2,'2026-10-15 05:25:51','Acción registrada desde el sitio web (20 pts)'),
(15,3,4,1,'2026-07-23 19:49:43','Acción registrada desde el sitio web (10 pts)'),
(16,3,26,1,'2026-09-11 21:06:46','Acción registrada desde el sitio web (35 pts)'),
(17,3,5,6,'2026-09-13 10:58:37','Acción registrada desde el sitio web (20 pts)'),
(18,3,6,6,'2026-09-19 03:38:59','Acción registrada desde el sitio web (30 pts)'),
(19,4,5,1,'2026-09-26 19:53:43','Acción registrada desde el sitio web (20 pts)'),
(20,5,25,18,'2026-08-12 06:03:25','Acción registrada desde el sitio web (9 pts)'),
(21,5,17,NULL,'2026-08-18 09:00:47','Acción registrada desde el sitio web (6 pts)'),
(22,5,2,18,'2026-09-12 02:49:33','Acción registrada desde el sitio web (10 pts)'),
(23,5,14,NULL,'2026-09-14 23:46:38','Acción registrada desde el sitio web (25 pts)'),
(24,5,5,NULL,'2026-10-21 06:37:31','Acción registrada desde el sitio web (20 pts)'),
(25,6,4,13,'2026-10-15 14:41:42','Acción registrada desde el sitio web (10 pts)'),
(26,7,15,12,'2026-07-21 18:20:21','Acción registrada desde el sitio web (2 pts)'),
(27,7,6,12,'2026-07-26 21:29:26','Acción registrada desde el sitio web (30 pts)'),
(28,7,5,24,'2026-08-13 00:54:08','Acción registrada desde el sitio web (20 pts)'),
(29,7,10,13,'2026-08-22 05:03:33','Acción registrada desde el sitio web (8 pts)'),
(30,8,5,13,'2026-07-20 02:34:40','Acción registrada desde el sitio web (20 pts)'),
(31,8,21,18,'2026-07-22 06:47:55','Acción registrada desde el sitio web (10 pts)'),
(32,8,18,1,'2026-09-19 23:36:55','Acción registrada desde el sitio web (8 pts)'),
(33,8,11,NULL,'2026-09-24 10:45:32','Acción registrada desde el sitio web (12 pts)'),
(34,8,21,6,'2026-10-26 09:31:26','Acción registrada desde el sitio web (10 pts)'),
(35,9,17,12,'2026-07-22 23:26:15','Acción registrada desde el sitio web (6 pts)'),
(36,9,5,NULL,'2026-08-10 22:19:55','Acción registrada desde el sitio web (20 pts)'),
(37,9,13,12,'2026-09-02 03:31:12','Acción registrada desde el sitio web (15 pts)'),
(38,9,6,28,'2026-10-20 05:49:52','Acción registrada desde el sitio web (30 pts)'),
(39,9,7,1,'2026-10-30 01:13:32','Acción registrada desde el sitio web (15 pts)'),
(40,10,24,24,'2026-09-26 16:49:01','Acción registrada desde el sitio web (8 pts)'),
(41,10,5,NULL,'2026-10-24 01:46:45','Acción registrada desde el sitio web (20 pts)'),
(42,10,21,6,'2026-10-24 12:08:07','Acción registrada desde el sitio web (10 pts)'),
(43,11,25,16,'2026-07-18 12:01:07','Acción registrada desde el sitio web (9 pts)'),
(44,11,3,NULL,'2026-07-26 00:13:50','Acción registrada desde el sitio web (5 pts)'),
(45,12,1,1,'2026-07-29 10:31:52','Acción registrada desde el sitio web (1 pts)'),
(46,12,14,12,'2026-08-12 12:05:33','Acción registrada desde el sitio web (25 pts)'),
(47,12,5,1,'2026-08-26 04:58:05','Acción registrada desde el sitio web (20 pts)'),
(48,12,26,24,'2026-08-27 01:05:12','Acción registrada desde el sitio web (35 pts)'),
(49,12,6,NULL,'2026-10-03 12:36:18','Acción registrada desde el sitio web (30 pts)'),
(50,13,5,12,'2026-07-25 16:22:57','Acción registrada desde el sitio web (20 pts)'),
(51,13,22,13,'2026-08-22 22:36:13','Acción registrada desde el sitio web (15 pts)'),
(52,14,2,10,'2026-09-16 21:52:29','Acción registrada desde el sitio web (10 pts)'),
(53,14,5,1,'2026-10-06 08:26:00','Acción registrada desde el sitio web (20 pts)'),
(54,15,5,18,'2026-07-24 07:02:37','Acción registrada desde el sitio web (20 pts)'),
(55,15,27,18,'2026-07-24 11:47:43','Acción registrada desde el sitio web (12 pts)'),
(56,16,1,12,'2026-08-10 00:27:20','Acción registrada desde el sitio web (1 pts)'),
(57,17,28,13,'2026-08-04 12:12:03','Acción registrada desde el sitio web (6 pts)'),
(58,17,5,NULL,'2026-09-24 07:59:55','Acción registrada desde el sitio web (20 pts)'),
(59,18,5,NULL,'2026-08-08 03:53:58','Acción registrada desde el sitio web (20 pts)'),
(60,19,20,15,'2026-10-19 21:52:12','Acción registrada desde el sitio web (7 pts)'),
(61,19,12,NULL,'2026-10-21 08:40:16','Acción registrada desde el sitio web (40 pts)'),
(62,19,5,17,'2026-10-30 13:36:26','Acción registrada desde el sitio web (20 pts)'),
(63,20,27,16,'2026-08-10 09:38:36','Acción registrada desde el sitio web (12 pts)'),
(64,21,6,1,'2026-09-07 11:05:54','Acción registrada desde el sitio web (30 pts)'),
(65,21,5,6,'2026-09-18 23:40:06','Acción registrada desde el sitio web (20 pts)'),
(66,21,14,28,'2026-10-19 17:05:37','Acción registrada desde el sitio web (25 pts)'),
(67,22,5,2,'2026-09-29 23:50:08','Acción registrada desde el sitio web (20 pts)'),
(68,22,21,23,'2026-10-19 13:06:37','Acción registrada desde el sitio web (10 pts)'),
(69,23,5,1,'2026-08-04 19:58:38','Acción registrada desde el sitio web (20 pts)'),
(70,24,22,10,'2026-09-22 21:11:03','Acción registrada desde el sitio web (15 pts)'),
(71,24,6,24,'2026-10-14 06:07:03','Acción registrada desde el sitio web (30 pts)'),
(72,24,5,15,'2026-10-31 11:55:04','Acción registrada desde el sitio web (20 pts)'),
(73,25,5,6,'2026-10-22 11:53:44','Acción registrada desde el sitio web (20 pts)'),
(74,26,5,NULL,'2026-10-04 05:51:15','Acción registrada desde el sitio web (20 pts)'),
(75,27,5,24,'2026-09-06 10:27:48','Acción registrada desde el sitio web (20 pts)'),
(76,28,5,12,'2026-09-12 11:03:20','Acción registrada desde el sitio web (20 pts)'),
(77,29,21,24,'2026-09-04 05:36:29','Acción registrada desde el sitio web (10 pts)'),
(78,30,17,1,'2026-07-04 14:29:49','Acción registrada desde el sitio web (6 pts)'),
(79,30,12,16,'2026-07-19 20:49:22','Acción registrada desde el sitio web (40 pts)'),
(80,30,6,NULL,'2026-09-28 19:03:03','Acción registrada desde el sitio web (30 pts)'),
(81,30,12,NULL,'2026-10-04 08:11:50','Acción registrada desde el sitio web (40 pts)'),
(82,30,5,NULL,'2026-10-13 14:59:11','Acción registrada desde el sitio web (20 pts)'),
(83,31,5,NULL,'2026-08-19 11:12:05','Acción registrada desde el sitio web (20 pts)'),
(84,32,5,18,'2026-08-01 04:29:08','Acción registrada desde el sitio web (20 pts)'),
(85,33,5,NULL,'2026-07-24 09:29:16','Acción registrada desde el sitio web (20 pts)'),
(86,34,10,25,'2026-10-23 18:59:06','Acción registrada desde el sitio web (8 pts)'),
(87,35,27,NULL,'2026-10-14 05:54:15','Acción registrada desde el sitio web (12 pts)'),
(88,1,5,1,'2026-11-01 10:00:00','Descarga de prueba (20 pts)'),
(89,5,5,1,'2026-11-01 10:05:00','Descarga de prueba (20 pts)'),
(90,8,5,1,'2026-11-01 10:10:00','Descarga de prueba (20 pts)'),
(91,10,5,1,'2026-11-01 10:15:00','Descarga de prueba (20 pts)'),
(92,12,5,1,'2026-11-01 10:20:00','Descarga de prueba (20 pts)'),
(93,17,5,1,'2026-11-01 10:25:00','Descarga de prueba (20 pts)'),
(94,19,5,1,'2026-11-01 10:30:00','Descarga de prueba (20 pts)'),
(95,21,5,1,'2026-11-01 10:35:00','Descarga de prueba (20 pts)'),
(96,24,5,1,'2026-11-01 10:40:00','Descarga de prueba (20 pts)'),
(97,26,5,1,'2026-11-01 10:45:00','Descarga de prueba (20 pts)'),
(98,27,5,1,'2026-11-01 10:50:00','Descarga de prueba (20 pts)'),
(99,30,5,1,'2026-11-01 10:55:00','Descarga de prueba (20 pts)'),
(100,32,5,1,'2026-11-01 11:00:00','Descarga de prueba (20 pts)'),
(101,1,2,1,'2026-11-02 09:00:00','Visita a página de precios (10 pts)'),
(102,5,2,1,'2026-11-02 09:10:00','Visita a página de precios (10 pts)'),
(103,8,2,1,'2026-11-02 09:20:00','Visita a página de precios (10 pts)'),
(104,10,2,1,'2026-11-02 09:30:00','Visita a página de precios (10 pts)'),
(105,12,2,1,'2026-11-02 09:40:00','Visita a página de precios (10 pts)'),
(106,17,2,1,'2026-11-02 09:50:00','Visita a página de precios (10 pts)'),
(107,19,2,1,'2026-11-02 10:00:00','Visita a página de precios (10 pts)'),
(108,21,2,1,'2026-11-02 10:10:00','Visita a página de precios (10 pts)'),
(109,24,2,1,'2026-11-02 10:20:00','Visita a página de precios (10 pts)'),
(110,26,2,1,'2026-11-02 10:30:00','Visita a página de precios (10 pts)'),
(111,1,12,1,'2026-11-03 14:00:00','Solicitud de cotización (40 pts)'),
(112,5,12,1,'2026-11-03 14:10:00','Solicitud de cotización (40 pts)'),
(113,8,12,1,'2026-11-03 14:20:00','Solicitud de cotización (40 pts)'),
(114,10,12,1,'2026-11-03 14:30:00','Solicitud de cotización (40 pts)'),
(115,12,12,1,'2026-11-03 14:40:00','Solicitud de cotización (40 pts)'),
(116,17,12,1,'2026-11-03 14:50:00','Solicitud de cotización (40 pts)'),
(117,19,12,1,'2026-11-03 15:00:00','Solicitud de cotización (40 pts)'),
(118,21,12,1,'2026-11-03 15:10:00','Solicitud de cotización (40 pts)'),
(119,24,12,1,'2026-11-03 15:20:00','Solicitud de cotización (40 pts)'),
(120,26,12,1,'2026-11-03 15:30:00','Solicitud de cotización (40 pts)'),
(121,2,6,1,'2026-11-04 10:00:00','Asistencia a Meeting (Demo) (30 pts)'),
(122,3,6,1,'2026-11-04 10:10:00','Asistencia a Meeting (Demo) (30 pts)'),
(123,7,6,1,'2026-11-04 10:20:00','Asistencia a Meeting (Demo) (30 pts)'),
(124,9,6,1,'2026-11-04 10:30:00','Asistencia a Meeting (Demo) (30 pts)'),
(125,11,6,1,'2026-11-04 10:40:00','Asistencia a Meeting (Demo) (30 pts)'),
(126,13,6,1,'2026-11-04 10:50:00','Asistencia a Meeting (Demo) (30 pts)'),
(127,16,6,1,'2026-11-04 11:00:00','Asistencia a Meeting (Demo) (30 pts)'),
(128,18,6,1,'2026-11-04 11:10:00','Asistencia a Meeting (Demo) (30 pts)'),
(129,20,6,1,'2026-11-04 11:20:00','Asistencia a Meeting (Demo) (30 pts)'),
(130,22,6,1,'2026-11-04 11:30:00','Asistencia a Meeting (Demo) (30 pts)'),
(131,2,26,1,'2026-11-05 09:00:00','Solicitud de llamada (35 pts)'),
(132,3,26,1,'2026-11-05 09:10:00','Solicitud de llamada (35 pts)'),
(133,7,26,1,'2026-11-05 09:20:00','Solicitud de llamada (35 pts)'),
(134,9,26,1,'2026-11-05 09:30:00','Solicitud de llamada (35 pts)'),
(135,11,26,1,'2026-11-05 09:40:00','Solicitud de llamada (35 pts)'),
(136,13,26,1,'2026-11-05 09:50:00','Solicitud de llamada (35 pts)'),
(137,16,26,1,'2026-11-05 10:00:00','Solicitud de llamada (35 pts)'),
(138,18,26,1,'2026-11-05 10:10:00','Solicitud de llamada (35 pts)'),
(139,20,26,1,'2026-11-05 10:20:00','Solicitud de llamada (35 pts)'),
(140,22,26,1,'2026-11-05 10:30:00','Solicitud de llamada (35 pts)'),
(141,1,1,1,'2026-11-05 15:00:00','Visita a página de inicio (1 pts)'),
(142,5,1,1,'2026-11-05 15:05:00','Visita a página de inicio (1 pts)'),
(143,8,1,1,'2026-11-05 15:10:00','Visita a página de inicio (1 pts)'),
(144,10,1,1,'2026-11-05 15:15:00','Visita a página de inicio (1 pts)'),
(145,12,1,1,'2026-11-05 15:20:00','Visita a página de inicio (1 pts)'),
(146,17,1,1,'2026-11-05 15:25:00','Visita a página de inicio (1 pts)'),
(147,19,1,1,'2026-11-05 15:30:00','Visita a página de inicio (1 pts)'),
(148,21,1,1,'2026-11-05 15:35:00','Visita a página de inicio (1 pts)'),
(149,24,1,1,'2026-11-05 15:40:00','Visita a página de inicio (1 pts)'),
(150,26,1,1,'2026-11-05 15:45:00','Visita a página de inicio (1 pts)');

/* Conserva el puntaje que aporta cada actividad en el momento de su registro. */
UPDATE actividad_web aw
JOIN acciones_marketing am ON am.id_accion = aw.id_accion
SET aw.puntaje_otorgado = am.puntaje
WHERE aw.id_actividad > 0;

-- Descargas_prueba
INSERT INTO descargas_prueba (id_descarga, id_cliente, id_producto, fecha_inicio, fecha_fin, estado_prueba) VALUES
(1,1,8,'2026-10-21','2026-12-20','Activa'),
(2,2,4,'2026-10-15','2026-12-14','Convertida'),
(3,3,4,'2026-09-13','2026-11-12','Activa'),
(4,4,10,'2026-09-26','2026-11-25','Cancelada'),
(5,5,4,'2026-10-21','2026-12-20','Activa'),
(6,7,6,'2026-08-13','2026-10-12','Vencida'),
(7,8,9,'2026-07-20','2026-09-18','Vencida'),
(8,9,5,'2026-08-10','2026-10-09','Convertida'),
(9,10,8,'2026-10-24','2026-12-23','Activa'),
(10,12,5,'2026-08-26','2026-10-25','Vencida'),
(11,13,4,'2026-07-25','2026-09-23','Vencida'),
(12,17,4,'2026-09-24','2026-11-23','Activa'),
(13,18,4,'2026-08-08','2026-10-07','Vencida'),
(14,19,8,'2026-10-30','2026-12-29','Activa'),
(15,21,4,'2026-09-18','2026-11-17','Activa'),
(16,22,6,'2026-09-29','2026-11-28','Activa'),
(17,24,6,'2026-10-31','2026-12-30','Convertida'),
(18,25,7,'2026-10-22','2026-12-21','Activa'),
(19,26,10,'2026-10-04','2026-12-03','Activa'),
(20,27,6,'2026-09-06','2026-11-05','Activa'),
(21,28,6,'2026-09-12','2026-11-11','Activa'),
(22,30,6,'2026-10-13','2026-12-12','Convertida'),
(23,31,9,'2026-08-19','2026-10-18','Vencida'),
(24,32,8,'2026-08-01','2026-09-30','Vencida'),
(25,1,4,'2026-07-15','2026-09-13','Vencida'),
(26,5,5,'2026-07-20','2026-09-18','Vencida'),
(27,8,6,'2026-07-25','2026-09-23','Vencida'),
(28,10,7,'2026-08-01','2026-09-30','Vencida'),
(29,12,8,'2026-08-05','2026-10-04','Vencida'),
(30,17,9,'2026-08-10','2026-10-09','Vencida');

-- Asignaciones_crm
INSERT INTO asignaciones_crm (id_asignacion, id_cliente, id_vendedor, fecha_asignacion, fecha_fin, estado) VALUES
(1,2,3,'2026-10-20 01:45:09','2026-10-28 01:45:09','Finalizada'),
(2,2,11,'2026-10-28 01:45:09',NULL,'Activa'),
(3,3,3,'2026-10-08 16:12:59',NULL,'Activa'),
(4,4,21,'2026-09-28 03:53:43','2026-10-05 03:53:43','Finalizada'),
(5,5,11,'2026-10-21 08:37:31','2026-10-28 08:37:31','Finalizada'),
(6,5,12,'2026-10-28 08:37:31',NULL,'Activa'),
(7,7,5,'2026-10-31 00:05:25',NULL,'Activa'),
(8,8,6,'2026-11-02 15:31:09',NULL,'Activa'),
(9,9,14,'2026-11-02 05:09:06',NULL,'Activa'),
(10,10,21,'2026-10-26 04:08:07',NULL,'Activa'),
(11,12,3,'2026-10-24 10:49:24',NULL,'Activa'),
(12,17,21,'2026-10-08 16:49:36',NULL,'Activa'),
(13,19,13,'2026-11-01 18:56:49','2026-11-03 10:00:00','Finalizada'),
(14,19,22,'2026-11-03 10:00:00',NULL,'Activa'),
(15,21,14,'2026-10-20 11:05:37','2026-10-26 11:05:37','Finalizada'),
(16,21,2,'2026-10-26 11:05:37',NULL,'Activa'),
(17,22,18,'2026-10-20 04:33:58',NULL,'Activa'),
(18,24,17,'2026-10-31 18:55:04','2026-11-03 10:00:00','Finalizada'),
(19,24,21,'2026-11-03 10:00:00',NULL,'Activa'),
(20,25,20,'2026-10-19 00:08:16',NULL,'Activa'),
(21,26,20,'2026-10-19 00:08:16',NULL,'Activa'),
(22,27,16,'2026-10-26 02:34:24','2026-10-31 02:34:24','Finalizada'),
(23,27,8,'2026-10-31 02:34:24',NULL,'Activa'),
(24,30,19,'2026-10-15 13:44:53',NULL,'Activa'),
(25,32,16,'2026-10-26 02:34:24',NULL,'Activa'),
(26,1,1,'2026-11-01 08:00:00',NULL,'Activa'),
(27,6,2,'2026-11-01 08:10:00',NULL,'Activa'),
(28,11,4,'2026-11-01 08:20:00',NULL,'Activa'),
(29,16,7,'2026-11-01 08:30:00',NULL,'Activa'),
(30,18,9,'2026-11-01 08:40:00',NULL,'Activa');

-- Interacciones
INSERT INTO interacciones (id_interaccion, id_asignacion, tipo_interaccion, resultado, fecha_interaccion, notas) VALUES
(1,2,'Llamada','Interesado','2026-10-29 09:00:00','Llamada con Felipe Ruiz Vargas: interesado.'),
(2,2,'Correo','Demo agendada','2026-10-30 10:00:00','Correo con Felipe Ruiz Vargas: demo agendada.'),
(3,3,'Llamada','Interesado','2026-10-10 14:00:00','Llamada con Ana López Torres: interesado.'),
(4,3,'Meeting','Solicitó cotización','2026-10-15 10:00:00','Meeting con Ana López Torres: solicitó cotización.'),
(5,6,'Llamada','Interesado','2026-10-29 11:00:00','Llamada con Tatiana Díaz Vargas: interesado.'),
(6,6,'Correo','Negociando condiciones','2026-10-30 15:00:00','Correo con Tatiana Díaz Vargas: negociando condiciones.'),
(7,7,'Llamada','Solicitó cotización','2026-11-01 09:00:00','Llamada con Sebastián Mejía Ruiz: solicitó cotización.'),
(8,8,'Llamada','Demo agendada','2026-11-03 10:00:00','Llamada con Rodrigo Córdoba Silva: demo agendada.'),
(9,9,'Llamada','Solicitó cotización','2026-11-03 11:00:00','Llamada con Sofía Londoño Ruiz: solicitó cotización.'),
(10,10,'Meeting','Interesado','2026-10-27 14:00:00','Meeting con Mateo Mejía Martínez: interesado.'),
(11,11,'Llamada','Solicitó cotización','2026-10-25 10:00:00','Llamada con Laura Vargas Ramírez: solicitó cotización.'),
(12,11,'Meeting','Interesado','2026-10-28 15:00:00','Meeting con Laura Vargas Ramírez: interesado.'),
(13,12,'Llamada','Interesado','2026-10-20 11:00:00','Llamada con Verónica Ospina Vargas: interesado.'),
(14,12,'Correo','Interesado','2026-10-26 14:00:00','Correo con Verónica Ospina Vargas: interesado.'),
(15,14,'Meeting','Solicitó cotización','2026-11-04 10:00:00','Meeting con Paola Martínez Londoño: solicitó cotización.'),
(16,16,'Llamada','Contactado','2026-10-22 09:00:00','Llamada con Isabel Mejía Gómez: contactado.'),
(17,16,'Correo','Interesado','2026-10-24 15:00:00','Correo con Isabel Mejía Gómez: interesado.'),
(18,17,'Meeting','Solicitó cotización','2026-10-27 14:00:00','Meeting con Andrés Londoño Mejía: solicitó cotización.'),
(19,19,'Meeting','Demo agendada','2026-11-04 11:00:00','Meeting con Nicolás Pérez Gómez: demo agendada.'),
(20,20,'Correo','Solicitó cotización','2026-10-23 13:00:00','Correo con Sebastián Díaz Gómez: solicitó cotización.'),
(21,21,'Correo','Solicitó cotización','2026-10-23 16:00:00','Correo con Daniela Quintero Rojas: solicitó cotización.'),
(22,23,'Llamada','Negociando condiciones','2026-11-01 10:00:00','Llamada con Felipe Jiménez Pérez: negociando condiciones.'),
(23,24,'Llamada','Interesado','2026-10-16 18:00:00','Llamada con Andrés Díaz Londoño: interesado.'),
(24,24,'Correo','Negociando condiciones','2026-10-27 17:00:00','Correo con Andrés Díaz Londoño: negociando condiciones.'),
(25,25,'Llamada','Solicitó cotización','2026-10-26 10:00:00','Llamada con Ana Silva Patiño: solicitó cotización.'),
(26,25,'Llamada','Demo agendada','2026-10-29 11:00:00','Llamada con Ana Silva Patiño: demo agendada.'),
(27,26,'Llamada','Demo agendada','2026-11-02 10:00:00','Llamada con Tatiana Ospina Silva: demo agendada.'),
(28,27,'Llamada','Contactado','2026-11-02 11:00:00','Llamada con Isabel Ruiz Rojas: contactado.'),
(29,28,'Llamada','Llamar de nuevo','2026-11-02 12:00:00','Llamada con Santiago Jiménez Castaño: llamar de nuevo.'),
(30,29,'Llamada','Contactado','2026-11-02 13:00:00','Llamada con Daniela Ramírez Castaño: contactado.');

-- Ventas
INSERT INTO ventas (id_venta, numero_contrato, id_cliente, id_vendedor, fecha_venta, estado_venta, metodo_pago, total_venta) VALUES
(1,'CT-2026-0001',2,11,'2026-10-28 12:30:52','Completada','Transferencia',126495000),
(2,'CT-2026-0002',9,14,'2026-11-03 01:29:09','Completada','Tarjeta de crédito',1300000),
(3,'CT-2026-0003',24,21,'2026-11-03 11:20:23','Completada','Transferencia',1055000),
(4,'CT-2026-0004',30,19,'2026-10-18 21:01:56','Completada','Tarjeta de crédito',6930000),
(5,'CT-2026-0005',2,11,'2026-10-29 11:53:23','Completada','Tarjeta de crédito',16020000),
(6,'CT-2026-0006',21,2,'2026-10-27 13:12:00','Pendiente','PSE',8100000),
(7,'CT-2026-0007',3,3,'2026-10-16 10:28:24','Pendiente','PSE',1245000),
(8,'CT-2026-0008',12,3,'2026-10-31 01:05:53','Pendiente','Transferencia',4260000),
(9,'CT-2026-0009',8,6,'2026-11-03 04:42:15','Pendiente','Consignación',4320000),
(10,'CT-2026-0010',19,22,'2026-11-02 15:00:00','Pendiente','Transferencia',2500000),
(11,'CT-2026-0011',5,12,'2026-11-01 10:00:00','Pendiente','PSE',1500000),
(12,'CT-2026-0012',17,21,'2026-11-01 11:00:00','Pendiente','Transferencia',3200000),
(13,'CT-2026-0013',32,8,'2026-11-01 14:59:51','Pendiente','PSE',1080000),
(14,'CT-2026-0014',7,5,'2026-11-03 03:30:12','Pendiente','Tarjeta de crédito',630000),
(15,'CT-2026-0015',22,18,'2026-11-02 12:00:00','Pendiente','PSE',900000),
(16,'CT-2026-0016',25,20,'2026-11-02 13:00:00','Pendiente','Transferencia',1100000),
(17,'CT-2026-0017',26,20,'2026-11-02 14:00:00','Pendiente','Consignación',750000),
(18,'CT-2026-0018',27,8,'2026-11-02 15:00:00','Pendiente','PSE',1400000),
(19,'CT-2026-0019',1,1,'2026-11-02 16:00:00','Pendiente','Transferencia',2000000),
(20,'CT-2026-0020',6,2,'2026-11-02 17:00:00','Pendiente','PSE',850000),
(21,'CT-2026-0021',10,21,'2026-11-02 18:00:00','Pendiente','Tarjeta de crédito',950000),
(22,'CT-2026-0022',11,4,'2026-11-02 19:00:00','Pendiente','Consignación',600000),
(23,'CT-2026-0023',16,7,'2026-11-02 20:00:00','Pendiente','PSE',450000),
(24,'CT-2026-0024',18,9,'2026-11-02 21:00:00','Pendiente','Transferencia',700000),
(25,'CT-2026-0025',4,21,'2026-10-04 09:47:48','Cancelada','Consignación',2120000),
(26,'CT-2026-0026',15,16,'2026-10-04 04:57:49','Cancelada','Transferencia',4040000),
(27,'CT-2026-0027',23,18,'2026-08-16 20:09:10','Cancelada','PSE',2160000),
(28,'CT-2026-0028',33,20,'2026-08-23 21:48:17','Cancelada','Transferencia',7055000),
(29,'CT-2026-0029',14,11,'2026-11-01 09:16:32','Cancelada','Consignación',900000),
(30,'CT-2026-0030',34,2,'2026-11-01 12:00:00','Cancelada','PSE',1200000);

/* Asocia las pruebas convertidas con la venta completada de cada cliente. */
UPDATE descargas_prueba d
JOIN (
    SELECT id_cliente, MAX(id_venta) AS id_venta
    FROM ventas
    WHERE estado_venta = 'Completada'
    GROUP BY id_cliente
) v ON v.id_cliente = d.id_cliente
SET d.id_venta = v.id_venta
WHERE d.estado_prueba = 'Convertida' AND d.id_descarga > 0;

-- Detalle_ventas
INSERT INTO detalle_ventas (id_detalle, id_venta, id_producto, cantidad, precio_unitario, subtotal) VALUES
(1,1,28,18,7000000,126000000),
(2,1,17,11,45000,495000),
(3,2,13,3,120000,360000),
(4,2,17,16,45000,720000),
(5,2,20,2,110000,220000),
(6,3,17,9,45000,405000),
(7,3,26,1,650000,650000),
(8,4,24,1,480000,480000),
(9,4,16,15,430000,6450000),
(10,5,20,8,110000,880000),
(11,5,16,8,430000,3440000),
(12,5,26,18,650000,11700000),
(13,6,25,9,900000,8100000),
(14,7,18,12,70000,840000),
(15,7,17,9,45000,405000),
(16,8,13,16,120000,1920000),
(17,8,21,17,60000,1020000),
(18,8,20,12,110000,1320000),
(19,9,18,16,70000,1120000),
(20,9,15,20,160000,3200000),
(21,10,11,10,85000,850000),
(22,10,17,15,45000,675000),
(23,10,19,10,95000,950000),
(24,11,11,10,85000,850000),
(25,11,17,10,45000,450000),
(26,11,19,2,95000,190000),
(27,12,14,10,320000,3200000),
(28,13,11,12,85000,1020000),
(29,14,17,14,45000,630000),
(30,15,11,10,85000,850000),
(31,15,17,1,45000,45000),
(32,16,20,10,110000,1100000),
(33,17,11,8,85000,680000),
(34,17,17,1,45000,45000),
(35,18,13,10,120000,1200000),
(36,18,17,4,45000,180000),
(37,19,14,10,320000,3200000),
(38,20,11,10,85000,850000),
(39,21,19,10,95000,950000),
(40,22,11,7,85000,595000),
(41,23,11,5,85000,425000),
(42,23,17,1,45000,45000),
(43,24,11,8,85000,680000),
(44,25,15,5,160000,800000),
(45,25,20,12,110000,1320000),
(46,26,11,16,85000,1360000),
(47,26,23,16,150000,2400000),
(48,26,18,4,70000,280000),
(49,27,13,18,120000,2160000),
(50,28,26,6,650000,3900000),
(51,28,23,9,150000,1350000),
(52,28,19,19,95000,1805000),
(53,29,12,4,225000,900000),
(54,30,11,15,85000,1275000);

-- Recuperacion_claves
INSERT INTO recuperacion_claves (id_recuperacion, id_usuario, token_hash, creado_en, expira_en, usado_en) VALUES
(1,8,'169db8c001e9997b2ab9a1c1d4395cbfbc7d541be6a07a3978882fbdc160d603','2026-09-18 10:54:31','2026-09-18 11:09:31',NULL),
(2,20,'2fdaa90768b7f1efce8324d398d7fc0a6c0fa0fa3a31931f98573495aded20c5','2026-08-10 19:16:55','2026-08-10 19:31:55',NULL),
(3,27,'9918dac1b7b137392aa2da1e22533f9465836bed52c424b612f9ad5fe6aa0dd9','2026-09-02 11:05:21','2026-09-02 11:20:21',NULL),
(4,3,'1c82fcc886cd0942cbc7e762841e8be1ff325fadfa67d22647b713520f85a9ba','2026-10-19 00:21:13','2026-10-19 00:36:13','2026-10-19 00:26:13'),
(5,20,'062683024e0cfa70f9872a846cbfda780eea30eddd001662eb3293b727081c7a','2026-08-16 22:40:01','2026-08-16 22:55:01','2026-08-16 22:43:01'),
(6,27,'1595f9c8b4e25714baf4b06e076a72e388e3ed3d76dd3debb94eb69e7c4aa1e8','2026-09-29 17:09:10','2026-09-29 17:24:10',NULL),
(7,8,'1320575a56776cf70c0f5765ad42ccaf5560e32ec19796cd10678514563fe0cf','2026-09-10 10:42:25','2026-09-10 10:57:25','2026-09-10 10:46:25'),
(8,30,'2fcf5ae18cf6e872c7ffd3766770e8d42344dc66e4ee039742b912bfd9f1a955','2026-08-06 13:15:59','2026-08-06 13:30:59',NULL),
(9,16,'d87a98fcd1625dd1919d63d3707a8fba028fde9621b3069c46367f53194989ea','2026-09-26 18:04:10','2026-09-26 18:19:10',NULL),
(10,28,'ea875d53cd0b59ed0a419a72e625a91f5b08896fe1d7b5cecb3d00a0f4f34c02','2026-08-30 04:04:22','2026-08-30 04:19:22',NULL),
(11,10,'8c5ef6f9c3841c9ba51a22108d83a0a3e087836ff15885a07a7813ec17e330a2','2026-09-22 19:29:37','2026-09-22 19:44:37','2026-09-22 19:41:37'),
(12,29,'adbf23039c85604bfa64e11f5eef33fffe88129592eecc1528879350312edc19','2026-08-18 17:21:17','2026-08-18 17:36:17',NULL),
(13,23,'f500da5b0945c474e1a3fcbe9e4c7766e2ec59b2b94bbb978b7f83c50a06bd86','2026-10-28 05:12:58','2026-10-28 05:27:58','2026-10-28 05:20:58'),
(14,4,'f6df04e2fd35a07426076914a262478fd94bb3eb44f487bde743ed80064af4ff','2026-10-14 23:00:54','2026-10-14 23:15:54','2026-10-14 23:07:54'),
(15,22,'a9230841a2806b3a0a9424c55651a5c2e157dfa98d7cf951e33421c63846ef5a','2026-08-30 12:34:18','2026-08-30 12:49:18','2026-08-30 12:37:18'),
(16,17,'cf48eebd6821cf44338b4b09b9f4cf5aa5ab666d7419837b8f84e582e1ecc70d','2026-09-02 07:44:47','2026-09-02 07:59:47',NULL),
(17,24,'2c6d0dc5e11232ce7bba68155134d47dc55a9fe4cc2b7c723296c0be2bc21603','2026-09-05 11:54:15','2026-09-05 12:09:15','2026-09-05 12:01:15'),
(18,4,'61ee6fe8b36a74a69e4fd9d2b1b19fe765a288518eca4e189114529309f2fe85','2026-08-28 02:55:58','2026-08-28 03:10:58',NULL),
(19,25,'199b8612a93357a75fa1199290ba992153cd8637732cb687bbd92d62c6ef97ef','2026-08-25 14:21:51','2026-08-25 14:36:51',NULL),
(20,12,'29605fce062fdc0958cf27e8ca47a2f406db7d3a60bc72184d97196cfbe424e3','2026-10-13 21:48:32','2026-10-13 22:03:32',NULL),
(21,30,'c7b3594174800baf5569cbd21d075878daf2156a3456783c30fc5633f0aa9204','2026-09-13 21:38:49','2026-09-13 21:53:49',NULL),
(22,23,'e3a27197c5476de2ff006f2f7f0cc09851363414288ed03c45cc70d38d954a63','2026-08-12 17:33:49','2026-08-12 17:48:49','2026-08-12 17:43:49'),
(23,29,'1774c4d0d8a500ced543fe7a0da9b93fb16cb6fa8867c53d235bbd790812c6bc','2026-10-07 12:07:05','2026-10-07 12:22:05','2026-10-07 12:10:05'),
(24,29,'bf50b103869bd622508ec1460bd0e47983fb162f197ac51d2c9f4c06cc492b71','2026-09-14 17:30:51','2026-09-14 17:45:51','2026-09-14 17:41:51'),
(25,15,'acf535868296b51cb87af149ca7435995fc7fb0509bb5e569c45f04cdc11afc7','2026-08-15 06:06:22','2026-08-15 06:21:22','2026-08-15 06:18:22'),
(26,27,'16b7d70a8ece28f382d47f4447a14bd266fa0d2fa3d5ee3863d2d26a252bba32','2026-09-28 04:07:20','2026-09-28 04:22:20',NULL),
(27,8,'b715c95c153985fe3b33afe7db5d8c57daa8c15bafc058f8b3de8137edc4b046','2026-10-04 08:10:28','2026-10-04 08:25:28',NULL),
(28,15,'5b1180afdfae680a86a41f4baddb6f191f481d7376a5301df0545209cb0891ea','2026-09-03 20:28:31','2026-09-03 20:43:31','2026-09-03 20:33:31'),
(29,29,'34ffd32796505a44dd264f5115997b9587e098e72b85fe67d3861807cbe4c6a0','2026-10-16 03:13:09','2026-10-16 03:28:09',NULL),
(30,15,'9fd5ad60a83749a51d1766fb2c22a658efd61f999fb6893c2c9d292aa79875aa','2026-09-18 20:42:32','2026-09-18 20:57:32','2026-09-18 20:53:32');

-- Auditoria_cambios
INSERT INTO auditoria_cambios (id_auditoria, tabla, id_registro, campo, valor_anterior, valor_nuevo, usuario_bd, fecha_cambio) VALUES
(1,'asignaciones_crm',1,'estado','Activa','Finalizada','root@localhost','2026-10-28 01:45:09'),
(2,'asignaciones_crm',5,'estado','Activa','Finalizada','root@localhost','2026-10-28 08:37:31'),
(3,'asignaciones_crm',4,'estado','Activa','Finalizada','root@localhost','2026-10-05 03:53:43'),
(4,'ventas',25,'estado_venta','Pendiente','Cancelada','root@localhost','2026-10-05 09:47:48'),
(5,'ventas',26,'estado_venta','Pendiente','Cancelada','root@localhost','2026-10-05 04:57:49'),
(6,'ventas',27,'estado_venta','Pendiente','Cancelada','root@localhost','2026-08-17 20:09:10'),
(7,'ventas',28,'estado_venta','Pendiente','Cancelada','root@localhost','2026-08-24 21:48:17'),
(8,'descargas_prueba',2,'estado_prueba','Activa','Convertida','root@localhost','2026-10-28 12:32:52'),
(9,'descargas_prueba',8,'estado_prueba','Activa','Convertida','root@localhost','2026-10-09 10:00:00'),
(10,'descargas_prueba',17,'estado_prueba','Activa','Convertida','root@localhost','2026-11-03 11:22:23'),
(11,'descargas_prueba',22,'estado_prueba','Activa','Convertida','root@localhost','2026-10-18 21:03:56'),
(12,'clientes',2,'estado_cliente','En Negociacion','Cliente','root@localhost','2026-10-28 12:32:52'),
(13,'clientes',9,'estado_cliente','En Negociacion','Cliente','root@localhost','2026-11-03 01:31:09'),
(14,'clientes',24,'estado_cliente','En Negociacion','Cliente','root@localhost','2026-11-03 11:22:23'),
(15,'clientes',30,'estado_cliente','En Negociacion','Cliente','root@localhost','2026-10-18 21:03:56'),
(16,'ventas',1,'estado_venta','Pendiente','Completada','root@localhost','2026-10-28 12:30:52'),
(17,'ventas',2,'estado_venta','Pendiente','Completada','root@localhost','2026-11-03 01:29:09'),
(18,'ventas',3,'estado_venta','Pendiente','Completada','root@localhost','2026-11-03 11:20:23'),
(19,'ventas',4,'estado_venta','Pendiente','Completada','root@localhost','2026-10-18 21:01:56'),
(20,'ventas',5,'estado_venta','Pendiente','Completada','root@localhost','2026-10-29 11:53:23'),
(21,'asignaciones_crm',13,'estado','Activa','Finalizada','root@localhost','2026-11-03 10:00:00'),
(22,'asignaciones_crm',15,'estado','Activa','Finalizada','root@localhost','2026-10-26 11:05:37'),
(23,'asignaciones_crm',18,'estado','Activa','Finalizada','root@localhost','2026-11-03 10:00:00'),
(24,'asignaciones_crm',22,'estado','Activa','Finalizada','root@localhost','2026-10-31 02:34:24'),
(25,'clientes',4,'estado_cliente','Tibio','Descartado','root@localhost','2026-09-28 19:53:43'),
(26,'clientes',14,'estado_cliente','Tibio','Descartado','root@localhost','2026-10-08 08:26:00'),
(27,'ventas',29,'estado_venta','Pendiente','Cancelada','root@localhost','2026-11-02 09:16:32'),
(28,'ventas',30,'estado_venta','Pendiente','Cancelada','root@localhost','2026-11-01 12:00:00'),
(29,'descargas_prueba',6,'estado_prueba','Activa','Vencida','root@localhost','2026-10-12 10:00:00'),
(30,'descargas_prueba',7,'estado_prueba','Activa','Vencida','root@localhost','2026-09-18 10:00:00');

-- Total_venta de cada venta = suma de su detalle
UPDATE ventas v
JOIN (
    SELECT id_venta, SUM(subtotal) AS total_detalle
    FROM detalle_ventas
    GROUP BY id_venta
) d ON d.id_venta = v.id_venta
SET v.total_venta = d.total_detalle
WHERE v.id_venta > 0;

-- Alertas: Prospectos calificados, retornos y pruebas por vencer/vencidas
INSERT INTO alertas
    (id_cliente, id_vendedor, id_descarga, tipo_alerta, mensaje, clave_evento,
     estado_alerta, fecha_creacion, fecha_atencion, id_usuario_atendio, nota_atencion)
SELECT
    c.id_cliente,
    (SELECT a.id_vendedor FROM asignaciones_crm a
     WHERE a.id_cliente = c.id_cliente AND a.estado = 'Activa' ORDER BY a.id_asignacion DESC LIMIT 1),
    (SELECT d.id_descarga FROM descargas_prueba d
     WHERE d.id_cliente = c.id_cliente ORDER BY d.id_descarga DESC LIMIT 1),
    CASE MOD(c.id_cliente - 1, 4)
        WHEN 0 THEN 'Prospecto calificado'
        WHEN 1 THEN 'Retorno al sitio'
        WHEN 2 THEN 'Prueba por vencer'
        ELSE 'Prueba vencida'
    END,
    CONCAT('Alerta de seguimiento para ', c.nombre_completo),
    CONCAT('seed-alert-', c.id_cliente),
    IF(MOD(c.id_cliente, 2) = 0, 'Atendida', 'Pendiente'),
    DATE_SUB(NOW(), INTERVAL c.id_cliente DAY),
    IF(MOD(c.id_cliente, 2) = 0, DATE_SUB(NOW(), INTERVAL (c.id_cliente - 1) DAY), NULL),
    IF(MOD(c.id_cliente, 2) = 0, 1, NULL),
    IF(MOD(c.id_cliente, 2) = 0, 'Seguimiento registrado', NULL)
FROM clientes c
WHERE c.id_cliente BETWEEN 1 AND 30;

-- Plantillas_correo: Una plantilla activa por evento y versiones históricas inactivas
INSERT INTO plantillas_correo (evento, nombre_plantilla, asunto, cuerpo, estado) VALUES
('cliente_registrado','Bienvenida cliente v1','Bienvenido a Zimbra','Hola {{nombre}}, gracias por registrarte.',1),
('prueba_iniciada','Inicio de prueba v1','Tu prueba ha comenzado','Hola {{nombre}}, tu prueba vence el {{fecha_fin}}.',1),
('prueba_por_vencer','Prueba por vencer v1','Tu prueba está por vencer','Hola {{nombre}}, tu prueba vence pronto.',1),
('prospecto_calificado','Prospecto calificado v1','Conozcamos tus necesidades','Hola {{nombre}}, queremos ayudarte.',1),
('venta_completada','Venta completada v1','Gracias por tu compra','Hola {{nombre}}, registramos tu compra.',1),
('cliente_registrado','Bienvenida cliente v2','Bienvenido a Zimbra','Hola {{nombre}}, gracias por registrarte.',0),
('prueba_iniciada','Inicio de prueba v2','Tu prueba ha comenzado','Hola {{nombre}}, tu prueba vence el {{fecha_fin}}.',0),
('prueba_por_vencer','Prueba por vencer v2','Tu prueba está por vencer','Hola {{nombre}}, tu prueba vence pronto.',0),
('prospecto_calificado','Prospecto calificado v2','Conozcamos tus necesidades','Hola {{nombre}}, queremos ayudarte.',0),
('venta_completada','Venta completada v2','Gracias por tu compra','Hola {{nombre}}, registramos tu compra.',0),
('cliente_registrado','Bienvenida cliente v3','Bienvenido a Zimbra','Hola {{nombre}}, gracias por registrarte.',0),
('prueba_iniciada','Inicio de prueba v3','Tu prueba ha comenzado','Hola {{nombre}}, tu prueba vence el {{fecha_fin}}.',0),
('prueba_por_vencer','Prueba por vencer v3','Tu prueba está por vencer','Hola {{nombre}}, tu prueba vence pronto.',0),
('prospecto_calificado','Prospecto calificado v3','Conozcamos tus necesidades','Hola {{nombre}}, queremos ayudarte.',0),
('venta_completada','Venta completada v3','Gracias por tu compra','Hola {{nombre}}, registramos tu compra.',0),
('cliente_registrado','Bienvenida cliente v4','Bienvenido a Zimbra','Hola {{nombre}}, gracias por registrarte.',0),
('prueba_iniciada','Inicio de prueba v4','Tu prueba ha comenzado','Hola {{nombre}}, tu prueba vence el {{fecha_fin}}.',0),
('prueba_por_vencer','Prueba por vencer v4','Tu prueba está por vencer','Hola {{nombre}}, tu prueba vence pronto.',0),
('prospecto_calificado','Prospecto calificado v4','Conozcamos tus necesidades','Hola {{nombre}}, queremos ayudarte.',0),
('venta_completada','Venta completada v4','Gracias por tu compra','Hola {{nombre}}, registramos tu compra.',0),
('cliente_registrado','Bienvenida cliente v5','Bienvenido a Zimbra','Hola {{nombre}}, gracias por registrarte.',0),
('prueba_iniciada','Inicio de prueba v5','Tu prueba ha comenzado','Hola {{nombre}}, tu prueba vence el {{fecha_fin}}.',0),
('prueba_por_vencer','Prueba por vencer v5','Tu prueba está por vencer','Hola {{nombre}}, tu prueba vence pronto.',0),
('prospecto_calificado','Prospecto calificado v5','Conozcamos tus necesidades','Hola {{nombre}}, queremos ayudarte.',0),
('venta_completada','Venta completada v5','Gracias por tu compra','Hola {{nombre}}, registramos tu compra.',0),
('cliente_registrado','Bienvenida cliente v6','Bienvenido a Zimbra','Hola {{nombre}}, gracias por registrarte.',0),
('prueba_iniciada','Inicio de prueba v6','Tu prueba ha comenzado','Hola {{nombre}}, tu prueba vence el {{fecha_fin}}.',0),
('prueba_por_vencer','Prueba por vencer v6','Tu prueba está por vencer','Hola {{nombre}}, tu prueba vence pronto.',0),
('prospecto_calificado','Prospecto calificado v6','Conozcamos tus necesidades','Hola {{nombre}}, queremos ayudarte.',0),
('venta_completada','Venta completada v6','Gracias por tu compra','Hola {{nombre}}, registramos tu compra.',0);

-- Correos_enviados: Historial de envíos con reintentos e idempotencia
INSERT INTO correos_enviados
    (id_cliente, id_plantilla, clave_idempotencia, evento, correo_destino,
     asunto_enviado, cuerpo_enviado, estado_correo, intentos, ultimo_error,
     fecha_creacion, fecha_envio, proximo_intento)
SELECT
    c.id_cliente,
    MOD(c.id_cliente - 1, 5) + 1,
    CONCAT('seed-email-', c.id_cliente),
    p.evento,
    c.correo_electronico,
    p.asunto,
    p.cuerpo,
    CASE MOD(c.id_cliente, 3) WHEN 0 THEN 'Fallido' WHEN 1 THEN 'Enviado' ELSE 'Pendiente' END,
    CASE MOD(c.id_cliente, 3) WHEN 0 THEN 3 WHEN 1 THEN 1 ELSE 0 END,
    IF(MOD(c.id_cliente, 3) = 0, 'Fallo simulado de entrega', NULL),
    DATE_SUB(NOW(), INTERVAL c.id_cliente HOUR),
    IF(MOD(c.id_cliente, 3) = 1, DATE_SUB(NOW(), INTERVAL (c.id_cliente - 1) HOUR), NULL),
    IF(MOD(c.id_cliente, 3) = 2, DATE_ADD(NOW(), INTERVAL 1 HOUR), NULL)
FROM clientes c
JOIN plantillas_correo p ON p.id_plantilla = MOD(c.id_cliente - 1, 5) + 1
WHERE c.id_cliente BETWEEN 1 AND 30;

-- Salesforce_sincronizaciones: Historial de sincronizaciones con Salesforce
INSERT INTO salesforce_sincronizaciones
    (id_cliente,objeto_salesforce,operacion,estado,intentos,salesforce_id,mensaje_error)
SELECT c.id_cliente,
       IF(c.estado_cliente='Cliente','Contact','Lead'), 'Upsert',
       CASE MOD(c.id_cliente,3) WHEN 0 THEN 'Fallido' WHEN 1 THEN 'Sincronizado' ELSE 'Pendiente' END,
       CASE MOD(c.id_cliente,3) WHEN 0 THEN 4 WHEN 1 THEN 1 ELSE 0 END,
       IF(MOD(c.id_cliente,3)=0,NULL,CONCAT('SF-',c.id_cliente)),
       IF(MOD(c.id_cliente,3)=0,'Fallo simulado de conexión',NULL)
FROM clientes c WHERE c.id_cliente BETWEEN 1 AND 30;

UPDATE campanas_marketing
SET
    codigo_campana = CONCAT('CAM-', LPAD(id_campana, 6, '0'))
WHERE id_campana > 0;

-- =====================================================================
-- 4. Funciones
-- =====================================================================

DELIMITER $$

-- FUNCTION 1: HU-29 – Total de ventas completadas por vendedor
CREATE FUNCTION fn_total_ventas_vendedor(p_id_vendedor INT)
RETURNS DECIMAL(12,2) DETERMINISTIC READS SQL DATA
BEGIN
    DECLARE v_total DECIMAL(12,2);
    SELECT COALESCE(SUM(total_venta), 0) INTO v_total FROM ventas
    WHERE id_vendedor = p_id_vendedor AND estado_venta = 'Completada';
    RETURN v_total;
END$$

-- FUNCTION 2: HU-29 – Ticket promedio de ventas en un periodo
CREATE FUNCTION fn_ticket_promedio_ventas(p_fecha_inicio DATE, p_fecha_fin DATE)
RETURNS DECIMAL(10,2) DETERMINISTIC READS SQL DATA
BEGIN
    DECLARE v_promedio DECIMAL(10,2);
    SELECT COALESCE(AVG(total_venta), 0) INTO v_promedio FROM ventas
    WHERE estado_venta = 'Completada' AND fecha_venta >= p_fecha_inicio
      AND fecha_venta < DATE_ADD(p_fecha_fin, INTERVAL 1 DAY);
    RETURN v_promedio;
END$$

-- FUNCTION 3: HU-29 – Contar ventas pendientes de un cliente
CREATE FUNCTION fn_contar_ventas_pendientes_cliente(p_id_cliente INT)
RETURNS INT DETERMINISTIC READS SQL DATA
BEGIN
    DECLARE v_count INT;
    SELECT COUNT(*) INTO v_count FROM ventas
    WHERE id_cliente = p_id_cliente AND estado_venta = 'Pendiente';
    RETURN v_count;
END$$

-- FUNCTION 4: HU-29 – Valor proyectado de ventas pendientes por vendedor
CREATE FUNCTION fn_valor_proyectado_vendedor(p_id_vendedor INT)
RETURNS DECIMAL(12,2) DETERMINISTIC READS SQL DATA
BEGIN
    DECLARE v_proyectado DECIMAL(12,2);
    SELECT COALESCE(SUM(total_venta), 0) INTO v_proyectado FROM ventas
    WHERE id_vendedor = p_id_vendedor AND estado_venta = 'Pendiente';
    RETURN v_proyectado;
END$$

-- FUNCTION 5: HU-21 / HU-22 – Obtener vendedor responsable actual
CREATE FUNCTION fn_obtener_vendedor_responsable(p_id_cliente INT)
RETURNS INT DETERMINISTIC READS SQL DATA
BEGIN
    DECLARE v_id_vendedor INT;
    SELECT id_vendedor INTO v_id_vendedor FROM asignaciones_crm
    WHERE id_cliente = p_id_cliente AND estado = 'Activa'
    ORDER BY fecha_asignacion DESC LIMIT 1;
    RETURN COALESCE(v_id_vendedor, -1);
END$$

-- FUNCTION 6: HU-26 – Validar si un producto es vendible
CREATE FUNCTION fn_es_producto_vendible(p_id_producto INT)
RETURNS BOOLEAN DETERMINISTIC READS SQL DATA
BEGIN
    DECLARE v_es_vendible BOOLEAN;
    SELECT (tipo_licencia = 'Comercial' AND estado = TRUE) INTO v_es_vendible
    FROM productos WHERE id_producto = p_id_producto;
    RETURN COALESCE(v_es_vendible, FALSE);
END$$

-- FUNCTION 7: HU-25 / HU-30 – Contar interacciones recientes por cliente
CREATE FUNCTION fn_contar_interacciones_recientes(p_id_cliente INT, p_dias INT)
RETURNS INT DETERMINISTIC READS SQL DATA
BEGIN
    DECLARE v_count INT;
    SELECT COUNT(*) INTO v_count FROM interacciones i
    JOIN asignaciones_crm ac ON i.id_asignacion = ac.id_asignacion
    WHERE ac.id_cliente = p_id_cliente
      AND i.fecha_interaccion >= DATE_SUB(CURDATE(), INTERVAL p_dias DAY);
    RETURN v_count;
END$$

-- FUNCTION 8: HU-30 – Tasa de éxito de correos por evento
CREATE FUNCTION fn_tasa_exito_correos(p_evento VARCHAR(80))
RETURNS DECIMAL(5,2) DETERMINISTIC READS SQL DATA
BEGIN
    DECLARE v_tasa DECIMAL(5,2);
    SELECT ROUND((SUM(CASE WHEN ce.estado_correo = 'Enviado' THEN 1 ELSE 0 END) /
                 NULLIF(COUNT(*), 0)) * 100, 2) INTO v_tasa
    FROM correos_enviados ce JOIN plantillas_correo pc ON ce.id_plantilla = pc.id_plantilla
    WHERE pc.evento = p_evento;
    RETURN COALESCE(v_tasa, 0);
END$$

-- FUNCTION 9: HU-30 – Contar asignaciones activas por vendedor
CREATE FUNCTION fn_asignaciones_activas_vendedor(p_id_vendedor INT)
RETURNS INT DETERMINISTIC READS SQL DATA
BEGIN
    DECLARE v_count INT;
    SELECT COUNT(*) INTO v_count FROM asignaciones_crm
    WHERE id_vendedor = p_id_vendedor AND estado = 'Activa';
    RETURN v_count;
END$$

/* FUNCIÓN 10 - HU-16: Calificación de prospectos según sus puntos.
   Recibe el puntaje y el estado actual del cliente y devuelve su calificación:
   - Menos de 30 puntos: Frio.
   - Entre 30 y 69 puntos: Tibio.
   - Desde 70 puntos: Calificado.
   Si ya es Cliente, Convertido, En Negociacion, Descartado o Inactivo,
   conserva ese estado para respetar el seguimiento comercial.
*/
CREATE FUNCTION fn_calificacion(
    p_puntaje BIGINT,
    p_estado VARCHAR(50)
)
RETURNS VARCHAR(50) DETERMINISTIC NO SQL
BEGIN
    IF p_estado IN('Cliente', 'Convertido', 'En Negociacion', 'Descartado', 'Inactivo') THEN
        RETURN p_estado;
    END IF;
    RETURN CASE WHEN p_puntaje >= 70 THEN 'Calificado' WHEN p_puntaje >= 30 THEN 'Tibio' ELSE 'Frio' END;
END$$

DELIMITER ;

-- =====================================================================
-- 5. Procedimientos almacenados
-- =====================================================================

DELIMITER $$

-- PROCEDURE 1: HU-04 – Registrar un cliente
CREATE PROCEDURE sp_registrar_cliente(
    IN p_id_empresa INT, IN p_nombre VARCHAR(150),
    IN p_correo VARCHAR(100), IN p_telefono VARCHAR(50)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    IF p_nombre IS NULL OR TRIM(p_nombre)='' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='El nombre del cliente es obligatorio.';
    END IF;
    IF p_correo IS NULL OR TRIM(p_correo)='' OR p_correo NOT REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='El correo electrónico no es válido.';
    END IF;
    START TRANSACTION;
    INSERT INTO clientes(id_empresa,nombre_completo,correo_electronico,telefono,puntaje_total,estado_cliente)
    VALUES(p_id_empresa,TRIM(p_nombre),LOWER(TRIM(p_correo)),NULLIF(TRIM(p_telefono),''),0,'Frio');
    COMMIT;
    SELECT LAST_INSERT_ID() AS id_cliente;
END$$

-- PROCEDURE 2: HU-05 – Consultar clientes con filtros
CREATE PROCEDURE sp_listar_clientes(
    IN p_busqueda VARCHAR(150), IN p_estado VARCHAR(50),
    IN p_limite INT, IN p_desplazamiento INT
)
BEGIN
    DECLARE v_limite INT DEFAULT 50;
    DECLARE v_desplazamiento INT DEFAULT 0;
    SET v_limite=LEAST(GREATEST(COALESCE(p_limite,50),1),200);
    SET v_desplazamiento=GREATEST(COALESCE(p_desplazamiento,0),0);
    SELECT c.id_cliente,c.id_empresa,c.nombre_completo,c.correo_electronico,c.telefono,
           c.estado_cliente,c.puntaje_total,c.fecha_registro,e.nombre_empresa
    FROM clientes c LEFT JOIN empresas e ON e.id_empresa=c.id_empresa
    WHERE (p_busqueda IS NULL OR p_busqueda='' OR
           c.nombre_completo LIKE CONCAT('%',p_busqueda,'%') OR
           c.correo_electronico LIKE CONCAT('%',p_busqueda,'%') OR
           e.nombre_empresa LIKE CONCAT('%',p_busqueda,'%'))
      AND (p_estado IS NULL OR p_estado='' OR c.estado_cliente=p_estado)
    ORDER BY c.fecha_registro DESC,c.id_cliente DESC
    LIMIT v_desplazamiento,v_limite;
END$$

-- PROCEDURE 3: HU-05 – Actualizar los datos de un cliente
CREATE PROCEDURE sp_actualizar_cliente(
    IN p_id_cliente INT, IN p_id_empresa INT,
    IN p_nombre VARCHAR(150), IN p_correo VARCHAR(100),
    IN p_telefono VARCHAR(50)
)
BEGIN
    DECLARE v_existe INT DEFAULT NULL;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    IF p_nombre IS NULL OR TRIM(p_nombre)='' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='El nombre del cliente es obligatorio.';
    END IF;
    IF p_correo IS NULL OR TRIM(p_correo)='' OR p_correo NOT REGEXP '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='El correo electrónico no es válido.';
    END IF;
    START TRANSACTION;
    SELECT id_cliente INTO v_existe FROM clientes WHERE id_cliente=p_id_cliente FOR UPDATE;
    IF v_existe IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='El cliente indicado no existe.';
    END IF;
    UPDATE clientes
       SET id_empresa=p_id_empresa,nombre_completo=TRIM(p_nombre),
           correo_electronico=LOWER(TRIM(p_correo)),telefono=NULLIF(TRIM(p_telefono),'')
     WHERE id_cliente=p_id_cliente;
    COMMIT;
    SELECT p_id_cliente AS id_cliente;
END$$

-- PROCEDURE 4: HU-05 – Cambiar el estado de un cliente
CREATE PROCEDURE sp_cambiar_estado_cliente(IN p_id_cliente INT, IN p_estado VARCHAR(50))
BEGIN
    DECLARE v_existe INT DEFAULT NULL;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    IF p_estado NOT IN ('Frio','Tibio','Calificado','En Negociacion','Cliente','Convertido','Descartado','Inactivo') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='El estado del cliente no está permitido.';
    END IF;
    START TRANSACTION;
    SELECT id_cliente INTO v_existe FROM clientes WHERE id_cliente=p_id_cliente FOR UPDATE;
    IF v_existe IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='El cliente indicado no existe.';
    END IF;
    UPDATE clientes SET estado_cliente=p_estado WHERE id_cliente=p_id_cliente;
    IF p_estado = 'Inactivo' THEN
        UPDATE asignaciones_crm
           SET estado = 'Finalizada', fecha_fin = NOW()
         WHERE id_cliente = p_id_cliente AND estado = 'Activa';
    END IF;
    COMMIT;
    SELECT p_id_cliente AS id_cliente,p_estado AS estado_cliente;
END$$

-- PROCEDURE 5: HU-06 – Registrar una empresa
CREATE PROCEDURE sp_registrar_empresa(
    IN p_nombre VARCHAR(150), IN p_sector VARCHAR(100), IN p_sitio_web VARCHAR(150)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    IF p_nombre IS NULL OR TRIM(p_nombre)='' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='El nombre de la empresa es obligatorio.';
    END IF;
    IF p_sitio_web IS NOT NULL AND TRIM(p_sitio_web)<>'' AND
       TRIM(p_sitio_web) NOT LIKE 'http://%' AND TRIM(p_sitio_web) NOT LIKE 'https://%' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='El sitio web debe iniciar con http:// o https://.';
    END IF;
    START TRANSACTION;
    INSERT INTO empresas(nombre_empresa,sector_industria,sitio_web)
    VALUES(TRIM(p_nombre),NULLIF(TRIM(p_sector),''),NULLIF(TRIM(p_sitio_web),''));
    COMMIT;
    SELECT LAST_INSERT_ID() AS id_empresa;
END$$

-- PROCEDURE 6: HU-06 – Consultar una empresa y sus clientes
CREATE PROCEDURE sp_detalle_empresa(IN p_id_empresa INT)
BEGIN
    SELECT e.id_empresa,e.nombre_empresa,e.sector_industria,e.sitio_web,
           COUNT(DISTINCT c.id_cliente) AS total_clientes,
           COUNT(DISTINCT CASE WHEN v.estado_venta='Completada' THEN v.id_venta END) AS ventas_completadas
    FROM empresas e
    LEFT JOIN clientes c ON c.id_empresa=e.id_empresa
    LEFT JOIN ventas v ON v.id_cliente=c.id_cliente
    WHERE e.id_empresa=p_id_empresa
    GROUP BY e.id_empresa,e.nombre_empresa,e.sector_industria,e.sitio_web;
    SELECT c.id_cliente,c.nombre_completo,c.correo_electronico,c.estado_cliente
    FROM clientes c WHERE c.id_empresa=p_id_empresa
    ORDER BY c.nombre_completo;
END$$

-- PROCEDURE 7: HU-32 – Consultar el historial de cambios
CREATE PROCEDURE sp_consultar_auditoria(
    IN p_tabla VARCHAR(50), IN p_desde DATETIME, IN p_hasta DATETIME,
    IN p_limite INT, IN p_desplazamiento INT
)
BEGIN
    DECLARE v_limite INT DEFAULT 100;
    DECLARE v_desplazamiento INT DEFAULT 0;
    IF p_desde IS NOT NULL AND p_hasta IS NOT NULL AND p_desde>p_hasta THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='El rango de fechas de auditoría no es válido.';
    END IF;
    SET v_limite=LEAST(GREATEST(COALESCE(p_limite,100),1),500);
    SET v_desplazamiento=GREATEST(COALESCE(p_desplazamiento,0),0);
    SELECT id_auditoria,tabla,id_registro,campo,valor_anterior,valor_nuevo,usuario_bd,fecha_cambio
    FROM auditoria_cambios
    WHERE (p_tabla IS NULL OR p_tabla='' OR tabla=p_tabla)
      AND (p_desde IS NULL OR fecha_cambio>=p_desde)
      AND (p_hasta IS NULL OR fecha_cambio<=p_hasta)
    ORDER BY fecha_cambio ASC,id_auditoria ASC
    LIMIT v_desplazamiento,v_limite;
END$$

-- PROCEDURE 8: HU-24 – Consultar las sincronizaciones con Salesforce
CREATE PROCEDURE sp_consultar_sincronizaciones_salesforce(
    IN p_estado VARCHAR(20), IN p_id_cliente INT,
    IN p_desde DATETIME, IN p_hasta DATETIME,
    IN p_limite INT, IN p_desplazamiento INT
)
BEGIN
    DECLARE v_limite INT DEFAULT 100;
    DECLARE v_desplazamiento INT DEFAULT 0;
    IF p_desde IS NOT NULL AND p_hasta IS NOT NULL AND p_desde>p_hasta THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='El rango de fechas de sincronización no es válido.';
    END IF;
    SET v_limite=LEAST(GREATEST(COALESCE(p_limite,100),1),500);
    SET v_desplazamiento=GREATEST(COALESCE(p_desplazamiento,0),0);
    SELECT s.id_sincronizacion,s.id_cliente,c.nombre_completo,c.correo_electronico,
           s.objeto_salesforce,s.operacion,s.estado,s.intentos,s.salesforce_id,
           s.respuesta_salesforce,s.mensaje_error,s.fecha_creacion,s.fecha_actualizacion
    FROM salesforce_sincronizaciones s
    INNER JOIN clientes c ON c.id_cliente=s.id_cliente
    WHERE (p_estado IS NULL OR p_estado='' OR s.estado=p_estado)
      AND (p_id_cliente IS NULL OR s.id_cliente=p_id_cliente)
      AND (p_desde IS NULL OR s.fecha_creacion>=p_desde)
      AND (p_hasta IS NULL OR s.fecha_creacion<=p_hasta)
    ORDER BY s.fecha_creacion DESC,s.id_sincronizacion DESC
    LIMIT v_desplazamiento,v_limite;
END$$

-- PROCEDURE 9: HU-26 – Registrar venta completa con detalle de productos
CREATE PROCEDURE sp_registrar_venta(
    IN p_id_cliente INT, IN p_id_vendedor INT, IN p_numero_contrato VARCHAR(100),
    IN p_metodo_pago VARCHAR(50), IN p_detalles JSON
)
BEGIN
    DECLARE v_id_venta INT; DECLARE v_total DECIMAL(12,2) DEFAULT 0;
    DECLARE v_precio_unitario DECIMAL(10,2); DECLARE v_subtotal DECIMAL(12,2);
    DECLARE v_cantidad INT; DECLARE v_id_producto INT;
    DECLARE i INT DEFAULT 0; DECLARE n INT DEFAULT JSON_LENGTH(p_detalles);
    DECLARE v_estado_cliente VARCHAR(50); DECLARE v_vendedor_activo BOOLEAN DEFAULT FALSE;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
    START TRANSACTION;
    SELECT estado_cliente INTO v_estado_cliente FROM clientes WHERE id_cliente = p_id_cliente FOR UPDATE;
    IF v_estado_cliente IS NULL OR v_estado_cliente IN ('Inactivo','Descartado') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El cliente no existe o no puede recibir ventas.'; END IF;
    SELECT estado INTO v_vendedor_activo FROM vendedores WHERE id_vendedor = p_id_vendedor FOR UPDATE;
    IF v_vendedor_activo IS NULL OR v_vendedor_activo = FALSE THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El vendedor no existe o está inactivo.'; END IF;
    IF NOT EXISTS (SELECT 1 FROM asignaciones_crm WHERE id_cliente = p_id_cliente AND id_vendedor = p_id_vendedor AND estado = 'Activa') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El vendedor requiere una asignación activa con el cliente.'; END IF;
    IF n IS NULL OR n < 1 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La venta debe incluir al menos un producto.'; END IF;
    INSERT INTO ventas (id_cliente,id_vendedor,numero_contrato,metodo_pago,estado_venta,total_venta)
    VALUES (p_id_cliente,p_id_vendedor,p_numero_contrato,p_metodo_pago,'Pendiente',0);
    SET v_id_venta = LAST_INSERT_ID();
    SAVEPOINT sp_cabecera_guardada;
    WHILE i < n DO
        SET v_id_producto = JSON_UNQUOTE(JSON_EXTRACT(p_detalles, CONCAT('$[',i,'].id_producto')));
        SET v_cantidad = JSON_UNQUOTE(JSON_EXTRACT(p_detalles, CONCAT('$[',i,'].cantidad')));
        SELECT precio INTO v_precio_unitario FROM productos
        WHERE id_producto = v_id_producto AND estado = TRUE;
        IF v_precio_unitario IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Producto inválido o inactivo.'; END IF;
        SET v_subtotal = v_precio_unitario * v_cantidad;
        SET v_total = v_total + v_subtotal;
        INSERT INTO detalle_ventas (id_venta,id_producto,cantidad,precio_unitario,subtotal)
        VALUES (v_id_venta,v_id_producto,v_cantidad,v_precio_unitario,v_subtotal);
        SET i = i + 1;
    END WHILE;
    UPDATE ventas SET total_venta = v_total WHERE id_venta = v_id_venta;
    COMMIT;
    SELECT v_id_venta AS id_venta_generada, v_total AS total_final;
END$$

-- PROCEDURE 10: HU-27 – Actualizar venta pendiente
CREATE PROCEDURE sp_actualizar_venta_pendiente(
    IN p_id_venta INT, IN p_metodo_pago VARCHAR(50), IN p_detalles JSON
)
BEGIN
    DECLARE v_estado_actual VARCHAR(30); DECLARE v_total DECIMAL(12,2) DEFAULT 0;
    DECLARE v_precio_unitario DECIMAL(10,2); DECLARE v_subtotal DECIMAL(12,2);
    DECLARE v_cantidad INT; DECLARE v_id_producto INT;
    DECLARE i INT DEFAULT 0; DECLARE n INT DEFAULT JSON_LENGTH(p_detalles);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
    START TRANSACTION;
    SELECT estado_venta INTO v_estado_actual FROM ventas WHERE id_venta = p_id_venta FOR UPDATE;
    IF v_estado_actual IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La venta no existe.'; END IF;
    IF v_estado_actual <> 'Pendiente' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Solo se pueden editar ventas en estado Pendiente.'; END IF;
    SAVEPOINT sp_antes_actualizacion;
    IF p_metodo_pago IS NOT NULL THEN UPDATE ventas SET metodo_pago = p_metodo_pago WHERE id_venta = p_id_venta; END IF;
    IF p_detalles IS NOT NULL AND n > 0 THEN
        DELETE FROM detalle_ventas WHERE id_venta = p_id_venta;
        WHILE i < n DO
            SET v_id_producto = JSON_UNQUOTE(JSON_EXTRACT(p_detalles, CONCAT('$[',i,'].id_producto')));
            SET v_cantidad = JSON_UNQUOTE(JSON_EXTRACT(p_detalles, CONCAT('$[',i,'].cantidad')));
            SELECT precio INTO v_precio_unitario FROM productos WHERE id_producto = v_id_producto AND estado = TRUE;
            IF v_precio_unitario IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Producto inválido o inactivo.'; END IF;
            SET v_subtotal = v_precio_unitario * v_cantidad; SET v_total = v_total + v_subtotal;
            INSERT INTO detalle_ventas (id_venta,id_producto,cantidad,precio_unitario,subtotal)
            VALUES (p_id_venta,v_id_producto,v_cantidad,v_precio_unitario,v_subtotal);
            SET i = i + 1;
        END WHILE;
        UPDATE ventas SET total_venta = v_total WHERE id_venta = p_id_venta;
    END IF;
    COMMIT;
    SELECT p_id_venta AS id_venta_actualizada, v_total AS total_final;
END$$

-- PROCEDURE 11: HU-28 – Completar venta y convertir prospecto en cliente
CREATE PROCEDURE sp_completar_venta(IN p_id_venta INT)
BEGIN
    DECLARE v_id_cliente INT; DECLARE v_estado_actual VARCHAR(30);
    DECLARE v_total_venta DECIMAL(12,2); DECLARE v_total_detalle DECIMAL(12,2); DECLARE v_cantidad_detalles INT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
    START TRANSACTION;
    SELECT id_cliente,estado_venta,total_venta INTO v_id_cliente,v_estado_actual,v_total_venta FROM ventas WHERE id_venta = p_id_venta FOR UPDATE;
    IF v_estado_actual IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La venta no existe.'; END IF;
    IF v_estado_actual <> 'Pendiente' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La venta no está pendiente.'; END IF;
    SELECT COUNT(*), COALESCE(SUM(subtotal),0) INTO v_cantidad_detalles,v_total_detalle FROM detalle_ventas WHERE id_venta = p_id_venta;
    IF v_cantidad_detalles = 0 THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No se puede completar una venta sin productos.'; END IF;
    IF v_total_detalle <> v_total_venta THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El total de la venta no coincide con sus productos.'; END IF;
    IF EXISTS (SELECT 1 FROM detalle_ventas d JOIN productos p ON p.id_producto = d.id_producto WHERE d.id_venta = p_id_venta AND (p.estado = FALSE OR p.tipo_licencia <> 'Comercial')) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La venta contiene productos no comerciales o inactivos.'; END IF;
    SAVEPOINT sp_pre_completado;
    UPDATE ventas SET estado_venta = 'Completada' WHERE id_venta = p_id_venta;
    UPDATE clientes SET estado_cliente = 'Cliente' WHERE id_cliente = v_id_cliente;
    UPDATE descargas_prueba SET estado_prueba = 'Convertida',id_venta = p_id_venta
    WHERE id_cliente = v_id_cliente AND estado_prueba = 'Activa';
    COMMIT;
    SELECT 'Venta completada y cliente convertido exitosamente' AS mensaje;
END$$

-- PROCEDURE 12: HU-22 – Reasignar cliente a otro vendedor
CREATE PROCEDURE sp_reasignar_cliente(IN p_id_cliente INT,IN p_nuevo_vendedor INT,IN p_motivo VARCHAR(255))
BEGIN
    DECLARE v_id_asignacion_antigua INT;
    DECLARE v_vendedor_anterior INT; DECLARE v_vendedor_activo BOOLEAN DEFAULT FALSE;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
    START TRANSACTION;
    SELECT estado INTO v_vendedor_activo FROM vendedores WHERE id_vendedor = p_nuevo_vendedor FOR UPDATE;
    IF v_vendedor_activo IS NULL OR v_vendedor_activo = FALSE THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El vendedor no existe o está inactivo.'; END IF;
    SELECT id_asignacion,id_vendedor INTO v_id_asignacion_antigua,v_vendedor_anterior FROM asignaciones_crm
    WHERE id_cliente = p_id_cliente AND estado = 'Activa' LIMIT 1 FOR UPDATE;
    IF v_id_asignacion_antigua IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El cliente no tiene una asignación activa.'; END IF;
    IF v_vendedor_anterior = p_nuevo_vendedor THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El cliente ya está asignado a ese vendedor.'; END IF;
    SAVEPOINT sp_reasignacion_inicio;
    UPDATE asignaciones_crm SET estado = 'Finalizada',fecha_fin = NOW() WHERE id_asignacion = v_id_asignacion_antigua;
    INSERT INTO asignaciones_crm (id_cliente,id_vendedor,fecha_asignacion,estado)
    VALUES (p_id_cliente,p_nuevo_vendedor,NOW(),'Activa');
    INSERT INTO interacciones (id_asignacion,tipo_interaccion,resultado,notas)
    VALUES (LAST_INSERT_ID(),'Alerta Automática','Reasignación',p_motivo);
    COMMIT;
    SELECT 'Cliente reasignado correctamente' AS mensaje;
END$$

-- PROCEDURE 13: HU-22 – Finalizar asignación conservando el historial
CREATE PROCEDURE sp_finalizar_asignacion(IN p_id_asignacion INT)
BEGIN
    DECLARE v_estado_actual VARCHAR(20);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
    START TRANSACTION;
    SELECT estado INTO v_estado_actual FROM asignaciones_crm WHERE id_asignacion = p_id_asignacion FOR UPDATE;
    IF v_estado_actual IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La asignación no existe.'; END IF;
    IF v_estado_actual <> 'Activa' THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La asignación no está activa.'; END IF;
    SAVEPOINT sp_finalizar;
    UPDATE asignaciones_crm SET estado = 'Finalizada',fecha_fin = NOW() WHERE id_asignacion = p_id_asignacion;
    COMMIT;
    SELECT 'Asignación finalizada conservando historial' AS mensaje;
END$$

-- PROCEDURE 14: HU-25 – Registrar interacción comercial
CREATE PROCEDURE sp_registrar_interaccion(IN p_id_cliente INT,IN p_tipo_interaccion VARCHAR(40),IN p_resultado VARCHAR(60),IN p_notas TEXT)
BEGIN
    DECLARE v_id_asignacion INT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
    START TRANSACTION;
    SELECT id_asignacion INTO v_id_asignacion FROM asignaciones_crm
    WHERE id_cliente = p_id_cliente AND estado = 'Activa' ORDER BY fecha_asignacion DESC LIMIT 1;
    IF v_id_asignacion IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No existe una asignación activa para este cliente.'; END IF;
    SAVEPOINT sp_interaccion_guardada;
    INSERT INTO interacciones (id_asignacion,tipo_interaccion,resultado,fecha_interaccion,notas)
    VALUES (v_id_asignacion,p_tipo_interaccion,p_resultado,NOW(),p_notas);
    COMMIT;
    SELECT LAST_INSERT_ID() AS id_interaccion;
END$$

-- PROCEDURE 15: HU-19 – Registrar un correo automático sin repetir el mismo envío
CREATE PROCEDURE sp_enviar_correo_automatico(IN p_id_cliente INT,IN p_evento VARCHAR(80),IN p_asunto VARCHAR(200),IN p_cuerpo TEXT)
BEGIN
    DECLARE v_id_plantilla INT; DECLARE v_correo_destino VARCHAR(150); DECLARE v_clave_idempotencia VARCHAR(160);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;
    START TRANSACTION;
    SET v_clave_idempotencia = CONCAT(p_evento,'_',p_id_cliente);
    IF EXISTS (SELECT 1 FROM correos_enviados WHERE clave_idempotencia = v_clave_idempotencia AND estado_correo = 'Enviado') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El correo ya fue enviado previamente para este evento.';
    END IF;
    SELECT correo_electronico INTO v_correo_destino FROM clientes WHERE id_cliente = p_id_cliente;
    SELECT id_plantilla INTO v_id_plantilla FROM plantillas_correo WHERE evento = p_evento AND estado = TRUE LIMIT 1;
    IF v_id_plantilla IS NULL THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No hay plantilla activa para este evento.'; END IF;
    SAVEPOINT sp_correo_registrado;
    INSERT INTO correos_enviados (id_cliente,id_plantilla,clave_idempotencia,evento,correo_destino,asunto_enviado,cuerpo_enviado,estado_correo,intentos,fecha_envio)
    VALUES (p_id_cliente,v_id_plantilla,v_clave_idempotencia,p_evento,v_correo_destino,p_asunto,p_cuerpo,'Enviado',1,NOW());
    COMMIT;
    SELECT 'Correo registrado como enviado' AS estado;
END$$

-- PROCEDURE 16: HU-29 – Consultar el reporte de ventas por periodo
CREATE PROCEDURE sp_reporte_ventas_periodo(IN p_fecha_inicio DATE,IN p_fecha_fin DATE,IN p_id_vendedor INT)
BEGIN
    START TRANSACTION;
    SELECT v.id_venta,v.numero_contrato,c.nombre_completo AS cliente,ve.nombre_vendedor,v.fecha_venta,v.estado_venta,v.metodo_pago,v.total_venta,COUNT(dv.id_detalle) AS cantidad_productos
    FROM ventas v JOIN clientes c ON v.id_cliente = c.id_cliente JOIN vendedores ve ON v.id_vendedor = ve.id_vendedor
    LEFT JOIN detalle_ventas dv ON v.id_venta = dv.id_venta
    WHERE v.fecha_venta >= p_fecha_inicio AND v.fecha_venta < DATE_ADD(p_fecha_fin,INTERVAL 1 DAY)
      AND (p_id_vendedor IS NULL OR v.id_vendedor = p_id_vendedor)
    GROUP BY v.id_venta,v.numero_contrato,c.nombre_completo,ve.nombre_vendedor,v.fecha_venta,v.estado_venta,v.metodo_pago,v.total_venta
    ORDER BY v.fecha_venta DESC;
    COMMIT;
END$$

-- PROCEDURE 17: HU-29 / HU-30 – Consultar el rendimiento por vendedor
CREATE PROCEDURE sp_reporte_rendimiento_vendedores(IN p_fecha_inicio DATE,IN p_fecha_fin DATE)
BEGIN
    START TRANSACTION;
    SELECT v.id_vendedor,ve.nombre_vendedor,
      COUNT(CASE WHEN v.estado_venta = 'Completada' THEN 1 END) AS ventas_completadas,
      COALESCE(SUM(CASE WHEN v.estado_venta = 'Completada' THEN v.total_venta ELSE 0 END),0) AS total_facturado,
      COUNT(CASE WHEN v.estado_venta = 'Pendiente' THEN 1 END) AS ventas_pendientes,
      COALESCE(SUM(CASE WHEN v.estado_venta = 'Pendiente' THEN v.total_venta ELSE 0 END),0) AS valor_proyectado
    FROM ventas v JOIN vendedores ve ON v.id_vendedor = ve.id_vendedor
    WHERE v.fecha_venta >= p_fecha_inicio
      AND v.fecha_venta < DATE_ADD(p_fecha_fin,INTERVAL 1 DAY)
    GROUP BY v.id_vendedor,ve.nombre_vendedor ORDER BY total_facturado DESC;
    COMMIT;
END$$

-- PROCEDURE 18: HU-30 – Consultar el estado de los correos automáticos
CREATE PROCEDURE sp_reporte_estado_correos(IN p_fecha_inicio DATE,IN p_fecha_fin DATE)
BEGIN
    START TRANSACTION;
    SELECT pc.evento,pc.nombre_plantilla,COUNT(*) AS total_envios,
      SUM(CASE WHEN ce.estado_correo = 'Enviado' THEN 1 ELSE 0 END) AS exitosos,
      SUM(CASE WHEN ce.estado_correo = 'Fallido' THEN 1 ELSE 0 END) AS fallidos,
      ROUND((SUM(CASE WHEN ce.estado_correo = 'Enviado' THEN 1 ELSE 0 END) / COUNT(*)) * 100,2) AS tasa_exito_porcentaje
    FROM correos_enviados ce JOIN plantillas_correo pc ON ce.id_plantilla = pc.id_plantilla
    WHERE ce.fecha_creacion >= p_fecha_inicio
      AND ce.fecha_creacion < DATE_ADD(p_fecha_fin,INTERVAL 1 DAY)
    GROUP BY pc.evento,pc.nombre_plantilla ORDER BY total_envios DESC;
    COMMIT;
END$$

-- PROCEDURE 19: HU-17 – Crear o reutilizar una alerta pendiente del cliente
CREATE PROCEDURE sp_alerta_interno(
    IN p_cliente INT,
    IN p_descarga INT,
    IN p_tipo VARCHAR(40),
    IN p_mensaje VARCHAR(255),
    OUT p_creada INT
)
BEGIN
    DECLARE v_cliente INT DEFAULT NULL;
    DECLARE v_alerta BIGINT DEFAULT NULL;
    DECLARE v_vendedor INT DEFAULT NULL;
    SELECT id_cliente INTO v_cliente FROM clientes WHERE id_cliente = p_cliente FOR UPDATE;
    IF v_cliente IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30004, MESSAGE_TEXT = 'El cliente indicado no existe.';
    END IF;
    SELECT id_alerta INTO v_alerta FROM alertas WHERE id_cliente = p_cliente AND tipo_alerta = p_tipo AND estado_alerta = 'Pendiente' ORDER BY
        id_alerta LIMIT 1 FOR UPDATE;
    SELECT id_vendedor INTO v_vendedor FROM asignaciones_crm WHERE id_cliente = p_cliente AND estado = 'Activa' ORDER BY id_asignacion DESC LIMIT 1
        FOR SHARE;
    SET p_creada = 0;
    IF v_alerta IS NULL THEN
        INSERT INTO alertas(id_cliente, id_vendedor, id_descarga, tipo_alerta, mensaje, clave_evento)
        VALUES(p_cliente, v_vendedor, p_descarga, p_tipo, LEFT(p_mensaje, 255), CONCAT(p_tipo, ':', p_cliente));
        SET p_creada = 1;
    ELSEIF p_tipo = 'Prueba por vencer' THEN
        UPDATE alertas SET id_vendedor = v_vendedor, id_descarga = p_descarga, mensaje = LEFT(p_mensaje, 255) WHERE id_alerta = v_alerta;
    END IF;
END$$

-- PROCEDURE 20: HU-15 / HU-16 / HU-17 – Aplicar los puntos de una actividad, revisar la calificación y generar alertas
CREATE PROCEDURE sp_aplicar_actividad_interno(
    IN p_cliente INT,
    IN p_puntos INT
)
BEGIN
    DECLARE v_anterior VARCHAR(50);
    DECLARE v_nuevo VARCHAR(50);
    DECLARE v_nombre VARCHAR(150);
    DECLARE v_puntos BIGINT;
    DECLARE v_creada INT;
    SELECT estado_cliente, nombre_completo, COALESCE(puntaje_total, 0) + p_puntos INTO v_anterior, v_nombre, v_puntos FROM clientes WHERE id_cliente =
        p_cliente FOR UPDATE;
    IF v_anterior NOT IN('Inactivo', 'Convertido') THEN
        SET v_nuevo = fn_calificacion(v_puntos, v_anterior);
        UPDATE clientes SET puntaje_total = v_puntos, estado_cliente = v_nuevo WHERE id_cliente = p_cliente;
        IF v_anterior <> 'Calificado' AND v_nuevo = 'Calificado' THEN
            CALL sp_alerta_interno(p_cliente, NULL, 'Prospecto calificado', CONCAT(v_nombre, ': calificado con ', v_puntos, ' puntos.'), v_creada);
        ELSEIF v_anterior = 'Calificado' THEN
            CALL sp_alerta_interno(p_cliente, NULL, 'Retorno al sitio', CONCAT(v_nombre, ': regresó al sitio con ', v_puntos, ' puntos.'), v_creada);
        END IF;
    END IF;
END$$

-- PROCEDURE 21: HU-07 / HU-08 – Registrar o actualizar un producto
CREATE PROCEDURE sp_guardar_producto(
    IN p_id INT,
    IN p_nombre VARCHAR(100),
    IN p_tipo VARCHAR(50),
    IN p_precio DECIMAL(10, 2),
    IN p_actor VARCHAR(100)
)
BEGIN
    DECLARE v_id INT DEFAULT NULL;
    DECLARE v_actor_anterior TEXT DEFAULT @zimbra_actor;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET @zimbra_actor = v_actor_anterior;
        RESIGNAL;
    END;
    START TRANSACTION;
    SET @zimbra_actor = COALESCE(NULLIF(p_actor, ''), 'zimbra-api');
    IF p_id IS NULL THEN
        INSERT INTO productos(nombre_producto, tipo_licencia, precio, estado)
        VALUES(TRIM(p_nombre), p_tipo, p_precio, TRUE);
        SET v_id = LAST_INSERT_ID();
    ELSE
        SELECT id_producto INTO v_id FROM productos WHERE id_producto = p_id FOR UPDATE;
        IF v_id IS NULL THEN
            SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30004, MESSAGE_TEXT = 'El producto indicado no existe.';
        END IF;
        UPDATE productos SET nombre_producto = TRIM(p_nombre), tipo_licencia = p_tipo, precio = p_precio WHERE id_producto = p_id;
    END IF;
    COMMIT;
    SET @zimbra_actor = v_actor_anterior;
    SELECT v_id AS id_producto;
END$$

-- PROCEDURE 22: HU-08 – Activar o desactivar un producto
CREATE PROCEDURE sp_estado_producto(
    IN p_id INT,
    IN p_estado BOOLEAN,
    IN p_actor VARCHAR(100)
)
BEGIN
    DECLARE v_id INT DEFAULT NULL;
    DECLARE v_actor_anterior TEXT DEFAULT @zimbra_actor;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET @zimbra_actor = v_actor_anterior;
        RESIGNAL;
    END;
    START TRANSACTION;
    SET @zimbra_actor = COALESCE(NULLIF(p_actor, ''), 'zimbra-api');
    SELECT id_producto INTO v_id FROM productos WHERE id_producto = p_id FOR UPDATE;
    IF v_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30004, MESSAGE_TEXT = 'El producto indicado no existe.';
    END IF;
    IF p_estado IS NULL OR p_estado NOT IN(0, 1) THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30001, MESSAGE_TEXT = 'estado debe ser booleano.';
    END IF;
    UPDATE productos SET estado = p_estado WHERE id_producto = p_id;
    COMMIT;
    SET @zimbra_actor = v_actor_anterior;
    SELECT p_id AS id_producto, p_estado AS estado;
END$$

-- PROCEDURE 23: HU-12 / HU-13 – Registrar o actualizar una campaña
CREATE PROCEDURE sp_guardar_campana(
    IN p_id INT,
    IN p_nombre VARCHAR(150),
    IN p_codigo VARCHAR(50),
    IN p_descripcion TEXT,
    IN p_presupuesto DECIMAL(12, 2),
    IN p_inicio DATE,
    IN p_fin DATE,
    IN p_estado VARCHAR(20),
    IN p_actor VARCHAR(100)
)
BEGIN
    DECLARE v_id INT DEFAULT NULL;
    DECLARE v_estado_actual VARCHAR(20);
    DECLARE v_codigo_lock INT DEFAULT 0;
    DECLARE v_actor_anterior TEXT DEFAULT @zimbra_actor;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        IF v_codigo_lock = 1 THEN DO RELEASE_LOCK('zimbra:campanas:codigo'); END IF;
        SET @zimbra_actor = v_actor_anterior;
        RESIGNAL;
    END;
    SET v_codigo_lock = GET_LOCK('zimbra:campanas:codigo', 10);
    IF v_codigo_lock IS NULL OR v_codigo_lock <> 1 THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30009, MESSAGE_TEXT = 'Otra campaña se está guardando. Intenta nuevamente.';
    END IF;
    START TRANSACTION;
    SET @zimbra_actor = COALESCE(NULLIF(p_actor, ''), 'zimbra-api');
    IF p_id IS NULL THEN
        INSERT INTO campanas_marketing(nombre_campana, codigo_campana, descripcion, presupuesto, fecha_inicio, fecha_fin, estado)
        VALUES(TRIM(p_nombre), p_codigo, p_descripcion, p_presupuesto, p_inicio, p_fin, 'Activa');
        SET v_id = LAST_INSERT_ID();
    ELSE
        SELECT id_campana, estado INTO v_id, v_estado_actual FROM campanas_marketing WHERE id_campana = p_id FOR UPDATE;
        IF v_id IS NULL THEN
            SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30004, MESSAGE_TEXT = 'La campaña indicada no existe.';
        END IF;
        IF v_estado_actual <> 'Activa' THEN
            SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30009, MESSAGE_TEXT = 'Reactiva la campaña antes de editarla.';
        END IF;
        UPDATE campanas_marketing SET nombre_campana = TRIM(p_nombre), codigo_campana = COALESCE(p_codigo, codigo_campana), descripcion =
            p_descripcion, presupuesto = p_presupuesto, fecha_inicio = p_inicio, fecha_fin = p_fin, estado = p_estado WHERE id_campana = p_id;
    END IF;
    COMMIT;
    DO RELEASE_LOCK('zimbra:campanas:codigo');
    SET v_codigo_lock = 0;
    SET @zimbra_actor = v_actor_anterior;
    SELECT v_id AS id_campana,(SELECT codigo_campana FROM campanas_marketing WHERE id_campana = v_id) AS codigo_campana;
END$$

-- PROCEDURE 24: HU-13 – Activar o desactivar una campaña
CREATE PROCEDURE sp_estado_campana(
    IN p_id INT,
    IN p_estado VARCHAR(20),
    IN p_fin DATE,
    IN p_actor VARCHAR(100)
)
BEGIN
    DECLARE v_id INT DEFAULT NULL;
    DECLARE v_codigo_lock INT DEFAULT 0;
    DECLARE v_actor_anterior TEXT DEFAULT @zimbra_actor;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        IF v_codigo_lock = 1 THEN DO RELEASE_LOCK('zimbra:campanas:codigo'); END IF;
        SET @zimbra_actor = v_actor_anterior;
        RESIGNAL;
    END;
    SET v_codigo_lock = GET_LOCK('zimbra:campanas:codigo', 10);
    IF v_codigo_lock IS NULL OR v_codigo_lock <> 1 THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30009, MESSAGE_TEXT = 'Otra campaña se está guardando. Intenta nuevamente.';
    END IF;
    START TRANSACTION;
    SET @zimbra_actor = COALESCE(NULLIF(p_actor, ''), 'zimbra-api');
    SELECT id_campana INTO v_id FROM campanas_marketing WHERE id_campana = p_id FOR UPDATE;
    IF v_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30004, MESSAGE_TEXT = 'La campaña indicada no existe.';
    END IF;
    UPDATE campanas_marketing SET estado = p_estado, fecha_fin = COALESCE(p_fin, fecha_fin) WHERE id_campana = p_id;
    COMMIT;
    DO RELEASE_LOCK('zimbra:campanas:codigo');
    SET v_codigo_lock = 0;
    SET @zimbra_actor = v_actor_anterior;
    SELECT p_id AS id_campana, p_estado AS estado;
END$$

-- PROCEDURE 25: HU-14 – Registrar o actualizar una acción de marketing
CREATE PROCEDURE sp_guardar_accion(
    IN p_id INT,
    IN p_nombre VARCHAR(100),
    IN p_puntaje DECIMAL(10, 2),
    IN p_actor VARCHAR(100)
)
BEGIN
    DECLARE v_id INT DEFAULT NULL;
    DECLARE v_actor_anterior TEXT DEFAULT @zimbra_actor;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET @zimbra_actor = v_actor_anterior;
        RESIGNAL;
    END;
    START TRANSACTION;
    SET @zimbra_actor = COALESCE(NULLIF(p_actor, ''), 'zimbra-api');
    IF p_nombre IS NULL OR TRIM(p_nombre) = '' OR p_puntaje IS NULL OR p_puntaje <> FLOOR(p_puntaje) OR p_puntaje
         NOT BETWEEN 0 AND 100 THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30001, MESSAGE_TEXT = 'Se requiere nombre y puntaje entero entre 0 y 100.';
    END IF;
    IF p_id IS NULL THEN
        INSERT INTO acciones_marketing(nombre_accion, puntaje, estado)
        VALUES(TRIM(p_nombre), p_puntaje, TRUE);
        SET v_id = LAST_INSERT_ID();
    ELSE
        SELECT id_accion INTO v_id FROM acciones_marketing WHERE id_accion = p_id FOR UPDATE;
        IF v_id IS NULL THEN
            SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30004, MESSAGE_TEXT = 'La acción indicada no existe.';
        END IF;
        UPDATE acciones_marketing SET nombre_accion = TRIM(p_nombre), puntaje = p_puntaje WHERE id_accion = p_id;
    END IF;
    COMMIT;
    SET @zimbra_actor = v_actor_anterior;
    SELECT v_id AS id_accion;
END$$

-- PROCEDURE 26: HU-14 – Activar o desactivar una acción de marketing
CREATE PROCEDURE sp_estado_accion(
    IN p_id INT,
    IN p_estado BOOLEAN,
    IN p_actor VARCHAR(100)
)
BEGIN
    DECLARE v_id INT DEFAULT NULL;
    DECLARE v_actor_anterior TEXT DEFAULT @zimbra_actor;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET @zimbra_actor = v_actor_anterior;
        RESIGNAL;
    END;
    START TRANSACTION;
    SET @zimbra_actor = COALESCE(NULLIF(p_actor, ''), 'zimbra-api');
    SELECT id_accion INTO v_id FROM acciones_marketing WHERE id_accion = p_id FOR UPDATE;
    IF v_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30004, MESSAGE_TEXT = 'La acción indicada no existe.';
    END IF;
    IF p_estado IS NULL OR p_estado NOT IN(0, 1) THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30001, MESSAGE_TEXT = 'estado debe ser booleano.';
    END IF;
    UPDATE acciones_marketing SET estado = p_estado WHERE id_accion = p_id;
    COMMIT;
    SET @zimbra_actor = v_actor_anterior;
    SELECT p_id AS id_accion, p_estado AS estado;
END$$

-- PROCEDURE 27: HU-15 – Guardar una actividad dentro de la operación solicitada
CREATE PROCEDURE sp_actividad_interno(
    IN p_cliente INT,
    IN p_accion INT,
    IN p_campana INT,
    IN p_origen VARCHAR(255),
    IN p_detalle VARCHAR(255),
    IN p_clave VARCHAR(100),
    OUT p_resultado JSON
)
BEGIN
    DECLARE v_id INT;
    DECLARE v_cliente INT DEFAULT NULL;
    DECLARE v_alerta BIGINT DEFAULT 0;
    
    INSERT INTO actividad_web(id_cliente, id_accion, id_campana, direccion_origen, detalle, clave_rastreo)
    VALUES(p_cliente, p_accion, p_campana, p_origen, p_detalle, p_clave);
    SET v_id = LAST_INSERT_ID();
    SELECT JSON_OBJECT('id_actividad', v_id, 'id_cliente', w.id_cliente, 'clave_rastreo', w.clave_rastreo, 'pendiente_identificacion', w.id_cliente IS
        NULL, 'es_retorno', w.es_retorno, 'puntos_agregados', IF(w.id_cliente IS NULL, 0, w.puntaje_otorgado), 'puntaje_total', c.puntaje_total,
        'estado_cliente', c.estado_cliente, 'alerta_calificacion', EXISTS(SELECT 1 FROM alertas a WHERE a.id_cliente = w.id_cliente AND a.tipo_alerta
        = 'Prospecto calificado' AND a.estado_alerta = 'Pendiente'), 'alerta_retorno', w.es_retorno) INTO p_resultado FROM actividad_web w LEFT JOIN
        clientes c ON c.id_cliente = w.id_cliente WHERE w.id_actividad = v_id;
END$$

-- PROCEDURE 28: HU-15 – Registrar una actividad web con sus puntos y alertas
CREATE PROCEDURE sp_registrar_actividad(
    IN p_cliente INT,
    IN p_accion INT,
    IN p_campana INT,
    IN p_origen VARCHAR(255),
    IN p_detalle VARCHAR(255),
    IN p_clave VARCHAR(100),
    IN p_actor VARCHAR(100)
)
BEGIN
    DECLARE v_resultado JSON;
    DECLARE v_actor_anterior TEXT DEFAULT @zimbra_actor;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET @zimbra_actor = v_actor_anterior;
        RESIGNAL;
    END;
    START TRANSACTION;
    SET @zimbra_actor = COALESCE(NULLIF(p_actor, ''), 'zimbra-api');
    CALL sp_actividad_interno (p_cliente, p_accion, p_campana, p_origen, p_detalle, p_clave, v_resultado);
    COMMIT;
    SET @zimbra_actor = v_actor_anterior;
    SELECT j. * FROM JSON_TABLE(v_resultado, '$' COLUMNS(id_actividad INT PATH '$.id_actividad', id_cliente INT PATH '$.id_cliente', clave_rastreo
        VARCHAR(100) PATH '$.clave_rastreo' NULL ON EMPTY, pendiente_identificacion INT PATH '$.pendiente_identificacion', es_retorno INT PATH
        '$.es_retorno', puntos_agregados INT PATH '$.puntos_agregados', puntaje_total INT PATH '$.puntaje_total', estado_cliente VARCHAR(50) PATH
        '$.estado_cliente', alerta_calificacion INT PATH '$.alerta_calificacion', alerta_retorno INT PATH '$.alerta_retorno')) j;
END$$

-- PROCEDURE 29: HU-15 – Registrar varias actividades y rechazar por separado los eventos inválidos
CREATE PROCEDURE sp_actividad_lote(
    IN p_eventos JSON,
    IN p_actor VARCHAR(100)
)
BEGIN
    DECLARE v_indice INT DEFAULT 0;
    DECLARE v_total INT;
    DECLARE v_resultado JSON;
    DECLARE v_evento JSON;
    DECLARE v_ok JSON DEFAULT(JSON_ARRAY());
    DECLARE v_bad JSON DEFAULT(JSON_ARRAY());
    DECLARE v_error INT;
    DECLARE v_mensaje TEXT;
    DECLARE v_cliente VARCHAR(32);
    DECLARE v_accion VARCHAR(32);
    DECLARE v_campana VARCHAR(32);
    DECLARE v_origen TEXT;
    DECLARE v_detalle TEXT;
    DECLARE v_clave VARCHAR(100);
    DECLARE v_actor_anterior TEXT DEFAULT @zimbra_actor;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET @zimbra_actor = v_actor_anterior;
        RESIGNAL;
    END;
    START TRANSACTION;
    SET @zimbra_actor = COALESCE(NULLIF(p_actor, ''), 'zimbra-api');
    IF p_eventos IS NULL OR JSON_TYPE(p_eventos) <> 'ARRAY' OR JSON_LENGTH(p_eventos) NOT BETWEEN 1 AND 50 THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30001, MESSAGE_TEXT = 'El lote debe contener entre 1 y 50 actividades.';
    END IF;
    SET v_total = JSON_LENGTH(p_eventos);
    WHILE v_indice < v_total DO
        
        SAVEPOINT sp_evento;
        SET v_error = 0;
        BEGIN
            DECLARE EXIT HANDLER FOR SQLEXCEPTION
            BEGIN
                GET DIAGNOSTICS CONDITION 1 v_error = MYSQL_ERRNO, v_mensaje = MESSAGE_TEXT;
                IF v_error IN(30001, 30003, 30004, 30009, 1062, 1452, 3819, 1406) THEN
                    ROLLBACK TO SAVEPOINT sp_evento;
                    SET v_bad = JSON_ARRAY_APPEND(v_bad, '$', JSON_OBJECT('indice', v_indice, 'mensaje', v_mensaje));
                ELSE
                    RESIGNAL;
                END IF;
            END;
            SET v_evento = JSON_EXTRACT(p_eventos, CONCAT('$[', v_indice, ']'));
            SET v_clave = NULLIF(JSON_UNQUOTE(JSON_EXTRACT(v_evento, '$.clave_rastreo')), 'null');
            SET v_cliente = JSON_UNQUOTE(JSON_EXTRACT(v_evento, '$.id_cliente'));
            SET v_accion = JSON_UNQUOTE(JSON_EXTRACT(v_evento, '$.id_accion'));
            SET v_campana = JSON_UNQUOTE(JSON_EXTRACT(v_evento, '$.id_campana'));
            IF v_cliente IN('null', '') THEN
                SET v_cliente = NULL;
            END IF;
            IF JSON_TYPE(v_evento) <> 'OBJECT' OR(v_cliente IS NULL AND(v_clave IS NULL OR TRIM(v_clave) = '')) OR v_accion
                 IS NULL OR(v_cliente IS NOT NULL AND v_cliente NOT REGEXP '^[1-9][0-9]*$') OR v_accion NOT REGEXP
                 '^[1-9][0-9]*$' OR CAST(v_cliente AS DECIMAL(30, 0)) > 2147483647 OR CAST(v_accion AS DECIMAL(30, 0)) >
                 2147483647 THEN
                SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30001, MESSAGE_TEXT = 'El cliente y la acción deben ser identificadores enteros positivos.';
            END IF;
            IF v_campana IN('null', '') THEN
                SET v_campana = NULL;
            END IF;
            IF v_campana IS NOT NULL AND(v_campana NOT REGEXP '^[1-9][0-9]*$' OR CAST(v_campana AS DECIMAL(30, 0)) >
                 2147483647) THEN
                SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30001, MESSAGE_TEXT = 'La campaña debe ser un identificador entero positivo.';
            END IF;
            SET v_origen = JSON_UNQUOTE(JSON_EXTRACT(v_evento, '$.direccion_origen'));
            SET v_detalle = JSON_UNQUOTE(JSON_EXTRACT(v_evento, '$.detalle'));
            IF v_origen = 'null' THEN
                SET v_origen = NULL;
            END IF;
            IF v_detalle = 'null' THEN
                SET v_detalle = NULL;
            END IF;
            IF CHAR_LENGTH(v_origen) > 255 OR CHAR_LENGTH(v_detalle) > 255 THEN
                SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30001, MESSAGE_TEXT = 'El origen y detalle admiten hasta 255 caracteres.';
            END IF;
            CALL sp_actividad_interno(CAST(v_cliente AS UNSIGNED), CAST(v_accion AS UNSIGNED), CAST(v_campana AS UNSIGNED), v_origen, v_detalle,
                v_clave, v_resultado);
            SET v_ok = JSON_ARRAY_APPEND(v_ok, '$', JSON_SET(v_resultado, '$.indice', v_indice));
        END;
        RELEASE SAVEPOINT sp_evento;
        SET v_indice = v_indice + 1;
    END WHILE;
    COMMIT;
    SET @zimbra_actor = v_actor_anterior;
    SELECT v_total AS total, v_ok AS aceptadas, v_bad AS rechazadas;
END$$

-- PROCEDURE 30: HU-09 – Registrar una descarga de prueba de 60 días
CREATE PROCEDURE sp_registrar_prueba(
    IN p_cliente INT,
    IN p_producto INT,
    IN p_actor VARCHAR(100)
)
BEGIN
    DECLARE v_cliente INT DEFAULT NULL;
    DECLARE v_id INT;
    DECLARE v_actividad INT;
    DECLARE v_alerta BIGINT DEFAULT 0;
    DECLARE v_actor_anterior TEXT DEFAULT @zimbra_actor;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET @zimbra_actor = v_actor_anterior;
        RESIGNAL;
    END;
    START TRANSACTION;
    SET @zimbra_actor = COALESCE(NULLIF(p_actor, ''), 'zimbra-api');
    SELECT id_cliente INTO v_cliente FROM clientes WHERE id_cliente = p_cliente FOR UPDATE;
    IF v_cliente IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30004, MESSAGE_TEXT = 'El cliente indicado no existe.';
    END IF;
    UPDATE descargas_prueba SET estado_prueba = 'Vencida' WHERE id_cliente = p_cliente AND id_producto = p_producto AND estado_prueba = 'Activa' AND
        fecha_fin < CURRENT_DATE;
    SELECT COALESCE(MAX(id_alerta), 0) INTO v_alerta FROM alertas WHERE id_cliente = p_cliente;
    INSERT INTO descargas_prueba(id_cliente, id_producto, fecha_fin)
    VALUES(p_cliente, p_producto, DATE_ADD(CURRENT_DATE, INTERVAL 60 DAY));
    SET v_id = LAST_INSERT_ID();
    SELECT MAX(id_actividad) INTO v_actividad FROM actividad_web WHERE id_cliente = p_cliente;
    COMMIT;
    SET @zimbra_actor = v_actor_anterior;
    SELECT d.id_descarga, d.id_cliente, c.nombre_completo AS nombre_cliente, DATE_FORMAT(d.fecha_fin, '%Y-%m-%d') AS fecha_fin, w.id_actividad,
        w.puntaje_otorgado AS puntos_agregados, c.puntaje_total, c.estado_cliente, EXISTS(SELECT 1 FROM alertas WHERE id_cliente = p_cliente AND
        id_alerta > v_alerta AND tipo_alerta = 'Prospecto calificado') AS alerta_calificacion, 'Prueba registrada por 60 días.' AS message FROM
        descargas_prueba d JOIN clientes c ON c.id_cliente = d.id_cliente JOIN actividad_web w ON w.id_actividad = v_actividad WHERE d.id_descarga =
        v_id;
END$$

-- PROCEDURE 31: HU-11 – Actualizar pruebas vencidas y generar alertas de próximas a vencer
CREATE PROCEDURE sp_vencer_pruebas(
    IN p_actor VARCHAR(100)
)
BEGIN
    DECLARE v_done BOOLEAN DEFAULT FALSE;
    DECLARE v_cliente INT;
    DECLARE v_lock INT;
    DECLARE v_nombre VARCHAR(150);
    DECLARE v_productos TEXT;
    DECLARE v_fecha DATE;
    DECLARE v_descarga INT;
    DECLARE v_numero INT;
    DECLARE v_creada INT;
    DECLARE v_vencidas INT DEFAULT 0;
    DECLARE v_alertas INT DEFAULT 0;
    DECLARE v_avisos JSON DEFAULT(JSON_ARRAY());
    DECLARE v_cliente_avisos JSON;
    DECLARE v_actor TEXT DEFAULT @zimbra_actor;
    DECLARE cur CURSOR FOR SELECT DISTINCT id_cliente FROM descargas_prueba WHERE estado_prueba = 'Activa' AND
         fecha_fin <= DATE_ADD(CURRENT_DATE, INTERVAL 7 DAY) ORDER BY id_cliente;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET @zimbra_actor = v_actor;
        RESIGNAL;
    END;
    START TRANSACTION;
    SET @zimbra_actor = COALESCE(p_actor, 'sistema');
    OPEN cur;
    recorrer : LOOP
        BEGIN
            DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;
            FETCH cur INTO v_cliente;
        END;
        IF v_done THEN
            LEAVE recorrer;
        END IF;
        SELECT id_cliente, nombre_completo INTO v_lock, v_nombre FROM clientes WHERE id_cliente = v_cliente FOR UPDATE;
        UPDATE descargas_prueba SET estado_prueba = 'Vencida' WHERE id_cliente = v_cliente AND estado_prueba = 'Activa' AND fecha_fin < CURRENT_DATE;
        SET v_vencidas = v_vencidas + ROW_COUNT();
        SELECT COUNT(*), MIN(d.fecha_fin), GROUP_CONCAT(DISTINCT p.nombre_producto ORDER BY p.nombre_producto SEPARATOR ', '), JSON_ARRAYAGG(
            JSON_OBJECT('id_cliente', v_cliente, 'id_descarga', d.id_descarga, 'nombre', v_nombre, 'fecha_fin', DATE_FORMAT(d.fecha_fin, '%Y-%m-%d')))
            INTO v_numero, v_fecha, v_productos, v_cliente_avisos FROM descargas_prueba d JOIN productos p ON p.id_producto = d.id_producto WHERE
            d.id_cliente = v_cliente AND d.estado_prueba = 'Activa' AND d.fecha_fin BETWEEN CURRENT_DATE AND DATE_ADD(CURRENT_DATE, INTERVAL 7 DAY);
        IF v_numero > 0 THEN
            SELECT id_descarga INTO v_descarga FROM descargas_prueba WHERE id_cliente = v_cliente AND estado_prueba = 'Activa' AND fecha_fin BETWEEN
                CURRENT_DATE AND DATE_ADD(CURRENT_DATE, INTERVAL 7 DAY) ORDER BY fecha_fin, id_descarga LIMIT 1 FOR UPDATE;
            CALL sp_alerta_interno(v_cliente, v_descarga, 'Prueba por vencer', LEFT(CONCAT(v_nombre, ': ', v_productos, '; ', v_numero,
                ' prueba(s). Próximo vencimiento en ', DATEDIFF(v_fecha, CURRENT_DATE), ' días (', v_fecha, ').'), 255), v_creada);
            SET v_alertas = v_alertas + v_creada;
            SET v_avisos = JSON_MERGE_PRESERVE(v_avisos, v_cliente_avisos);
        END IF;
    END LOOP;
    CLOSE cur;
    COMMIT;
    SET @zimbra_actor = v_actor;
    SELECT v_vencidas AS vencidas, v_alertas AS alertas_generadas;
    SELECT j. * FROM JSON_TABLE(v_avisos, '$[*]' COLUMNS(id_cliente INT PATH '$.id_cliente', id_descarga INT PATH '$.id_descarga', nombre VARCHAR(150)
        PATH '$.nombre', fecha_fin VARCHAR(10) PATH '$.fecha_fin')) j;
END$$

-- PROCEDURE 32: HU-16 – Recalcular los puntos y la calificación de los clientes
CREATE PROCEDURE sp_recalificar(
    IN p_actor VARCHAR(100)
)
BEGIN
    DECLARE v_fin_cursor BOOLEAN DEFAULT FALSE;
    DECLARE v_cliente INT;
    DECLARE v_anterior VARCHAR(50);
    DECLARE v_nuevo VARCHAR(50);
    DECLARE v_nombre VARCHAR(150);
    DECLARE v_puntos_antes BIGINT;
    DECLARE v_puntos BIGINT;
    DECLARE v_creada INT;
    DECLARE v_revisados INT DEFAULT 0;
    DECLARE v_actualizados INT DEFAULT 0;
    DECLARE v_calificados JSON DEFAULT(JSON_ARRAY());
    DECLARE v_actor_anterior TEXT DEFAULT @zimbra_actor;
    DECLARE cur CURSOR FOR SELECT id_cliente FROM clientes WHERE estado_cliente NOT IN ('Inactivo', 'Convertido') ORDER BY id_cliente;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET @zimbra_actor = v_actor_anterior;
        RESIGNAL;
    END;
    START TRANSACTION;
    SET @zimbra_actor = COALESCE(NULLIF(p_actor, ''), 'zimbra-api');
    OPEN cur;
    recorrer : LOOP
        BEGIN
            DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_fin_cursor = TRUE;
            FETCH cur INTO v_cliente;
        END;
        IF v_fin_cursor THEN
            LEAVE recorrer;
        END IF;
        SELECT estado_cliente, nombre_completo, COALESCE(puntaje_total, 0) INTO v_anterior, v_nombre, v_puntos_antes FROM clientes WHERE id_cliente =
            v_cliente FOR UPDATE;
        
        SELECT COALESCE(SUM(puntaje_otorgado), 0) INTO v_puntos FROM actividad_web WHERE id_cliente = v_cliente FOR SHARE;
        SET v_nuevo = fn_calificacion(v_puntos, v_anterior), v_revisados = v_revisados + 1;
        IF v_puntos <> v_puntos_antes OR v_nuevo <> v_anterior THEN
            UPDATE clientes SET puntaje_total = v_puntos, estado_cliente = v_nuevo WHERE id_cliente = v_cliente;
            SET v_actualizados = v_actualizados + 1;
        END IF;
        IF v_anterior <> 'Calificado' AND v_nuevo = 'Calificado' THEN
            CALL sp_alerta_interno(v_cliente, NULL, 'Prospecto calificado', CONCAT(v_nombre, ': calificado con ', v_puntos, ' puntos.'), v_creada);
            SET v_calificados = JSON_ARRAY_APPEND(v_calificados, '$', v_cliente);
        END IF;
    END LOOP;
    CLOSE cur;
    COMMIT;
    SET @zimbra_actor = v_actor_anterior;
    SELECT v_revisados AS clientes_revisados, v_actualizados AS clientes_actualizados;
    SELECT id_cliente FROM JSON_TABLE(v_calificados, '$[*]' COLUMNS(id_cliente INT PATH '$')) j;
END$$

-- PROCEDURE 33: HU-17 – Registrar la atención de una alerta
CREATE PROCEDURE sp_atender_alerta(
    IN p_id BIGINT,
    IN p_nota VARCHAR(500),
    IN p_usuario INT,
    IN p_vendedor INT,
    IN p_actor VARCHAR(100)
)
BEGIN
    DECLARE v_id BIGINT DEFAULT NULL;
    DECLARE v_vendedor INT;
    DECLARE v_estado VARCHAR(20);
    DECLARE v_rol VARCHAR(20) DEFAULT NULL;
    DECLARE v_usuario_vendedor INT;
    DECLARE v_actor_anterior TEXT DEFAULT @zimbra_actor;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET @zimbra_actor = v_actor_anterior;
        RESIGNAL;
    END;
    START TRANSACTION;
    SET @zimbra_actor = COALESCE(NULLIF(p_actor, ''), 'zimbra-api');
    SELECT id_alerta, id_vendedor, estado_alerta INTO v_id, v_vendedor, v_estado FROM alertas WHERE id_alerta = p_id FOR UPDATE;
    IF v_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30004, MESSAGE_TEXT = 'La alerta no existe.';
    END IF;
    SELECT rol, id_vendedor INTO v_rol, v_usuario_vendedor FROM usuarios WHERE id_usuario = p_usuario AND estado = TRUE FOR SHARE;
    IF v_rol IS NULL OR(v_rol <> 'Administrador' AND(v_vendedor IS NULL OR v_usuario_vendedor IS NULL OR v_vendedor
         <> v_usuario_vendedor)) OR(p_vendedor IS NOT NULL AND(v_vendedor IS NULL OR p_vendedor <> v_vendedor))
         THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30003, MESSAGE_TEXT = 'La alerta no pertenece al vendedor autorizado.';
    END IF;
    IF v_estado = 'Pendiente' THEN
        UPDATE alertas SET estado_alerta = 'Atendida', id_usuario_atendio = p_usuario, nota_atencion = p_nota WHERE id_alerta = p_id;
    END IF;
    COMMIT;
    SET @zimbra_actor = v_actor_anterior;
    SELECT p_id AS id_alerta, 'Atendida' AS estado_alerta, 'Alerta atendida.' AS message;
END$$

-- PROCEDURE 34: HU-08 – Consultar productos con filtros
CREATE PROCEDURE sp_listar_productos(
    IN p_tipo VARCHAR(50),
    IN p_estado BOOLEAN,
    IN p_q VARCHAR(100),
    IN p_limite INT,
    IN p_offset INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    SET TRANSACTION READ ONLY;
    START TRANSACTION WITH CONSISTENT SNAPSHOT;
    SELECT p. * FROM productos p WHERE(p_tipo IS NULL OR p.tipo_licencia = p_tipo) AND(p_estado IS NULL OR p.estado = p_estado) AND(p_q IS NULL OR
        p.nombre_producto LIKE CONCAT('%', p_q, '%')) ORDER BY p.nombre_producto, p.id_producto LIMIT p_limite OFFSET p_offset;
    SELECT COUNT(*) AS total FROM productos p WHERE(p_tipo IS NULL OR p.tipo_licencia = p_tipo) AND(p_estado IS NULL OR p.estado = p_estado) AND(p_q
        IS NULL OR p.nombre_producto LIKE CONCAT('%', p_q, '%'));
    COMMIT;
END$$

-- PROCEDURE 35: HU-13 – Consultar campañas y sus resultados
CREATE PROCEDURE sp_listar_campanas(
    IN p_id INT,
    IN p_estado VARCHAR(20),
    IN p_desde DATE,
    IN p_hasta DATE,
    IN p_limite INT,
    IN p_offset INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    SET TRANSACTION READ ONLY;
    START TRANSACTION WITH CONSISTENT SNAPSHOT;
    SELECT c. *,(SELECT COUNT(*) FROM actividad_web aw WHERE aw.id_campana = c.id_campana AND(p_desde IS NULL OR aw.fecha_actividad >= p_desde) AND(
        p_hasta IS NULL OR aw.fecha_actividad < DATE_ADD(p_hasta, INTERVAL 1 DAY))) AS visitas,(SELECT COUNT(DISTINCT aw.id_cliente) FROM
        actividad_web aw WHERE aw.id_campana = c.id_campana AND(p_desde IS NULL OR aw.fecha_actividad >= p_desde) AND(p_hasta IS NULL OR
        aw.fecha_actividad < DATE_ADD(p_hasta, INTERVAL 1 DAY))) AS visitantes,(SELECT COUNT(DISTINCT aw.id_cliente) FROM actividad_web aw JOIN
        clientes cl ON cl.id_cliente = aw.id_cliente WHERE aw.id_campana = c.id_campana AND(p_desde IS NULL OR aw.fecha_actividad >= p_desde) AND(
        p_hasta IS NULL OR aw.fecha_actividad < DATE_ADD(p_hasta, INTERVAL 1 DAY)) AND cl.estado_cliente = 'Calificado') AS prospectos_calificados
        FROM campanas_marketing c WHERE(p_id IS NULL OR c.id_campana = p_id) AND(p_estado IS NULL OR c.estado = p_estado) AND(p_desde IS NULL OR
        c.fecha_fin >= p_desde) AND(p_hasta IS NULL OR c.fecha_inicio <= p_hasta) ORDER BY c.fecha_inicio DESC, c.nombre_campana LIMIT p_limite OFFSET
        p_offset;
    SELECT COUNT(*) AS total FROM campanas_marketing c WHERE(p_id IS NULL OR c.id_campana = p_id) AND(p_estado IS NULL OR c.estado = p_estado) AND(
        p_desde IS NULL OR c.fecha_fin >= p_desde) AND(p_hasta IS NULL OR c.fecha_inicio <= p_hasta);
    COMMIT;
END$$

-- PROCEDURE 36: HU-14 – Consultar acciones de marketing, puntajes y cantidad de usos
CREATE PROCEDURE sp_listar_acciones(
    IN p_q VARCHAR(100),
    IN p_estado BOOLEAN,
    IN p_limite INT,
    IN p_offset INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    SET TRANSACTION READ ONLY;
    START TRANSACTION WITH CONSISTENT SNAPSHOT;
    SELECT a. *,(SELECT COUNT(*) FROM actividad_web w WHERE w.id_accion = a.id_accion) AS veces_registrada FROM acciones_marketing a WHERE(p_q IS NULL
        OR a.nombre_accion LIKE CONCAT('%', p_q, '%')) AND(p_estado IS NULL OR a.estado = p_estado) ORDER BY a.nombre_accion, a.id_accion LIMIT
        p_limite OFFSET p_offset;
    SELECT COUNT(*) AS total FROM acciones_marketing a WHERE(p_q IS NULL OR a.nombre_accion LIKE CONCAT('%', p_q, '%')) AND(p_estado IS NULL OR
        a.estado = p_estado);
    COMMIT;
END$$

-- PROCEDURE 37: HU-10 – Consultar pruebas y fechas de vencimiento
CREATE PROCEDURE sp_listar_pruebas(
    IN p_estado VARCHAR(30),
    IN p_cliente INT,
    IN p_producto INT,
    IN p_desde DATE,
    IN p_hasta DATE,
    IN p_vendedor INT,
    IN p_limite INT,
    IN p_offset INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    SET TRANSACTION READ ONLY;
    START TRANSACTION WITH CONSISTENT SNAPSHOT;
    SELECT d. *, c.nombre_completo, p.nombre_producto, v.numero_contrato, GREATEST(DATEDIFF(d.fecha_fin, CURRENT_DATE), 0) AS dias_restantes,(
        d.estado_prueba = 'Activa' AND d.fecha_fin BETWEEN CURRENT_DATE AND DATE_ADD(CURRENT_DATE, INTERVAL 7 DAY)) AS urgente,(d.estado_prueba =
        'Activa' AND d.fecha_fin BETWEEN CURRENT_DATE AND DATE_ADD(CURRENT_DATE, INTERVAL 7 DAY)) AS proxima_a_vencer FROM descargas_prueba d JOIN
        clientes c ON c.id_cliente = d.id_cliente JOIN productos p ON p.id_producto = d.id_producto LEFT JOIN ventas v ON v.id_venta = d.id_venta
        WHERE(p_estado IS NULL OR d.estado_prueba = p_estado) AND(p_estado IS NULL OR p_estado <> 'Activa' OR d.fecha_fin >= CURRENT_DATE) AND(
        p_cliente IS NULL OR d.id_cliente = p_cliente) AND(p_producto IS NULL OR d.id_producto = p_producto) AND(p_desde IS NULL OR d.fecha_fin >=
        p_desde) AND(p_hasta IS NULL OR d.fecha_fin <= p_hasta) AND(p_vendedor IS NULL OR EXISTS(SELECT 1 FROM asignaciones_crm a WHERE a.id_cliente =
        d.id_cliente AND a.id_vendedor = p_vendedor AND a.estado = 'Activa')) ORDER BY(d.estado_prueba = 'Activa') DESC, d.fecha_fin, d.id_descarga
        LIMIT p_limite OFFSET p_offset;
    SELECT COUNT(*) AS total FROM descargas_prueba d JOIN clientes c ON c.id_cliente = d.id_cliente JOIN productos p ON p.id_producto = d.id_producto
        LEFT JOIN ventas v ON v.id_venta = d.id_venta WHERE(p_estado IS NULL OR d.estado_prueba = p_estado) AND(p_estado IS NULL OR p_estado <>
        'Activa' OR d.fecha_fin >= CURRENT_DATE) AND(p_cliente IS NULL OR d.id_cliente = p_cliente) AND(p_producto IS NULL OR d.id_producto =
        p_producto) AND(p_desde IS NULL OR d.fecha_fin >= p_desde) AND(p_hasta IS NULL OR d.fecha_fin <= p_hasta) AND(p_vendedor IS NULL OR EXISTS(
        SELECT 1 FROM asignaciones_crm a WHERE a.id_cliente = d.id_cliente AND a.id_vendedor = p_vendedor AND a.estado = 'Activa'));
    COMMIT;
END$$

-- PROCEDURE 38: HU-15 – Consultar el historial de actividad web del cliente
CREATE PROCEDURE sp_listar_actividad(
    IN p_cliente INT,
    IN p_vendedor INT,
    IN p_limite INT,
    IN p_offset INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    SET TRANSACTION READ ONLY;
    START TRANSACTION WITH CONSISTENT SNAPSHOT;
    SELECT w. *, a.nombre_accion, c.nombre_campana FROM actividad_web w JOIN acciones_marketing a ON a.id_accion = w.id_accion LEFT JOIN
        campanas_marketing c ON c.id_campana = w.id_campana WHERE w.id_cliente = p_cliente AND(p_vendedor IS NULL OR EXISTS(SELECT 1 FROM
        asignaciones_crm ac WHERE ac.id_cliente = w.id_cliente AND ac.id_vendedor = p_vendedor AND ac.estado = 'Activa')) ORDER BY w.fecha_actividad
        DESC, w.id_actividad DESC LIMIT p_limite OFFSET p_offset;
    SELECT COUNT(*) AS total FROM actividad_web w JOIN acciones_marketing a ON a.id_accion = w.id_accion LEFT JOIN campanas_marketing c ON
        c.id_campana = w.id_campana WHERE w.id_cliente = p_cliente AND(p_vendedor IS NULL OR EXISTS(SELECT 1 FROM asignaciones_crm ac WHERE
        ac.id_cliente = w.id_cliente AND ac.id_vendedor = p_vendedor AND ac.estado = 'Activa'));
    COMMIT;
END$$

-- PROCEDURE 39: HU-17 – Consultar alertas según los permisos y filtros
CREATE PROCEDURE sp_listar_alertas(
    IN p_vendedor INT,
    IN p_estado VARCHAR(20),
    IN p_tipo VARCHAR(40),
    IN p_limite INT,
    IN p_offset INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    SET TRANSACTION READ ONLY;
    START TRANSACTION WITH CONSISTENT SNAPSHOT;
    SELECT a. *, c.nombre_completo, d.fecha_fin, DATEDIFF(d.fecha_fin, CURRENT_DATE) AS dias_restantes FROM alertas a JOIN clientes c ON c.id_cliente
        = a.id_cliente LEFT JOIN descargas_prueba d ON d.id_descarga = a.id_descarga WHERE(p_vendedor IS NULL OR a.id_vendedor = p_vendedor) AND(
        p_estado IS NULL OR a.estado_alerta = p_estado) AND(p_tipo IS NULL OR a.tipo_alerta = p_tipo) ORDER BY a.fecha_creacion DESC, a.id_alerta DESC
        LIMIT p_limite OFFSET p_offset;
    SELECT COUNT(*) AS total FROM alertas a JOIN clientes c ON c.id_cliente = a.id_cliente LEFT JOIN descargas_prueba d ON d.id_descarga =
        a.id_descarga WHERE(p_vendedor IS NULL OR a.id_vendedor = p_vendedor) AND(p_estado IS NULL OR a.estado_alerta = p_estado) AND(p_tipo IS NULL
        OR a.tipo_alerta = p_tipo);
    COMMIT;
END$$

-- PROCEDURE 40: HU-31 – Consultar los indicadores del panel comercial
CREATE PROCEDURE sp_dashboard(
    IN p_vendedor INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    SET TRANSACTION READ ONLY;
    START TRANSACTION WITH CONSISTENT SNAPSHOT;
    SELECT * FROM vw_calificados WHERE p_vendedor IS NULL OR id_vendedor = p_vendedor ORDER BY puntaje_total DESC, id_cliente;
    SELECT * FROM vw_pruebas_por_vencer WHERE p_vendedor IS NULL OR id_vendedor = p_vendedor ORDER BY fecha_fin, id_descarga;
    SELECT COUNT(*) AS cantidad, COALESCE(SUM(total_venta), 0) AS total_proyectado FROM ventas WHERE estado_venta = 'Pendiente' AND(p_vendedor IS NULL
        OR id_vendedor = p_vendedor);
    SELECT COUNT(DISTINCT a.id_cliente) AS clientes_asignados FROM asignaciones_crm a JOIN clientes c ON c.id_cliente = a.id_cliente WHERE a.estado =
        'Activa' AND c.estado_cliente <> 'Inactivo' AND(p_vendedor IS NULL OR a.id_vendedor = p_vendedor);
    SELECT a. *, c.nombre_completo, d.fecha_fin, DATEDIFF(d.fecha_fin, CURRENT_DATE) AS dias_restantes FROM alertas a JOIN clientes c ON c.id_cliente
        = a.id_cliente LEFT JOIN descargas_prueba d ON d.id_descarga = a.id_descarga WHERE a.estado_alerta = 'Pendiente' AND(p_vendedor IS NULL OR
        a.id_vendedor = p_vendedor) ORDER BY a.fecha_creacion DESC, a.id_alerta DESC;
    COMMIT;
END$$

-- PROCEDURE 41: HU-09 / HU-11 – Preparar un aviso de prueba y evitar envíos repetidos
CREATE PROCEDURE sp_reservar_correo_prueba(
    IN p_cliente INT,
    IN p_descarga INT,
    IN p_evento VARCHAR(80),
    IN p_asunto VARCHAR(200),
    IN p_cuerpo TEXT
)
BEGIN
    DECLARE v_cliente INT DEFAULT NULL;
    DECLARE v_descarga INT DEFAULT NULL;
    DECLARE v_plantilla INT DEFAULT NULL;
    DECLARE v_correo BIGINT DEFAULT NULL;
    DECLARE v_estado VARCHAR(20);
    DECLARE v_destino VARCHAR(150);
    DECLARE v_clave VARCHAR(160);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
    IF p_evento IS NULL OR p_evento NOT IN('prueba_iniciada', 'prueba_por_vencer') THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30001, MESSAGE_TEXT = 'El evento no corresponde a un aviso de prueba.';
    END IF;
    SELECT id_cliente, correo_electronico INTO v_cliente, v_destino FROM clientes WHERE id_cliente = p_cliente FOR UPDATE;
    IF v_cliente IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30004, MESSAGE_TEXT = 'El cliente no existe.';
    END IF;
    SELECT id_descarga INTO v_descarga FROM descargas_prueba WHERE id_descarga = p_descarga AND id_cliente = p_cliente FOR SHARE;
    IF v_descarga IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30001, MESSAGE_TEXT = 'La descarga no pertenece al cliente.';
    END IF;
    SET v_clave = CONCAT(p_evento, '_', p_cliente, '_descarga_', p_descarga);
    SELECT id_correo, estado_correo INTO v_correo, v_estado FROM correos_enviados WHERE clave_idempotencia = v_clave FOR UPDATE;
    IF v_estado = 'Pendiente' THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30009, MESSAGE_TEXT = 'El correo de esta descarga ya está en proceso.';
    END IF;
    IF v_correo IS NULL THEN
        SELECT id_plantilla INTO v_plantilla FROM plantillas_correo WHERE evento = p_evento AND estado = TRUE LIMIT 1 FOR SHARE;
        IF v_plantilla IS NULL THEN
            SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30004, MESSAGE_TEXT = 'No existe plantilla activa para el evento.';
        END IF;
        INSERT INTO correos_enviados(id_cliente, id_plantilla, clave_idempotencia, evento, correo_destino, asunto_enviado, cuerpo_enviado,
            estado_correo)
        VALUES(p_cliente, v_plantilla, v_clave, p_evento, v_destino, p_asunto, p_cuerpo, 'Pendiente');
        SET v_correo = LAST_INSERT_ID(), v_estado = 'Pendiente';
    END IF;
    COMMIT;
    SELECT v_correo AS id_correo, v_estado AS estado_correo,(v_estado = 'Enviado') AS duplicado;
END$$

-- PROCEDURE 42: HU-09 / HU-11 – Guardar el resultado del envío del correo de prueba
CREATE PROCEDURE sp_resultado_correo_prueba(
    IN p_correo BIGINT,
    IN p_exito BOOLEAN,
    IN p_error TEXT
)
BEGIN
    DECLARE v_id BIGINT DEFAULT NULL;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    START TRANSACTION;
    SELECT id_correo INTO v_id FROM correos_enviados WHERE id_correo = p_correo AND clave_idempotencia LIKE '%_descarga_%' AND estado_correo =
        'Pendiente' FOR UPDATE;
    IF v_id IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30009, MESSAGE_TEXT = 'La reserva de correo no está pendiente.';
    END IF;
    UPDATE correos_enviados SET estado_correo = IF(p_exito, 'Enviado', 'Fallido'), fecha_envio = IF(p_exito, NOW(), NULL), ultimo_error = IF(p_exito,
        NULL, LEFT(p_error, 4000)) WHERE id_correo = p_correo;
    COMMIT;
    SELECT v_id AS id_correo;
END$$

DELIMITER ;

-- =====================================================================
-- 6. Triggers
-- =====================================================================

DELIMITER $$

-- ---------------------------------------------------------------------
-- TRIGGER 1: HU-05 / HU-23 / HU-32 – Historial de cambios del cliente
-- Registra cambios de datos, puntos y estado; deja pendiente la sincronización cuando corresponde.
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_clientes_bu_auditoria
BEFORE UPDATE ON clientes
FOR EACH ROW
BEGIN
    IF NOT (OLD.estado_cliente <=> NEW.estado_cliente)
       AND NEW.estado_cliente IN ('Calificado','Cliente','Convertido') THEN
        SET NEW.estado_salesforce = 'Pendiente';
    END IF;
    IF NOT (OLD.estado_cliente <=> NEW.estado_cliente) THEN
        INSERT INTO auditoria_cambios
            (tabla,id_registro,campo,valor_anterior,valor_nuevo,usuario_bd,fecha_cambio)
        VALUES ('clientes',OLD.id_cliente,'estado_cliente',OLD.estado_cliente,NEW.estado_cliente,COALESCE(@zimbra_actor,CURRENT_USER()),NOW());
    END IF;
    IF NOT (OLD.puntaje_total <=> NEW.puntaje_total) THEN
        INSERT INTO auditoria_cambios
            (tabla,id_registro,campo,valor_anterior,valor_nuevo,usuario_bd,fecha_cambio)
        VALUES ('clientes',OLD.id_cliente,'puntaje_total',OLD.puntaje_total,NEW.puntaje_total,COALESCE(@zimbra_actor,CURRENT_USER()),NOW());
    END IF;
    IF NOT (OLD.nombre_completo <=> NEW.nombre_completo) THEN
        INSERT INTO auditoria_cambios
            (tabla,id_registro,campo,valor_anterior,valor_nuevo,usuario_bd,fecha_cambio)
        VALUES ('clientes',OLD.id_cliente,'nombre_completo',OLD.nombre_completo,NEW.nombre_completo,COALESCE(@zimbra_actor,CURRENT_USER()),NOW());
    END IF;
    IF NOT (OLD.correo_electronico <=> NEW.correo_electronico) THEN
        INSERT INTO auditoria_cambios
            (tabla,id_registro,campo,valor_anterior,valor_nuevo,usuario_bd,fecha_cambio)
        VALUES ('clientes',OLD.id_cliente,'correo_electronico',OLD.correo_electronico,NEW.correo_electronico,COALESCE(@zimbra_actor,CURRENT_USER()),NOW());
    END IF;
    IF NOT (OLD.telefono <=> NEW.telefono) THEN
        INSERT INTO auditoria_cambios
            (tabla,id_registro,campo,valor_anterior,valor_nuevo,usuario_bd,fecha_cambio)
        VALUES ('clientes',OLD.id_cliente,'telefono',OLD.telefono,NEW.telefono,COALESCE(@zimbra_actor,CURRENT_USER()),NOW());
    END IF;
    IF NOT (OLD.id_empresa <=> NEW.id_empresa) THEN
        INSERT INTO auditoria_cambios
            (tabla,id_registro,campo,valor_anterior,valor_nuevo,usuario_bd,fecha_cambio)
        VALUES ('clientes',OLD.id_cliente,'id_empresa',OLD.id_empresa,NEW.id_empresa,COALESCE(@zimbra_actor,CURRENT_USER()),NOW());
    END IF;
    IF NOT (OLD.estado_salesforce <=> NEW.estado_salesforce) THEN
        INSERT INTO auditoria_cambios
            (tabla,id_registro,campo,valor_anterior,valor_nuevo,usuario_bd,fecha_cambio)
        VALUES ('clientes',OLD.id_cliente,'estado_salesforce',OLD.estado_salesforce,NEW.estado_salesforce,COALESCE(@zimbra_actor,CURRENT_USER()),NOW());
    END IF;
END$$

-- ---------------------------------------------------------------------
-- TRIGGER 2: HU-27 / HU-28 / HU-32 – Historial de cambios de ventas
-- Registra cambios de estado, total y método de pago.
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_ventas_au_auditoria
AFTER UPDATE ON ventas
FOR EACH ROW
BEGIN
    IF NOT (OLD.estado_venta <=> NEW.estado_venta) THEN
        INSERT INTO auditoria_cambios VALUES (NULL,'ventas',NEW.id_venta,'estado_venta',OLD.estado_venta,NEW.estado_venta,COALESCE(@zimbra_actor,CURRENT_USER()),NOW());
    END IF;
    IF NOT (OLD.total_venta <=> NEW.total_venta) THEN
        INSERT INTO auditoria_cambios VALUES (NULL,'ventas',NEW.id_venta,'total_venta',OLD.total_venta,NEW.total_venta,COALESCE(@zimbra_actor,CURRENT_USER()),NOW());
    END IF;
    IF NOT (OLD.metodo_pago <=> NEW.metodo_pago) THEN
        INSERT INTO auditoria_cambios VALUES (NULL,'ventas',NEW.id_venta,'metodo_pago',OLD.metodo_pago,NEW.metodo_pago,COALESCE(@zimbra_actor,CURRENT_USER()),NOW());
    END IF;
END$$

-- ---------------------------------------------------------------------
-- TRIGGER 3: HU-22 / HU-32 – Historial de cambios de asignaciones
-- Registra cambios de vendedor, estado y finalización de la asignación.
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_asignaciones_au_auditoria
AFTER UPDATE ON asignaciones_crm
FOR EACH ROW
BEGIN
    IF NOT (OLD.estado <=> NEW.estado) THEN
        INSERT INTO auditoria_cambios VALUES (NULL,'asignaciones_crm',NEW.id_asignacion,'estado',OLD.estado,NEW.estado,COALESCE(@zimbra_actor,CURRENT_USER()),NOW());
    END IF;
    IF NOT (OLD.id_vendedor <=> NEW.id_vendedor) THEN
        INSERT INTO auditoria_cambios VALUES (NULL,'asignaciones_crm',NEW.id_asignacion,'id_vendedor',OLD.id_vendedor,NEW.id_vendedor,COALESCE(@zimbra_actor,CURRENT_USER()),NOW());
    END IF;
    IF NOT (OLD.fecha_fin <=> NEW.fecha_fin) THEN
        INSERT INTO auditoria_cambios VALUES (NULL,'asignaciones_crm',NEW.id_asignacion,'fecha_fin',OLD.fecha_fin,NEW.fecha_fin,COALESCE(@zimbra_actor,CURRENT_USER()),NOW());
    END IF;
END$$

-- ---------------------------------------------------------------------
-- TRIGGER 4: HU-25 / HU-32 – Historial de cambios de interacciones
-- Registra las correcciones realizadas a los seguimientos comerciales.
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_interacciones_au_auditoria
AFTER UPDATE ON interacciones
FOR EACH ROW
BEGIN
    IF NOT (OLD.resultado <=> NEW.resultado) THEN
        INSERT INTO auditoria_cambios VALUES (NULL,'interacciones',NEW.id_interaccion,'resultado',OLD.resultado,NEW.resultado,COALESCE(@zimbra_actor,CURRENT_USER()),NOW());
    END IF;
    IF NOT (OLD.notas <=> NEW.notas) THEN
        INSERT INTO auditoria_cambios VALUES (NULL,'interacciones',NEW.id_interaccion,'notas',OLD.notas,NEW.notas,COALESCE(@zimbra_actor,CURRENT_USER()),NOW());
    END IF;
END$$

-- ---------------------------------------------------------------------
-- TRIGGER 5: HU-10 / HU-11 / HU-32 – Historial de cambios de pruebas
-- Registra cambios de estado y fecha de vencimiento de las pruebas.
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_descargas_au_auditoria
AFTER UPDATE ON descargas_prueba
FOR EACH ROW
BEGIN
    IF NOT (OLD.estado_prueba <=> NEW.estado_prueba) THEN
        INSERT INTO auditoria_cambios VALUES (NULL,'descargas_prueba',NEW.id_descarga,'estado_prueba',OLD.estado_prueba,NEW.estado_prueba,COALESCE(@zimbra_actor,CURRENT_USER()),NOW());
    END IF;
    IF NOT (OLD.fecha_fin <=> NEW.fecha_fin) THEN
        INSERT INTO auditoria_cambios VALUES (NULL,'descargas_prueba',NEW.id_descarga,'fecha_fin',OLD.fecha_fin,NEW.fecha_fin,COALESCE(@zimbra_actor,CURRENT_USER()),NOW());
    END IF;
END$$

-- ---------------------------------------------------------------------
-- TRIGGER 6: HU-08 / HU-32 – Historial de cambios de precio y disponibilidad
-- Registra cambios en el precio y la activación del producto.
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_productos_au_auditoria
AFTER UPDATE ON productos
FOR EACH ROW
BEGIN
    IF NOT (OLD.estado <=> NEW.estado) THEN
        INSERT INTO auditoria_cambios VALUES (NULL,'productos',NEW.id_producto,'estado',OLD.estado,NEW.estado,COALESCE(@zimbra_actor,CURRENT_USER()),NOW());
    END IF;
    IF NOT (OLD.precio <=> NEW.precio) THEN
        INSERT INTO auditoria_cambios VALUES (NULL,'productos',NEW.id_producto,'precio',OLD.precio,NEW.precio,COALESCE(@zimbra_actor,CURRENT_USER()),NOW());
    END IF;
END$$

-- ---------------------------------------------------------------------
-- TRIGGER 7: HU-23 / HU-24 / HU-32 – Actualización e historial de sincronizaciones
-- Actualiza el estado de Salesforce del cliente y registra los cambios de la sincronización.
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_salesforce_au_estado_auditoria
AFTER UPDATE ON salesforce_sincronizaciones
FOR EACH ROW
BEGIN
    IF NOT (OLD.estado <=> NEW.estado) THEN
        UPDATE clientes
           SET estado_salesforce = CASE NEW.estado
               WHEN 'Sincronizado' THEN 'Sincronizado'
               WHEN 'Fallido' THEN 'Fallido'
               ELSE 'Pendiente'
           END
         WHERE id_cliente = NEW.id_cliente;
        INSERT INTO auditoria_cambios VALUES
        (NULL,'salesforce_sincronizaciones',NEW.id_sincronizacion,'estado',OLD.estado,NEW.estado,COALESCE(@zimbra_actor,CURRENT_USER()),NOW());
    END IF;
    IF NOT (OLD.intentos <=> NEW.intentos) THEN
        INSERT INTO auditoria_cambios VALUES
        (NULL,'salesforce_sincronizaciones',NEW.id_sincronizacion,'intentos',OLD.intentos,NEW.intentos,COALESCE(@zimbra_actor,CURRENT_USER()),NOW());
    END IF;
    IF NOT (OLD.operacion <=> NEW.operacion) THEN
        INSERT INTO auditoria_cambios VALUES
        (NULL,'salesforce_sincronizaciones',NEW.id_sincronizacion,'operacion',OLD.operacion,NEW.operacion,COALESCE(@zimbra_actor,CURRENT_USER()),NOW());
    END IF;
    IF NOT (OLD.salesforce_id <=> NEW.salesforce_id) THEN
        INSERT INTO auditoria_cambios VALUES
        (NULL,'salesforce_sincronizaciones',NEW.id_sincronizacion,'salesforce_id',OLD.salesforce_id,NEW.salesforce_id,COALESCE(@zimbra_actor,CURRENT_USER()),NOW());
    END IF;
    IF NOT (OLD.mensaje_error <=> NEW.mensaje_error) THEN
        INSERT INTO auditoria_cambios VALUES
        (NULL,'salesforce_sincronizaciones',NEW.id_sincronizacion,'mensaje_error',OLD.mensaje_error,NEW.mensaje_error,COALESCE(@zimbra_actor,CURRENT_USER()),NOW());
    END IF;
END$$

-- ---------------------------------------------------------------------
-- TRIGGER 8: HU-26 – Validación de producto vendible al insertar detalle
-- Impide vender licencias gratuitas o de prueba y productos inactivos.
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_detalle_venta
BEFORE INSERT ON detalle_ventas
FOR EACH ROW
BEGIN
    DECLARE v_tipo_licencia VARCHAR(50);
    DECLARE v_estado_producto BOOLEAN;

    SELECT tipo_licencia, estado INTO v_tipo_licencia, v_estado_producto
    FROM productos WHERE id_producto = NEW.id_producto;

    IF v_tipo_licencia IN ('Gratuita', 'Prueba 60 dias') THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No se pueden vender licencias gratuitas o de prueba.';
    END IF;

    IF v_estado_producto = FALSE THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'El producto está inactivo y no puede venderse.';
    END IF;
END$$

-- ---------------------------------------------------------------------
-- TRIGGER 9: HU-27 / HU-28 – Auditoría de cambios críticos en ventas
-- Registra cambios de estado, método de pago y total.
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_ventas
AFTER UPDATE ON ventas
FOR EACH ROW
BEGIN
    IF OLD.estado_venta <> NEW.estado_venta THEN
        INSERT INTO auditoria_cambios (tabla, id_registro, campo, valor_anterior, valor_nuevo, usuario_bd, fecha_cambio)
        VALUES ('ventas', NEW.id_venta, 'estado_venta', OLD.estado_venta, NEW.estado_venta, CURRENT_USER(), NOW());
    END IF;
    IF OLD.total_venta <> NEW.total_venta THEN
        INSERT INTO auditoria_cambios (tabla, id_registro, campo, valor_anterior, valor_nuevo, usuario_bd, fecha_cambio)
        VALUES ('ventas', NEW.id_venta, 'total_venta', OLD.total_venta, NEW.total_venta, CURRENT_USER(), NOW());
    END IF;
    IF OLD.metodo_pago <> NEW.metodo_pago THEN
        INSERT INTO auditoria_cambios (tabla, id_registro, campo, valor_anterior, valor_nuevo, usuario_bd, fecha_cambio)
        VALUES ('ventas', NEW.id_venta, 'metodo_pago', OLD.metodo_pago, NEW.metodo_pago, CURRENT_USER(), NOW());
    END IF;
END$$

-- ---------------------------------------------------------------------
-- TRIGGER 10: HU-28 – Conversión del cliente al completar una venta
-- Cambia el cliente a Cliente y convierte sus pruebas activas cuando la venta pasa a Completada.
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_conversion_ventas_
AFTER UPDATE ON ventas
FOR EACH ROW
BEGIN
    IF NEW.estado_venta = 'Completada' AND OLD.estado_venta <> 'Completada' THEN
        UPDATE clientes SET estado_cliente = 'Cliente' WHERE id_cliente = NEW.id_cliente;
        UPDATE descargas_prueba
        SET estado_prueba = 'Convertida', id_venta = NEW.id_venta
        WHERE id_cliente = NEW.id_cliente AND estado_prueba = 'Activa';
    END IF;
END$$

-- ---------------------------------------------------------------------
-- TRIGGER 11: HU-22 – Historial de reasignaciones comerciales
-- Registra cambios de vendedor o estado en las asignaciones.
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_reasignaciones_CRM
AFTER UPDATE ON asignaciones_crm
FOR EACH ROW
BEGIN
    IF OLD.id_vendedor <> NEW.id_vendedor OR OLD.estado <> NEW.estado THEN
        INSERT INTO auditoria_cambios (tabla, id_registro, campo, valor_anterior, valor_nuevo, usuario_bd, fecha_cambio)
        VALUES ('asignaciones_crm', NEW.id_asignacion, 'reasignacion',
                CONCAT('Vendedor:', OLD.id_vendedor, ', Estado:', OLD.estado),
                CONCAT('Vendedor:', NEW.id_vendedor, ', Estado:', NEW.estado),
                CURRENT_USER(), NOW());
    END IF;
END$$

-- ---------------------------------------------------------------------
-- TRIGGER 12: HU-25 – Validación de la asignación antes de registrar una interacción
-- Impide registrar interacciones en asignaciones finalizadas.
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_bloqueo_interacciones
BEFORE INSERT ON interacciones
FOR EACH ROW
BEGIN
    DECLARE v_estado_asignacion VARCHAR(20);
    SELECT estado INTO v_estado_asignacion FROM asignaciones_crm WHERE id_asignacion = NEW.id_asignacion;
    IF v_estado_asignacion <> 'Activa' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'No se pueden registrar interacciones en asignaciones finalizadas.';
    END IF;
END$$

-- ---------------------------------------------------------------------
-- TRIGGER 13: HU-18 – Protección de la plantilla activa por evento
-- Rechaza una segunda plantilla activa para el mismo evento.
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_plantillas_asignacion
BEFORE UPDATE ON plantillas_correo
FOR EACH ROW
BEGIN
    IF NEW.estado = TRUE AND OLD.estado = FALSE AND EXISTS (
        SELECT 1 FROM plantillas_correo pc
        WHERE pc.evento = NEW.evento AND pc.id_plantilla <> NEW.id_plantilla AND pc.estado = TRUE
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Ya existe una plantilla activa para este evento.';
    END IF;
END$$

-- ---------------------------------------------------------------------
-- TRIGGER 14: HU-19 – Control de intentos de correos automáticos
-- Incrementa los intentos cuando el correo pasa a Fallido y rechaza que el contador supere tres.
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_envio_correos
BEFORE UPDATE ON correos_enviados
FOR EACH ROW
BEGIN
    IF NEW.estado_correo = 'Fallido' AND OLD.estado_correo <> 'Fallido' THEN
        SET NEW.intentos = OLD.intentos + 1;
        IF NEW.intentos > 3 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Límite de 3 reintentos alcanzado para este correo.';
        END IF;
    END IF;
END$$

-- ---------------------------------------------------------------------
-- TRIGGER 15: HU-07 – Validación de productos nuevos
-- Comprueba el nombre, la licencia y el precio antes de registrar el producto.
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_productos_bi BEFORE INSERT ON productos FOR EACH ROW
BEGIN
    IF NEW.nombre_producto IS NULL OR TRIM(NEW.nombre_producto) = '' OR NEW.tipo_licencia IS NULL OR
         NEW.tipo_licencia NOT IN('Gratuita', 'Prueba 60 dias', 'Comercial') OR NEW.precio IS NULL OR(
         NEW.tipo_licencia IN('Gratuita', 'Prueba 60 dias') AND NEW.precio <> 0) OR(NEW.tipo_licencia = 'Comercial'
         AND NEW.precio <= 0) THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30001, MESSAGE_TEXT =
             'Nombre, licencia o precio del producto no válidos.';
    END IF;
END$$

-- ---------------------------------------------------------------------
-- TRIGGER 16: HU-08 – Validación de cambios del producto
-- Comprueba que el nombre, la licencia y el precio sigan siendo válidos al actualizar.
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_productos_bu BEFORE UPDATE ON productos FOR EACH ROW
BEGIN
    IF NEW.nombre_producto IS NULL OR TRIM(NEW.nombre_producto) = '' OR NEW.tipo_licencia IS NULL OR
         NEW.tipo_licencia NOT IN('Gratuita', 'Prueba 60 dias', 'Comercial') OR NEW.precio IS NULL OR(
         NEW.tipo_licencia IN('Gratuita', 'Prueba 60 dias') AND NEW.precio <> 0) OR(NEW.tipo_licencia = 'Comercial'
         AND NEW.precio <= 0) THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30001, MESSAGE_TEXT =
             'Nombre, licencia o precio del producto no válidos.';
    END IF;
END$$

-- ---------------------------------------------------------------------
-- TRIGGER 17: HU-12 – Validación de campañas nuevas
-- Prepara el código y revisa el nombre, presupuesto, fechas y estado antes de guardar la campaña.
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_campanas_bi BEFORE INSERT ON campanas_marketing FOR EACH ROW
BEGIN
    DECLARE v_siguiente INT;
    SET NEW.estado = 'Activa';
    IF NEW.codigo_campana IS NULL OR TRIM(NEW.codigo_campana) = '' THEN
        SELECT COALESCE(MAX(CAST(SUBSTRING(codigo_campana, 5) AS UNSIGNED)), 0) + 1 INTO v_siguiente
        FROM campanas_marketing WHERE codigo_campana REGEXP '^CAM-[0-9]{6}$';
        IF v_siguiente > 999999 THEN
            SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30009, MESSAGE_TEXT = 'Se agotó el consecutivo de códigos de campaña.';
        END IF;
        SET NEW.codigo_campana = CONCAT('CAM-', LPAD(v_siguiente, 6, '0'));
    END IF;
    SET NEW.codigo_campana = UPPER(TRIM(NEW.codigo_campana));
    IF NEW.codigo_campana IS NULL OR NEW.codigo_campana NOT REGEXP '^[A-Z0-9_-]{1,50}$' THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30001, MESSAGE_TEXT = 'El código de campaña no es válido.';
    END IF;
    IF NEW.nombre_campana IS NULL OR TRIM(NEW.nombre_campana) = '' OR NEW.fecha_inicio IS NULL OR NEW.fecha_fin IS
         NULL OR NEW.fecha_fin < NEW.fecha_inicio OR NEW.presupuesto IS NULL OR NEW.presupuesto < 0 OR NEW.estado IS NULL OR NEW.estado NOT IN
        ('Activa', 'Inactiva') THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30001, MESSAGE_TEXT = 'Los datos y fechas de la campaña no son válidos.';
    END IF;
END$$

-- ---------------------------------------------------------------------
-- TRIGGER 18: HU-13 – Validación de cambios y reactivación de campañas
-- Revisa los datos y exige una fecha final vigente al reactivar una campaña terminada.
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_campanas_bu BEFORE UPDATE ON campanas_marketing FOR EACH ROW
BEGIN
    SET NEW.codigo_campana = UPPER(TRIM(NEW.codigo_campana));
    IF NEW.codigo_campana IS NULL OR NEW.codigo_campana NOT REGEXP '^[A-Z0-9_-]{1,50}$' THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30001, MESSAGE_TEXT = 'El código de campaña no es válido.';
    END IF;
    IF NEW.nombre_campana IS NULL OR TRIM(NEW.nombre_campana) = '' OR NEW.fecha_inicio IS NULL OR NEW.fecha_fin IS
         NULL OR NEW.fecha_fin < NEW.fecha_inicio OR NEW.presupuesto IS NULL OR NEW.presupuesto < 0 OR NEW.estado IS NULL OR NEW.estado NOT IN
        ('Activa', 'Inactiva') THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30001, MESSAGE_TEXT = 'Los datos y fechas de la campaña no son válidos.';
    END IF;
    IF OLD.estado = 'Inactiva' AND NEW.estado = 'Activa' AND NEW.fecha_fin < CURRENT_DATE THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30001, MESSAGE_TEXT = 'Indique una fecha_fin vigente para reactivar la campaña.';
    END IF;
END$$

-- ---------------------------------------------------------------------
-- TRIGGER 19: HU-15 – Validación del evento web y su puntaje
-- Revisa al cliente y la acción; si la campaña no es válida, guarda el evento sin ella y explica el motivo.
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_actividad_bi BEFORE INSERT ON actividad_web FOR EACH ROW
BEGIN
    DECLARE v_estado VARCHAR(50) DEFAULT NULL;
    DECLARE v_puntos INT DEFAULT NULL;
    DECLARE v_campana INT DEFAULT NULL;
    DECLARE v_identificado INT DEFAULT NULL;
    IF NEW.clave_rastreo IS NOT NULL THEN
        SET NEW.clave_rastreo = NULLIF(TRIM(NEW.clave_rastreo), '');
        IF NEW.clave_rastreo IS NOT NULL THEN
            INSERT INTO visitantes_web(clave_rastreo)
            VALUES(NEW.clave_rastreo) ON DUPLICATE KEY UPDATE clave_rastreo = VALUES(clave_rastreo);
            SELECT id_cliente INTO v_identificado FROM visitantes_web WHERE clave_rastreo = NEW.clave_rastreo FOR UPDATE;
            IF v_identificado IS NOT NULL AND NEW.id_cliente IS NOT NULL AND v_identificado <> NEW.id_cliente THEN
                SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30009, MESSAGE_TEXT = 'La clave del visitante ya pertenece a otro cliente.';
            END IF;
            SET NEW.id_cliente = COALESCE(NEW.id_cliente, v_identificado);
        END IF;
    END IF;
    IF NEW.id_cliente IS NULL AND NEW.clave_rastreo IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30001, MESSAGE_TEXT = 'Indique el cliente o la clave de rastreo del visitante.';
    END IF;
    IF NEW.id_cliente IS NOT NULL THEN
        SELECT estado_cliente INTO v_estado FROM clientes WHERE id_cliente = NEW.id_cliente FOR UPDATE;
        IF v_estado IS NULL THEN
            SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30004, MESSAGE_TEXT = 'El cliente indicado no existe.';
        END IF;
        IF v_estado = 'Inactivo' THEN
            SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30009, MESSAGE_TEXT = 'No se puede registrar actividad para un cliente inactivo.';
        END IF;
        SET NEW.clave_rastreo = NULL;
    END IF;
    SELECT puntaje INTO v_puntos FROM acciones_marketing WHERE id_accion = NEW.id_accion AND estado = TRUE FOR SHARE;
    IF v_puntos IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30001, MESSAGE_TEXT = 'La acción no existe o está inactiva.';
    END IF;
    SET NEW.puntaje_otorgado = IF(NEW.id_cliente IS NULL OR v_estado NOT IN('Inactivo', 'Convertido'), v_puntos, 0);
    SET NEW.es_retorno = COALESCE(v_estado = 'Calificado', FALSE);
    IF NEW.id_campana IS NOT NULL THEN
        SELECT id_campana INTO v_campana FROM campanas_marketing WHERE id_campana = NEW.id_campana AND estado = 'Activa' FOR SHARE;
        IF v_campana IS NULL THEN
            SET NEW.detalle = LEFT(CONCAT('Campaña ', NEW.id_campana, ' inexistente o inactiva; evento sin campaña. ', COALESCE(NEW.detalle, '')), 255);
            SET NEW.id_campana = NULL;
        END IF;
    END IF;
END$$

-- ---------------------------------------------------------------------
-- TRIGGER 20: HU-15 / HU-16 / HU-17 – Aplicación de puntos y alertas de actividad
-- Después de guardar el evento, aplica los puntos permitidos, revisa la calificación y genera las alertas.
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_actividad_ai AFTER INSERT ON actividad_web FOR EACH ROW
BEGIN
    IF NEW.id_cliente IS NOT NULL THEN
        CALL sp_aplicar_actividad_interno (NEW.id_cliente, NEW.puntaje_otorgado);
    END IF;
END$$

-- ---------------------------------------------------------------------
-- TRIGGER 21: HU-14 / HU-15 – Protección del historial de actividad
-- Conserva los datos originales y permite asociar al cliente una actividad de un visitante sin identificar.
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_actividad_bu BEFORE UPDATE ON actividad_web FOR EACH ROW
BEGIN
    DECLARE v_estado VARCHAR(50) DEFAULT NULL;
    IF OLD.id_cliente IS NULL AND NEW.id_cliente IS NOT NULL AND OLD.clave_rastreo IS NOT NULL AND
         NEW.clave_rastreo IS NULL THEN
        IF NOT(NEW.id_accion <=> OLD.id_accion) OR NOT(NEW.puntaje_otorgado <=> OLD.puntaje_otorgado) THEN
            SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30009, MESSAGE_TEXT = 'La asociación conserva la acción y su puntaje histórico.';
        END IF;
        SELECT estado_cliente INTO v_estado FROM clientes WHERE id_cliente = NEW.id_cliente FOR UPDATE;
        IF v_estado IS NULL THEN
            SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30004, MESSAGE_TEXT = 'El cliente indicado no existe.';
        END IF;
        IF v_estado = 'Inactivo' THEN
            SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30009, MESSAGE_TEXT = 'No se puede asociar actividad a un cliente inactivo.';
        END IF;
        SET NEW.es_retorno =(v_estado = 'Calificado');
        IF v_estado IN('Inactivo', 'Convertido') THEN
            SET NEW.puntaje_otorgado = 0;
        END IF;
    ELSEIF NOT(NEW.id_cliente <=> OLD.id_cliente) OR NOT(NEW.clave_rastreo <=> OLD.clave_rastreo) OR NOT(
         NEW.id_accion <=> OLD.id_accion) OR NOT(NEW.puntaje_otorgado <=> OLD.puntaje_otorgado) OR NOT(
         NEW.es_retorno <=> OLD.es_retorno) THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30009, MESSAGE_TEXT = 'La identidad y los puntos históricos del evento se conservan.';
    END IF;
END$$

-- ---------------------------------------------------------------------
-- TRIGGER 22: HU-15 / HU-16 / HU-17 – Aplicación de actividad al identificar al visitante
-- Aplica los puntos y las reglas de calificación y alertas una sola vez al asociar el evento con el cliente.
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_actividad_au AFTER UPDATE ON actividad_web FOR EACH ROW
BEGIN
    IF OLD.id_cliente IS NULL AND NEW.id_cliente IS NOT NULL THEN
        CALL sp_aplicar_actividad_interno (NEW.id_cliente, NEW.puntaje_otorgado);
    END IF;
END$$

-- ---------------------------------------------------------------------
-- TRIGGER 23: HU-09 – Validación de una descarga de prueba
-- Exige cliente habilitado y producto activo gratuito o de prueba; calcula los 60 días y evita pruebas activas repetidas.
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_descargas_bi BEFORE INSERT ON descargas_prueba FOR EACH ROW
BEGIN
    DECLARE v_estado VARCHAR(50) DEFAULT NULL;
    DECLARE v_producto INT DEFAULT NULL;
    DECLARE v_fin DATE DEFAULT NULL;
    DECLARE v_mensaje VARCHAR(128);
    SELECT estado_cliente INTO v_estado FROM clientes WHERE id_cliente = NEW.id_cliente FOR UPDATE;
    IF v_estado IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30004, MESSAGE_TEXT = 'El cliente indicado no existe.';
    END IF;
    IF v_estado = 'Inactivo' THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30009, MESSAGE_TEXT = 'No se puede registrar una prueba para un cliente inactivo.';
    END IF;
    SELECT id_producto INTO v_producto FROM productos WHERE id_producto = NEW.id_producto AND estado = TRUE AND tipo_licencia IN('Gratuita',
        'Prueba 60 dias') FOR SHARE;
    IF v_producto IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30001, MESSAGE_TEXT = 'El producto debe estar activo y tener licencia gratuita o de prueba.';
    END IF;
    SELECT fecha_fin INTO v_fin FROM descargas_prueba WHERE id_cliente = NEW.id_cliente AND id_producto = NEW.id_producto AND estado_prueba = 'Activa'
        AND fecha_fin >= CURRENT_DATE ORDER BY fecha_fin LIMIT 1;
    IF v_fin IS NOT NULL THEN
        SET v_mensaje = CONCAT('El cliente ya tiene una prueba activa hasta ', v_fin, '.');
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30009, MESSAGE_TEXT = v_mensaje;
    END IF;
    SET NEW.fecha_inicio = CURRENT_DATE, NEW.fecha_fin = DATE_ADD(CURRENT_DATE, INTERVAL 60 DAY), NEW.estado_prueba = 'Activa';
END$$

-- ---------------------------------------------------------------------
-- TRIGGER 24: HU-09 / HU-16 – Registro de actividad por descarga
-- Guarda la actividad de la descarga para aplicar los puntos permitidos, revisar la calificación y generar alertas.
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_descargas_ai AFTER INSERT ON descargas_prueba FOR EACH ROW
BEGIN
    DECLARE v_accion INT DEFAULT NULL;
    SELECT id_accion INTO v_accion FROM acciones_marketing WHERE nombre_accion = 'Descarga de prueba (60 días)' AND estado = TRUE LIMIT 1 FOR SHARE;
    IF v_accion IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30009, MESSAGE_TEXT = 'No está configurada la acción de descarga de prueba.';
    END IF;
    INSERT INTO actividad_web(id_cliente, id_accion, detalle)
    VALUES(NEW.id_cliente, v_accion, CONCAT('Descarga de prueba del producto ', NEW.id_producto));
    INSERT INTO auditoria_cambios(tabla, id_registro, campo, valor_anterior, valor_nuevo, usuario_bd, fecha_cambio)
    VALUES('descargas_prueba', NEW.id_descarga, 'estado_prueba', NULL, 'Activa', COALESCE(@zimbra_actor, CURRENT_USER()), NOW());
END$$

-- ---------------------------------------------------------------------
-- TRIGGER 25: HU-11 / HU-28 – Protección de pruebas convertidas
-- Conserva la venta asociada e impide que una prueba Convertida vuelva a Activa o Vencida.
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_descargas_bu BEFORE UPDATE ON descargas_prueba FOR EACH ROW
BEGIN
    IF OLD.estado_prueba = 'Convertida' AND NEW.estado_prueba <> 'Convertida' THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30009, MESSAGE_TEXT = 'Una prueba convertida conserva su estado.';
    END IF;
END$$

-- ---------------------------------------------------------------------
-- TRIGGER 26: HU-17 – Validación de la atención de alertas
-- Comprueba los permisos, guarda la fecha de atención y conserva los datos de una atención ya registrada.
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_alertas_bu BEFORE UPDATE ON alertas FOR EACH ROW
BEGIN
    DECLARE v_rol VARCHAR(20) DEFAULT NULL;
    DECLARE v_vendedor INT DEFAULT NULL;
    IF OLD.estado_alerta = 'Atendida' AND(NEW.estado_alerta <> 'Atendida' OR NOT(OLD.id_usuario_atendio <=>
         NEW.id_usuario_atendio) OR NOT(OLD.fecha_atencion <=> NEW.fecha_atencion) OR NOT(OLD.nota_atencion <=>
         NEW.nota_atencion)) THEN
        SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30009, MESSAGE_TEXT = 'La atención registrada se conserva en el historial.';
    END IF;
    IF OLD.estado_alerta = 'Pendiente' AND NEW.estado_alerta = 'Atendida' THEN
        SELECT rol, id_vendedor INTO v_rol, v_vendedor FROM usuarios WHERE id_usuario = NEW.id_usuario_atendio AND estado = TRUE FOR SHARE;
        IF v_rol IS NULL OR(v_rol <> 'Administrador' AND(v_vendedor IS NULL OR NEW.id_vendedor IS NULL OR v_vendedor <>
             NEW.id_vendedor)) THEN
            SIGNAL SQLSTATE '45000' SET MYSQL_ERRNO = 30003, MESSAGE_TEXT = 'El usuario no puede atender esta alerta.';
        END IF;
        SET NEW.fecha_atencion = NOW(), NEW.clave_evento = NULL;
    END IF;
END$$

-- ---------------------------------------------------------------------
-- TRIGGER 27: HU-07 – Historial de creación de productos
-- Registra los datos del producto y quién lo creó.
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_productos_ai_audit AFTER INSERT ON productos FOR EACH ROW
BEGIN
    INSERT INTO auditoria_cambios(tabla, id_registro, campo, valor_anterior, valor_nuevo, usuario_bd, fecha_cambio)
    VALUES('productos', NEW.id_producto, 'nombre_producto', NULL, NEW.nombre_producto, COALESCE(@zimbra_actor, CURRENT_USER()), NOW());
    INSERT INTO auditoria_cambios(tabla, id_registro, campo, valor_anterior, valor_nuevo, usuario_bd, fecha_cambio)
    VALUES('productos', NEW.id_producto, 'tipo_licencia', NULL, NEW.tipo_licencia, COALESCE(@zimbra_actor, CURRENT_USER()), NOW());
    INSERT INTO auditoria_cambios(tabla, id_registro, campo, valor_anterior, valor_nuevo, usuario_bd, fecha_cambio)
    VALUES('productos', NEW.id_producto, 'precio', NULL, NEW.precio, COALESCE(@zimbra_actor, CURRENT_USER()), NOW());
    INSERT INTO auditoria_cambios(tabla, id_registro, campo, valor_anterior, valor_nuevo, usuario_bd, fecha_cambio)
    VALUES('productos', NEW.id_producto, 'estado', NULL, NEW.estado, COALESCE(@zimbra_actor, CURRENT_USER()), NOW());
END$$

-- ---------------------------------------------------------------------
-- TRIGGER 28: HU-08 – Historial de actualización de productos
-- Registra los cambios del producto junto con el usuario que los realizó.
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_productos_au_audit AFTER UPDATE ON productos FOR EACH ROW
BEGIN
    IF NOT(OLD.nombre_producto <=> NEW.nombre_producto) THEN
        INSERT INTO auditoria_cambios(tabla, id_registro, campo, valor_anterior, valor_nuevo, usuario_bd, fecha_cambio)
        VALUES('productos', NEW.id_producto, 'nombre_producto', OLD.nombre_producto, NEW.nombre_producto, COALESCE(@zimbra_actor, CURRENT_USER()), NOW());
    END IF;
    IF NOT(OLD.tipo_licencia <=> NEW.tipo_licencia) THEN
        INSERT INTO auditoria_cambios(tabla, id_registro, campo, valor_anterior, valor_nuevo, usuario_bd, fecha_cambio)
        VALUES('productos', NEW.id_producto, 'tipo_licencia', OLD.tipo_licencia, NEW.tipo_licencia, COALESCE(@zimbra_actor, CURRENT_USER()), NOW());
    END IF;
END$$

-- ---------------------------------------------------------------------
-- TRIGGER 29: HU-12 – Historial de creación de campañas
-- Registra los datos de la campaña y quién la creó.
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_campanas_marketing_ai_audit AFTER INSERT ON campanas_marketing FOR EACH ROW
BEGIN
    INSERT INTO auditoria_cambios(tabla, id_registro, campo, valor_anterior, valor_nuevo, usuario_bd, fecha_cambio)
    VALUES('campanas_marketing', NEW.id_campana, 'codigo_campana', NULL, NEW.codigo_campana, COALESCE(@zimbra_actor, CURRENT_USER()), NOW());
    INSERT INTO auditoria_cambios(tabla, id_registro, campo, valor_anterior, valor_nuevo, usuario_bd, fecha_cambio)
    VALUES('campanas_marketing', NEW.id_campana, 'nombre_campana', NULL, NEW.nombre_campana, COALESCE(@zimbra_actor, CURRENT_USER()), NOW());
    INSERT INTO auditoria_cambios(tabla, id_registro, campo, valor_anterior, valor_nuevo, usuario_bd, fecha_cambio)
    VALUES('campanas_marketing', NEW.id_campana, 'descripcion', NULL, NEW.descripcion, COALESCE(@zimbra_actor, CURRENT_USER()), NOW());
    INSERT INTO auditoria_cambios(tabla, id_registro, campo, valor_anterior, valor_nuevo, usuario_bd, fecha_cambio)
    VALUES('campanas_marketing', NEW.id_campana, 'presupuesto', NULL, NEW.presupuesto, COALESCE(@zimbra_actor, CURRENT_USER()), NOW());
    INSERT INTO auditoria_cambios(tabla, id_registro, campo, valor_anterior, valor_nuevo, usuario_bd, fecha_cambio)
    VALUES('campanas_marketing', NEW.id_campana, 'fecha_inicio', NULL, NEW.fecha_inicio, COALESCE(@zimbra_actor, CURRENT_USER()), NOW());
    INSERT INTO auditoria_cambios(tabla, id_registro, campo, valor_anterior, valor_nuevo, usuario_bd, fecha_cambio)
    VALUES('campanas_marketing', NEW.id_campana, 'fecha_fin', NULL, NEW.fecha_fin, COALESCE(@zimbra_actor, CURRENT_USER()), NOW());
    INSERT INTO auditoria_cambios(tabla, id_registro, campo, valor_anterior, valor_nuevo, usuario_bd, fecha_cambio)
    VALUES('campanas_marketing', NEW.id_campana, 'estado', NULL, NEW.estado, COALESCE(@zimbra_actor, CURRENT_USER()), NOW());
END$$

-- ---------------------------------------------------------------------
-- TRIGGER 30: HU-13 – Historial de actualización de campañas
-- Registra los cambios de la campaña junto con el usuario que los realizó.
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_campanas_marketing_au_audit AFTER UPDATE ON campanas_marketing FOR EACH ROW
BEGIN
    IF NOT(OLD.codigo_campana <=> NEW.codigo_campana) THEN
        INSERT INTO auditoria_cambios(tabla, id_registro, campo, valor_anterior, valor_nuevo, usuario_bd, fecha_cambio)
        VALUES('campanas_marketing', NEW.id_campana, 'codigo_campana', OLD.codigo_campana, NEW.codigo_campana, COALESCE(@zimbra_actor, CURRENT_USER()),
            NOW());
    END IF;
    IF NOT(OLD.nombre_campana <=> NEW.nombre_campana) THEN
        INSERT INTO auditoria_cambios(tabla, id_registro, campo, valor_anterior, valor_nuevo, usuario_bd, fecha_cambio)
        VALUES('campanas_marketing', NEW.id_campana, 'nombre_campana', OLD.nombre_campana, NEW.nombre_campana, COALESCE(@zimbra_actor, CURRENT_USER()),
            NOW());
    END IF;
    IF NOT(OLD.descripcion <=> NEW.descripcion) THEN
        INSERT INTO auditoria_cambios(tabla, id_registro, campo, valor_anterior, valor_nuevo, usuario_bd, fecha_cambio)
        VALUES('campanas_marketing', NEW.id_campana, 'descripcion', OLD.descripcion, NEW.descripcion, COALESCE(@zimbra_actor, CURRENT_USER()), NOW());
    END IF;
    IF NOT(OLD.presupuesto <=> NEW.presupuesto) THEN
        INSERT INTO auditoria_cambios(tabla, id_registro, campo, valor_anterior, valor_nuevo, usuario_bd, fecha_cambio)
        VALUES('campanas_marketing', NEW.id_campana, 'presupuesto', OLD.presupuesto, NEW.presupuesto, COALESCE(@zimbra_actor, CURRENT_USER()), NOW());
    END IF;
    IF NOT(OLD.fecha_inicio <=> NEW.fecha_inicio) THEN
        INSERT INTO auditoria_cambios(tabla, id_registro, campo, valor_anterior, valor_nuevo, usuario_bd, fecha_cambio)
        VALUES('campanas_marketing', NEW.id_campana, 'fecha_inicio', OLD.fecha_inicio, NEW.fecha_inicio, COALESCE(@zimbra_actor, CURRENT_USER()), NOW());
    END IF;
    IF NOT(OLD.fecha_fin <=> NEW.fecha_fin) THEN
        INSERT INTO auditoria_cambios(tabla, id_registro, campo, valor_anterior, valor_nuevo, usuario_bd, fecha_cambio)
        VALUES('campanas_marketing', NEW.id_campana, 'fecha_fin', OLD.fecha_fin, NEW.fecha_fin, COALESCE(@zimbra_actor, CURRENT_USER()), NOW());
    END IF;
    IF NOT(OLD.estado <=> NEW.estado) THEN
        INSERT INTO auditoria_cambios(tabla, id_registro, campo, valor_anterior, valor_nuevo, usuario_bd, fecha_cambio)
        VALUES('campanas_marketing', NEW.id_campana, 'estado', OLD.estado, NEW.estado, COALESCE(@zimbra_actor, CURRENT_USER()), NOW());
    END IF;
END$$

-- ---------------------------------------------------------------------
-- TRIGGER 31: HU-14 – Historial de creación de acciones de marketing
-- Registra los datos de la acción y quién la creó.
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_acciones_marketing_ai_audit AFTER INSERT ON acciones_marketing FOR EACH ROW
BEGIN
    INSERT INTO auditoria_cambios(tabla, id_registro, campo, valor_anterior, valor_nuevo, usuario_bd, fecha_cambio)
    VALUES('acciones_marketing', NEW.id_accion, 'nombre_accion', NULL, NEW.nombre_accion, COALESCE(@zimbra_actor, CURRENT_USER()), NOW());
    INSERT INTO auditoria_cambios(tabla, id_registro, campo, valor_anterior, valor_nuevo, usuario_bd, fecha_cambio)
    VALUES('acciones_marketing', NEW.id_accion, 'puntaje', NULL, NEW.puntaje, COALESCE(@zimbra_actor, CURRENT_USER()), NOW());
    INSERT INTO auditoria_cambios(tabla, id_registro, campo, valor_anterior, valor_nuevo, usuario_bd, fecha_cambio)
    VALUES('acciones_marketing', NEW.id_accion, 'estado', NULL, NEW.estado, COALESCE(@zimbra_actor, CURRENT_USER()), NOW());
END$$

-- ---------------------------------------------------------------------
-- TRIGGER 32: HU-14 – Historial de actualización de acciones de marketing
-- Registra los cambios de la acción junto con el usuario que los realizó.
-- ---------------------------------------------------------------------
CREATE TRIGGER trg_acciones_marketing_au_audit AFTER UPDATE ON acciones_marketing FOR EACH ROW
BEGIN
    IF NOT(OLD.nombre_accion <=> NEW.nombre_accion) THEN
        INSERT INTO auditoria_cambios(tabla, id_registro, campo, valor_anterior, valor_nuevo, usuario_bd, fecha_cambio)
        VALUES('acciones_marketing', NEW.id_accion, 'nombre_accion', OLD.nombre_accion, NEW.nombre_accion, COALESCE(@zimbra_actor, CURRENT_USER()),
            NOW());
    END IF;
    IF NOT(OLD.puntaje <=> NEW.puntaje) THEN
        INSERT INTO auditoria_cambios(tabla, id_registro, campo, valor_anterior, valor_nuevo, usuario_bd, fecha_cambio)
        VALUES('acciones_marketing', NEW.id_accion, 'puntaje', OLD.puntaje, NEW.puntaje, COALESCE(@zimbra_actor, CURRENT_USER()), NOW());
    END IF;
    IF NOT(OLD.estado <=> NEW.estado) THEN
        INSERT INTO auditoria_cambios(tabla, id_registro, campo, valor_anterior, valor_nuevo, usuario_bd, fecha_cambio)
        VALUES('acciones_marketing', NEW.id_accion, 'estado', OLD.estado, NEW.estado, COALESCE(@zimbra_actor, CURRENT_USER()), NOW());
    END IF;
END$$

DELIMITER ;

-- =====================================================================
-- 7. Vistas
-- =====================================================================


-- VISTA 1: Reporte de Ventas (HU-29)
CREATE OR REPLACE VIEW vw_reporte_ventas AS
SELECT v.id_venta,v.numero_contrato,v.fecha_venta,v.estado_venta,v.metodo_pago,v.total_venta,
       c.nombre_completo AS cliente,ve.nombre_vendedor,COUNT(dv.id_detalle) AS cantidad_productos
FROM ventas v JOIN clientes c ON c.id_cliente=v.id_cliente
JOIN vendedores ve ON ve.id_vendedor=v.id_vendedor
LEFT JOIN detalle_ventas dv ON dv.id_venta=v.id_venta
GROUP BY v.id_venta,v.numero_contrato,v.fecha_venta,v.estado_venta,v.metodo_pago,v.total_venta,c.nombre_completo,ve.nombre_vendedor;

-- VISTA 2: Rendimiento por Vendedor (HU-29, HU-30)
CREATE OR REPLACE VIEW vw_reporte_rendimiento_vendedores AS
SELECT ve.id_vendedor,ve.nombre_vendedor,
 COUNT(CASE WHEN v.estado_venta='Completada' THEN 1 END) AS ventas_completadas,
 COALESCE(SUM(CASE WHEN v.estado_venta='Completada' THEN v.total_venta ELSE 0 END),0) AS total_facturado,
 COUNT(CASE WHEN v.estado_venta='Pendiente' THEN 1 END) AS ventas_pendientes
FROM vendedores ve LEFT JOIN ventas v ON v.id_vendedor=ve.id_vendedor
GROUP BY ve.id_vendedor,ve.nombre_vendedor;

-- VISTA 3: Interacciones por Vendedor (HU-30)
CREATE OR REPLACE VIEW vw_reporte_interacciones AS
SELECT ve.id_vendedor,ve.nombre_vendedor,
 COUNT(DISTINCT CASE WHEN i.tipo_interaccion='Llamada' THEN i.id_interaccion END) AS llamadas,
 COUNT(DISTINCT CASE WHEN i.tipo_interaccion='Correo' THEN i.id_interaccion END) AS correos,
 COUNT(DISTINCT CASE WHEN i.tipo_interaccion='Meeting' THEN i.id_interaccion END) AS meetings,
 COUNT(DISTINCT i.id_interaccion) AS total_interacciones
FROM vendedores ve LEFT JOIN asignaciones_crm ac ON ac.id_vendedor=ve.id_vendedor
LEFT JOIN interacciones i ON i.id_asignacion=ac.id_asignacion
GROUP BY ve.id_vendedor,ve.nombre_vendedor;

-- VISTA 4: Asignaciones y Carga (HU-30)
CREATE OR REPLACE VIEW vw_reporte_asignaciones AS
SELECT ve.id_vendedor,ve.nombre_vendedor,
 COUNT(DISTINCT CASE WHEN ac.estado='Activa' THEN ac.id_asignacion END) AS clientes_activos,
 COUNT(DISTINCT CASE WHEN ac.estado='Finalizada' THEN ac.id_asignacion END) AS asignaciones_finalizadas
FROM vendedores ve LEFT JOIN asignaciones_crm ac ON ac.id_vendedor=ve.id_vendedor
GROUP BY ve.id_vendedor,ve.nombre_vendedor;

-- VISTA 5: Automatización de Correos (HU-30)
CREATE OR REPLACE VIEW vw_reporte_automatizacion AS
SELECT pc.evento,pc.nombre_plantilla,COUNT(ce.id_correo) AS total_envios,
 SUM(CASE WHEN ce.estado_correo='Enviado' THEN 1 ELSE 0 END) AS exitosos,
 SUM(CASE WHEN ce.estado_correo='Fallido' THEN 1 ELSE 0 END) AS fallidos,
 ROUND(100.0*SUM(CASE WHEN ce.estado_correo='Enviado' THEN 1 ELSE 0 END)/NULLIF(COUNT(ce.id_correo),0),2) AS tasa_exito_porcentaje
FROM plantillas_correo pc LEFT JOIN correos_enviados ce ON ce.id_plantilla=pc.id_plantilla
GROUP BY pc.evento,pc.nombre_plantilla;

-- VISTA 6: Historial del Cliente (HU-25)
CREATE OR REPLACE VIEW vw_historial_cliente AS
SELECT c.id_cliente,c.nombre_completo AS cliente,'Interacción' AS tipo_evento,
       i.fecha_interaccion AS fecha_evento,CONCAT(i.tipo_interaccion,' - ',COALESCE(i.resultado,'')) AS descripcion
FROM clientes c JOIN asignaciones_crm ac ON ac.id_cliente=c.id_cliente
JOIN interacciones i ON i.id_asignacion=ac.id_asignacion
UNION ALL
SELECT c.id_cliente,c.nombre_completo,'Correo Automático',ce.fecha_envio,
       CONCAT('Evento: ',ce.evento,' - Estado: ',ce.estado_correo)
FROM clientes c JOIN correos_enviados ce ON ce.id_cliente=c.id_cliente
UNION ALL
SELECT c.id_cliente,c.nombre_completo,'Venta',v.fecha_venta,
       CONCAT('Contrato: ',COALESCE(v.numero_contrato,''),' - Total: $',v.total_venta)
FROM clientes c JOIN ventas v ON v.id_cliente=c.id_cliente;

-- VISTA 7: Prospectos Calificados y Vendedor Asignado (HU-31)
CREATE OR REPLACE VIEW vw_calificados AS
SELECT c.id_cliente, c.nombre_completo, c.correo_electronico, c.puntaje_total, a.id_vendedor, v.nombre_vendedor
FROM clientes c
LEFT JOIN asignaciones_crm a ON a.id_cliente = c.id_cliente
    AND a.estado = 'Activa'
LEFT JOIN vendedores v ON v.id_vendedor = a.id_vendedor
WHERE c.estado_cliente = 'Calificado' ;

-- VISTA 8: Pruebas Próximas a Vencer (HU-10, HU-31)
CREATE OR REPLACE VIEW vw_pruebas_por_vencer AS
SELECT d.id_descarga, d.id_cliente, c.nombre_completo, d.id_producto, p.nombre_producto, d.fecha_fin, DATEDIFF(d.fecha_fin,
       CURRENT_DATE) AS dias_restantes, a.id_vendedor, v.nombre_vendedor
FROM descargas_prueba d
JOIN clientes c ON c.id_cliente = d.id_cliente
JOIN productos p ON p.id_producto = d.id_producto
LEFT JOIN asignaciones_crm a ON a.id_cliente = c.id_cliente
    AND a.estado = 'Activa'
LEFT JOIN vendedores v ON v.id_vendedor = a.id_vendedor
WHERE d.estado_prueba = 'Activa'
    AND d.fecha_fin BETWEEN CURRENT_DATE AND DATE_ADD(CURRENT_DATE, INTERVAL 7 DAY);

-- =====================================================================
-- 8. Índices
-- =====================================================================


-- ÍNDICE 1: HU-18 – Búsqueda de plantillas por evento y estado
CREATE INDEX idx_plantillas_evento_estado ON plantillas_correo(evento,estado);

-- ÍNDICE 2: HU-19 – Búsqueda de correos para evitar envíos repetidos
CREATE INDEX idx_correos_idempotencia ON correos_enviados(clave_idempotencia);

-- ÍNDICE 3: HU-19 / HU-30 – Consulta de correos por estado y fecha
CREATE INDEX idx_correos_estado_fecha ON correos_enviados(estado_correo,fecha_creacion);

-- ÍNDICE 4: HU-21 / HU-22 – Consulta de asignaciones por cliente y estado
CREATE INDEX idx_asignaciones_cliente_estado ON asignaciones_crm(id_cliente,estado);

-- ÍNDICE 5: HU-21 / HU-22 / HU-31 – Consulta de asignaciones por vendedor y estado
CREATE INDEX idx_asignaciones_vendedor_estado ON asignaciones_crm(id_vendedor,estado);

-- ÍNDICE 6: HU-25 / HU-30 – Consulta de interacciones por asignación y fecha
CREATE INDEX idx_interacciones_asignacion_fecha ON interacciones(id_asignacion,fecha_interaccion);

-- ÍNDICE 7: HU-29 – Consulta de ventas por fecha y estado
CREATE INDEX idx_ventas_fecha_estado ON ventas(fecha_venta,estado_venta);

-- ÍNDICE 8: HU-29 / HU-31 – Consulta de ventas por vendedor y estado
CREATE INDEX idx_ventas_vendedor_estado ON ventas(id_vendedor,estado_venta);

-- ÍNDICE 9: HU-26 / HU-29 – Consulta de productos asociados a una venta
CREATE INDEX idx_detalle_venta ON detalle_ventas(id_venta);

-- ÍNDICE 10: HU-09 / HU-10 – Búsqueda de pruebas por cliente y producto
CREATE INDEX idx_prueba_cliente_producto ON descargas_prueba (id_cliente, id_producto, estado_prueba, fecha_fin);

-- ÍNDICE 11: HU-10 / HU-11 – Búsqueda de pruebas por estado y vencimiento
CREATE INDEX idx_prueba_vencimiento ON descargas_prueba (estado_prueba, fecha_fin, id_cliente);

-- ÍNDICE 12: HU-15 / HU-16 – Consulta del historial de actividad por cliente y fecha
CREATE INDEX idx_actividad_cliente_fecha ON actividad_web (id_cliente, fecha_actividad, id_actividad);

-- ÍNDICE 13: HU-13 / HU-15 – Consulta de actividad por campaña y fecha
CREATE INDEX idx_actividad_campana_fecha ON actividad_web (id_campana, fecha_actividad, id_cliente);

-- ÍNDICE 14: HU-04 / HU-15 – Búsqueda de actividades pendientes de identificar al visitante
CREATE INDEX idx_actividad_visitante ON actividad_web (clave_rastreo, id_cliente, fecha_actividad, id_actividad);

-- =====================================================================
-- 9. Simulación de concurrencia y bloqueos
-- =====================================================================

/*
-- Bloquea el prospecto hasta confirmar o deshacer.
START TRANSACTION;
SELECT id_cliente FROM clientes WHERE id_cliente = 5 FOR UPDATE;
-- Sesión B: espera el bloqueo de la fila hasta que A termine.
START TRANSACTION;
SELECT id_cliente FROM clientes WHERE id_cliente = 5 FOR UPDATE;
-- Sesión A
COMMIT;
-- Sesión B
ROLLBACK;

-- Cada sesión bloquea primero un cliente distinto.
-- Sesión A: START TRANSACTION; UPDATE clientes SET telefono='3000000001' WHERE id_cliente=1;
-- Sesión B: START TRANSACTION; UPDATE clientes SET telefono='3000000002' WHERE id_cliente=2;
-- A: UPDATE clientes SET telefono='3000000003' WHERE id_cliente=2;
-- B: UPDATE clientes SET telefono='3000000004' WHERE id_cliente=1; -- error 1213 esperado
-- A: ROLLBACK;

-- Dos cambios incrementales al mismo puntaje: B espera y ambos incrementos permanecen.
-- Sesión A: START TRANSACTION; SELECT id_cliente FROM clientes WHERE id_cliente=1 FOR UPDATE;
-- Sesión B: START TRANSACTION; UPDATE clientes SET puntaje_total=puntaje_total+10 WHERE id_cliente=1;
-- Sesión A: UPDATE clientes SET puntaje_total=puntaje_total+10 WHERE id_cliente=1; COMMIT;
-- Sesión B: COMMIT;

-- Dos vendedores toman filas diferentes sin esperar.
-- START TRANSACTION;
-- SELECT c.id_cliente FROM clientes c
-- WHERE c.estado_cliente='Calificado'
--   AND NOT EXISTS (SELECT 1 FROM asignaciones_crm a WHERE a.id_cliente=c.id_cliente AND a.estado='Activa')
-- ORDER BY c.id_cliente LIMIT 1 FOR UPDATE SKIP LOCKED;
-- COMMIT;

-- Monitoreo de bloqueos 
-- SELECT * FROM performance_schema.data_locks;
-- SELECT * FROM sys.innodb_lock_waits;
-- SHOW ENGINE INNODB STATUS;
*/

-- =====================================================================
-- 9. Roles y permisos 
-- =====================================================================
CREATE ROLE IF NOT EXISTS 'zimbra_report_reader', 'zimbra_app_operator';
CREATE USER IF NOT EXISTS 'zimbra_app'@'localhost' IDENTIFIED BY 'CambiarClaveApp#2026';
CREATE USER IF NOT EXISTS 'report_user'@'localhost' IDENTIFIED BY 'CambiarClaveReportes#2026';
ALTER USER 'zimbra_app'@'localhost' IDENTIFIED BY 'CambiarClaveApp#2026';
ALTER USER 'report_user'@'localhost' IDENTIFIED BY 'CambiarClaveReportes#2026';

GRANT SELECT ON zimbra_bd.vw_reporte_ventas TO 'zimbra_report_reader';
GRANT SELECT ON zimbra_bd.vw_reporte_rendimiento_vendedores TO 'zimbra_report_reader';
GRANT SELECT ON zimbra_bd.vw_reporte_interacciones TO 'zimbra_report_reader';
GRANT SELECT ON zimbra_bd.vw_reporte_asignaciones TO 'zimbra_report_reader';
GRANT SELECT ON zimbra_bd.vw_reporte_automatizacion TO 'zimbra_report_reader';
GRANT SELECT ON zimbra_bd.vw_historial_cliente TO 'zimbra_report_reader';
GRANT SELECT ON zimbra_bd.vw_calificados TO 'zimbra_report_reader';
GRANT SELECT ON zimbra_bd.vw_pruebas_por_vencer TO 'zimbra_report_reader';

GRANT SELECT, EXECUTE ON zimbra_bd.* TO 'zimbra_app_operator';
GRANT INSERT, UPDATE ON zimbra_bd.empresas TO 'zimbra_app_operator';
GRANT INSERT, UPDATE ON zimbra_bd.clientes TO 'zimbra_app_operator';
GRANT INSERT, UPDATE ON zimbra_bd.vendedores TO 'zimbra_app_operator';
GRANT INSERT, UPDATE ON zimbra_bd.usuarios TO 'zimbra_app_operator';
GRANT INSERT, UPDATE ON zimbra_bd.recuperacion_claves TO 'zimbra_app_operator';
GRANT INSERT, UPDATE ON zimbra_bd.productos TO 'zimbra_app_operator';
GRANT INSERT, UPDATE ON zimbra_bd.campanas_marketing TO 'zimbra_app_operator';
GRANT INSERT, UPDATE ON zimbra_bd.acciones_marketing TO 'zimbra_app_operator';
GRANT INSERT, UPDATE ON zimbra_bd.actividad_web TO 'zimbra_app_operator';
GRANT INSERT, UPDATE ON zimbra_bd.visitantes_web TO 'zimbra_app_operator';
GRANT INSERT, UPDATE ON zimbra_bd.ventas TO 'zimbra_app_operator';
GRANT INSERT, UPDATE ON zimbra_bd.detalle_ventas TO 'zimbra_app_operator';
GRANT INSERT, UPDATE ON zimbra_bd.descargas_prueba TO 'zimbra_app_operator';
GRANT INSERT, UPDATE ON zimbra_bd.asignaciones_crm TO 'zimbra_app_operator';
GRANT INSERT, UPDATE ON zimbra_bd.interacciones TO 'zimbra_app_operator';
GRANT INSERT, UPDATE ON zimbra_bd.alertas TO 'zimbra_app_operator';
GRANT INSERT, UPDATE ON zimbra_bd.plantillas_correo TO 'zimbra_app_operator';
GRANT INSERT, UPDATE ON zimbra_bd.correos_enviados TO 'zimbra_app_operator';
GRANT INSERT, UPDATE ON zimbra_bd.salesforce_sincronizaciones TO 'zimbra_app_operator';
GRANT INSERT ON zimbra_bd.auditoria_cambios TO 'zimbra_app_operator';
GRANT 'zimbra_app_operator' TO 'zimbra_app'@'localhost';
GRANT 'zimbra_report_reader' TO 'report_user'@'localhost';
SET DEFAULT ROLE ALL TO 'zimbra_app'@'localhost', 'report_user'@'localhost';

-- Validación de permisos
SHOW GRANTS FOR 'zimbra_app'@'localhost' USING 'zimbra_app_operator';
SHOW GRANTS FOR 'report_user'@'localhost' USING 'zimbra_report_reader';

-- =====================================================================
-- 10. Transacciones
-- =====================================================================

-- TRANSACCIÓN 1: HU-01 / HU-02 / HU-03 – Consultar usuarios y recuperación de acceso sin mostrar contraseñas
/*
START TRANSACTION;
SELECT id_usuario, rol, estado FROM usuarios ORDER BY id_usuario LIMIT 5;
SELECT id_usuario, expira_en, usado_en FROM recuperacion_claves ORDER BY id_recuperacion LIMIT 5;
COMMIT;
*/

-- TRANSACCIÓN 2: HU-04 / HU-05 – Guardar un cliente conservando sus datos anteriores a una edición cancelada
/*
START TRANSACTION;
INSERT INTO clientes(nombre_completo, correo_electronico)
VALUES('Cliente de demostración', CONCAT('demo-', UUID(), '@example.com'));
SET @demo_cliente = LAST_INSERT_ID();
SAVEPOINT sp_edicion_cliente;
UPDATE clientes SET telefono = '3001234567' WHERE id_cliente = @demo_cliente;
ROLLBACK TO SAVEPOINT sp_edicion_cliente;
RELEASE SAVEPOINT sp_edicion_cliente;
SELECT nombre_completo, telefono FROM clientes WHERE id_cliente = @demo_cliente;
COMMIT;
*/

-- TRANSACCIÓN 3: HU-06 – Registrar una empresa y confirmar sus datos
/*
START TRANSACTION;
INSERT INTO empresas(nombre_empresa, sector_industria) VALUES(CONCAT('Empresa demo ', UUID()), 'Tecnología');
SELECT nombre_empresa, sector_industria FROM empresas WHERE id_empresa = LAST_INSERT_ID();
COMMIT;
*/

-- TRANSACCIÓN 4: HU-07 / HU-08 / HU-33 – Guardar un producto comercial y cancelar un cambio de precio adicional
/*
START TRANSACTION;
INSERT INTO productos(nombre_producto, tipo_licencia, precio) VALUES(CONCAT('Producto demo ', UUID()), 'Comercial', 100);
SET @demo_producto = LAST_INSERT_ID();
SAVEPOINT sp_precio_producto;
UPDATE productos SET precio = 120 WHERE id_producto = @demo_producto;
ROLLBACK TO SAVEPOINT sp_precio_producto;
RELEASE SAVEPOINT sp_precio_producto;
SELECT nombre_producto, tipo_licencia, precio FROM productos WHERE id_producto = @demo_producto;
COMMIT;
*/

-- TRANSACCIÓN 5: HU-09 / HU-10 / HU-11 – Consultar pruebas y sus vencimientos en una misma lectura
/*
START TRANSACTION;
SELECT id_descarga, id_cliente, id_producto, estado_prueba, fecha_fin FROM descargas_prueba ORDER BY fecha_fin LIMIT 5;
SELECT * FROM vw_pruebas_por_vencer LIMIT 5;
COMMIT;
*/

-- TRANSACCIÓN 6: HU-12 / HU-13 – Guardar una campaña activa y cancelar su desactivación
/*
START TRANSACTION;
INSERT INTO campanas_marketing(nombre_campana, codigo_campana, fecha_inicio, fecha_fin, estado)
VALUES(CONCAT('Campaña demo ', UUID()), CONCAT('DEMO-', UUID()), CURRENT_DATE, DATE_ADD(CURRENT_DATE, INTERVAL 30 DAY), 'Activa');
SET @demo_campana = LAST_INSERT_ID();
SAVEPOINT sp_estado_campana;
UPDATE campanas_marketing SET estado = 'Inactiva' WHERE id_campana = @demo_campana;
ROLLBACK TO SAVEPOINT sp_estado_campana;
RELEASE SAVEPOINT sp_estado_campana;
SELECT nombre_campana, estado FROM campanas_marketing WHERE id_campana = @demo_campana;
COMMIT;
*/

-- TRANSACCIÓN 7: HU-14 – Guardar una acción y cancelar un cambio de puntaje adicional
/*
START TRANSACTION;
INSERT INTO acciones_marketing(nombre_accion, puntaje, estado) VALUES(CONCAT('Acción demo ', UUID()), 20, TRUE);
SET @demo_accion = LAST_INSERT_ID();
SAVEPOINT sp_puntaje_accion;
UPDATE acciones_marketing SET puntaje = 30 WHERE id_accion = @demo_accion;
ROLLBACK TO SAVEPOINT sp_puntaje_accion;
RELEASE SAVEPOINT sp_puntaje_accion;
SELECT nombre_accion, puntaje FROM acciones_marketing WHERE id_accion = @demo_accion;
COMMIT;
*/

-- TRANSACCIÓN 8: HU-15 / HU-16 – Consultar actividades y comprobar los umbrales de calificación
/*
START TRANSACTION;
SELECT id_cliente, puntaje_otorgado, fecha_actividad FROM actividad_web ORDER BY fecha_actividad DESC LIMIT 5;
SELECT fn_calificacion(29, 'Frio') AS frio, fn_calificacion(30, 'Frio') AS tibio, fn_calificacion(70, 'Frio') AS calificado;
SELECT fn_calificacion(100, 'Cliente') AS estado_conservado;
COMMIT;
*/

-- TRANSACCIÓN 9: HU-17 – Consultar alertas pendientes y atendidas sin modificarlas
/*
START TRANSACTION;
SELECT id_alerta, id_cliente, id_vendedor, tipo_alerta, estado_alerta, fecha_atencion FROM alertas ORDER BY id_alerta LIMIT 10;
COMMIT;
*/

-- TRANSACCIÓN 10: HU-18 / HU-19 / HU-20 – Consultar plantillas y resultados de correo sin enviar mensajes
/*
START TRANSACTION;
SELECT evento, nombre_plantilla, estado FROM plantillas_correo ORDER BY id_plantilla LIMIT 5;
SELECT id_correo, evento, estado_correo, intentos FROM correos_enviados ORDER BY id_correo LIMIT 5;
COMMIT;
*/

-- TRANSACCIÓN 11: HU-21 / HU-22 / HU-25 – Consultar vendedores, asignaciones e interacciones relacionadas
/*
START TRANSACTION;
SELECT id_vendedor, nombre_vendedor, estado FROM vendedores ORDER BY id_vendedor LIMIT 5;
SELECT a.id_asignacion, a.id_cliente, a.id_vendedor, a.estado, i.id_interaccion
FROM asignaciones_crm a LEFT JOIN interacciones i ON i.id_asignacion = a.id_asignacion
ORDER BY a.id_asignacion, i.id_interaccion LIMIT 10;
COMMIT;
*/

-- TRANSACCIÓN 12: HU-23 / HU-24 – Consultar la sincronización del cliente sin conectarse a Salesforce
/*
START TRANSACTION;
SELECT c.id_cliente, c.estado_salesforce, s.estado, s.intentos
FROM clientes c LEFT JOIN salesforce_sincronizaciones s ON s.id_cliente = c.id_cliente
ORDER BY c.id_cliente, s.id_sincronizacion LIMIT 10;
COMMIT;
*/

-- TRANSACCIÓN 13: HU-26 / HU-27 / HU-28 – Cancelar un cambio de pago y deshacer toda la operación sobre la venta
/*
START TRANSACTION;
SET @demo_venta = NULL;
SELECT id_venta INTO @demo_venta FROM ventas WHERE estado_venta = 'Pendiente' ORDER BY id_venta LIMIT 1 FOR UPDATE;
SAVEPOINT sp_pago_venta;
UPDATE ventas SET metodo_pago = 'Transferencia' WHERE id_venta = @demo_venta AND estado_venta = 'Pendiente';
ROLLBACK TO SAVEPOINT sp_pago_venta;
RELEASE SAVEPOINT sp_pago_venta;
SELECT v.id_venta, v.estado_venta, v.metodo_pago, d.id_producto, d.cantidad
FROM ventas v LEFT JOIN detalle_ventas d ON d.id_venta = v.id_venta WHERE v.id_venta = @demo_venta;
ROLLBACK;
*/

-- TRANSACCIÓN 14: HU-29 / HU-30 / HU-31 – Consultar reportes y prospectos calificados en una misma lectura
/*
START TRANSACTION;
SELECT * FROM vw_reporte_ventas LIMIT 5;
SELECT * FROM vw_reporte_rendimiento_vendedores LIMIT 5;
SELECT * FROM vw_calificados LIMIT 5;
COMMIT;
*/

-- TRANSACCIÓN 15: HU-32 / HU-33 – Consultar el historial y comprobar la distribución de estados
/*
START TRANSACTION;
SELECT tabla, campo, fecha_cambio FROM auditoria_cambios ORDER BY id_auditoria DESC LIMIT 5;
SELECT estado_cliente, COUNT(*) AS clientes FROM clientes GROUP BY estado_cliente;
SELECT estado_venta, COUNT(*) AS ventas FROM ventas GROUP BY estado_venta;
COMMIT;
*/

-- =====================================================================
-- 11. Consultas
-- =====================================================================

-- CONSULTA 1: HU-01 a HU-33 – Contar los registros de las tablas principales
SELECT 'empresas' AS tabla,COUNT(*) AS registros FROM empresas
UNION ALL SELECT 'clientes',COUNT(*) FROM clientes
UNION ALL SELECT 'vendedores',COUNT(*) FROM vendedores
UNION ALL SELECT 'usuarios',COUNT(*) FROM usuarios
UNION ALL SELECT 'recuperacion_claves',COUNT(*) FROM recuperacion_claves
UNION ALL SELECT 'productos',COUNT(*) FROM productos
UNION ALL SELECT 'campanas_marketing',COUNT(*) FROM campanas_marketing
UNION ALL SELECT 'acciones_marketing',COUNT(*) FROM acciones_marketing
UNION ALL SELECT 'actividad_web',COUNT(*) FROM actividad_web
UNION ALL SELECT 'descargas_prueba',COUNT(*) FROM descargas_prueba
UNION ALL SELECT 'asignaciones_crm',COUNT(*) FROM asignaciones_crm
UNION ALL SELECT 'interacciones',COUNT(*) FROM interacciones
UNION ALL SELECT 'ventas',COUNT(*) FROM ventas
UNION ALL SELECT 'detalle_ventas',COUNT(*) FROM detalle_ventas
UNION ALL SELECT 'auditoria_cambios',COUNT(*) FROM auditoria_cambios
UNION ALL SELECT 'alertas',COUNT(*) FROM alertas
UNION ALL SELECT 'plantillas_correo',COUNT(*) FROM plantillas_correo
UNION ALL SELECT 'correos_enviados',COUNT(*) FROM correos_enviados
UNION ALL SELECT 'salesforce_sincronizaciones',COUNT(*) FROM salesforce_sincronizaciones;

-- CONSULTA 2: HU-05 / HU-16 – Contar los clientes por estado
SELECT estado_cliente,COUNT(*) AS clientes FROM clientes GROUP BY estado_cliente;

-- CONSULTA 3: HU-29 – Contar las ventas por estado
SELECT estado_venta,COUNT(*) AS ventas FROM ventas GROUP BY estado_venta;

-- CONSULTA 4: HU-29 – Mostrar diez registros del reporte de ventas
SELECT * FROM vw_reporte_ventas LIMIT 10;