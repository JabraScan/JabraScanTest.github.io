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
      // Oculta el header global completo (no solo la navbar), dejamos solo la del lector
      const globalHeader = document.querySelector('header');
      if (globalHeader) {
        globalHeader.style.display = 'none';
      }
      // Añadimos clase de página de lector para estilos específicos
      document.body.classList.add('reader-page');
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
  // Cargar pdf.js dinámicamente antes de importar el módulo del lector
  const pdfUrl = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  const pdfWorker = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      // Si ya existe el script en el DOM, comprobamos si la librería global ya está definida.
      if (existing) {
        // Caso específico: comprobación rápida para pdf.js
        if (src.includes('pdf.min.js')) {
          if (window.pdfjsLib) return resolve();
          // Si el script existe pero no ha sido ejecutado (inserción vía innerHTML), creamos uno nuevo para forzar ejecución
          const s2 = document.createElement('script');
          s2.src = src;
          s2.onload = () => resolve();
          s2.onerror = () => reject(new Error('No se pudo cargar ' + src));
          document.head.appendChild(s2);
          return;
        }
        return resolve();
      }
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('No se pudo cargar ' + src));
      document.head.appendChild(s);
    });
  }

  loadScript(pdfUrl)
    .then(() => {
      try {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;
        }
      } catch (e) {
        console.warn('No se pudo configurar pdfjs worker:', e);
      }
      return import('./lectorpdfmod.js');
    })
    .then(modulo => {
      if (typeof modulo.initLectorPDF === 'function') {
        modulo.initLectorPDF();
      } else {
        console.warn('initLectorPDF no está definido en lectorpdfmod.js');
      }
    })
    .catch(err => console.error('Error al cargar lectorpdfmod.js o pdf.js:', err));
}



