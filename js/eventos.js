export function activarLinksPDF() { ... }
export function activarPaginacion() { ... }

function activarLinksPDF() {
  document.querySelectorAll('.pdf-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const clave = link.dataset.pdfObra;
      const capitulo = link.dataset.pdfCapitulo;
      localStorage.setItem('ultimaObra', clave);
      localStorage.setItem('ultimoCapitulo', capitulo);
      localStorage.setItem('ultimaPagina', 1);
      abrirLectorPDF();
    });
  });
}

function activarPaginacion() {
  document.querySelectorAll('.pagina-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const pagina = btn.dataset.pagina;
      document.querySelectorAll('.chapter-page').forEach(div => {
        div.style.display = div.dataset.pagina === pagina ? 'block' : 'none';
      });
    });
  });
}
