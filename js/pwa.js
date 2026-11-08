const CACHE_NAME = 'mi-pwa-cache-v1.3';

import { incrementarVisita } from './contadoresGoogle.js';
// pwa.js
let deferredPrompt = null;

export function initPWA() {
  // 0. CONTAR APERTURAS DE LA PWA ---
  if (('standalone' in window.navigator && window.navigator.standalone) || window.matchMedia('(display-mode: standalone)').matches) {
    incrementarVisita('pwa_1');
    checkVersion();
  }
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then((registration) => {
        // Detectar si hay una nueva versión del Service Worker esperando
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('Nueva versión disponible. Actualizando...');
                window.location.reload();
              }
            }
          };
        };
      }).catch((err) => console.log('Error al registrar el Service Worker:', err));
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
          //console.log('El usuario aceptó instalar la PWA');
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

  // Añade esto al final de tu initPWA()
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      window.location.reload();
      refreshing = true;
    }
  });

  // Forzar revisión cuando la app vuelve a estar activa
  window.addEventListener('focus', () => {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CHECK_UPDATE' });
    }
  });
}

async function checkVersion() {
  try {
    const response = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
    const data = await response.json();
    const currentVersion = localStorage.getItem('app_version');

    if (!currentVersion) {
      localStorage.setItem('app_version', data.version);
      return;
    }

    if (currentVersion !== data.version) {

      // Limpia cualquier cache del navegador
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(
          keys.map(key => caches.delete(key))
        );
      }
      localStorage.setItem('app_version', data.version);
      window.location.reload(true);
    }
  } catch (err) {
    console.error(err);
  }
}