const router = require('express').Router();
const { randomUUID } = require('crypto');
const Product = require('../models/Product');
const Order = require('../models/Order');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const mongoose = require('mongoose');

router.post('/', auth, async (req, res, next) => {
  const items = req.body.items;

  if (
    !Array.isArray(items) || items.length === 0 ||
    !items.every(item =>
      item &&
      typeof item.code === 'string' &&
      item.code.trim() &&
      Number.isInteger(item.quantity) &&
      item.quantity > 0
    )
  ) {
    return res.status(400).json({ message: 'Include at least one item. Each item must have a product code and a whole-number quantity greater than 0.' });
  }

  const codes = items.map(item => item.code.trim().toUpperCase());

  if (new Set(codes).size !== codes.length) {
    return res.status(400).json({ message: 'Each product code can appear only once per order.'});
  }

  const deducted = [];

  try {
    const orderItems = [];

    for (const item of items) {
      const code = item.code.trim().toUpperCase();

      const product = await Product.findOneAndUpdate(
        { code, stock: { $gte: item.quantity } },
        { $inc: { stock: -item.quantity } }
      );

      if (!product) {
        const err = new Error(
          `Product ${code} was not found or has insufficient stock.`
        );
        err.status = 400;
        throw err;
      }

      deducted.push({
        id: product._id,
        quantity: item.quantity
      });

      orderItems.push({
        product: product._id,
        code: product.code,
        name: product.name,
        image: product.image,
        quantity: item.quantity,
        unitPrice: product.price,
        lineTotal: Math.round(product.price * item.quantity * 100) / 100
      });
    }

    const order = await Order.create({
      orderNumber: `ORD-${randomUUID()}`,
      items: orderItems,
      buyer: req.user.sub,
      totalPrice: Math.round(
        orderItems.reduce((sum, item) => sum + item.lineTotal, 0) * 100
      ) / 100
    });

    res.status(201).json(order);
  } catch (err) {
    try {
      for (const item of deducted) {
        await Product.updateOne(
          { _id: item.id },
          { $inc: { stock: item.quantity } }
        );
      }
    } catch (rollbackErr) {
      return next(rollbackErr);
    }

    if (err.status) {
      return res.status(err.status).json({ message: err.message });
    }

    next(err);
  }
});

router.get('/', auth, async (req, res, next) => {
  try {
    const filter = req.user.role === 'admin'
      ? {}
      : { buyer: req.user.sub };

    const orders = await Order.find(filter).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', auth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid order ID.' });
    }

    const filter = { _id: req.params.id };

    if (req.user.role !== 'admin') {
      filter.buyer = req.user.sub;
    }

    const order = await Order.findOne(filter);

    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    res.json(order);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/status', auth, admin, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid order ID.' });
    }

    const { status } = req.body || {};

    if (!['New', 'Preparing', 'Completed'].includes(status)) {
      return res.status(400).json({ message: 'Order status must be New, Preparing, or Completed.' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    res.json(order);
  } catch (err) {
    next(err);
  }
});

module.exports = router;