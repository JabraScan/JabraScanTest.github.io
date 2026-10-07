import { onLibroClick } from'./leerobras.js';
import { activarLinksPDF } from './eventos.js';
import { actualizarEstrellas, crearBloqueValoracion, createImg, managerTabs, imgSrcFromBlob } from './utils.js';
import { setItem, getItem, removeItem } from "./storage.js";
import { cargarTiendaDemo } from'./biblioteca.js';
// -------------------------
// /js/usuario.js
// Módulo responsable de cargar y renderizar datos del usuario.
// No contiene auto-ejecución: general.js debe importar y llamar initUsuario
// -------------------------

// -------------------------
// Config y constantes
// -------------------------
const API_BASE = "https://jabrascan.net";
const FALLBACK_IMG = "/img/avatar/default.webp";
const usuario_id = getItem("user_id");
const nickname = getItem("user_nickname");
const avatar = getItem("user_avatar");
const token = getItem("jwt");

// -------------------------
// Redirección si no hay login (no bloquea el resto del código)
// -------------------------
  function getHashPage() {
    return (location.hash || '').replace(/^#\/?/, '').split(/[?#]/, 1)[0].replace(/\/$/, '');
  }
  const protectedPages = new Set(['usuario', 'usuario.html', 'login', 'login.html']);
  const page = getHashPage();
  if (protectedPages.has(page) && !usuario_id) {
    window.location.replace('/');
  }
// -------------------------
// Helpers
// -------------------------
/**
 * ensureBootstrap()
 * Inserta CSS/JS de Bootstrap solo si no están presentes.
 */
(function ensureBootstrap() {
  const hasBootstrapCSS = Array.from(document.styleSheets)
    .some(s => s.href && s.href.includes("bootstrap"));
  if (!hasBootstrapCSS) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    //link.href = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css";
    link.href = "./css/bootstrap.min.css";
    document.head.appendChild(link);
  }

  const hasBootstrapJS = Array.from(document.scripts)
    .some(s => s.src && s.src.includes("bootstrap"));
  if (!hasBootstrapJS) {
    const script = document.createElement("script");
    //script.src = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js";
    script.src = "./js/bootstrap.bundle.min.js";
    document.body.appendChild(script);
  }
})();

/**
 * authFetch(input, init)
 * Wrapper de fetch que añade Authorization Bearer si existe token
 */
export function authFetch(input, init = {}) {
  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}

