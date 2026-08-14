#!/usr/bin/env python3
"""Fast magenta chroma-key + trim for leftover single props and tiles."""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image

WORK = Path("/workspace/assets/sprites")
PUB = Path("/workspace/public/game")


def chroma(im: Image.Image, thresh: int = 48) -> Image.Image:
    rgba = im.convert("RGBA")
    arr = np.asarray(rgba).astype(np.int16)
    r, g, b, a = arr[..., 0], arr[..., 1], arr[..., 2], arr[..., 3]
    mag = (r > 180) & (b > 180) & (g < 90)
    # also catch near-magenta jpeg fringes
    dist = np.abs(r - 255) + np.abs(g - 0) + np.abs(b - 255)
    mag = mag | (dist < thresh * 3)
    # green-channel-low + high R/B
    mag = mag | ((r > 200) & (b > 200) & (g < 140) & ((r + b) > (g * 3)))
    out = arr.copy()
    out[mag, 3] = 0
    # soften remaining fringe
    alpha = out[..., 3]
    fringe = (alpha > 0) & ((r > 170) & (b > 170) & (g < 160))
    out[fringe, 3] = np.clip(alpha[fringe].astype(np.int16) - 90, 0, 255)
    return Image.fromarray(out.astype(np.uint8), "RGBA")


def trim_pad(im: Image.Image, size: int, pad_ratio: float = 0.08) -> Image.Image:
    arr = np.asarray(im)
    a = arr[..., 3]
    ys, xs = np.where(a > 12)
    if len(xs) == 0:
        return im.resize((size, size), Image.Resampling.LANCZOS)
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    crop = im.crop((x0, y0, x1, y1))
    w, h = crop.size
    side = int(max(w, h) * (1 + pad_ratio * 2))
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(crop, ((side - w) // 2, (side - h) // 2), crop)
    return canvas.resize((size, size), Image.Resampling.LANCZOS)


def process_single(raw_name: str, out_name: str, size: int = 384) -> None:
    src = WORK / f"{raw_name}-raw.jpg"
    im = Image.open(src)
    keyed = chroma(im)
    final = trim_pad(keyed, size)
    dest = PUB / f"{out_name}.png"
    dest.parent.mkdir(parents=True, exist_ok=True)
    final.save(dest, "PNG")
    print(f"wrote {dest} {final.size}")


def split_sheet(raw_name: str, labels: list[str], rows: int, cols: int, size: int = 256) -> None:
    src = WORK / raw_name / "sheet-transparent.png"
    if not src.exists():
        src = WORK / raw_name / "raw-sheet-clean.png"
    im = Image.open(src).convert("RGBA")
    cw, ch = im.width // cols, im.height // rows
    for i, label in enumerate(labels):
        r, c = divmod(i, cols)
        cell = im.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch))
        cell = trim_pad(cell, size)
        dest = PUB / f"{label}.png"
        cell.save(dest, "PNG")
        print(f"wrote {dest} {cell.size}")


def copy_frames(src_dir: str, pattern_prefix: str, dest_prefix: str, count: int) -> None:
    d = WORK / src_dir
    for i in range(1, count + 1):
        src = d / f"{pattern_prefix}-{i}.png"
        if not src.exists():
            print("missing", src)
            continue
        im = Image.open(src).convert("RGBA")
        dest = PUB / f"{dest_prefix}-{i}.png"
        im.save(dest, "PNG")
        print(f"copied {dest} {im.size}")


def resize_tiles(size: int = 256) -> None:
    tdir = PUB / "tiles"
    for name in ("grass", "wheat", "dirt", "asphalt"):
        src = tdir / f"{name}.jpg"
        im = Image.open(src).convert("RGB").resize((size, size), Image.Resampling.LANCZOS)
        out = tdir / f"{name}.png"
        im.save(out, "PNG", optimize=True)
        print(f"tile {out} {im.size}")


def extract_props() -> None:
    src = WORK / "props-raw.jpg"
    im = chroma(Image.open(src))
    rows, cols = 3, 3
    labels = ["hay", "tree", "pine", "bush", "fence", "mailbox", "crate", "barrel", "pole"]
    cw, ch = im.width // cols, im.height // rows
    out_dir = PUB / "props"
    out_dir.mkdir(parents=True, exist_ok=True)
    for i, label in enumerate(labels):
        r, c = divmod(i, cols)
        cell = im.crop((c * cw, r * ch, (c + 1) * cw, (r + 1) * ch))
        cell = trim_pad(cell, 256, 0.1)
        dest = out_dir / f"{label}.png"
        cell.save(dest, "PNG")
        print(f"prop {dest} {cell.size}")


if __name__ == "__main__":
    PUB.mkdir(parents=True, exist_ok=True)
    copy_frames("saucer", "hover", "saucer", 4)
    split_sheet("animals", ["cow", "pig", "sheep", "chicken"], 2, 2, 220)
    split_sheet("people", ["farmer-m", "farmer-f", "civilian-m", "civilian-f"], 2, 2, 200)
    copy_frames("explode", "explode", "explode", 4)
    copy_frames("laser", "projectile", "laser", 4)
    split_sheet("rubble", ["rubble-1", "rubble-2", "rubble-3", "rubble-4"], 2, 2, 220)

    for raw, out, size in [
        ("barn", "barn", 420),
        ("farmhouse", "farmhouse", 400),
        ("townhouse", "townhouse", 380),
        ("silo", "silo", 320),
        ("tractor", "tractor", 260),
        ("pickup", "pickup", 260),
        ("sedan", "sedan", 240),
        ("jeep", "jeep", 250),
        ("shop", "shop", 360),
    ]:
        process_single(raw, out, size)

    extract_props()
    resize_tiles(256)
    print("all assets exported")
