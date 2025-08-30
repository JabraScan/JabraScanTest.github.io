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

export function sortDesc(a, b) {
  const f = b._fecha - a._fecha;
  if (f !== 0) return f;
  if (b._num !== a._num) return b._num - a._num;
  return String(b._obra).localeCompare(String(a._obra), "es", { sensitivity: "base" });
}

export async function cargarCapitulos() {
  const index = await fetch("capitulos.json").then(res => res.json());
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
