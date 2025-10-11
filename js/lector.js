export function abrirLectorPDF() {
  fetch('lectorpdf.html')
    .then(r => r.text())
    .then(html => {
      const main = document.querySelector('main');
      if (!main) {
        console.error('Elemento <main> no encontrado en el DOM');
        return;
      }

      main.innerHTML = html;
      // Verifica si el canvas ya está presente
      const canvas = document.getElementById("pdfCanvas");
      if (canvas) {
        cargarModuloLectorPDF();
        return;
      }

      // Observa el DOM hasta que aparezca el canvas
      const observer = new MutationObserver((mutations, obs) => {
        const canvasDetectado = document.getElementById("pdfCanvas");
        if (canvasDetectado) {
          obs.disconnect();
          cargarModuloLectorPDF();
        }
      });

      observer.observe(main, { childList: true, subtree: true });
    })
    .catch(err => console.error('Error cargando lectorpdf.html:', err));
}

function cargarModuloLectorPDF() {
  import('./lectorpdfmod.js')
    .then(modulo => {
      if (typeof modulo.initLectorPDF === 'function') {
        modulo.initLectorPDF();
      } else {
        console.warn('initLectorPDF no está definido en lectorpdfmod.js');
      }
    })
    .catch(err => console.error('Error al cargar lectorpdfmod.js:', err));
}



