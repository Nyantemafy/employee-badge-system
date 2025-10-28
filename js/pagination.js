(function(){
  // Simple client-side pagination by hiding list children after the original render
  const state = { page: 1, pageSize: 20 };

  function getContainer(){ return document.getElementById('employeeList'); }
  function getSearchBox(){ return document.getElementById('searchInput'); }
  function totalItems(){ const c=getContainer(); return c ? c.children.length : 0; }

  function applyPagination(){
    if (window.disableClientPagination) return; // server-mode active
    const c = getContainer(); if(!c) return;
    const total = c.children.length;
    const start = (state.page - 1) * state.pageSize;
    const end = start + state.pageSize;
    for(let i=0;i<total;i++){
      const el = c.children[i];
      el.style.display = (i>=start && i<end) ? '' : 'none';
    }
    renderControls(total);
  }

  function renderControls(total){
    if (window.disableClientPagination) return; // server-mode active
    const holder = document.getElementById('pagination');
    if(!holder) return;
    const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
    state.page = Math.min(Math.max(1, state.page), totalPages);

    holder.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'pagination-controls';

    const info = document.createElement('span');
    info.textContent = `Page ${state.page} / ${totalPages} (total: ${total})`;

    const prev = document.createElement('button');
    prev.textContent = 'Précédent';
    prev.className = 'btn btn-secondary';
    prev.disabled = state.page <= 1;
    prev.onclick = ()=>{ state.page--; applyPagination(); };

    const next = document.createElement('button');
    next.textContent = 'Suivant';
    next.className = 'btn';
    next.disabled = state.page >= totalPages;
    next.onclick = ()=>{ state.page++; applyPagination(); };

    const sizeSel = document.createElement('select');
    [10,20,50,100].forEach(n=>{
      const opt=document.createElement('option');
      opt.value=String(n); opt.textContent=`${n}/page`;
      if(n===state.pageSize) opt.selected=true;
      sizeSel.appendChild(opt);
    });
    sizeSel.onchange = ()=>{ state.pageSize = Number(sizeSel.value)||20; state.page=1; applyPagination(); };

    wrap.appendChild(prev);
    wrap.appendChild(next);
    wrap.appendChild(sizeSel);
    wrap.appendChild(info);
    holder.appendChild(wrap);
  }

  // Hook into existing renderers if present
  const afterRender = ()=>{
    // Reset to first page when the list view is shown or after filtering
    if (window.disableClientPagination) return; // server-mode active
    state.page = 1;
    applyPagination();
  };

  // Override displayEmployees to call original then paginate
  window.addEventListener('DOMContentLoaded', ()=>{
    const origDisplay = window.displayEmployees;
    if(typeof origDisplay === 'function'){
      window.displayEmployees = function(){
        try { origDisplay.apply(this, arguments); } finally { afterRender(); }
      }
    } else {
      // If no function found, try to paginate after small delay when switching tabs
      setInterval(()=>{
        if (window.disableClientPagination) return; // server-mode active
        if(document.getElementById('listView')?.classList.contains('active')){ applyPagination(); }
      }, 500);
    }

    const sb = getSearchBox();
    if(sb){
      const origKeyup = sb.onkeyup;
      sb.onkeyup = function(){
        if(typeof origKeyup === 'function') origKeyup.apply(this, arguments);
        if (window.disableClientPagination) return; // server-mode active
        state.page = 1;
        // Wait next frame to let the list be re-rendered by original filter
        requestAnimationFrame(applyPagination);
      }
    }
  });
})();
