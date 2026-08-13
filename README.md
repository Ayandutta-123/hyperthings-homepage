# Hyperthings homepage

Infosys-style marketing homepage for [hyperthings.ai](https://hyperthings.ai/) — Elementor-ready HTML/CSS/JS.

## Local preview

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Open [http://127.0.0.1:8765/](http://127.0.0.1:8765/)

## WordPress / Elementor

See [`elementor/ELEMENTOR-SETUP.md`](elementor/ELEMENTOR-SETUP.md).

1. Upload `assets/` (CSS, JS, fonts, images) to your child theme or media paths.
2. Enqueue `ht-home.css`, `vendor/three.min.js`, `ht-globe.js`, `ht-home.js`.
3. Paste `elementor/html-widget.html` into one full-width HTML widget.
4. Point globe `data-day` / `data-night` / `data-clouds` and logo `src` to your uploaded URLs.

## Stack

- Static HTML + scoped CSS (`.ht-home`)
- Vanilla JS (menu, hero collage/features, industries, reveal)
- Three.js WebGL globe in the CTA band
