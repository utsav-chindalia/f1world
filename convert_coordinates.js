const fs = require('fs');

// Read the file
const data = fs.readFileSync('./f1-edu-racer-prototype/src/assets/boundary/outside.txt/outside.txt', 'utf8');

// Extract coordinates
const points = [];
const lines = data.split('\n');

for (const line of lines) {
  // Match the pattern "Car Position - X: 1443, Y: 1397, Rotation: -51"
  const match = line.match(/Car Position - X: ([-\d]+), Y: ([-\d]+)/);
  
  if (match) {
    const x = parseInt(match[1], 10);
    const y = parseInt(match[2], 10);
    
    // Add to points array
    points.push({ x, y });
  }
}

// Remove duplicate points (same x and y coordinates)
const uniquePoints = [];
const seen = new Set();

for (const point of points) {
  const key = `${point.x},${point.y}`;
  if (!seen.has(key)) {
    seen.add(key);
    uniquePoints.push(point);
  }
}

// Save to JSON file
fs.writeFileSync('track_coordinates.json', JSON.stringify(uniquePoints, null, 2));

console.log(`Extracted ${uniquePoints.length} unique coordinate points and saved to track_coordinates.json`); 