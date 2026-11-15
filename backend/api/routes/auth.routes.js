import { Router } from 'express';
import {
  login,
  logout,
  requestReset,
  resetPassword,
} from '../../apicontroller/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { loginAttemptLimiter } from '../middleware/login-attempt.middleware.js';

const router = Router();

router.post('/login', loginAttemptLimiter, login);
router.post('/logout', authenticate, logout);
router.post('/recuperar', requestReset);
router.post('/restablecer', resetPassword);

export default router;