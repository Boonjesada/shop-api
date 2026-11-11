const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  code: { type: String, required: true },
  name: { type: String, default: '' },
  image: { type: String, default: '' },
  quantity: { type: Number, required: true, min: 1 },
  unitPrice: { type: Number, required: true, min: 0 },
  lineTotal: { type: Number, required: true, min: 0 }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  items: { type: [orderItemSchema], required: true },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  totalPrice: { type: Number, required: true, min: 0 },
  status: {
    type: String,
    enum: ['New', 'Preparing', 'Completed'],
    default: 'New'
  }
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);