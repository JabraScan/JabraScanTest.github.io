import{obtenerCapitulos}from'./capitulos.js';import{parseDateDMY,parseChapterNumber,compareCapNumDesc,crearBloqueValoracion,seleccionarImagen,obtenerNombreObra,createImg}from'./utils.js';import{activarLinksPDF,activarPaginacion}from'./eventos.js';import{incrementarVisita,leerVisitas,obtenerInfo,valorarRecurso,consultarVotos}from'./contadoresGoogle.js';import{mostrarurl}from'./general.js';import{addToBiblio}from'./usuario.js';const BASE_URL="https://jabrascan.net/"
const IMAGE_BASE_URL="https://img.jabrascan.net/"
const BOOKS_BASE_URL="https://jabrascan.net/books/"
export function cargarlibro(libroId){if(!libroId){document.body.innerHTML='<p>No se encontró el libro seleccionado.</p>';return;}
fetch('obras.xml').then(response=>response.text()).then(str=>new DOMParser().parseFromString(str,"text/xml")).then(data=>{const obra=Array.from(data.getElementsByTagName('obra')).find(o=>o.querySelector('clave')?.textContent.trim()===libroId);if(!obra){window.location.href="https://jabrascan.github.io/";return;}
const get=tag=>obra.querySelector(tag)?.textContent.trim()||'';const clave=get("clave");const{nombreobra,nombresAlternativos}=obtenerNombreObra(obra.querySelectorAll("nombreobra"));const imagen=seleccionarImagen(obra.querySelectorAll("imagen"));const autor=get("autor");const idioma=get("idioma")||'es';const sinopsis=get("sinopsis");const tipoobra=get("tipoobra");const Categoria=get("categoria");const pClave=get("keywords");const metatxt=get("meta");const estado=get("estado");const ubicacion=get("ubicacion");const traduccion=get("traductor");const contenido18=get("adulto");const discord=get("discord");const aprobadaAutor=get("aprobadaAutor");const wikifan=get("wiki");const server=get('server');mostrarurl(clave);const OKAutor=aprobadaAutor==='si'?`
        <span class="carousel-info-label">Traducción aprobada por el autor</span><br>
        <span>Discord Oficial : <a href="${discord}" target="_blank">${discord}</a></span>
      `:'';const wiki=wikifan===''?'':`<a class="book-wiki" href="${wikifan}" target="_blank">Fans Wiki</a>`;const imagenContenedor=document.createElement("div");imagenContenedor.classList.add("imagen-contenedor");const img=createImg(imagen,nombreobra,'libroficha');imagenContenedor.appendChild(img);if(contenido18==="adulto"){imagenContenedor.classList.add("adulto");const indicador=document.createElement("div");indicador.classList.add("indicador-adulto");indicador.textContent="+18";imagenContenedor.appendChild(indicador);}
const propiedadesObra=[{obra_id:clave,propiedad:"nombreobra",valor:nombreobra},{obra_id:clave,propiedad:"nombresAlternativos",valor:nombresAlternativos},{obra_id:clave,propiedad:"imagen",valor:imagen},{obra_id:clave,propiedad:"idioma",valor:idioma},{obra_id:clave,propiedad:"autor",valor:autor},{obra_id:clave,propiedad:"sinopsis",valor:sinopsis},{obra_id:clave,propiedad:"tipoobra",valor:tipoobra},{obra_id:clave,propiedad:"categoria",valor:Categoria},{obra_id:clave,propiedad:"keywords",valor:pClave},{obra_id:clave,propiedad:"meta",valor:metatxt},{obra_id:clave,propiedad:"estado",valor:estado},{obra_id:clave,propiedad:"ubicacion",valor:ubicacion},{obra_id:clave,propiedad:"traductor",valor:traduccion},{obra_id:clave,propiedad:"adulto",valor:contenido18},{obra_id:clave,propiedad:"discord",valor:discord},{obra_id:clave,propiedad:"aprobadaAutor",valor:aprobadaAutor},{obra_id:clave,propiedad:"wiki",valor:wikifan},{obra_id:clave,propiedad:"server",valor:server}];const seotxt=textSEO(propiedadesObra);const DataBook=document.querySelector('.book-card-caps');const headerDataBook=document.createElement("div");headerDataBook.className="book-header";headerDataBook.innerHTML=`<nav class="breadcrumbs" aria-label="Migas de pan">
                                    <a href="/">📖 Inicio</a>
                                    <span>›</span>
                                    <span>${nombreobra}</span>
                                  </nav>`;const hiddenNames=seotxt+(nombresAlternativos.length>0?`<div class="hidden-alt-names" style="display:none;">
             ${nombresAlternativos.map(n => `<span style="display:flex;">${n}</span>`).join("")}
           </div>`:"");const mainDataBook=document.createElement("div");mainDataBook.className="book-main";mainDataBook.innerHTML=`
              <div class="book-image">
                <div class="book-genres"><span><i class="fa-solid fa-tags"></i>${Categoria}</span></div>
                <div class="book-links">
                  <a href="books/${clave}.html"><i class="fa-solid fa-house"></i> Ficha</a>
                  <a href="#"><i class="fa-solid fa-book" ></i> ${tipoobra}</a>
                  <a href="#"><i class="fa-solid fa-globe"></i> ${ubicacion}</a>
                  <a href="#"><i class="fa-solid fa-clock"></i> ${estado}</a>
                </div>
              </div>
              <div class="book-info-container">
                <div class="book-info">
                  <h2 id="obra_${nombreobra}" class="ficha-obra-nombre">${nombreobra}</h2>
                  ${hiddenNames}
                  <div class="ficha-obra-autor"><b>Autor: </b> ${autor}</div>
                  <div class="ficha-obra-traductor"><b>Traducción: </b>${traduccion}</div>
                  ${OKAutor}
                </div>
                <div class="book-synopsis">
                  <b><i class="fa-solid fa-info-circle"></i> Sinopsis:</b>
                  <p id="sinopsis-obra" class="ficha-obra-sinopsis">${sinopsis}</p>
                </div>
                <div class="book-extras">
                  ${wiki}
                </div>
                <div class="book-useraction">
                </div>
              </div>
            `;obtenerInfo(`obra_${clave}`).then(info=>{const visitCap=info.visitas===-1?0:info.numVisitasCapitulo;const visitObra=info.visitas===-1?1:info.visitas+1;const visitas=visitCap+visitObra;const numVisitas=document.createElement("a");numVisitas.innerHTML=`<a href="#"><i class="fa-solid fa-eye"></i> ${visitas} veces</a>`;const booklinks=mainDataBook.querySelector('.book-links');booklinks.appendChild(numVisitas);});consultarVotos(clave).then(({valoracion,votos})=>{const claveValoracion=`obra_${clave}`;const bloqueValoracion=crearBloqueValoracion(claveValoracion,valoracion,votos);mainDataBook.querySelector('.book-useraction').appendChild(bloqueValoracion);});const btnBiblioteca=addToLibrary(clave);mainDataBook.querySelector('.book-useraction').insertAdjacentElement('afterbegin',btnBiblioteca);DataBook.prepend(mainDataBook);DataBook.prepend(headerDataBook);mainDataBook.querySelector(".book-image").prepend(imagenContenedor);if(typeof mostrarDisqus==="function"){mostrarDisqus(clave,clave);}
obtenerCapitulos(clave).then(listacapitulos=>{const ultimosCapitulos=listacapitulos.map(c=>({...c,fechaObj:parseDateDMY(c.Fecha),capNum:parseChapterNumber(c.numCapitulo),server:"io-pdfs"})).filter(c=>c.fechaObj).sort((a,b)=>{const diffFecha=b.fechaObj-a.fechaObj;if(diffFecha!==0)return diffFecha;return compareCapNumDesc(a,b);}).slice(0,6);const ultimosHTML=ultimosCapitulos.map(cap=>`
          <li>
            <a href="#" data-pdf-obra="${clave}" data-pdf-capitulo="${cap.numCapitulo}" class="pdf-link">
              <span>${cap.numCapitulo}: ${cap.nombreCapitulo}</span>
              <span>(${cap.Fecha})</span>
            </a>
          </li>`).join('');const seccionUltimos=`
          <div class="book-section book-latest-chapters">
            <h3><i class="fa-solid fa-clock-rotate-left"></i> Últimos capítulos</h3>
            <ul class="chapter-list">${ultimosHTML}</ul>
          </div>
        `;renderCapitulos(listacapitulos,clave,seccionUltimos,"asc");incrementarVisita(`obra_${clave}`);});});}
