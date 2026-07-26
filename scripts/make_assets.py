"""Generate the Ente Highlights app icon / splash / favicon assets.

Run:  /tmp/.imgvenv/bin/python scripts/make_assets.py [--preview]

The mark is the Ente Photos icon (vendored from ente-io/ente under
assets/vendor/) with a sparkle badge added in the top-right corner, mirroring
the heart badge in the top-left.

The badge deliberately copies the source art's design language, measured off the
original: a chunky near-black outline, a flat hard-edged ~9% black drop shadow
(no blur), a soft round specular highlight, and a slight tilt.

The badge is positioned relative to the *artwork* bounding box rather than the
canvas, so the full-bleed icon and the inset adaptive-icon foreground both get it
in the same place. Badge art is rendered at 4x and downsampled before being
composited, which keeps the vendored artwork pixel-for-pixel intact.

`--preview` writes a side-by-side contact sheet of the style variants instead of
overwriting the real assets.
"""

from __future__ import annotations

import math
import os
import sys

from PIL import Image, ImageChops, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets")
VENDOR = os.path.join(OUT, "vendor")
SRC_GREEN = os.path.join(VENDOR, "ente-photos-icon-green.png")
SRC_FOREGROUND = os.path.join(VENDOR, "ente-photos-icon-foreground.png")

# Colours sampled from the original artwork.
ENTE_GREEN = (8, 194, 37, 255)
HEART_FILL = (32, 211, 79, 255)
HEART_HILITE = (88, 232, 122, 255)
INK = (28, 28, 28, 255)
WHITE = (255, 255, 255, 255)
WHITE_HILITE = (214, 255, 226, 255)
APP_BG = (11, 11, 15, 255)  # colors.bg

# Badge geometry, as a fraction of the artwork bounding box width.
# The heart sits at (0.185, 0.205) with radius 0.14; the sparkle mirrors it
# horizontally. Its radius is a touch larger because an astroid's arms are thin,
# so it carries less visual weight than a heart of the same bounding box.
BADGE_FX, BADGE_FY = 0.815, 0.205
BADGE_R = 0.155
BADGE_STROKE = 0.042
BADGE_TILT = -18.0  # degrees; the heart is tilted too

# Companion sparkle (only drawn for the "duo" variants).
COMPANION_FX, COMPANION_FY = 1.015, 0.045
COMPANION_R = 0.055

# Flat offset shadow, measured off the heart.
SHADOW_ALPHA = 0.09
SHADOW_DX, SHADOW_DY = 0.10, 0.47  # multiples of the badge radius

# Specular highlight, measured off the heart (r = 0.16 of the shape radius),
# pulled toward the centre because a sparkle has no mass out at the corners.
HILITE_R = 0.16  # fraction of the sparkle radius
HILITE_DX, HILITE_DY = -0.30, -0.22  # offset from the centre, in radii

SS = 4  # supersampling factor for the badge art


def sparkle_points(cx, cy, r, n=3.6, steps=720, tilt=0.0):
    """Astroid-like 4-point star: |cos|^n / |sin|^n. Higher n = sharper points."""
    rad = math.radians(tilt)
    cr, sr = math.cos(rad), math.sin(rad)
    pts = []
    for i in range(steps):
        t = 2 * math.pi * i / steps
        ct, st = math.cos(t), math.sin(t)
        x = r * math.copysign(abs(ct) ** n, ct)
        y = r * math.copysign(abs(st) ** n, st)
        pts.append((cx + x * cr - y * sr, cy + x * sr + y * cr))
    return pts


def artwork_bbox(img: Image.Image) -> tuple[int, int, int, int]:
    """Bounds of the actual mark, ignoring a flat background or transparency."""
    alpha = img.split()[3]
    if alpha.getextrema()[0] < 250:  # has transparency -> use it
        return alpha.getbbox()
    flat = img.convert("RGB")
    bg = Image.new("RGB", img.size, ENTE_GREEN[:3])
    diff = ImageChops.difference(flat, bg).convert("L").point(lambda v: 255 if v > 18 else 0)
    return diff.getbbox()


def _stamp_outline(draw: ImageDraw.ImageDraw, pts, stroke: float, colour) -> None:
    """Fill + disc dilation.

    Stamping a circle at every outline point is a Minkowski sum with a disc, so
    the outline has a genuinely constant width and round joins. `ImageDraw.line`
    cannot do that on a shape with cusps -- it leaves comb-like spikes.
    """
    draw.polygon(pts, fill=colour)
    half = stroke / 2
    for x, y in pts:
        draw.ellipse([x - half, y - half, x + half, y + half], fill=colour)


def _sparkles(box, size, duo: bool):
    """(centre, radius) for each sparkle in the badge, in supersampled pixels."""
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    out = [((x0 + BADGE_FX * w) * SS, (y0 + BADGE_FY * h) * SS, BADGE_R * w * SS)]
    if duo:
        out.append(
            ((x0 + COMPANION_FX * w) * SS, (y0 + COMPANION_FY * h) * SS, COMPANION_R * w * SS)
        )
    return out, w * SS


