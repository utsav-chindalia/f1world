const fs = require('fs');

// Load the boundary data
const outsideBoundary = JSON.parse(fs.readFileSync('./track_coordinates.json', 'utf8'));
const insideBoundary = JSON.parse(fs.readFileSync('./track_inside_coordinates.json', 'utf8'));

console.log(`Original outside boundary points: ${outsideBoundary.length}`);
console.log(`Original inside boundary points: ${insideBoundary.length}`);

/**
 * Simplify a boundary by keeping only points that have a minimum distance from each other
 * This is a simple version of the Ramer-Douglas-Peucker algorithm
 */
function simplifyBoundary(points, minDistance) {
  if (points.length <= 2) return points;
  
  const result = [points[0]];
  let lastPoint = points[0];
  
  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    const distance = Math.sqrt(
      Math.pow(point.x - lastPoint.x, 2) + 
      Math.pow(point.y - lastPoint.y, 2)
    );
    
    if (distance >= minDistance) {
      result.push(point);
      lastPoint = point;
    }
  }
  
  // Always include the last point to ensure the boundary is closed
  if (result[result.length - 1] !== points[points.length - 1]) {
    result.push(points[points.length - 1]);
  }
  
  return result;
}

// Simplify boundaries (adjust minDistance as needed for your game's precision requirements)
const simplifiedOutside = simplifyBoundary(outsideBoundary, 15);
const simplifiedInside = simplifyBoundary(insideBoundary, 15);

console.log(`Simplified outside boundary points: ${simplifiedOutside.length}`);
console.log(`Simplified inside boundary points: ${simplifiedInside.length}`);

// Create optimized structure for game use
const optimizedBoundaries = {
  outside: simplifiedOutside,
  inside: simplifiedInside,
  // Add useful metadata
  metadata: {
    originalPoints: {
      outside: outsideBoundary.length,
      inside: insideBoundary.length
    },
    simplifiedPoints: {
      outside: simplifiedOutside.length,
      inside: simplifiedInside.length
    },
    reductionPercentage: {
      outside: ((1 - simplifiedOutside.length / outsideBoundary.length) * 100).toFixed(2) + '%',
      inside: ((1 - simplifiedInside.length / insideBoundary.length) * 100).toFixed(2) + '%'
    }
  }
};

// Save optimized boundaries
fs.writeFileSync('track_boundaries.json', JSON.stringify(optimizedBoundaries, null, 2));

console.log('Optimized track boundaries saved to track_boundaries.json');

