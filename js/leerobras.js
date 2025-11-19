import { cargarlibro } from './libroficha.js';
import { crearUltimoCapituloDeObra } from './capitulos.js';
import { parseFecha, seleccionarImagen, obtenerNombreObra } from './utils.js';
import { incrementarVisita, leerVisitas, obtenerInfo, valorarRecurso } from './contadoresGoogle.js';

// ===== Estado de paginación (ámbito de módulo) =====
let PAGE_SIZE_DEFAULT = 15;
let pageSize = PAGE_SIZE_DEFAULT;
let currentPage = 1;
let allCardsDesktop = []; // div.col para .book-list
let allItemsMobile = []; // li.item-libro para .lista-libros
let paginationContainer = null;
let searchInput = null;
let filteredCardsDesktop = [];
let filteredItemsMobile = [];

document.addEventListener("DOMContentLoaded", function () {
  incrementarVisita("obra_Inicio");
  paginationContainer = document.getElementById('pagination');
  searchInput = document.getElementById('q-index');
async function run() {
  const res = await fetch(URL, { timeout: 10000 });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const obras = await res.json();

  if (!Array.isArray(obras)) throw new TypeError("Se esperaba un array");

  const carouselContainer = document.querySelector(".custom-carousel-track");
  const booklistContainer = document.querySelector(".book-list");
  const booklistContainernopc = document.querySelector(".lista-libros");
  const booklastread = document.querySelector(".main-ultimoCapituloleido");

    for (const obra of obras) {
      // Asignar a variables (las que pidas)
      const obra_id = obra.obra_id;
      const visible = obra.visible;
      const nombreobra = obra.nombreobra;
      const nombresAlternativos = obra.nombresAlternativos; // array
      const autor = obra.autor;
      const sinopsis = obra.sinopsis;
      const tipoobra = obra.tipoobra;
      const fechaCreacion = obra.fechaCreacion;
      const ubicacion = obra.ubicacion;
      const estado = obra.estado;
      const traductor = obra.traductor;
      const aprobadaAutor = obra.aprobadaAutor;
      const adulto = obra.adulto;
      const icono = obra.icono;
      const bannerOpcional = obra.bannerOpcional;
      const Categoria = obra.categoria; // puede ser array o string
      const discord = obra.discord;
      const valoracion = obra.valoracion;
      const wiki = obra.wiki;
      const imagen = seleccionarImagen(obra.imagen); // array
      const UltimoCapNum = seleccionarImagen(obra.UltimoCapNum);
      const UltimoCapNom = seleccionarImagen(obra.UltimoCapNom);
      const UltimoCapFecha = seleccionarImagen(obra.UltimoCapFecha);

        // Último capítulo leído (mostrar solo si hay datos válidos)
        const renderLastRead = (el = booklastread) => {
          if (!el) return;                                      // salir si no hay elemento
          const obra = localStorage.getItem('ultimaObra');      // leer clave: última obra
          const cap = localStorage.getItem('ultimoCapitulo');   // leer clave: último capítulo
          const ok = v => v && v !== 'null';                    // validador: existe y no es 'null'

          if (ok(obra) && ok(cap)) {                            // si ambos son válidos
            el.textContent = `${obra}-${cap}`;                  // mostrar "Obra-Capítulo"
            el.classList.remove('d-none');                      // asegurar visibilidad
          } else {                                              // si falta cualquiera
            el.textContent = '';                                // evitar mostrar "null-null"
            el.classList.add('d-none');                         // ocultar elemento
          }
        };
        renderLastRead(); // ejecutar inmediatamente
        //aprobada autor
        const OKAutor = aprobadaAutor === 'si'
          ? `<span class="carousel-info-label">Traducción aprobada por el autor</span><br>
             <span>Discord Oficial : <a href="${discord}" target="_blank">${discord}</a></span>`
          : '';
        //Categorias
        const categoriaIndiv = Categoria.split(",").map(item => item.trim());
        const categoriaObj = categoriaIndiv.map(item => `<span class="etiqueta">${item}</span>`).join('');
        //Manejo de imagenes
        const imagenContenedor = document.createElement("div");
        imagenContenedor.classList.add("imagen-contenedor");
        const img = document.createElement("img");

        // Extraer la ruta base y extensión de la imagen
        const imagenPath = imagen.replace(/\.(jpg|jpeg|png|webp)$/i, '');
        
        // Usar imagen original como src principal (fallback)
        img.src = `img/${imagen}`;
        img.alt = nombreobra;
        img.loading = "lazy"; // Lazy loading para mejorar rendimiento
        
        // Establecer dimensiones intrínsecas que coincidan con el aspect ratio del CSS
        // CSS usa height: 280px con width: 100%, aspecto ~4:3 o similar
        // Usamos dimensiones proporcionales para evitar layout shift en iOS
        img.width = 280;
        img.height = 280;
        // Mejora para paint: decodificación asíncrona (no altera loading ni comportamiento)
        img.decoding = "async";
        // Solo agregar srcset si la imagen tiene una estructura de carpeta (probablemente tiene versiones optimizadas)
        if (imagen.includes('/')) {
          const webpPath = imagenPath;
          // Aplicar srcset directamente - el navegador usará src como fallback si las versiones optimizadas no existen
          img.srcset = `img/${webpPath}-300w.webp 300w, img/${webpPath}-600w.webp 600w, img/${webpPath}-900w.webp 900w`;
          // sizes optimizado considerando DPR (Device Pixel Ratio):
          // En móvil, las cards ocupan ~180-200px → con DPR 2-3x necesitan 300w-600w
          // En tablet, ocupan ~240-300px → con DPR 2x necesitan 600w
          // En desktop, ocupan ~280-350px → necesitan 600w-900w
          const dpr = window.devicePixelRatio || 1;
          if (dpr > 2) {
            img.sizes = "(max-width: 576px) 50vw, (max-width: 768px) 33vw, (max-width: 992px) 25vw, 20vw";
          } else {
            img.sizes = "(max-width: 576px) 100vw, (max-width: 768px) 50vw, (max-width: 992px) 33vw, (max-width: 1200px) 25vw, 20vw";
          }
        }
        //Manejo de errores para evitar imagen rota
        img.onerror = function () {
          // 1er fallo: intentar la original
          this.removeAttribute('srcset');
          this.src = `img/${imagen}`;
          // reemplaza el handler por el segundo paso
          this.onerror = function () { this.onerror = null; this.style.display = 'none'; };
        };
        imagenContenedor.appendChild(img);
        //Contenido +18
        if (contenido18 === "adulto") {
          imagenContenedor.classList.add("adulto");
          const indicador = document.createElement("div");
          indicador.classList.add("indicador-adulto");
          indicador.textContent = "+18";
          imagenContenedor.appendChild(indicador);
        }
        // 👻 generar bloque oculto con los alternativos
        const hiddenNames = nombresAlternativos.length > 0
          ? `<div class="hidden-alt-names" style="display:none;">
               ${nombresAlternativos.map(n => `<span style="display:flex;">${n}</span>`).join("")}
             </div>`
          : "";

        const itemCarousel = document.createElement("div");
        itemCarousel.className = "custom-carousel-item";
        itemCarousel.innerHTML = `
            <div class="carousel-info-overlay">
              <div class="carousel-info-title libro-item">${nombreobra}</div>
              ${hiddenNames}
              <div class="carousel-info-sinopsis">${sinopsis}</div>
              <div class="carousel-info-row">
                <span class="carousel-info-label clave">${clave}</span>
                <span class="carousel-info-label">Autor:</span> <span>${autor}</span>
                <span class="carousel-info-label">Traducción:</span> <span>${traduccion}</span>
              </div>
              <div class="carousel-info-row">
                <span class="carousel-info-label">Estado:</span> <span class="${estado}">${estado}</span>
              </div>
              <div class="carousel-info-row-tags d-none d-lg-flex">${categoriaObj}</div><br>
              <div class="carousel-info-row">${OKAutor}</div>
            </div>
            <div class="carousel-chapter-badge"></div>
          `;
        itemCarousel.querySelector(".carousel-info-title").onclick = () => onLibroClick(clave);
        itemCarousel.prepend(imagenContenedor);
        carouselContainer.appendChild(itemCarousel);

        const itemBook = document.createElement("div");
        itemBook.classList.add("col");
        itemBook.innerHTML = `
          <article class="card h-100 book-card-main libro-item" data-clave="${clave}">
            <div class="card-body d-flex flex-column">
              <p class="clave d-none">${clave}</p>
              <h3 class="card-title h6 mb-2">${nombreobra}</h3>
              ${hiddenNames}
              <div class="card-text">
                <div class="book-author-name mb-2"><strong class="book-author-title">Autor:</strong> ${autor}</div>
                <div class="book-estado badge ${estado === 'En progreso' ? 'bg-success' : estado === 'Pausado' ? 'bg-warning' : 'bg-secondary'} mb-2">${estado}</div>
              </div>
            </div>
          </article>
        `;
        itemBook.querySelector(".libro-item").onclick = () => onLibroClick(clave);

        const itemBookNOpc = document.createElement("li");
        itemBookNOpc.classList.add("item-libro");
        itemBookNOpc.onclick = () => onLibroClick(clave);
        itemBookNOpc.innerHTML = `
          <div class="info-libro">
            <p class="clave">${clave}</p>
            <strong>${nombreobra}</strong><br>
            Autor: <span>${autor}</span><br>
            Estado: <span class="${estado}">${estado}</span><br>
          </div>
        `;

        //Ultimo capítulo
          const promesaCapitulo = Promise.resolve().then(() => {
            // No continuar si faltan datos esenciales
            if (!UltimoCapNum || !UltimoCapNom || !UltimoCapFecha) return;
            // Construimos el objeto 'data' con la misma estructura que espera crearUltimoCapituloDeObra
            // clave es la clave de la obra que ya tienes en el scope
            const data = {
              [obra_id]: [
                {
                  numCapitulo: UltimoCapNum,      // número del capítulo (igual que en tus JSON)
                  nombreCapitulo: UltimoCapNom,   // nombre del capítulo (igual que en tus JSON)
                  Fecha: UltimoCapFecha           // fecha en formato "dd-mm-yyyy"
                }
              ]
            };

            // crea el elemento HTML del último capítulo
            const bloque = crearUltimoCapituloDeObra(data, obra_id);
            if (!bloque) return; // si devuelve null, no hay nada que insertar

            // Clonamos el bloque para los distintos lugares donde se debe insertar
            const bloqueA = bloque;                 // bloque original para la tarjeta principal
            const bloqueB = bloque.cloneNode(true); // clon para la versión sin opciones
            const bloqueC = bloque.cloneNode(true); // clon para el carrusel

            // Insertar en la card principal dentro de .card-body
            const cardBody = itemBook.querySelector('.card-body');
            if (cardBody) cardBody.appendChild(bloqueA);

            // Insertar en la vista sin opciones dentro de .info-libro
            const infoLibro = itemBookNOpc.querySelector('.info-libro');
            if (infoLibro) infoLibro.appendChild(bloqueB);

            // Si existe el contenedor del carrusel, añadir la versión adaptada
            const carouselChapterBadge = itemCarousel.querySelector('.carousel-chapter-badge');
            if (carouselChapterBadge) {
              bloqueC.classList.add('carousel-chapter-badge-info'); // clase específica para carrusel
              carouselChapterBadge.appendChild(bloqueC);
            }

            // Si la tarjeta incluye la etiqueta .tag-capitulo.hoy, marcamos el contenedor
            // con la clase .hoy-book para estilos adicionales
            if (itemBook.querySelector('.tag-capitulo.hoy')) {
              itemBook.classList.add('hoy-book');
            }
          });
          // Mantener la colección de promesas como antes
          promesasCapitulos.push(promesaCapitulo);

        // Función auxiliar para clonar imagen con srcset
        const clonarImagenConSrcset = (contenedor) => {
          const clone = contenedor.cloneNode(true);
          const imgOriginal = contenedor.querySelector('img');
          const imgClone = clone.querySelector('img');
          if (imgOriginal && imgClone) {
            // Copiar explícitamente los atributos srcset y sizes
            if (imgOriginal.srcset) imgClone.srcset = imgOriginal.srcset;
            if (imgOriginal.sizes) imgClone.sizes = imgOriginal.sizes;
          }
          return clone;
        };

        const imagenContenedorA = clonarImagenConSrcset(imagenContenedor);
        const imagenContenedorB = clonarImagenConSrcset(imagenContenedor);

        // Agregar la imagen como card-img-top dentro del article
        const cardImg = imagenContenedorA.querySelector('img');
        if (cardImg) {
          cardImg.classList.add('card-img-top');
          itemBook.querySelector('.card').prepend(imagenContenedorA);
        }

        itemBookNOpc.prepend(imagenContenedorB);

        // Almacenar para paginación; render diferido
        allCardsDesktop.push(itemBook);
        allItemsMobile.push(itemBookNOpc);
      });

      Promise.all(promesasCapitulos).then(() => {
        // Ordenar por fecha más reciente primero
        ordenarColeccionPorFecha(allCardsDesktop);
        ordenarColeccionPorFecha(allItemsMobile);

        // Inicialmente, la colección filtrada es la completa
        filteredCardsDesktop = [...allCardsDesktop];
        filteredItemsMobile = [...allItemsMobile];

        // Inicializar página desde hash (#page=2)
        const hash = window.location.hash || '';
        const m = hash.match(/page=(\d+)/i);
        if (m) currentPage = Math.max(1, parseInt(m[1], 10));

        renderPage(currentPage);
        setupPagination();

        // Conectar buscador del navbar si existe
        if (searchInput) {
          const doFilter = () => {
            const q = searchInput.value.trim().toLowerCase();
            if (!q) {
              filteredCardsDesktop = [...allCardsDesktop];
              filteredItemsMobile = [...allItemsMobile];
            } else {
              const match = (el) => {
                // Buscar por título de obra y autor si está presente en la card
                const title = el.querySelector('.card-title')?.textContent?.toLowerCase() || '';
                const autor = el.querySelector('.book-author-name')?.textContent?.toLowerCase() || '';
                const clave = el.querySelector('.clave')?.textContent?.toLowerCase() || '';
                return title.includes(q) || autor.includes(q) || clave.includes(q);
              };
              filteredCardsDesktop = allCardsDesktop.filter(match);
              // Para móvil: usa estructura distinta
              const matchMobile = (el) => {
                const t = el.querySelector('strong')?.textContent?.toLowerCase() || '';
                const autor = el.querySelector('.info-libro span')?.textContent?.toLowerCase() || '';
                const clave = el.querySelector('.clave')?.textContent?.toLowerCase() || '';
                return t.includes(q) || autor.includes(q) || clave.includes(q);
              };
              filteredItemsMobile = allItemsMobile.filter(matchMobile);
            }
            // Reiniciar a página 1 tras filtrar
            renderPage(1);
            setupPagination();
          };
          searchInput.addEventListener('input', doFilter);
        }
      });
    })
    .catch(err => console.error("Error al cargar el XML:", err));
});

