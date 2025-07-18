import xml.etree.ElementTree as ET
import sys
import random
import tkinter as tk
from tkinter import colorchooser

def get_polygon_centroid(points):
    # points: string like "x1,y1 x2,y2 ..."
    coords = [tuple(map(float, pt.split(','))) for pt in points.strip().split()]
    x = [c[0] for c in coords]
    y = [c[1] for c in coords]
    centroid = (sum(x) / len(x), sum(y) / len(y))
    return centroid


def get_all_polygon_bounds(polygons):
    min_x = min_y = float('inf')
    max_x = max_y = float('-inf')
    for poly in polygons:
        points = poly.attrib.get('points')
        if not points:
            continue
        coords = [tuple(map(float, pt.split(','))) for pt in points.strip().split()]
        for x, y in coords:
            min_x = min(min_x, x)
            max_x = max(max_x, x)
            min_y = min(min_y, y)
            max_y = max(max_y, y)
    return min_x, max_x, min_y, max_y


def location_to_color(x, y, min_x, max_x, min_y, max_y):
    # Scale x/y based on polygon bounds
    r = int(255 * (x - min_x) / (max_x - min_x)) if max_x > min_x else 128
    g = int(255 * (y - min_y) / (max_y - min_y)) if max_y > min_y else 128
    b = 128
    return f'rgb({r},{g},{b})'


def pick_colors():
    root = tk.Tk()
    root.withdraw()
    colors = []
    for i in range(3):
        color = colorchooser.askcolor(title=f"Pick color {i+1}")[1]
        if color is None:
            color = '#808080'  # fallback
        colors.append(color)
    root.destroy()
    return colors


def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16)/255.0 for i in (0, 2, 4))


def interpolate_color(colors, t):
    # Linear interpolation between 3 colors
    c0, c1, c2 = [hex_to_rgb(c) for c in colors]
    if t < 0.5:
        frac = t * 2
        rgb = [c0[i] + frac * (c1[i] - c0[i]) for i in range(3)]
    else:
        frac = (t - 0.5) * 2
        rgb = [c1[i] + frac * (c2[i] - c1[i]) for i in range(3)]
    return 'rgb({},{},{})'.format(int(rgb[0]*255), int(rgb[1]*255), int(rgb[2]*255))


def interpolate_hex(c1, c2):
    # Interpolate two hex colors and return the midpoint color in hex
    def hex_to_rgb(hex_color):
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    def rgb_to_hex(rgb):
        return '#{:02x}{:02x}{:02x}'.format(*rgb)
    rgb1 = hex_to_rgb(c1)
    rgb2 = hex_to_rgb(c2)
    mid_rgb = tuple(int((a + b) / 2) for a, b in zip(rgb1, rgb2))
    return rgb_to_hex(mid_rgb)


def get_palette(colors):
    # Given 3 colors, interpolate 2 more between them
    c1, c2, c3 = colors
    c12 = interpolate_hex(c1, c2)
    c23 = interpolate_hex(c2, c3)
    return [c1, c12, c2, c23, c3]


def pick_color_by_probability(colors, t):
    # t: normalized position (0=bottom, 1=top)
    # 5 colors: bottom, lower-mid, middle, upper-mid, top
    n = len(colors)
    # Create probabilities for each color based on t
    centers = [i/(n-1) for i in range(n)]
    probs = [max(0, 1-abs(t-c)*n/2) for c in centers]
    total = sum(probs)
    probs = [p/total for p in probs]
    return random.choices(colors, weights=probs, k=1)[0]


def recolor_svg_polygons(svg_path, output_path):
    ET.register_namespace('', "http://www.w3.org/2000/svg")
    tree = ET.parse(svg_path)
    root = tree.getroot()
    polygons = root.findall('.//{http://www.w3.org/2000/svg}polygon')
    polygons += root.findall('.//polygon')
    min_x, max_x, min_y, max_y = get_all_polygon_bounds(polygons)
    base_colors = pick_colors()
    palette = get_palette(base_colors)
    for poly in polygons:
        points = poly.attrib.get('points')
        if not points:
            continue
        cx, cy = get_polygon_centroid(points)
        t = (cy - min_y) / (max_y - min_y) if max_y > min_y else 0.5
        color = pick_color_by_probability(palette, t)
        opacity = round(random.uniform(0.5, 1.0), 2)
        poly.set('fill', color)
        poly.set('opacity', str(opacity))
        style = poly.attrib.get('style')
        if style:
            import re
            # Replace or add fill and opacity in style
            if re.search(r'fill:[^;]+', style):
                style = re.sub(r'fill:[^;]+', f'fill:{color}', style)
            else:
                style = style + f';fill:{color}'
            if re.search(r'opacity:[^;]+', style):
                style = re.sub(r'opacity:[^;]+', f'opacity:{opacity}', style)
            else:
                style = style + f';opacity:{opacity}'
            poly.set('style', style)
        else:
            poly.set('style', f'fill:{color};opacity:{opacity}')
    tree.write(output_path, encoding='utf-8', xml_declaration=True)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python color_polygons_by_location.py input.svg output.svg")
        sys.exit(1)
    recolor_svg_polygons(sys.argv[1], sys.argv[2])
