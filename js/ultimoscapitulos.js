import{flatten,sortDesc,sortAsc,cargarCapitulos}from'./data.js';import{activarLinksPDF}from'./eventos.js';import{parseDateDMY,parseFecha}from'./utils.js';export function initUltimosCapitulos(){const listEl=document.getElementById("book-card-caps");const toggleViewBtn=document.getElementById("toggle-view");const emptyEl=document.getElementById("empty");const metaEl=document.getElementById("meta");const qEl=document.getElementById("q");const paginationEl=document.getElementById("pagination");const toggleOrderBtn=document.getElementById("toggle-order");const state={items:[],filtered:[],orden:"desc",currentPage:1,pageSize:15,vista:"cards"};const formatDateEs=(date)=>{const d=typeof date==="string"?parseDateDMY(date):date;if(!d)return"";const dd=String(d.getDate()).padStart(2,"0");const mm=String(d.getMonth()+1).padStart(2,"0");const yyyy=d.getFullYear();return`${dd}-${mm}-${yyyy}`;};const renderPage=()=>{listEl.innerHTML="";if(!state.filtered.length){emptyEl.style.display="block";metaEl.textContent="0 elementos";paginationEl.style.display="none";return;}
emptyEl.style.display="none";const startIndex=(state.currentPage-1)*state.pageSize;const endIndex=Math.min(startIndex+state.pageSize,state.filtered.length);const pageItems=state.filtered.slice(startIndex,endIndex);if(state.vista==="cards"){pageItems.forEach(item=>{const colDiv=document.createElement("div");colDiv.className="col";colDiv.innerHTML=`
          <article class="card h-100 chapter-card" data-clave="${item._clave}">
            <div class="card-body d-flex flex-column">
              <div class="d-flex justify-content-between align-items-start mb-2">
                <h5 class="card-title h6 mb-0 flex-grow-1 me-2" style="line-height: 1.3; max-height: 2.6em; overflow: hidden;" title="${item._obra}">${item._obra}</h5>
                <span class="badge bg-warning text-dark" style="min-width: fit-content;">${item.numCapitulo}</span>
              </div>
              <p class="card-text small text-muted mb-2">
                <i class="fa-solid fa-calendar-days me-1"></i>
                ${formatDateEs(item._fecha)}
              </p>
              <p class="card-text flex-grow-1" style="font-size: 0.9rem; line-height: 1.4; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical;" title="${item.nombreCapitulo}">
                ${item.nombreCapitulo}
              </p>
              <div class="mt-auto pt-2">
                <a href="#" class="btn btn-primary btn-sm pdf-link w-100"
                   data-pdf-obra="${item._clave}"
                   data-pdf-capitulo="${item.numCapitulo}">
                  <i class="fa-solid fa-book-open me-1"></i>Leer
                </a>
              </div>
            </div>
          </article>
        `;listEl.appendChild(colDiv);});}else{const table=document.createElement("table");table.className="table table-striped table-hover align-middle mb-0";table.innerHTML=`
        <thead>
          <tr>
            <th>Obra</th>
            <th>Capítulo</th>
            <th>Fecha</th>
            <th>Título</th>
            <th>Leer</th>
          </tr>
        </thead>
        <tbody></tbody>
      `;const tbody=table.querySelector("tbody");pageItems.forEach(item=>{const tr=document.createElement("tr");tr.innerHTML=`
          <td title="${item._obra}">${item._obra}</td>
          <td><span class="badge bg-warning text-dark">${item.numCapitulo}</span></td>
          <td>${formatDateEs(item._fecha)}</td>
          <td title="${item.nombreCapitulo}">${item.nombreCapitulo}</td>
          <td>
            <a href="#" class="btn btn-primary btn-sm pdf-link"
               data-pdf-obra="${item._clave}"
               data-pdf-capitulo="${item.numCapitulo}">
              <i class="fa-solid fa-book-open me-1"></i>Leer
            </a>
          </td>
        `;tbody.appendChild(tr);});listEl.appendChild(table);}
activarLinksPDF();const totalObras=new Set(state.filtered.map(i=>i._obra)).size;metaEl.textContent=`${state.filtered.length} capítulos · ${totalObras} obras`;updateOrderButton();renderPagination();updateViewButton();};const updateViewButton=()=>{if(!toggleViewBtn)return;const iconClass=state.vista==="cards"?"fa-list":"fa-th-large";const titleText=state.vista==="cards"?"Ver como lista":"Ver como tarjetas";toggleViewBtn.innerHTML=`<i class="fa-solid ${iconClass}"></i>`;toggleViewBtn.title=titleText;};const updateOrderButton=()=>{const iconClass=state.orden==="asc"?"fa-arrow-up-wide-short":"fa-arrow-down-wide-short";const titleText=state.orden==="asc"?"Orden ascendente (más antiguos primero)":"Orden descendente (más recientes primero)";toggleOrderBtn.innerHTML=`<i class="fa-solid ${iconClass}"></i>`;toggleOrderBtn.title=titleText;};const renderPagination=()=>{const totalPages=Math.ceil(state.filtered.length/state.pageSize);if(totalPages<=1){paginationEl.style.display="none";return;}
paginationEl.style.display="flex";paginationEl.innerHTML="";const createPageBtn=(label,page,disabled=false,active=false)=>{const btn=document.createElement("button");btn.className=`btn btn-sm ${active ? 'btn-warning' : 'btn-outline-warning'}`;btn.textContent=label;btn.disabled=disabled;if(!disabled){btn.addEventListener("click",()=>{state.currentPage=page;renderPage();document.querySelector('main')?.scrollIntoView({behavior:'smooth'});});}
return btn;};const prevBtn=createPageBtn("«",state.currentPage-1,state.currentPage===1);paginationEl.appendChild(prevBtn);const pages=new Set([1,2,totalPages-1,totalPages,state.currentPage-2,state.currentPage-1,state.currentPage,state.currentPage+1,state.currentPage+2].filter(p=>p>=1&&p<=totalPages));const sortedPages=Array.from(pages).sort((a,b)=>a-b);let prevPageNum=0;sortedPages.forEach(p=>{if(p-prevPageNum>1){const dots=document.createElement("span");dots.textContent="…";dots.className="mx-2 text-muted";paginationEl.appendChild(dots);}
const pageBtn=createPageBtn(String(p),p,false,p===state.currentPage);paginationEl.appendChild(pageBtn);prevPageNum=p;});const nextBtn=createPageBtn("»",state.currentPage+1,state.currentPage===totalPages);paginationEl.appendChild(nextBtn);};const applyFilter=()=>{const q=qEl.value.trim().toLowerCase();const base=!q?[...state.items]:state.items.filter(it=>it._obra.toLowerCase().includes(q)||it.nombreCapitulo.toLowerCase().includes(q)||String(it.numCapitulo).includes(q));state.filtered=state.orden==="asc"?base.sort(sortAsc):base.sort(sortDesc);state.currentPage=1;renderPage();};qEl.addEventListener("input",applyFilter);toggleOrderBtn.addEventListener("click",()=>{state.orden=state.orden==="asc"?"desc":"asc";applyFilter();});toggleViewBtn.addEventListener("click",()=>{state.vista=state.vista==="cards"?"lista":"cards";renderPage();});window.addEventListener("keydown",(e)=>{if(e.key==="/"&&document.activeElement!==qEl){e.preventDefault();qEl.focus();qEl.select();}});cargarCapitulos().then(data=>{const hoy=new Date();hoy.setHours(0,0,0,0);const todos=flatten(data);const publicados=todos.filter(cap=>{const fechaCap=cap._fecha;if(!fechaCap||fechaCap>hoy){return false;}
return true;});const capitulosAMostrar=publicados.length>0?publicados:todos.slice(0,50);state.items=capitulosAMostrar;applyFilter();}).catch(err=>{console.error("❌ Error cargando capitulos.json:",err);});}