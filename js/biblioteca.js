import { imgSrcFromBlob } from './utils.js';
import { setItem, getItem, removeItem } from "./storage.js";
import { authFetch } from'./usuario.js';
// -------------------------
// Config y constantes
// -------------------------
const API_BASE = "https://jabrascan.net";
const FALLBACK_IMG = "https://img.jabrascan.net/avatar/default.webp";
const usuario_id = getItem("user_id");
const nickname = getItem("user_nickname");
const avatar = getItem("user_avatar");
const token = getItem("jwt");

const TARGET_USER = '74cabb4e-0835-4a85-b40d-6f2316083957';
const TARGET_USER_TAVO = 'dcffc6ac-c4e5-4ab7-86da-5e55c982ad97';


        function crearBotonesToggle(header, col, bavatars, bdemo) {
          // Contenedor para los botones
          const contenedor = document.createElement('div');
          contenedor.className = 'd-flex justify-content-center gap-2';
        
          // Botón ocultar (–)
          const btnOcultar = document.createElement('button');
          btnOcultar.textContent = '–';
          btnOcultar.className = 'btn btn-sm btn-outline-secondary';
          btnOcultar.addEventListener('click', () => {
            bavatars.classList.add('d-none');
            bdemo.classList.remove('d-none');
            col.className = 'col-sm-6 col-md-4 col-lg-3';
            btnOcultar.style.display = 'none';
            btnMostrar.style.display = 'inline-block';
          });
        
          // Botón mostrar (+)
          const btnMostrar = document.createElement('button');
          btnMostrar.textContent = '+';
          btnMostrar.className = 'btn btn-sm btn-outline-secondary';
          btnMostrar.style.display = 'none'; // empieza oculto
          btnMostrar.addEventListener('click', () => {
            bavatars.classList.remove('d-none');
            bdemo.classList.add('d-none');
            col.className = 'col-12';
            btnMostrar.style.display = 'none';
            btnOcultar.style.display = 'inline-block';
          });
        
          // Insertar botones en el contenedor
          contenedor.appendChild(btnOcultar);
          contenedor.appendChild(btnMostrar);
        
          // Insertar en el header de la colección
          header.appendChild(contenedor);
        }

    // 🔹 Función que construye un card DOM a partir de un item avatar
        function crearCardAvatar(item) {
          const col = document.createElement('div');
          col.className = 'col col-xs-5 col-sm-4 col-md-3 col-lg-2 d-flex card-avatar';
        
          const card = document.createElement('div');
          let extra = '';
          if (item.tipo === 'premium') extra = 'card-premium';
          else if (item.precio >= 100) extra = 'card-gold';
          else if (item.precio >= 50) extra = 'card-silver';
          else if (item.precio >= 25) extra = 'card-bronze';
          card.className = `ficha-avatar card p-1 text-center d-flex flex-column w-100 ${extra}`;
        
          const img = document.createElement('img');
          imgSrcFromBlob(img, item.src, FALLBACK_IMG);
          img.alt = item.alt;
          img.className = 'img-fluid rounded';
          img.loading = 'lazy';
          img.decoding = 'async';
        
          const caption = document.createElement('div');
          caption.className = 'small text-truncate mt-1';
          caption.textContent = item.alt;
        
          let footer = null;
          if (item.adquirido === 'adquirido') {
            footer = avatarPieEstablecer(item.id);
          } else {
            footer = avatarPieComprar(item);
          }
        
          card.appendChild(img);
          card.appendChild(caption);
          if (footer) card.appendChild(footer);
          col.appendChild(card);
        
          return col; // devolvemos directamente el nodo listo
        }
        
        async function mostrarAvatarColeccion(idcoleccion, adquirido) {
          if (!usuario_id && !token) return [];
        
          const ENDPOINT = 'https://jabrascan.net/avatars/coleccion';
          const adquiridoParam = adquirido ? 1 : 0;
        
          try {
            const res = await authFetch(ENDPOINT, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ idcoleccion, adquirido: adquiridoParam })
            });
            if (!res.ok) throw new Error('HTTP ' + res.status);
        
            const data = await res.json();
            const rows = Array.isArray(data) ? data : (data.items || []);
            if (!rows.length) return [];
            // 🔹 Crear contenedor <div class="row g-2">
            const rowDiv = document.createElement('div');
            rowDiv.className = 'row g-2';

            rows.forEach(r => {
              const item = {
                id: r.id,
                src: r.avatar_path,
                alt: r.descripcion || '',
                precio: Object.prototype.hasOwnProperty.call(r, 'precio') ? r.precio : null,
                adquirido: r.adquirido,
                tipo: r.tipo || 'web'
              };
              rowDiv.appendChild(crearCardAvatar(item));
            });
            return rowDiv; // 🔹 Devuelve el div completo
          } catch (err) {
            console.error("Error cargando colección:", err);
            return { error: err.message };
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
                        //const avatarResultado = document.getElementById("avatarResultado");
                        //  avatarResultado.querySelector(".row.g-2").appendChild(card);
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

async function cargarTiendaAvatar() {
  if (!token) return undefined;

  const ENDPOINT = `${API_BASE}/avatars/demo`;
  const tienda = document.querySelector('#tiendaResultado');
  const avatares = document.querySelector('#avatarResultado');
  //const tienda = document.querySelector('#demo-tienda');
  //const avatares = document.querySelector('#demo-avatar');
  if (!tienda || !avatares) return undefined;
        // Generar número aleatorio entre 1 y 4
        const randomImg = Math.floor(Math.random() * 5) + 1;
        // Crear el HTML con la imagen
        const loadingHTML = `
          <div class="text-center py-4">
            Cargando avatares…
            <br>
            <img src="/img_especial/loading/loading${randomImg}.webp" 
                 alt="Cargando…" 
                 style="width:80px; margin-top:10px;">
          </div>
        `;
        // Insertar en ambos contenedores
        tienda.innerHTML = loadingHTML;
        avatares.innerHTML = loadingHTML;

  try {
    const res = await authFetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);

    const data = await res.json();
    const colecciones = Array.isArray(data) ? data : [];

    if (!colecciones.length) {
      tienda.innerHTML = '<div class="text-center py-4 text-muted">No hay avatares a la venta.</div>';
      avatares.innerHTML = '<div class="text-center py-4 text-muted">No tienes avatares disponibles.</div>';
      return;
    }

    tienda.innerHTML = '';
    avatares.innerHTML = '';
    const rowTienda = document.createElement('div');
    rowTienda.className = 'row g-3';
    const rowAvatar = document.createElement('div');
    rowAvatar.className = 'row g-3';

    // Función auxiliar para crear una card de colección
    function crearCardColeccion(grupo, items, destino, adquirido) {
      if (!items?.length) return;

      const col = document.createElement('div');
      col.className = 'col-sm-6 col-md-4 col-lg-3';

      const card = document.createElement('div');
      card.className = 'card h-100';

      const header = document.createElement('div');
        header.className = 'card-header d-flex justify-content-between align-items-center';        
        const titleSpan = document.createElement('span');
          titleSpan.className = 'text-truncate flex-grow-1';
          titleSpan.textContent = grupo.coleccion;
     
        const btnMas = document.createElement('button');
          btnMas.type = 'button';
          btnMas.className = 'btn btn-sm btn-outline-primary';
          btnMas.textContent = '+';
          //btnMas.addEventListener('click', () => {
          //  const idcol = items[0]?.idcoleccion;
          //  if (idcol) mostrarAvatarColeccion(idcol);
          //});
          ///////////////////////////////////////////////////////////////
            // Evento click con control de doble click y resultado
            btnMas.addEventListener('click', async () => {
              if (btnMas.disabled) return;
              btnMas.disabled = true;
      
              try {
                const idcol = items[0]?.idcoleccion;
                if (!idcol) throw new Error('Colección sin id');
      
                const result = await mostrarAvatarColeccion(idcol, adquirido);
      
                if (!result || result.error) {
                  btnMas.disabled = false;
                  alert('Error al cargar la colección');
                  return;
                }
      
                // Expandir card a toda la fila
                col.className = 'col-12';
                // Guardar el contenedor donde estaba el botón +
                const contenedorBoton = btnMas.parentNode;
                btnMas.remove();
      
                const body = card.querySelector('.card-body');
                      const bminiature =  body.querySelector('.card-miniatures');
                if (bminiature) bminiature.classList.add('d-none');
      
                // Insertar el contenido devuelto
                const bavatars = document.createElement('div');
                  bavatars.className = 'card-avatars d-flex flex-row flex-wrap';
                if (Array.isArray(result)) {
                  result.forEach(node => {
                    if (node instanceof Node) bavatars.appendChild(node);
                  });
                } else if (result instanceof Node) {
                  bavatars.appendChild(result);
                }
                body.appendChild(bavatars);
                // 🔹 Crear los nuevos botones en el mismo sitio donde estaba el +
                if (contenedorBoton && body) {
                  // Aquí está la llamada integrada
                  crearBotonesToggle(contenedorBoton, col, bavatars, bminiature);
                }
              } catch (err) {
                btnMas.disabled = false;
                const bminiature =  body.querySelector('.card-miniatures');
                  if (bminiature) bminiature.classList.add('d-none');
                    console.error(err);
                alert('Error inesperado al cargar la colección');
              }
            });
          ///////////////////////////////////////////////////////////////

      header.appendChild(titleSpan);
      header.appendChild(btnMas);
      card.appendChild(header);

      const cbody = document.createElement('div');
        cbody.className = 'card-body d-flex flex-row flex-wrap';
      const body = document.createElement('div');
        body.className = 'card-miniatures d-flex flex-row flex-wrap';
              
      items.forEach(item => {
        const img = document.createElement('img');
        imgSrcFromBlob(img, item.avatar_path, FALLBACK_IMG);
        img.alt = item.descripcion || '';
        img.className = 'img-thumbnail me-2 mb-2';
        img.style.width = '80px';
        img.style.height = '80px';
        body.appendChild(img);
      });

      cbody.appendChild(body);
      card.appendChild(cbody);
      col.appendChild(card);
      destino.appendChild(col);
    }

    // Recorrer colecciones y crear cards según corresponda
    colecciones.forEach(grupo => {
      crearCardColeccion(grupo, grupo.noAdquiridos, rowTienda, false);
      crearCardColeccion(grupo, grupo.adquiridos, rowAvatar, true);
    });

    tienda.appendChild(rowTienda);
    avatares.appendChild(rowAvatar);

    return true;
  } catch (err) {
    console.error("Error en cargarTiendaAvatar:", err);
    avatares.innerHTML = '<div class="text-center py-4 text-muted">No hay avatares disponibles.</div>';
    tienda.innerHTML = '<div class="text-center py-4 text-muted">No hay avatares disponibles.</div>';

    return false;
  }
}


export function cargarTiendaDemo () {
  return cargarTiendaAvatar();
  //if (usuario_id === TARGET_USER || usuario_id === TARGET_USER_TAVO) {
    // Mostrar el <li> padre del botón "DemoTienda"
      /*document.getElementById("demotienda-tab")
              .closest("li")
              .classList.remove("d-none");
    // Mostrar el <li> padre del botón "Demoavatars"
      document.getElementById("demoavatar-tab")
              .closest("li")
              .classList.remove("d-none");*/
    
  //  return true;
  //} else {
  //  return false;
  //}  
}
