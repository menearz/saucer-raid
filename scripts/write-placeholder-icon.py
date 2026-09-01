#!/usr/bin/env python3
"""Write the placeholder app icon (night-sky saucer).

Spectre replaces resources/icon.png with the real square. Do not run this
script after that, or it will overwrite the real icon with the placeholder.
"""

from __future__ import annotations

import struct
import zlib
from pathlib import Path

W = H = 1024
BG = (0x09, 0x0B, 0x0E, 255)
HULL = (0xC8, 0xD0, 0xC4, 255)
HULL_DARK = (0x8A, 0x93, 0x86, 255)
DOME = (0x6F, 0xDB, 0x9A, 255)
DOME_LIT = (0xB8, 0xFF, 0xE0, 255)


def ellipse(px: int, py: int, cx: float, cy: float, rx: float, ry: float) -> bool:
    dx = (px + 0.5 - cx) / rx
    dy = (py + 0.5 - cy) / ry
    return dx * dx + dy * dy <= 1.0


def pixel(x: int, y: int) -> tuple[int, int, int, int]:
    # Same shapes as public/favicon.svg, scaled 10.24× from the 100×100 viewBox.
    s = W / 100.0
    if ellipse(x, y, 50 * s, 56 * s, 34 * s, 12 * s):
        if ellipse(x, y, 50 * s, 54 * s, 28 * s, 8 * s):
            return HULL_DARK
        return HULL
    if ellipse(x, y, 50 * s, 44 * s, 14 * s, 12 * s):
        if ellipse(x, y, 50 * s, 42 * s, 10 * s, 8 * s):
            return DOME_LIT
        return DOME
    return BG


def png_chunk(tag: bytes, data: bytes) -> bytes:
    crc = zlib.crc32(tag + data) & 0xFFFFFFFF
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)


def encode_png(width: int, height: int, rows: list[bytes]) -> bytes:
    raw = b"".join(b"\x00" + row for row in rows)
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    return (
        b"\x89PNG\r\n\x1a\n"
        + png_chunk(b"IHDR", ihdr)
        + png_chunk(b"IDAT", zlib.compress(raw, 9))
        + png_chunk(b"IEND", b"")
    )


def render(size: int) -> bytes:
    # Re-evaluate ellipses in the output pixel grid (same 100×100 viewBox).
    global W, H
    W = H = size
    rows: list[bytes] = []
    for y in range(size):
        row = bytearray()
        for x in range(size):
            row.extend(pixel(x, y))
        rows.append(bytes(row))
    return encode_png(size, size, rows)


def write(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    print(f"wrote {path} ({path.stat().st_size} bytes)")


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    slot = render(1024)
    write(root / "resources" / "icon.png", slot)
    # Native placeholders until Spectre drops the real square in resources/icon.png
    write(
        root / "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png",
        slot,
    )
    android_sizes = {
        "mdpi": (48, 108),
        "hdpi": (72, 162),
        "xhdpi": (96, 216),
        "xxhdpi": (144, 324),
        "xxxhdpi": (192, 432),
    }
    res = root / "android/app/src/main/res"
    for density, (launcher, foreground) in android_sizes.items():
        folder = res / f"mipmap-{density}"
        icon = render(launcher)
        write(folder / "ic_launcher.png", icon)
        write(folder / "ic_launcher_round.png", icon)
        write(folder / "ic_launcher_foreground.png", render(foreground))


if __name__ == "__main__":
    main()
