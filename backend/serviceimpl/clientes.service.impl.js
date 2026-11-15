import {
  createClient,
  findClientDetail,
  findClients,
  updateClient as saveClient,
  updateClientStatus,
  upsertPublicLead,
} from '../repository/clientes.repository.js';

import {
  CLIENT_STATES,
  optionalId,
  optionalPhone,
  optionalText,
  optionalUrl,
  pagination,
  requireEmail,
  requireId,
  requireOneOf,
  requireText,
} from '../utils/validators.js';
import { syncClientToSalesforce } from './salesforce.service.impl.js';


function cleanClientData(data = {}) {
  return {
    ...(data.id_empresa !== undefined
      ? { id_empresa: optionalId(data.id_empresa, 'La empresa') }
      : {}),
    nombre_completo: requireText(
      data.nombre_completo,
      'El nombre completo',
      150,
    ),
    correo_electronico: requireEmail(data.correo_electronico),
    telefono: optionalPhone(data.telefono),
    nombre_empresa: optionalText(
      data.nombre_empresa,
      'El nombre de la empresa',
      150,
    ),
    sector_industria: optionalText(data.sector_industria, 'El sector', 100),
    sitio_web: optionalUrl(data.sitio_web),
  };
}

// HU-04: registro manual autenticado.
export async function registerClient(data = {}) {
  const id_cliente = await createClient(cleanClientData(data));

  return {
    id_cliente,
    message: 'Cliente registrado correctamente.',
  };
}

// HU-04: formulario público de lead. Si ya existe el correo, lo actualiza.
export async function registerPublicLead(data = {}) {
  const clean = cleanClientData(data);
  const clave_rastreo = optionalText(
    data.clave_rastreo,
    'La clave de rastreo',
    64,
  );

  const id_cliente = await upsertPublicLead(clean, clave_rastreo);

  return {
    id_cliente,
    message: 'Tus datos se registraron correctamente.',
  };
}

// HU-05: búsqueda, filtros y paginación.
export async function listClients(query = {}) {
  const estado = query.estado
    ? requireOneOf(query.estado, 'El estado', CLIENT_STATES)
    : null;

  return findClients({
    q: String(query.q || '').trim(),
    estado,
    ...pagination(query),
  });
}

// HU-05: detalle e historial.
export async function getClientDetail(query = {}) {
  const id_cliente = requireId(query.id_cliente, 'El cliente');
  const result = await findClientDetail(id_cliente);

  if (!result) {
    throw Object.assign(
      new Error('El cliente indicado no existe.'),
      { status: 404 },
    );
  }

  return result;
}

// HU-05: actualizar datos de contacto, empresa y teléfono.
export async function updateClient(data = {}, user) {
  const id_cliente = requireId(data.id_cliente, 'El cliente');

  const clean = cleanClientData(data);

  await saveClient(
    {
      ...clean,
      id_cliente,
    },
    user?.email,
  );

  return {
    id_cliente,
    message: 'Cliente actualizado correctamente.',
  };
}

// HU-05: cambio de estado; al inactivar finaliza asignaciones activas.
export async function changeClientStatus(data = {}, user) {
  const id_cliente = requireId(data.id_cliente, 'El cliente');
  const estado_cliente = requireOneOf(
    data.estado_cliente,
    'El estado',
    CLIENT_STATES,
  );

  await updateClientStatus(
    { id_cliente, estado_cliente },
    user?.email,
  );
  if (['Calificado', 'Cliente', 'Convertido'].includes(estado_cliente)) {
    try {
      await syncClientToSalesforce(id_cliente);
    } catch (error) {
      // El cambio de estado se conserva aunque Salesforce no esté disponible.
      console.error('No se pudo sincronizar el cliente con Salesforce:', error.message);
    }
  }

  return {
    id_cliente,
    estado_cliente,
    message: `Estado del cliente cambiado a ${estado_cliente}.`,
  };
}