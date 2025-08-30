// ultimoscapitulos.js
import { flatten, sortDesc, cargarCapitulos } from './data.js';
import { activarLinksPDF } from './eventos.js';
import { parseDateDMY } from './utils.js';

export function initUltimosCapitulos() {
  const listEl = document.getElementById("book-card-caps");
  const emptyEl = document.getElementById("empty");
  const metaEl = document.getElementById("meta");
  const qEl = document.getElementById("q");

  const state = {
    items: [],
    filtered: []
  };

  const formatDateEs = (date) => {
    const d = typeof date === "string" ? parseDateDMY(date) : date;
    if (!d) return "";
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  };

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
    section.innerHTML = `<h3><i class="fa-solid fa-clock-rotate-left"></i> Últimos capítulos</h3>`;

    const ul = document.createElement("ul");
    ul.className = "chapter-list";

    for (const item of state.filtered) {
      const li = document.createElement("li");
      li.innerHTML = `
        <a href="#" class="pdf-link"
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

    activarLinksPDF();

    const totalObras = new Set(state.filtered.map(i => i._obra)).size;
    metaEl.textContent = `${state.filtered.length} capítulos · ${totalObras} obras`;
  };

  const applyFilter = () => {
    const q = qEl.value.trim().toLowerCase();
    state.filtered = !q
      ? [...state.items]
      : state.items.filter(it =>
          it._obra.toLowerCase().includes(q) ||
          it.nombreCapitulo.toLowerCase().includes(q) ||
          String(it.numCapitulo).includes(q)
        );
    render();
  };

  qEl.addEventListener("input", applyFilter);

  window.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== qEl) {
      e.preventDefault();
      qEl.focus();
      qEl.select();
    }
  });

  cargarCapitulos()
    .then(data => {
      state.items = flatten(data).sort(sortDesc);
      state.filtered = [...state.items];
      render();
    })
    .catch(err => {
      console.error("Error cargando capitulos.json:", err);
    });
}
