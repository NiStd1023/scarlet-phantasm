"""Create PWA icons from the game's existing player artwork (requires Pillow)."""
from pathlib import Path
import math
import random

from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SIZE = 1024
OUTPUT = ROOT / 'dist' / 'icons'
OUTPUT.mkdir(exist_ok=True)


def artwork(maskable=False):
    # An opaque background fills the whole icon. The important artwork stays
    # inside the central safe area of the maskable version.
    image = Image.new('RGBA', (SIZE, SIZE))
    pixels = image.load()
    for y in range(SIZE):
        for x in range(SIZE):
            glow = max(0, 1 - math.hypot(x - SIZE * .60, y - SIZE * .37) / (SIZE * .76))
            pixels[x, y] = (int(13 + 80 * glow), int(8 + 8 * glow), int(22 + 21 * glow), 255)

    layer = Image.new('RGBA', image.size)
    draw = ImageDraw.Draw(layer)
    random.seed(3)
    for _ in range(100):
        x, y = random.randrange(SIZE), random.randrange(SIZE)
        r = random.choice([1, 2, 2, 3])
        draw.ellipse((x-r, y-r, x+r, y+r), fill=(255, 215, 189, random.randrange(45, 150)))
    image = Image.alpha_composite(image, layer)

    extent = .75 if maskable else .94
    radius = int(SIZE * extent / 2)
    center = SIZE // 2
    haze = Image.new('RGBA', image.size)
    hd = ImageDraw.Draw(haze)
    hd.ellipse((center-radius, center-radius, center+radius, center+radius), fill=(220, 32, 57, 85))
    image = Image.alpha_composite(image, haze.filter(ImageFilter.GaussianBlur(SIZE // 22)))
    draw = ImageDraw.Draw(image)
    draw.ellipse((center-radius, center-radius, center+radius, center+radius), fill=(132, 18, 38, 255), outline=(225, 135, 111, 255), width=5)
    inset = int(radius * .07)
    draw.ellipse((center-radius+inset, center-radius+inset, center+radius-inset, center+radius-inset), outline=(233, 171, 142, 155), width=3)

    player = Image.open(ROOT / 'dist' / 'assets' / 'player.webp').convert('RGBA')
    player_side = int(SIZE * (.68 if maskable else .86))
    scale = player_side / max(player.size)
    player = player.resize((round(player.width * scale), round(player.height * scale)), Image.Resampling.LANCZOS)
    image.alpha_composite(player, ((SIZE-player.width)//2, (SIZE-player.height)//2 + int(SIZE * .015)))

    # A small four-point seal echoes the game's gold star motif.
    draw = ImageDraw.Draw(image)
    x, y = int(SIZE * (.69 if maskable else .76)), int(SIZE * (.27 if maskable else .20))
    s = int(SIZE * (.021 if maskable else .027))
    draw.polygon([(x, y-s*2), (x+s//3, y-s//3), (x+s*2, y), (x+s//3, y+s//3), (x, y+s*2), (x-s//3, y+s//3), (x-s*2, y), (x-s//3, y-s//3)], fill=(255, 220, 166, 255))
    return image.convert('RGB')


normal = artwork()
maskable = artwork(maskable=True)
for filename, size, source in [
    ('icon-192.png', 192, normal), ('icon-512.png', 512, normal),
    ('apple-touch-icon.png', 180, normal), ('icon-maskable-512.png', 512, maskable),
]:
    source.resize((size, size), Image.Resampling.LANCZOS).save(OUTPUT / filename, optimize=True)
    print(OUTPUT / filename)
