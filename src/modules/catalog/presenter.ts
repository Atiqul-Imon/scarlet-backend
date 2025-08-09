import * as repo from './repository.js';
export async function getCategories() { return repo.listCategories(); }
export async function getProducts() { return repo.listProducts(); }