function onLibroClick(libroId) {
  localStorage.setItem('libroSeleccionado', libroId);
  fetch('books/libro-ficha.html')
    .then(response => {
      if (!response.ok) {
        throw new Error('Error al cargar el archivo: ' + response.statusText);
      }
      return response.text();
    })
    .then(data => {
      const mainElement = document.querySelector('main');
      mainElement.innerHTML = data;
      cargarlibro(libroId);
    })
    .catch(err => console.error('Error:', err));
}
/**
 * 📚 Función: ordenarLibrosPorFecha
 * ----------------------------------
 * Ordena dos listas de libros por fecha:
 * 1. Elementos <article> dentro de .book-list
 * 2. Elementos <li> dentro de .lista-libros
 * 
 * Cada elemento debe contener un hijo con clase .book-latest-chapter
 * con atributo data-fecha en formato "DD-MM-YYYY"
 */
// Extrae fecha 'DD-MM-YYYY' de un elemento libro (div.col o li)
function getFechaDeElemento(element) {
  const searchElement = element.classList.contains('col') ? element.querySelector('.card') : element;
  const fechaStr = searchElement?.querySelector('.book-latest-chapter')?.getAttribute('data-fecha');
  if (!fechaStr || !/^\d{2}-\d{2}-\d{4}$/.test(fechaStr)) return null;
  const [dia, mes, año] = fechaStr.split('-');
  return new Date(`${año}-${mes}-${dia}`);
}