// -------------------------
// API Worker: funciones que consultan el backend
// -------------------------
  //CARGA PERFIL USUARIO
    // Llama al endpoint autenticado y devuelve los datos del perfil en JSON
    export async function fetchPerfil() {
      const url = `${API_BASE}/usuarios/get`;
      // authFetch debe añadir el header Authorization o el mecanismo de autenticación que uses
      const res = await authFetch(url);    
      // Lanzar error si la respuesta no es 2xx
      if (!res.ok) {
        const text = await res.text().catch(() => res.statusText);
        const err = new Error(`Error ${res.status}: ${text}`);
        err.status = res.status;
        throw err;
      }    
      // Devolver JSON parseado (se espera { nick, avatar, rol, ... } sin usuario_id)
      return res.json();
    }    
    // Actualiza el DOM con los datos del perfil
    export function renderPerfil(data, opts = {}) {
    /*  const usermain = document.getElementById("perfil-info");
        usermain.innerHTML = `
          <img id="avatar-img" src="${data.avatar || FALLBACK_IMG}" alt="avatar" class="rounded-circle me-3" style="width:80px;height:80px;">
          <div id="datos-user">
            <h3 id="nick">${data.nick || "(sin nick)"}</h3>
            <p class="text-muted">Puntos: <span id="user_puntos">${data.puntos}</span></p>
          </div>
        `;*/
      const usermain = document.getElementById("perfil-info");
        const img = document.createElement('img');
            img.id = 'avatar-img';
            imgSrcFromBlob( img, data.avatar, FALLBACK_IMG);
            img.alt = 'avatar';
            img.className = 'rounded-circle me-3';
            img.style.width = '80px';
            img.style.height = '80px';
        const datosUser = document.createElement('div');
            datosUser.id = 'datos-user';
            datosUser.innerHTML = `
                <div style="display:flex; align-items:center;">
                  <h3 id="nick"  style="margin:0; display:inline-block;">${data.nick || "(sin nick)"}</h3>
                  <i class="fa fa-pencil" id="edit-nick" style="cursor:pointer; font-size:0.8em; margin-left:8px;"></i>
                </div>
                <p class="text-muted">Puntos: <span id="user_puntos">${data.puntos}</span></p>
            `;
            //listener para editar el nick de usuario
            const editNick = datosUser.querySelector("#edit-nick");
              editNick.addEventListener("click", async () => {
                const nuevoNick = prompt("Introduce tu nuevo nick:");
                if (!nuevoNick) return;
                // Deshabilitar mientras dura la operación
                editNick.style.pointerEvents = "none";
                  editNick.style.opacity = "0.5";
                  try {
                    const data = await actualizarnick(nuevoNick);
                      if (data && data.ok) {
                        const nick = datosUser.querySelector("#nick");
                        nick.textContent = data.nick; // cambio al nuevo nick
                        nick.appendChild(editNick);   // mantenemos el icono
                      }
                  } finally {
                    // Rehabilitar siempre al terminar
                    editNick.style.pointerEvents = "auto";
                      editNick.style.opacity = "1";
                  }
              });

        usermain.appendChild(img);
        usermain.appendChild(datosUser);
    }
    // Orquestadora: usa fetchPerfil y renderPerfil (solo autenticado)
    // opts permite pasar selectors opcionales: { loadingSelector, errorSelector, nickSelector, avatarSelector }
    export async function cargarPerfil(opts = {}) {
      // Solo autenticado: si no hay token no intentamos nada
      if (!token) return undefined;    
      // Mostrar indicador de carga si se proporcionó selector
      let loadingEl;
      if (opts.loadingSelector) {
        loadingEl = document.getElementById(opts.loadingSelector);
        if (loadingEl) loadingEl.style.display = ""; // mostrar
      }
      let data = null;
      try {
        // Obtener datos del servidor
        data = await fetchPerfil();    
        // Renderizar en el DOM
        renderPerfil(data, opts);
      } catch (err) {
        // Manejo centralizado de errores
        console.error("No se pudo cargar perfil:", err);
        if (opts.errorSelector) {
          const errEl = document.getElementById(opts.errorSelector);
          if (errEl) errEl.textContent = "Error al cargar perfil";
        }
      } finally {
        // Ocultar indicador de carga si se usó
        if (loadingEl) loadingEl.style.display = "none";
      }
      return data;
    }
  //FIN CARGA PERFIL USUARIO
  // CONTROL DIVs VACIO
    function actualizarAviso(cont, ul, claseAviso, mensaje) {
      // busca si ya existe el div de aviso
      let aviso = cont.querySelector(`.${claseAviso}`);
      if (ul.children.length === 0) {
        if (!aviso) {
          aviso = document.createElement("div");
          aviso.className = `alert alert-info ${claseAviso}`;
          aviso.textContent = mensaje;
          cont.insertBefore(aviso, ul);
        }
        aviso.style.display = "";
      } else {
        if (aviso) aviso.style.display = "none";
      }
    }
  // FIN CONTROL DIVs VACIOS
  export async function cargarBiblioteca() {
    if (!token) {  return undefined;  }
  
    //const url = `${API_BASE}/biblioteca/list?usuario_id=${encodeURIComponent(usuario_id)}`;
    const url = `${API_BASE}/biblioteca/list`;
    let res;
      try {
        res = await authFetch(url);
      } catch (err) {
        return undefined; // no cortar: cumplir la promesa
      }
    if (!res || !res.ok) { return undefined; }
    
    const data = await res.json();
    
    const cont = document.getElementById("bibliotecaResultado");
    const contfinal = document.getElementById("bibliotecafin_Resultado");
    if (!cont || !contfinal) return undefined;
  
    const ul = document.createElement("ul");
      ul.className = "list-group";
    const ulfinal = document.createElement("ul");
      ulfinal.className = "list-group";
    
        (Array.isArray(data) ? data : []).forEach(item => {
          const li = document.createElement("li");
          li.className = "list-group-item d-flex gap-3 align-items-start";
          li.dataset.obraId = item.obra_id ?? "";
    //console.log(item);     
          // normalizar item.imagen y limpiar comillas, backslashes, prefijos img/ y slashes iniciales
          let srcCandidate = '/img/' + (
                              String(item.imagen ?? '')
                                .replace(/^"+|"+$/g, '')           // quitar comillas literales alrededor
                                .replace(/\\/g, '/')               // convertir backslashes a slash
                                .replace(/^\/+/, '')               // quitar slashes iniciales
                                .replace(/^img\/+/i, '')          // quitar prefijo img/ si existe
                                .replace(/\.webp(\?.*)?$/i, '-300w.webp$1')
                              ); 
          // construimos src de imagen sólo si viene o si FALLBACK_IMG está definido
          const imgSrc = srcCandidate || FALLBACK_IMG || "";
          li.innerHTML = `
            <img src="${imgSrc}" ${imgSrc ? `onerror="this.onerror=null;this.src='${FALLBACK_IMG}'"` : ''} 
                 alt="${item.nombreobra || ''}" class="img-thumbnail user-image" style="width:96px;height:128px;object-fit:cover;">
            <div class="flex-grow-1">
              <p class="clave d-none">${item.obra_id}</p>
              <div class="d-flex justify-content-between user-main">
                <h5 class="mb-1 biblio-obra libro-item" >${item.nombreobra || ''}</h5>
                <small class="text-muted">${item.estado ? `${item.estado}` : ''}</small>
              </div>
              <div class="d-flex justify-content-between user-lastChapter">
                <a href="#" data-pdf-obra="${item.obra_id}" data-pdf-capitulo="${item.numCapitulo ?? item.ultimoCapituloLeido ?? '-'}" class="pdf-link">
                  <span>${item.numCapitulo ?? item.ultimoCapituloLeido ?? '-'}: ${item.nombreCapitulo || '-'}</span>
                </a>
              </div>
              <div class="d-flex justify-content-between">
                <small class="text-muted user-progresion">${item.numCapitulo || '-'} / ${item.maxCapitulos || '-'} ( ${item.porcenLeido || '-'}% )</small>
              </div>
              <input type="hidden" class="d-none obra-id" value="${item.obra_id ?? ''}">
              
              <!-- Botones para móvil' -->
              <div class="biblioteca-acciones biblioteca-acciones-mobile d-flex d-sm-none mt-2">
                <button type="button" class="btn btn-sm btn-outline-danger delete-obra" data-obra-id="${item.obra_id ?? ''}" title="Quitar de la Biblioteca" aria-label="Quitar de la Biblioteca">
                  <i class="fa fa-trash" aria-hidden="true"></i>
                </button>
                <button type="button" class="btn btn-sm btn-outline-success marcar-finalizado" data-obra-id="${item.obra_id ?? ''}" title="${item.finalizado == 0 ? 'Marcar como finalizado' : 'Mover a Biblioteca'}" aria-label="${item.finalizado == 0 ? 'Marcar como finalizado' : 'Mover a Biblioteca'}">
                  <i class="fa fa-check" aria-hidden="true"></i>
                </button>
              </div>
          
              <input type="hidden" class="d-none obra-id" value="${item.obra_id ?? ''}">
            </div>
          
            <!-- Botones para pantallas >= sm: (vertical) -->
            <div class="biblioteca-acciones d-none d-sm-flex flex-column ms-auto align-self-stretch justify-content-center gap-2" role="group" aria-label="Acciones Biblioteca">
              <button type="button" class="btn btn-sm btn-outline-danger delete-obra" data-obra-id="${item.obra_id ?? ''}" title="Quitar de la Biblioteca" aria-label="Quitar de la Biblioteca">
                <i class="fa fa-trash" aria-hidden="true"></i>
              </button>
              <button type="button" class="btn btn-sm btn-outline-success marcar-finalizado" data-obra-id="${item.obra_id ?? ''}" title="${item.finalizado == 0 ? 'Marcar como finalizado' : 'Mover a Biblioteca'}" aria-label="${item.finalizado == 0 ? 'Marcar como finalizado' : 'Mover a Biblioteca'}">
                <i class="fa fa-check" aria-hidden="true"></i>
              </button>
            </div>
          `;
          //añadimos valoraciones para usuario
          const valoracion = crearBloqueValoracion(item.obra_id, item.valoracion, item.cantvalora, { soloEstrellas: true, actualizarVoto: true });
          li.querySelector('.user-progresion').insertAdjacentElement('afterend', valoracion);
          //boton borrar obra
          li.querySelectorAll('.delete-obra').forEach(btn => {
            btn.addEventListener('click', async (event) => {
              const button = event.currentTarget;
              button.disabled = true;
              try {
                const res = await addToBiblio(String(item.obra_id), { remove: true });
                if (res.ok) {
                  li.remove();
                  // actualizar avisos en ambos contenedores
                  actualizarAviso(cont, ul, "alerta-bvacia", "No tienes obras en la biblioteca");
                  actualizarAviso(contfinal, ulfinal, "alerta-bvaciafin", "No tienes obras finalizadas");
                } else {
                  console.error('Error eliminando obra:', res.error || res.status);
                }
              } catch (err) {
                console.error('Error en la petición:', err);
              } finally {
                button.disabled = false;
              }
            });
          });
          //boton marcar finalizado / mover a biblioteca
          li.querySelectorAll('.marcar-finalizado').forEach(btn => {
            btn.addEventListener('click', async (event) => {
              const button = event.currentTarget;
              button.disabled = true;
              try {
                const liEl = button.closest('li');
                const enPrincipal = !!liEl.closest('#bibliotecaResultado');
                const valorOppuesto = enPrincipal ? 1 : 0; // si está en bibliotecaResultado enviamos 1, si está en bibliotecafin_Resultado enviamos 0
                const res = await updateFinalizado(String(item.obra_id), valorOppuesto);
          
                // comprobar éxito de forma genérica
                const success = !!res && (res.ok || res.success || res === true);
                if (success) {
                  // mover el li al UL contrario
                  liEl.remove();
                  const destinoCont = document.getElementById(enPrincipal ? 'bibliotecafin_Resultado' : 'bibliotecaResultado');
                  const destinoUl = destinoCont && destinoCont.querySelector('ul.list-group');
                  if (destinoUl) destinoUl.appendChild(liEl);
          
                  // actualizar dataset y títulos de los botones dentro del li
                  liEl.dataset.finalizado = String(valorOppuesto);
                  const titleText = valorOppuesto == 1 ? 'Mover a la biblioteca' : 'Marcar como finalizado';
                  liEl.querySelectorAll('.marcar-finalizado').forEach(b => {
                    b.title = titleText;
                    b.setAttribute('aria-label', titleText);
                  });
                  // actualizar avisos en ambos contenedores
                  actualizarAviso(cont, ul, "alerta-bvacia", "No tienes obras en la biblioteca");
                  actualizarAviso(contfinal, ulfinal, "alerta-bvaciafin", "No tienes obras finalizadas");
                } else {
                  console.error('Error finalizando obra:', res);
                }
              } catch (err) {
                console.error('Error en la petición:', err);
              } finally {
                button.disabled = false;
              }
            });
          });
            
          //prueba para insertar imagen con diferentes tamaños
            //const imgSrc = srcCandidate || FALLBACK_IMG || "";
              //const newImg = createImg(imgSrc, item.obra_id, "BibliotecaUsuario");
              //newImg.className = "img-thumbnail";
            //li.prepend(newImg);  
          if (item.finalizado === 0 ) {
            ul.appendChild(li);
          } else {
            ulfinal.appendChild(li);
          }
        });
        // Biblioteca principal
          cont.innerHTML = "";
          if (ul.children.length === 0) {
            cont.innerHTML = "<div class='alert alert-info alerta-bvacia'>No tienes obras en la biblioteca</div>";
            cont.appendChild(ul);
          } else {
            cont.appendChild(ul);
                cont.addEventListener('click', (event) => {
                  const btn = event.target.closest('.biblio-obra');
                  if (!btn) return;
                  event.preventDefault();
                  // obtener obra_id preferiblemente desde el dataset del li
                  const liEl = btn.closest('li');
                  const obraId = liEl?.dataset.obraId ?? btn.dataset.obraId ?? null;
                  if (obraId) onLibroClick(obraId);
                });
          }
        // Biblioteca finalizados  
          contfinal.innerHTML = "";
          if (ulfinal.children.length === 0) {
              contfinal.innerHTML = "<div class='alert alert-info alerta-bvaciafin'>No tienes obras finalizadas</div>";
              contfinal.appendChild(ulfinal);
          } else {
              contfinal.appendChild(ulfinal);
                contfinal.addEventListener('click', (event) => {
                  const btn = event.target.closest('.biblio-obra');
                  if (!btn) return;
                  event.preventDefault();
                  // obtener obra_id preferiblemente desde el dataset del li
                  const liEl = btn.closest('li');
                  const obraId = liEl?.dataset.obraId ?? btn.dataset.obraId ?? null;
                  if (obraId) onLibroClick(obraId);
                });        
          }

    activarLinksPDF();
  }
