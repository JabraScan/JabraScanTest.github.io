// ultimoscapitulos.js
import { flatten, sortDesc, sortAsc, cargarCapitulos } from './data.js';
import { activarLinksPDF } from './eventos.js';
import { parseDateDMY, parseFecha } from './utils.js';

export function initUltimosCapitulos() {
  const listEl = document.getElementById("book-card-caps");
  const emptyEl = document.getElementById("empty");
  const metaEl = document.getElementById("meta");
  const qEl = document.getElementById("q");

  // Estado interno que incluye el orden actual (descendente por defecto)
  const state = {
    items: [],
    filtered: [],
    orden: "desc"
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

  // Renderiza la lista de capítulos y la cabecera con botón de ordenación
  const render = () => {
    listEl.innerHTML = "";

    if (!state.filtered.length) {
      emptyEl.style.display = "block";
      metaEl.textContent = "0 elementos";
      return;
    }

    emptyEl.style.display = "none";

    const section = document.createElement("div");
    section.className = "book-section book-latest-chapters";

    // Determina el icono y texto según el orden actual
    const iconClass = state.orden === "asc"
      ? "fa-arrow-up-wide-short"
      : "fa-arrow-down-wide-short";

    const titleText = state.orden === "asc"
      ? "Orden ascendente"
      : "Orden descendente";

    // Cabecera con botón de ordenación por fecha
    section.innerHTML = `
      <div class="book-header">
        <span><i class="fa-solid fa-clock-rotate-left"></i> Últimos capítulos</span>
        <button id="toggle-order" class="order-toggle" title="${titleText}">
          <i class="fa-solid ${iconClass}"></i>
        </button>
      </div>
    `;

    const ul = document.createElement("ul");
    ul.classList.add("chapter-list","ultcap-chapter");

    // Genera cada capítulo como elemento de lista
    for (const item of state.filtered) {
      const li = document.createElement("li");
      li.innerHTML = `
        <a href="#" class="pdf-link ultcap-chapter"
           data-pdf-obra="${item._clave}"
           data-pdf-capitulo="${item.numCapitulo}">
          <span class="fecha">${formatDateEs(item._fecha)}</span> -
          <span class="obra ${item._clave}">${item._obra}</span> -
          <span class="cap">${item.numCapitulo}</span> ·
          <span class="titulo">${item.nombreCapitulo}</span>
        </a>
      `;
      ul.appendChild(li);
    }

    section.appendChild(ul);
    listEl.appendChild(section);

    // Activa los enlaces PDF
    activarLinksPDF();

    // Muestra resumen de capítulos y obras
    const totalObras = new Set(state.filtered.map(i => i._obra)).size;
    metaEl.textContent = `${state.filtered.length} capítulos · ${totalObras} obras`;

    // Añade funcionalidad al botón de ordenación
    const toggleBtn = document.getElementById("toggle-order");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        // Alterna entre orden ascendente y descendente
        state.orden = state.orden === "asc" ? "desc" : "asc";
        applyFilter(); // Aplica filtro y vuelve a renderizar
      });
    }
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

    render();
  };

  // Aplica filtro en tiempo real al escribir
  qEl.addEventListener("input", applyFilter);

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
            const fechaCap = cap._fecha; // Usa tu función personalizada
            if (!fechaCap || fechaCap > hoy) {
              //console.info(`⏳ Capítulo "${cap.nombreCapitulo}" de "${cap._obra}" aún no publicado (${cap._fecha})`);
              return false;
            }
            return true;
          });
      
          // Asigna los capítulos filtrados al estado
          state.items = publicados;
          applyFilter(); // Aplica filtro y orden inicial
        })
        .catch(err => {
          console.error("Error cargando capitulos.json:", err);
        });
}



