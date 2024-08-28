const im_res = 900;
const zoomIntensity = 0.1;
const max_iter = 100;

let julia_ca = 0.0;
let julia_cb = 0.0;

function mouse_on_canves(mousex, mousey) {
  return (
    (0 < mousex) & (mousex < im_res) & (0 < mousey) & (mousey < im_res)
  );
}

var mandelbrot = function (p) {
  var cx = -0.5;
  var cy = 0.0;
  var scale = 2;
  var set_julia_c = true;
  p.setup = function () {
    var canvas = p.createCanvas(im_res, im_res);
    canvas.parent("#mandelbrot");
    p.pixelDensity(1);
  };

  p.draw = function () {
    p.background(0, 0, 0);
    p.loadPixels();
    for (var x = 0; x < im_res; x++) {
      for (var y = 0; y < im_res; y++) {
        var ca = p.map(x, 0, im_res, cx - scale, cx + scale);
        var cb = p.map(y, 0, im_res, cy - scale, cy + scale);
        var a = 0.0;
        var b = 0.0;
        var n = 0;
        while (n < max_iter) {
          var aa_bb = a * a - b * b;
          var two_ab = 2 * a * b;
          a = aa_bb + ca;
          b = two_ab + cb;
          if (a * a + b * b > 16) {
            break;
          }
          n++;
        }
        var pix = (x + y * p.width) * 4;
        if (n == max_iter) {
          p.pixels[pix + 0] = 0;
          p.pixels[pix + 1] = 0;
          p.pixels[pix + 2] = 0;
          p.pixels[pix + 3] = 255;
        } else {
          p.pixels[pix + 0] = p.sqrt(n/max_iter)*255 ;
          p.pixels[pix + 1] = 35;
          p.pixels[pix + 2] = 100;
          p.pixels[pix + 3] = 255;
        }
      }
    }
    p.updatePixels();
    if (mouse_on_canves(p.mouseX, p.mouseY) & set_julia_c) {
      julia_ca = p.map(p.mouseX, 0, im_res, cx - scale, cx + scale);
      julia_cb = p.map(p.mouseY, 0, im_res, cy - scale, cy + scale);
    }
  };

  p.mouseClicked = function(){
    set_julia_c = !set_julia_c;
  }

  p.mouseWheel = function (event) {
    if (!mouse_on_canves(p.mouseX, p.mouseY)) {
      return;
    }
    var dx = p.map(p.mouseX, 0, im_res, cx - scale, cx + scale);
    var dy = p.map(p.mouseY, 0, im_res, cy - scale, cy + scale);

    ratio_x = (cx + scale - dx) / (dx - cx + scale);
    ratio_y = (cy + scale - dy) / (dy - cy + scale);

    const zoom = event.deltaY < 0 ? Math.exp(-zoomIntensity) : Math.exp(zoomIntensity);
    scale *= zoom;

    cx = (ratio_x * (dx + scale) - scale + dx) / (1 + ratio_x);
    cy = (ratio_y * (dy + scale) - scale + dy) / (1 + ratio_y);
  };
};

var julia = function (p) {
  var cx = 0.0;
  var cy = 0.0;
  var scale = 2.0;
  p.setup = function () {
    var canvas = p.createCanvas(im_res, im_res);
    canvas.parent("#julia");
    p.pixelDensity(1);
  };

  p.draw = function () {
    p.background(0, 0, 0);
    p.loadPixels();
    for (var x = 0; x < im_res; x++) {
      for (var y = 0; y < im_res; y++) {
        var a = p.map(x, 0, im_res, cx - scale, cx + scale);
        var b = p.map(y, 0, im_res, cy - scale, cy + scale);
        var n = 0;
        while (n < max_iter) {
          var aa_bb = a * a - b * b;
          var two_ab = 2 * a * b;
          a = aa_bb + julia_ca;
          b = two_ab + julia_cb;
          if (a * a + b * b > 16) {
            break;
          }
          n++;
        }
        var pix = (x + y * p.width) * 4;
        if (n == max_iter) {
          p.pixels[pix + 0] = 0;
          p.pixels[pix + 1] = 0;
          p.pixels[pix + 2] = 0;
          p.pixels[pix + 3] = 255;
        } else {
          p.pixels[pix + 0] = p.sqrt(n/max_iter)*255 ;
          p.pixels[pix + 1] = 35;
          p.pixels[pix + 2] = 100;
          p.pixels[pix + 3] = 255;
        }
      }
    }
    p.updatePixels();
  };

  p.mouseWheel = function (event) {
    if (!mouse_on_canves(p.mouseX, p.mouseY)) {
      return;
    }
    var dx = p.map(p.mouseX, 0, im_res, cx - scale, cx + scale);
    var dy = p.map(p.mouseY, 0, im_res, cy - scale, cy + scale);

    ratio_x = (cx + scale - dx) / (dx - cx + scale);
    ratio_y = (cy + scale - dy) / (dy - cy + scale);

    const zoom = event.deltaY < 0 ? Math.exp(-zoomIntensity) : Math.exp(zoomIntensity);
    scale *= zoom;

    cx = (ratio_x * (dx + scale) - scale + dx) / (1 + ratio_x);
    cy = (ratio_y * (dy + scale) - scale + dy) / (1 + ratio_y);
  };
};

var myFirstSketch = new p5(mandelbrot);

var mySecondSketch = new p5(julia);
