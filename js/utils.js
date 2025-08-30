export function parseDateDMY(...) { ... }
export function parseChapterNumber(...) { ... }
export function compareCapNumDesc(...) { ... }

function parseDateDMY(fechaStr) {
  if (!fechaStr || typeof fechaStr !== "string") return null;
  const [d, m, y] = fechaStr.split("-").map(p => p.trim().padStart(2, "0"));
  const date = new Date(`${y}-${m}-${d}`);
  return date.getFullYear() == y && date.getMonth() + 1 == m && date.getDate() == d ? date : null;
}

function parseChapterNumber(numeroCapitulo) {
  return numeroCapitulo != null ? String(numeroCapitulo).trim() : "";
}

function compareCapNumDesc(a, b) {
  const sa = parseChapterNumber(a.capNum);
  const sb = parseChapterNumber(b.capNum);
  if (!sa && !sb) return 0;
  if (!sa) return 1;
  if (!sb) return -1;
  return sb.localeCompare(sa, undefined, { numeric: true, sensitivity: "base" });
}
