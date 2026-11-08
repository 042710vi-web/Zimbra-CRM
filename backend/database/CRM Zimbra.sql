DROP DATABASE IF EXISTS zimbra_bd;
CREATE DATABASE zimbra_bd;
USE zimbra_bd;
SET NAMES utf8mb4;

/* Almacena la información de la empresa a las que pertenecen los clientes. */
CREATE TABLE empresas (
    id_empresa INT AUTO_INCREMENT PRIMARY KEY,
    nombre_empresa VARCHAR(150) NOT NULL UNIQUE,
    sector_industria VARCHAR(100),
    sitio_web VARCHAR(150)
);

/* Registra la información personal de los visitantes, su estado de
   calificación y puntaje acumulado (Laudon & Laudon, 2012). */
CREATE TABLE clientes (
    id_cliente INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT,
    nombre_completo VARCHAR(150) NOT NULL,
    correo_electronico VARCHAR(100) NOT NULL UNIQUE,
    telefono VARCHAR(50),
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    puntaje_total INT DEFAULT 0,
    estado_cliente VARCHAR(50) DEFAULT 'Frio',
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
   recuperación de contraseñas (HU-01, RNF04). */
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
    CONSTRAINT chk_tipo_licencia CHECK (tipo_licencia IN ('Gratuita','Prueba 60 dias','Comercial')),
    CONSTRAINT chk_precio CHECK (precio >= 0)
);

/* Registra las distintas iniciativas de marketing diseñadas para atraer
   tráfico con control de fechas (HU-16). */
CREATE TABLE campanas_marketing (
    id_campana INT AUTO_INCREMENT PRIMARY KEY,
    nombre_campana VARCHAR(150) NOT NULL UNIQUE,
    descripcion TEXT,
    presupuesto DECIMAL(12,2),
    fecha_inicio DATE,
    fecha_fin DATE,
    estado VARCHAR(20) DEFAULT 'Activa',
    CONSTRAINT chk_estado_campana CHECK (estado IN ('Activa','Inactiva')),
    CONSTRAINT chk_fechas_campana CHECK (fecha_fin >= fecha_inicio)
);

/* Catálogo de acciones rastreables y el puntaje asignado a cada una
   (HU-19, modelo de Lead Scoring). */
CREATE TABLE acciones_marketing (
    id_accion INT AUTO_INCREMENT PRIMARY KEY,
    nombre_accion VARCHAR(100) NOT NULL UNIQUE,
    puntaje INT NOT NULL,
    estado BOOLEAN DEFAULT TRUE,
    CONSTRAINT chk_puntaje_positivo CHECK (puntaje >= 0)
);

/* Registra cada interacción o evento que un cliente realiza dentro del
   sitio web (HU-20). */
CREATE TABLE actividad_web (
    id_actividad INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT NOT NULL,
    id_accion INT NOT NULL,
    id_campana INT,
    fecha_actividad DATETIME DEFAULT CURRENT_TIMESTAMP,
    detalle VARCHAR(255),
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente),
    FOREIGN KEY (id_accion) REFERENCES acciones_marketing(id_accion),
    FOREIGN KEY (id_campana) REFERENCES campanas_marketing(id_campana)
);

/* Controla las descargas de las versiones de prueba y sus respectivas
   fechas de vencimiento (HU-13, HU-15). */
CREATE TABLE descargas_prueba (
    id_descarga INT AUTO_INCREMENT PRIMARY KEY,
    id_cliente INT NOT NULL,
    id_producto INT NOT NULL,
    fecha_inicio DATE DEFAULT (CURRENT_DATE),
    fecha_fin DATE NOT NULL,
    estado_prueba VARCHAR(30) DEFAULT 'Activa',
    CONSTRAINT chk_estado_prueba CHECK (estado_prueba IN ('Activa','Vencida','Cancelada','Convertida')),
    FOREIGN KEY (id_cliente) REFERENCES clientes(id_cliente),
    FOREIGN KEY (id_producto) REFERENCES productos(id_producto)
);

/* Gestiona la asignación histórica y actual de los clientes a los
   vendedores (HU-23, HU-25). */
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
   comerciales con los clientes (HU-26). */
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

/* Almacena la información general de cada contrato, método de pago y
   el total consolidado (HU-28). */
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

/* Detalla los productos específicos, cantidades, precios y subtotales
   acordados en cada venta (HU-28). */
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

/* Conserva la trazabilidad histórica de los cambios (HU-35). */
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

/* ---------------------------------------------------------------------
2. DATOS SIMULADOS (mínimo 30 registros por tabla)
Criterios:
- clientes: 35 registros (reducido para no saturar el script).
- actividad_web: 150 registros (reducido de 532).
- El resto de tablas: 30 registros cada una.
- Las llaves foráneas se respetan en el orden de inserción.
--------------------------------------------------------------------- */

-- 2.1 empresas (30)
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

-- 2.2 vendedores (30)
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

