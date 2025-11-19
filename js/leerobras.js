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
  fetch('obras.xml')
    .then(response => response.text())
    .then(str => new window.DOMParser().parseFromString(str, "text/xml"))
    .then(data => {
      const obras = data.querySelectorAll("obra");
      const carouselContainer = document.querySelector(".custom-carousel-track");
      const booklistContainer = document.querySelector(".book-list");
      const booklistContainernopc = document.querySelector(".lista-libros");
      const booklastread = document.querySelector(".main-ultimoCapituloleido");

      const promesasCapitulos = [];

      obras.forEach(obra => {
        const visible = obra.querySelector("visible")?.textContent.trim().toLowerCase();
        if (visible !== "si") return; // Salta al siguiente si no es visible

        const clave = obra.querySelector("clave").textContent.trim();
        //const nombreobra = obra.querySelector("nombreobra").textContent.trim();
        const { nombreobra, nombresAlternativos } = obtenerNombreObra(obra.querySelectorAll("nombreobra"));
        const autor = obra.querySelector("autor").textContent.trim();
        //const imagen = obra.querySelector("imagen").textContent.trim();
        // 🎨 Seleccionamos la imagen correcta según el mes
        const imagen = seleccionarImagen(obra.querySelectorAll("imagen"));
        const estado = obra.querySelector("estado").textContent.trim();
        const Categoria = obra.querySelector("categoria").textContent.trim();
        const traduccion = obra.querySelector("traductor").textContent.trim();
        const contenido18 = obra.querySelector("adulto").textContent.trim();
        const discord = obra.querySelector("discord").textContent.trim();
        const aprobadaAutor = obra.querySelector("aprobadaAutor").textContent.trim();
        const sinopsis = obra.querySelector("sinopsis")?.textContent.trim() || "";

        // Último capítulo leído (mostrar solo si hay datos válidos)
        const ultimaObra = localStorage.getItem("ultimaObra");
        const ultimoCapitulo = localStorage.getItem("ultimoCapitulo");
        if (booklastread) {
          if (
            ultimaObra &&
            ultimoCapitulo &&
            ultimaObra !== "null" &&
            ultimoCapitulo !== "null"
          ) {
            // Mostrar formato Obra-Capítulo
            booklastread.textContent = `${ultimaObra}-${ultimoCapitulo}`;
            booklastread.classList.remove('d-none');
          } else {
            // Vaciar para que :empty de CSS lo oculte y evitar "null-null"
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
            <strong>${nombreobra}</strong>
            Autor: <span>${autor}</span><br>
            Estado: <span class="${estado}">${estado}</span><br>
          </div>
        `;
        /*
                const promesaCapitulo = fetch("capitulos.json")
                  .then((res) => res.json())
                  .then((index) => {
                    const ruta = index[clave];
                    return fetch(ruta)
                      .then((res) => res.json())
                      .then((data) => {
                        const capitulos = data[clave] || [];
                        const capitulosConObra = capitulos.map((cap) => ({ ...cap, obra: clave }));
                        return { [clave]: capitulosConObra };
                      });
                  })
                  .then((data) => {
                    const bloque = crearUltimoCapituloDeObra(data, clave);
                    if (bloque) {
                      const bloqueB = bloque.cloneNode(true);
                      itemBook.querySelector(".book-info-main").appendChild(bloque);
                      itemBookNOpc.querySelector(".info-libro").appendChild(bloqueB);
        
                      const hoyTag = itemBook.querySelector('.tag-capitulo.hoy');
                      if (hoyTag) {
                        const bookInfoMain = hoyTag.closest('.book-card-main');
                        if (bookInfoMain) {
                          bookInfoMain.classList.add('hoy-book');
                        }
                      }
                    }
                  })
                  .catch((err) => console.error("Error cargando capítulos:", err));*/
        const promesaCapitulo = fetch("capitulos.json")
          .then((res) => res.json())
          .then((index) => {
            const ruta = index[clave];
            return fetch(ruta)
              .then((res) => res.json())
              .then((data) => {
                const capitulos = data[clave] || [];

                // 🗓️ Filtrar capítulos cuya fecha sea mayor que hoy
                const hoy = new Date();
                hoy.setHours(0, 0, 0, 0); // Elimina la hora para comparar solo la fecha

                const capitulosConObra = capitulos
                  .filter((cap, i) => {
                    const fechaCap = new Date(parseFecha(cap.Fecha));
                    if (fechaCap > hoy) {
                      //console.info(`⏳ Capítulo "${cap.nombreCapitulo}" programado para el futuro (${cap.Fecha}), se omite.`);
                      return false;
                    }
                    return true;
                  })
                  .map((cap) => ({ ...cap, obra: clave }));

                // ⚠️ Aviso si todos los capítulos fueron filtrados
                if (capitulosConObra.length === 0) {
                  console.warn(`⚠️ No hay capítulos disponibles en este momento.`);
                }

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
              // Si el bloque tiene el badge 'hoy', muévelo justo después de la imagen
              const imagenContenedorB = itemBookNOpc.querySelector('.imagen-contenedor');
              if (imagenContenedorB) {
                const hoyTag = itemBookNOpc.querySelector('.tag-capitulo.hoy');
                if (hoyTag) {
                  imagenContenedorB.insertAdjacentElement('afterend', hoyTag);
                }
              }

              // Agregar el último capítulo al carrusel
              const carouselChapterBadge = itemCarousel.querySelector(".carousel-chapter-badge");
              if (carouselChapterBadge) {
                bloqueC.classList.add('carousel-chapter-badge-info');
                carouselChapterBadge.appendChild(bloqueC);
              }

              const hoyTag = itemBook.querySelector('.tag-capitulo.hoy');
              if (hoyTag) {
                // Añadir clase al div.col que contiene la tarjeta
                itemBook.classList.add('hoy-book');
              }
            }
          })
          .catch((err) => console.error("❌ Error cargando capítulos:", err));
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

        // Crear bloque contenedor para imagen y badge
        const imgBadgeBlock = document.createElement('div');
        imgBadgeBlock.className = 'img-badge-block';
        imgBadgeBlock.appendChild(imagenContenedorB);
        // Mover todos los badges .tag-capitulo dentro del bloque debajo de la imagen
        setTimeout(() => {
          const badges = itemBookNOpc.querySelectorAll('.tag-capitulo');
          badges.forEach(badge => {
            imgBadgeBlock.appendChild(badge);
          });
        }, 0);
        itemBookNOpc.prepend(imgBadgeBlock);

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
