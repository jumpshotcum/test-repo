# Kasku — static site served by unprivileged nginx (~50 MB, runs as uid 101, no build stage needed).
FROM nginxinc/nginx-unprivileged:1.27-alpine

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
# Copy only what is served: no tests, docs, node_modules or git metadata.
COPY index.html robots.txt /usr/share/nginx/html/
COPY app/ /usr/share/nginx/html/app/

USER 101
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -q -O /dev/null http://127.0.0.1:8080/app/ || exit 1