-- 2.3 usuarios (30)
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

-- 2.4 productos (30)
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

-- 2.5 campanas_marketing (30)
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

-- 2.6 acciones_marketing (30)
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

-- 2.7 clientes (35) – reducido de 60 a 35 para no saturar el script
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

-- 2.8 actividad_web (150) – reducido de 532 a 150 para que el script sea manejable
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

-- 2.9 descargas_prueba (30)
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

-- 2.10 asignaciones_crm (30)
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

-- 2.11 interacciones (30)
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

-- 2.12 ventas (30)
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

-- 2.13 detalle_ventas (30)
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

-- 2.14 recuperacion_claves (30)
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

-- 2.15 auditoria_cambios (30)
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

-- Ajuste: total_venta de cada venta = suma de su detalle (los datos simulados no cuadraban)
UPDATE ventas v SET total_venta = (SELECT SUM(d.subtotal) FROM detalle_ventas d WHERE d.id_venta = v.id_venta);

/* ================= TRANSACCIONES ACID ================= */
-- Transacción 1: HU-28 | POST /api/sales | Venta con SAVEPOINT
START TRANSACTION;
INSERT INTO ventas (id_venta, id_cliente, id_vendedor, estado_venta, metodo_pago, total_venta) VALUES (31, 5, 12, 'Pendiente', 'Transferencia', 0);
INSERT INTO detalle_ventas (id_venta, id_producto, cantidad, precio_unitario, subtotal) VALUES (31, 15, 5, 160000, 800000);
SAVEPOINT item1_registrado;
INSERT INTO detalle_ventas (id_venta, id_producto, cantidad, precio_unitario, subtotal) VALUES (31, 20, 3, 110000, 330000);
SAVEPOINT item2_registrado;
INSERT INTO detalle_ventas (id_venta, id_producto, cantidad, precio_unitario, subtotal) VALUES (31, 24, 2, 480000, 960000);
ROLLBACK TO SAVEPOINT item2_registrado;
UPDATE ventas SET total_venta = (SELECT SUM(subtotal) FROM detalle_ventas WHERE id_venta = 31) WHERE id_venta = 31;
INSERT INTO auditoria_cambios (tabla, id_registro, campo, valor_anterior, valor_nuevo, usuario_bd) VALUES ('ventas', 31, 'estado_venta', NULL, 'Pendiente', CURRENT_USER());
COMMIT;

-- Transacción 2: HU-25 | POST /api/assignments/reasignar | Reasignar cliente (ROLLBACK completo)
START TRANSACTION;
UPDATE asignaciones_crm SET estado = 'Finalizada', fecha_fin = NOW() WHERE id_cliente = 19 AND estado = 'Activa';
INSERT INTO asignaciones_crm (id_cliente, id_vendedor, estado) VALUES (19, 29, 'Activa');
ROLLBACK;

-- Transacción 3: HU-31 | POST /api/sales/cambiar-estado | Convertir prueba (ROLLBACK completo)
START TRANSACTION;
UPDATE descargas_prueba SET estado_prueba = 'Convertida' WHERE id_descarga = 2 AND estado_prueba = 'Activa';
ROLLBACK;

-- Transacción 4: HU-05 | POST /api/clients | Cliente con empresa (ROLLBACK completo)
START TRANSACTION;
INSERT INTO empresas (id_empresa, nombre_empresa, sector_industria, sitio_web) VALUES (31, 'Empresa Prueba SAS','Tecnología','https://www.empresaprueba.co');
INSERT INTO clientes (id_empresa, nombre_completo, correo_electronico, telefono) VALUES (31, 'Cliente Nuevo Prueba', 'cliente.nuevo.prueba@empresaprueba.co', '+57 300 000 0000');
ROLLBACK;

-- Transacción 5: HU-13 | POST /api/trials | Registrar descarga (COMMIT)
START TRANSACTION;
INSERT INTO descargas_prueba (id_cliente, id_producto, fecha_inicio, fecha_fin, estado_prueba) VALUES (1, 4, CURRENT_DATE, DATE_ADD(CURRENT_DATE, INTERVAL 60 DAY), 'Activa');
COMMIT;

-- Transacción 6: HU-26 | POST /api/interactions | Registrar interacción (COMMIT)
START TRANSACTION;
INSERT INTO interacciones (id_asignacion, tipo_interaccion, resultado, notas) VALUES (1, 'Llamada', 'Interesado', 'Llamada de seguimiento: cliente interesado.');
COMMIT;

-- Transacción 7: HU-08 | POST /api/clients/cambiar-estado | Cambiar estado (SAVEPOINT parcial)
START TRANSACTION;
UPDATE clientes SET estado_cliente = 'Inactivo' WHERE id_cliente = 35;
SAVEPOINT estado_cambiado;
UPDATE asignaciones_crm SET estado = 'Finalizada', fecha_fin = NOW() WHERE id_cliente = 35 AND estado = 'Activa';
ROLLBACK TO SAVEPOINT estado_cambiado;
INSERT INTO auditoria_cambios (tabla, id_registro, campo, valor_anterior, valor_nuevo, usuario_bd) VALUES ('clientes', 35, 'estado_cliente', 'Frio', 'Inactivo', CURRENT_USER());
COMMIT;

