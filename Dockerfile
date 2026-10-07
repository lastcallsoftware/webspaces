# Webspaces Dockerfile: nginx + static websites (personal-website + lastcallsoftware)
# Injects backend URL into personal-website contact form at build time

FROM nginx:alpine

ARG VITE_BACKEND_BASE_URL
ARG VITE_TURNSTILE_SITE_KEY_PUBLIC
ARG BUILD_VERSION=dev

ENV NODE_ENV=production

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY personal-website/ /usr/share/nginx/personal-website/
COPY lastcallsoftware/ /usr/share/nginx/lastcallsoftware/

# Add a deploy-specific version to asset URLs so browsers and CDNs fetch fresh
# JS/CSS every release without requiring a manual cache purge.
RUN find /usr/share/nginx/personal-website /usr/share/nginx/lastcallsoftware -type f -name "*.html" \
    -exec sed -i "s|__APP_VERSION__|${BUILD_VERSION}|g" {} +

# Inject backend URL and Turnstile key into personal-website contact form
RUN sed -i "s|__BACKEND_BASE_URL__|${VITE_BACKEND_BASE_URL}|g" /usr/share/nginx/personal-website/index.html
RUN sed -i "s|__TURNSTILE_SITE_KEY__|${VITE_TURNSTILE_SITE_KEY_PUBLIC}|g" /usr/share/nginx/personal-website/index.html

# Inject backend URL and Turnstile key into lastcallsoftware contact form
RUN sed -i "s|__BACKEND_BASE_URL__|${VITE_BACKEND_BASE_URL}|g" /usr/share/nginx/lastcallsoftware/index.html
RUN sed -i "s|__TURNSTILE_SITE_KEY__|${VITE_TURNSTILE_SITE_KEY_PUBLIC}|g" /usr/share/nginx/lastcallsoftware/index.html

EXPOSE 8080 8443

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080 || exit 1

CMD ["nginx", "-g", "daemon off;"]
