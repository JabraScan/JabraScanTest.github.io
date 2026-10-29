import{onLibroClick}from'./leerobras.js';import{activarLinksPDF}from'./eventos.js';import{actualizarEstrellas,crearBloqueValoracion,createImg,managerTabs,imgSrcFromBlob}from'./utils.js';import{setItem,getItem,removeItem}from"./storage.js";import{cargarTiendaDemo}from'./biblioteca.js';const API_BASE="https://jabrascan.net";const FALLBACK_IMG="https://img.jabrascan.net/avatar/default.webp";const usuario_id=getItem("user_id");const nickname=getItem("user_nickname");const avatar=getItem("user_avatar");const token=getItem("jwt");function getHashPage(){return(location.hash||'').replace(/^#\/?/,'').split(/[?#]/,1)[0].replace(/\/$/,'');}
const protectedPages=new Set(['usuario','usuario.html','login','login.html']);const page=getHashPage();if(protectedPages.has(page)&&!usuario_id){window.location.replace('/');}
(function ensureBootstrap(){const hasBootstrapCSS=Array.from(document.styleSheets).some(s=>s.href&&s.href.includes("bootstrap"));if(!hasBootstrapCSS){const link=document.createElement("link");link.rel="stylesheet";link.href="./css/bootstrap.min.css";document.head.appendChild(link);}
const hasBootstrapJS=Array.from(document.scripts).some(s=>s.src&&s.src.includes("bootstrap"));if(!hasBootstrapJS){const script=document.createElement("script");script.src="./js/bootstrap.bundle.min.js";document.body.appendChild(script);}})();export function authFetch(input,init={}){const headers=new Headers(init.headers||{});if(token)headers.set("Authorization",`Bearer ${token}`);return fetch(input,{...init,headers});}
export async function fetchPerfil(){const url=`${API_BASE}/usuarios/get`;const res=await authFetch(url);if(!res.ok){const text=await res.text().catch(()=>res.statusText);const err=new Error(`Error ${res.status}: ${text}`);err.status=res.status;throw err;}
return res.json();}
export function renderPerfil(data,opts={}){const usermain=document.getElementById("perfil-info");const img=document.createElement('img');img.id='avatar-img';imgSrcFromBlob(img,data.avatar,FALLBACK_IMG);img.alt='avatar';img.className='rounded-circle me-3';img.style.width='80px';img.style.height='80px';const datosUser=document.createElement('div');datosUser.id='datos-user';datosUser.innerHTML=`
                <div style="display:flex; align-items:center;">
                  <h3 id="nick"  style="margin:0; display:inline-block;">${data.nick || "(sin nick)"}</h3>
                  <i class="fa fa-pencil" id="edit-nick" style="cursor:pointer; font-size:0.8em; margin-left:8px;"></i>
                </div>
                <p class="text-muted">Puntos: <span id="user_puntos">${data.puntos}</span></p>
            `;const editNick=datosUser.querySelector("#edit-nick");editNick.addEventListener("click",async()=>{const nuevoNick=prompt("Introduce tu nuevo nick:");if(!nuevoNick)return;editNick.style.pointerEvents="none";editNick.style.opacity="0.5";try{const data=await actualizarnick(nuevoNick);if(data&&data.ok){const nick=datosUser.querySelector("#nick");nick.textContent=data.nick;nick.appendChild(editNick);}}finally{editNick.style.pointerEvents="auto";editNick.style.opacity="1";}});usermain.appendChild(img);usermain.appendChild(datosUser);}
export async function cargarPerfil(opts={}){if(!token)return undefined;let loadingEl;if(opts.loadingSelector){loadingEl=document.getElementById(opts.loadingSelector);if(loadingEl)loadingEl.style.display="";}
let data=null;try{data=await fetchPerfil();renderPerfil(data,opts);}catch(err){console.error("No se pudo cargar perfil:",err);if(opts.errorSelector){const errEl=document.getElementById(opts.errorSelector);if(errEl)errEl.textContent="Error al cargar perfil";}}finally{if(loadingEl)loadingEl.style.display="none";}
return data;}
function actualizarAviso(cont,ul,claseAviso,mensaje){let aviso=cont.querySelector(`.${claseAviso}`);if(ul.children.length===0){if(!aviso){aviso=document.createElement("div");aviso.className=`alert alert-info ${claseAviso}`;aviso.textContent=mensaje;cont.insertBefore(aviso,ul);}
aviso.style.display="";}else{if(aviso)aviso.style.display="none";}}
export async function cargarBiblioteca(){if(!token){return undefined;}
const url=`${API_BASE}/biblioteca/list`;let res;try{res=await authFetch(url);}catch(err){return undefined;}
if(!res||!res.ok){return undefined;}
const data=await res.json();const cont=document.getElementById("bibliotecaResultado");const contfinal=document.getElementById("bibliotecafin_Resultado");if(!cont||!contfinal)return undefined;const ul=document.createElement("ul");ul.className="list-group";const ulfinal=document.createElement("ul");ulfinal.className="list-group";(Array.isArray(data)?data:[]).forEach(item=>{const li=document.createElement("li");li.className="list-group-item d-flex gap-3 align-items-start";li.dataset.obraId=item.obra_id??"";let srcCandidate='https://img.jabrascan.net/'+(String(item.imagen??'').replace(/^"+|"+$/g,'').replace(/\\/g,'/').replace(/^\/+/,'').replace(/^img\/+/i,'').replace(/\.webp(\?.*)?$/i,'-300w.webp$1'));const imgSrc=srcCandidate||FALLBACK_IMG||"";li.innerHTML=`
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
          `;const valoracion=crearBloqueValoracion(item.obra_id,item.valoracion,item.cantvalora,{soloEstrellas:true,actualizarVoto:true});li.querySelector('.user-progresion').insertAdjacentElement('afterend',valoracion);li.querySelectorAll('.delete-obra').forEach(btn=>{btn.addEventListener('click',async(event)=>{const button=event.currentTarget;button.disabled=true;try{const res=await addToBiblio(String(item.obra_id),{remove:true});if(res.ok){li.remove();actualizarAviso(cont,ul,"alerta-bvacia","No tienes obras en la biblioteca");actualizarAviso(contfinal,ulfinal,"alerta-bvaciafin","No tienes obras finalizadas");}else{console.error('Error eliminando obra:',res.error||res.status);}}catch(err){console.error('Error en la petición:',err);}finally{button.disabled=false;}});});li.querySelectorAll('.marcar-finalizado').forEach(btn=>{btn.addEventListener('click',async(event)=>{const button=event.currentTarget;button.disabled=true;try{const liEl=button.closest('li');const enPrincipal=!!liEl.closest('#bibliotecaResultado');const valorOppuesto=enPrincipal?1:0;const res=await updateFinalizado(String(item.obra_id),valorOppuesto);const success=!!res&&(res.ok||res.success||res===true);if(success){liEl.remove();const destinoCont=document.getElementById(enPrincipal?'bibliotecafin_Resultado':'bibliotecaResultado');const destinoUl=destinoCont&&destinoCont.querySelector('ul.list-group');if(destinoUl)destinoUl.appendChild(liEl);liEl.dataset.finalizado=String(valorOppuesto);const titleText=valorOppuesto==1?'Mover a la biblioteca':'Marcar como finalizado';liEl.querySelectorAll('.marcar-finalizado').forEach(b=>{b.title=titleText;b.setAttribute('aria-label',titleText);});actualizarAviso(cont,ul,"alerta-bvacia","No tienes obras en la biblioteca");actualizarAviso(contfinal,ulfinal,"alerta-bvaciafin","No tienes obras finalizadas");}else{console.error('Error finalizando obra:',res);}}catch(err){console.error('Error en la petición:',err);}finally{button.disabled=false;}});});if(item.finalizado===0){ul.appendChild(li);}else{ulfinal.appendChild(li);}});cont.innerHTML="";if(ul.children.length===0){cont.innerHTML="<div class='alert alert-info alerta-bvacia'>No tienes obras en la biblioteca</div>";cont.appendChild(ul);}else{cont.appendChild(ul);cont.addEventListener('click',(event)=>{const btn=event.target.closest('.biblio-obra');if(!btn)return;event.preventDefault();const liEl=btn.closest('li');const obraId=liEl?.dataset.obraId??btn.dataset.obraId??null;if(obraId)onLibroClick(obraId);});}
contfinal.innerHTML="";if(ulfinal.children.length===0){contfinal.innerHTML="<div class='alert alert-info alerta-bvaciafin'>No tienes obras finalizadas</div>";contfinal.appendChild(ulfinal);}else{contfinal.appendChild(ulfinal);contfinal.addEventListener('click',(event)=>{const btn=event.target.closest('.biblio-obra');if(!btn)return;event.preventDefault();const liEl=btn.closest('li');const obraId=liEl?.dataset.obraId??btn.dataset.obraId??null;if(obraId)onLibroClick(obraId);});}
activarLinksPDF();}
async function updateFinalizado(obraId,finalizado){if(!usuario_id&&!token)return;if(!obraId)return;const url=`${API_BASE}/biblioteca/finalizado`;let resp;try{resp=await authFetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({obra_id:obraId,finalizado})});}catch(err){return undefined;}
if(!resp||!resp.ok){return undefined;}
const text=await resp.text().catch(()=>"");if(!text)return false;try{const parsed=JSON.parse(text);if(typeof parsed==="boolean")return parsed;if(parsed&&typeof parsed==="object"&&typeof parsed.ok==="boolean")return parsed.ok;}catch{}
const t=text.trim().toLowerCase();if(t==="true")return true;if(t==="false")return false;return false;}
export async function cargarObras(){if(!usuario_id&&!token)return undefined;const perfilUrl=token?`${API_BASE}/obras/traductores`:`${API_BASE}/obras/traductores?user_id=${encodeURIComponent(usuario_id)}`;let perfilRes;try{perfilRes=await authFetch(perfilUrl);}catch(err){console.error("cargarObras: authFetch lanzó excepción",err);return undefined;}
if(!perfilRes||!perfilRes.ok){return undefined;}
const data=await perfilRes.json();if(data&&typeof data==="object"&&data.ok===false){return undefined;}
if(!data||(Array.isArray(data)&&data.length===0)){return undefined;}
document.querySelectorAll('.obras').forEach(el=>{el.classList.remove('d-none');});const cont=document.getElementById("obrasResultado");if(!cont)return undefined;const ul=document.createElement("ul");ul.className="list-group";(Array.isArray(data)?data:[]).forEach(item=>{const li=document.createElement("li");li.className="list-group-item d-flex gap-3 align-items-start";li.dataset.obraId=item.obra_id??"";let srcCandidate='https://img.jabrascan.net/'+(String(item.imagen??'').replace(/^"+|"+$/g,'').replace(/\\/g,'/').replace(/^\/+/,'').replace(/^img\/+/i,'').replace(/\.webp(\?.*)?$/i,'-300w.webp$1'));const imgSrc=srcCandidate||FALLBACK_IMG||"";li.innerHTML=`
        <img src="${imgSrc}" ${imgSrc ? `onerror="this.onerror=null;this.src='${FALLBACK_IMG}'"` : ''} 
             alt="${item.nombreobra || ''}" class="img-thumbnail obra-image" style="width:96px;height:128px;object-fit:cover;">
        <div class="flex-grow-1">
          <div class="d-flex justify-content-between obra-main">
            <h5 class="mb-1">${item.nombreobra || ''}</h5>
            <small class="text-muted">${item.estado ? `Estado:${item.estado}` : ''}</small>
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
      `;const valoracion=crearBloqueValoracion(item.obra_id,item.valoracion,item.cantvalora,{soloEstrellas:true,actualizarVoto:true});li.querySelector('.user-progresion').insertAdjacentElement('afterend',valoracion);ul.appendChild(li);});cont.innerHTML="";cont.appendChild(ul);if(typeof activarLinksPDF==="function")activarLinksPDF();}
