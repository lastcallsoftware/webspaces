# Webspaces Dockerfile: nginx + static websites (portfolio + lastcallsoftware)
# Injects backend URL into portfolio contact form at build time

FROM nginx:alpine

ARG VITE_BACKEND_BASE_URL
ARG VITE_TURNSTILE_SITE_KEY_PUBLIC

ENV NODE_ENV=production

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY portfolio/ /usr/share/nginx/portfolio/
COPY lastcallsoftware/ /usr/share/nginx/lastcallsoftware/

# Inject backend URL and Turnstile key into portfolio contact form
RUN sed -i "s|__BACKEND_BASE_URL__|${VITE_BACKEND_BASE_URL}|g" /usr/share/nginx/portfolio/index.html
RUN sed -i "s|__TURNSTILE_SITE_KEY__|${VITE_TURNSTILE_SITE_KEY_PUBLIC}|g" /usr/share/nginx/portfolio/index.html

# Inject backend URL and Turnstile key into lastcallsoftware contact form
RUN sed -i "s|__BACKEND_BASE_URL__|${VITE_BACKEND_BASE_URL}|g" /usr/share/nginx/lastcallsoftware/index.html
RUN sed -i "s|__TURNSTILE_SITE_KEY__|${VITE_TURNSTILE_SITE_KEY_PUBLIC}|g" /usr/share/nginx/lastcallsoftware/index.html

EXPOSE 8080 8443

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080 || exit 1

CMD ["nginx", "-g", "daemon off;"]
