const algorithmService = require('../services/algorithmService');

console.log('🧪 VERIFYING ASSESSMENT REQUIREMENTS');
console.log('====================================');

// Mock data (as per assessment problem statement)
// Floor 1: 101-110
// Floor 2: 201-210

// Test Case 1: Same Floor Optimization
console.log('\n[Test 1] Priority: Same Floor Strategy');
const floor1Rooms = [
    { roomNumber: 101, floor: 1, position: 1 },
    { roomNumber: 102, floor: 1, position: 2 },
    { roomNumber: 105, floor: 1, position: 5 },
    { roomNumber: 106, floor: 1, position: 6 }
];
// User wants 4 rooms. Best should be 101, 102, 105, 106.
// Travel Time: (6-1) + 0 = 5.
const time1 = algorithmService.calculateTravelTime(floor1Rooms);
console.log(`Rooms: 101, 102, 105, 106 -> Travel Time: ${time1}`);
if (time1 === 5) console.log('✅ PASS'); else console.log(`❌ FAIL (Expected 5, Got ${time1})`);


// Test Case 2: Cross Floor Optimization
// "If only 2 rooms are available on Floor 1 (e.g., 101, 102)... The system will select rooms 201, 202 from Floor 2"
console.log('\n[Test 2] Priority: Cross Floor Minimization');
const crossFloorRooms = [
    { roomNumber: 101, floor: 1, position: 1 },
    { roomNumber: 102, floor: 1, position: 2 },
    { roomNumber: 201, floor: 2, position: 1 },
    { roomNumber: 202, floor: 2, position: 2 }
];
// Horizontal: Positions 1,2,1,2 -> Range [1,2] -> 1.
// Vertical: Floors 1,2 -> Range [1,2] -> 1 floor * 2 mins = 2.
// Total: 1 + 2 = 3.
const time2 = algorithmService.calculateTravelTime(crossFloorRooms);
console.log(`Rooms: 101, 102, 201, 202 -> Travel Time: ${time2}`);
if (time2 === 3) console.log('✅ PASS'); else console.log(`❌ FAIL (Expected 3, Got ${time2})`);


// Test Case 3: Comparison with worse option
// Compare {101, 102, 201, 202} vs {101, 102, 301, 302}
console.log('\n[Test 3] Optimization Check');
const worseOption = [
    { roomNumber: 101, floor: 1, position: 1 },
    { roomNumber: 102, floor: 1, position: 2 },
    { roomNumber: 301, floor: 3, position: 1 },
    { roomNumber: 302, floor: 3, position: 2 }
];
const time3 = algorithmService.calculateTravelTime(worseOption);
console.log(`Option A (Floor 1+2): ${time2} mins`);
console.log(`Option B (Floor 1+3): ${time3} mins`);

if (time2 < time3) console.log('✅ PASS (Algorithm prefers closer floors)');
else console.log('❌ FAIL (Algorithm failed to prioritize closer floors)');

console.log('\n====================================');
console.log('VERIFICATION COMPLETE');