// Create a visualization file to help visualize the boundaries
const visualizationHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Track Boundaries Visualization</title>
  <style>
    body { margin: 0; overflow: hidden; background: #333; }
    canvas { display: block; }
    .controls { 
      position: fixed; 
      top: 10px; 
      left: 10px; 
      background: rgba(0,0,0,0.5); 
      padding: 10px;
      color: white;
      font-family: Arial, sans-serif;
    }
    button {
      margin: 5px;
      padding: 5px 10px;
    }
  </style>
</head>
<body>
  <div class="controls">
    <div>
      <button id="toggleOriginal">Toggle Original (${outsideBoundary.length + insideBoundary.length} points)</button>
      <button id="toggleSimplified">Toggle Simplified (${simplifiedOutside.length + simplifiedInside.length} points)</button>
    </div>
    <div>
      Outside: ${simplifiedOutside.length}/${outsideBoundary.length} points (${optimizedBoundaries.metadata.reductionPercentage.outside} reduction)
    </div>
    <div>
      Inside: ${simplifiedInside.length}/${insideBoundary.length} points (${optimizedBoundaries.metadata.reductionPercentage.inside} reduction)
    </div>
  </div>
  <canvas id="trackCanvas"></canvas>

  <script>
    // Load the boundary data
    const boundaryData = ${JSON.stringify({
      original: {
        outside: outsideBoundary,
        inside: insideBoundary
      },
      simplified: {
        outside: simplifiedOutside,
        inside: simplifiedInside
      }
    })};

    const canvas = document.getElementById('trackCanvas');
    const ctx = canvas.getContext('2d');
    let showOriginal = true;
    let showSimplified = true;
    
    // Set canvas size
    function resizeCanvas() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      drawTrack();
    }
    
    // Initial setup
    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    
    // Toggle buttons
    document.getElementById('toggleOriginal').addEventListener('click', () => {
      showOriginal = !showOriginal;
      drawTrack();
    });
    
    document.getElementById('toggleSimplified').addEventListener('click', () => {
      showSimplified = !showSimplified;
      drawTrack();
    });
    
    // Find the bounds of the track to center it
    function getBounds(points) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      
      for (const point of points) {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      }
      
      return { minX, minY, maxX, maxY };
    }
    
    function drawTrack() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Combine all points to find bounds
      const allPoints = [
        ...boundaryData.original.outside,
        ...boundaryData.original.inside
      ];
      
      const bounds = getBounds(allPoints);
      const padding = 50;
      
      // Calculate scale to fit track in canvas
      const scaleX = (canvas.width - padding * 2) / (bounds.maxX - bounds.minX);
      const scaleY = (canvas.height - padding * 2) / (bounds.maxY - bounds.minY);
      const scale = Math.min(scaleX, scaleY);
      
      // Function to transform track coordinates to canvas coordinates
      function transformPoint(point) {
        return {
          x: (point.x - bounds.minX) * scale + padding,
          y: (point.y - bounds.minY) * scale + padding
        };
      }
      
      // Draw original boundaries
      if (showOriginal) {
        ctx.strokeStyle = 'rgba(100, 100, 255, 0.5)';
        ctx.lineWidth = 1;
        
        // Draw outside boundary
        ctx.beginPath();
        const firstOutsidePoint = transformPoint(boundaryData.original.outside[0]);
        ctx.moveTo(firstOutsidePoint.x, firstOutsidePoint.y);
        
        for (const point of boundaryData.original.outside) {
          const transformedPoint = transformPoint(point);
          ctx.lineTo(transformedPoint.x, transformedPoint.y);
        }
        ctx.closePath();
        ctx.stroke();
        
        // Draw inside boundary
        ctx.beginPath();
        const firstInsidePoint = transformPoint(boundaryData.original.inside[0]);
        ctx.moveTo(firstInsidePoint.x, firstInsidePoint.y);
        
        for (const point of boundaryData.original.inside) {
          const transformedPoint = transformPoint(point);
          ctx.lineTo(transformedPoint.x, transformedPoint.y);
        }
        ctx.closePath();
        ctx.stroke();
        
        // Draw points
        ctx.fillStyle = 'rgba(100, 100, 255, 0.3)';
        for (const point of boundaryData.original.outside) {
          const transformedPoint = transformPoint(point);
          ctx.beginPath();
          ctx.arc(transformedPoint.x, transformedPoint.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
        
        for (const point of boundaryData.original.inside) {
          const transformedPoint = transformPoint(point);
          ctx.beginPath();
          ctx.arc(transformedPoint.x, transformedPoint.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      // Draw simplified boundaries
      if (showSimplified) {
        ctx.strokeStyle = 'rgba(255, 100, 100, 0.8)';
        ctx.lineWidth = 2;
        
        // Draw outside boundary
        ctx.beginPath();
        const firstSimplifiedOutsidePoint = transformPoint(boundaryData.simplified.outside[0]);
        ctx.moveTo(firstSimplifiedOutsidePoint.x, firstSimplifiedOutsidePoint.y);
        
        for (const point of boundaryData.simplified.outside) {
          const transformedPoint = transformPoint(point);
          ctx.lineTo(transformedPoint.x, transformedPoint.y);
        }
        ctx.closePath();
        ctx.stroke();
        
        // Draw inside boundary
        ctx.beginPath();
        const firstSimplifiedInsidePoint = transformPoint(boundaryData.simplified.inside[0]);
        ctx.moveTo(firstSimplifiedInsidePoint.x, firstSimplifiedInsidePoint.y);
        
        for (const point of boundaryData.simplified.inside) {
          const transformedPoint = transformPoint(point);
          ctx.lineTo(transformedPoint.x, transformedPoint.y);
        }
        ctx.closePath();
        ctx.stroke();
        
        // Draw points
        ctx.fillStyle = 'rgba(255, 100, 100, 0.8)';
        for (const point of boundaryData.simplified.outside) {
          const transformedPoint = transformPoint(point);
          ctx.beginPath();
          ctx.arc(transformedPoint.x, transformedPoint.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        
        for (const point of boundaryData.simplified.inside) {
          const transformedPoint = transformPoint(point);
          ctx.beginPath();
          ctx.arc(transformedPoint.x, transformedPoint.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    
    // Initial draw
    drawTrack();
  </script>
</body>
</html>`;

fs.writeFileSync('track_visualization.html', visualizationHtml);
console.log('Track visualization HTML created as track_visualization.html'); 