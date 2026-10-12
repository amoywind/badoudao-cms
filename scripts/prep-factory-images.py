"""
Cut the showroom photos into one panorama and size the business licence
for the page.

The sources are phone captures, and they are mixed: four are 1080x1920
portrait, two are 1920x1080 and 1440x810 landscape, and the licence is
4624x3472. Served as-is the page would carry five aspect ratios and about
8 MB, so each one is cropped once to the ratio it is displayed at.

Two files come out of this and both are used:

    showroom-banner.jpg   the six showroom shots stitched side by side
    business-license.jpg  the licence, on the quality page

The individual showroom frames and the workshop stills are not kept. The
six showroom angles read as one room when joined and as six unrelated
listings when separated, so only the joined version ships. Run with
--all to regenerate the intermediates if that changes.

Usage: python scripts/prep-factory-images.py
"""
from PIL import Image, ImageOps
import os
import sys

SRC = r"D:/website/workbuddy/资料"
OUT = r"D:/website/workbuddy/badoudao-cms/public/media/factory"
os.makedirs(OUT, exist_ok=True)

SHOWROOM = [
    "展台A.jpg",
    "展台B.jpg",
    "展台C.jpg",
    "展台E.jpg",
    "展台F.jpg",
    "展台H.jpg",
]

WORKSHOP = [
    "工厂实拍.MP4_20261013_000753.953.jpg",
    "工厂实拍.MP4_20261013_000805.593.jpg",
    "工厂实拍.MP4_20261013_000817.580.jpg",
]

LICENSE = "营业执照.jpg"


def open_rgb(name):
    im = Image.open(os.path.join(SRC, name))
    return ImageOps.exif_transpose(im).convert("RGB")


def crop_to_ratio(im, ratio, bias=0.42):
    """Centre-crop to `ratio`, `bias` deciding where the crop sits vertically.

    Smart crop is tempting and wrong here: the subject is a wall of clocks
    filling the frame, so an entropy-based crop chases contrast and cuts
    half the shelf away. The subject is the shelf.

    The vertical bias sits slightly above centre because the clocks are at
    eye level in these frames and a true centre lands a little low.
    """
    w, h = im.size
    target_h = int(w / ratio)

    if target_h <= h:
        new_w = int(h * ratio)
        left = (w - new_w) // 2
        return im.crop((left, 0, left + new_w, h))

    top = int((h - target_h) * bias)
    return im.crop((0, top, w, top + target_h))


def save(im, name, quality=82):
    path = os.path.join(OUT, name)
    im.save(path, "JPEG", quality=quality, optimize=True, progressive=True)
    return path, im.size, os.path.getsize(path) / 1024


def banner():
    """Join the six showroom shots into one wide strip.

    Mixed portrait and landscape sources cannot sit side by side without
    either letterboxing them to grey bars or cropping most of a frame away.
    Cropping each to a common portrait ratio first turns the row into a
    continuous run of shelving, which is what the room looks like when you
    walk down it.
    """
    tiles = []
    for name in SHOWROOM:
        im = crop_to_ratio(open_rgb(name), 0.75)
        tiles.append(im.resize((480, 640), Image.LANCZOS))

    gap = 8
    total_w = sum(t.width for t in tiles) + gap * (len(tiles) - 1)
    strip = Image.new("RGB", (total_w, 640), "#ffffff")

    x = 0
    for t in tiles:
        strip.paste(t, (x, 0))
        x += t.width + gap

    # 1600px wide loads quickly on a phone, which is where most of the
    # traffic is; the source frames are each larger than the whole strip.
    final_w = 1600
    strip = strip.resize(
        (final_w, int(640 * final_w / total_w)), Image.LANCZOS
    )
    return save(strip, "showroom-banner.jpg")


def license_image():
    im = open_rgb(LICENSE)
    # 1000px is legible when clicked through and light enough to load
    # inline; the 4624px original is 4 MB for no benefit.
    im = im.resize((1000, int(1000 * im.height / im.width)), Image.LANCZOS)
    return save(im, "business-license.jpg", quality=88)


def intermediates():
    """The individual frames, kept out of the site but regenerable."""
    out = []
    for name, slug in zip(SHOWROOM, ["a", "b", "c", "e", "f", "h"]):
        im = crop_to_ratio(open_rgb(name), 4 / 3).resize((900, 675), Image.LANCZOS)
        out.append(save(im, f"showroom-{slug}.jpg"))
    for name, slug in zip(WORKSHOP, ["1", "2", "3"]):
        im = crop_to_ratio(open_rgb(name), 4 / 3).resize((1000, 750), Image.LANCZOS)
        out.append(save(im, f"workshop-{slug}.jpg"))
    return out


if __name__ == "__main__":
    print("=== 展厅横幅 ===")
    p, size, kb = banner()
    print("  %-24s %dx%d  %4.0fKB" % ("showroom-banner", size[0], size[1], kb))

    print("\n=== 营业执照 ===")
    p, size, kb = license_image()
    print("  %-24s %dx%d  %4.0fKB" % ("business-license", size[0], size[1], kb))

    if "--all" in sys.argv:
        print("\n=== 单图（不发布，供重新拼接用）===")
        for _, size, kb in intermediates():
            print("  %-24s %dx%d  %4.0fKB" % ("", size[0], size[1], kb))