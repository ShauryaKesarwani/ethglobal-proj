// p5.js generative art sketch with deterministic seed
let currentCanvas = null;

// Global function to generate art with a specific seed
window.generateArt = function(seed) {
    // Remove existing canvas if any
    if (currentCanvas) {
        currentCanvas.remove();
    }
    
    // Clear the container
    const container = document.getElementById('canvas-container');
    container.innerHTML = '';
    
    // Create new p5 instance with the seed
    currentCanvas = new p5((p) => {
        p.setup = function() {
            const canvas = p.createCanvas(400, 400);
            canvas.parent('canvas-container');
            
            // Set the seed for deterministic generation
            p.randomSeed(seed);
            p.noiseSeed(seed);
            
            // Generate the art
            generateAbstractPattern(p);
        };
        
        p.draw = function() {
            // Static art - no animation needed
            p.noLoop();
        };
    });
};

// Generate abstract pattern using the seeded random functions
function generateAbstractPattern(p) {
    // Set background with gradient
    for (let i = 0; i <= p.height; i++) {
        let inter = p.map(i, 0, p.height, 0, 1);
        let c = p.lerpColor(p.color(20, 20, 40), p.color(40, 20, 60), inter);
        p.stroke(c);
        p.line(0, i, p.width, i);
    }
    
    // Generate colorful ellipses with seeded randomness
    p.noStroke();
    
    // Create 500 colorful ellipses
    for (let i = 0; i < 500; i++) {
        // Use seeded random for position
        let x = p.random(p.width);
        let y = p.random(p.height);
        
        // Use seeded random for size
        let size = p.random(5, 50);
        
        // Use seeded random for color with some constraints
        let hue = p.random(0, 360);
        let saturation = p.random(60, 100);
        let brightness = p.random(70, 100);
        let alpha = p.random(100, 200);
        
        p.colorMode(p.HSB);
        p.fill(hue, saturation, brightness, alpha);
        
        // Add some rotation for variety
        p.push();
        p.translate(x, y);
        p.rotate(p.random(0, p.TWO_PI));
        
        // Draw ellipse with some randomness in shape
        if (p.random() < 0.3) {
            // Sometimes draw a rectangle instead
            p.rect(-size/2, -size/2, size, size * p.random(0.5, 1.5));
        } else {
            p.ellipse(0, 0, size, size * p.random(0.5, 1.5));
        }
        p.pop();
    }
    
    // Add some connecting lines for more complexity
    p.strokeWeight(1);
    p.colorMode(p.RGB);
    
    for (let i = 0; i < 50; i++) {
        let x1 = p.random(p.width);
        let y1 = p.random(p.height);
        let x2 = p.random(p.width);
        let y2 = p.random(p.height);
        
        let hue = p.random(0, 360);
        p.colorMode(p.HSB);
        p.stroke(hue, 80, 90, 50);
        p.line(x1, y1, x2, y2);
    }
    
    // Add some noise-based organic shapes
    p.noStroke();
    p.colorMode(p.HSB);
    
    for (let i = 0; i < 20; i++) {
        let centerX = p.random(p.width);
        let centerY = p.random(p.height);
        let radius = p.random(30, 80);
        
        p.beginShape();
        for (let angle = 0; angle < p.TWO_PI; angle += 0.1) {
            let r = radius + p.noise(centerX * 0.01, centerY * 0.01, angle) * 20;
            let x = centerX + p.cos(angle) * r;
            let y = centerY + p.sin(angle) * r;
            p.vertex(x, y);
        }
        p.endShape(p.CLOSE);
        
        // Fill with semi-transparent color
        let hue = p.random(0, 360);
        p.fill(hue, 60, 80, 30);
    }
    
    // Reset color mode
    p.colorMode(p.RGB);
}