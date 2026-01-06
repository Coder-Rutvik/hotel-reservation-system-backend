const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFGenerator {
  // Generate booking invoice PDF
  static async generateBookingInvoice(booking, user, rooms) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];
        
        // Collect PDF data
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve(pdfBuffer);
        });
        
        // Generate PDF content
        this.addInvoiceHeader(doc, booking);
        this.addHotelInfo(doc);
        this.addCustomerInfo(doc, user);
        this.addBookingDetails(doc, booking, rooms);
        this.addPaymentDetails(doc, booking);
        this.addFooter(doc);
        
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  static addInvoiceHeader(doc, booking) {
    // Title
    doc.fontSize(25)
       .fillColor('#667eea')
       .text('HOTEL INVOICE', { align: 'center' });
    
    doc.moveDown();
    
    // Invoice details
    doc.fontSize(12)
       .fillColor('#666666')
       .text(`Invoice No: ${booking.bookingId}`, { align: 'right' });
    
    doc.text(`Date: ${new Date().toLocaleDateString()}`, { align: 'right' });
    
    doc.moveDown(2);
    
    // Divider
    doc.strokeColor('#667eea')
       .lineWidth(2)
       .moveTo(50, doc.y)
       .lineTo(550, doc.y)
       .stroke();
    
    doc.moveDown();
  }

  static addHotelInfo(doc) {
    doc.fontSize(14)
       .fillColor('#333333')
       .text('Hotel Reservation System', 50, doc.y);
    
    doc.fontSize(10)
       .fillColor('#666666')
       .text('123 Luxury Street, Mumbai, India')
       .text('Phone: +91 22 1234 5678 | Email: info@hotelsystem.com')
       .text('Website: www.hotelreservationsystem.com');
    
    doc.moveDown(2);
  }

  static addCustomerInfo(doc, user) {
    doc.fontSize(12)
       .fillColor('#333333')
       .text('Bill To:', 50, doc.y);
    
    doc.fontSize(10)
       .fillColor('#666666')
       .text(user.name)
       .text(`Email: ${user.email}`);
    
    if (user.phone) {
      doc.text(`Phone: ${user.phone}`);
    }
    
    doc.moveDown(2);
  }

  static addBookingDetails(doc, booking, rooms) {
    const checkIn = new Date(booking.checkInDate);
    const checkOut = new Date(booking.checkOutDate);
    const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
    
    // Table header
    doc.fontSize(12)
       .fillColor('#ffffff')
       .rect(50, doc.y, 500, 25)
       .fill('#667eea');
    
    doc.text('Room Details', 60, doc.y + 5);
    doc.text('Type', 250, doc.y + 5);
    doc.text('Nights', 350, doc.y + 5);
    doc.text('Amount', 450, doc.y + 5);
    
    doc.moveDown(2);
    
    // Room rows
    rooms.forEach((room, index) => {
      const y = doc.y;
      const bgColor = index % 2 === 0 ? '#f8f9fa' : '#ffffff';
      
      doc.fillColor('#333333')
         .rect(50, y, 500, 30)
         .fill(bgColor);
      
      doc.text(`Room ${room.roomNumber} (Floor ${room.floor})`, 60, y + 10);
      doc.text(this.capitalize(room.roomType), 250, y + 10);
      doc.text(nights.toString(), 350, y + 10);
      doc.text(`₹${parseFloat(room.basePrice * nights).toFixed(2)}`, 450, y + 10);
      
      doc.moveDown(2);
    });
    
    doc.moveDown();
    
    // Travel time
    doc.fontSize(10)
       .fillColor('#666666')
       .text(`Note: Travel time between booked rooms: ${booking.travelTime} minutes`, 50, doc.y);
    
    doc.moveDown();
  }

  static addPaymentDetails(doc, booking) {
    // Total section
    const subtotal = parseFloat(booking.totalPrice);
    const tax = subtotal * 0.18; // 18% GST
    const total = subtotal + tax;
    
    doc.moveDown(2);
    
    // Divider
    doc.strokeColor('#cccccc')
       .lineWidth(1)
       .moveTo(350, doc.y)
       .lineTo(550, doc.y)
       .stroke();
    
    doc.moveDown();
    
    // Amounts
    doc.fontSize(11)
       .fillColor('#333333')
       .text('Subtotal:', 400, doc.y, { width: 100, align: 'right' })
       .text(`₹${subtotal.toFixed(2)}`, 470, doc.y);
    
    doc.moveDown();
    
    doc.text('GST (18%):', 400, doc.y, { width: 100, align: 'right' })
       .text(`₹${tax.toFixed(2)}`, 470, doc.y);
    
    doc.moveDown();
    
    // Total
    doc.fontSize(14)
       .fillColor('#667eea')
       .text('Total:', 400, doc.y, { width: 100, align: 'right' })
       .text(`₹${total.toFixed(2)}`, 470, doc.y);
    
    doc.moveDown(2);
    
    // Payment status
    doc.fontSize(10)
       .fillColor(booking.paymentStatus === 'paid' ? '#4CAF50' : '#f44336')
       .text(`Payment Status: ${booking.paymentStatus.toUpperCase()}`, 50, doc.y);
    
    doc.moveDown();
  }

  static addFooter(doc) {
    doc.moveDown(3);
    
    doc.fontSize(10)
       .fillColor('#666666')
       .text('Thank you for your booking!', { align: 'center' })
       .text('For any queries, please contact: support@hotelsystem.com', { align: 'center' });
    
    doc.moveDown();
    
    // Terms and conditions
    doc.fontSize(8)
       .text('Terms & Conditions:', { align: 'center' })
       .text('1. Check-in time: 14:00, Check-out time: 12:00', { align: 'center' })
       .text('2. Free cancellation up to 24 hours before check-in', { align: 'center' })
       .text('3. Valid ID proof required during check-in', { align: 'center' });
  }

  static capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  // Generate room layout PDF
  static async generateRoomLayout(hotelData) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4', layout: 'landscape' });
        const chunks = [];
        
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          resolve(pdfBuffer);
        });
        
        this.addLayoutHeader(doc);
        this.addFloorLayouts(doc, hotelData);
        this.addLayoutLegend(doc);
        
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  static addLayoutHeader(doc) {
    doc.fontSize(20)
       .fillColor('#667eea')
       .text('HOTEL ROOM LAYOUT', { align: 'center' });
    
    doc.moveDown();
    
    doc.fontSize(12)
       .fillColor('#666666')
       .text('Hotel Reservation System - Room Allocation Chart', { align: 'center' });
    
    doc.moveDown(2);
  }

  static addFloorLayouts(doc, hotelData) {
    const floors = hotelData.floors || [];
    const startY = doc.y;
    
    floors.forEach((floor, floorIndex) => {
      if (floorIndex > 0 && floorIndex % 2 === 0) {
        doc.addPage();
      }
      
      const x = floorIndex % 2 === 0 ? 50 : 300;
      const y = startY + (Math.floor(floorIndex / 2) * 200);
      
      // Floor box
      doc.rect(x, y, 230, 180)
         .strokeColor('#667eea')
         .lineWidth(1)
         .stroke();
      
      // Floor title
      doc.fontSize(14)
         .fillColor('#333333')
         .text(`Floor ${floor.floorNumber}${floor.isTopFloor ? ' (Top Floor)' : ''}`, x + 10, y + 10);
      
      // Rooms
      const roomsPerRow = 5;
      const roomSize = 30;
      
      floor.rooms.forEach((room, roomIndex) => {
        const row = Math.floor(roomIndex / roomsPerRow);
        const col = roomIndex % roomsPerRow;
        
        const roomX = x + 10 + (col * (roomSize + 5));
        const roomY = y + 40 + (row * (roomSize + 5));
        
        // Room box with color based on status
        const fillColor = room.booked ? '#f44336' : room.selected ? '#FFC107' : '#4CAF50';
        
        doc.rect(roomX, roomY, roomSize, roomSize)
           .fillColor(fillColor)
           .fill()
           .strokeColor('#333333')
           .stroke();
        
        // Room number
        doc.fontSize(8)
           .fillColor('#ffffff')
           .text(room.number.toString(), roomX + 5, roomY + 10);
      });
      
      // Floor stats
      const totalRooms = floor.rooms.length;
      const availableRooms = floor.rooms.filter(r => !r.booked).length;
      
      doc.fontSize(9)
         .fillColor('#666666')
         .text(`Rooms: ${totalRooms}`, x + 10, y + 150)
         .text(`Available: ${availableRooms}`, x + 10, y + 165);
    });
  }

  static addLayoutLegend(doc) {
    doc.addPage();
    
    doc.fontSize(16)
       .fillColor('#333333')
       .text('Legend', 50, 50);
    
    doc.moveDown();
    
    const legendItems = [
      { color: '#4CAF50', label: 'Available Room' },
      { color: '#f44336', label: 'Booked/Occupied' },
      { color: '#FFC107', label: 'Currently Selected' },
      { color: '#667eea', label: 'Stairs/Lift Location' }
    ];
    
    legendItems.forEach((item, index) => {
      const y = 100 + (index * 30);
      
      doc.rect(50, y, 20, 20)
         .fillColor(item.color)
         .fill()
         .strokeColor('#333333')
         .stroke();
      
      doc.fontSize(12)
         .fillColor('#333333')
         .text(item.label, 80, y + 3);
    });
    
    doc.moveDown(4);
    
    doc.fontSize(10)
       .fillColor('#666666')
       .text('Generated on: ' + new Date().toLocaleString(), { align: 'center' });
  }
}

module.exports = PDFGenerator;