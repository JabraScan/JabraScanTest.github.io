import { parseDateDMY, parseChapterNumber, compareCapNumDesc } from './utils.js';

export async function obtenerCapitulos(clave) { ... }

async function obtenerCapitulos(clave) {
  try {
    const index = await fetch('capitulos.json').then(res => res.json());
    const ruta = index[clave];
    if (!ruta) throw new Error(`Clave "${clave}" no encontrada.`);

    const dataObra = await fetch(ruta).then(res => {
      if (!res.ok) throw new Error(`No se pudo cargar desde ${ruta}`);
      return res.json();
    });

    const capitulos = dataObra[clave] || [];

    return capitulos
      .map(({ NombreArchivo, Fecha, numCapitulo, nombreCapitulo }) => ({
        NombreArchivo,
        Fecha,
        numCapitulo,
        nombreCapitulo,
        fechaObj: parseDateDMY(Fecha),
        capNum: parseChapterNumber(numCapitulo)
      }))
      .sort((a, b) => {
        const diffFecha = b.fechaObj - a.fechaObj;
        if (diffFecha !== 0) return diffFecha;
        return compareCapNumDesc(a, b);
      });

  } catch (error) {
    console.error("Error al obtener capítulos:", error);
    return [];
  }
}
