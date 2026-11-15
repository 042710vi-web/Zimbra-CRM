import {
  getSalesforceSyncHistory,
  retrySalesforceSync,
  syncClientToSalesforce,
} from '../serviceimpl/salesforce.service.impl.js';

export async function syncClient(req, res, next) {
  try {
    const result = await syncClientToSalesforce(req.body.id_cliente);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function retrySync(req, res, next) {
  try {
    const result = await retrySalesforceSync(req.body.id_sincronizacion);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function syncHistory(req, res, next) {
  try {
    res.json(await getSalesforceSyncHistory(req.query));
  } catch (error) {
    next(error);
  }
}