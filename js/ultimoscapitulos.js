// ultimoscapitulos.js
import { flatten, sortDesc, sortAsc, cargarCapitulos } from './data.js';
import { activarLinksPDF } from './eventos.js';
import { parseDateDMY, parseFecha } from './utils.js';

export function initUltimosCapitulos() {
  const listEl = document.getElementById("book-card-caps");
  const toggleViewBtn = document.getElementById("toggle-view");
  const emptyEl = document.getElementById("empty");
  const metaEl = document.getElementById("meta");
  const qEl = document.getElementById("q");
  const paginationEl = document.getElementById("pagination");
  const toggleOrderBtn = document.getElementById("toggle-order");

  // Estado interno que incluye el orden actual, paginación y filtros
  const state = {
    items: [],
    filtered: [],
    orden: "desc",
    currentPage: 1,
    pageSize: 15,
    vista: "cards" // "cards" o "lista"
  };

  // Formatea la fecha en formato DD-MM-YYYY
  const formatDateEs = (date) => {
    const d = typeof date === "string" ? parseDateDMY(date) : date;
    if (!d) return "";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

  // Renderiza la página actual de capítulos según la vista
  const renderPage = () => {
    listEl.innerHTML = "";

    if (!state.filtered.length) {
      emptyEl.style.display = "block";
      metaEl.textContent = "0 elementos";
      paginationEl.style.display = "none";
      return;
    }

    emptyEl.style.display = "none";

    // Calcula los elementos de la página actual
    const startIndex = (state.currentPage - 1) * state.pageSize;
    const endIndex = Math.min(startIndex + state.pageSize, state.filtered.length);
    const pageItems = state.filtered.slice(startIndex, endIndex);

    if (state.vista === "cards") {
      // Genera cada capítulo como una card de Bootstrap
      pageItems.forEach(item => {
        const colDiv = document.createElement("div");
        colDiv.className = "col";
        colDiv.innerHTML = `
          <article class="card h-100 chapter-card" data-clave="${item._clave}">
            <div class="card-body d-flex flex-column">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <h5 class="card-title h6 mb-0 flex-grow-1 me-2" style="line-height: 1.3; max-height: 2.6em; overflow: hidden;" title="${item._obra}">${item._obra}</h5>
                <span class="badge bg-warning text-dark" style="min-width: fit-content;">${item.numCapitulo}</span>
              </div>
              <p class="card-text small text-muted mb-2">
                <i class="fa-solid fa-calendar-days me-1"></i>
                ${formatDateEs(item._fecha)}
              </p>
              <p class="card-text flex-grow-1" style="font-size: 0.9rem; line-height: 1.4; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;" title="${item.nombreCapitulo}">
                ${item.nombreCapitulo}
              </p>
              <div class="mt-auto pt-2">
                <a href="#" class="btn btn-primary btn-sm pdf-link w-100"
                   data-pdf-obra="${item._clave}"
                   data-pdf-capitulo="${item.numCapitulo}">
                  <i class="fa-solid fa-book-open me-1"></i>Leer
                </a>
              </div>
            </div>
          </article>
        `;
        listEl.appendChild(colDiv);
      });
    } else {
      // Vista de lista
      const table = document.createElement("table");
      table.className = "table table-striped table-hover align-middle mb-0";
      table.innerHTML = `
        <thead>
          <tr>
            <th>Obra</th>
            <th>Capítulo</th>
            <th>Fecha</th>
            <th>Título</th>
            <th>Leer</th>
          </tr>
        </thead>
        <tbody></tbody>
      `;
      const tbody = table.querySelector("tbody");
      pageItems.forEach(item => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td title="${item._obra}">${item._obra}</td>
          <td><span class="badge bg-warning text-dark">${item.numCapitulo}</span></td>
          <td>${formatDateEs(item._fecha)}</td>
          <td title="${item.nombreCapitulo}">${item.nombreCapitulo}</td>
          <td>
            <a href="#" class="btn btn-primary btn-sm pdf-link"
               data-pdf-obra="${item._clave}"
               data-pdf-capitulo="${item.numCapitulo}">
              <i class="fa-solid fa-book-open me-1"></i>Leer
            </a>
          </td>
        `;
        tbody.appendChild(tr);
      });
      listEl.appendChild(table);
    }

    // Activa los enlaces PDF
    activarLinksPDF();

    // Actualiza la información de estado
    const totalObras = new Set(state.filtered.map(i => i._obra)).size;
    metaEl.textContent = `${state.filtered.length} capítulos · ${totalObras} obras`;

    // Actualiza el botón de ordenación
    updateOrderButton();

    // Renderiza la paginación
    renderPagination();
    // Actualiza el botón de vista
    updateViewButton();
  };

  // Actualiza el botón de vista
  const updateViewButton = () => {
    if (!toggleViewBtn) return;
    const iconClass = state.vista === "cards" ? "fa-list" : "fa-th-large";
    const titleText = state.vista === "cards"
      ? "Ver como lista"
      : "Ver como tarjetas";
    toggleViewBtn.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
    toggleViewBtn.title = titleText;
  };

  // Actualiza el botón de ordenación
  const updateOrderButton = () => {
    const iconClass = state.orden === "asc"
      ? "fa-arrow-up-wide-short"
      : "fa-arrow-down-wide-short";

    const titleText = state.orden === "asc"
      ? "Orden ascendente (más antiguos primero)"
      : "Orden descendente (más recientes primero)";

    toggleOrderBtn.innerHTML = `<i class="fa-solid ${iconClass}"></i>`;
    toggleOrderBtn.title = titleText;
  };

  // Renderiza los controles de paginación
  const renderPagination = () => {
    const totalPages = Math.ceil(state.filtered.length / state.pageSize);

    if (totalPages <= 1) {
      paginationEl.style.display = "none";
      return;
    }

    paginationEl.style.display = "flex";
    paginationEl.innerHTML = "";

    // Función para crear botones de paginación
    const createPageBtn = (label, page, disabled = false, active = false) => {
      const btn = document.createElement("button");
      btn.className = `btn btn-sm ${active ? 'btn-warning' : 'btn-outline-warning'}`;
      btn.textContent = label;
      btn.disabled = disabled;

      if (!disabled) {
        btn.addEventListener("click", () => {
          state.currentPage = page;
          renderPage();
          // Scroll suave al tope
          document.querySelector('main')?.scrollIntoView({ behavior: 'smooth' });
        });
      }

      return btn;
    };

    // Botón anterior
    const prevBtn = createPageBtn("«", state.currentPage - 1, state.currentPage === 1);
    paginationEl.appendChild(prevBtn);

    // Páginas visibles (lógica similar al index)
    const pages = new Set([
      1, 2, totalPages - 1, totalPages,
      state.currentPage - 2, state.currentPage - 1,
      state.currentPage, state.currentPage + 1, state.currentPage + 2
    ].filter(p => p >= 1 && p <= totalPages));

    const sortedPages = Array.from(pages).sort((a, b) => a - b);
    let prevPageNum = 0;

    sortedPages.forEach(p => {
      if (p - prevPageNum > 1) {
        const dots = document.createElement("span");
        dots.textContent = "…";
        dots.className = "mx-2 text-muted";
        paginationEl.appendChild(dots);
      }

      const pageBtn = createPageBtn(String(p), p, false, p === state.currentPage);
      paginationEl.appendChild(pageBtn);
      prevPageNum = p;
    });

    // Botón siguiente
    const nextBtn = createPageBtn("»", state.currentPage + 1, state.currentPage === totalPages);
    paginationEl.appendChild(nextBtn);
  };

  // Aplica filtro de búsqueda y ordenación por fecha
  const applyFilter = () => {
    const q = qEl.value.trim().toLowerCase();

    // Filtra los capítulos según el texto ingresado
    const base = !q
      ? [...state.items]
      : state.items.filter(it =>
        it._obra.toLowerCase().includes(q) ||
        it.nombreCapitulo.toLowerCase().includes(q) ||
        String(it.numCapitulo).includes(q)
      );

    // Ordena los capítulos según el estado actual
    state.filtered = state.orden === "asc"
      ? base.sort(sortAsc)
      : base.sort(sortDesc);

    // Resetea a la primera página cuando se aplica un filtro
    state.currentPage = 1;

    renderPage();
  };

  // Event listeners
  qEl.addEventListener("input", applyFilter);

  toggleOrderBtn.addEventListener("click", () => {
    state.orden = state.orden === "asc" ? "desc" : "asc";
    applyFilter();
  });

  toggleViewBtn.addEventListener("click", () => {
    state.vista = state.vista === "cards" ? "lista" : "cards";
    renderPage();
  });

  // Atajo de teclado para enfocar el campo de búsqueda
  window.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== qEl) {
      e.preventDefault();
      qEl.focus();
      qEl.select();
    }
  });

  // Carga los capítulos desde el archivo JSON
  /*cargarCapitulos()
    .then(data => {
      state.items = flatten(data); // Obtiene todos los capítulos
      applyFilter();               // Aplica filtro y orden inicial
    })
    .catch(err => {
      console.error("Error cargando capitulos.json:", err);
    });
    */
  // Carga los capítulos desde el archivo JSON
  cargarCapitulos()
    .then(data => {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0); // Normaliza la fecha actual

      // Filtra capítulos cuya fecha sea menor o igual a hoy
      const todos = flatten(data);
      const publicados = todos.filter(cap => {
        const fechaCap = cap._fecha;
        if (!fechaCap || fechaCap > hoy) {
          return false;
        }
        return true;
      });

      // Si no hay capítulos publicados (para demo), mostrar los más recientes
      const capitulosAMostrar = publicados.length > 0 ? publicados : todos.slice(0, 50);

      // Asigna los capítulos filtrados al estado
      state.items = capitulosAMostrar;
      applyFilter(); // Aplica filtro y orden inicial
    })
    .catch(err => {
      console.error("❌ Error cargando capitulos.json:", err);
    });
}



