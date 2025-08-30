import { cargarlibro } from './libroficha.js';
import { crearUltimoCapituloDeObra } from './capitulos.js';
import { parseFecha } from './utils.js';

document.addEventListener("DOMContentLoaded", function () {
  fetch('obras.xml')
    .then(response => response.text())
    .then(str => new window.DOMParser().parseFromString(str, "text/xml"))
    .then(data => {
      const obras = data.querySelectorAll("obra");
      const carouselContainer = document.querySelector(".carousel-track");
      const booklistContainer = document.querySelector(".book-list");
      const booklistContainernopc = document.querySelector(".lista-libros");

      obras.forEach(obra => {
        const clave = obra.querySelector("clave").textContent.trim();
        const nombreobra = obra.querySelector("nombreobra").textContent.trim();
        const autor = obra.querySelector("autor").textContent.trim();
        const imagen = obra.querySelector("imagen").textContent.trim();
        const estado = obra.querySelector("estado").textContent.trim();
        const Categoria = obra.querySelector("categoria").textContent.trim();
        const traduccion = obra.querySelector("traductor").textContent.trim();
        const contenido18 = obra.querySelector("adulto").textContent.trim();
        const discord = obra.querySelector("discord").textContent.trim();
        const aprobadaAutor = obra.querySelector("aprobadaAutor").textContent.trim();

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

        const itemCarousel = document.createElement("div");
        itemCarousel.className = "carousel-item";
        itemCarousel.innerHTML = `
          <div class="carousel-info-overlay">
            <div class="carousel-info-title libro-item">${nombreobra}</div><br>
            <div class="carousel-info-row">
              <span class="carousel-info-label clave">${clave}</span>
              <span class="carousel-info-label">Autor:</span> <span>${autor}</span>
              <span class="carousel-info-label">Traducción:</span> <span>${traduccion}</span>
            </div>
            <div class="carousel-info-row">
              <span class="carousel-info-label">Estado:</span> <span class="${estado}">${estado}</span>
            </div>
            <div class="carousel-info-row-tags">${categoriaObj}</div><br>
            <div class="carousel-info-row">${OKAutor}</div>
          </div>
        `;
        itemCarousel.querySelector(".carousel-info-title").onclick = () => onLibroClick(clave);
        itemCarousel.prepend(imagenContenedor);
        carouselContainer.appendChild(itemCarousel);

        const itemBook = document.createElement("article");
        itemBook.classList.add("book-card-main", "libro-item");
        itemBook.onclick = () => onLibroClick(clave);
        itemBook.innerHTML = `
          <div class="book-info-main">
            <p class="clave">${clave}</p>
            <h3>${nombreobra}</h3>
            <div class="book-author-name"><strong class="book-author-title">Autor:</strong> ${autor}</div>
            <div class="book-estado ${estado}">${estado}</div>
          </div>
        `;

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

        fetch("capitulos.json")
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
          .catch((err) => console.error("Error cargando capítulos:", err));

        const imagenContenedorA = imagenContenedor.cloneNode(true);
        const imagenContenedorB = imagenContenedor.cloneNode(true);
        itemBook.prepend(imagenContenedorA);
        itemBookNOpc.prepend(imagenContenedorB);

        booklistContainer.appendChild(itemBook);
        booklistContainernopc.appendChild(itemBookNOpc);
      });
    })
    .catch(err => console.error("Error al cargar el XML:", err));

  ordenarLibrosPorFecha();
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

  function ordenarLibrosPorFecha() {
      const container = document.querySelector('.book-list');
      if (!container) return;
    
      const articles = Array.from(container.querySelectorAll('article.book-card-main.libro-item'));
    
      const getFecha = (article) => {
        const fechaStr = article.querySelector('.book-latest-chapter')?.getAttribute('data-fecha');
        if (!fechaStr || fechaStr.trim() === '') return null;
        return parseFecha(fechaStr);
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
