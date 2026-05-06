// Penrose tiling via parallel lines in 5 directions
var DEG = Math.PI / 180;
var directions = [0, 72, 144, 216, 288]; // 5 directions in degrees

window.getPenroseData = function(lines, spacing, size) {
  // Calculate line equations for each direction
  const lineSets = directions.map((angle) => {
    const rad = angle * DEG;
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);
    const set = [];
    for (let i = -Math.floor(lines/2); i <= Math.floor(lines/2); i++) {
      set.push({dx, dy, offset: i * spacing});
    }
    return set;
  });

  // Find intersections between lines from different sets
  let points = [];
  for (let a = 0; a < 5; a++) {
    for (let b = a+1; b < 5; b++) {
      for (const la of lineSets[a]) {
        for (const lb of lineSets[b]) {
          const det = la.dx * lb.dy - lb.dx * la.dy;
          if (Math.abs(det) < 1e-6) continue;
          const x = (lb.dy * la.offset - la.dy * lb.offset) / det + size/2;
          const y = (la.dx * lb.offset - lb.dx * la.offset) / det + size/2;
          if (x >= 0 && x <= size && y >= 0 && y <= size) {
            points.push({x, y, a, b});
          }
        }
      }
    }
  }

  // Find rhombuses
  let rhombuses = [];
  for (let a = 0; a < 5; a++) {
    for (let b = a+1; b < 5; b++) {
      for (let ia = -Math.floor(lines/2); ia < Math.floor(lines/2); ia++) {
        for (let ib = -Math.floor(lines/2); ib < Math.floor(lines/2); ib++) {
          let pts = [];
          for (let da = 0; da <= 1; da++) {
            for (let db = 0; db <= 1; db++) {
              const la = lineSets[a][ia+Math.floor(lines/2)+da];
              const lb = lineSets[b][ib+Math.floor(lines/2)+db];
              if (!la || !lb) continue;
              const det = la.dx * lb.dy - lb.dx * la.dy;
              if (Math.abs(det) < 1e-6) continue;
              const x = (lb.dy * la.offset - la.dy * lb.offset) / det + size/2;
              const y = (la.dx * lb.offset - lb.dx * la.offset) / det + size/2;
              if (x >= 0 && x <= size && y >= 0 && y <= size) {
                pts.push({x, y});
              }
            }
          }
          if (pts.length === 4) {
            const angleDiff = Math.abs(directions[a] - directions[b]) % 180;
            let type = '';
            if (angleDiff === 72 || angleDiff === 108) {
              type = 'thick';
            } else if (angleDiff === 36 || angleDiff === 144) {
              type = 'thin';
            } else {
              type = 'other';
            }
            rhombuses.push({pts, type});
          }
        }
      }
    }
  }
  return {lineSets, points, rhombuses};

window.drawLinesAndIntersections = function(lineSets, points, size) {
  let svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="${size}" height="${size}" fill="#fff"/>`;
  // Draw lines
  lineSets.forEach((set, i) => {
    set.forEach((line) => {
      const cx = size/2, cy = size/2;
      let pts = [];
      [0, size].forEach((border) => {
        let t = (border - cx) / line.dx;
        let y = cy + t * line.dy;
        if (y >= 0 && y <= size) pts.push({x: border, y});
        t = (border - cy) / line.dy;
        let x = cx + t * line.dx;
        if (x >= 0 && x <= size) pts.push({x, y: border});
      });
      if (pts.length >= 2) {
        svg += `<line x1="${pts[0].x}" y1="${pts[0].y}" x2="${pts[1].x}" y2="${pts[1].y}" stroke="#bbb" stroke-width="1"/>`;
      }
    });
  });
  // Draw intersection points
  points.forEach(pt => {
    svg += `<circle cx="${pt.x}" cy="${pt.y}" r="2" fill="#0077ff"/>`;
  });
  svg += `</svg>`;
  return svg;
}

window.drawRhombuses = function(rhombuses, size) {
  let svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">`;
  svg += `<rect width="${size}" height="${size}" fill="#fff"/>`;
  rhombuses.forEach(rh => {
    const color = rh.type === 'thick' ? '#ffcc00' : rh.type === 'thin' ? '#66ccff' : '#ccc';
    const ptsStr = rh.pts.map(p => `${p.x},${p.y}`).join(' ');
    svg += `<polygon points="${ptsStr}" fill="${color}" stroke="#333" stroke-width="0.5" />`;
  });
  svg += `</svg>`;
  return svg;
}
}

function updateSVG() {
  const lines = parseInt(document.getElementById('lines').value);
  const spacing = parseInt(document.getElementById('spacing').value);
  const size = parseInt(document.getElementById('size').value);
  const data = getPenroseData(lines, spacing, size);
  document.getElementById('svg-lines').innerHTML = drawLinesAndIntersections(data.lineSets, data.points, size);
  document.getElementById('svg-rhombuses').innerHTML = drawRhombuses(data.rhombuses, size);
}

document.getElementById('config-form').addEventListener('submit', function(e) {
  e.preventDefault();
  updateSVG();
});

document.addEventListener('DOMContentLoaded', function() {
  updateSVG();
});
