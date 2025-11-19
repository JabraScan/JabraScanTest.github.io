// data.js
import { parseDateDMY, parseChapterNumber } from './utils.js';

export function flatten(data) {
  const result = [];
  for (const clave in data) {
    for (const cap of data[clave]) {
      result.push({
        ...cap,
        _fecha: parseDateDMY(cap.Fecha),
        _num: parseChapterNumber(cap.numCapitulo),
        _obra: cap.tituloObra || clave,
        _clave: cap.clave || clave
      });
    }
  }
  return result;
}

// Ordena por fecha descendente
export function sortDesc(a, b) {
  const f = b._fecha - a._fecha;
  if (f !== 0) return f;
  if (b._num !== a._num) return b._num - a._num;
  return String(b._obra).localeCompare(String(a._obra), "es", { sensitivity: "base" });
}

// Ordena por fecha ascendente
export function sortAsc(a, b) {
  const fechaA = new Date(a._fecha);
  const fechaB = new Date(b._fecha);
  return fechaA - fechaB;
}

export async function cargarCapitulos() {
  const ficheroCaps = `capitulos.json?t=${Date.now()}`;
  const index = await fetch(ficheroCaps).then(res => res.json());
  const promesas = Object.entries(index).map(([clave, ruta]) =>
    fetch(ruta)
      .then(res => {
        if (!res.ok) throw new Error(`❌ No se pudo cargar "${clave}" desde ${ruta}`);
        return res.json();
      })
      .then(data => ({ [clave]: data[clave] || [] }))
      .catch(err => {
        console.warn(err.message);
        return { [clave]: [] };
      })
  );
  const resultados = await Promise.all(promesas);
  return Object.assign({}, ...resultados);
}
