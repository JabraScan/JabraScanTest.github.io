import { cargarlibro } from './libroficha.js';
import { crearUltimoCapituloDeObra, formatCDATA } from './capitulos.js';
import { parseFecha, toDDMMYYYY, seleccionarImagen, obtenerNombreObra, createImg } from './utils.js';
import { incrementarVisita, leerVisitas, obtenerInfo, valorarRecurso } from './contadoresGoogle.js';
import { setItem, getItem, removeItem } from "./storage.js";

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

// Detectar si estamos en localhost
function isLocalhost() {
  return window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1' || 
         window.location.hostname === '';
}
function esperarYMontarCarrusel(itemCarousel, imagenContenedor) {
  const intentar = () => {
    const container = document.querySelector(".custom-carousel-track");
    if (container) {
      itemCarousel.prepend(imagenContenedor);
      container.appendChild(itemCarousel);
    } else {
      // si aún no existe, vuelve a intentarlo SIN ABORTAR
      requestAnimationFrame(intentar);
    }
  };
  intentar();
}
// Cargar obras desde XML (método legacy para localhost)
function cargarObrasDesdeXML() {
  return fetch('obras.xml')
    .then(response => response.text())
    .then(str => new window.DOMParser().parseFromString(str, "text/xml"))
    .then(data => {
      const obras = data.querySelectorAll("obra");
      const obrasArr = [];
      
      obras.forEach(obra => {
        const visible = obra.querySelector("visible")?.textContent.trim().toLowerCase();
        if (visible !== "si") return;

        const { nombreobra, nombresAlternativos } = obtenerNombreObra(obra.querySelectorAll("nombreobra"));
        
        obrasArr.push({
          visible: visible,
          obra_id: obra.querySelector("clave").textContent.trim(),
          nombreobra: nombreobra,
          nombresAlternativos: nombresAlternativos,
          autor: obra.querySelector("autor").textContent.trim(),
          imagen: Array.from(obra.querySelectorAll("imagen")).map(img => img.textContent.trim()),
          estado: obra.querySelector("estado").textContent.trim(),
          categoria: obra.querySelector("categoria").textContent.trim(),
          traductor: obra.querySelector("traductor").textContent.trim(),
          adulto: obra.querySelector("adulto").textContent.trim(),
          discord: obra.querySelector("discord").textContent.trim(),
          aprobadaAutor: obra.querySelector("aprobadaAutor").textContent.trim(),
          sinopsis: obra.querySelector("sinopsis")?.textContent.trim() || "",
          server:  obra.querySelector("server")?.textContent.trim() || "",
          // Para localhost, necesitamos cargar capítulos después
          requiresChapterFetch: true
        });
      });
      
      return obrasArr;
    });
}

// Cargar obras desde endpoint (método para producción)
function cargarObrasDesdeEndpoint() {
  return fetch('https://jabrascan.net/obras/carrousel')
    .then(res => res.json());
}

