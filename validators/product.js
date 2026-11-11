const Product = require('../models/Product');

const CATEGORIES = Product.schema.path('category').enumValues;
const TEXT_FIELDS = ['summary', 'description', 'image', 'photoSource'];

/**
 * Validates a create/replace product payload.
 * Returns { value } with normalized fields, or { error } with a readable message.
 */
function validateProductInput(body = {}) {
  const { code, name, category = 'Shorthair', price, stock } = body;
  const errors = [];

  if (typeof code !== 'string' || !code.trim()) errors.push('code is required');
  if (typeof name !== 'string' || !name.trim()) errors.push('name is required');
  if (!CATEGORIES.includes(category)) errors.push(`category must be one of: ${CATEGORIES.join(', ')}`);
  for (const field of TEXT_FIELDS) {
    if (body[field] !== undefined && typeof body[field] !== 'string') errors.push(`${field} must be text`);
  }
  if (!Number.isFinite(price) || price < 0) errors.push('price must be a number of 0 or more');
  if (!Number.isInteger(stock) || stock < 0) errors.push('stock must be a whole number of 0 or more');

  if (errors.length) {
    return { error: `Invalid product: ${errors.join('; ')}.` };
  }

  const value = {
    code: code.trim().toUpperCase(),
    name: name.trim(),
    category,
    price,
    stock
  };
  for (const field of TEXT_FIELDS) {
    value[field] = (body[field] || '').trim();
  }

  return { value };
}

module.exports = { validateProductInput, CATEGORIES };
