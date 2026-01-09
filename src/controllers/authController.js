// src/controllers/authController.js - ULTIMATE FIX
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../config/database'); // ✅ Use sequelize directly

// ✅ IMPORTANT: Direct User model import
const User = require('../models/User');

// Emergency table creation function
const ensureUsersTable = async () => {
  try {
    console.log('🔍 Checking users table...');
    
    // Check if users table exists
    const checkQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      ) as table_exists;
    `;
    
    const [result] = await sequelize.query(checkQuery);
    const tableExists = result[0].table_exists;
    
    if (!tableExists) {
      console.log('🚨 EMERGENCY: Users table not found! Creating...');
      
      // Create users table
      const createTableSQL = `
        CREATE TABLE users (
          user_id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          phone VARCHAR(20),
          role VARCHAR(10) DEFAULT 'user',
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX idx_users_email ON users(email);
      `;
      
      await sequelize.query(createTableSQL);
      console.log('✅ Users table created successfully!');
      return true;
    }
    
    console.log('✅ Users table exists');
    return true;
  } catch (error) {
    console.error('❌ Table check failed:', error.message);
    
    // Ultimate fallback
    try {
      const simpleSQL = `
        CREATE TABLE IF NOT EXISTS users (
          user_id SERIAL PRIMARY KEY,
          name TEXT,
          email TEXT UNIQUE,
          password TEXT,
          phone TEXT,
          role TEXT DEFAULT 'user',
          created_at TIMESTAMP DEFAULT NOW()
        )
      `;
      await sequelize.query(simpleSQL);
      console.log('✅ Created basic users table');
      return true;
    } catch (finalError) {
      console.error('❌ All attempts failed:', finalError.message);
      return false;
    }
  }
};

// Helper function to retry database operations
const retryOperation = async (operation, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error.message);
      
      // If table doesn't exist, create it
      if (error.message.includes('relation "users" does not exist') || error.code === '42P01') {
        console.log('🔄 Users table missing. Creating...');
        await ensureUsersTable();
      }
      
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
};

// Helper to convert JWT_EXPIRE string to valid format
const getJWTExpiresIn = () => {
  const expire = process.env.JWT_EXPIRE || '7d';
  if (!isNaN(expire)) return parseInt(expire);
  if (expire.endsWith('d')) return expire;
  if (expire.endsWith('h')) return expire;
  return '7d';
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email and password'
      });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email'
      });
    }

    // ✅ FIRST: Ensure users table exists
    await ensureUsersTable();

    // Check if user exists
    const existingUser = await retryOperation(async () => {
      return await User.findOne({ where: { email } });
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Create user
    const user = await retryOperation(async () => {
      return await User.create({
        name,
        email,
        password,
        phone,
        role: 'user'
      });
    });

    // Create token
    const token = jwt.sign(
      { id: user.userId, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: getJWTExpiresIn() }
    );

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      data: userResponse
    });
  } catch (error) {
    console.error('Register error:', error);

    // Specific error messages
    let errorMessage = 'Server error';
    if (error.name === 'SequelizeUniqueConstraintError') {
      errorMessage = 'Email already exists';
    } else if (error.name === 'SequelizeValidationError') {
      errorMessage = error.errors.map(e => e.message).join(', ');
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // ✅ FIRST: Ensure users table exists
    await ensureUsersTable();

    // Check if user exists
    const user = await retryOperation(async () => {
      return await User.findOne({ where: { email } });
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Create token
    const token = jwt.sign(
      { id: user.userId, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: getJWTExpiresIn() }
    );

    // Remove password from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    res.json({
      success: true,
      message: 'Login successful',
      token,
      data: userResponse
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Other functions remain same...
// getMe, updateProfile, changePassword

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
  ensureUsersTable // Export if needed
};