///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  /**
   * Llama a POST ${API_BASE}/biblioteca/finalizado
   * Envía el campo finalizado tal cual (sin normalizar).
   * @param {string} obraId - obra_id (string)
   * @param {number|boolean|string} finalizado - 1|0|true|false o "1"|"0"
   * @returns {Promise<boolean>} - true si el endpoint devuelve ok/true, false en caso contrario
   */
  async function updateFinalizado(obraId, finalizado) {
    if (!usuario_id && !token) return;
    if (!obraId) return;
  
    const url = `${API_BASE}/biblioteca/finalizado`;
    let resp;
      try {
        resp = await authFetch(url, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ obra_id: obraId, finalizado })
                              });
      } catch (err) {
        return undefined; // no cortar: cumplir la promesa
      }
      if (!resp || !resp.ok) {  return undefined;  }
    
      const text = await resp.text().catch(() => "");
        if (!text) return false;
        try {
          const parsed = JSON.parse(text);
          if (typeof parsed === "boolean") return parsed;
          if (parsed && typeof parsed === "object" && typeof parsed.ok === "boolean") return parsed.ok;
        } catch {
          // no JSON
        }
    
        const t = text.trim().toLowerCase();
          if (t === "true") return true;
          if (t === "false") return false;
      return false;
  }

