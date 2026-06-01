import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../db/pool.js';

const SALT_ROUNDS = 12;
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
};

export const register = async (req, res) => {
  const { username, password, email } = req.body;

  try {
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username already taken' });
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username',
      [username, email || null, password_hash]
    );

    const user = result.rows[0];
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, COOKIE_OPTIONS);
    res.status(201).json({ user: { id: user.id, username: user.username } });

  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const result = await pool.query(
      'SELECT id, username, password_hash FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.cookie('token', token, COOKIE_OPTIONS);
    res.json({ user: { id: user.id, username: user.username } });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const logout = (req, res) => {
  res.clearCookie('token', COOKIE_OPTIONS);
  res.json({ message: 'Logged out successfully' });
};