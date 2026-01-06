class AlgorithmService {
  constructor() {
    this.HORIZONTAL_TIME = 1; // 1 minute per room
    this.VERTICAL_TIME = 2;   // 2 minutes per floor
  }

  calculateHorizontalTime(rooms) {
    if (rooms.length <= 1) return 0;
    const positions = rooms.map(r => r.position).sort((a, b) => a - b);
    return positions[positions.length - 1] - positions[0];
  }

  calculateVerticalTime(rooms) {
    if (rooms.length <= 1) return 0;
    const floors = [...new Set(rooms.map(r => r.floor))].sort((a, b) => a - b);
    return (floors[floors.length - 1] - floors[0]) * this.VERTICAL_TIME;
  }

  calculateTravelTime(rooms) {
    return this.calculateHorizontalTime(rooms) + this.calculateVerticalTime(rooms);
  }

  findBestOnSingleFloor(availableRooms, numRooms) {
    let bestCombination = null;
    let bestTime = Infinity;

    for (let i = 0; i <= availableRooms.length - numRooms; i++) {
      const combination = availableRooms.slice(i, i + numRooms);
      const time = this.calculateTravelTime(combination);
      if (time < bestTime) {
        bestTime = time;
        bestCombination = combination;
      }
    }

    return bestCombination;
  }

  async findOptimalRooms(availableRoomsByFloor, numRooms) {
    // Priority 1: Same floor
    for (const floorRooms of availableRoomsByFloor) {
      if (floorRooms.length >= numRooms) {
        const combination = this.findBestOnSingleFloor(floorRooms, numRooms);
        if (combination) {
          return {
            rooms: combination,
            travelTime: this.calculateTravelTime(combination),
            floors: [combination[0].floor],
            strategy: 'same_floor'
          };
        }
      }
    }

    // Priority 2: Across floors
    const allAvailableRooms = availableRoomsByFloor.flat();
    if (allAvailableRooms.length < numRooms) {
      return null;
    }

    // Brute force for max 5 rooms
    let bestCombination = null;
    let bestTime = Infinity;

    const generateCombinations = (start, current) => {
      if (current.length === numRooms) {
        const time = this.calculateTravelTime(current);
        if (time < bestTime) {
          bestTime = time;
          bestCombination = [...current];
        }
        return;
      }

      for (let i = start; i < availableRoomsByFloor.length; i++) {
        for (let j = 0; j < availableRoomsByFloor[i].length; j++) {
          current.push(availableRoomsByFloor[i][j]);
          generateCombinations(i, current);
          current.pop();
        }
      }
    };

    generateCombinations(0, []);

    if (bestCombination) {
      const floors = [...new Set(bestCombination.map(r => r.floor))].sort((a, b) => a - b);
      return {
        rooms: bestCombination,
        travelTime: bestTime,
        floors: floors,
        strategy: 'across_floors'
      };
    }

    return null;
  }
}

module.exports = new AlgorithmService();