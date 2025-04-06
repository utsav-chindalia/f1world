# Track Boundary Data Utilities

This project contains utilities for processing and optimizing race track boundary data for F1 Racing Educator.

## Files Generated

1. **track_coordinates.json** - Contains the outer boundary points (1335 points)
2. **track_inside_coordinates.json** - Contains the inner boundary points (1525 points)
3. **track_boundaries.json** - Contains optimized versions of both boundaries with fewer points while maintaining the track shape
4. **track_visualization.html** - A visual representation of both original and optimized boundaries

## Optimization Details

The optimization process reduced the number of points while preserving the track shape:

- **Outside boundary**: Reduced from 1335 to 486 points (63.60% reduction)
- **Inside boundary**: Reduced from 1525 to 298 points (80.46% reduction)

This optimization makes the boundary data more efficient for collision detection and rendering.

## Scripts

- **convert_coordinates.js** - Extracts outside boundary points from raw data file
- **convert_inside_coordinates.js** - Extracts inside boundary points from raw data file
- **optimize_boundaries.js** - Optimizes both boundaries and creates visualization

## Usage in Game Development

The `track_boundaries.json` file provides a structured format that can be easily imported into a game:

```javascript
// Example of loading and using the track boundaries
fetch('track_boundaries.json')
  .then(response => response.json())
  .then(data => {
    // Access outside boundary
    const outsideBoundary = data.outside;
    
    // Access inside boundary
    const insideBoundary = data.inside;
    
    // Use for collision detection, rendering, etc.
    // ...
  });
```

## Visualization

The included visualization tool (`track_visualization.html`) allows you to:

- View original and optimized track boundaries
- Toggle between original and simplified versions
- See the reduction in point count while preserving the shape

Open the HTML file in a browser to use the visualization tool. 