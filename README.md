# Hotel Reservation System (SDE 3 Assessment)

A full-stack hotel reservation system designed to optimize room allocation based on travel time minimization, adhering to strict floor and booking proximity rules.

## 🚀 Live Demo
- **Frontend**: [https://hotel-reservation-system-avvn.onrender.com](https://hotel-reservation-system-avvn.onrender.com)
- **Backend API**: [https://hotel-reservation-system-backend-6nf6.onrender.com](https://hotel-reservation-system-backend-6nf6.onrender.com)

## 📋 Problem Statement Features
- **Total Rooms**: 97 Rooms.
- **Floors**: layout of 10 Floors.
  - Floors 1-9: 10 Rooms each (e.g., 101-110).
  - Floor 10: 7 Rooms (1001-1007).
- **Travel Time Logic**:
  - Horizontal: 1 minute per room.
  - Vertical: 2 minutes per floor.
  - **Formula**: `(Max Floor - Min Floor) * 2 + (Max Position - Min Position)` (Calculated from entry point/relative sets).
- **Booking Algorithm Priorities**:
  1. **Same Floor**: Prioritizes rooms on the same floor to minimize immediate horizontal travel.
  2. **Minimal Travel Time**: If same floor is unavailable, selects rooms across floors that yield the lowest total travel time score.

## 🛠️ Tech Stack
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL (via Sequelize ORM)
- **Architecture**: MVC (Model-View-Controller)
- **Deployment**: Render

## ⚙️ Key Features
- **Auto-Healing Database**: The system automatically detects missing tables or room data on startup and "self-heals" by seeding the correct 97-room structure.
- **Nuclear Reset**: A "Reset" feature that clears all bookings and resets room availability instantly.
- **Data Integrity**: Uses PostgreSQL transactions and locking to prevent double-booking.

## 🔌 API Endpoints

### Rooms
- `GET /api/rooms` - Fetch all rooms and their status.
- `GET /api/rooms/floor/:floorNumber` - Get rooms for a specific floor.
- `POST /api/rooms/reset-all` - Reset all bookings (Admin/Testing tool).
- `POST /api/rooms/random-occupancy` - Randomly occupy rooms to test the algorithm.

### Bookings
- `POST /api/bookings` - Make a new reservation.
  - Body: `{ "numRooms": 3, "checkInDate": "2024-01-01", "checkOutDate": "2024-01-02" }`
  - Returns: Optimal room numbers, Total Price, Travel Time.
- `GET /api/bookings` - List all bookings.
- `DELETE /api/bookings/:id` - Cancel a booking.

## 🧪 Algorithm Logic
The core booking logic is located in `src/services/algorithmService.js`.
1. It validates the request (1-5 rooms).
2. It fetches all available rooms.
3. It first attempts to find a contiguous or close block of rooms on a **single floor**.
4. If unavailable, it calculates the "Travel Cost" for all valid combinations of available rooms across floors and selects the minimal cost.

## 📝 Setup Instructions
1. Clone the repository.
2. Install dependencies: `npm install`.
3. Set `.env` variables (`DATABASE_URL`, `PG_SSL=true`).
4. Run server: `npm start`.

---
*Assessment Submission by Rutvik Kolhe*