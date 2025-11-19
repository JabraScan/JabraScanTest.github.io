// IIFE para evitar variables globales y múltiples inicializaciones
(function () {
  let isInitialized = false;

  // Variables para los handlers
  let nextClickHandler;
  let prevClickHandler;
  let keydownHandler;
  let resizeHandler;
  let mouseEnterHandler;
  let mouseLeaveHandler;

  document.addEventListener("DOMContentLoaded", () => {
    // Prevenir múltiples inicializaciones
    if (isInitialized) return;
    isInitialized = true;

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

    // Definir handlers como funciones nombradas para poder removerlos
    nextClickHandler = () => {
      showItem(currentIndex + 1);
    };

    prevClickHandler = () => {
      showItem(currentIndex - 1);
    };

    keydownHandler = (e) => {
      if (e.key === 'ArrowRight') showItem(currentIndex + 1);
      if (e.key === 'ArrowLeft') showItem(currentIndex - 1);
    };

    resizeHandler = () => {
      showItem(currentIndex);
    };

    // Agregar event listeners
    nextBtn.addEventListener('click', nextClickHandler);
    prevBtn.addEventListener('click', prevClickHandler);
    document.addEventListener('keydown', keydownHandler);
    window.addEventListener('resize', resizeHandler);

    showItem(0);

    // 🚀 Desplazamiento automático
    let intervalId;
    const carouselContainer = document.querySelector('.custom-carousel');

    // Función para iniciar el intervalo automático
    function startAutoSlide() {
      // Limpiar intervalo anterior si existe
      if (intervalId) {
        clearInterval(intervalId);
      }

      intervalId = setInterval(() => {
        let items = Array.from(document.querySelectorAll('.custom-carousel-item'));
        if (items.length === 0) {
          console.warn("No hay elementos en el carrusel");
          clearInterval(intervalId);
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

    // Definir handlers para mouse
    mouseEnterHandler = stopAutoSlide;
    mouseLeaveHandler = startAutoSlide;

    // Pausar cuando el mouse está sobre el carrusel
    if (carouselContainer) {
      carouselContainer.addEventListener('mouseenter', mouseEnterHandler);
      carouselContainer.addEventListener('mouseleave', mouseLeaveHandler);
    }

    // Iniciar el desplazamiento automático
    startAutoSlide();
  });
})();