function avatarPieEstablecer(itemid){let footer=document.createElement('div');footer.className='card-footer mt-auto bg-transparent border-0 small text-muted d-flex justify-content-center align-items-center';const btnSet=document.createElement('button');btnSet.type='button';btnSet.className='btn btn-sm btn-outline-primary';btnSet.textContent='+Establecer';btnSet.addEventListener('click',(ev)=>{ev.stopPropagation();establecerAvatar(itemid);});footer.appendChild(btnSet);return footer}
function avatarPieComprar(item){if(item.precio!=null){let footer=document.createElement('div');footer.className='card-footer mt-auto bg-transparent border-0 small text-muted d-flex justify-content-center align-items-center';const buyBtn=document.createElement('button');buyBtn.type='button';buyBtn.className='btn btn-sm btn-outline-primary ms-2';buyBtn.setAttribute('aria-label',`Comprar avatar por ${item.precio}`);buyBtn.innerHTML='💰 '+String(item.precio);buyBtn.addEventListener('click',async(ev)=>{ev.stopPropagation();const data=await comprarAvatar(item.id);if(data&&data.ok){const card=buyBtn.closest(".ficha-avatar");if(card){let nuevofooter=card.querySelector(".card-footer");if(nuevofooter)nuevofooter.remove();nuevofooter=avatarPieEstablecer(item.id);if(nuevofooter)card.appendChild(nuevofooter);const avatarResultado=document.getElementById("avatarResultado");avatarResultado.querySelector(".row.g-2").appendChild(card);const saldoptos=document.getElementById("user_puntos");saldoptos.innerHTML=data.saldo||0;}}});footer.appendChild(buyBtn);return footer;}
return null;}
async function cargarTienda(){return undefined;if(!usuario_id&&!token)return;const ENDPOINT='https://jabrascan.net/avatars/list';const tienda=document.querySelector('#tiendaResultado');const avatares=document.querySelector('#avatarResultado');if(!tienda||!avatares)return;tienda.innerHTML='<div class="text-center py-4">Cargando avatares…</div>';avatares.innerHTML='<div class="text-center py-4">Cargando avatares…</div>';try{const res=await authFetch(ENDPOINT,{cache:'no-cache'});if(!res.ok)throw new Error('HTTP '+res.status);const data=await res.json();const rows=Array.isArray(data)?data:(data.items||[]);if(!rows.length){avatares.innerHTML='<div class="text-center py-4 text-muted">No hay avatares a la venta.</div>';tienda.innerHTML='<div class="text-center py-4 text-muted">No tienes avatares disponibles.</div>';return;}
const rowTienda=document.createElement('div');rowTienda.className='row g-2';tienda.innerHTML='<div class="text-center py-4 text-muted">Tienda de Avatares.</div>';const rowAvatares=document.createElement('div');rowAvatares.className='row g-2';avatares.innerHTML='<div class="text-center py-4 text-muted">Tus avatares.</div>';rows.forEach(r=>{const item={id:r.id,src:r.avatar_path,alt:r.descripcion||'',precio:Object.prototype.hasOwnProperty.call(r,'precio')?r.precio:null,adquirido:r.adquirido,tipo:r.tipo||'web'};const col=document.createElement('div');col.className='col col-xs-5 col-sm-4 col-md-3 col-lg-2 d-flex card-avatar';const card=document.createElement('div');let extra='';if(item.tipo==='premium'){extra='card-premium';}
else if(item.precio>=100){extra='card-gold';}
else if(item.precio>=50){extra='card-silver';}
else if(item.precio>=25){extra='card-bronze';}
card.className=`ficha-avatar card p-1 text-center d-flex flex-column w-100 ${extra}`;const img=document.createElement('img');imgSrcFromBlob(img,item.src,FALLBACK_IMG);img.alt=item.alt;img.className='img-fluid rounded';img.style.cursor='pointer';img.loading='lazy';img.decoding='async';const caption=document.createElement('div');caption.className='small text-truncate mt-1';caption.textContent=item.alt;let footer=null;if(item.adquirido==='adquirido'){footer=avatarPieEstablecer(item.id);}else{footer=avatarPieComprar(item);}
card.appendChild(img);card.appendChild(caption);if(footer)card.appendChild(footer);col.appendChild(card);if(item.adquirido==='adquirido'){rowAvatares.appendChild(col);}else{rowTienda.appendChild(col);}});tienda.appendChild(rowTienda);avatares.appendChild(rowAvatares);}catch(err){avatares.innerHTML='<div class="text-center py-4 text-muted">No hay avatares disponibles.</div>';tienda.innerHTML='<div class="text-center py-4 text-muted">No hay avatares disponibles.</div>';}}
async function establecerAvatar(avatarId){if(!usuario_id&&!token)return;const ENDPOINT='https://jabrascan.net/usuarios/edit/avatar';try{const response=await authFetch(ENDPOINT,{method:'POST',cache:'no-cache',headers:{'Content-Type':'application/json'},body:JSON.stringify({avatar:avatarId})});if(!response.ok){const text=await response.text().catch(()=>response.statusText);return{ok:false,status:response.status,error:text};}
const data=await response.json();const userAvatar=document.getElementById('user-avatar');if(userAvatar)userAvatar.src=data.ruta;const avatarImg=document.getElementById('avatar-img');if(avatarImg)imgSrcFromBlob(avatarImg,data.ruta,FALLBACK_IMG);return data;}catch(err){return{ok:false,error:err?.message||'Error de red'};}}
async function actualizarnick(nuevoNick){if(!token)return;if(!nuevoNick)return;const url=`${API_BASE}/usuarios/edit/nick`;const resp=await authFetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({nick:nuevoNick})});if(!resp.ok)return;return await resp.json();}
async function comprarAvatar(avatarId){if(!token)return;if(!avatarId)return;const url=`${API_BASE}/usuarios/buy/avatar`;const resp=await authFetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({idavatar:avatarId})});if(!resp.ok)return;return await resp.json();}
function bindTabsSelect(){const select=document.getElementById('tabsSelect');if(!select)return;if(select._tabsSelectHandler){select.removeEventListener('change',select._tabsSelectHandler);}
const handler=function(){const target=this.value;const tabButton=document.querySelector(`#usuarioTabs button[data-bs-target="${target}"]`);if(tabButton&&window.bootstrap&&typeof bootstrap.Tab==='function'){new bootstrap.Tab(tabButton).show();}else{document.querySelectorAll('.tab-pane').forEach(p=>p.classList.remove('show','active'));document.querySelector(target)?.classList.add('show','active');}};select.addEventListener('change',handler);select._tabsSelectHandler=handler;}
export async function addToBiblio(clave,{timeout=8000,remove=false}={}){if(!clave||typeof clave!=="string"){return{ok:false,error:"obra NO válida"};}
if(!token){return{ok:false,error:"no autorizado"};}
const url=remove?`${API_BASE}/biblioteca/remove`:`${API_BASE}/biblioteca/add`;const controller=new AbortController();const id=setTimeout(()=>controller.abort(),timeout);try{const res=await authFetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({obra_id:clave}),signal:controller.signal});clearTimeout(id);if(!res)return{ok:false,error:"sin respuesta del servidor"};let data;try{data=await res.json();}catch{return{ok:false,status:res.status,error:"Respuesta no JSON"};}
if(!res.ok){return{ok:false,status:res.status,error:data?.error||data};}
return{ok:true,data};}catch(err){clearTimeout(id);if(err&&err.name==="AbortError"){return{ok:false,error:"La petición fue cancelada (timeout)"};}
return{ok:false,error:err?.message||String(err)};}}
export async function initUsuario(){bindTabsSelect();try{const perfilPromise=cargarPerfil();const bibliotecaPromise=cargarBiblioteca();const obrasPromise=cargarObras();const tiendaPromise=cargarTiendaDemo();const results=await Promise.allSettled([perfilPromise,bibliotecaPromise,obrasPromise,tiendaPromise]);const perfil=results[0].status==='fulfilled'?results[0].value:undefined;const biblioteca=results[1].status==='fulfilled'?results[1].value:undefined;const obras=results[2].status==='fulfilled'?results[2].value:undefined;}catch(err){console.error('initUsuario: error al arrancar cargas',err);}}
window.usuarioAPI={initUsuario};