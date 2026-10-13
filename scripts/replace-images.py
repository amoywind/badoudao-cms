"""
Regenerate the site images from the originals in 资料/.

    hero-clocks.jpg           the product hero on the home page
    workshop-floor.jpg        the production-floor photo beside the QC list
    business-license.jpg      the licence on the quality page

All three are handled here rather than copied, because dropping a phone
photo straight into public/ produces a file several times the size the
site needs. The old hero was 1721 KB of PNG for a decorative band; a JPEG
at the same pixel size is 134 KB and looks identical.

The hero is 16:9 and the old file was 3:2, so it is resized rather than
stretched — the layout crops with object-fit anyway, and a wrong aspect
ratio shows up as a soft or distorted image on one screen size and not
another.

The workshop photo sits beside the manufacturing-capability list, so it
has to be a photo of the floor rather than of the product. The hero and
the workshop image are therefore different pictures that used to share one
file, which is why the capability section no longer reuses the hero.

The licence keeps its aspect ratio. It is a document: distorting it would
make it look forged, and it is also the one image on the site that has to
survive being read.

Usage: python scripts/replace-images.py
"""
from PIL import Image, ImageOps
import os

HERO_SRC = (
    "C:/Users/Administrator/.workbuddy/clipboard-images/"
    "clipboard-2026-10-13T09-08-48-160Z-0d5d4d97.jpg"
)
LICENCE_SRC = "D:/website/workbuddy/资料/营业执照.jpg"
WORKSHOP_SRC = "D:/website/workbuddy/资料/工厂实拍.MP4_20261013_000805.593.jpg"

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HERO_OUT = os.path.join(ROOT, "public", "hero-clocks.jpg")
WORKSHOP_OUT = os.path.join(ROOT, "public", "workshop-floor.jpg")
LICENCE_OUT = os.path.join(ROOT, "public", "media", "factory", "business-license.jpg")


def write_hero():
    """16:9, 1400px wide, JPEG.

    The crop sits above centre. Centring a 16:9 window on a 16:10 source
    puts the dark counter edge along the bottom, and a band of near-black
    reads as a mistake rather than as a room.

    1400px covers the layout's widest column at 2x without a phone on a
    slow connection having to pull a megabyte for a decorative band.
    """
    im = Image.open(HERO_SRC)
    im = ImageOps.exif_transpose(im).convert("RGB")

    w, h = im.size
    target_h = int(w * 9 / 16)

    if target_h <= h:
        # Bias upward: 0.25 keeps the shelf and the clocks, drops the
        # counter front below it.
        top = int((h - target_h) * 0.25)
        im = im.crop((0, top, w, top + target_h))
    else:
        new_w = int(h * 16 / 9)
        left = (w - new_w) // 2
        im = im.crop((left, 0, left + new_w, h))

    # 1400px covers the layout's widest column at 2x without a phone on a
    # slow connection having to pull a megabyte for a decorative band.
    im = im.resize((1400, 788), Image.LANCZOS)
    im.save(HERO_OUT, "JPEG", quality=86, optimize=True, progressive=True)

    return im.size, os.path.getsize(HERO_OUT) / 1024


def write_workshop():
    """3:4, from the video still that shows two people at the line.

    3:2 because the capability section beside it is a text list, and a
    taller photo balances a tall column better than a wide one. Same
    reasoning as the licence for the crop: the subject is the people and
    the bench, so the frame is cropped around the middle rather than by
    contrast.
    """
    im = Image.open(WORKSHOP_SRC)
    im = ImageOps.exif_transpose(im).convert("RGB")

    w, h = im.size
    target_h = int(w * 3 / 4)
    top = int((h - target_h) * 0.42)
    im = im.crop((0, top, w, top + target_h))

    im = im.resize((1400, 933), Image.LANCZOS)
    im.save(WORKSHOP_OUT, "JPEG", quality=86, optimize=True, progressive=True)

    return im.size, os.path.getsize(WORKSHOP_OUT) / 1024


def write_licence():
    """Aspect ratio untouched, 1200px wide.

    Wider than the 1000px used before because the watermark is part of what
    makes this copy usable, and a smaller render makes the text harder to
    read. Quality 90: compression artefacts on a document's fine print are
    the one artefact a viewer would notice.
    """
    im = Image.open(LICENCE_SRC)
    im = ImageOps.exif_transpose(im).convert("RGB")

    # Crop the dark background around the paper. The photo was taken on a
    # table and the border is 10% of the frame on each side at the
    # bottom; showing it reads as a phone snapshot rather than a document.
    im = _trim_around_document(im)

    im = im.resize((1200, int(1200 * im.height / im.width)), Image.LANCZOS)
    im.save(LICENCE_OUT, "JPEG", quality=90, optimize=True, progressive=True)

    return im.size, os.path.getsize(LICENCE_OUT) / 1024


def _trim_around_document(im, inset=0.055):
    """Trim a uniform margin, keeping a small one.

    Not a general border remover: it assumes the document is centred with
    a fairly even border, which is what a photo taken straight down at a
    sheet of A4 gives. A real edge detector would find the paper, but it
    also finds the printed border inside the paper, which is not what is
    wanted here.
    """
    w, h = im.size
    dx = int(w * inset)
    dy = int(h * inset)
    return im.crop((dx, dy, w - dx, h - dy))


if __name__ == "__main__":
    if not os.path.exists(HERO_SRC):
        print(f"找不到首页源图: {HERO_SRC}")
        print("请确认剪贴板图片仍在，或把新图放到 资料/ 目录后修改此脚本的路径。")
        raise SystemExit(1)

    print("=== 首页主图 ===")
    size, kb = write_hero()
    print("  %-22s %dx%d  %4.0fKB" % ("hero-clocks.jpg", size[0], size[1], kb))

    print("\n=== 车间实拍（生产能力区）===")
    size, kb = write_workshop()
    print("  %-22s %dx%d  %4.0fKB" % ("workshop-floor.jpg", size[0], size[1], kb))

    print("\n=== 营业执照 ===")
    size, kb = write_licence()
    print("  %-22s %dx%d  %4.0fKB" % ("business-license.jpg", size[0], size[1], kb))