///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  /**
   * cargarObras
   *
   * Misma estructura y nivel de código que cargarBiblioteca.
   * - Usa authFetch(url) (igual que cargarBiblioteca).
   * - Renderiza en #obrasResultado usando innerHTML (mínimo código extra).
   */
  export async function cargarObras() {
    if (!usuario_id && !token) return undefined;
    
    const perfilUrl = token
      ? `${API_BASE}/obras/traductores`
      : `${API_BASE}/obras/traductores?user_id=${encodeURIComponent(usuario_id)}`;
    
    let perfilRes;
      try {
        perfilRes = await authFetch(perfilUrl);
      } catch (err) {
        console.error("cargarObras: authFetch lanzó excepción", err);
        return undefined; // no cortar: cumplir la promesa
      }
      // Comprobar la Response antes de parsear
      if (!perfilRes || !perfilRes.ok) {        return undefined;      }
      // Parsear
      const data = await perfilRes.json();
      // Si el servidor devuelve { ok: false }, cortar aquí
        if (data && typeof data === "object" && data.ok === false) {  return undefined;  }
      // Solo continuar si data es un array con elementos
        if (!data || (Array.isArray(data) && data.length === 0)) {  return undefined;  }
      // Perfil válido y con datos, mostrar
        // Selecciona todos los elementos con la clase "obras"
        document.querySelectorAll('.obras').forEach(el => {
          el.classList.remove('d-none');
        });

      const cont = document.getElementById("obrasResultado");
        if (!cont) return undefined;
    
    const ul = document.createElement("ul");
    ul.className = "list-group";
  
    (Array.isArray(data) ? data : []).forEach(item => {
      const li = document.createElement("li");
      li.className = "list-group-item d-flex gap-3 align-items-start";
      li.dataset.obraId = item.obra_id ?? "";
  
      // Normalizar imagen (misma lógica que en cargarBiblioteca)
      let srcCandidate = '/img/' + (
        String(item.imagen ?? '')
          .replace(/^"+|"+$/g, '')
          .replace(/\\/g, '/')
          .replace(/^\/+/, '')
          .replace(/^img\/+/i, '')
          .replace(/\.webp(\?.*)?$/i, '-300w.webp$1')
      );
      const imgSrc = srcCandidate || FALLBACK_IMG || "";
      li.innerHTML = `
        <img src="${imgSrc}" ${imgSrc ? `onerror="this.onerror=null;this.src='${FALLBACK_IMG}'"` : ''} 
             alt="${item.nombreobra || ''}" class="img-thumbnail obra-image" style="width:96px;height:128px;object-fit:cover;">
        <div class="flex-grow-1">
          <div class="d-flex justify-content-between obra-main">
            <h5 class="mb-1">${item.nombreobra || ''}</h5>
            <small class="text-muted">${item.estado ? `Estado: ${item.estado}` : ''}</small>
          </div>
          <div class="d-flex justify-content-between user-lastChapter">
            <a href="#" data-obra="${item.obra_id}" class="obra-link">
              <span>${item.maxNumCapReal ?? '-'}: ${item.nombreCapitulo || '-'}</span>
            </a>
            <small class="text-muted">Valoración: ${item.valoracion ?? 0}</small>
          </div>
          <div class="d-flex justify-content-between">
            <small class="text-muted user-progresion"></small>
          </div>
          <input type="hidden" class="obra-id" value="${item.obra_id ?? ''}">
        </div>
      `;
      // Insertar valoración exactamente como en biblioteca
        const valoracion = crearBloqueValoracion(item.obra_id, item.valoracion, item.cantvalora, { soloEstrellas: true, actualizarVoto: true });
        li.querySelector('.user-progresion').insertAdjacentElement('afterend', valoracion);
  
      ul.appendChild(li);
    });
  
    cont.innerHTML = "";
    cont.appendChild(ul);
  
    if (typeof activarLinksPDF === "function") activarLinksPDF();
  }

