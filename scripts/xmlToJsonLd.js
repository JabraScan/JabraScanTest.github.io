// scripts/xmlToJsonLd.js

const fs = require('fs');

function normalizarFecha(fecha) {
  if (!fecha) return "";

  const cleanDate = fecha.trim().replace(/-/g, "/");
  const partes = cleanDate.split("/");

  if (partes.length === 3) {
    const [dia, mes, anio] = partes;

    return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  }

  return fecha;
}

function parseXML(xmlText) {
  const obras = [];

  const obraMatches = [
    ...xmlText.matchAll(/<obra>([\s\S]*?)<\/obra>/g)
  ];

  for (const match of obraMatches) {
    const block = match[1];

    const getTag = (tag) =>
      block.match(
        new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`)
      )?.[1]?.trim() || "";

    const nombres = [
      ...block.matchAll(/<nombreobra>([\s\S]*?)<\/nombreobra>/g)
    ]
      .map(x => x[1].trim())
      .filter(Boolean);

    const tituloPrincipal = nombres[0] || "";
    const nombresAlternativos = nombres.slice(1);

    const autor = getTag("autor");
    const traductor = getTag("traductor");
    let sinopsis = getTag("sinopsis");
    // Netejar les etiquetes CDATA si existeixen
    if (sinopsis) {
      sinopsis = sinopsis
        .replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1')
        .trim();
    }
    const clave = getTag("clave");
    const idioma = getTag("idioma") || "es";
    const tipoobra = getTag("tipoobra");
    const fechaCreacion = getTag("fechaCreacion");

    const categorias = getTag("categoria")
      .split(",")
      .map(x => x.trim())
      .filter(Boolean);

    // Imagen principal
    let imagenUrl = "";

    const imagenMatch = block.match(
      /<imagen>([\s\S]*?)<\/imagen>/
    );

    if (imagenMatch) {
      const imagenOriginal = imagenMatch[1].trim();

      const punto = imagenOriginal.lastIndexOf(".");

      if (punto > 0) {
        const base = imagenOriginal.substring(0, punto);
        const ext = imagenOriginal.substring(punto);

        imagenUrl =
          `https://jabrascan.net/img/${base}-300w${ext}`;
      }
    }

    const jsonObra = {
      "@type": "Book",
      "name": tituloPrincipal
    };

    if (nombresAlternativos.length) {
      jsonObra.alternateName = nombresAlternativos;
    }

    if (autor) {
      jsonObra.author = {
        "@type": "Person",
        "name": autor
      };
    }

    if (traductor) {
      jsonObra.translator = {
        "@type": "Person",
        "name": traductor
      };
    }

    if (sinopsis) {
      jsonObra.description = sinopsis;
    }

    if (imagenUrl) {
      jsonObra.image = imagenUrl;
    }

    if (clave) {
      const url =
        `https://jabrascan.net/books/${clave}.html`;

      jsonObra["@id"] = `${url}#book`;
      jsonObra.identifier = clave;
      jsonObra.url = url;
    }
    
    jsonObra.inLanguage = idioma;

    if (tipoobra) {
      jsonObra.genre = [tipoobra];
    }

    if (categorias.length) {
      jsonObra.keywords = categorias;
    }

    if (fechaCreacion) {
      jsonObra.datePublished =
        normalizarFecha(fechaCreacion);
    }

    obras.push(jsonObra);
  }

  return {
    "@context": "https://schema.org",
    "@graph": obras
  };
}

function insertJsonLdIntoHtml(html, jsonLdString) {
  const scriptTag =
    `<script type="application/ld+json">\n${jsonLdString}\n</script>`;

  if (html.includes('type="application/ld+json"')) {
    return html.replace(
      /<script[^>]*type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/,
      scriptTag
    );
  }

  return html.replace(
    /<\/head>/i,
    `${scriptTag}</head>`
  );
}

function main() {
  const xml = fs.readFileSync(
    "obras.xml",
    "utf8"
  );

  const jsonLd = parseXML(xml);

  const jsonLdString = JSON.stringify(
    jsonLd,
    null,
    2
  );

  let html = fs.readFileSync(
    "index.html",
    "utf8"
  );

  html = insertJsonLdIntoHtml(
    html,
    jsonLdString
  );

  fs.writeFileSync(
    "index.html",
    html
  );

  console.log('JSON-LD insertado en index.html');
}

main();