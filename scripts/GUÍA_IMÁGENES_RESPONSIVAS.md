# Guía para generar imágenes responsivas

Este proyecto incluye el script `scripts/generate_responsive_images.py` para crear versiones optimizadas de imágenes en formato WebP, en tres resoluciones: 900w, 600w y 300w. Esto facilita la adaptación de imágenes a diferentes dispositivos y mejora el rendimiento web.

## Requisitos

- Python 3
- Pillow (`pip install pillow`)

## Uso básico

Ejecuta el script desde la terminal según la necesidad:

### Procesar una imagen específica

Genera versiones responsivas de una sola imagen.

```powershell
python scripts/generate_responsive_images.py -i img/MiLibro/portada.jpg
```

### Procesar todas las imágenes de un libro

Procesa todas las imágenes dentro de la carpeta de un libro.

```powershell
python scripts/generate_responsive_images.py -b MiLibro
```

### Procesar todas las imágenes de todos los libros

Procesa todas las imágenes en todas las carpetas de libros dentro de `img/`.

```powershell
python scripts/generate_responsive_images.py -a
```

Opcionalmente, puedes indicar el directorio base del proyecto con `-d`.

## Ejemplo

Si tienes una imagen en `img/MiLibro/portada.jpg` y ejecutas:

```powershell
python scripts/generate_responsive_images.py -i img/MiLibro/portada.jpg
```

Se creará una carpeta `img/MiLibro/portada/` con los archivos:

- portada-900w.webp
- portada-600w.webp
- portada-300w.webp

Cada archivo es una versión optimizada para diferentes tamaños de pantalla.

---

Para más detalles, revisa el script o consulta la ayuda:

```powershell
python scripts/generate_responsive_images.py -h
```
