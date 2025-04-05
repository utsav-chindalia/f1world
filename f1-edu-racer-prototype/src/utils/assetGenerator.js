import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function generateF1Car() {
    const canvas = createCanvas(200, 100);
    const ctx = canvas.getContext('2d');

    // Car body - F1 style
    ctx.fillStyle = '#e10600';  // Ferrari red
    ctx.beginPath();
    // Main body
    ctx.moveTo(50, 40);
    ctx.lineTo(150, 40);
    ctx.quadraticCurveTo(170, 40, 180, 50);
    ctx.lineTo(180, 60);
    ctx.quadraticCurveTo(170, 70, 150, 70);
    ctx.lineTo(50, 70);
    ctx.quadraticCurveTo(30, 70, 20, 60);
    ctx.lineTo(20, 50);
    ctx.quadraticCurveTo(30, 40, 50, 40);
    ctx.fill();

    // Front wing
    ctx.fillStyle = '#333333';
    ctx.fillRect(10, 45, 20, 20);

    // Rear wing
    ctx.fillStyle = '#333333';
    ctx.fillRect(170, 35, 20, 40);

    // Wheels
    ctx.fillStyle = '#000000';
    ctx.fillRect(40, 35, 30, 10);  // Left front
    ctx.fillRect(40, 65, 30, 10);  // Left rear
    ctx.fillRect(130, 35, 30, 10); // Right front
    ctx.fillRect(130, 65, 30, 10); // Right rear

    // Save the car
    const buffer = canvas.toBuffer('image/png');
    writeFileSync(join(__dirname, '../../public/assets/sprites/f1car.png'), buffer);
}

function generateTrackTextures() {
    // Generate asphalt texture
    const asphaltCanvas = createCanvas(128, 128);
    const actx = asphaltCanvas.getContext('2d');
    
    // Dark gray base
    actx.fillStyle = '#2c2c2c';
    actx.fillRect(0, 0, 128, 128);
    
    // Add noise for texture
    for (let i = 0; i < 1000; i++) {
        const x = Math.random() * 128;
        const y = Math.random() * 128;
        const gray = Math.floor(Math.random() * 30 + 40);
        actx.fillStyle = `rgb(${gray},${gray},${gray})`;
        actx.fillRect(x, y, 1, 1);
    }
    
    writeFileSync(
        join(__dirname, '../../public/assets/textures/asphalt.png'),
        asphaltCanvas.toBuffer('image/png')
    );

    // Generate grass texture
    const grassCanvas = createCanvas(128, 128);
    const gctx = grassCanvas.getContext('2d');
    
    // Green base
    gctx.fillStyle = '#2d5a27';
    gctx.fillRect(0, 0, 128, 128);
    
    // Add grass strands
    for (let i = 0; i < 200; i++) {
        const x = Math.random() * 128;
        const y = Math.random() * 128;
        const length = Math.random() * 10 + 5;
        gctx.strokeStyle = '#3a7433';
        gctx.beginPath();
        gctx.moveTo(x, y);
        gctx.lineTo(x + Math.random() * 4 - 2, y - length);
        gctx.stroke();
    }
    
    writeFileSync(
        join(__dirname, '../../public/assets/textures/grass.png'),
        grassCanvas.toBuffer('image/png')
    );

    // Generate gravel texture
    const gravelCanvas = createCanvas(128, 128);
    const grctx = gravelCanvas.getContext('2d');
    
    // Base color
    grctx.fillStyle = '#a3a3a3';
    grctx.fillRect(0, 0, 128, 128);
    
    // Add gravel stones
    for (let i = 0; i < 300; i++) {
        const x = Math.random() * 128;
        const y = Math.random() * 128;
        const size = Math.random() * 4 + 1;
        const gray = Math.floor(Math.random() * 40 + 140);
        grctx.fillStyle = `rgb(${gray},${gray},${gray})`;
        grctx.beginPath();
        grctx.arc(x, y, size, 0, Math.PI * 2);
        grctx.fill();
    }
    
    writeFileSync(
        join(__dirname, '../../public/assets/textures/gravel.png'),
        gravelCanvas.toBuffer('image/png')
    );
}

function generateCheckpoint() {
    const canvas = createCanvas(64, 64);
    const ctx = canvas.getContext('2d');

    // Transparent background
    ctx.clearRect(0, 0, 64, 64);

    // Draw checkpoint marker
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.setLineDash([8, 8]);
    ctx.strokeRect(2, 2, 60, 60);

    // Add arrow
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(20, 32);
    ctx.lineTo(44, 32);
    ctx.lineTo(32, 20);
    ctx.moveTo(44, 32);
    ctx.lineTo(32, 44);
    ctx.stroke();

    writeFileSync(
        join(__dirname, '../../public/assets/sprites/checkpoint.png'),
        canvas.toBuffer('image/png')
    );
}

function generateUIElements() {
    // Generate minimap frame
    const minimapCanvas = createCanvas(220, 220);
    const mctx = minimapCanvas.getContext('2d');

    // Draw frame
    mctx.fillStyle = '#15151E';
    mctx.fillRect(0, 0, 220, 220);
    mctx.strokeStyle = '#E10600';
    mctx.lineWidth = 4;
    mctx.strokeRect(2, 2, 216, 216);

    writeFileSync(
        join(__dirname, '../../public/assets/ui/minimap_frame.png'),
        minimapCanvas.toBuffer('image/png')
    );

    // Generate F1 UI frame
    const uiCanvas = createCanvas(400, 100);
    const uctx = uiCanvas.getContext('2d');

    // Draw frame
    uctx.fillStyle = '#15151E';
    uctx.fillRect(0, 0, 400, 100);
    uctx.fillStyle = '#E10600';
    uctx.fillRect(0, 96, 400, 4);

    writeFileSync(
        join(__dirname, '../../public/assets/ui/f1_frame.png'),
        uiCanvas.toBuffer('image/png')
    );

    // Generate UI icons
    const iconsCanvas = createCanvas(128, 32);
    const ictx = iconsCanvas.getContext('2d');

    // Draw some basic icons (speed, time, lap)
    // Speed icon
    ictx.strokeStyle = '#ffffff';
    ictx.beginPath();
    ictx.arc(16, 16, 12, 0, Math.PI * 2);
    ictx.stroke();
    ictx.beginPath();
    ictx.moveTo(16, 16);
    ictx.lineTo(16, 8);
    ictx.stroke();

    // Time icon
    ictx.strokeRect(44, 8, 16, 16);
    ictx.beginPath();
    ictx.moveTo(52, 16);
    ictx.lineTo(52, 12);
    ictx.stroke();

    // Lap icon
    ictx.beginPath();
    ictx.arc(88, 16, 12, 0, Math.PI * 1.5);
    ictx.stroke();
    ictx.beginPath();
    ictx.moveTo(88, 4);
    ictx.lineTo(94, 4);
    ictx.stroke();

    writeFileSync(
        join(__dirname, '../../public/assets/ui/f1_icons.png'),
        iconsCanvas.toBuffer('image/png')
    );
}

// Generate all assets
generateF1Car();
generateTrackTextures();
generateCheckpoint();
generateUIElements();

console.log('Assets generated successfully!'); 