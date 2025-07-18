import numpy as np
import matplotlib.pyplot as plt
from matplotlib.collections import LineCollection
from matplotlib.colors import ListedColormap, hsv_to_rgb

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

def tanh_blend_remap(x, center=0.5, width=3):
    # New version: tanh(x) + x, normalized to [0,1]
    x = np.asarray(x)
    a = 4.0 / width  # controls steepness
    t = np.tanh(a * (x - center)) + x
    # Normalize so f(0)=0, f(1)=1
    t0 = np.tanh(-a * center) + 0
    t1 = np.tanh(a * (1 - center)) + 1
    return (t - t0) / (t1 - t0)

def new_colormap(N=256):

    hues = np.linspace(0, 1, N, endpoint=False)
    # new_hues = tanh_blend_remap(hues, center=0.5, width=1)

    colors = plt.get_cmap('gist_rainbow')(hues)
    colors[:, :3] *= 0.7  # Darken RGB channels
    return ListedColormap(colors, name='new_cmap')

def cyclic_dark_rainbow_colormap(N=256, value=0.7, saturation=0.9, use_tanh=True):

    hues = np.linspace(0, 1, N, endpoint=False)
    if use_tanh:
        new_hues = tanh_blend_remap(hues)
    else:
        new_hues = hues
    hsv = np.stack([new_hues, np.full_like(new_hues, saturation), np.full_like(new_hues, value)], axis=1)
    colors = hsv_to_rgb(hsv)
    return ListedColormap(colors, name='cyclic_dark_rainbow')


def plot_curve(points, colormap='hsv', save_svg=None, linewidth=2, color=None):
    
    x, y = zip(*points)
    fig, ax = plt.subplots(figsize=(8, 8))
    if color:
        ax.plot(x,y, color=color)
    else:
        segments = [((x[i], y[i]), (x[i+1], y[i+1])) for i in range(len(x)-1)]
        color_vals = np.linspace(0, 1, len(segments))
        if colormap == 'cyclic_rainbow':
            cmap = cyclic_dark_rainbow_colormap()
        elif colormap == 'new_cmap':
            cmap = new_colormap()
        else:
            cmap = plt.get_cmap(colormap)
        colors = cmap(color_vals)
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

def lsystem_points(axiom, rules, n, angle_deg, step=1.0, start_pos=(0,0), start_angle=0, draw_symbols='F'):
    """
    General L-system interpreter for 2D curves.
    axiom: initial string
    rules: dict of replacement rules
    n: number of iterations
    angle_deg: turning angle in degrees
    step: step size for each drawing symbol
    start_pos: starting (x, y) position
    start_angle: starting angle in degrees
    draw_symbols: string of symbols that should move the pen (default 'F')
    Returns: list of (x, y) points
    """
    # Generate the L-system string
    seq = axiom
    for _ in range(n):
        seq = ''.join(rules.get(c, c) for c in seq)
    # Interpret the string
    pos = np.array(start_pos, dtype=float)
    angle = np.radians(start_angle)
    points = [tuple(pos)]
    stack = []
    for c in seq:
        if c in draw_symbols:
            pos += step * np.array([np.cos(angle), np.sin(angle)])
            points.append(tuple(pos))
        elif c == '+':
            angle += np.radians(angle_deg)
        elif c == '-':
            angle -= np.radians(angle_deg)
        elif c == '[':
            stack.append((pos.copy(), angle))
        elif c == ']':
            pos, angle = stack.pop()
    return points

def hilbert_curve_points_lsys(n):
    axiom = 'A'
    rules = {'A': '+BF-AFA-FB+', 'B': '-AF+BFB+FA-'}
    return lsystem_points(axiom, rules, n, angle_deg=90, step=1.0/(2**n-1), start_pos=(0,0), start_angle=0, draw_symbols='F')

def gosper_curve_points_lsys(n):
    axiom = 'A'
    rules = {'A': 'A+B++B-A--AA-B+', 'B': '-A+BB++B+A--A-B'}
    return lsystem_points(axiom, rules, n, angle_deg=60, step=1.0, start_pos=(0,0), start_angle=0, draw_symbols=['A', 'B'])

def dragon_curve_points_lsys(n):
    axiom = 'FX'
    rules = {'X': 'X+YF+', 'Y': '-FX-Y'}
    return lsystem_points(axiom, rules, n, angle_deg=90, step=1.0, start_pos=(0,0), start_angle=0, draw_symbols='F')

def plot_hilbert_curve(n, colormap='hsv', save_svg=None):
    points = hilbert_curve_points_lsys(n)
    plot_curve(points, colormap=colormap, save_svg=save_svg, linewidth=(8-n)**2)

def plot_dragon_curve(n, colormap='hsv', save_svg=None):
    points = dragon_curve_points_lsys(n)
    round_points = octagonize_polyline(points, 0.3)
    plot_curve(round_points, colormap=colormap, save_svg=save_svg, linewidth=1)

def plot_gosper_curve(n, colormap='hsv', save_svg=None):
    points = gosper_curve_points_lsys(n)
    plot_curve(points, colormap=colormap, save_svg=save_svg, linewidth=(6-n)**2)


def octagonize_polyline(points, frac=0.3):
    """
    Replace each corner with two points, so the corner is cut off and the path forms an octagon-like shape.
    frac: fraction along each segment to place the new points (e.g., 0.3 for 30%)
    """
    if len(points) < 3:
        return points
    new_points = [points[0]]
    for i in range(1, len(points)-1):
        A = np.array(points[i-1], dtype=float)
        B = np.array(points[i], dtype=float)
        C = np.array(points[i+1], dtype=float)
        p1 = (1-frac)*B + frac*A
        p2 = (1-frac)*B + frac*C
        new_points.append(tuple(p1))
        new_points.append(tuple(p2))
    new_points.append(points[-1])
    return new_points

if __name__ == "__main__":
    h = 6
    d = 12
    g = 4
    # plot_remap()
    plot_hilbert_curve(h, colormap='new_cmap', save_svg=f'hilbert_curve_{h}.svg')
    plot_dragon_curve(d, colormap='new_cmap', save_svg=f'dragon_curve_{d}.svg')
    plot_gosper_curve(g, colormap='cyclic_rainbow', save_svg=f'gosper_curve_{g}.svg')
