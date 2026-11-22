import { incrementarVisita } from './contadoresGoogle.js';

let deferredPrompt = null;

export function initPWA() {
  // 0. CONTAR APERTURAS DE LA PWA
  const isStandalone =
    ('standalone' in window.navigator && window.navigator.standalone) ||
    window.matchMedia('(display-mode: standalone)').matches;

  if (isStandalone) {
    incrementarVisita('pwa_1');
  }

  // Comprobar versión siempre (navegador y PWA)
  checkVersion();

  // 1. REGISTRO DEL SERVICE WORKER
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { updateViaCache: 'none' })
        .then((registration) => {
          registration.update();

          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (!installingWorker) return;

            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('Nueva versión disponible.');
              }
            };
          };
        })
        .catch((err) => console.log('Error al registrar el Service Worker:', err));
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });

    window.addEventListener('focus', () => {
      checkVersion();
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'CHECK_UPDATE' });
      }
    });
  }

  // 2. GESTIÓN DEL BOTÓN DE INSTALACIÓN (Android / PC)
  const installBtn = document.getElementById('btnInstalarPWA');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) {
      installBtn.style.display = 'inline-flex';
    }
  });

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        installBtn.style.display = 'none';
        deferredPrompt.prompt();

        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          incrementarVisita('obra_pwa');
        }
        deferredPrompt = null;
        return;
      }

      // 3. GUÍA ESPECÍFICA PARA iOS (Safari)
      const isIosDevice = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
      const isInStandaloneMode = ('standalone' in window.navigator) && window.navigator.standalone;

      if (isIosDevice && !isInStandaloneMode) {
        alert("Para instalar JabraScan en tu dispositivo iOS:\n\n1. Toca el botón de 'Compartir' en la barra de Safari.\n2. Desplaza y selecciona 'Añadir a la pantalla de inicio'.");
      }
    });
  }

  // 4. FORZAR VISIBILIDAD DEL BOTÓN EN iOS AL CARGAR
  const isIosDevice = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
  const isInStandaloneMode = ('standalone' in window.navigator) && window.navigator.standalone;

  if (isIosDevice && !isInStandaloneMode && installBtn) {
    installBtn.style.display = 'inline-flex';
  }
}

async function checkVersion() {
  try {
    const response = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    const currentVersion = localStorage.getItem('app_version');

    if (!currentVersion) {
      localStorage.setItem('app_version', data.version);
      return;
    }

    if (currentVersion !== data.version) {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
      localStorage.setItem('app_version', data.version);
      window.location.reload();
    }
  } catch (err) {
    console.error(err);
  }
}