//------------------------------------------------------------------------
      function avatarPieEstablecer (itemid) {
        //console.log(item.id);
          let footer = document.createElement('div');
            footer.className = 'card-footer mt-auto bg-transparent border-0 small text-muted d-flex justify-content-center align-items-center';
            const btnSet = document.createElement('button');
              btnSet.type = 'button';
              btnSet.className = 'btn btn-sm btn-outline-primary';
              btnSet.textContent = '+Establecer';
              // Evitar que el click burbujee y llamar a establecerAvatar con el id
              btnSet.addEventListener('click', (ev) => {
                ev.stopPropagation();
                establecerAvatar(itemid);
              });
            footer.appendChild(btnSet);

          return footer
      }

    function avatarPieComprar(item) {
          //console.log(item);

          // --- Avatar no adquirido: mostrar precio y botón Comprar (si hay precio numérico)
          //if (typeof item.precio === 'number' && Number.isFinite(item.precio)) {
          if (item.precio != null) {
            let footer = document.createElement('div');
              footer.className = 'card-footer mt-auto bg-transparent border-0 small text-muted d-flex justify-content-center align-items-center';
              const buyBtn = document.createElement('button');
                buyBtn.type = 'button';
                buyBtn.className = 'btn btn-sm btn-outline-primary ms-2';
                buyBtn.setAttribute('aria-label', `Comprar avatar por ${item.precio}`);
                // El botón contiene el icono y el importe en lugar del texto "Comprar"
                buyBtn.innerHTML = '💰 ' + String(item.precio);
                // Evitar burbujeo y llamar a comprarAvatar con el id
                //buyBtn.addEventListener('click', (ev) => {
                //  ev.stopPropagation();
                //  comprarAvatar(item.id); 
                //});
                  buyBtn.addEventListener('click', async (ev) => {
                    ev.stopPropagation();                        
                    const data = await comprarAvatar(item.id);
                    // Si la compra fue correcta, mover el card
                    if (data && data.ok) {
                      // Localizar el card actual
                      const card = buyBtn.closest(".ficha-avatar");
                      if (card) {
                        // Quitar el footer con el botón de compra
                          let nuevofooter = card.querySelector(".card-footer");
                            if (nuevofooter) nuevofooter.remove();
                        //establecemos nuevo contenido
                          nuevofooter = avatarPieEstablecer(item.id);
                            if (nuevofooter) card.appendChild(nuevofooter);
                        // Mover el card al contenedor de avatares
                        const avatarResultado = document.getElementById("avatarResultado");
                          avatarResultado.querySelector(".row.g-2").appendChild(card);
                        //Actualizar nuevo saldo puntos
                        const saldoptos = document.getElementById("user_puntos");
                          saldoptos.innerHTML = data.saldo || 0;
                      }
                    }
                  });
                footer.appendChild(buyBtn);
                return footer;
            }
        return null;
    }
