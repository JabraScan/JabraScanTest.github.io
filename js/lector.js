export function abrirLectorPDF() {
    fetch('lectorpdf.html')
      .then(r => r.text())
      .then(html => {
        const main = document.querySelector('main');
        main.innerHTML = html;
          console.log('HTML insertado:', main.innerHTML);
        // Espera a que el DOM esté realmente listo
        const observer = new MutationObserver(() => {
            console.log('Observando cambios...');
          if (document.getElementById("pdfCanvas")) {
            observer.disconnect();
              console.log('fin observacion');
            import('./lectorpdfmod.js')
              .then(modulo => {
                  console.log('Módulo lectorpdfmod.js cargado');
                  console.log('Canvas detectado, cargando lectorpdfmod.js...');
                  modulo.initLectorPDF()
              })
              .catch(err => console.error('Error al cargar lectorpdfmod.js:', err));
          }
        });   
        observer.observe(main, { childList: true, subtree: true });
      })
      .catch(err => console.error('Error cargando lectorpdf.html:', err));
}
