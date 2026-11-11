const router = require('express').Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const bcrypt = require('bcrypt');
const { MIN_PASSWORD_LENGTH } = require('../validators/user');

const PROFILE_TEXT_FIELDS = ['username', 'firstName', 'lastName', 'gender'];

router.get('/', auth, admin, async (req, res, next) => {
  try {
    res.json(await User.find());
  } catch (err) {
    next(err);
  }
});

router.post('/', auth, admin, async (req, res, next) => {
  try {
    const { password, firstName, lastName, gender, age } = req.body;
    const username = typeof req.body.username === 'string'
      ? req.body.username.trim().toLowerCase() : '';
    const role = req.body.role || 'user';

    if (!username || typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH ||
        !firstName || !lastName || !gender || !Number.isInteger(age) || age < 0 ||
        role !== 'user') {
      return res.status(400).json({
        message: `All fields are required. Password must contain at least ${MIN_PASSWORD_LENGTH} characters. Age must be a whole number of 0 or more. Role must be user.`
      });
    }

    const user = await User.create({
      username,
      passwordHash: await bcrypt.hash(password, 12),
      firstName, lastName, gender, age, role
    });

    res.status(201).json({ id: user.id, username: user.username, role: user.role });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Username is already taken.' });
    }
    next(err);
  }
});

router.get('/:id', auth, async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid user ID.' });
  }

  if (req.user.role !== 'admin' && req.user.sub !== id) {
    return res.status(403).json({ message: 'You do not have permission to view this user.' });
  }

  try {
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', auth, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user ID.' });
    }
    if (req.user.role !== 'admin' && req.user.sub !== req.params.id) {
      return res.status(403).json({ message: 'You can only update your own account.' });
    }

    const updatingOwnAccount = req.user.sub === req.params.id;
    const user = updatingOwnAccount
      ? await User.findById(req.params.id).select('+passwordHash')
      : await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (req.user.role === 'admin' && !updatingOwnAccount && user.role !== 'user') {
      return res.status(403).json({ message: 'Admin accounts cannot be edited here.' });
    }

    if (updatingOwnAccount) {
      const allowed = ['username', 'firstName', 'lastName', 'gender', 'age', 'password', 'currentPassword'];
      const fields = Object.keys(req.body);
      if (!fields.length || fields.every(field => field === 'currentPassword') ||
          fields.some(field => !allowed.includes(field))) {
        return res.status(400).json({ message: 'Invalid profile fields.' });
      }
      if (PROFILE_TEXT_FIELDS.some(field =>
        fields.includes(field) && (typeof req.body[field] !== 'string' || !req.body[field].trim()))) {
        return res.status(400).json({ message: 'Username, name, and gender cannot be empty.' });
      }
      if (fields.includes('age') && (!Number.isInteger(req.body.age) || req.body.age < 0)) {
        return res.status(400).json({ message: 'Age must be a whole number of 0 or more.' });
      }
      if (fields.includes('password') && (typeof req.body.password !== 'string' || req.body.password.length < MIN_PASSWORD_LENGTH)) {
        return res.status(400).json({ message: `New password must contain at least ${MIN_PASSWORD_LENGTH} characters.` });
      }
      const username = fields.includes('username') ? req.body.username.trim().toLowerCase() : user.username;
      if (fields.includes('password')) {
        if (typeof req.body.currentPassword !== 'string' ||
            !(await bcrypt.compare(req.body.currentPassword, user.passwordHash))) {
          return res.status(400).json({ message: 'Current password is incorrect.' });
        }
      }
      for (const field of fields) {
        if (['username', 'password', 'currentPassword'].includes(field)) continue;
        user[field] = typeof req.body[field] === 'string'
          ? req.body[field].trim()
          : req.body[field];
      }
      if (fields.includes('username')) user.username = username;
      if (fields.includes('password')) user.passwordHash = await bcrypt.hash(req.body.password, 12);
      await user.save();
      return res.json(await User.findById(user.id));
    }

    const { username, firstName, lastName, gender, age, role, password } = req.body;

    if (role !== undefined) {
      return res.status(400).json({ message: 'Role cannot be changed.' });
    }
    if (PROFILE_TEXT_FIELDS.some(field =>
      req.body[field] !== undefined && (typeof req.body[field] !== 'string' || !req.body[field].trim()))) {
      return res.status(400).json({ message: 'Username, name, and gender must be non-empty text.' });
    }
    if (age !== undefined && (!Number.isInteger(age) || age < 0)) {
      return res.status(400).json({ message: 'Age must be a whole number of 0 or more.' });
    }
    if (password !== undefined && (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH)) {
      return res.status(400).json({ message: `Password must contain at least ${MIN_PASSWORD_LENGTH} characters.` });
    }

    if (username !== undefined) user.username = username.trim().toLowerCase();
    if (firstName !== undefined) user.firstName = firstName.trim();
    if (lastName !== undefined) user.lastName = lastName.trim();
    if (gender !== undefined) user.gender = gender.trim();
    if (age !== undefined) user.age = age;
    if (password !== undefined) user.passwordHash = await bcrypt.hash(password, 12);

    await user.save();
    res.json(await User.findById(user.id));
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'Username is already taken.' });
    }
    next(err);
  }
});

router.delete('/:id', auth, admin, async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user ID.' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found.' });
    if (user.role !== 'user' || user.id === req.user.sub) {
      return res.status(403).json({ message: 'Admin accounts cannot be deleted here.' });
    }

    await User.findByIdAndDelete(user.id);

    res.json({ message: 'User deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
