const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  name: { type: String, required: true, trim: true },
  category: {
    type: String,
    enum: ['Shorthair', 'Longhair'],
    default: 'Shorthair'
  },
  summary: { type: String, default: '', trim: true },
  description: { type: String, default: '', trim: true },
  image: { type: String, default: '', trim: true },
  photoSource: { type: String, default: '', trim: true },
  price: { type: Number, required: true, min: 0 },
  stock: {
    type: Number,
    required: true,
    min: 0,
    validate: Number.isInteger
  }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);