# Elementor setup — Hyperthings Infosys-style homepage

## What you get

| File | Purpose |
|------|---------|
| `index.html` | Full local preview (open in browser) |
| `assets/css/ht-home.css` | All styles (Geist + Inter, animations, mobile) |
| `assets/js/vendor/three.min.js` | Three.js (WebGL globe) |
| `assets/js/ht-menu-data.js` | Header mega menu product lists (synced with hyperthings.ai) |
| `assets/js/ht-globe.js` | Realistic 3D Earth in the CTA section |
| `assets/js/ht-home.js` | Menu, sticky header, carousel, scroll reveal |
| `elementor/html-widget.html` | Paste into one Elementor HTML widget |

Fonts match Infosys: **Geist** (headlines) + **Inter** (body). Brand colors stay Hyperthings red `#C3252D` and navy `#232156`.

---

## Install on WordPress (Elementor)

### 1. Upload assets

Upload these to your theme or Media Library / child theme:

- `assets/css/ht-home.css`
- `assets/js/vendor/three.min.js`
- `assets/js/ht-menu-data.js`
- `assets/js/ht-globe.js`
- `assets/js/ht-home.js`
- `assets/fonts/` (Geist-Light / Regular / Medium / SemiBold `.woff2`)
- `assets/images/hyperthings-logo-header.png` (header / overlay logo)
- `assets/images/hero-collage/` (5 images) + `assets/images/hero-cards/` (3 feature slides after collage)
- `assets/images/globe-earth.jpg` + `assets/images/globe-night.png` + `assets/images/globe-clouds.png` (CTA 3D globe textures)

**Recommended (child theme):**

```
wp-content/themes/your-child-theme/hyperthings/
  ht-home.css
  ht-home.js
  ht-globe.js
  vendor/
    three.min.js
  fonts/
    Geist-Light.woff2
    Geist-Regular.woff2
    Geist-Medium.woff2
    Geist-SemiBold.woff2
  images/
    globe-earth.jpg
    globe-night.jpg
    hero-collage/
    hero-cards/
```

Keep the relative path `../fonts/` from the CSS file (or update `@font-face` urls if you place files differently).

In the HTML widget, set the CTA globe texture URLs to your uploaded paths:

```html
<div class="ht-cta__globe"
     data-day="https://yoursite.com/wp-content/themes/your-child-theme/hyperthings/images/globe-earth.jpg"
     data-night="https://yoursite.com/wp-content/themes/your-child-theme/hyperthings/images/globe-night.png"
     data-clouds="https://yoursite.com/wp-content/themes/your-child-theme/hyperthings/images/globe-clouds.png"
     aria-hidden="true"></div>
```

### 2. Enqueue CSS & JS

Add to your child theme `functions.php`:

```php
add_action('wp_enqueue_scripts', function () {
  if (!is_front_page()) return; // or is_page('home')
  $base = get_stylesheet_directory_uri() . '/hyperthings';

  wp_enqueue_style('ht-home', $base . '/ht-home.css', [], '1.0.28');

  wp_enqueue_script('ht-menu-data', $base . '/ht-menu-data.js', [], '1.0.28', true);
  wp_enqueue_script('ht-three', $base . '/vendor/three.min.js', [], '0.160.0', true);
  wp_enqueue_script('ht-globe', $base . '/ht-globe.js', ['ht-three'], '1.0.28', true);
  wp_enqueue_script('ht-home', $base . '/ht-home.js', ['ht-menu-data'], '1.0.28', true);
});
```

**Order matters:** `ht-menu-data.js` → `three.min.js` → `ht-globe.js` → `ht-home.js`.

**Or** Elementor Pro → Custom Code: paste `<link>` / `<script>` tags pointing to the uploaded URLs (Body End for JS, Head for CSS).

### 3. Create the page in Elementor

1. Edit Home with Elementor.
2. Use a **full-width** page template (Elementor Canvas or Hello theme canvas) so the theme header/footer don’t double up — this design includes its own header/footer.
3. Add **one HTML widget**.
4. Paste the contents of `elementor/html-widget.html`.
5. Set the section/container padding to **0** and content width to **Full Width**.

### 4. Hide default theme header (if needed)

If Canvas isn’t available, hide the theme header/footer for this page in your theme options or with CSS:

```css
.page-id-YOUR_ID .site-header,
.page-id-YOUR_ID .site-footer { display: none !important; }
```

### 5. Mobile check

Test at 375px, 768px, and 1280px in Elementor’s responsive mode. Pill nav hides on tablet/mobile; hamburger overlay remains.

---

## Industry video carousel

The **Industry Expertise** section uses muted looping `<video>` tags.

### Replace demo clips in WordPress

1. Upload 4–8 second **muted** MP4 (or WebM) files to **Media Library** — one per industry.
2. Recommended size: under **2–3 MB** each, 720p or 1080p, H.264.
3. In the HTML widget, find each industry card and replace the `src` on `<source>`:

```html
<source src="https://yoursite.com/wp-content/uploads/2026/08/smart-city.mp4" type="video/mp4" />
```

4. Keep the `poster="..."` image URL (or swap to your own still) for fast load and mobile fallback.
5. Do **not** remove `muted` `loop` `playsinline` — browsers block autoplay without mute.

### Behavior

- Auto-advances every ~7 seconds
- Tab buttons + prev/next
- Plays only while the section is on screen (saves mobile data)
- If a video fails to load, the poster + Ken Burns still animates

### Local preview

Demo uses public sample MP4 URLs. Swap them before production.

