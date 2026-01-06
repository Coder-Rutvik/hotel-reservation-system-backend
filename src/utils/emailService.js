const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendEmail(to, subject, html, attachments = []) {
    try {
      const mailOptions = {
        from: `"Hotel Reservation System" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
        attachments
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Email sent:', info.messageId);
      return true;
    } catch (error) {
      console.error('Email sending error:', error);
      return false;
    }
  }

  async sendWelcomeEmail(user) {
    const subject = 'Welcome to Hotel Reservation System';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏨 Welcome to Hotel Reservation System</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.name},</h2>
            <p>Thank you for registering with our Hotel Reservation System!</p>
            <p>Your account has been successfully created with the following details:</p>
            <ul>
              <li><strong>Email:</strong> ${user.email}</li>
              <li><strong>Account Type:</strong> ${user.role}</li>
              <li><strong>Registration Date:</strong> ${new Date().toLocaleDateString()}</li>
            </ul>
            <p>You can now login to your account and start booking rooms.</p>
            <a href="${process.env.FRONTEND_URL}/login" class="button">Login to Your Account</a>
            <p>If you have any questions, please contact our support team.</p>
            <div class="footer">
              <p>Best regards,<br>Hotel Reservation System Team</p>
              <p>© ${new Date().getFullYear()} Hotel Reservation System. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(user.email, subject, html);
  }

  async sendBookingConfirmation(booking, user, rooms) {
    const checkIn = new Date(booking.checkInDate);
    const checkOut = new Date(booking.checkOutDate);
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

    const subject = `Booking Confirmation #${booking.bookingId}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .booking-details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 5px solid #4CAF50; }
          .room-list { margin: 15px 0; }
          .room-item { padding: 10px; background: #e8f5e9; margin: 5px 0; border-radius: 3px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Booking Confirmed</h1>
          </div>
          <div class="content">
            <h2>Dear ${user.name},</h2>
            <p>Your booking has been confirmed successfully!</p>
            
            <div class="booking-details">
              <h3>Booking Details:</h3>
              <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
              <p><strong>Check-in:</strong> ${checkIn.toLocaleDateString()} (14:00)</p>
              <p><strong>Check-out:</strong> ${checkOut.toLocaleDateString()} (12:00)</p>
              <p><strong>Nights:</strong> ${nights}</p>
              <p><strong>Total Rooms:</strong> ${booking.totalRooms}</p>
              <p><strong>Travel Time:</strong> ${booking.travelTime} minutes</p>
              <p><strong>Total Amount:</strong> ₹${parseFloat(booking.totalPrice).toLocaleString('en-IN')}</p>
              <p><strong>Booking Date:</strong> ${new Date(booking.createdAt).toLocaleDateString()}</p>
              <p><strong>Status:</strong> ${booking.status}</p>
            </div>
            
            <div class="room-list">
              <h3>Rooms Booked:</h3>
              ${rooms.map(room => `
                <div class="room-item">
                  <strong>Room ${room.roomNumber}</strong> - Floor ${room.floor} - ${room.roomType} (₹${room.basePrice}/night)
                </div>
              `).join('')}
            </div>
            
            <p><strong>Important Notes:</strong></p>
            <ul>
              <li>Please bring a valid ID proof during check-in</li>
              <li>Check-in time is 14:00 and check-out time is 12:00</li>
              <li>Free cancellation available up to 24 hours before check-in</li>
              <li>For any changes, please contact hotel reception</li>
            </ul>
            
            <div class="footer">
              <p>Thank you for choosing our hotel!</p>
              <p>Best regards,<br>Hotel Reservation System Team</p>
              <p>© ${new Date().getFullYear()} Hotel Reservation System. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(user.email, subject, html);
  }

  async sendBookingCancellation(booking, user) {
    const subject = `Booking Cancelled #${booking.bookingId}`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .booking-details { background: white; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 5px solid #f44336; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>❌ Booking Cancelled</h1>
          </div>
          <div class="content">
            <h2>Dear ${user.name},</h2>
            <p>Your booking has been cancelled successfully.</p>
            
            <div class="booking-details">
              <h3>Cancelled Booking Details:</h3>
              <p><strong>Booking ID:</strong> ${booking.bookingId}</p>
              <p><strong>Rooms:</strong> ${booking.rooms.join(', ')}</p>
              <p><strong>Check-in Date:</strong> ${new Date(booking.checkInDate).toLocaleDateString()}</p>
              <p><strong>Cancellation Date:</strong> ${new Date().toLocaleDateString()}</p>
              <p><strong>Refund Status:</strong> Pending (will be processed within 5-7 business days)</p>
            </div>
            
            <p>We hope to serve you again in the future!</p>
            
            <div class="footer">
              <p>If you have any questions about the refund, please contact our support team.</p>
              <p>Best regards,<br>Hotel Reservation System Team</p>
              <p>© ${new Date().getFullYear()} Hotel Reservation System. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(user.email, subject, html);
  }

  async sendPasswordReset(user, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    const subject = 'Password Reset Request';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #2196F3; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { background: #fff3cd; border-left: 5px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset</h1>
          </div>
          <div class="content">
            <h2>Hello ${user.name},</h2>
            <p>We received a request to reset your password for your Hotel Reservation System account.</p>
            
            <a href="${resetUrl}" class="button">Reset Your Password</a>
            
            <p>Or copy and paste this link in your browser:</p>
            <p style="word-break: break-all;">${resetUrl}</p>
            
            <div class="warning">
              <p><strong>Important:</strong> This password reset link will expire in 1 hour.</p>
              <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
            </div>
            
            <div class="footer">
              <p>Best regards,<br>Hotel Reservation System Team</p>
              <p>© ${new Date().getFullYear()} Hotel Reservation System. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(user.email, subject, html);
  }
}

module.exports = new EmailService();