export function abrirLectorPDF() {
    fetch('lectorpdf.html')
      .then(r => r.text())
      .then(html => {
        const main = document.querySelector('main');
        main.innerHTML = html;
    console.log('abrirlector');
        // Espera a que el DOM esté realmente listo
        const observer = new MutationObserver(() => {
          if (document.getElementById("pdfCanvas")) {
            observer.disconnect();
            import('./lectorpdfmod.js')
              .then(modulo => modulo.initLectorPDF())
              .catch(err => console.error('Error al cargar lectorpdfmod.js:', err));
          }
        });
    
        observer.observe(main, { childList: true, subtree: true });
      })
      .catch(err => console.error('Error cargando lectorpdf.html:', err));
}


