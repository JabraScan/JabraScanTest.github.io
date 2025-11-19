#!/usr/bin/env python3
"""
generate_responsive_images.py

- Procesa recursivamente img/
- Para img/avatar/ genera versiones cuadradas WebP: 256x256, 64x64, 32x32
- Para el resto genera WebP responsivos: 900w, 600w, 300w
- NO crea subcarpetas; guarda las versiones junto al archivo original:
    imagen-900w.webp, imagen-600w.webp, imagen-300w.webp
    avatar-256x256.webp, avatar-64x64.webp, avatar-32x32.webp
- No sobrescribe archivos existentes; solo crea las versiones faltantes.
- No hace upscaling; gestiona EXIF (orientación).
- Aplana la transparencia para imágenes generales (fondo blanco) pero NO aplana
  la transparencia de los avatares: éstos se guardan en WebP con alpha preserved.
"""
from pathlib import Path
import sys
from PIL import Image, ImageOps, UnidentifiedImageError

# Configuración
RESPONSIVE_SIZES = {
    '900w': {'width': 900, 'quality': 80},
    '600w': {'width': 600, 'quality': 75},
    '300w': {'width': 300, 'quality': 70}
}
AVATAR_SIZES = [256, 64, 32]
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.tif', '.tiff', '.bmp'}


def open_image_safe(path: Path) -> Image.Image:
    """
    Abre la imagen y aplica EXIF orientation (ImageOps.exif_transpose).
    Lanza excepción si no se puede abrir.
    """
    try:
        img = Image.open(path)
        return ImageOps.exif_transpose(img)
    except UnidentifiedImageError:
        raise Exception(f"Formato de imagen no reconocido: {path}")
    except Exception as e:
        raise Exception(f"Error abriendo imagen {path}: {e}")


def ensure_rgb_for_saving(img: Image.Image, bg=(255, 255, 255)) -> Image.Image:
    """
    Convierte/aplana la imagen a RGB usando un fondo (por defecto blanco).
    Usado para imágenes generales donde no queremos alpha.
    """
    if img.mode == 'P':
        img = img.convert('RGBA')
    if img.mode in ('RGBA', 'LA'):
        # Aplana usando la máscara alpha
        background = Image.new('RGB', img.size, bg)
        background.paste(img, mask=img.split()[-1])
        return background
    if img.mode != 'RGB':
        return img.convert('RGB')
    return img


def ensure_mode_keep_alpha(img: Image.Image) -> Image.Image:
    """
    Asegura que la imagen esté en modo RGBA para preservar alpha.
    No aplana; usado exclusivamente para avatares.
    """
    if img.mode == 'P':
        img = img.convert('RGBA')
    if img.mode != 'RGBA':
        return img.convert('RGBA')
    return img


def center_crop_to_square(img: Image.Image) -> Image.Image:
    w, h = img.size
    if w == h:
        return img
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    return img.crop((left, top, left + side, top + side))


def save_webp_if_missing(img: Image.Image, out_path: Path, quality: int = 80, preserve_alpha: bool = False) -> bool:
    """
    Guarda img en out_path como WebP solo si out_path no existe.
    Si preserve_alpha=True guarda en modo que preserve el canal alfa (usamos lossless=True por fidelidad).
    Devuelve True si se creó el archivo, False si ya existía.
    """
    if out_path.exists():
        return False

    save_kwargs = {}
    if preserve_alpha:
        # Preservar alpha: usamos lossless para mantener mejor la transparencia
        save_kwargs = {'lossless': True}
    else:
        save_kwargs = {'quality': quality}

    img.save(out_path, 'WEBP', **save_kwargs)
    return True


