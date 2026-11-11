# manwellclark.com

Personal portfolio for **Manwell Clark** — Senior Technical Program Manager (AI platforms, cloud infrastructure, governance).

Static site (HTML/CSS/JS, no build step), self-hosted fonts and icons, served by nginx in Docker and deployed with **Coolify** on the BlackMykael server (CHV Deploy).

## Structure
```
index.html            single-page site
assets/css            site.css (design tokens) + fonts.css
assets/js/site.js     nav, reveal, copy-email, résumé check, footprint map
assets/img/og-card.png  LinkedIn / social preview image
assets/vendor         Font Awesome 6.4, Leaflet 1.9.4 (self-hosted)
resume/               put Manwell-Clark-Resume.pdf here — the résumé buttons appear automatically
Dockerfile, nginx.conf  container used by Coolify
```

## Local preview
```bash
python3 -m http.server 8080   # then open http://localhost:8080
```

## Deploy (Coolify)
1. New Resource → Public/Private GitHub repo → `modelcseven/manwellclark.com`, branch `main`.
2. Build pack: **Dockerfile**. Port: **80**.
3. Domains: `https://manwellclark.com,https://www.manwellclark.com`.
4. Point DNS A records for `@` and `www` at the BlackMykael server IP. Coolify issues the TLS certificate.
5. Every push to `main` redeploys (enable auto-deploy / webhook).

## Updating content
Edit `index.html`, commit to `main`. Numbers in the hero, stats and experience should match the current résumé.
