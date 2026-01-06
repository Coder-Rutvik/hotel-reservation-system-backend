const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

class Helpers {
  // Generate unique ID
  static generateId(length = 8) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Format date
  static formatDate(date, format = 'YYYY-MM-DD') {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    
    switch (format) {
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      default:
        return `${year}-${month}-${day}`;
    }
  }

  // Format currency
  static formatCurrency(amount, currency = 'INR') {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency
    }).format(amount);
  }

  // Calculate days between dates
  static daysBetween(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDiff = end.getTime() - start.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  // Validate email
  static isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Validate phone number (Indian format)
  static isValidPhone(phone) {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(phone);
  }

  // Generate random number in range
  static randomInRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Slugify string
  static slugify(text) {
    return text
      .toString()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-+/, '')
      .replace(/-+$/, '');
  }

  // Truncate string
  static truncate(str, length = 100) {
    if (str.length <= length) return str;
    return str.substring(0, length) + '...';
  }

  // Deep clone object
  static deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // Check if object is empty
  static isEmpty(obj) {
    return Object.keys(obj).length === 0;
  }

  // Delay function
  static delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Generate file hash
  static async generateFileHash(filePath) {
    return new Promise((resolve, reject) => {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      
      stream.on('data', data => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  // Sanitize input
  static sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // Parse JSON safely
  static safeJsonParse(str, defaultValue = {}) {
    try {
      return JSON.parse(str);
    } catch {
      return defaultValue;
    }
  }

  // Get file extension
  static getFileExtension(filename) {
    return path.extname(filename).toLowerCase();
  }

  // Check if file is image
  static isImageFile(filename) {
    const ext = this.getFileExtension(filename);
    return ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'].includes(ext);
  }

  // Calculate travel time (helper for algorithm)
  static calculateTravelTime(rooms) {
    if (rooms.length <= 1) return 0;
    
    const positions = rooms.map(r => r.position).sort((a, b) => a - b);
    const floors = [...new Set(rooms.map(r => r.floor))].sort((a, b) => a - b);
    
    const horizontalTime = positions[positions.length - 1] - positions[0];
    const verticalTime = (floors[floors.length - 1] - floors[0]) * 2;
    
    return horizontalTime + verticalTime;
  }

  // Generate booking reference number
  static generateBookingReference() {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    return `HR${year}${month}${random}`;
  }

  // Format travel time for display
  static formatTravelTime(minutes) {
    if (minutes < 60) {
      return `${minutes} minutes`;
    } else {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins > 0 ? `${mins}m` : ''}`.trim();
    }
  }

  // Validate date range
  static isValidDateRange(startDate, endDate, minNights = 1, maxNights = 30) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (start < today) return false;
    if (end <= start) return false;

    const nights = this.daysBetween(start, end);
    return nights >= minNights && nights <= maxNights;
  }
}

module.exports = Helpers;