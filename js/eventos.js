import { abrirLectorPDF } from './lector.js';
import { mostrarurl } from './general.js';

export function activarLinksPDF() {
  document.querySelectorAll('.pdf-link').forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();

      const clave = e.currentTarget.getAttribute("data-pdf-obra");
      const capitulo = e.currentTarget.getAttribute("data-pdf-capitulo");

      localStorage.setItem('ultimaObra', clave);
      localStorage.setItem('ultimoCapitulo', capitulo);
      localStorage.setItem("ultimaPagina", 1);

      mostrarurl(clave, capitulo);
      // Cargar dinámicamente lectorpdf.html
        fetch('lectorpdf.html')
          .then(r => r.text())
          .then(html => {
            const main = document.querySelector('main');
            main.innerHTML = html;
        
            // Cargar el módulo dinámicamente
            import('./lector.js')
              .then(modulo => modulo.abrirLectorPDF())
              .catch(err => console.error('Error al cargar lector.js:', err));
          });
    });
  });
}

/**
 * Activa la paginación de capítulos con botones de navegación y rango dinámico.
 * @param {Array} rangos - Lista de rangos por página, ej. ["C.0001 - C.0010", "C.0011 - C.0020", ...]
 */
/**
 * Activa la paginación de capítulos con navegación completa y rango dinámico.
 * Desactiva botones "Previo" y "Siguiente" en los extremos.
 * @param {Array} rangos - Lista de rangos por página, ej. ["C.0001 - C.0010", ...]
 */
export function activarPaginacion(rangos) {
  const botones = document.querySelectorAll('.pagina-btn');
  const paginas = document.querySelectorAll('.chapter-page');
  const rangoSpan = document.querySelector('.pagination-range');
  const btnPrev = document.querySelector('.pagina-btn[data-prev]');
  const btnNext = document.querySelector('.pagina-btn[data-next]');
  const btnFirst = document.querySelector('.btn-first-pag');
  const btnLast = document.querySelector('.btn-last-pag');
  let paginaActual = 1;
  const totalPaginas = paginas.length;

  const mostrarPagina = (nuevaPagina) => {
    if (nuevaPagina < 1 || nuevaPagina > totalPaginas) return;

    paginas.forEach(div => {
      div.style.display = div.getAttribute('data-pagina') === String(nuevaPagina) ? 'block' : 'none';
    });

    if (rangoSpan) {
      rangoSpan.textContent = rangos[nuevaPagina - 1] || '';
    }

    if (btnPrev) {
      btnPrev.disabled = nuevaPagina === 1;
      btnFirst.disabled = nuevaPagina === 1;
    }
    if (btnNext) {
      btnNext.disabled = nuevaPagina === totalPaginas;
      btnLast.disabled = nuevaPagina === totalPaginas;
    }      

    paginaActual = nuevaPagina;
  };

  botones.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.hasAttribute('data-prev')) {
        mostrarPagina(paginaActual - 1);
      } else if (btn.hasAttribute('data-next')) {
        mostrarPagina(paginaActual + 1);
      } else if (btn.hasAttribute('data-pagina')) {
        const nueva = parseInt(btn.getAttribute('data-pagina'));
        mostrarPagina(nueva);
      }
    });
  });

  mostrarPagina(1);
}


