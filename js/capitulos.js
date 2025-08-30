// capitulos.js
import { generarEtiquetaNuevo, parseFecha } from './utils.js';

export function obtenerCapitulos(clave) {
  return fetch('../capitulos.json')
    .then(response => response.json())
    .then(index => {
      const ruta = index[clave];
      if (!ruta) {
        console.error("Clave no encontrada en el índice.");
        return [];
      }

      return fetch(ruta)
        .then(res => {
          if (!res.ok) throw new Error(`❌ No se pudo cargar "${clave}" desde ${ruta}`);
          return res.json();
        })
        .then(dataObra => {
          const capitulos = dataObra[clave] || [];

          return capitulos.map(item => ({
            NombreArchivo: item.NombreArchivo,
            Fecha: item.Fecha,
            numCapitulo: item.numCapitulo,
            nombreCapitulo: item.nombreCapitulo
          }));
        });
    })
    .catch(error => {
      console.error("Error al cargar los capítulos:", error);
      return [];
    });
}

export function crearUltimoCapituloDeObra(data, claveObra) {
    const parseDateDMY = (s) => {
      const [dd, mm, yyyy] = s.split("-").map(Number);
      return new Date(yyyy, mm - 1, dd);
    };
  
    const parseChapterNumber = (n) => {
      const num = parseFloat(String(n).replace(/[^0-9.]/g, ""));
      return Number.isNaN(num) ? -Infinity : num;
    };
  
    const formatDateEs = (d) => {
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear();
      return `${dd}-${mm}-${yyyy}`;
    };
  
    const capitulos = data[claveObra];
    if (!Array.isArray(capitulos) || capitulos.length === 0) return null;
  
    const ordenados = capitulos.slice().sort((a, b) => {
      const fechaDiff = parseDateDMY(b.Fecha) - parseDateDMY(a.Fecha);
      if (fechaDiff !== 0) return fechaDiff;
      return parseChapterNumber(b.numCapitulo) - parseChapterNumber(a.numCapitulo);
    });
  
    const ultimo = ordenados[0];
    const fechaUltimo = parseDateDMY(ultimo.Fecha);
  
    const divsection = document.createElement("div");
    divsection.className = "book-latest-chapter";
    divsection.setAttribute('data-fecha', ultimo.Fecha);
    divsection.innerHTML = `
      <span>Último cap.</span>  
      <span class="cap">${ultimo.numCapitulo}</span>
      <span class="fecha">( ${formatDateEs(fechaUltimo)} )</span>
      ${generarEtiquetaNuevo(fechaUltimo)}
    `;
    return divsection;
}