-- Transacción 8: HU-16 | POST /api/campaigns | Crear campaña (ROLLBACK completo)
START TRANSACTION;
INSERT INTO campanas_marketing (nombre_campana, descripcion, presupuesto, fecha_inicio, fecha_fin, estado) VALUES ('Campaña Fechas Malas', 'Campaña de prueba con fechas incorrectas.', 10000000, '2026-12-31', '2026-01-01', 'Activa');
ROLLBACK;

-- Transacción 9: HU-23 | POST /api/assignments | Asignar cliente (ROLLBACK completo)
START TRANSACTION;
INSERT INTO asignaciones_crm (id_cliente, id_vendedor, estado) VALUES (2, 15, 'Activa');
ROLLBACK;

-- Transacción 10: HU-30 | POST /api/sales/actualizar | Editar venta (ROLLBACK completo)
START TRANSACTION;
UPDATE ventas SET metodo_pago = 'Tarjeta de crédito' WHERE id_venta = 1 AND estado_venta = 'Pendiente';
ROLLBACK;

/* ================= SIMULACIÓN DE ERRORES ================= */
-- Error 1: HU-28 | POST /api/sales | Producto inexistente (falla -> ROLLBACK)
START TRANSACTION;
INSERT INTO ventas (id_venta, id_cliente, id_vendedor, estado_venta, metodo_pago, total_venta) VALUES (32, 5, 12, 'Pendiente', 'PSE', 0);
INSERT INTO detalle_ventas (id_venta, id_producto, cantidad, precio_unitario, subtotal) VALUES (32, 99999, 2, 100000, 200000);
ROLLBACK;

-- Error 2: HU-28 | POST /api/sales | Cantidad inválida (falla -> ROLLBACK TO SAVEPOINT y COMMIT)
START TRANSACTION;
INSERT INTO ventas (id_venta, id_cliente, id_vendedor, estado_venta, metodo_pago, total_venta) VALUES (33, 5, 12, 'Pendiente', 'Transferencia', 0);
INSERT INTO detalle_ventas (id_venta, id_producto, cantidad, precio_unitario, subtotal) VALUES (33, 11, 4, 85000, 340000);
SAVEPOINT item_valido;
INSERT INTO detalle_ventas (id_venta, id_producto, cantidad, precio_unitario, subtotal) VALUES (33, 11, 0, 85000, 0);
ROLLBACK TO SAVEPOINT item_valido;
UPDATE ventas SET total_venta = (SELECT SUM(subtotal) FROM detalle_ventas WHERE id_venta = 33) WHERE id_venta = 33;
COMMIT;

-- Error 3: HU-05 | POST /api/clients | Correo duplicado (falla -> ROLLBACK)
START TRANSACTION;
INSERT INTO empresas (id_empresa, nombre_empresa, sector_industria, sitio_web) VALUES (31, 'Empresa Prueba Rollback SAS', 'Tecnología', 'https://www.empresaprueba.co');
INSERT INTO clientes (id_empresa, nombre_completo, correo_electronico, telefono) VALUES (31, 'Cliente Duplicado Prueba', 'tatiana.ospina25@grupodigital.co', '+57 300 000 0000');
ROLLBACK;

/* ================= VERIFICACIÓN ================= */
SELECT 'empresas' AS tabla, COUNT(*) AS registros FROM empresas
UNION ALL SELECT 'clientes', COUNT(*) FROM clientes
UNION ALL SELECT 'vendedores', COUNT(*) FROM vendedores
UNION ALL SELECT 'usuarios', COUNT(*) FROM usuarios
UNION ALL SELECT 'recuperacion_claves', COUNT(*) FROM recuperacion_claves
UNION ALL SELECT 'productos', COUNT(*) FROM productos
UNION ALL SELECT 'campanas_marketing', COUNT(*) FROM campanas_marketing
UNION ALL SELECT 'acciones_marketing', COUNT(*) FROM acciones_marketing
UNION ALL SELECT 'actividad_web', COUNT(*) FROM actividad_web
UNION ALL SELECT 'descargas_prueba', COUNT(*) FROM descargas_prueba
UNION ALL SELECT 'asignaciones_crm', COUNT(*) FROM asignaciones_crm
UNION ALL SELECT 'interacciones', COUNT(*) FROM interacciones
UNION ALL SELECT 'ventas', COUNT(*) FROM ventas
UNION ALL SELECT 'detalle_ventas', COUNT(*) FROM detalle_ventas
UNION ALL SELECT 'auditoria_cambios', COUNT(*) FROM auditoria_cambios;