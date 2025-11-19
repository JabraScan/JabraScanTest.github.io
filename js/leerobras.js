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
// Reemplazar fetch('obras.xml') { ... } por esto:
  console.log('inicio descarga datos');
fetch('https://jabrascan.net/obras/carrousel')
  .then(res => {
    if (!res.ok) throw new Error('Error al obtener obras desde el endpoint');
    return res.json();
  })
  .then(obrasArray => {
    console.log('inicio datos endpoint');
    const carouselContainer = document.querySelector(".custom-carousel-track");
    const booklistContainer = document.querySelector(".book-list");
    const booklistContainernopc = document.querySelector(".lista-libros");
    const booklastread = document.querySelector(".main-ultimoCapituloleido");

    obrasArray.forEach(obraObj => {
      // Solo procesar visibles
      const visible = (obraObj.visible || '').trim().toLowerCase();
      if (visible !== 'si') return;

      const clave = (obraObj.obra_id || '').trim();
      const nombreobra = obraObj.nombreobra || '';
      const autor = obraObj.autor || '';
      const imagenArr = Array.isArray(obraObj.imagen) ? obraObj.imagen : (obraObj.imagen ? [obraObj.imagen] : []);
      // seleccionarImagen acepta NodeList en tu implem. anterior; ahora pasamos array y adaptamos
      const imagen = seleccionarImagen(imagenArr);
      const estado = obraObj.estado || '';
      const Categoria = Array.isArray(obraObj.categoria) ? obraObj.categoria.join(',') : (obraObj.categoria || '');
      const traduccion = obraObj.traductor || '';
      const contenido18 = (obraObj.adulto || '').trim();
      const discord = obraObj.discord || '';
      const aprobadaAutor = (obraObj.aprobadaAutor || '').trim();
      const sinopsis = obraObj.sinopsis || '';
      // Último capítulo ya viene en el endpoint
      const ultimoCapNum = obraObj.UltimoCapNum || null;
      const ultimoCapNom = obraObj.UltimoCapNom || null;
      const ultimoCapFecha = obraObj.UltimoCapFecha || null;

      // Mostrar último capítulo leído (igual que antes, no dependemos de búsquedas)
      if (booklastread) {
        const ultimaObra = localStorage.getItem("ultimaObra");
        const ultimoCapitulo = localStorage.getItem("ultimoCapitulo");
        if (ultimaObra && ultimoCapitulo && ultimaObra !== "null" && ultimoCapitulo !== "null") {
          booklastread.textContent = `${ultimaObra}-${ultimoCapitulo}`;
          booklastread.classList.remove('d-none');
        } else {
          booklastread.textContent = "";
          booklastread.classList.add('d-none');
        }
      }

      let OKAutor = '';
      if (aprobadaAutor === 'si') {
        OKAutor = `
          <span class="carousel-info-label">Traducción aprobada por el autor</span><br>
          <span>Discord Oficial : <a href="${discord}" target="_blank">${discord}</a></span>
        `;
      }

      const categoriaIndiv = Categoria.split(",").map(item => item.trim());
      const categoriaObj = categoriaIndiv.map(item => `<span class="etiqueta">${item}</span>`).join('');

      // Construcción de imagen — reutiliza tu lógica (imagen puede venir como "folder/file.webp" o solo nombre)
      const imagenContenedor = document.createElement("div");
      imagenContenedor.classList.add("imagen-contenedor");
      const img = document.createElement("img");
      const imagenPath = imagen.replace(/\.(jpg|jpeg|png|webp)$/i, '');
      img.src = `img/${imagen}`;
      img.alt = nombreobra;
      img.loading = "lazy";
      img.width = 280;
      img.height = 280;
      img.decoding = "async";
      if (imagen.includes('/')) {
        const webpPath = imagenPath;
        img.srcset = `img/${webpPath}-300w.webp 300w, img/${webpPath}-600w.webp 600w, img/${webpPath}-900w.webp 900w`;
        const dpr = window.devicePixelRatio || 1;
        if (dpr > 2) {
          img.sizes = "(max-width: 576px) 50vw, (max-width: 768px) 33vw, (max-width: 992px) 25vw, 20vw";
        } else {
          img.sizes = "(max-width: 576px) 100vw, (max-width: 768px) 50vw, (max-width: 992px) 33vw, (max-width: 1200px) 25vw, 20vw";
        }
      }
      img.onerror = function () {
        this.removeAttribute('srcset');
        this.src = `img/${imagen}`;
        this.onerror = function () { this.onerror = null; this.style.display = 'none'; };
      };
      imagenContenedor.appendChild(img);
      if (contenido18 === "adulto") {
        imagenContenedor.classList.add("adulto");
        const indicador = document.createElement("div");
        indicador.classList.add("indicador-adulto");
        indicador.textContent = "+18";
        imagenContenedor.appendChild(indicador);
      }

      // Nombres alternativos si existen
      const nombresAlternativos = Array.isArray(obraObj.nombresAlternativos) ? obraObj.nombresAlternativos : [];
      const hiddenNames = nombresAlternativos.length > 0
        ? `<div class="hidden-alt-names" style="display:none;">${nombresAlternativos.map(n => `<span style="display:flex;">${n}</span>`).join("")}</div>`
        : "";

      // Crear itemCarousel, itemBook y itemBookNOpc (reutilizando tu HTML)
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

      // itemBook (desktop)
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

      // itemBookNOpc (mobile)
      const itemBookNOpc = document.createElement("li");
      itemBookNOpc.classList.add("item-libro");
      itemBookNOpc.onclick = () => onLibroClick(clave);
      itemBookNOpc.innerHTML = `
        <div class="info-libro">
          <p class="clave">${clave}</p>
          <strong>${nombreobra}</strong>
          Autor: <span>${autor}</span><br>
          Estado: <span class="${estado}">${estado}</span><br>
        </div>
      `;

      // Si el endpoint trae información del "último capítulo", crear un badge simple y añadirlo
      if (ultimoCapNum || ultimoCapNom || ultimoCapFecha) {
        const badge = document.createElement('div');
        badge.className = 'tag-capitulo';
        badge.textContent = `${ultimoCapNum ? ultimoCapNum + ' • ' : ''}${ultimoCapNom || ''}`;
        // si la fecha es hoy, añade clase 'hoy'
        if (ultimoCapFecha) {
          const capDate = new Date(ultimoCapFecha);
          const hoy = new Date(); hoy.setHours(0,0,0,0);
          const fechaCap = new Date(capDate.getFullYear(), capDate.getMonth(), capDate.getDate());
          if (+fechaCap === +hoy) badge.classList.add('hoy');
        }
        // añadir al DOM (móvil y desktop)
        itemBook.querySelector('.card-body').appendChild(badge.cloneNode(true));
        itemBookNOpc.querySelector('.info-libro').appendChild(badge.cloneNode(true));
        // y al carrusel
        const carouselBadgeContainer = itemCarousel.querySelector('.carousel-chapter-badge');
        if (carouselBadgeContainer) {
          const c = badge.cloneNode(true);
          c.classList.add('carousel-chapter-badge-info');
          carouselBadgeContainer.appendChild(c);
        }
      }

      // clonar imagen para desktop/móvil (reutiliza tu función, o inline)
      const clonarImagenConSrcset = (contenedor) => {
        const clone = contenedor.cloneNode(true);
        const imgOriginal = contenedor.querySelector('img');
        const imgClone = clone.querySelector('img');
        if (imgOriginal && imgClone) {
          if (imgOriginal.srcset) imgClone.srcset = imgOriginal.srcset;
          if (imgOriginal.sizes) imgClone.sizes = imgOriginal.sizes;
        }
        return clone;
      };
      const imagenContenedorA = clonarImagenConSrcset(imagenContenedor);
      const imagenContenedorB = clonarImagenConSrcset(imagenContenedor);
      const cardImg = imagenContenedorA.querySelector('img');
      if (cardImg) {
        cardImg.classList.add('card-img-top');
        itemBook.querySelector('.card').prepend(imagenContenedorA);
      }

      const imgBadgeBlock = document.createElement('div');
      imgBadgeBlock.className = 'img-badge-block';
      imgBadgeBlock.appendChild(imagenContenedorB);
      setTimeout(() => {
        const badges = itemBookNOpc.querySelectorAll('.tag-capitulo');
        badges.forEach(badgeEl => {
          imgBadgeBlock.appendChild(badgeEl);
        });
      }, 0);
      itemBookNOpc.prepend(imgBadgeBlock);

      // Guardar para paginación
      allCardsDesktop.push(itemBook);
      allItemsMobile.push(itemBookNOpc);
    });

    // Al final: ordenar, inicializar filtrado y paginación (igual que antes)
    ordenarColeccionPorFecha(allCardsDesktop);
    ordenarColeccionPorFecha(allItemsMobile);
    filteredCardsDesktop = [...allCardsDesktop];
    filteredItemsMobile = [...allItemsMobile];

    const hash = window.location.hash || '';
    const m = hash.match(/page=(\d+)/i);
    if (m) currentPage = Math.max(1, parseInt(m[1], 10));

    renderPage(currentPage);
    setupPagination();

    if (searchInput) {
      // reutiliza tu listener de búsqueda exactamente como lo tenías
      searchInput.addEventListener('input', () => {
        const q = searchInput.value.trim().toLowerCase();
        if (!q) {
          filteredCardsDesktop = [...allCardsDesktop];
          filteredItemsMobile = [...allItemsMobile];
        } else {
          const match = (el) => {
            const title = el.querySelector('.card-title')?.textContent?.toLowerCase() || '';
            const autor = el.querySelector('.book-author-name')?.textContent?.toLowerCase() || '';
            const clave = el.querySelector('.clave')?.textContent?.toLowerCase() || '';
            return title.includes(q) || autor.includes(q) || clave.includes(q);
          };
          filteredCardsDesktop = allCardsDesktop.filter(match);
          const matchMobile = (el) => {
            const t = el.querySelector('strong')?.textContent?.toLowerCase() || '';
            const autor = el.querySelector('.info-libro span')?.textContent?.toLowerCase() || '';
            const clave = el.querySelector('.clave')?.textContent?.toLowerCase() || '';
            return t.includes(q) || autor.includes(q) || clave.includes(q);
          };
          filteredItemsMobile = allItemsMobile.filter(matchMobile);
        }
        renderPage(1);
        setupPagination();
      });
      console.log('fin datos endpoint');
    }
  })
  .catch(err => console.error("Error al cargar el endpoint de obras:", err));
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
/*
function ordenarLibrosPorFecha() {
  const container = document.querySelector('.book-list');
  if (!container) return;

  const articles = Array.from(container.querySelectorAll('article.book-card-main.libro-item'));

  const getFecha = (article) => {
    const fechaStr = article.querySelector('.book-latest-chapter')?.getAttribute('data-fecha');
    if (!fechaStr || !/^\d{2}-\d{2}-\d{4}$/.test(fechaStr)) return null;
    const [dia, mes, año] = fechaStr.split('-');
    return new Date(`${año}-${mes}-${dia}`);
  };

  articles.sort((a, b) => {
    const fechaA = getFecha(a);
    const fechaB = getFecha(b);

    if (!fechaA && !fechaB) return 0;
    if (!fechaA) return 1;
    if (!fechaB) return -1;

    return fechaB - fechaA;
  });

  container.innerHTML = '';
  articles.forEach(article => container.appendChild(article));
}
*/
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
    .forEach(node => {
      // Antes de agregar, mover todos los badges .tag-capitulo al bloque img-badge-block
      const imgBadgeBlock = node.querySelector('.img-badge-block');
      if (imgBadgeBlock) {
        const badges = node.querySelectorAll('.tag-capitulo');
        badges.forEach(badge => {
          imgBadgeBlock.appendChild(badge);
        });
      }
      booklistContainernopc.appendChild(node);
    });

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
