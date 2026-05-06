let max_iter;
let param_inputs = {};
let scale = 1;
const f_names = ["f1", "f2", "f3", "f4"];
const param_names = ["a", "b", "c", "d", "e", "f", "p"];
const ferns_params = [
  {
    name: "Barnsley",
    f1: { a: 0, b: 0, c: 0, d: 0.16, e: 0, f: 0, p: 0.01 },
    f2: { a: 0.85, b: 0.04, c: -0.04, d: 0.85, e: 0, f: 1.6, p: 0.85 },
    f3: { a: 0.2, b: -0.26, c: 0.23, d: 0.22, e: 0, f: 1.6, p: 0.07 },
    f4: { a: -0.15, b: 0.28, c: 0.26, d: 0.24, e: 0, f: 0.44, p: 0.07 },
  },
  {
    name: "Modified Barnsley",
    f1: { a: 0, b: 0, c: 0, d: 0.2, e: 0, f: -0.12, p: 0.01 },
    f2: { a: 0.845, b: 0.035, c: -0.035, d: 0.82, e: 0, f: 1.6, p: 0.85 },
    f3: { a: 0.2, b: -0.31, c: 0.255, d: 0.245, e: 0, f: 0.29, p: 0.07 },
    f4: { a: -0.15, b: 0.24, c: 0.25, d: 0.2, e: 0, f: 0.68, p: 0.07 },
  },
  {
    name: "Cyclosorus",
    f1: { a: 0, b: 0, c: 0, d: 0.25, e: 0, f: -0.4, p: 0.02 },
    f2: { a: 0.95, b: 0.005, c: -0.005, d: 0.93, e: -0.002, f: 0.5, p: 0.84 },
    f3: { a: 0.035, b: -0.2, c: 0.16, d: 0.04, e: -0.09, f: 0.02, p: 0.07 },
    f4: { a: -0.04, b: 0.2, c: 0.16, d: 0.04, e: -0.083, f: 0.12, p: 0.07 },
  },
  {
    name: "Culcita",
    f1: { a: 0, b: 0, c: 0, d: 0.25, e: 0, f: -0.14, p: 0.02 },
    f2: { a: 0.85, b: 0.02, c: -0.02, d: 0.83, e: 0, f: 1, p: 0.84 },
    f3: { a: 0.09, b: -0.28, c: 0.3, d: 0.11, e: 0, f: 0.6, p: 0.07 },
    f4: { a: -0.09, b: 0.28, c: 0.3, d: 0.09, e: 0, f: 0.7, p: 0.07 },
  },
  {
    name: "Fishbone",
    f1: { a: 0, b: 0, c: 0, d: 0.25, e: 0, f: -0.4, p: 0.02 },
    f2: { a: 0.95, b: 0.002, c: -0.002, d: 0.93, e: -0.002, f: 0.5, p: 0.84 },
    f3: { a: 0.035, b: -0.11, c: 0.27, d: 0.01, e: -0.05, f: 0.005, p: 0.07 },
    f4: { a: -0.04, b: 0.11, c: 0.27, d: 0.01, e: 0.047, f: 0.06, p: 0.07 },
  },
  {
    name: "Fractal Tree",
    f1: { a: 0, b: 0, c: 0, d: 0.5, e: 0, f: 0, p: 0.05 },
    f2: { a: 0.42, b: -0.42, c: 0.42, d: 0.42, e: 0, f: 0.2, p: 0.4 },
    f3: { a: 0.42, b: 0.42, c: -0.42, d: 0.42, e: 0, f: 0.2, p: 0.4 },
    f4: { a: 0.1, b: 0, c: 0, d: 0.1, e: 0, f: 0.2, p: 0.15 },
    scale: 20,
  },
];

