export function abrirLectorPDF() {
  fetch('lectorpdf.html')
    .then(r => r.text())
    .then(html => {
      document.querySelector('main').innerHTML = html;

      if (typeof initlectorpdf === "function") {
        initlectorpdf();
      } else {
        const script = document.createElement('script');
        script.src = 'js/lectorpdf.js';
        script.onload = () => initlectorpdf();
        document.body.appendChild(script);
      }
    })
    .catch(err => console.error('Error cargando lectorpdf.html:', err));
}
