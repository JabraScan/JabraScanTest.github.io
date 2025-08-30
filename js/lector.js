export function abrirLectorPDF() {
  fetch('lectorpdf.html')
    .then(r => r.text())
    .then(html => {
      document.querySelector('main').innerHTML = html;

      // Importar el módulo dinámicamente
      import('./lectorpdfmod.js')
        .then(modulo => {
          modulo.initLectorPDF(); // Llamar la función exportada
        })
        .catch(err => console.error('Error cargando lectorpdfmod.js:', err));
    })
    .catch(err => console.error('Error cargando lectorpdf.html:', err));
}
