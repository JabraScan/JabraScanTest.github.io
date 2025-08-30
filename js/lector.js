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
      console.log('HTML insertado en <main>');

      // Verifica si el canvas ya está presente
      const canvas = document.getElementById("pdfCanvas");
      if (canvas) {
        console.log('Canvas detectado inmediatamente');
        cargarModuloLectorPDF();
        return;
      }

      // Observa el DOM hasta que aparezca el canvas
      const observer = new MutationObserver((mutations, obs) => {
        const canvasDetectado = document.getElementById("pdfCanvas");
        if (canvasDetectado) {
          console.log('Canvas detectado por observador');
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
        console.log('Módulo lectorpdfmod.js cargado correctamente');
        modulo.initLectorPDF();
      } else {
        console.warn('initLectorPDF no está definido en lectorpdfmod.js');
      }
    })
    .catch(err => console.error('Error al cargar lectorpdfmod.js:', err));
}


