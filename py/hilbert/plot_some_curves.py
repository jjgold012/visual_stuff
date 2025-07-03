import numpy as np
import matplotlib.pyplot as plt
from matplotlib.collections import LineCollection
from matplotlib.colors import ListedColormap, hsv_to_rgb


def tanh_blend_remap(x, center=0.4, width=1.5):
    # New version: tanh(x) + x, normalized to [0,1]
    x = np.asarray(x)
    a = 4.0 / width  # controls steepness
    t = np.tanh(a * (x - center)) + x
    # Normalize so f(0)=0, f(1)=1
    t0 = np.tanh(-a * center) + 0
    t1 = np.tanh(a * (1 - center)) + 1
    return (t - t0) / (t1 - t0)

def cyclic_dark_rainbow_colormap(N=256, value=0.7, saturation=0.9, use_tanh=True):

    hues = np.linspace(0, 1, N, endpoint=False)
    if use_tanh:
        new_hues = tanh_blend_remap(hues)
    else:
        new_hues = hues
    hsv = np.stack([new_hues, np.full_like(new_hues, saturation), np.full_like(new_hues, value)], axis=1)
    colors = hsv_to_rgb(hsv)
    return ListedColormap(colors, name='cyclic_dark_rainbow')

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

def plot_curve(points, colormap='hsv', save_svg=None, linewidth=3):
    x, y = zip(*points)
    segments = [((x[i], y[i]), (x[i+1], y[i+1])) for i in range(len(x)-1)]
    color_vals = np.linspace(0, 1, len(segments))
    if colormap == 'cyclic_rainbow':
        cmap = cyclic_dark_rainbow_colormap()
    else:
        cmap = plt.get_cmap(colormap)
    colors = cmap(color_vals)
    fig, ax = plt.subplots(figsize=(8, 8))
    lc = LineCollection(segments, colors=colors, linewidths=linewidth, capstyle='round')
    ax.add_collection(lc)
    margin = 0.05
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

def plot_hilbert(n, colormap='hsv', save_svg=None):
    points = hilbert_curve(n)
    plot_curve(points, colormap=colormap, save_svg=save_svg, linewidth=(8-n)**2)

def plot_remap():
    x = np.linspace(0, 1, 500)
    y = tanh_blend_remap(x)
    plt.figure(figsize=(6, 4))
    plt.plot(x, y, label='Remapping function')
    plt.plot(x, x, '--', color='gray', label='Identity')
    plt.xlabel('Original hue')
    plt.ylabel('Remapped hue')
    plt.title('Hue Remapping Function')
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.show()

def dragon_curve_points(n):
    """Generate points for the Dragon curve of order n using numpy."""
    seq = [1]
    for _ in range(n-1):
        seq = seq + [1] + [-x for x in reversed(seq)]
    z = 0 + 0j
    points = [z]
    for turn in seq:
        if len(points) == 1:
            angle = 0
        else:
            angle = np.angle(points[-1] - points[-2])
        z = points[-1] + np.exp(1j * (angle + turn * np.pi/2))
        points.append(z)
    return [(p.real, p.imag) for p in points]

def plot_dragon_curve(n, colormap='hsv', save_svg=None):
    points = dragon_curve_points(n)
    plot_curve(points, colormap=colormap, save_svg=save_svg)

def gosper_curve_points(n):
    """Generate points for the Gosper (flowsnake) curve of order n using numpy."""
    # Gosper curve L-system
    rules = {'A': 'A+B++B-A--AA-B+', 'B': '-A+BB++B+A--A-B'}
    seq = 'A'
    for _ in range(n):
        seq = ''.join(rules.get(c, c) for c in seq)
    angle = np.pi / 3  # 60 degrees
    directions = {'+': angle, '-': -angle}
    pos = 0 + 0j
    heading = 0.0
    points = [pos]
    for c in seq:
        if c in 'AB':
            pos += np.exp(1j * heading)
            points.append(pos)
        elif c in directions:
            heading += directions[c]
    return [(p.real, p.imag) for p in points]

def plot_gosper_curve(n, colormap='hsv', save_svg=None):
    points = gosper_curve_points(n)
    plot_curve(points, colormap=colormap, save_svg=save_svg, linewidth=(6-n)**2)

if __name__ == "__main__":
    h = 4
    d = 11
    g = 3
    # plot_remap()
    plot_hilbert(h, colormap='cyclic_rainbow', save_svg=f'hilbert_curve_{h}.svg')
    plot_dragon_curve(d, colormap='cyclic_rainbow', save_svg=f'dragon_curve_{d}.svg')
    plot_gosper_curve(g, colormap='cyclic_rainbow', save_svg=f'gosper_curve_{g}.svg')
