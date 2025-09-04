function mostrarDisqus(obraClave, capitulo) {
  const disqusDiv = document.getElementById('disqus_thread');
  disqusDiv.style.display = 'block';

  const idUnico = `${obraClave}_${capitulo}`;
  const urlUnica = `${window.location.origin}${window.location.pathname}#${idUnico}`;

  if (window.DISQUS) {
    DISQUS.reset({
      reload: true,
      config: function () {
        this.page.identifier = idUnico;
        this.page.url = urlUnica;
      }
    });
  } else {
    // Si Disqus aún no estaba inicializado, rellenamos variables para primera carga
    window.disqus_config = function () {
      this.page.identifier = idUnico;
      this.page.url = urlUnica;
    };
  }
}
function ocultarDisqus() {
  document.getElementById('disqus_thread').style.display = 'none';
}
