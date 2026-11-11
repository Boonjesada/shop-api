const router = require('express').Router();
const mongoose = require('mongoose');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const { validateProductInput, CATEGORIES } = require('../validators/product');

const MAX_PAGE_SIZE = 100;

function duplicateCode(res) {
  return res.status(409).json({ message: 'This product code is already in use.' });
}

// GET /products?page=1&limit=20&category=Shorthair
router.get('/', async (req, res, next) => {
  try {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);

    if (!Number.isInteger(page) || page < 1 ||
        !Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE) {
      return res.status(400).json({
        message: `page must be a whole number of 1 or more, and limit must be between 1 and ${MAX_PAGE_SIZE}.`
      });
    }

    const filter = {};
    if (req.query.category !== undefined) {
      if (!CATEGORIES.includes(req.query.category)) {
        return res.status(400).json({ message: `category must be one of: ${CATEGORIES.join(', ')}.` });
      }
      filter.category = req.query.category;
    }

    const [items, total] = await Promise.all([
      Product.find(filter).sort({ code: 1 }).skip((page - 1) * limit).limit(limit),
      Product.countDocuments(filter)
    ]);

    res.json({ items, page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid product ID.' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    res.json(product);
  } catch (err) {
    next(err);
  }
});

router.post('/', auth, admin, async (req, res, next) => {
  try {
    const { value, error } = validateProductInput(req.body);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const product = await Product.create(value);
    res.status(201).json(product);
  } catch (err) {
    if (err.code === 11000) return duplicateCode(res);
    next(err);
  }
});

// PUT replaces the whole product: omitted optional text fields are cleared.
router.put('/:id', auth, admin, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid product ID.' });
    }

    const { value, error } = validateProductInput(req.body);
    if (error) {
      return res.status(400).json({ message: error });
    }

    const product = await Product.findByIdAndUpdate(req.params.id, value, {
      new: true,
      runValidators: true
    });
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    res.json(product);
  } catch (err) {
    if (err.code === 11000) return duplicateCode(res);
    next(err);
  }
});

router.delete('/:id', auth, admin, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid product ID.' });
    }

    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found.' });
    }

    res.json({ message: 'Product deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
