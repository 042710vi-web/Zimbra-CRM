import { listAudit } from '../repository/auditoria.repository.js';

export async function auditHistory(req, res, next) {
  try {
    res.json(await listAudit(req.query));
  } catch (error) {
    next(error);
  }
}