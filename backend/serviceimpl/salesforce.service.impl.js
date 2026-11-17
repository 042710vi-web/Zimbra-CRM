import { env } from '../config/env.js';
import {
  createSyncAttempt,
  findClientForSalesforce,
  findSyncAttempt,
  listSyncAttempts,
  markSyncFailure,
  markSyncSuccess,
} from '../repository/salesforce.repository.js';

function configurationError() {
  const missing = [
    ['SALESFORCE_LOGIN_URL', env.salesforceLoginUrl],
    ['SALESFORCE_CLIENT_ID', env.salesforceClientId],
    ['SALESFORCE_CLIENT_SECRET', env.salesforceClientSecret],
    ['SALESFORCE_REFRESH_TOKEN', env.salesforceRefreshToken],
    ['SALESFORCE_API_VERSION', env.salesforceApiVersion],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);

  if (missing.length) {
    throw Object.assign(
      new Error(`Falta configurar: ${missing.join(', ')}`),
      { status: 500 },
    );
  }
}

async function getSalesforceAccess() {
  configurationError();

  const response = await fetch(
    `${env.salesforceLoginUrl.replace(/\/$/, '')}/services/oauth2/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: env.salesforceClientId,
        client_secret: env.salesforceClientSecret,
        refresh_token: env.salesforceRefreshToken,
      }),
    },
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.access_token || !data.instance_url) {
    throw new Error(
      data.error_description || data.message || 'Salesforce rechazó la autenticación.',
    );
  }

  return data;
}

function lastNameFrom(fullName = '') {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : 'Sin apellido';
}

function recordForSalesforce(client, objeto_salesforce) {
  const externalField = env.salesforceExternalIdField;

  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(externalField)) {
    throw new Error('El nombre del campo External ID de Salesforce no es válido.');
  }

  const common = {
    [externalField]: String(client.id_cliente),
    LastName: lastNameFrom(client.nombre_completo),
    Email: client.correo_electronico,
    Phone: client.telefono || undefined,
  };

  if (objeto_salesforce === 'Lead') {
    return {
      ...common,
      Company: client.nombre_empresa || 'Zimbra CRM',
      ...(env.salesforceLeadStatus ? { Status: env.salesforceLeadStatus } : {}),
    };
  }

  return common;
}

async function runSync(id_cliente) {
  const client = await findClientForSalesforce(id_cliente);

  if (!client) {
    throw Object.assign(new Error('El cliente no existe.'), { status: 404 });
  }

  const estado = String(client.estado_cliente || '').toLowerCase();
  const objeto_salesforce =
    estado === 'cliente' || estado === 'convertido' ? 'Contact' : 'Lead';

  const attempt = await createSyncAttempt({ id_cliente, objeto_salesforce });

  try {
    const access = await getSalesforceAccess();
    const field = encodeURIComponent(env.salesforceExternalIdField);
    const externalValue = encodeURIComponent(String(client.id_cliente));
    const url =
      `${access.instance_url}/services/data/${env.salesforceApiVersion}` +
      `/sobjects/${objeto_salesforce}/${field}/${externalValue}`;

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${access.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(recordForSalesforce(client, objeto_salesforce)),
    });

    const responseText = await response.text();
    const result = responseText ? JSON.parse(responseText) : {};

    if (!response.ok) {
      throw new Error(
        Array.isArray(result)
          ? result.map((item) => item.message).join('; ')
          : result.message || `Salesforce respondió ${response.status}.`,
      );
    }

    await markSyncSuccess({
      id_sincronizacion: attempt.id_sincronizacion,
      salesforce_id: result.id || null,
    });

    return {
      id_sincronizacion: attempt.id_sincronizacion,
      id_cliente,
      objeto_salesforce,
      estado: 'Sincronizado',
      salesforce: result,
    };
  } catch (error) {
    await markSyncFailure({
      id_sincronizacion: attempt.id_sincronizacion,
      mensaje_error: error.message,
    });
    throw Object.assign(
      new Error(`Falló la sincronización. Quedó guardada para reintentar: ${error.message}`),
      { status: 502 },
    );
  }
}

export async function syncClientToSalesforce(id_cliente) {
  return runSync(Number(id_cliente));
}

export async function retrySalesforceSync(id_sincronizacion) {
  const attempt = await findSyncAttempt(Number(id_sincronizacion));

  if (!attempt) {
    throw Object.assign(new Error('El intento de sincronización no existe.'), {
      status: 404,
    });
  }

  return runSync(Number(attempt.id_cliente));
}

export async function getSalesforceSyncHistory(query = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  const estado = query.estado ? String(query.estado).slice(0, 20) : undefined;

  return listSyncAttempts({ page, limit, estado });
}