import { ok } from '../../core/http/response.js';
import * as presenter from './presenter.js';

export async function categories(_req: any, res: any) { ok(res, await presenter.getCategories()); }
export async function products(_req: any, res: any) { ok(res, await presenter.getProducts()); }