def badge_and_shadow(size, box, fill, hilite, duo=False):
    """Return (badge RGBA layer, shadow alpha mask), both at `size`."""
    big = size * SS
    marks, w = _sparkles(box, size, duo)
    stroke = BADGE_STROKE * w

    badge = Image.new("RGBA", (big, big), (0, 0, 0, 0))
    shadow = Image.new("L", (big, big), 0)
    bd, sd = ImageDraw.Draw(badge), ImageDraw.Draw(shadow)

    for cx, cy, r in marks:
        pts = sparkle_points(cx, cy, r, tilt=BADGE_TILT)
        # Flat offset shadow of the outlined silhouette.
        sh = sparkle_points(cx + SHADOW_DX * r, cy + SHADOW_DY * r, r, tilt=BADGE_TILT)
        _stamp_outline(sd, sh, stroke, 255)

        _stamp_outline(bd, pts, stroke, INK)
        bd.polygon(pts, fill=fill)

    # Specular highlight on the main sparkle only.
    cx, cy, r = marks[0]
    hr = HILITE_R * r
    hx, hy = cx + HILITE_DX * r, cy + HILITE_DY * r
    bd.ellipse([hx - hr, hy - hr, hx + hr, hy + hr], fill=hilite)

    return (
        badge.resize((size, size), Image.LANCZOS),
        shadow.resize((size, size), Image.LANCZOS),
    )


def badged(src_path: str, fill=WHITE, hilite=WHITE_HILITE, duo=False) -> Image.Image:
    src = Image.open(src_path).convert("RGBA")
    size = src.size[0]
    badge, shadow = badge_and_shadow(size, artwork_bbox(src), fill, hilite, duo)

    # The shadow only darkens the artwork it falls on -- it must not float in the
    # transparent space around an adaptive-icon foreground.
    shadow = ImageChops.multiply(shadow, src.split()[3])
    shadow = shadow.point(lambda v: round(v * SHADOW_ALPHA))
    shade = Image.new("RGBA", src.size, (0, 0, 0, 255))
    shade.putalpha(shadow)

    return Image.alpha_composite(Image.alpha_composite(src, shade), badge)


def outline_to_background(img: Image.Image) -> Image.Image:
    """Swap the near-black outline for the dark app background colour.

    On the splash the artwork sits on colors.bg, so a black outline would read as
    a muddy halo; matching it to the background lets the white mark float cleanly.
    """
    out = img.copy()
    px = out.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a > 0 and r < 70 and g < 70 and b < 70:
                px[x, y] = (*APP_BG[:3], a)
    return out


def flatten(img: Image.Image, bg) -> Image.Image:
    return Image.alpha_composite(Image.new("RGBA", img.size, bg), img)


VARIANTS = {
    "white-solo": dict(fill=WHITE, hilite=WHITE_HILITE, duo=False),
    "white-duo": dict(fill=WHITE, hilite=WHITE_HILITE, duo=True),
    "green-solo": dict(fill=HEART_FILL, hilite=HEART_HILITE, duo=False),
    "green-duo": dict(fill=HEART_FILL, hilite=HEART_HILITE, duo=True),
}


def preview() -> None:
    """Contact sheet of every variant, at both full and launcher size."""
    tile = 320
    sheet = Image.new("RGB", (tile * len(VARIANTS), tile + 96), (24, 24, 28))
    draw = ImageDraw.Draw(sheet)
    for i, (name, kw) in enumerate(VARIANTS.items()):
        icon = badged(SRC_GREEN, **kw)
        sheet.paste(icon.convert("RGB").resize((tile - 40, tile - 40), Image.LANCZOS),
                    (i * tile + 20, 20))
        sheet.paste(icon.convert("RGB").resize((72, 72), Image.LANCZOS),
                    (i * tile + 20, tile + 4))
        draw.text((i * tile + 104, tile + 30), name, fill=(230, 230, 235))
    path = "/tmp/icon_variants.png"
    sheet.save(path)
    print("wrote", path)


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    style = VARIANTS["white-duo"]

    icon = badged(SRC_GREEN, **style)
    icon.convert("RGB").save(os.path.join(OUT, "icon.png"))

    # Adaptive foreground is transparent; Android supplies the green behind it.
    foreground = badged(SRC_FOREGROUND, **style)
    foreground.save(os.path.join(OUT, "adaptive-icon.png"))

    # Splash sits on the dark app background.
    outline_to_background(foreground).resize((512, 512), Image.LANCZOS).save(
        os.path.join(OUT, "splash-icon.png")
    )

    # The launcher icon already carries the green plate, so flatten onto green
    # rather than white in case any edge pixel is less than fully opaque.
    flatten(icon.resize((64, 64), Image.LANCZOS), ENTE_GREEN).convert("RGB").save(
        os.path.join(OUT, "favicon.png")
    )

    for name in ("icon.png", "adaptive-icon.png", "splash-icon.png", "favicon.png"):
        p = os.path.join(OUT, name)
        print(name, Image.open(p).size, f"{os.path.getsize(p) / 1024:.1f} kB")


if __name__ == "__main__":
    preview() if "--preview" in sys.argv else main()
