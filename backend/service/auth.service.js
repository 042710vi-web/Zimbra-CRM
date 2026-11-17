/**
 * Presenta las operaciones que otras partes del sistema pueden utilizar para gestionar auth.
 */
export { login, logout, requestPasswordReset, resetPassword } from '../serviceimpl/Auth.service.impl.js';
import { env } from '../config/env.js';
import {
  canSendEmail,
  sendPasswordRecoveryEmail,
} from '../service/Email.service.js';