function ordenarColeccionPorFecha(arr) {
  arr.sort((a, b) => {
    const fechaA = getFechaDeElemento(a);
    const fechaB = getFechaDeElemento(b);
    if (!fechaA && !fechaB) return 0;
    if (!fechaA) return 1;
    if (!fechaB) return -1;
    return fechaB - fechaA;
  });
}

function getTotalPages() {
  const total = filteredCardsDesktop?.length ?? allCardsDesktop.length;
  return Math.max(1, Math.ceil(total / pageSize));
}

function renderPage(page) {
  const booklistContainer = document.querySelector('.book-list');
  const booklistContainernopc = document.querySelector('.lista-libros');
  if (!booklistContainer || !booklistContainernopc) return;

  const totalPages = getTotalPages();
  currentPage = Math.min(Math.max(1, page), totalPages);

  const start = (currentPage - 1) * pageSize;
  const end = start + pageSize;

  // Render desktop grid
  booklistContainer.innerHTML = '';
  (filteredCardsDesktop.length ? filteredCardsDesktop : allCardsDesktop)
    .slice(start, end)
    .forEach(node => booklistContainer.appendChild(node));

  // Render mobile list
  booklistContainernopc.innerHTML = '';
  (filteredItemsMobile.length ? filteredItemsMobile : allItemsMobile)
    .slice(start, end)
    .forEach(node => booklistContainernopc.appendChild(node));

  // Actualizar hash sin romper otras partes (#...&page=2 o #page=2)
  const baseHash = (window.location.hash || '').replace(/([&?#])?page=\d+/i, '').replace(/^#?/, '');
  // Solo gestionar hash de paginación cuando NO hay otra vista declarada
  if (!baseHash || baseHash === '' || baseHash === 'index.html') {
    const newHash = `#page=${currentPage}`;
    if (window.location.hash !== newHash) {
      window.history.replaceState(null, '', newHash);
    }
  }
}

function setupPagination() {
  if (!paginationContainer) return;
  const totalPages = getTotalPages();
  // Ocultar si no hay necesidad de paginar
  if (totalPages <= 1) {
    paginationContainer.innerHTML = '';
    paginationContainer.style.display = 'none';
    return;
  }
  paginationContainer.style.display = 'flex';
  const makeBtn = (label, page, disabled = false, active = false) => {
    const btn = document.createElement('button');
    btn.className = `page-btn btn btn-sm ${active ? 'active' : ''}`;
    btn.textContent = label;
    if (disabled) btn.disabled = true;
    btn.addEventListener('click', () => {
      renderPage(page);
      setupPagination();
      // Scroll al tope del grid
      document.querySelector('main')?.scrollIntoView({ behavior: 'smooth' });
    });
    return btn;
  };

  paginationContainer.innerHTML = '';
  const prev = makeBtn('«', Math.max(1, currentPage - 1), currentPage === 1);
  paginationContainer.appendChild(prev);

  // Rango compacto: primeras, actuales +/-2, últimas
  const total = totalPages;
  const pages = new Set([1, 2, total - 1, total, currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2]
    .filter(p => p >= 1 && p <= total));
  const sorted = Array.from(pages).sort((a, b) => a - b);
  let prevNum = 0;
  sorted.forEach(p => {
    if (p - prevNum > 1) {
      const dots = document.createElement('span');
      dots.textContent = '…';
      dots.style.margin = '0 6px';
      paginationContainer.appendChild(dots);
    }
    paginationContainer.appendChild(makeBtn(String(p), p, false, p === currentPage));
    prevNum = p;
  });

  const next = makeBtn('»', Math.min(totalPages, currentPage + 1), currentPage === totalPages);
  paginationContainer.appendChild(next);

  /* Selector de tamaño de página opcional
  const sizeSelect = document.createElement('select');
  sizeSelect.className = 'form-select form-select-sm ms-2';
  ;[10, 20, 30, 40, 50].forEach(sz => {
    const opt = document.createElement('option');
    opt.value = String(sz);
    opt.textContent = `${sz}/página`;
    if (sz === pageSize) opt.selected = true;
    sizeSelect.appendChild(opt);
  });
  sizeSelect.addEventListener('change', () => {
    pageSize = parseInt(sizeSelect.value, 10);
    renderPage(1);
    setupPagination();
  });
  paginationContainer.appendChild(sizeSelect);*/
}

// Permitir navegación por hash manual (#page=3)
window.addEventListener('hashchange', () => {
  const m = (window.location.hash || '').match(/page=(\d+)/i);
  if (m) {
    const newPage = Math.max(1, parseInt(m[1], 15));
    if (newPage !== currentPage) {
      renderPage(newPage);
      setupPagination();
    }
  }
});