function renderCapitulos(listacapitulos,clave,seccionUltimos,ordenActual="asc"){const DataBook=document.querySelector('.book-card-caps');const listaOrdenada=[...listacapitulos].sort((a,b)=>{const fechaA=parseDateDMY(a.Fecha);const fechaB=parseDateDMY(b.Fecha);return ordenActual==="asc"?fechaA-fechaB:fechaB-fechaA;});const capitulosPorPagina=50;const paginas=Math.ceil(listaOrdenada.length/capitulosPorPagina);let contenidoPaginas='';let rangos=[];for(let i=0;i<paginas;i++){const pagina=listaOrdenada.slice(i*capitulosPorPagina,(i+1)*capitulosPorPagina);const inicio=pagina[0]?.numCapitulo.padStart(4,'0')||'';const fin=pagina[pagina.length-1]?.numCapitulo.padStart(4,'0')||'';rangos.push(`C.${inicio} - C.${fin}`);const capitulosHTML=pagina.map(cap=>`
      <li>
        <a href="#" data-pdf-obra="${clave}" data-pdf-capitulo="${cap.numCapitulo}" class="pdf-link">
          <span>${cap.numCapitulo} · </span>
          <span>${cap.nombreCapitulo}</span>
          <!--<span>(${cap.Fecha})</span>-->
        </a>
      </li>`).join('');contenidoPaginas+=`
      <div class="chapter-page" data-pagina="${i + 1}" style="display: ${i === 0 ? 'block' : 'none'};">
        <ul>${capitulosHTML}</ul>
      </div>
    `;}
const headerHTML=`
    <div class="chapter-header" style="display: flex; justify-content: space-between; align-items: center;">
      <h3><i class="fa-solid fa-list-ol"></i> Todos los capítulos</h3>
      <button id="ordenar-btn" class="order-toggle" title="Cambiar orden">
        <i class="fa-solid ${ordenActual === "asc" ? "fa-arrow-up-wide-short" : "fa-arrow-down-wide-short"}"></i>
      </button>
    </div>
  `;const paginacionHTML=`
    <div class="pagination-controls">
      <button class="pagina-btn btn-first-pag" data-pagina="1">Primero</button>
      <button class="pagina-btn" data-prev="true">Previo</button>
      <span class="pagination-range">${rangos[0]}</span>
      <button class="pagina-btn" data-next="true">Siguiente</button>
      <button class="pagina-btn btn-last-pag" data-pagina="${paginas}">Último</button>
    </div>
  `;const seccionTodos=`
    <div class="book-section book-chapters-list">
      ${headerHTML}
      ${contenidoPaginas}
      ${paginacionHTML}
    </div>
  `;DataBook.insertAdjacentHTML("beforeend",seccionUltimos);DataBook.insertAdjacentHTML("beforeend",seccionTodos);activarLinksPDF();activarPaginacion(rangos);document.getElementById("ordenar-btn").addEventListener("click",()=>{document.querySelector('.book-chapters-list').remove();const nuevoOrden=ordenActual==="asc"?"desc":"asc";renderCapitulos(listacapitulos,clave,"",nuevoOrden);});}
