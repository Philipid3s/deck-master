#!/usr/bin/env python3
"""
Turn the hand-drawn sprites in pixel-art/ into game-ready assets.

The source art is high-resolution (~1000px per airframe) with a transparent
background and a soft glow around the silhouette. The game draws an airframe
at somewhere between 40 and 140 pixels, so shipping the originals would mean
sending several megabytes to scale them down in the browser. This crops each
one to its silhouette, drops the glow, squares it up and writes a small PNG.

Dev tool, not part of the build: run it when art is added or changed.

    pip install pillow
    python scripts/import-pixel-art.py

Requires Pillow. Output goes to public/aircraft/, which the deck renderer and
the UI load by the `art` id on each aircraft type.
"""
from __future__ import annotations

import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover - dev tool
    sys.exit("Pillow is required: pip install pillow")

SOURCE = Path("pixel-art")
OUTPUT = Path("public/aircraft")

# Source file -> the art id an aircraft type refers to. A file can serve more
# than one type (both Super Hornet variants share one airframe).
ARTWORK = {
    "F18 Super Hornet.png": "super-hornet",
    "E18 Growler.png": "growler",
    "E2 Hawkete.png": "hawkeye",
}

# The longest side of the written asset. The deck view draws an airframe at up
# to ~140px when zoomed in and the UI portraits are ~150px wide, so this is
# generous enough to stay crisp without carrying the full-size art around.
TARGET = 192

# Anything fainter than this is the glow around the silhouette, not the
# aircraft. Keeping it would draw a grey halo on the deck plating.
ALPHA_FLOOR = 60


def trim(image: Image.Image) -> Image.Image:
    """Crop to the silhouette, having first thrown the glow away."""
    alpha = image.getchannel("A")
    image.putalpha(alpha.point(lambda v: 0 if v < ALPHA_FLOOR else v))
    box = image.getchannel("A").getbbox()
    if box is None:
        raise ValueError("image is entirely transparent")
    return image.crop(box)


def scaled(image: Image.Image) -> tuple[int, int]:
    """
    Target size with the longest side at TARGET, keeping the art's own shape.

    Deliberately not squared: a Hawkeye is far wider than it is long and the
    renderer fits each sprite into the type's footprint by its real aspect,
    so padding every asset to a square would only ship transparent pixels.
    """
    width, height = image.size
    scale = TARGET / max(width, height)
    return max(1, round(width * scale)), max(1, round(height * scale))


def main() -> int:
    if not SOURCE.is_dir():
        sys.exit(f"no {SOURCE}/ directory here — run from the project root")
    OUTPUT.mkdir(parents=True, exist_ok=True)

    missing = [name for name in ARTWORK if not (SOURCE / name).is_file()]
    for name in missing:
        print(f"  ! {name} is listed in ARTWORK but not in {SOURCE}/")

    unknown = sorted(
        p.name for p in SOURCE.glob("*.png") if p.name not in ARTWORK
    )
    for name in unknown:
        print(f"  ? {name} has no entry in ARTWORK — skipped")

    for name, art_id in sorted(ARTWORK.items()):
        source = SOURCE / name
        if not source.is_file():
            continue
        image = trim(Image.open(source).convert("RGBA"))
        # LANCZOS rather than nearest: the source carries per-pixel shading
        # and texture, so resampling it reads better than dropping pixels.
        image = image.resize(scaled(image), Image.LANCZOS)
        destination = OUTPUT / f"{art_id}.png"
        image.save(destination, optimize=True)
        size_kb = destination.stat().st_size / 1024
        print(
            f"  {name}  ->  {destination}  "
            f"{image.width}x{image.height}  {size_kb:.0f} kB"
        )

    return 1 if missing else 0


if __name__ == "__main__":
    raise SystemExit(main())
