# JabraScan Web

Una plataforma web moderna para publicar traducciones de novelas ligeras (light novels) utilizando GitHub Pages como hosting gratuito.

## Características

- **SPA Moderna**: Aplicación de una sola página con navegación
- **Lector PDF Integrado**: Visualización directa de capítulos sin descargas
- **Seguimiento de Progreso**: Guarda automáticamente el último capítulo leído
- **SEO Optimizado**: Meta tags, sitemap y datos estructurados

## Tecnologías Utilizadas

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **PDF Rendering**: PDF.js
- **Gráficos**: Chart.js
- **Íconos**: Font Awesome convertidos a SVG
- **Hosting**: GitHub Pages
- **Analytics**: Google Analytics

## Cómo subir una nueva obra

### 1. Preparar archivos de la obra

```bash
# Crear estructura de directorios
mkdir books/NombreDeLaObra
mkdir books/NombreDeLaObra/capitulos
```

### 2. Configurar metadatos

**Paso A: Añadir entrada en `capitulos.json`**:

```json
{
  "NombreDeLaObra": "books/NombreDeLaObra.json"
}
```

**Paso B: Crear archivo de configuración `books/NombreDeLaObra.json`**:

```json
{
  "NombreDeLaObra": [
    {
      "Fecha": "DD-MM-YYYY",
      "NombreArchivo": "capitulo-001.pdf",
      "numCapitulo": "1",
      "nombreCapitulo": "Título del capítulo",
      "tituloObra": "Nombre de la Obra Vol 1"
    }
  ]
}
```

### 3. Subir capítulos

- Formato: `.pdf` únicamente
- Nomenclatura: `nombre-obra-XXX.pdf` (donde XXX es el número del capítulo)
- Ubicación: `books/NombreDeLaObra/`

### 4. Crear página de la obra

Crear `books/NombreDeLaObra.html` basándose en el template `books/libro-ficha.html`

### 5. Verificar funcionamiento

```bash
# Servir localmente para pruebas
python -m http.server 8000
# o
npx serve .
```

Acceder a `http://localhost:8000` y verificar que:

- La obra aparece en el listado principal
- Los capítulos se cargan correctamente
- El lector PDF funciona sin errores

## Estructura del Proyecto

```text
JabraScan.github.io/
├── 📁 books/              # Obras y capítulos
│   ├── obra1.html         # Página individual de cada obra
│   ├── obra1.json         # Metadatos y capítulos
│   └── obra1/             # Archivos PDF de la obra
├── 📁 css/               # Estilos CSS
├── 📁 js/                # Scripts JavaScript
├── 📁 img/               # Imágenes y recursos
├── 📄 index.html         # Página principal
├── 📄 capitulos.json     # Índice de todas las obras
└── 📄 sitemap.xml        # Mapa del sitio para SEO
```

## Scripts Principales

- **`general.js`**: Navegación y funcionalidad general
- **`lector.js`**: Lector de PDF integrado
- **`libroficha.js`**: Visualización de páginas individuales de obras
- **`ultimoscapitulos.js`**: Feed de últimos capítulos publicados

## Optimización de Imágenes

El proyecto incluye el script `scripts/generate_responsive_images.py` para generar imágenes responsivas en formato WebP y diferentes resoluciones.

Para instrucciones detalladas y ejemplos de uso, consulta el archivo:

- [`GUÍA_IMÁGENES_RESPONSIVAS.md`](scripts\GUÍA_IMÁGENES_RESPONSIVAS.md)

## Buenas Prácticas

### Evitar

- Modificar `index.html` sin probar localmente primero
- Subir archivos innecesariamente grandes (>10MB por PDF)
- Cambiar la estructura de `capitulos.json`
- Usar caracteres especiales en nombres de archivos

### Recomendado

- Optimizar PDFs antes de subir (compresión)
- Usar nombres descriptivos pero concisos para capítulos
- Mantener consistencia en la nomenclatura de archivos
- Probar en múltiples dispositivos antes de publicar
- Actualizar el `sitemap.xml` cuando se añadan nuevas obras
