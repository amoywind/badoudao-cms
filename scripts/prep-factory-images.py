"""
Cut the showroom and factory photos down to the sizes the site actually
serves, and stitch the mixed-orientation showroom shots into one wide
banner.

The source photos are phone captures: most are 1080x1920 portrait, two
are 1920x1080 landscape. Serving them as-is means the page has to deal with
five different aspect ratios, and a CSS object-fit on a 3MB phone capture
still ships the whole file. So each one is cropped to a fixed ratio and
resized here, once, and the site gets predictable, small files.

Usage: python scripts/prep-factory-images.py
"""
from PIL import Image, ImageOps
import os

SRC = r"D:/website/workbuddy/资料"
OUT = r"D:/website/workbuddy/badoudao-cms/public/media/factory"
os.makedirs(OUT, exist_ok=True)

# name -> (source, target ratio, output width, prefix)
# Gallery tiles: 4:3 landscape. Phone captures are portrait, so the crop
# keeps the middle of the shelf — the clocks, not the ceiling or the floor.
GALLERY = [
    ("展台A.jpg", "showroom-a"),
    ("展台B.jpg", "showroom-b"),
    ("展台C.jpg", "showroom-c"),
    ("展台E.jpg", "showroom-e"),
    ("展台F.jpg", "showroom-f"),
    ("展台H.jpg", "showroom-h"),
]

WORKSHOP = [
    ("工厂实拍.MP4_20261013_000753.953.jpg", "workshop-1"),
    ("工厂实拍.MP4_20261013_000805.593.jpg", "workshop-2"),
    ("工厂实拍.MP4_20261013_000817.580.jpg", "workshop-3"),
]

LICENSE = "营业执照.jpg"


def fit(src_name, out_name, ratio, width):
    """Crop to `ratio` then resize to `width`, anchored on the centre.

    Smart crop is tempting but wrong here: the subject is a wall of clocks
    filling the frame, so an entropy-based crop would chase contrast and
    cut half the shelf. Centre is what a photographer would have shot.
    """
    im = Image.open(os.path.join(SRC, src_name))
    im = ImageOps.exif_transpose(im).convert("RGB")

    w, h = im.size
    target_h = int(w / ratio)
    if target_h <= h:
        # Too wide for the target: trim width.
        new_w = int(h * ratio)
        left = (w - new_w) // 2
        im = im.crop((left, 0, left + new_w, h))
    else:
        # Too tall: trim height. Bias slightly above centre — the clocks sit
        # at eye level and a centred crop lands a little low on these.
        new_h = int(w / ratio)
        top = int((h - new_h) * 0.42)
        im = im.crop((0, top, w, top + new_h))

    im = im.resize((width, int(width / ratio)), Image.LANCZOS)
    path = os.path.join(OUT, out_name + ".jpg")
    im.save(path, "JPEG", quality=82, optimize=True, progressive=True)
    return path, im.size, os.path.getsize(path) / 1024


def banner():
    """Stitch the showroom shots into one wide strip.

    Mixed portrait and landscape sources cannot be laid side by side
    without either letterboxing them to grey bars or cropping most of a
    frame away. Cropping to a common ratio first and butting them together
    gives a continuous row of shelving, which is what the room looks like
    when you walk down it.
    """
    tiles = []
    for name, _ in GALLERY:
        im = Image.open(os.path.join(SRC, name))
        im = ImageOps.exif_transpose(im).convert("RGB")
        w, h = im.size
        # Each tile becomes 3:4 portrait — matches the source orientation,
        # so little is lost, and the taller portrait frames contribute the
        # full height of the strip.
        target_w = int(h * 0.75)
        if target_w <= w:
            left = (w - target_w) // 2
            im = im.crop((left, 0, left + target_w, h))
        else:
            new_h = int(w / 0.75)
            top = int((h - new_h) * 0.42)
            im = im.crop((0, top, w, top + new_h))
        tiles.append(im.resize((480, 640), Image.LANCZOS))

    gap = 8
    total_w = sum(t.width for t in tiles) + gap * (len(tiles) - 1)
    total_h = 640

    strip = Image.new("RGB", (total_w, total_h), "#ffffff")
    x = 0
    for t in tiles:
        strip.paste(t, (x, 0))
        x += t.width + gap

    # Downscale to something a phone loads quickly.
    final_w = 1600
    strip = strip.resize(
        (final_w, int(final_h := total_h * final_w / total_w)), Image.LANCZOS
    )
    path = os.path.join(OUT, "showroom-banner.jpg")
    strip.save(path, "JPEG", quality=82, optimize=True, progressive=True)
    return path, strip.size, os.path.getsize(path) / 1024


if __name__ == "__main__":
    print("=== 展厅图（4:3，用于图墙）===")
    for src, name in GALLERY:
        p, size, kb = fit(src, name, 4 / 3, 900)
        print("  %-28s %dx%d  %4.0fKB" % (name, size[0], size[1], kb))

    print("\n=== 车间实拍（4:3）===")
    for src, name in WORKSHOP:
        p, size, kb = fit(src, name, 4 / 3, 1000)
        print("  %-28s %dx%d  %4.0fKB" % (name, size[0], size[1], kb))

    print("\n=== 展厅拼接横幅 ===")
    p, size, kb = banner()
    print("  %-28s %dx%d  %4.0fKB" % ("showroom-banner", size[0], size[1], kb))

    print("\n=== 营业执照（原比例，文档用）===")
    im = Image.open(os.path.join(SRC, LICENSE))
    im = ImageOps.exif_transpose(im).convert("RGB")
    # 1000px wide is legible on a click-through and light enough to load
    # inline; the full 4624px original is 4MB for no benefit.
    im = im.resize((1000, int(1000 * im.height / im.width)), Image.LANCZOS)
    p = os.path.join(OUT, "business-license.jpg")
    im.save(p, "JPEG", quality=88, optimize=True)
    print("  %-28s %dx%d  %4.0fKB" % ("business-license", im.width, im.height,
                                       os.path.getsize(p) / 1024))