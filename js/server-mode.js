(function(){
  // Enable server mode: disable client pagination
  window.disableClientPagination = true;

  const state = {
    page: 1,
    pageSize: 20,
    q: ''
  };

  function qs(id){ return document.getElementById(id); }

  function showMsg(type, text){
    // Reuse app.js helpers if present
    if(typeof window.showMessage === 'function'){
      window.showMessage(type, text);
      setTimeout(()=>{ if(typeof window.hideMessage==='function') window.hideMessage(); }, 2500);
    } else {
      alert(text);
    }
  }

  async function fetchEmployees(){
    const params = new URLSearchParams();
    params.set('page', String(state.page));
    params.set('pageSize', String(state.pageSize));
    if(state.q) params.set('q', state.q);
    const res = await fetch(`/api/employees?${params.toString()}`);
    if(!res.ok) throw new Error('API error');
    return res.json(); // { page, pageSize, total, items }
  }

  function renderList(items){
    const list = qs('employeeList'); if(!list) return;
    list.innerHTML = '';
    items.forEach(emp=>{
      const div = document.createElement('div');
      div.className = 'employee-item';
      div.innerHTML = `
        <div class="employee-main">
          <span class="employee-name">${emp.first_name} ${emp.last_name}</span>
          <span class="employee-id">${emp.employee_code||''}</span>
        </div>
        <div class="employee-meta">${emp.phone||''} · ${emp.title||''}</div>
      `;
      div.onclick = ()=>{
        // Populate detail view using existing fields IDs
        const fullName = `${emp.first_name} ${emp.last_name}`;
        const id = emp.employee_code || `EMP${emp.id}`;
        if(qs('detailName')) qs('detailName').textContent = 'Détails Employé';
        if(qs('detailId')) qs('detailId').textContent = id;
        if(qs('detailFullName')) qs('detailFullName').textContent = fullName;
        if(qs('detailPhone')) qs('detailPhone').textContent = emp.phone||'';
        if(qs('detailTitle')) qs('detailTitle').textContent = emp.title||'';
        // QR code
        window.currentEmployee = { id, firstName: emp.first_name, lastName: emp.last_name, phone: emp.phone, title: emp.title };
        const qrEl = document.getElementById('qrcode');
        if(qrEl){ qrEl.innerHTML=''; new QRCode(qrEl, id); }
        if(typeof window.showView === 'function') window.showView('detail');
      };
      list.appendChild(div);
    });
  }

  function renderServerPagination(total){
    const holder = qs('pagination'); if(!holder) return;
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
    prev.onclick = async ()=>{ state.page--; await refreshList(); };

    const next = document.createElement('button');
    next.textContent = 'Suivant';
    next.className = 'btn';
    next.disabled = state.page >= totalPages;
    next.onclick = async ()=>{ state.page++; await refreshList(); };

    const sizeSel = document.createElement('select');
    ;[10,20,50,100].forEach(n=>{
      const opt=document.createElement('option');
      opt.value=String(n); opt.textContent=`${n}/page`;
      if(n===state.pageSize) opt.selected=true;
      sizeSel.appendChild(opt);
    });
    sizeSel.onchange = async ()=>{ state.pageSize = Number(sizeSel.value)||20; state.page=1; await refreshList(); };

    wrap.appendChild(prev);
    wrap.appendChild(next);
    wrap.appendChild(sizeSel);
    wrap.appendChild(info);
    holder.appendChild(wrap);
  }

  async function refreshList(){
    try{
      const data = await fetchEmployees();
      renderList(data.items||[]);
      renderServerPagination(data.total||0);
    }catch(e){
      console.error(e);
      showMsg('error', "Erreur lors du chargement des employés via l'API.");
    }
  }

  function wireSearch(){
    const sb = qs('searchInput');
    if(!sb) return;
    sb.onkeyup = async ()=>{
      state.q = sb.value.trim();
      state.page = 1;
      await refreshList();
    };
  }

  function overrideDisplay(){
    // displayEmployees might be called when switching to list tab
    const origDisplay = window.displayEmployees;
    window.displayEmployees = async function(){
      try{ if(typeof origDisplay === 'function'){ /* ignore original content rendering */ } }
      finally{ await refreshList(); }
    };
  }

  function overrideForm(){
    const form = qs('employeeForm'); if(!form) return;
    form.onsubmit = async (e)=>{
      e.preventDefault();
      const firstName = (qs('firstName')?.value||'').trim();
      const lastName = (qs('lastName')?.value||'').trim();
      const phone = (qs('phone')?.value||'').trim();
      const title = (qs('title')?.value||'').trim();
      if(!firstName||!lastName||!phone||!title){
        showMsg('error','Veuillez remplir tous les champs requis.');
        return;
      }
      try{
        const res = await fetch('/api/employees',{
          method:'POST',
          headers:{ 'Content-Type':'application/json' },
          body: JSON.stringify({ firstName, lastName, phone, title })
        });
        if(!res.ok) throw new Error('API create failed');
        const created = await res.json();
        showMsg('success', `Employé ajouté avec succès! ID: ${created.employee_code}`);
        form.reset();
        // refresh list if we are on list view
        if(qs('listView')?.classList.contains('active')){
          state.page = 1; await refreshList();
        }
      }catch(err){
        console.error(err);
        showMsg('error', "Impossible d'ajouter l'employé (API).");
      }
    };
  }

  window.addEventListener('DOMContentLoaded', ()=>{
    wireSearch();
    overrideDisplay();
    overrideForm();
    // If list tab already active at load time
    if(qs('listView')?.classList.contains('active')){
      refreshList();
    }
  });
})();
