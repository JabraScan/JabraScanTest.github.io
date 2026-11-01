# Estructura Modular de CSS - JabraScan

## Módulos CSS

El CSS del proyecto ha sido separado en módulos para mejorar el mantenimiento y rendimiento.

### variables.css

#### Variables CSS globales

- Colores principales y de estado
- Sombras y bordes
- Espaciado y transiciones
- Tamaños de fuente
- Z-index

**Uso:** Incluir en todas las páginas para mantener consistencia visual.

---

### header.css

#### Navegación y encabezado

- Navbar sticky
- Menús desplegables
- Búsqueda en navbar
- Brand y logo
- Último capítulo leído
- Iconos de usuario

**Páginas que lo necesitan:**

- index.html
- ultimosCapitulos.html
- lectorpdf.html
- Cualquier página con navbar

---

### carousel.css

#### Carrusel personalizado

- Slider de libros destacados
- Controles de navegación
- Overlay de información
- Badges de capítulos
- Animaciones del carrusel

**Páginas que lo necesitan:**

- index.html (página principal con carrusel)

---

### cards.css

#### Tarjetas y elementos visuales

- Cards de libros (book-card, book-card-main)
- Cards de capítulos (chapter-card)
- Ficha/detalle de libro
- Estados de libros
- Lista de libros para iOS

**Páginas que lo necesitan:**

- index.html
- ultimosCapitulos.html
- Páginas con grids de libros o capítulos

---

### utilities.css

#### Clases de utilidad y componentes comunes

- Paginación
- Indicadores (+18, adulto)
- Etiquetas y badges
- Estados de obras (Activo, Pausado, etc.)
- Listas de capítulos
- Enlaces PDF
- Buscador
- Loader
- Canvas (gráficas)
- Footer

**Páginas que lo necesitan:**

- Casi todas (componentes comunes)
- counts.html (loader, canvas)
- index.html (todo)

---

### responsive.css

#### Media queries y adaptación móvil

- Breakpoints para tablet (991px, 900px, 768px)
- Breakpoints para móvil (700px, 576px)
- Ajustes específicos para iOS
- Animaciones según tamaño de pantalla
- Optimizaciones táctiles

**Páginas que lo necesitan:**

- Todas las páginas con contenido responsive
- index.html
- ultimosCapitulos.html

---

## Ventajas de la Modularización

### Rendimiento

- Carga solo el CSS necesario
- Reduce el tiempo de carga inicial
- Menor uso de ancho de banda

### Mantenimiento

- Archivos más pequeños y enfocados
- Fácil localización de estilos
- Menor riesgo de conflictos

### Escalabilidad

- Fácil agregar nuevos módulos
- Reutilización de componentes
- Mejor organización del código

### Variables CSS

- Cambios globales centralizados
- Consistencia en toda la aplicación
- Fácil personalización de temas

---

## Notas de Migración

### style.css (Archivo Legacy)

El archivo `style.css` original ahora importa todos los módulos:

```css
@import url('variables.css');
@import url('header.css');
@import url('carousel.css');
@import url('cards.css');
@import url('utilities.css');
@import url('responsive.css');
```

**Uso:** Solo para compatibilidad con archivos que aún no se han actualizado.
