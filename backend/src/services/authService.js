/**
 * SkillSwap - Authentication Service
 * Business logic for user registration, credential verification, and JWT generation.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const env = require('../config/env');
const ApiError = require('../utils/ApiError');

/**
 * Sign JWT Token
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN }
  );
}

/**
 * Register a new user
 */
async function registerUser({ name, email, password, location = null, bio = null, availability = 'Weekends & Evenings', is_public = 1 }) {
  // Check if user already exists
  const existingUsers = await query('SELECT id FROM users WHERE email = ? LIMIT 1', [email.toLowerCase().trim()]);
  if (existingUsers.length > 0) {
    throw ApiError.conflict('An account with this email address already exists.');
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Insert user
  const result = await query(
    'INSERT INTO users (name, email, password_hash, location, bio, availability, is_public, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [name.trim(), email.toLowerCase().trim(), passwordHash, location, bio, availability, is_public ? 1 : 0, 'user']
  );

  const newUser = {
    id: result.insertId,
    name: name.trim(),
    email: email.toLowerCase().trim(),
    role: 'user',
    location,
    bio,
    availability,
    is_public: is_public ? 1 : 0
  };

  const token = generateToken(newUser);

  return { user: newUser, token };
}

/**
 * Login user with email and password
 */
async function loginUser({ email, password }) {
  const users = await query('SELECT * FROM users WHERE email = ? LIMIT 1', [email.toLowerCase().trim()]);

  if (users.length === 0) {
    throw ApiError.unauthorized('Invalid email or password.');
  }

  const user = users[0];

  if (!user.is_active) {
    throw ApiError.forbidden('This account has been deactivated. Please contact support.');
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw ApiError.unauthorized('Invalid email or password.');
  }

  const userPayload = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar_url: user.avatar_url,
    location: user.location,
    bio: user.bio,
    availability: user.availability,
    is_public: user.is_public
  };

  const token = generateToken(userPayload);

  return { user: userPayload, token };
}

/**
 * Get profile for authenticated user
 */
async function getCurrentUser(userId) {
  const users = await query(
    'SELECT id, name, email, avatar_url, bio, location, availability, is_public, role, is_active, created_at FROM users WHERE id = ? LIMIT 1',
    [userId]
  );

  if (users.length === 0) {
    throw ApiError.notFound('User not found.');
  }

  return users[0];
}

module.exports = {
  registerUser,
  loginUser,
  getCurrentUser,
  generateToken
};
