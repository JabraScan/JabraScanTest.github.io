import { abrirLectorPDF } from './lector.js';

export function activarLinksPDF() {
  document.querySelectorAll('.pdf-link').forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      const clave = e.currentTarget.getAttribute("data-pdf-obra");
      const capitulo = e.currentTarget.getAttribute("data-pdf-capitulo");

      localStorage.setItem('ultimaObra', clave);
      localStorage.setItem('ultimoCapitulo', capitulo);
      localStorage.setItem("ultimaPagina", 1);

      window.location.href = 'lectorpdf.html';
    });
  });
}

export function activarPaginacion() {
  const botones = document.querySelectorAll('.pagina-btn');
  botones.forEach(btn => {
    btn.addEventListener('click', () => {
      const pagina = btn.getAttribute('data-pagina');
      document.querySelectorAll('.chapter-page').forEach(div => {
        div.style.display = div.getAttribute('data-pagina') === pagina ? 'block' : 'none';
      });
    });
  });
}
