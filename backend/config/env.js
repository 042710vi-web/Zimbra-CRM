import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT || 3000),
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5175',
  jwtSecret: process.env.JWT_SECRET || 'cambia-esto-por-una-clave-larga-y-segura',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  nodeEnv: process.env.NODE_ENV || 'development',
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: String(process.env.SMTP_SECURE || '').toLowerCase() === 'true',
  smtpUser: process.env.SMTP_USER || '',
  smtpPassword: process.env.SMTP_PASSWORD || '',
  smtpFrom: process.env.SMTP_FROM || process.env.SMTP_USER || '',
    salesforceLoginUrl: process.env.SALESFORCE_LOGIN_URL || '',
  salesforceClientId: process.env.SALESFORCE_CLIENT_ID || '',
  salesforceClientSecret: process.env.SALESFORCE_CLIENT_SECRET || '',
  salesforceRefreshToken: process.env.SALESFORCE_REFRESH_TOKEN || '',
  salesforceApiVersion: process.env.SALESFORCE_API_VERSION || '',
  salesforceExternalIdField:
    process.env.SALESFORCE_EXTERNAL_ID_FIELD || 'CRM_Client_Id__c',
  salesforceLeadStatus: process.env.SALESFORCE_LEAD_STATUS || '',
};
