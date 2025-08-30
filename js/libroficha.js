import { obtenerCapitulos } from './capitulos.js';
import { abrirLectorPDF } from './lector.js';
import { parseDateDMY, parseChapterNumber, compareCapNumDesc } from './utils.js';
import { activarLinksPDF, activarPaginacion } from './eventos.js';

export function cargarlibro(libroId) {
  if (!libroId) {
    document.body.innerHTML = '<p>No se encontró el libro seleccionado.</p>';
    return;
  }

  fetch('books.xml')
    .then(response => response.text())
    .then(str => new DOMParser().parseFromString(str, "text/xml"))
    .then(data => {
      const obra = Array.from(data.getElementsByTagName('obra'))
        .find(o => o.querySelector('clave')?.textContent.trim() === libroId);

      if (!obra) {
        document.body.innerHTML = '<p>Obra no encontrada.</p>';
        return;
      }

      const get = tag => obra.querySelector(tag)?.textContent.trim() || '';
      const clave = get("clave");
      const nombreobra = get("nombreobra");
      const autor = get("autor");
      const sinopsis = get("sinopsis");
      const imagen = get("imagen");
      const tipoobra = get("tipoobra");
      const Categoria = get("categoria");
      const estado = get("estado");
      const ubicacion = get("ubicacion");
      const traduccion = get("traductor");
      const contenido18 = get("adulto");
      const discord = get("discord");
      const aprobadaAutor = get("aprobadaAutor");
      const wiki = get("wiki");

      const OKAutor = aprobadaAutor === 'si' ? `
        <span class="carousel-info-label">Traducción aprobada por el autor</span><br>
        <span>Discord Oficial : <a href="${discord}" target="_blank">${discord}</a></span>
      ` : '';

      const imagenContenedor = document.createElement("div");
      imagenContenedor.classList.add("imagen-contenedor");
      const img = document.createElement("img");
      img.src = "../img/" + imagen;
      img.alt = nombreobra;
      imagenContenedor.appendChild(img);

      if (contenido18 === "adulto") {
        imagenContenedor.classList.add("adulto");
        const indicador = document.createElement("div");
        indicador.classList.add("indicador-adulto");
        indicador.textContent = "+18";
        imagenContenedor.appendChild(indicador);
      }

      const DataBook = document.querySelector('.book-card-caps');
      const headerDataBook = document.createElement("div");
      headerDataBook.className = "book-header";
      headerDataBook.innerHTML = `<i class="fa-solid fa-book"></i> ${nombreobra.toUpperCase()}`;

      const mainDataBook = document.createElement("div");
      mainDataBook.className = "book-main";
      mainDataBook.innerHTML = `
        <div class="book-image">
          <div class="book-genres"><span><i class="fa-solid fa-tags"></i>${Categoria}</span></div>
          <div class="book-links">
            <a href="#"><i class="fa-solid fa-book"></i> ${tipoobra}</a>
            <a href="#"><i class="fa-solid fa-globe"></i> ${ubicacion}</a>
            <a href="#"><i class="fa-solid fa-clock"></i> ${estado}</a>
          </div>
        </div>
        <div class="book-info-container">
          <div class="book-info">
            <h2 id="nombre-obra">${nombreobra}</h2>
            <div><b>Autor: </b> ${autor}</div>
            <div><b>Traducción: </b>${traduccion}</div>
            ${OKAutor}
          </div>
          <div class="book-synopsis">
            <b><i class="fa-solid fa-info-circle"></i> Sinopsis:</b>
            <p id="sinopsis-obra">${sinopsis}</p>
          </div>
          <div class="book_extras">
            <a class="book-wiki" href="${wiki}" target="_blank">Fans Wiki</a>
          </div>
        </div>
      `;

      DataBook.prepend(mainDataBook);
      DataBook.prepend(headerDataBook);
      mainDataBook.querySelector(".book-image").prepend(imagenContenedor);

      if (typeof mostrarDisqus === "function") {
        mostrarDisqus(clave, clave);
      }

      obtenerCapitulos(clave).then(listacapitulos => {
        const ultimosCapitulos = listacapitulos
          .map(c => ({
            ...c,
            fechaObj: parseDateDMY(c.Fecha),
            capNum: parseChapterNumber(c.numCapitulo)
          }))
          .filter(c => c.fechaObj)
          .sort((a, b) => {
            const diffFecha = b.fechaObj - a.fechaObj;
            if (diffFecha !== 0) return diffFecha;
            return compareCapNumDesc(a, b);
          })
          .slice(0, 6);

        const ultimosHTML = ultimosCapitulos.map(cap => `
          <li>
            <a href="#" data-pdf-obra="${clave}" data-pdf-capitulo="${cap.numCapitulo}" class="pdf-link">
              <span>${cap.numCapitulo}: ${cap.nombreCapitulo}</span>
              <span>(${cap.Fecha})</span>
            </a>
          </li>`).join('');

        const seccionUltimos = `
          <div class="book-section book-latest-chapters">
            <h3><i class="fa-solid fa-clock-rotate-left"></i> Últimos capítulos</h3>
            <ul class="chapter-list">${ultimosHTML}</ul>
          </div>
        `;

        const capitulosPorPagina = 10;
        const paginas = Math.ceil(listacapitulos.length / capitulosPorPagina);
        let paginacionHTML = '';

        for (let i = 0; i < paginas; i++) {
          const pagina = listacapitulos.slice(i * capitulosPorPagina, (i + 1) * capitulosPorPagina);
          const capitulosHTML = pagina.map(cap => `
            <li>
              <a href="#" data-pdf-obra="${clave}" data-pdf-capitulo="${cap.numCapitulo}" class="pdf-link">
                <span>${cap.numCapitulo} · ${cap.nombreCapitulo}</span>
                <span>(${cap.Fecha})</span>
              </a>
            </li>`).join('');

          paginacionHTML += `
            <div class="chapter-page" data-pagina="${i + 1}" style="display: ${i === 0 ? 'block' : 'none'};">
              <ul>${capitulosHTML}</ul>
            </div>
          `;
        }

        const seccionPaginada = `
          <div class="book-section book-chapters-list">
            <h3><i class="fa-solid fa-list-ol"></i> Todos los capítulos</h3>
            <div class="chapter-pagination chapter-columns">${paginacionHTML}</div>
            <div class="pagination-controls pagination">
              ${Array.from({ length: paginas }, (_, i) => `
                <button class="pagina-btn" data-pagina="${i + 1}">${i + 1}</button>
              `).join('')}
            </div>
          </div>
        `;

        const seccionesHTML = document.createElement("div");
        seccionesHTML.className = "book-extra-sections";
        seccionesHTML.innerHTML = seccionUltimos + seccionPaginada;
        DataBook.appendChild(seccionesHTML);

        activarLinksPDF();
        activarPaginacion();
      });
    });
}

