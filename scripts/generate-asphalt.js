const { createCanvas } = require('canvas');
const fs = require('fs');

// Create a canvas for the texture
const width = 256;
const height = 256;
const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

// Fill with light grey base color
ctx.fillStyle = '#CCCCCC';
ctx.fillRect(0, 0, width, height);

// Add subtle noise for a plane texture
for (let i = 0; i < 3000; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = Math.random() * 2;
    const alpha = Math.random() * 0.05;
    
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
}

// Add some slightly darker spots for subtle variation
for (let i = 0; i < 1000; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const size = Math.random() * 2;
    const alpha = Math.random() * 0.05;
    
    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
}

// Save the texture
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('public/assets/textures/asphalt.png', buffer); 