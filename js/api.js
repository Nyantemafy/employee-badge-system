(function(){
  function timestamp(){
    const d=new Date(); const pad=n=>String(n).padStart(2,'0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
  }
  async function buildBadgePdfBlob(){
    if(!window.jspdf || !window.currentEmployee) return null;
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
    const qrCanvas=document.querySelector('#qrcode canvas');
    if(qrCanvas){ const imgData=qrCanvas.toDataURL('image/png');
      const qrSize=35; const qrX=(pageWidth-qrSize)/2; const qrY=y+4;
      doc.addImage(imgData,'PNG',qrX,qrY,qrSize,qrSize);
    }
    return doc.output('blob');
  }
  async function buildExcelBlob(){
    if(!window.XLSX || !window.employees) return null;
    const ws=XLSX.utils.json_to_sheet(window.employees);
    const wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employés');
    const wbArray=XLSX.write(wb,{bookType:'xlsx',type:'array'});
    return new Blob([wbArray], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  async function postBlob(url, blob){
    const buf = await blob.arrayBuffer();
    const res = await fetch(url, { method:'POST', headers:{ 'Content-Type':'application/octet-stream' }, body: buf });
    if(!res.ok) throw new Error('Upload failed');
    return res.json();
  }
  const originalBadge = window.downloadBadge;
  window.downloadBadge = async function(){
    try{
      const blob = await buildBadgePdfBlob();
      if(!blob) throw new Error('No PDF to upload');
      const name = `badge_${currentEmployee.id}.pdf`;
      await postBlob(`/api/save/badge?filename=${encodeURIComponent(name)}`, blob);
      alert('PDF enregistré dans le dossier \'badge\\\' du projet.');
    }catch(e){
      console.error(e);
      if(typeof originalBadge==='function') originalBadge();
    }
  }
  const originalExcel = window.downloadExcel;
  window.downloadExcel = async function(){
    try{
      const blob = await buildExcelBlob();
      if(!blob) throw new Error('No Excel to upload');
      const name = `employees_${timestamp()}.xlsx`;
      await postBlob(`/api/save/excel?filename=${encodeURIComponent(name)}`, blob);
      alert('Excel enregistré dans le dossier \'historique\\\' du projet.');
    }catch(e){
      console.error(e);
      if(typeof originalExcel==='function') originalExcel();
    }
  }
})();
