document.addEventListener("DOMContentLoaded", () => {
  const track = document.querySelector('.carousel-track');
  const items = Array.from(document.querySelectorAll('.carousel-item'));
  const prevBtn = document.querySelector('.carousel-btn.prev');
  const nextBtn = document.querySelector('.carousel-btn.next');

  let currentIndex = 0;

  function showItem(index) {
    let items = Array.from(document.querySelectorAll('.carousel-item'));
    if (items.length === 0) {
      return;
    }
    if (index < 0) index = items.length - 1;
    if (index >= items.length) index = 0;
    currentIndex = index;
    const width = items[0].offsetWidth;
    track.style.transform = `translateX(-${width * currentIndex}px)`;
  }

  nextBtn.addEventListener('click', () => {
    showItem(currentIndex + 1);
  });

  prevBtn.addEventListener('click', () => {
    showItem(currentIndex - 1);
  });

  // Opcional: cambiar con teclado
  document.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') showItem(currentIndex + 1);
    if (e.key === 'ArrowLeft') showItem(currentIndex - 1);
  });

  showItem(0);

  // 🚀 Desplazamiento automático
  // Inicializa el intervalo fuera del setInterval
  let intervalId;
  
  // Ejecuta el setInterval y guarda la referencia
  intervalId = setInterval(() => {
    let items = Array.from(document.querySelectorAll('.carousel-item'));
    if (items.length === 0) {
        console.warn("No hay elementos en el carrusel");
      clearInterval(intervalId); // Detener el intervalo
      return;
    }
    const slideWidth = items[0].offsetWidth;
    const maxIndex = track.children.length - Math.floor(track.parentElement.offsetWidth / slideWidth);
    currentIndex = (currentIndex < items.length) ? currentIndex + 1 : 0;
    showItem(currentIndex);
  }, 5000); // Cambia cada 3 segundos
});
