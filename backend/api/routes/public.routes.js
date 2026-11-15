import { Router } from 'express';
import { createPublicLead } from '../../apicontroller/clientes.controller.js';

const router = Router();

router.post('/leads', createPublicLead);

export default router;