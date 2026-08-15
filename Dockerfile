FROM nginx:1.27-alpine

COPY infra/cloudrun/nginx.conf /etc/nginx/conf.d/default.conf

COPY index.html about.html atmosphere.html README.md /usr/share/nginx/html/
COPY channels/quietly /usr/share/nginx/html/channels/quietly

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
