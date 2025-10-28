(function(){
  function qs(id){return document.getElementById(id)}
  function setActiveTab(index){
    const tabs=document.querySelectorAll('.tab');
    tabs.forEach(t=>t.classList.remove('active'));
    if(tabs[index]) tabs[index].classList.add('active');
  }
  function showOnly(viewId){
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
    const v=qs(viewId); if(v) v.classList.add('active');
  }
  window.openSettingsView=function(){
    showOnly('settingsView');
    setActiveTab(2);
    loadSettings();
    refreshDirLabels();
  }
  window.saveSettings=function(){
    const badgePath=(qs('badgePath').value||'').trim();
    const excelPath=(qs('excelPath').value||'').trim();
    localStorage.setItem('badgePath',badgePath);
    localStorage.setItem('excelPath',excelPath);
    alert('Paramètres enregistrés.\nBadge: '+(badgePath||'(non défini)')+'\nHistorique: '+(excelPath||'(non défini)'));
  }
  function loadSettings(){
    const badgePath=localStorage.getItem('badgePath')||'';
    const excelPath=localStorage.getItem('excelPath')||'';
    if(qs('badgePath')) qs('badgePath').value=badgePath;
    if(qs('excelPath')) qs('excelPath').value=excelPath;
  }

  // --- IndexedDB: stocker les handles de dossiers ---
  const DB_NAME='ebs_fs_db';
  const STORE='handles';
  function idbOpen(){
    return new Promise((resolve, reject)=>{
      const req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=()=>{
        const db=req.result;
        if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
    });
  }
  function idbPut(key, value){
    return idbOpen().then(db=>new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).put(value,key);
      tx.oncomplete=()=>resolve();
      tx.onerror=()=>reject(tx.error);
    }));
  }
  function idbGet(key){
    return idbOpen().then(db=>new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readonly');
      const req=tx.objectStore(STORE).get(key);
      req.onsuccess=()=>resolve(req.result||null);
      req.onerror=()=>reject(req.error);
    }));
  }

  async function ensurePersist(){
    if(navigator.storage && navigator.storage.persist){
      try{ await navigator.storage.persist(); }catch(e){}
    }
  }

  async function pickDirectory(key){
    if(!window.showDirectoryPicker){
      alert('Votre navigateur ne supporte pas la sélection de dossier. Utilisez Chrome/Edge récents via http(s).');
      return null;
    }
    try{
      await ensurePersist();
      const dirHandle=await window.showDirectoryPicker();
      await idbPut(key, dirHandle);
      return dirHandle;
    }catch(e){
      console.error(e);
      alert('Sélection du dossier annulée ou refusée.');
      return null;
    }
  }

  function nameFromHandle(handle){
    return handle && handle.name ? handle.name : '';
  }

  async function getDirHandle(key){
    try{ return await idbGet(key); }catch(e){ return null; }
  }

  async function writeFileToDir(dirHandle, fileName, blob){
    try{
      const fileHandle=await dirHandle.getFileHandle(fileName,{create:true});
      const permOk = await verifyPermission(fileHandle, true);
      if(!permOk) return false;
      const writable=await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    }catch(e){
      console.error(e);
      return false;
    }
  }

  async function verifyPermission(handle, write){
    try{
      const opts = write? {mode:'readwrite'} : {};
      if(await handle.queryPermission?.(opts) === 'granted') return true;
      if(await handle.requestPermission?.(opts) === 'granted') return true;
      return false;
    }catch(e){ return false; }
  }

  function timestamp(){
    const d=new Date();
    const pad=n=>String(n).padStart(2,'0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
  }

  // Exposés pour les boutons Paramètres
  window.chooseBadgeDir=async function(){
    const h=await pickDirectory('badgeDir');
    if(h){ refreshDirLabels(); }
  }
  window.chooseExcelDir=async function(){
    const h=await pickDirectory('excelDir');
    if(h){ refreshDirLabels(); }
  }
  async function refreshDirLabels(){
    const b=await getDirHandle('badgeDir');
    const e=await getDirHandle('excelDir');
    if(qs('badgeDirLabel')) qs('badgeDirLabel').textContent=b?`Dossier choisi: ${nameFromHandle(b)}`:'';
    if(qs('excelDirLabel')) qs('excelDirLabel').textContent=e?`Dossier choisi: ${nameFromHandle(e)}`:'';
  }

  // Générer contenus (blob) pour sauvegarde directe
  async function buildBadgePdfBlob(){
    if(!window.jspdf || !window.currentEmployee){ return null; }
    const { jsPDF } = window.jspdf;
    const emp = window.currentEmployee;
    const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a7' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 6; const contentStartY = 20;
    doc.setFontSize(14);
    doc.text('BADGE EMPLOYÉ', pageWidth/2, 12, { align:'center' });
    doc.setFontSize(10);
    let y = contentStartY;
    doc.text(`ID: ${emp.id}`, margin, y); y+=7;
    doc.text(`Nom: ${emp.firstName} ${emp.lastName}`, margin, y); y+=7;
    doc.text(`Téléphone: ${emp.phone}`, margin, y); y+=7;
    doc.text(`Titre: ${emp.title}`, margin, y); y+=4;
    const qrCanvas = document.querySelector('#qrcode canvas');
    if(qrCanvas){
      const imgData = qrCanvas.toDataURL('image/png');
      const qrSize = 35; const qrX=(pageWidth-qrSize)/2; const qrY=y+4;
      doc.addImage(imgData, 'PNG', qrX, qrY, qrSize, qrSize);
    }
    return doc.output('blob');
  }

  async function buildExcelBlob(){
    if(!window.XLSX || !window.employees){ return null; }
    const ws = XLSX.utils.json_to_sheet(window.employees);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employés');
    const wbArray = XLSX.write(wb, { bookType:'xlsx', type:'array' });
    return new Blob([wbArray], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  // Override des téléchargements pour tenter l'écriture directe
  const originalBadge = window.downloadBadge;
  window.downloadBadge = async function(){
    const badgeDir = await getDirHandle('badgeDir');
    try{
      if(badgeDir){
        const blob = await buildBadgePdfBlob();
        if(blob && window.currentEmployee){
          // Ensure permission on directory
          const dirPerm = await verifyPermission(badgeDir, true);
          const ok = dirPerm && await writeFileToDir(badgeDir, `badge_${currentEmployee.id}.pdf`, blob);
          if(ok){ alert('PDF enregistré directement dans le dossier Badges.'); return; }
        }
      }
    }catch(e){ console.error(e); }
    if(typeof originalBadge==='function') originalBadge();
  }

  const originalExcel = window.downloadExcel;
  window.downloadExcel = async function(){
    const excelDir = await getDirHandle('excelDir');
    try{
      if(excelDir){
        const blob = await buildExcelBlob();
        if(blob){
          const name = `employees_${timestamp()}.xlsx`;
          const dirPerm = await verifyPermission(excelDir, true);
          const ok = dirPerm && await writeFileToDir(excelDir, name, blob);
          if(ok){ alert('Excel enregistré directement dans le dossier Historique.'); return; }
        }
      }
    }catch(e){ console.error(e); }
    if(typeof originalExcel==='function') originalExcel();
  }

  document.addEventListener('DOMContentLoaded',()=>{
    loadSettings();
    refreshDirLabels();
  });
})();