/**
 * cargarTienda
 *
 * Realiza una petición al endpoint de avatares y renderiza las imágenes dentro
 * del contenedor '#avatarResultado'.
 *
 * Comportamiento:
 * - NO auto-inicia. Llamar manualmente: cargarTienda();
 * - NO añade listeners ni verifica si un panel está visible.
 * - Muestra un mensaje de carga y un mensaje genérico si no hay avatares o hay error.
 *
 * Requisitos del JSON esperado:
 * - Puede ser un array directamente o un objeto con { items: [...] }.
 * - Cada elemento debe contener al menos la propiedad `avatar_path`.
 *
 * Seguridad / notas:
 * - `img.src` se asigna directamente desde `avatar_path`. Si el endpoint puede
 *   devolver URLs no deseadas, valida/normaliza antes de asignar.
 * - `alt` se rellena con `descripcion` para accesibilidad; asegúrate de que ese
 *   campo sea descriptivo en el backend.
 *
 * @returns {Promise<void>} Promise que resuelve cuando termina la carga/render.
 */
        async function cargarTienda() {
          return undefined;
          // Si no hay sesión, salir
          if (!usuario_id && !token) return;
          // Endpoint para obtener la lista de avatares
            const ENDPOINT = 'https://jabrascan.net/avatars/list';
          // Referencias a los contenedores DOM de las dos pestañas
            const tienda = document.querySelector('#tiendaResultado');
            const avatares = document.querySelector('#avatarResultado');
            if (!tienda || !avatares) return;
          // Mensajes de carga inicial
            tienda.innerHTML = '<div class="text-center py-4">Cargando avatares…</div>';
            avatares.innerHTML = '<div class="text-center py-4">Cargando avatares…</div>';
        
          try {
            // Petición al servidor (authFetch añade Authorization si hay token)
            const res = await authFetch(ENDPOINT, { cache: 'no-cache' });
              if (!res.ok) throw new Error('HTTP ' + res.status);
        
            // Parsear JSON y normalizar a un array de filas
            const data = await res.json();
              const rows = Array.isArray(data) ? data : (data.items || []);
        
            // Si no hay resultados, mostrar mensaje en ambas pestañas
            if (!rows.length) {
              avatares.innerHTML = '<div class="text-center py-4 text-muted">No hay avatares a la venta.</div>';
              tienda.innerHTML = '<div class="text-center py-4 text-muted">No tienes avatares disponibles.</div>';
              return;
            }
        
            // Limpiar contenedores y crear filas (bootstrap grid)
            const rowTienda = document.createElement('div');
              rowTienda.className = 'row g-2';
              tienda.innerHTML = '<div class="text-center py-4 text-muted">Tienda de Avatares.</div>';
            const rowAvatares = document.createElement('div');
              rowAvatares.className = 'row g-2';
              avatares.innerHTML = '<div class="text-center py-4 text-muted">Tus avatares.</div>';
        
            // Recorrer cada avatar devuelto por el backend
            rows.forEach(r => {
              // Normalizar objeto item con los campos que usamos
              const item = {
                id: r.id, // el backend siempre devuelve id
                src: r.avatar_path,
                alt: r.descripcion || '',
                precio: Object.prototype.hasOwnProperty.call(r, 'precio') ? r.precio : null,
                adquirido: r.adquirido,
                tipo: r.tipo || 'web'
              };
        
              // Columna que contendrá la card
              const col = document.createElement('div');
                col.className = 'col col-xs-5 col-sm-4 col-md-3 col-lg-2 d-flex card-avatar';
              // Card principal (estructura vertical)
              const card = document.createElement('div');
                let extra = '';
                    if (item.tipo === 'premium'){ extra = 'card-premium';}
                    else if (item.precio >= 100){ extra = 'card-gold';   }
                    else if (item.precio >= 50) { extra = 'card-silver'; }
                    else if (item.precio >= 25) { extra = 'card-bronze'; }
                card.className = `ficha-avatar card p-1 text-center d-flex flex-column w-100 ${extra}`;
              // Imagen del avatar
              const img = document.createElement('img');
                //img.src = item.src;               // ruta de la imagen
                imgSrcFromBlob(img, item.src, FALLBACK_IMG);
                img.alt = item.alt;               // texto alternativo
                img.className = 'img-fluid rounded';
                img.style.cursor = 'pointer';
                img.loading = 'lazy';
                img.decoding = 'async';
                // Selección visual al hacer click sobre la imagen
                /*img.addEventListener('click', () => {
                  document.querySelectorAll('#tiendaResultado img.selected, #avatarResultado img.selected')
                    .forEach(i => i.classList.remove('selected', 'border', 'border-primary'));
                  img.classList.add('selected', 'border', 'border-primary');
                });*/
        
              // Pie de foto / descripción corta
              const caption = document.createElement('div');
                caption.className = 'small text-truncate mt-1';
                caption.textContent = item.alt;
        
              // Footer (se crea según estado: adquirido o en tienda)
              //console.log("footer");console.log(item);
              let footer = null;      
                if (item.adquirido === 'adquirido') {
                  // --- Avatar ya adquirido: mostrar botón "+Establecer"
                  footer = avatarPieEstablecer(item.id);
                } else {
                  footer = avatarPieComprar(item);
                }
              // Montar la card: imagen, caption y footer (si existe)
                card.appendChild(img);
                card.appendChild(caption);
                if (footer) card.appendChild(footer);
                col.appendChild(card);
          
                // Añadir la columna a la pestaña correspondiente
                if (item.adquirido === 'adquirido') {
                  rowAvatares.appendChild(col); // pestaña "Avatares" (adquiridos)
                } else {
                  rowTienda.appendChild(col);   // pestaña "Tienda" (disponibles para comprar)
                }
            });
            // Insertar filas en los contenedores del DOM
            tienda.appendChild(rowTienda);
            avatares.appendChild(rowAvatares);
          } catch (err) {
            // En caso de error de red o parseo, mostrar mensaje genérico en ambas pestañas
            avatares.innerHTML = '<div class="text-center py-4 text-muted">No hay avatares disponibles.</div>';
            tienda.innerHTML = '<div class="text-center py-4 text-muted">No hay avatares disponibles.</div>';
          }
        }


    /**
     * Establece el avatar del usuario llamando al endpoint remoto y actualiza
     * los elementos <img> en la página con la nueva ruta devuelta por el servidor.
     *
     * Requisitos previos (variables/funciones globales que debe haber en el entorno):
     *  - usuario_id: identificador del usuario (o valor falsy si no hay sesión)
     *  - token: token de autenticación (o valor falsy si no hay sesión)
     *  - authFetch(input, init): función que añade el header Authorization con el token y llama a fetch
     *
     * Comportamiento:
     *  - Si no hay usuario logueado (ni usuario_id ni token) sale sin hacer nada.
     *  - Llama al endpoint POST /usuarios/edit/avatar usando authFetch.
     *  - Si la respuesta HTTP no es OK devuelve un objeto { ok: false, status, error } con el cuerpo como texto.
     *  - Si la respuesta es OK parsea el JSON, extrae `avatar_path`, actualiza los atributos `src` de:
     *      - <img id="user-avatar" class="rounded-circle user-avatar">
     *      - <img id="avatar-img" class="rounded-circle me-3">
     *    y devuelve el objeto JSON recibido del servidor.
     *
     * Nota: no hay fallback en los cambios de src; se asigna directamente el valor devuelto.
     *
     * @param {string|number} avatarId - Id del avatar a establecer (se envía en el body JSON como { avatar: avatarId }).
     * @returns {Promise<object>} - Si éxito devuelve el JSON del endpoint; si error devuelve { ok: false, status?, error }.
     */
      async function establecerAvatar(avatarId) {
        // verificacion usuario logueado
        if (!usuario_id && !token) return;
        const ENDPOINT = 'https://jabrascan.net/usuarios/edit/avatar';
        
          try {
            // llamada al endpoint con authFetch (que añade el Authorization)
            const response = await authFetch(ENDPOINT, {
              method: 'POST',
              cache: 'no-cache',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ avatar: avatarId })
            });
            // manejo simple de errores
            if (!response.ok) {
              const text = await response.text().catch(() => response.statusText);
              return { ok: false, status: response.status, error: text };
            }      
          // parsear respuesta exitosa
          const data = await response.json();
          // cambiar src de los elementos
            const userAvatar = document.getElementById('user-avatar');
              if (userAvatar) userAvatar.src = data.ruta;      
            const avatarImg = document.getElementById('avatar-img');
              if (avatarImg) imgSrcFromBlob(avatarImg, data.ruta, FALLBACK_IMG);
          //
          return data;
        } catch (err) {
          // error de red u otro fallo en la llamada
          return { ok: false, error: err?.message || 'Error de red' };
        }
      }
    // Función asincrónica para actualizar el nick del usuario
    async function actualizarnick(nuevoNick) {
      if (!token) return;
      if (!nuevoNick) return;
        const url = `${API_BASE}/usuarios/edit/nick`;
        // Se realiza la petición al servidor usando authFetch
        const resp = await authFetch(url, {
          method: "POST", // Método POST para enviar datos
          headers: { "Content-Type": "application/json" }, // Se especifica que el cuerpo es JSON
          body: JSON.stringify({ nick: nuevoNick }) // Se envía el nuevo nick en el cuerpo
        });
        // Si la respuesta no es correcta (status distinto de 200-299), se detiene
        if (!resp.ok) return;
      // Se devuelve la respuesta procesada
      return await resp.json();
    }
