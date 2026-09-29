const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');

function parseObras(xmlText) {
  const parser = new XMLParser({ ignoreAttributes: false, trimValues: true });
  const doc = parser.parse(xmlText);

  const obras = Array.isArray(doc.obras?.obra)
    ? doc.obras.obra
    : [doc.obras?.obra || doc.obra].filter(Boolean);

  return obras.map(o => {
    // Comprovar si és visible (Filtre visibilitat)
    // const visible = String(o.visible || "").trim();
    // if (visible.toLowerCase() !== "si") return null;

    const clave = o.clave || "";
    if (!clave) return null;

    // Idioma i locale
    const idioma = String(o.idioma || "es").trim().toLowerCase();
    const langCode = idioma === "ca" ? "ca" : "es";
    const ogLocale = idioma === "ca" ? "ca_ES" : "es_ES";

    // Títols
    const titles = Array.isArray(o.nombreobra) ? o.nombreobra : [o.nombreobra].filter(Boolean);
    const titlePrincipal = titles[0] || "Obra sin título";

    const titlesAlternativos = titles.slice(1)
      .map(t => `<p>${t}</p>`)
      .join("\n");

    const titlesAlternativosJson = titles.slice(1)
      .map(t => `"${t}"`)
      .join(", ");

    const author = o.autor || "";
    
    // Netejar la sinopsi per a HTML i JSON
    const descriptionRaw = String(o.sinopsis || "");
    const description = descriptionRaw.replace(/[\n\r]+/g, ' ').replace(/"/g, '&quot;');
    const descriptionJson = descriptionRaw.replace(/[\n\r]+/g, ' ').replace(/"/g, '\\"');

    // Imatges i optimització -300w
    const imagenes = Array.isArray(o.imagen) ? o.imagen : (o.imagen ? [o.imagen] : []);
    
    let image = "";
    if (imagenes.length > 0) {
      const imgPath = imagenes[0];
      const lastDotIndex = imgPath.lastIndexOf('.');
      if (lastDotIndex !== -1) {
        image = `/img/${imgPath.substring(0, lastDotIndex)}-300w${imgPath.substring(lastDotIndex)}`;
      } else {
        image = `/img/${imgPath}`;
      }
    }

    const galeria = imagenes.map((imgPath, i) => {
      const lastDotIndex = imgPath.lastIndexOf('.');
      let imgOptimizada = imgPath;
      if (lastDotIndex !== -1) {
        imgOptimizada = `${imgPath.substring(0, lastDotIndex)}-300w${imgPath.substring(lastDotIndex)}`;
      }
      return `          <img src="/img/${imgOptimizada}" alt="${titlePrincipal} ilustración ${i+1}" loading="lazy" decoding="async" width="140" height="210">`;
    }).join("\n");

    // Categories i Keywords JSON
    const categoriaRaw = o.categoria || "";
    const listaKeywords = categoriaRaw.split(",").map(c => c.trim()).filter(Boolean);
    const keywordsJson = `[${listaKeywords.map(k => `"${k}"`).join(", ")}]`;

    // Data de creació normalitzada
    let fechaCreacion = o.fechaCreacion || "";
    try {
      let cleanDate = fechaCreacion.trim().replace(/-/g, '/');
      const parts = cleanDate.split('/');
      if (parts.length === 3) {
        cleanDate = `${String(parseInt(parts[0], 10)).padStart(2, '0')}/${String(parseInt(parts[1], 10)).padStart(2, '0')}/${parts[2]}`;
        const [d, m, y] = cleanDate.split('/');
        fechaCreacion = `${y}-${m}-${d}`;
      }
    } catch (e) {
      // Si falla, manté l'original
    }

    const aprobadaAutor = String(o.aprobadaAutor || o.aprobada || "").trim().toLowerCase() === "si";
    const discord = o.discord || "";
    const url = `https://jabrascan.net/books/${clave}.html`;
    const tipoobra = o.tipoobra || "";
    const ubicacion = o.ubicacion || "";
    const traductor = o.traductor || "Desconegut";
    const wikiUrl = o.wiki || "";
    const wiki = wikiUrl ? `<a href="${wikiUrl}" rel="noopener noreferrer">Wiki</a>` : "";
    const similaresHtml = "";

    return {
      clave,
      titlePrincipal,
      titlesAlternativos,
      titlesAlternativosJson,
      author,
      description,
      descriptionJson,
      image,
      galeria,
      url,
      aprobadaAutor,
      discord,
      tipoobra,
      categoria: categoriaRaw,
      keywordsJson,
      fechaCreacion,
      ubicacion,
      traductor,
      wiki,
      langCode,
      ogLocale,
      similaresHtml
    };
  }).filter(Boolean);
}

function renderTemplate(tpl, data) {
  // Diccionari d'etiquetes segons l'idioma
  const traduccions = {
    ca: {
      autor: "Autor:",
      genero: "Gènere:",
      categoria: "Categoria:",
      fecha: "Data de creació:",
      traductor: "Traductor:",
      otros_titulos: "Altres Títols:",
      sinopsis: "Sinopsi",
      galeria: "Galeria",
      leer_capitulos: "Llegir Capítols",
      recomendaciones: "Recomanacions"
    },
    es: {
      autor: "Autor:",
      genero: "Género:",
      categoria: "Categoría:",
      fecha: "Fecha de creación:",
      traductor: "Traductor:",
      otros_titulos: "Otros Títulos:",
      sinopsis: "Sinopsis",
      galeria: "Galería",
      leer_capitulos: "Leer Capítulos",
      recomendaciones: "Recomendaciones"
    }
  };

  const lbl = traduccions[data.langCode] || traduccions["es"];

  let html = tpl
    .replace(/{{titlePrincipal}}/g, data.titlePrincipal)
    .replace(/{{description}}/g, data.description || "")
    .replace(/{{descriptionJson}}/g, data.descriptionJson || "")
    .replace(/{{author}}/g, data.author || "")
    .replace(/{{image}}/g, data.image || "")
    .replace(/{{url}}/g, data.url)
    .replace(/{{clave}}/g, data.clave)
    .replace(/{{tipoobra}}/g, data.tipoobra || "")
    .replace(/{{categoria}}/g, data.categoria || "")
    .replace(/{{categoriaJson}}/g, data.keywordsJson || "[]")
    .replace(/{{fechaCreacion}}/g, data.fechaCreacion || "")
    .replace(/{{ubicacion}}/g, data.ubicacion || "")
    .replace(/{{traductor}}/g, data.traductor || "")
    .replace(/{{wiki}}/g, data.wiki || "")
    .replace(/{{titlesAlternativos}}/g, data.titlesAlternativos || "")
    .replace(/{{titlesAlternativosJson}}/g, data.titlesAlternativosJson || "")
    .replace(/{{galeria}}/g, data.galeria || "")
    .replace(/{{lang}}/g, data.langCode)
    .replace(/{{og_locale}}/g, data.ogLocale)
    .replace(/{{lbl_autor}}/g, lbl.autor)
    .replace(/{{lbl_genero}}/g, lbl.genero)
    .replace(/{{lbl_categoria}}/g, lbl.categoria)
    .replace(/{{lbl_fecha}}/g, lbl.fecha)
    .replace(/{{lbl_traductor}}/g, lbl.traductor)
    .replace(/{{lbl_otros_titulos}}/g, lbl.otros_titulos)
    .replace(/{{lbl_sinopsis}}/g, lbl.sinopsis)
    .replace(/{{lbl_galeria}}/g, lbl.galeria)
    .replace(/{{lbl_leer_capitulos}}/g, lbl.leer_capitulos)
    .replace(/{{lbl_similares}}/g, lbl.recomendaciones);

  // Bloc d'aprovació/discord
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
    
    // Només genera el fitxer HTML si NO existeix prèviament
    if (!fs.existsSync(filePath)) {
      const html = renderTemplate(tpl, obra);
      fs.writeFileSync(filePath, html, 'utf8');
      console.log(`Generat correctament (nou): ${obra.clave}.html`);
    } else {
      console.log(`Omissió (ja existeix): ${obra.clave}.html`);
    }
  });

  // Generar sitemap.xml (s'actualitza sempre amb totes les obres)
  const sitemap =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `  <url><loc>https://jabrascan.net/</loc></url>\n` +
    obras.map(o => `  <url><loc>${o.url}</loc></url>`).join('\n') +
    `\n</urlset>\n`;

  fs.writeFileSync('sitemap.xml', sitemap, 'utf8');
  console.log("\n¡Sitemap.xml actualitzat i procés finalitzat!");
}

main();