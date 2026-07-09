# Blackjack branding

**Mark:** Ace–King fan on Digital Sea void navy — quiet table, not casino neon. Biolume (`#5AC8FA`) edge; indigo family borders; white rank glyphs.

**Design system:** [`.agents/DESIGN.md`](../.agents/DESIGN.md) · tokens in `src/styles/sea.css`.

| File | Size | Use |
|------|------|-----|
| `blackjack-logo.png` | 1024×1024 | Master |
| `blackjack-logo-512.png` | 512×512 | Medium |
| `blackjack-logo-256.png` | 256×256 | Small |
| `blackjack-logo-128.png` | 128×128 | Tiny |
| `blackjack-logo-readme.png` | 512×512 | GitHub README hero |

**App wiring**

| Surface | Path |
|---------|------|
| Web / Next public | `public/logo.png`, `public/icon.png` |
| SVG source (legacy) | `public/logo.svg`, `public/icon.svg` |
| Android launcher | `android/app/src/main/res/mipmap-*/` |
| iOS App Icon | `ios/App/App/Assets.xcassets/AppIcon.appiconset/` |
| Site card (nuroctane.xyz) | `digital-sea/public/assets/nodes/blackjack-logo.png` |

Keep filenames stable when regenerating.
