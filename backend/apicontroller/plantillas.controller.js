import { changeEmailTemplateState, createEmailTemplate, editEmailTemplate, getTemplates } from '../service/Plantillas.service.js';
export async function list(req, res, next) { try { res.json({ data: await getTemplates() }); } catch (error) { next(error); } }
export async function create(req, res, next) { try { res.status(201).json(await createEmailTemplate(req.body)); } catch (error) { next(error); } }
export async function update(req, res, next) { try { res.json(await editEmailTemplate(req.body)); } catch (error) { next(error); } }
export async function changeState(req, res, next) { try { res.json(await changeEmailTemplateState(req.body)); } catch (error) { next(error); } }
