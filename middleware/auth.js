const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const config = require('../config');

module.exports = async (req, res, next) => {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Bearer token is required.' });
  }

  let payload;
  try {
    payload = jwt.verify(header.slice(7), config.jwtSecret, {
      algorithms: ['HS256']
    });
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }

  if (!payload || typeof payload.exp !== 'number' || !mongoose.isValidObjectId(payload.sub)) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }

  try {
    const user = await User.findById(payload.sub).select('role');
    if (!user) return res.status(401).json({ message: 'Account no longer exists.' });
    req.user = { sub: user.id, role: user.role };
    next();
  } catch (err) {
    next(err);
  }
};
