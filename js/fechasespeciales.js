document.addEventListener("DOMContentLoaded", () => {
  const hoy = new Date();
  const clave = `${hoy.getDate()}-${hoy.getMonth() + 1}`;

  // 🎉 Configuración de festividades en un diccionario por clave "dia-mes"
  const festividades = {
    "1-1":   { fondo: "./img_especial/new_year.webp",     favicon: "./img_especial/RexJabra_newyear.ico"     }, // 🎆 Año Nuevo
    "14-2":  { fondo: "./img_especial/valentin.webp",     favicon: "./img_especial/RexJabra_valentin.ico"    }, // ❤️ San Valentín
    "17-3":  { fondo: "./img_especial/san_patricio.webp", favicon: "./img_especial/RexJabra_Patrick.ico"     }, // 🍀 San Patricio
    "22-4":  { fondo: "./img_especial/diatierra.webp",    favicon: "./img_especial/RexJabra_tierra.ico"      }, // 🌍 Día de la Tierra
    "31-10": { fondo: "./img_especial/halloween.webp",    favicon: "./img_especial/RexJabra_Halloween.ico"   }, // 🎃 Halloween
    "25-12": { fondo: "./img_especial/navidad.webp",      favicon: "./img_especial/RexJabra_navidad.ico"     }, // 🎄 Navidad
    "31-12": { fondo: "./img_especial/nochevieja.webp",   favicon: "./img_especial/RexJabra_nochevieja.ico"  }  // 🍾 Nochevieja
  };

  const iconosFestivos = {
    "1-1":   ["🎆", "✨", "🎇"],
    "14-2":  ["❤️", "💖", "💕"],
    "17-3":  ["🍀", "🌿", "☘️"],
    "22-4":  ["🌍", "🌎", "🌏"],
    "31-10": ["🎃", "👻", "🦇"],
    "25-12": ["🎄", "❄️", "☃️"],
    "31-12": ["🍾", "🥂", "🎉"]
  };

  // 🔎 Solo si hoy es festivo se ejecuta el resto
  const fiesta = festividades[clave];
  if (!fiesta) return; // 🚪 Salida inmediata si no es festivo

  // 🌌 Cambiar fondo
  document.body.style.backgroundImage      = `url('${fiesta.fondo}')`;
  document.body.style.backgroundSize       = "cover";
  document.body.style.backgroundRepeat     = "no-repeat";
  document.body.style.backgroundAttachment = "fixed";

  // 🖼️ Cambiar favicon de la pestaña
  if (fiesta.favicon) {
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link     = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = fiesta.favicon;

    // Cambiar también el logo del navbar
    const logoImg = document.querySelector("a.navbar-brand img");
    if (logoImg) {
      logoImg.src = fiesta.favicon;
      logoImg.style.border = "none";
      logoImg.style.outline = "none";
      logoImg.style.background = "transparent";
    }
  }

  // 🎭 Animar iconos detrás del texto
  const brandText = document.querySelector("a.navbar-brand .brand-text");
  if (brandText && iconosFestivos[clave]) {
    const spanIconos = document.createElement("span");
      spanIconos.classList.add("brand-iconos");
    brandText.insertAdjacentElement("afterend", spanIconos);

    let i = 0;
    setInterval(() => {
      spanIconos.style.opacity = "0";
      setTimeout(() => {
        spanIconos.textContent = iconosFestivos[clave][i % iconosFestivos[clave].length];
        spanIconos.style.opacity = "1";
        i++;
      }, 300);
    }, 1200);
  }
});
