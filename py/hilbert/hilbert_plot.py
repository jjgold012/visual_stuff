import numpy as np
import matplotlib.pyplot as plt
from matplotlib.collections import LineCollection

def hilbert_curve(n, angle=90):
    """
    Generate the points of a Hilbert curve of order n.
    Returns a list of (x, y) tuples.
    """
    def hilbert(level, angle, step, x, y, heading, points):
        if level == 0:
            return x, y, heading
        heading += angle
        x, y, heading = hilbert(level-1, -angle, step, x, y, heading, points)
        x += step * round(np.cos(np.radians(heading)), 10)
        y += step * round(np.sin(np.radians(heading)), 10)
        points.append((x, y))
        heading -= angle
        x, y, heading = hilbert(level-1, angle, step, x, y, heading, points)
        x += step * round(np.cos(np.radians(heading)), 10)
        y += step * round(np.sin(np.radians(heading)), 10)
        points.append((x, y))
        x, y, heading = hilbert(level-1, angle, step, x, y, heading, points)
        heading -= angle
        x += step * round(np.cos(np.radians(heading)), 10)
        y += step * round(np.sin(np.radians(heading)), 10)
        points.append((x, y))
        x, y, heading = hilbert(level-1, -angle, step, x, y, heading, points)
        heading += angle
        return x, y, heading

    points = [(0, 0)]
    step = 1.0 / (2 ** n - 1)
    hilbert(n, angle, step, 0, 0, 0, points)
    return points

def plot_hilbert(n, colormap='hsv', save_svg=None):
    points = hilbert_curve(n)
    x, y = zip(*points)
    # Create segments for LineCollection
    segments = [((x[i], y[i]), (x[i+1], y[i+1])) for i in range(len(x)-1)]
    # Color values for each segment
    color_vals = np.linspace(0, 1, len(segments))
    cmap = plt.get_cmap(colormap)
    colors = cmap(color_vals)
    fig, ax = plt.subplots(figsize=(8, 8))
    lc = LineCollection(segments, colors=colors, linewidths=2**(7-n), capstyle ='round')
    ax.add_collection(lc)
    margin = 0.05  # 1% margin
    x_min, x_max = min(x), max(x)
    y_min, y_max = min(y), max(y)
    x_range = x_max - x_min
    y_range = y_max - y_min
    ax.set_xlim(x_min - margin * x_range, x_max + margin * x_range)
    ax.set_ylim(y_min - margin * y_range, y_max + margin * y_range)
    ax.set_aspect('equal')
    ax.axis('off')
    fig.patch.set_alpha(0.0)
    ax.patch.set_alpha(0.0)
    if save_svg:
        plt.savefig(save_svg, format='svg', transparent=True)
    plt.show()

if __name__ == "__main__":
    n = 2  # Order of the Hilbert curve
    plot_hilbert(n, colormap='hsv', save_svg=f'hilbert_curve_{n}.svg')
