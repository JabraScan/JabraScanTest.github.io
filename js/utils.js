export function parseDateDMY(fechaStr) {
  if (!fechaStr) return null;

  const parts = String(fechaStr).split("-");
  if (parts.length !== 3) return null;

  let [d, m, y] = parts.map(p => p.trim());
  d = d.padStart(2, "0");
  m = m.padStart(2, "0");

  if (!/^\d{2}$/.test(d) || !/^\d{2}$/.test(m) || !/^\d{4}$/.test(y)) return null;

  const date = new Date(Number(y), Number(m) - 1, Number(d));
  if (
    date.getFullYear() !== Number(y) ||
    date.getMonth() !== Number(m) - 1 ||
    date.getDate() !== Number(d)
  ) {
    return null;
  }

  return date;
}

export function parseChapterNumber(numeroCapitulo) {
  return numeroCapitulo != null ? String(numeroCapitulo).trim() : "";
}

export function compareCapNumDesc(a, b) {
  const sa = String(a.capNum ?? "").trim();
  const sb = String(b.capNum ?? "").trim();

  if (sa === "" && sb === "") return 0;
  if (sa === "") return 1;
  if (sb === "") return -1;

  const r = sb.localeCompare(sa, undefined, { numeric: true, sensitivity: "base" });
  if (r !== 0) return r;

  const na = Number(sa);
  const nb = Number(sb);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && nb !== na) return nb - na;

  return 0;
}

// utils.js
export function parseFecha(fechaStr) {
  if (!fechaStr || !/^\d{2}-\d{2}-\d{4}$/.test(fechaStr)) return null;
  const [dia, mes, año] = fechaStr.split('-').map(Number);
  const fecha = new Date(año, mes - 1, dia);
  if (
    fecha.getFullYear() !== año ||
    fecha.getMonth() !== mes - 1 ||
    fecha.getDate() !== dia
  ) {
    return null;
  }
  return fecha;
}

export function generarEtiquetaNuevo(fechaInput) {
  const hoy = new Date();
  const fecha = new Date(fechaInput);
  hoy.setHours(0, 0, 0, 0);
  fecha.setHours(0, 0, 0, 0);
  const diferenciaDias = Math.floor((hoy - fecha) / (1000 * 60 * 60 * 24));
  if (diferenciaDias === 0) {
    return `<span class="tag-capitulo hoy">hoy</span>`;
  } else if (diferenciaDias > 0 && diferenciaDias <= 7) {
    return `<span class="tag-capitulo nuevo">nuevo</span>`;
  } else {
    return '';
  }
}
