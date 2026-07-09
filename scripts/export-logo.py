from pathlib import Path
from PIL import Image

src = Path(
    r"C:\Users\david\.grok\sessions\C%3A%5CUsers%5Cdavid\019f47e8-886a-7421-a9de-7871267d964d\images\3.jpg"
)
img = Image.open(src).convert("RGBA")
w, h = img.size
side = min(w, h)
img = img.crop(((w - side) // 2, (h - side) // 2, (w - side) // 2 + side, (h - side) // 2 + side))


def save(path, size=None):
    out = img.copy()
    if size:
        out = out.resize((size, size), Image.Resampling.LANCZOS)
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    out.save(path, "PNG", optimize=True)
    print("wrote", path, out.size, path.stat().st_size)


bj = Path(r"C:\Users\david\Laboratory\blackjack")
brand = bj / "branding"
for name, sz in [
    ("blackjack-logo.png", 1024),
    ("blackjack-logo-512.png", 512),
    ("blackjack-logo-256.png", 256),
    ("blackjack-logo-128.png", 128),
    ("blackjack-logo-readme.png", 512),
]:
    save(brand / name, sz)

save(bj / "public" / "logo.png", 512)
save(bj / "public" / "icon.png", 512)

android = bj / "android" / "app" / "src" / "main" / "res"
for folder, sz in {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}.items():
    d = android / folder
    if d.is_dir():
        save(d / "ic_launcher.png", sz)
        save(d / "ic_launcher_round.png", sz)
        save(d / "ic_launcher_foreground.png", sz)

ios_icon = (
    bj
    / "ios"
    / "App"
    / "App"
    / "Assets.xcassets"
    / "AppIcon.appiconset"
    / "AppIcon-512@2x.png"
)
if ios_icon.parent.is_dir():
    save(ios_icon, 1024)

site = Path(
    r"C:\Users\david\Laboratory\nuroctane.xyz\artifacts\digital-sea\public\assets\nodes\blackjack-logo.png"
)
save(site, 512)
dist = Path(
    r"C:\Users\david\Laboratory\nuroctane.xyz\artifacts\digital-sea\dist\public\assets\nodes"
)
if dist.is_dir():
    save(dist / "blackjack-logo.png", 512)
print("DONE")
