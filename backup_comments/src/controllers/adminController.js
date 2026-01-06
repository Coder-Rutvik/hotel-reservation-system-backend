const User = require('../models/mysql/User');
const Booking = require('../models/mysql/Booking');
const Room = require('../models/mysql/Room');
const Log = require('../models/mongodb/Log');
const Audit = require('../models/mongodb/Audit');

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: { exclude: ['password'] }
    });

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get all bookings
// @route   GET /api/admin/bookings
// @access  Private/Admin
const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.findAll({
      include: [
        {
          model: User,
          attributes: ['name', 'email', 'userId']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get system logs
// @route   GET /api/admin/logs
// @access  Private/Admin
const getSystemLogs = async (req, res) => {
  try {
    const { level, startDate, endDate, page = 1, limit = 50 } = req.query;
    
    let query = {};
    
    if (level) {
      query.level = level;
    }
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    const logs = await Log.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Log.countDocuments(query);
    
    res.json({
      success: true,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      total,
      data: logs
    });
  } catch (error) {
    console.error('Get logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get audit trail
// @route   GET /api/admin/audit
// @access  Private/Admin
const getAuditTrail = async (req, res) => {
  try {
    const { entity, action, startDate, endDate, page = 1, limit = 50 } = req.query;
    
    let query = {};
    
    if (entity) query.entity = entity;
    if (action) query.action = action;
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    const audits = await Audit.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await Audit.countDocuments(query);
    
    res.json({
      success: true,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
      total,
      data: audits
    });
  } catch (error) {
    console.error('Get audit error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update room
// @route   PUT /api/admin/rooms/:id
// @access  Private/Admin
const updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { roomType, basePrice, isAvailable } = req.body;
    
    const room = await Room.findByPk(id);
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    if (roomType) room.roomType = roomType;
    if (basePrice) room.basePrice = basePrice;
    if (isAvailable !== undefined) room.isAvailable = isAvailable;
    
    await room.save();
    
    // Log to audit trail
    await Audit.create({
      entity: 'Room',
      entityId: id.toString(),
      action: 'UPDATE',
      oldValue: room._previousDataValues,
      newValue: room.dataValues,
      changedBy: req.user.email,
      changedById: req.user.userId.toString(),
      ipAddress: req.ip
    });
    
    res.json({
      success: true,
      message: 'Room updated successfully',
      data: room
    });
  } catch (error) {
    console.error('Update room error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get dashboard stats
// @route   GET /api/admin/stats
// @access  Private/Admin
const getDashboardStats = async (req, res) => {
  try {
    // Get total rooms
    const totalRooms = await Room.count();
    const availableRooms = await Room.count({ where: { isAvailable: true } });
    
    // Get total bookings
    const totalBookings = await Booking.count();
    const confirmedBookings = await Booking.count({ where: { status: 'confirmed' } });
    const cancelledBookings = await Booking.count({ where: { status: 'cancelled' } });
    
    // Get total users
    const totalUsers = await User.count();
    const adminUsers = await User.count({ where: { role: 'admin' } });
    
    // Get revenue stats
    const revenueResult = await Booking.sum('totalPrice', {
      where: { status: 'confirmed', paymentStatus: 'paid' }
    });
    const totalRevenue = revenueResult || 0;
    
    // Get today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todaysBookings = await Booking.count({
      where: {
        createdAt: {
          [Sequelize.Op.gte]: today
        }
      }
    });
    
    res.json({
      success: true,
      data: {
        rooms: {
          total: totalRooms,
          available: availableRooms,
          occupied: totalRooms - availableRooms,
          occupancyRate: ((totalRooms - availableRooms) / totalRooms * 100).toFixed(2)
        },
        bookings: {
          total: totalBookings,
          confirmed: confirmedBookings,
          cancelled: cancelledBookings,
          today: todaysBookings
        },
        users: {
          total: totalUsers,
          admins: adminUsers,
          regular: totalUsers - adminUsers
        },
        revenue: {
          total: parseFloat(totalRevenue),
          formatted: `₹${parseFloat(totalRevenue).toLocaleString('en-IN')}`
        }
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getAllUsers,
  getAllBookings,
  getSystemLogs,
  getAuditTrail,
  updateRoom,
  getDashboardStats
};