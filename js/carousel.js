document.addEventListener("DOMContentLoaded", () => {
  const track = document.querySelector('.custom-carousel-track');
  const items = Array.from(document.querySelectorAll('.custom-carousel-item'));
  const prevBtn = document.querySelector('.custom-carousel-btn.prev');
  const nextBtn = document.querySelector('.custom-carousel-btn.next');

  let currentIndex = 0;

  function showItem(index) {
    let items = Array.from(document.querySelectorAll('.custom-carousel-item'));
    if (items.length === 0) {
      return;
    }
    if (index < 0) index = items.length - 1;
    if (index >= items.length) index = 0;
    currentIndex = index;
    const width = items[0].offsetWidth || track.parentElement.offsetWidth;
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

  // Recalcular al redimensionar para responsividad con Bootstrap
  window.addEventListener('resize', () => {
    showItem(currentIndex);
  });

  // 🚀 Desplazamiento automático
  // Inicializa el intervalo fuera del setInterval
  let intervalId;
  const carouselContainer = document.querySelector('.custom-carousel');
  
  // Función para iniciar el intervalo automático
  function startAutoSlide() {
    intervalId = setInterval(() => {
      let items = Array.from(document.querySelectorAll('.custom-carousel-item'));
      if (items.length === 0) {
        console.warn("No hay elementos en el carrusel");
        clearInterval(intervalId); // Detener el intervalo
        return;
      }
      const slideWidth = items[0].offsetWidth || track.parentElement.offsetWidth;
      const maxIndex = Math.max(0, track.children.length - Math.floor(track.parentElement.offsetWidth / slideWidth));
      currentIndex = (currentIndex < items.length) ? currentIndex + 1 : 0;
      showItem(currentIndex);
    }, 5000); // Cambia cada 5 segundos
  }
  
  // Función para detener el intervalo automático
  function stopAutoSlide() {
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }
  
  // Pausar cuando el mouse está sobre el carrusel
  if (carouselContainer) {
    carouselContainer.addEventListener('mouseenter', stopAutoSlide);
    carouselContainer.addEventListener('mouseleave', startAutoSlide);
  }
  
  // Iniciar el desplazamiento automático
  startAutoSlide();
});
