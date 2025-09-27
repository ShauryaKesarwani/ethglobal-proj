let x1, x2, y2, x3, y3, x4;
let numb;
let range = 250; // color range

function setup() {
  let maxSize = min(windowWidth, windowHeight) - 20;
  createCanvas(maxSize, maxSize);
  background(0);
  angleMode(DEGREES);
  colorMode(HSB, 360, 100, 100, 100);
  numb = floor(random(2, 2));
  let rMax = width / 2 / numb;

  // fill an array with color
  let numColors = random(4, 8);
  let palette = [];
  let col = random(360);
  for (let p = 0; p < numColors - 1; p++) {
    palette.push(col);
    col = col + range / numColors;
    if (col > 359) {
      col = col - range;
    }
  }

  for (let m = 0; m < numb; m++) {
    for (let n = 0; n < numb; n++) {
      push();
      let petals = floor(random(8, 30 - numb));
      let layers = random(4, 35 - numb);
      let ang = 360 / petals;
      translate(
        (width / numb) * m + width / numb / 2,
        (height / numb) * n + height / numb / 2
      );

      // create each layer with different variables
      for (let j = layers; j > 0; j--) {
        let currR = (j / layers) * rMax;
        x1 = random(0.35 * currR, 0.45 * currR);
        x2 = random(0.5 * currR, 0.7 * currR);
        let maxY2 = x2 * tan(ang) * 0.9;
        y2 = random(0.06 * currR, maxY2);
        //y2= x2*tan(ang);
        x3 = random(x2 * 1.1, 0.85 * currR);
        let maxY3 = x3 * tan(ang) * 0.9;
        y3 = random(0.06 * currR, maxY3);
        x4 = random(0.88 * currR, 0.99 * currR);
        //let hue = random(360);
        let hue = palette[floor(random(numColors - 1))];
        let sat = 100; //random(70, 100);
        let brt = 100; //random(70, 100);
        let alph = 35; //random(40, 100);
        fill(hue, sat, brt, alph);

        // draw the petals for one layer
        for (let i = 0; i < petals; i++) {
          noStroke();
          //stroke(0,0,0);
          beginShape();
          curveVertex(x4, 0);
          curveVertex(x4, 0);
          curveVertex(x3, y3);
          curveVertex(x2, y2);
          curveVertex(x1, 0);
          curveVertex(x2, -y2);
          curveVertex(x3, -y3);
          curveVertex(x4, 0);
          curveVertex(x4, 0);
          endShape();
          //stroke(hue,sat,brt,alph);
          strokeWeight(5);
          //line(x1,0,x4,0);
          rotate(ang);
        }
        rotate(ang / 2);
      }
      pop();
    }
  }
}

function keyTyped() {
  if (key === "s") {
    save("myCanvas.jpg");
  }
  if (key === "n") {
    setup();
  }
}
