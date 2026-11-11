# Static site served by nginx — Coolify builds this directly from the GitHub repo
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html favicon.svg robots.txt sitemap.xml 404.html /usr/share/nginx/html/
COPY assets /usr/share/nginx/html/assets
COPY resume /usr/share/nginx/html/resume
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
