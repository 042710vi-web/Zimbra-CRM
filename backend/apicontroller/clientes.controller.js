import * as clients from '../service/clientes.service.js';

export async function create(req, res, next) {
  try {
    res.status(201).json(await clients.registerClient(req.body));
  } catch (error) {
    next(error);
  }
}

export async function createPublicLead(req, res, next) {
  try {
    res.status(201).json(await clients.registerPublicLead(req.body));
  } catch (error) {
    next(error);
  }
}

export async function list(req, res, next) {
  try {
    res.json(await clients.listClients(req.query));
  } catch (error) {
    next(error);
  }
}

export async function detail(req, res, next) {
  try {
    res.json(await clients.getClientDetail(req.query));
  } catch (error) {
    next(error);
  }
}

export async function update(req, res, next) {
  try {
    res.json(await clients.updateClient(req.body, req.user));
  } catch (error) {
    next(error);
  }
}

export async function changeStatus(req, res, next) {
  try {
    res.json(await clients.changeClientStatus(req.body, req.user));
  } catch (error) {
    next(error);
  }
}