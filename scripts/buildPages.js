const fs = require('fs');
const { XMLParser } = require('fast-xml-parser');

function parseObras(xmlText) {
  const parser = new XMLParser({ ignoreAttributes: false, trimValues: true });
  const doc = parser.parse(xmlText);

  // Recoge todas las <obra>
  const obras = Array.isArray(doc.obras?.obra)
    ? doc.obras.obra
    : [doc.obras?.obra || doc.obra].filter(Boolean);

  return obras.map(o => {
    const clave = o.clave || "sin-clave";

    // Si hay múltiples <nombreobra>, fast-xml-parser devuelve array
    const titles = Array.isArray(o.nombreobra) ? o.nombreobra : [o.nombreobra].filter(Boolean);
    const titlePrincipal = titles[0] || "Obra sin título";

    // MODIFICACIÓN: generar los alternativos como párrafos HTML
    const titlesAlternativos = titles.slice(1)
      .map(t => `<p>${t}</p>`)
      .join("\n");

    const author = o.autor || "";
    const description = o.sinopsis || "";

    // Imágenes: admite múltiples <imagen>
    const imagenes = Array.isArray(o.imagen) ? o.imagen : (o.imagen ? [o.imagen] : []);
    const normalizaRuta = img => String(img).startsWith('http') ? img : `/img/${img}`;
    const imagenesConRuta = imagenes.map(normalizaRuta);

    // Portada = primera imagen
    const image = imagenesConRuta[0] || "";

    // Galería = resto (sin primera)
    const galeria = imagenesConRuta.slice(1)
      .map(img => `<img src="${img}" alt="Imagen de ${titlePrincipal}" style="max-width:150px;">`)
      .join("\n");

    // Aprobación del autor → boolean
    const aprobadaAutor = String(o.aprobadaAutor || o.aprobada || "").trim().toLowerCase() === "si";
    const discord = o.discord || "";

    const url = `https://jabrascan.net/books/${clave}.html`;

    return {
      clave,
      titlePrincipal,
      titlesAlternativos, // ahora viene ya formateado en <p>
      author,
      description,
      image,
      galeria,
      url,
      aprobadaAutor,
      discord,
      tipoobra: o.tipoobra || "",
      categoria: o.categoria || "",
      fechaCreacion: o.fechaCreacion || "",
      ubicacion: o.ubicacion || "",
      traductor: o.traductor || "",
      wiki: o.wiki ? `<p><a href="${o.wiki}">Wiki</a></p>` : ""
    };
  });
}

function renderTemplate(tpl, data) {
  // Sustituye cada marcador {{...}} por el valor correspondiente
  let html = tpl
    .replace(/{{titlePrincipal}}/g, data.titlePrincipal)
    .replace(/{{description}}/g, data.description || "")
    .replace(/{{author}}/g, data.author || "")
    .replace(/{{image}}/g, data.image || "")
    .replace(/{{url}}/g, data.url)
    .replace(/{{clave}}/g, data.clave)
    .replace(/{{tipoobra}}/g, data.tipoobra || "")
    .replace(/{{categoria}}/g, data.categoria || "")
    .replace(/{{fechaCreacion}}/g, data.fechaCreacion || "")
    .replace(/{{ubicacion}}/g, data.ubicacion || "")
    .replace(/{{traductor}}/g, data.traductor || "")
    .replace(/{{wiki}}/g, data.wiki || "")
    .replace(/{{titlesAlternativos}}/g, data.titlesAlternativos || "")
    .replace(/{{galeria}}/g, data.galeria || "");

  // Bloque de aprobación/discord
  const extra = data.aprobadaAutor
    ? `<p><strong>Aprobado por el autor</strong></p>${data.discord ? `<p><a href="${data.discord}">Discord</a></p>` : ""}`
    : "";
  html = html.replace("{{aprobacion}}", extra);

  return html;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function main() {
  const tplPath = 'books/templateObra.html';
  if (!fs.existsSync(tplPath)) {
    console.error(`No se encontró la plantilla en ${tplPath}`);
    process.exit(1);
  }
  const tpl = fs.readFileSync(tplPath, 'utf8');

  const xmlPath = 'obras.xml';
  if (!fs.existsSync(xmlPath)) {
    console.error(`No se encontró el XML en ${xmlPath}`);
    process.exit(1);
  }
  const xml = fs.readFileSync(xmlPath, 'utf8');

  const obras = parseObras(xml);

  ensureDir('books');

  obras.forEach(obra => {
    const filePath = `books/${obra.clave}.html`;
    // Sobrescribe siempre (comentar if)
    // Solo html de obras que no existen (descomenta el if si quieres crear solo si no existe)
    if (!fs.existsSync(filePath)) {
      const html = renderTemplate(tpl, obra);
      fs.writeFileSync(filePath, html, 'utf8');
    }
  });

  // Generar sitemap.xml (siempre se actualiza)
  const sitemap =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `  <url><loc>https://jabrascan.net/</loc></url>\n` +
    obras.map(o => `  <url><loc>${o.url}</loc></url>`).join('\n') +
    `\n</urlset>\n`;

  fs.writeFileSync('sitemap.xml', sitemap, 'utf8');
}

main();
