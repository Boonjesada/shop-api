const router = require('express').Router();
const bcrypt = require('bcrypt');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const config = require('../config');
const { MIN_PASSWORD_LENGTH } = require('../validators/user');

router.post('/register', async (req, res, next) => {
  try {
    const { password, firstName, lastName, gender, age } = req.body;
    const username = req.body.username?.trim().toLowerCase();

    if (!username || typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH ||
        !firstName || !lastName || !gender || !Number.isInteger(age) || age < 0) {
      return res.status(400).json({
        message: `All fields are required. Password must contain at least ${MIN_PASSWORD_LENGTH} characters. Age must be a whole number of 0 or more.`
      });
    }

    const user = await User.create({
      username,
      passwordHash: await bcrypt.hash(password, 12),
      firstName,
      lastName,
      gender,
      age,
      role: 'user'
    });

    res.status(201).json({ id: user.id, username: user.username, role: user.role });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Username is already taken.' });
    }
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Please provide both username and password.' });
    }

    const user = await User.findOne({
      username: username.trim().toLowerCase()
    }).select('+passwordHash');

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ message: 'Invalid username or password.' });
    }

    const token = jwt.sign(
      {},
      config.jwtSecret,
      { subject: user.id, expiresIn: config.jwtExpiresIn, algorithm: 'HS256' }
    );

    res.json({ token });
  } catch (err) {
    next(err);
  }
});

router.get('/me', auth, (req, res) => {
  res.json({ userId: req.user.sub, role: req.user.role });
});

module.exports = router;
