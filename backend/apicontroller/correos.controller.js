import { getEmails, retryFailedEmail } from '../service/Correos.service.js';
export async function list(req, res, next) { try { res.json(await getEmails(req.query)); } catch (error) { next(error); } }
export async function retry(req, res, next) { try { res.json(await retryFailedEmail(req.body)); } catch (error) { next(error); } }