//======================================================================
  // Función asincrónica para comprar un avatar
  async function comprarAvatar(avatarId) {
    if (!token) return;              // Si no hay token, no se puede autenticar
    if (!avatarId) return;           // Si no se pasa un id de avatar, se detiene

    const url = `${API_BASE}/usuarios/buy/avatar`;
    // Se realiza la petición al servidor usando authFetch
    const resp = await authFetch(url, {
      method: "POST",                                // Método POST para enviar datos
      headers: { "Content-Type": "application/json" }, // Se especifica que el cuerpo es JSON
      body: JSON.stringify({ idavatar: avatarId })     // Se envía el id del avatar en el cuerpo
    });
    // Si la respuesta no es correcta (status distinto de 200-299), se detiene
    if (!resp.ok) return;  
    // Se devuelve la respuesta procesada
    return await resp.json();
  }
//======================================================================
  /* actualizar todos los tabs con un select para dispositivos moviles */
      function bindTabsSelect() {
        const select = document.getElementById('tabsSelect');
        if (!select) return;
      
        // Si ya había un listener, lo quitamos
        if (select._tabsSelectHandler) {
          select.removeEventListener('change', select._tabsSelectHandler);
        }
      
        const handler = function () {
          const target = this.value;
          const tabButton = document.querySelector(`#usuarioTabs button[data-bs-target="${target}"]`);
          if (tabButton && window.bootstrap && typeof bootstrap.Tab === 'function') {
            new bootstrap.Tab(tabButton).show();
          } else {
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('show','active'));
            document.querySelector(target)?.classList.add('show','active');
          }
        };
      
        select.addEventListener('change', handler);
        // Guardamos la referencia para poder eliminarla la próxima vez
        select._tabsSelectHandler = handler;
      }
  // Añadir a la biblioteca (usa authFetch que añade Authorization automáticamente)
  // Devuelve siempre un objeto con la forma: { ok: boolean, data?, error?, status? }
  export async function addToBiblio(clave, { timeout = 8000, remove = false } = {}) {
    // Validación básica de entrada: clave debe ser una cadena no vacía
    if (!clave || typeof clave !== "string") {  return { ok: false, error: "obra NO válida" };      }  
    // Comprobación de autorización en cliente: evita llamadas sin token
    if (!token) {  return { ok: false, error: "no autorizado" };    }
  
    const url = remove ? `${API_BASE}/biblioteca/remove` : `${API_BASE}/biblioteca/add`;
    // AbortController para poder cancelar la petición si excede el timeout
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
      try {
        // Realiza la petición POST
        const res = await authFetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ obra_id: clave }),
          signal: controller.signal
        });
        // Limpiar el timeout una vez recibida la respuesta
        clearTimeout(id);
        // Si no hay respuesta (caso raro), devolver error consistente
        if (!res) return { ok: false, error: "sin respuesta del servidor" };  
        // Intentar parsear la respuesta como JSON de forma segura
        let data;
        try {
          data = await res.json();
        } catch {
          // Si la respuesta no es JSON, devolvemos un error claro con el status
          return { ok: false, status: res.status, error: "Respuesta no JSON" };
        }  
        // Si el servidor devolvió un status de error, normalizamos la respuesta
        if (!res.ok) {  return { ok: false, status: res.status, error: data?.error || data };  }  
        // Éxito: devolvemos el payload recibido
        return { ok: true, data };
      } catch (err) {
          // Aseguramos limpiar el timeout en caso de excepción
          clearTimeout(id);
          // Tratamiento específico para cancelación por timeout
          if (err && err.name === "AbortError") {
            return { ok: false, error: "La petición fue cancelada (timeout)" };
          }
          // Error genérico: devolvemos mensaje legible
          return { ok: false, error: err?.message || String(err) };
      }
  }