function addToLibrary(clave){const btn=document.createElement('button');btn.type='button';btn.className='btn btn-primary btn-sm d-inline-flex align-items-center';btn.setAttribute('data-role','add-to-library');btn.setAttribute('aria-label','Añadir a la biblioteca');btn.title='Añadir a la biblioteca';btn.innerHTML=`
      <i class="fa-solid fa-plus" aria-hidden="true"></i>
      <span class="d-none d-sm-inline ms-2">Añadir a la biblioteca</span>
    `;btn.addEventListener('click',(e)=>{e.preventDefault();btn.classList.add('disabled');setTimeout(()=>btn.classList.remove('disabled'),700);addToBiblio(clave);});return btn;}
function textSEO(datos){const map=Object.fromEntries(datos.map(item=>[item.propiedad,item.valor]));const primeraImagen="${IMAGE_BASE_URL}"+(Array.isArray(map.imagen)?(map.imagen[0]||''):map.imagen);const urlIndexable=`${BOOKS_BASE_URL}${map.clave || ''}.html`;const urlAppHash=`${BASE_URL}#${map.clave || ''}`;const arraycategorias=Array.isArray(map.categoria)?map.categoria:String(map.categoria||'').split(',').map(x=>x.trim()).filter(Boolean);const arraykeywords=Array.isArray(map.keywords)?map.keywords:String(map.keywords||'').split(',').map(x=>x.trim()).filter(Boolean);const texttitle=`
            <meta charset="utf-8">
            <title>${map.nombreobra || ''} | Jabrascan</title>
            <meta name="description" content="${map.meta || ''}">
            <link rel="canonical" href="${urlIndexable}">
            <meta name="viewport" content="width=device-width, initial-scale=1">
    `;const opengraph=`
            <!-- Open Graph -->
            <meta property="og:type" content="book">
            <meta property="og:title" content="${map.nombreobra || ''}">
            <meta property="og:description" content="${map.meta || ''}">
            <meta property="og:image" content="${primeraImagen}">
            <meta property="og:url" content="${BOOKS_BASE_URL}${map.clave || ''}.html">
            <meta property="og:locale" content="es_ES"> 
    `;const twittercards=`
            <!-- Twitter Cards -->
            <meta name="twitter:card" content="summary_large_image">
            <meta name="twitter:title" content="${map.nombreobra || ''}">
            <meta name="twitter:description" content="${map.meta || ''}">
            <meta name="twitter:image" content="${primeraImagen}">
  `;const schema={"@context":"https://schema.org","@type":"Book","name":map.nombreobra||'',"description":map.sinopsis||'',"image":primeraImagen,"url":urlIndexable,"alternateName":map.nombresAlternativos||[],"inLanguage":map.idioma,"genre":arraycategorias,"keywords":arraykeywords,"publisher":{"@type":"Organization","name":"Jabrascan"},"potentialAction":{"@type":"ReadAction","target":urlAppHash}};if(map.autor?.trim()){schema.author={"@type":"Person","name":map.autor};}
if(map.traductor?.trim()){schema.translator={"@type":"Person","name":map.traductor};}
const jsonld=`<!-- Datos estructurados ld+json -->
                  <script type="application/ld+json">
                    ${JSON.stringify(schema, null, 2)}
                  </script>`;return jsonld;}