import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function generateTrack() {
    const width = 1920 * 2;
    const height = 1080 * 2;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const collisionCanvas = createCanvas(width, height);
    const collisionCtx = collisionCanvas.getContext('2d');

    // Fill backgrounds
    ctx.fillStyle = '#2d5a27'; // Grass
    ctx.fillRect(0, 0, width, height);
    collisionCtx.fillStyle = '#00FF00'; // Green for grass in collision map
    collisionCtx.fillRect(0, 0, width, height);

    // Track points for a simple F1-style circuit
    const trackPoints = [
        { x: width * 0.2, y: height * 0.8 },  // Start/Finish
        { x: width * 0.8, y: height * 0.8 },  // Long straight
        { x: width * 0.85, y: height * 0.75 }, // Turn 1
        { x: width * 0.9, y: height * 0.6 },  // Turn 2
        { x: width * 0.85, y: height * 0.4 }, // Turn 3
        { x: width * 0.7, y: height * 0.3 },  // Turn 4
        { x: width * 0.5, y: height * 0.2 },  // Mid point
        { x: width * 0.3, y: height * 0.3 },  // Turn 5
        { x: width * 0.15, y: height * 0.4 }, // Turn 6
        { x: width * 0.1, y: height * 0.6 },  // Turn 7
        { x: width * 0.15, y: height * 0.75 }, // Final turn
        { x: width * 0.2, y: height * 0.8 }   // Back to start
    ];

    // Draw track
    ctx.beginPath();
    collisionCtx.beginPath();
    ctx.moveTo(trackPoints[0].x, trackPoints[0].y);
    collisionCtx.moveTo(trackPoints[0].x, trackPoints[0].y);

    // Create smooth curve through points
    for (let i = 0; i < trackPoints.length - 1; i++) {
        const current = trackPoints[i];
        const next = trackPoints[i + 1];
        const midPoint = {
            x: (current.x + next.x) / 2,
            y: (current.y + next.y) / 2
        };
        
        ctx.quadraticCurveTo(current.x, current.y, midPoint.x, midPoint.y);
        collisionCtx.quadraticCurveTo(current.x, current.y, midPoint.x, midPoint.y);
    }

    // Track styling
    ctx.lineWidth = 120; // Wide track
    ctx.strokeStyle = '#2c2c2c'; // Asphalt color
    ctx.stroke();

    // Collision map styling
    collisionCtx.lineWidth = 120;
    collisionCtx.strokeStyle = '#FF0000'; // Red for track in collision map
    collisionCtx.stroke();

    // Add track details
    // Kerbs
    ctx.lineWidth = 10;
    for (let i = 0; i < trackPoints.length - 1; i++) {
        const current = trackPoints[i];
        const next = trackPoints[i + 1];
        
        // Draw red and white kerbs
        ctx.beginPath();
        ctx.moveTo(current.x - 60, current.y - 60);
        ctx.lineTo(next.x - 60, next.y - 60);
        ctx.strokeStyle = '#e10600'; // Red
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(current.x + 60, current.y + 60);
        ctx.lineTo(next.x + 60, next.y + 60);
        ctx.strokeStyle = '#ffffff'; // White
        ctx.stroke();
    }

    // Add gravel traps
    for (let i = 0; i < trackPoints.length - 1; i++) {
        const current = trackPoints[i];
        const next = trackPoints[i + 1];
        
        ctx.beginPath();
        ctx.moveTo(current.x - 100, current.y - 100);
        ctx.lineTo(next.x - 100, next.y - 100);
        ctx.lineWidth = 60;
        ctx.strokeStyle = '#a3a3a3'; // Gravel color
        ctx.stroke();
    }

    // Save track and collision map
    writeFileSync(
        join(__dirname, '../../public/assets/tracks/f1_circuit.png'),
        canvas.toBuffer('image/png')
    );
    
    writeFileSync(
        join(__dirname, '../../public/assets/tracks/f1_circuit_collision.png'),
        collisionCanvas.toBuffer('image/png')
    );

    // Return checkpoint positions for the track
    return trackPoints.map((point, index) => ({
        x: point.x,
        y: point.y,
        index
    }));
}

const checkpoints = generateTrack();
console.log('Track generated successfully!');
console.log('Checkpoint positions:', checkpoints); 