// -------------------------------------------------
// initUsuario
// Orquestador que arranca la carga de datos asumiendo que
// el HTML de usuario ya fue insertado en el DOM por general.js.
// -------------------------------------------------
  export async function initUsuario() {
    // Llamadas a las funciones que manipulan el DOM / datos.
    // Se asume que cargarPerfil y las demás gestionan sus propios errores y fallbacks.
      //sincronizar el select
        bindTabsSelect();
    try {
      // 1. Ejecutar las tres funciones async al mismo tiempo
        const perfilPromise = cargarPerfil();
        const bibliotecaPromise = cargarBiblioteca();
        const obrasPromise = cargarObras();
        //const tiendaPromise = cargarTienda();
        // test
        const tiendaPromise = cargarTiendaDemo();
      // 2. Usar Promise.all() para esperar a que las tres promesas se resuelvan
        const results = await Promise.allSettled([perfilPromise, bibliotecaPromise, obrasPromise, tiendaPromise]);
      //console.log("Resultados de initUsuario:", results);    
        const perfil = results[0].status === 'fulfilled' ? results[0].value : undefined;
        const biblioteca = results[1].status === 'fulfilled' ? results[1].value : undefined;
        const obras = results[2].status === 'fulfilled' ? results[2].value : undefined;
    } catch (err) {
      // Error de orquestación: registrar para depuración
      console.error('initUsuario: error al arrancar cargas', err);
    }
  }  
  // -------------------------------------------------
  // API pública (opcional) que expone funciones para uso desde la consola
  // o desde otros módulos. Esto no sustituye la llamada directa desde general.js.
  // -------------------------------------------------
  window.usuarioAPI = {
    initUsuario
  };
