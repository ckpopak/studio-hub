FROM python:3.12-slim
WORKDIR /app
COPY index.html .
ENV PORT=8080
CMD ["sh", "-c", "python -m http.server ${PORT}"]
