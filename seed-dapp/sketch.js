// --- sketch.js (deterministic; 2x2 normal, 3x3 rare) ---

let currentCanvas = null;

// Adjust rarity here (e.g., 0.10 = 10% chance 3x3)
const RARE_3x3_PROB = 0.12;

// Call this from app.js with your seeded integer:
//   window.generateArt(seedInt)
window.generateArt = function (seed) {
  if (currentCanvas) currentCanvas.remove();
  const container = document.getElementById("canvas-container");
  container.innerHTML = "";

  currentCanvas = new p5((p) => {
    // per-instance state
    let x1, x2, y2, x3, y3, x4;
    let grid; // 2 or 3
    const range = 250; // color hue span

    p.setup = function () {
      // deterministic seeds
      p.randomSeed(seed);
      p.noiseSeed(seed);

      // canvas
      const maxSize = Math.min(window.innerWidth, window.innerHeight) - 20;
      const c = p.createCanvas(maxSize, maxSize);
      c.parent("canvas-container");

      p.background(0);
      p.angleMode(p.DEGREES);
      p.colorMode(p.HSB, 360, 100, 100, 100);

      // ----- rarity: 2x2 normal, 3x3 rare (deterministic) -----
      // use the seeded PRNG so the rarity outcome is tied to seed
      grid = p.random() < RARE_3x3_PROB ? 3 : 2;

      const rMax = p.width / 2 / grid;

      // ----- palette (deterministic) -----
      const numColors = p.floor(p.random(4, 8));
      const palette = [];
      let col = p.random(360);
      for (let q = 0; q < numColors - 1; q++) {
        palette.push(col);
        col = col + range / numColors;
        if (col > 359) col = col - range;
      }

      // ----- tiles -----
      for (let m = 0; m < grid; m++) {
        for (let n = 0; n < grid; n++) {
          p.push();

          const petals = p.floor(p.random(8, 30 - grid));
          const layers = p.floor(p.random(4, 35 - grid));
          const ang = 360 / petals;

          p.translate(
            (p.width / grid) * m + p.width / grid / 2,
            (p.height / grid) * n + p.height / grid / 2
          );

          // layers (outer -> inner)
          for (let j = layers; j > 0; j--) {
            const currR = (j / layers) * rMax;

            x1 = p.random(0.35 * currR, 0.45 * currR);
            x2 = p.random(0.5 * currR, 0.7 * currR);

            const maxY2 = x2 * p.tan(ang) * 0.9;
            y2 = p.random(0.06 * currR, Math.max(0.06 * currR, maxY2));

            x3 = p.random(x2 * 1.1, 0.85 * currR);
            const maxY3 = x3 * p.tan(ang) * 0.9;
            y3 = p.random(0.06 * currR, Math.max(0.06 * currR, maxY3));

            x4 = p.random(0.88 * currR, 0.99 * currR);

            const hue = palette[p.floor(p.random(palette.length))];
            p.fill(hue, 100, 100, 35);

            // petals
            for (let i = 0; i < petals; i++) {
              p.noStroke();
              p.beginShape();
              p.curveVertex(x4, 0);
              p.curveVertex(x4, 0);
              p.curveVertex(x3, y3);
              p.curveVertex(x2, y2);
              p.curveVertex(x1, 0);
              p.curveVertex(x2, -y2);
              p.curveVertex(x3, -y3);
              p.curveVertex(x4, 0);
              p.curveVertex(x4, 0);
              p.endShape();
              p.rotate(ang);
            }
            p.rotate(ang / 2);
          }

          p.pop();
        }
      }

      // Optional: show rarity badge in console
      console.log(`Grid: ${grid}x${grid} (${grid === 3 ? "RARE" : "COMMON"})`);
    };

    // hotkeys: save & re-render same seed
    p.keyTyped = function () {
      if (p.key === "s") p.save("myCanvas.png");
      if (p.key === "n") window.generateArt(seed);
    };

    // keep it crisp on resize; reflow to same seed
    p.windowResized = function () {
      const maxSize = Math.min(window.innerWidth, window.innerHeight) - 20;
      p.resizeCanvas(maxSize, maxSize);
      // re-instanting is safest for determinism; trigger same-seed rebuild:
      window.generateArt(seed);
    };
  });
};

// Optional: auto-demo if opened standalone (no web3/app.js)
// if (!window.generateArtBootstrapped) {
//   window.addEventListener("DOMContentLoaded", () => {
//     if (!document.getElementById("canvas-container")) return;
//     const demoSeed = Math.floor(Math.random() * 0x7fffffff);
//     window.generateArt(demoSeed);
//   });
//   window.generateArtBootstrapped = true;
// }
