# ricenation

Static studio hub for channel side products.

## Local

```bash
python -m http.server 8765 --bind 127.0.0.1 --directory .
```

- Studio hub: http://127.0.0.1:8765/
- QuietLY atlas: http://127.0.0.1:8765/channels/quietly/
- QuietLY Atmosphere: http://127.0.0.1:8765/channels/quietly/atmosphere.html

## Layout

```text
/                              studio hub
/channels/quietly/             QuietLY field notes + Atmosphere
/channels/{other}/             future channel side products
/atmosphere.html               redirect → /channels/quietly/atmosphere.html
/about.html                    redirect → /channels/quietly/about.html
```
