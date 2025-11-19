// scripts/xmlToJsonLd.js
const fs = require('fs');

function normalizarFecha(fecha) {
  if (!fecha) return "";
  const partes = fecha.split("/");
  if (partes.length === 3) {
    const [dia, mes, anio] = partes;
    return `${anio}-${mes.padStart(2, "0")}-${dia.padStart(2, "0")}`;
  }
  return fecha;
}

function addIfExists(obj, propName, node) {
  const value = node?.textContent?.trim();
  if (value) obj[propName] = value;
}

function parseXML(xmlText) {
  // Parser mínimo sin dependencias: extrae con regex por etiquetas conocidas
  const obras = [];
  const obraMatches = [...xmlText.matchAll(/<obra>([\s\S]*?)<\/obra>/g)];
  for (const m of obraMatches) {
    const block = m[1];
    const getTag = (tag) => block.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))?.[1]?.trim() || "";

    const nombres = [...block.matchAll(/<nombreobra>([\s\S]*?)<\/nombreobra>/g)]
      .map(x => x[1].trim()).filter(Boolean);

    const jsonObra = { "@type": "Book" };
    if (nombres.length) jsonObra.name = nombres;

    const autor = getTag("autor");
    if (autor) jsonObra.author = { "@type": "Person", "name": autor };

    const sinopsis = getTag("sinopsis");
    if (sinopsis) jsonObra.description = sinopsis;

    const clave = getTag("clave");
    if (clave) jsonObra.identifier = clave;

    const fechaCreacion = getTag("fechaCreacion");
    if (fechaCreacion) jsonObra.dateCreated = normalizarFecha(fechaCreacion);

    const categoria = getTag("categoria");
    const categorias = categoria.split(",").map(c => c.trim()).filter(Boolean);
    if (categorias.length) jsonObra.genre = categorias;

    obras.push(jsonObra);
  }

  return { "@context": "https://schema.org", "@graph": obras };
}

function insertJsonLdIntoHtml(html, jsonLdString) {
  const scriptTag = `<script type="application/ld+json">\n${jsonLdString}\n</script>`;
  // Si ya existe un bloque JSON-LD previo, lo reemplazamos; si no, lo insertamos antes de </head>
  const hasJsonLd = html.includes('type="application/ld+json"');
  if (hasJsonLd) {
    return html.replace(/<script[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/, scriptTag);
  }
  return html.replace(/<\/head>/i, `${scriptTag}</head>`);
}

function main() {
  const xml = fs.readFileSync('obras.xml', 'utf8');
  const jsonLd = parseXML(xml);
  const jsonLdString = JSON.stringify(jsonLd, null, 2);

  let html = fs.readFileSync('index.html', 'utf8');
  html = insertJsonLdIntoHtml(html, jsonLdString);
  fs.writeFileSync('index.html', html);
  console.log('JSON-LD insertado en index.html');
}

main();