def process_avatar(src_path: Path):
    """
    Genera avatares cuadrados sin aplanar alpha, guardando junto al original:
      <stem>-256x256.webp, <stem>-64x64.webp, <stem>-32x32.webp
    No hace upscaling: si la imagen recortada es más pequeña que target, usa su tamaño.
    """
    try:
        img = open_image_safe(src_path)
    except Exception as e:
        print(f"Skip avatar {src_path}: {e}")
        return

    img = center_crop_to_square(img)
    orig_w, _ = img.size

    for size in AVATAR_SIZES:
        out_name = f"{src_path.stem}-{size}x{size}.webp"
        out_path = src_path.parent / out_name  # guarda junto al original
        if out_path.exists():
            print(f"  Omitido (existe): {out_path}")
            continue

        if orig_w <= size:
            to_save = img  # no upscaling; puede contener alpha
        else:
            to_save = img.resize((size, size), Image.Resampling.LANCZOS)

        to_save = ensure_mode_keep_alpha(to_save)

        try:
            created = save_webp_if_missing(to_save, out_path, quality=85, preserve_alpha=True)
            if created:
                print(f"  Generado avatar (con alpha): {out_path} ({size}x{size})")
        except Exception as e:
            print(f"  Error guardando avatar {out_path}: {e}")


def process_responsive_image(src_path: Path):
    """
    Genera versiones responsivas WebP sin alpha (aplanadas sobre blanco) y las guarda junto al original:
      <stem>-900w.webp, <stem>-600w.webp, <stem>-300w.webp
    No sobrescribe archivos existentes; no hace upscaling.
    """
    try:
        img = open_image_safe(src_path)
    except Exception as e:
        print(f"Skip imagen {src_path}: {e}")
        return

    img_rgb = ensure_rgb_for_saving(img)
    orig_w, orig_h = img_rgb.size
    aspect = orig_h / orig_w if orig_w else 1

    for name, cfg in RESPONSIVE_SIZES.items():
        out_name = f"{src_path.stem}-{name}.webp"
        out_path = src_path.parent / out_name  # guarda junto al original
        if out_path.exists():
            print(f"  Omitido (existe): {out_path}")
            continue

        target_w = cfg['width']
        quality = cfg['quality']

        if orig_w <= target_w:
            new_w, new_h = orig_w, orig_h
        else:
            new_w = target_w
            new_h = int(round(target_w * aspect))

        resized = img_rgb.resize((new_w, new_h), Image.Resampling.LANCZOS)
        try:
            created = save_webp_if_missing(resized, out_path, quality=quality, preserve_alpha=False)
            if created:
                print(f"  Generado: {out_path} ({new_w}x{new_h}, {quality}%)")
        except Exception as e:
            print(f"  Error guardando {out_path}: {e}")


def should_ignore_path(p: Path) -> bool:
    """
    Ignora rutas dentro de .git o carpetas/archivos ocultos (comienzan por .).
    """
    parts = [part.lower() for part in p.parts]
    if '.git' in parts:
        return True
    if any(part.startswith('.') for part in parts):
        return True
    return False


def process_all(base_dir: Path):
    base = base_dir.resolve()
    img_root = base / 'img'
    if not img_root.exists() or not img_root.is_dir():
        print(f"No existe carpeta img/: {img_root}")
        return

    # 1) Avatares en img/avatar (directo, no recursivo en avatar_dir)
    avatar_dir = img_root / 'avatar'
    if avatar_dir.exists() and avatar_dir.is_dir():
        avatar_files = [p for p in avatar_dir.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS]
        if avatar_files:
            print(f"Procesando {len(avatar_files)} avatares en {avatar_dir}")
            for f in avatar_files:
                print(f" Procesando avatar: {f.name}")
                process_avatar(f)
            print("Avatares procesados.\n")

    # 2) Todas las demás imágenes bajo img/ recursivamente, excluyendo img/avatar
    all_images = [p for p in img_root.rglob('*') if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS]
    # Excluir cualquier archivo en la ruta avatar
    all_images = [p for p in all_images if 'avatar' not in [part.lower() for part in p.relative_to(img_root).parts]]
    # Excluir rutas ocultas y .git
    all_images = [p for p in all_images if not should_ignore_path(p)]

    if not all_images:
        print("No hay imágenes generales para procesar.")
        return

    print(f"Iniciando procesamiento de {len(all_images)} imágenes generales bajo {img_root}")
    for img_path in all_images:
        print(f" Procesando: {img_path.relative_to(base)}")
        process_responsive_image(img_path)
    print("Procesamiento general finalizado.")


if __name__ == '__main__':
    # Uso:
    #   python scripts/generate_responsive_images.py            -> procesa ./ (usa ./img)
    #   python scripts/generate_responsive_images.py /ruta/proyecto
    base = Path('.') if len(sys.argv) == 1 else Path(sys.argv[1])
    process_all(base)
