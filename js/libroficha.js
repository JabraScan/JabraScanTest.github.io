import { obtenerCapitulos } from './capitulos.js';
import { parseDateDMY, parseChapterNumber, compareCapNumDesc, crearBloqueValoracion } from './utils.js';
import { activarLinksPDF, activarPaginacion } from './eventos.js';
import { incrementarVisita, leerVisitas, obtenerInfo, valorarRecurso } from './contadoresGoogle.js';
import { mostrarurl } from './general.js';
/**
 * Carga los datos de una obra y renderiza sus capítulos.
 * @param {string} libroId - Clave identificadora de la obra.
 */
export function cargarlibro(libroId) {
  if (!libroId) {
    document.body.innerHTML = '<p>No se encontró el libro seleccionado.</p>';
    return;
  }
  fetch('obras.xml')
    .then(response => response.text())
    .then(str => new DOMParser().parseFromString(str, "text/xml"))
    .then(data => {
      const obra = Array.from(data.getElementsByTagName('obra'))
        .find(o => o.querySelector('clave')?.textContent.trim() === libroId);

      if (!obra) {
       /* document.body.innerHTML = `
          <div style="text-align: center; margin-top: 2rem;">
            <p>Obra no encontrada.</p>
            <a href="https://jabrascan.github.io/">Ir a la página inicial</a>
          </div>
        `;*/
        window.location.href = "https://jabrascan.github.io/";
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
      const wikifan = get("wiki");

      //actualizar url
      mostrarurl(clave);
      //generar contenido
      const OKAutor = aprobadaAutor === 'si' ? `
        <span class="carousel-info-label">Traducción aprobada por el autor</span><br>
        <span>Discord Oficial : <a href="${discord}" target="_blank">${discord}</a></span>
      ` : '';
      const wiki = wikifan === '' ? '' : `<a class="book-wiki" href="${wikifan}" target="_blank">Fans Wiki</a>`;

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
                  <a href="#"><i class="fa-solid fa-book" ></i> ${tipoobra}</a>
                  <a href="#"><i class="fa-solid fa-globe"></i> ${ubicacion}</a>
                  <a href="#"><i class="fa-solid fa-clock"></i> ${estado}</a>
                </div>
              </div>
              <div class="book-info-container">
                <div class="book-info">
                  <h2 id="nombre-obra" class="ficha-obra-nombre">${nombreobra}</h2>
                  <div class="ficha-obra-autor"><b>Autor: </b> ${autor}</div>
                  <div class="ficha-obra-traductor"><b>Traducción: </b>${traduccion}</div>
                  ${OKAutor}
                </div>
                <div class="book-synopsis">
                  <b><i class="fa-solid fa-info-circle"></i> Sinopsis:</b>
                  <p id="sinopsis-obra" class="ficha-obra-sinopsis">${sinopsis}</p>
                </div>
                <div class="book_extras">
                  ${wiki}
                </div>
              </div>
            `;
      
      /*leerVisitas(`obra_${clave}`).then(vis => {
          const visitas = vis === -1 ? 1 : vis+1;
            const numVisitas = document.createElement("a");
                  numVisitas.innerHTML = `<a href="#"><i class="fa-solid fa-eye"  ></i> ${visitas} veces</a>`;
                  const booklinks  = mainDataBook.querySelector('.book-links');
                    booklinks.appendChild(numVisitas);
        });*/
      //modulo valoracion y visitas
      obtenerInfo(`obra_${clave}`).then(info => {
        //console.log(info);
          const visitCap = info.visitas === -1 ? 0 : info.numVisitasCapitulo;
          const visitObra = info.visitas === -1 ? 1 : info.visitas + 1;
          const visitas = visitCap + visitObra;
          const numVisitas = document.createElement("a");
            numVisitas.innerHTML = `<a href="#"><i class="fa-solid fa-eye"  ></i> ${visitas} veces</a>`;
            const booklinks  = mainDataBook.querySelector('.book-links');
          booklinks.appendChild(numVisitas);
        
          const claveValoracion = `obra_${clave}`;
          //console.log(info);
            const bloqueValoracion = crearBloqueValoracion(claveValoracion, info.valoracion, info.votos);
          mainDataBook.querySelector(".book-info-container").appendChild(bloqueValoracion);
      });

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

        renderCapitulos(listacapitulos, clave, seccionUltimos, "asc");
        incrementarVisita(`obra_${clave}`);
      });
    });
}
/**
 * Renderiza todos los capítulos con ordenación por fecha y paginación.
 * @param {Array} listacapitulos - Lista completa de capítulos.
 * @param {string} clave - Clave de la obra.
 * @param {string} seccionUltimos - HTML de la sección de últimos capítulos.
 * @param {string} ordenActual - "asc" o "desc" para el orden de fechas.
 */
function renderCapitulos(listacapitulos, clave, seccionUltimos, ordenActual = "asc") {
  const DataBook = document.querySelector('.book-card-caps');

  const listaOrdenada = [...listacapitulos].sort((a, b) => {
    const fechaA = parseDateDMY(a.Fecha);
    const fechaB = parseDateDMY(b.Fecha);
    return ordenActual === "asc" ? fechaA - fechaB : fechaB - fechaA;
  });

  const capitulosPorPagina = 50;
  const paginas = Math.ceil(listaOrdenada.length / capitulosPorPagina);
  let contenidoPaginas = '';
  let rangos = [];

  for (let i = 0; i < paginas; i++) {
    const pagina = listaOrdenada.slice(i * capitulosPorPagina, (i + 1) * capitulosPorPagina);
    const inicio = pagina[0]?.numCapitulo.padStart(4, '0') || '';
    const fin = pagina[pagina.length - 1]?.numCapitulo.padStart(4, '0') || '';
    rangos.push(`C.${inicio} - C.${fin}`);

    const capitulosHTML = pagina.map(cap => `
      <li>
        <a href="#" data-pdf-obra="${clave}" data-pdf-capitulo="${cap.numCapitulo}" class="pdf-link">
          <span>${cap.numCapitulo} · </span>
          <span>${cap.nombreCapitulo}</span>
          <!--<span>(${cap.Fecha})</span>-->
        </a>
      </li>`).join('');

    contenidoPaginas += `
      <div class="chapter-page" data-pagina="${i + 1}" style="display: ${i === 0 ? 'block' : 'none'};">
        <ul>${capitulosHTML}</ul>
      </div>
    `;
  }

  /*const headerHTML = `
    <div class="chapter-header" style="display: flex; justify-content: space-between; align-items: center;">
      <h3><i class="fa-solid fa-list-ol"></i> Todos los capítulos</h3>
    </div>
  `;*/
  //Opcion botón ordenar, el problema es que lo hace un poco raro, por eso lo elimino
  const headerHTML = `
    <div class="chapter-header" style="display: flex; justify-content: space-between; align-items: center;">
      <h3><i class="fa-solid fa-list-ol"></i> Todos los capítulos</h3>
      <button id="ordenar-btn" class="order-toggle" title="Cambiar orden">
        <i class="fa-solid ${ordenActual === "asc" ? "fa-arrow-up-wide-short" : "fa-arrow-down-wide-short"}"></i>
      </button>
    </div>
  `;

  const paginacionHTML = `
    <div class="pagination-controls">
      <button class="pagina-btn btn-first-pag" data-pagina="1">Primero</button>
      <button class="pagina-btn" data-prev="true">Previo</button>
      <span class="pagination-range">${rangos[0]}</span>
      <button class="pagina-btn" data-next="true">Siguiente</button>
      <button class="pagina-btn btn-last-pag" data-pagina="${paginas}">Último</button>
    </div>
  `;

  const seccionTodos = `
    <div class="book-section book-chapters-list">
      ${headerHTML}
      ${contenidoPaginas}
      ${paginacionHTML}
    </div>
  `;

  DataBook.insertAdjacentHTML("beforeend", seccionUltimos);
  DataBook.insertAdjacentHTML("beforeend", seccionTodos);

  activarLinksPDF();
  activarPaginacion(rangos);

  document.getElementById("ordenar-btn").addEventListener("click", () => {
    document.querySelector('.book-chapters-list').remove();
    const nuevoOrden = ordenActual === "asc" ? "desc" : "asc";
    renderCapitulos(listacapitulos, clave, "", nuevoOrden);
  });
}