function set_param_inputs(selected) {
  let params = ferns_params.find((params) => params["name"] == selected);
  for (let i = 0; i < f_names.length; i++) {
    for (let j = 0; j < param_names.length; j++) {
      param_inputs[f_names[i]][param_names[j]].value(
        params[f_names[i]][param_names[j]]
      );
    }
  }
  scale = "scale" in params ? params["scale"] : 1;
}

function setup() {
  createCanvas(1000, 1000);
  let ferns = createSelect(false);
  ferns.position(width + 40, 20);
  for (let i = 0; i < ferns_params.length; i++) {
    ferns.option(ferns_params[i]["name"]);
  }
  ferns.mouseClicked(() => set_param_inputs(ferns.selected()));

  for (let i = 0; i < 4; i++) {
    let f_name = "f" + str(i + 1);
    let t = createP(f_name);
    t.position(width + 40 + i * 40, 50);
    param_inputs[f_name] = {};
    for (let j = 0; j < param_names.length; j++) {
      if (i == 0) {
        let p = createP(param_names[j]);
        p.position(width + 10, (j + 1) * 40 + 50);
      }
      var param = createInput();
      param.position(width + 40 + i * 40, (j + 1.5) * 40 + 50);
      param.size(30);
      param_inputs[f_name][param_names[j]] = param;
    }
  }
  let p = createP("Number of iterations");
  p.position(width+40, 380)
  max_iter = createInput(100000);
  max_iter.position(width + 40, 420);
  max_iter.size(70)
  let b = createButton("Draw");
  b.position(width + 120, 420);
  b.size(60);
  b.mouseClicked(() => draw());
  pixelDensity(1);
}

function draw() {
  background(255);
  x = 0.0;
  y = 0.0;
  n = 0;
  xn = 0.0;
  yn = 0.0;
  stroke(0, 150, 0, 255);
  strokeWeight(1);
  let f_p = new Array(f_names.length).fill(
    float(param_inputs["f1"]["p"].value())
  );
  for (let i = 1; i < f_names.length; i++) {
    f_p[i] = f_p[i - 1] + float(param_inputs["f" + str(i + 1)]["p"].value());
  }
  while (n < int(max_iter.value())) {
    px = map(x*scale, -10 , 10 , 0, width);
    py = map(y*scale, -5 , 15 , height, 0);
    point(px, py);
    r = random(0, 1);
    if (r < f_p[0]) {
      xn =
        float(param_inputs["f1"]["a"].value()) * x +
        float(param_inputs["f1"]["b"].value()) * y +
        float(param_inputs["f1"]["e"].value());
      yn =
        float(param_inputs["f1"]["c"].value()) * x +
        float(param_inputs["f1"]["d"].value()) * y +
        float(param_inputs["f1"]["f"].value());
    } else if (r < f_p[1]) {
      xn =
        float(param_inputs["f2"]["a"].value()) * x +
        float(param_inputs["f2"]["b"].value()) * y +
        float(param_inputs["f2"]["e"].value());
      yn =
        float(param_inputs["f2"]["c"].value()) * x +
        float(param_inputs["f2"]["d"].value()) * y +
        float(param_inputs["f2"]["f"].value());
    } else if (r < f_p[2]) {
      xn =
        float(param_inputs["f3"]["a"].value()) * x +
        float(param_inputs["f3"]["b"].value()) * y +
        float(param_inputs["f3"]["e"].value());
      yn =
        float(param_inputs["f3"]["c"].value()) * x +
        float(param_inputs["f3"]["d"].value()) * y +
        float(param_inputs["f3"]["f"].value());
    } else {
      xn =
        float(param_inputs["f4"]["a"].value()) * x +
        float(param_inputs["f4"]["b"].value()) * y +
        float(param_inputs["f4"]["e"].value());
      yn =
        float(param_inputs["f4"]["c"].value()) * x +
        float(param_inputs["f4"]["d"].value()) * y +
        float(param_inputs["f4"]["f"].value());
    }
    x = xn;
    y = yn;
    n += 1;
  }
  noLoop();
}