document.addEventListener("DOMContentLoaded", function () {
  incrementarVisita("obra_Inicio");
  paginationContainer = document.getElementById('pagination');
  searchInput = document.getElementById('q-index');

  // Usar el método apropiado según el entorno
  const cargarObras = isLocalhost() ? cargarObrasDesdeXML() : cargarObrasDesdeEndpoint();
  
  cargarObras.then(obrasArr => {
    const carouselContainer = document.querySelector(".custom-carousel-track");
    const booklistContainer = document.querySelector(".book-list");
    const booklistContainernopc = document.querySelector(".lista-libros");
    const booklastread = document.querySelector(".main-ultimoCapituloleido");

    const promesasCapitulos = [];

    obrasArr.forEach((obj, index) => {
      if ((obj.visible || '').toLowerCase() !== 'si') return;

      const clave = obj.obra_id;
      const nombreobra = obj.nombreobra || '';
      const nombresAlternativos = Array.isArray(obj.nombresAlternativos)
        ? obj.nombresAlternativos
        : (obj.nombresAlternativos ? [obj.nombresAlternativos] : []);
      const autor = obj.autor || '';
      const imagenField = obj.imagen || [];
      const imagen = seleccionarImagen(obj.imagen || []); // pasar array o string tal cual a seleccionarImagen
      const estado = obj.estado || '';
      const Categoria = Array.isArray(obj.categoria) ? obj.categoria.join(', ') : (obj.categoria || '');
      const traduccion = formatCDATA(obj.traductor || '');
      const contenido18 = obj.adulto || '';
      const discord = obj.discord || '';
      const aprobadaAutor = obj.aprobadaAutor || '';
      const sinopsis = formatCDATA(obj.sinopsis || '');
      const server = obj.server || '';
      
      // Mantener la lógica original de mostrar último leído en el header
      const ultimaObra = getItem("ultimaObra");
      const ultimoCapitulo = getItem("ultimoCapitulo");
      if (booklastread) {
        if (
          ultimaObra &&
          ultimoCapitulo &&
          ultimaObra !== "null" &&
          ultimoCapitulo !== "null"
        ) {
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

      // --- Construcción del DOM (idéntica a la original) ---
      const categoriaIndiv = Categoria.split(",").map(item => item.trim());
      const categoriaObj = categoriaIndiv.map(item => `<span class="etiqueta">${item}</span>`).join('');

      const imagenContenedor = document.createElement("div");
      imagenContenedor.classList.add("imagen-contenedor");
      const img = createImg(imagen, nombreobra, 'main');
      // 🚀 bloque para optimizar el LCP de la primera imagen:
      if (index === 0) {
        img.loading = "eager";
        img.setAttribute("fetchpriority", "high");
      } else {
        img.loading = "lazy";
      }

      imagenContenedor.appendChild(img);
      if (contenido18 === "adulto") {
        imagenContenedor.classList.add("adulto");
        const indicador = document.createElement("div");
        indicador.classList.add("indicador-adulto");
        indicador.textContent = "+18";
        imagenContenedor.appendChild(indicador);
      }

      const hiddenNames = nombresAlternativos.length > 0
        ? `<div class="hidden-alt-names" style="display:none;">
             ${nombresAlternativos.map(n => `<span style="display:flex;">${n}</span>`).join("")}
           </div>`
        : "";

      const itemCarousel = document.createElement("div");
      itemCarousel.className = "custom-carousel-item";
      itemCarousel.innerHTML = `
          <div class="carousel-info-overlay">
            <div class="carousel-info-title">${nombreobra}</div>
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
      //itemCarousel.prepend(imagenContenedor);
      //carouselContainer.appendChild(itemCarousel);
      esperarYMontarCarrusel(itemCarousel, imagenContenedor);
      
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
          <strong>${nombreobra}</strong>
          Autor: <span>${autor}</span><br>
          Estado: <span class="${estado}">${estado}</span><br>
        </div>
      `;

      // --- Cargar capítulos según el entorno ---
      let promesaCapitulo;
      
      if (obj.requiresChapterFetch) {
        // Método localhost: cargar desde capitulos.json
        promesaCapitulo = fetch("capitulos.json")
          .then((res) => res.json())
          .then((index) => {
            const ruta = index[clave];
            return fetch(ruta)
              .then((res) => res.json())
              .then((data) => {
                const capitulos = data[clave] || [];
                const hoy = new Date();
                hoy.setHours(0, 0, 0, 0);

                const capitulosConObra = capitulos
                  .filter((cap) => {
                    const fechaCap = new Date(parseFecha(cap.Fecha));
                    return fechaCap <= hoy;
                  })
                  .map((cap) => ({ ...cap, obra: clave }));

                return { [clave]: capitulosConObra };
              });
          })
          .then((data) => {
            const bloque = crearUltimoCapituloDeObra(data, clave);
            if (bloque) {
              const bloqueB = bloque.cloneNode(true);
              const bloqueC = bloque.cloneNode(true);
              itemBook.querySelector(".card-body").appendChild(bloque);
              itemBookNOpc.querySelector(".info-libro").appendChild(bloqueB);
              const imagenContenedorB = itemBookNOpc.querySelector('.imagen-contenedor');
              if (imagenContenedorB) {
                const hoyTag = itemBookNOpc.querySelector('.tag-capitulo.hoy');
                if (hoyTag) {
                  imagenContenedorB.insertAdjacentElement('afterend', hoyTag);
                }
              }
              const carouselChapterBadge = itemCarousel.querySelector(".carousel-chapter-badge");
              if (carouselChapterBadge) {
                bloqueC.classList.add('carousel-chapter-badge-info');
                carouselChapterBadge.appendChild(bloqueC);
              }
              const hoyTag = itemBook.querySelector('.tag-capitulo.hoy');
              if (hoyTag) {
                itemBook.classList.add('hoy-book');
              }
            }
          })
          .catch((err) => console.error("❌ Error cargando capítulos:", err));
      } else {
        // Método producción: usar datos ya cargados del endpoint
        promesaCapitulo = new Promise((resolve) => {
          const caps = [];
          if (obj.UltimoCapNom || obj.UltimoCapFecha || obj.UltimoCapNum) {
            caps.push({
              nombreCapitulo: obj.UltimoCapNom || '',
              Fecha: toDDMMYYYY(obj.UltimoCapFecha || ''),
              numCapitulo: obj.UltimoCapNum || '',
              obra: clave
            });
          }
          resolve({ [clave]: caps });
        })
          .then((data) => {
            const bloque = crearUltimoCapituloDeObra(data, clave);
            if (bloque) {
              const bloqueB = bloque.cloneNode(true);
              const bloqueC = bloque.cloneNode(true);
              itemBook.querySelector(".card-body").appendChild(bloque);
              itemBookNOpc.querySelector(".info-libro").appendChild(bloqueB);
              const imagenContenedorB = itemBookNOpc.querySelector('.imagen-contenedor');
              if (imagenContenedorB) {
                const hoyTag = itemBookNOpc.querySelector('.tag-capitulo.hoy');
                if (hoyTag) {
                  imagenContenedorB.insertAdjacentElement('afterend', hoyTag);
                }
              }
              const carouselChapterBadge = itemCarousel.querySelector(".carousel-chapter-badge");
              if (carouselChapterBadge) {
                bloqueC.classList.add('carousel-chapter-badge-info');
                carouselChapterBadge.appendChild(bloqueC);
              }
              const hoyTag = itemBook.querySelector('.tag-capitulo.hoy');
              if (hoyTag) {
                itemBook.classList.add('hoy-book');
              }
            }
          })
          .catch((err) => console.error("❌ Error procesando último capítulo:", err));
      }

      promesasCapitulos.push(promesaCapitulo);

      // Clonado de imagen con srcset (igual que antes)
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
        badges.forEach(badge => {
          imgBadgeBlock.appendChild(badge);
        });
      }, 0);
      itemBookNOpc.prepend(imgBadgeBlock);

      allCardsDesktop.push(itemBook);
      allItemsMobile.push(itemBookNOpc);
    });

    return Promise.all(promesasCapitulos);
  })
  .then(() => {
    // El flujo posterior (ordenarColeccionPorFecha, renderPage, setupPagination, búsqueda) queda intacto
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
      // Función para búsqueda fuzzy (acepta coincidencias parciales)
      const fuzzyMatch = (text, query) => {
        // Primero intenta coincidencia exacta para mejor rendimiento
        if (text.includes(query)) return true;
        
        // Búsqueda fuzzy: cada carácter de la búsqueda debe aparecer en orden
        let queryIndex = 0;
        for (let i = 0; i < text.length && queryIndex < query.length; i++) {
          if (text[i] === query[queryIndex]) {
            queryIndex++;
          }
        }
        return queryIndex === query.length;
      };

      const doFilter = () => {
        const q = searchInput.value.trim().toLowerCase();
        if (!q) {
          filteredCardsDesktop = [...allCardsDesktop];
          filteredItemsMobile = [...allItemsMobile];
        } else {
          const match = (el) => {
            const title = el.querySelector('.card-title')?.textContent?.toLowerCase() || '';
            const autor = el.querySelector('.book-author-name')?.textContent?.toLowerCase() || '';
            const clave = el.querySelector('.clave')?.textContent?.toLowerCase() || '';
            return fuzzyMatch(title, q) || fuzzyMatch(autor, q) || fuzzyMatch(clave, q);
          };
          filteredCardsDesktop = allCardsDesktop.filter(match);
          const matchMobile = (el) => {
            const t = el.querySelector('strong')?.textContent?.toLowerCase() || '';
            const autor = el.querySelector('.info-libro span')?.textContent?.toLowerCase() || '';
            const clave = el.querySelector('.clave')?.textContent?.toLowerCase() || '';
            return fuzzyMatch(t, q) || fuzzyMatch(autor, q) || fuzzyMatch(clave, q);
          };
          filteredItemsMobile = allItemsMobile.filter(matchMobile);
        }
        renderPage(1);
        setupPagination();
      };
      searchInput.addEventListener('input', doFilter);
    }
  })
  .catch(err => console.error("Error cargando endpoint:", err));

//FIN fetch('obras.xml')
});
/*
export function onLibroClick(libroId) {
  setItem('libroSeleccionado', libroId);
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
}*/
export function onLibroClick(libroId) {
  setItem('libroSeleccionado', libroId);
  fetch('books/libro-ficha.html')
    .then(response => {
      if (!response.ok) {
        throw new Error('Error al cargar el archivo: ' + response.statusText);
      }
      return response.text();
    })
    .then(data => {
      const mainElement = document.querySelector('main');
      // 1) BORRAS EL DOM
      mainElement.innerHTML = data;
      // 2) *** ESPERAS A QUE EL NUEVO DOM SE MONTE ***
      requestAnimationFrame(() => {
        // 3) AHORA SÍ: EL DOM YA EXISTE
        cargarlibro(libroId);
      });
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
