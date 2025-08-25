
(function(){
  function ready(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  ready(function(){
    // ensure libs
    function loadScript(src){ return new Promise((res,rej)=>{ const s=document.createElement('script'); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s); }); }
    (async function ensureLibs(){
      if(!window.html2canvas){ try{ await loadScript('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js'); }catch(e){ console.error('html2canvas load failed',e); } }
      if(!window.jspdf){ try{ await loadScript('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'); }catch(e){ console.error('jsPDF load failed',e); } }
    })();

    const levelSelect=document.getElementById('levelSelect');
    const unitSelect=document.getElementById('unitSelect');
    const tradeSelect=document.getElementById('tradeSelect');
    const statusSelect=document.getElementById('statusSelect');
    const saveBtn=document.getElementById('saveBtn');
    const tbody=document.querySelector('#tradeTable tbody');
    const exportBtn=document.getElementById('exportPdfBtn');
    const pdfLogo=document.getElementById('pdfLogo');

    const levels=['1','2','3','4','5','6','7','8'];
    const units=['01','02','03','04','05','06','07','08','09','10','11','12'];
    const trades=['Sheeting','Setting + Sanding','Paint - Sealer Coat','Plaster - Defects','Paint - 1st & 2nd Coat','Waterproof - Primed','Waterproof - Membrane 1st Coat','Waterproof - Flood Test','Waterproof - Screed','Waterproof - Membrane 2nd Coat','Joinery - 1st pass','Tiling - Bathroom - Floors','Tiling - Bathroom - Walls','Tiling - Grout','Joinery - Stone','Plumbing - Fitoff','Electrical - Fitoff','Flooring'];
    const statuses=['0%','10%','20%','30%','40%','50%','60%','70%','80%','90%','100%'];
    function fill(sel,arr){ sel.innerHTML=arr.map(v=>`<option>${v}</option>`).join(''); }
    fill(levelSelect,levels); fill(unitSelect,units); fill(tradeSelect,trades); fill(statusSelect,statuses);

    function key(l,u,t){return `cprog:${l}|${u}|${t}`}
    function save(l,u,t,s){ localStorage.setItem(key(l,u,t),s); localStorage.setItem(key(l,u,t)+':ts', new Date().toLocaleString()); }
    function readUnit(l,u){ const m={}; trades.forEach(t=>{const v=localStorage.getItem(key(l,u,t)); if(v!=null) m[t]=v}); return m; }
    function unitAvg(l,u){ const m=readUnit(l,u); const vals=trades.map(t=>parseInt((m[t]||'0%'))||0); return Math.round(vals.reduce((a,b)=>a+b,0)/trades.length); }
    function unitAvgForLevel(l){ return units.map(u=>unitAvg(l,u)); }

    // gradients
    function greenGrad(ctx){ const g=ctx.createLinearGradient(0,ctx.canvas.height,ctx.canvas.width,0); g.addColorStop(0,'#86efac'); g.addColorStop(1,'#16a34a'); return g; }
    function redGrad(ctx){ const g=ctx.createLinearGradient(0,ctx.canvas.height,ctx.canvas.width,0); g.addColorStop(0,'#fecaca'); g.addColorStop(1,'#ef4444'); return g; }

    let donut, levelBar;
    function renderDonut(l,u){
      const c=document.getElementById('unitDonut'); const ctx=c.getContext('2d'); const avg=unitAvg(l,u);
      if(donut) donut.destroy();
      donut=new Chart(ctx,{type:'doughnut', data:{labels:['COMPLETE','INCOMPLETE'], datasets:[{data:[avg,100-avg], backgroundColor:[greenGrad(ctx), redGrad(ctx)], borderWidth:0}]},
        options:{cutout:'72%', plugins:{legend:{display:false}, tooltip:{enabled:false}}},
        plugins:[{id:'center', afterDatasetsDraw(chart){ const m=chart.getDatasetMeta(0).data[0]; if(!m) return; const cx=chart.ctx; cx.save(); cx.textAlign='center'; cx.fillStyle='#e5e7eb'; cx.font='700 30px Inter, system-ui'; cx.fillText(`${avg}%`, m.x, m.y-6); cx.font='600 12px Inter, system-ui'; cx.fillText('COMPLETE', m.x, m.y+16); cx.restore(); }}]
      });
    }
    function renderTable(l,u){
      tbody.innerHTML=''; const m=readUnit(l,u);
      trades.forEach(t=>{ const s=m[t]||'0%'; const ts=localStorage.getItem(key(l,u,t)+':ts')||'';
        const tr=document.createElement('tr'); tr.innerHTML=`<td>${t}</td><td><span class="badge">${s==='100%'?'COMPLETE':s}</span></td><td>${ts}</td>`; tbody.appendChild(tr); });
    }
    function renderLevelChart(l){
      const c=document.getElementById('levelBar'); const ctx=c.getContext('2d'); const data=unitAvgForLevel(l);
      if(levelBar) levelBar.destroy();
      levelBar=new Chart(ctx,{type:'bar', data:{labels:units, datasets:[{data, backgroundColor:greenGrad(ctx), borderRadius:10}]}, options:{plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true, max:100}}} });
    }

    function refresh(){ const L=levelSelect.value||levels[0], U=unitSelect.value||units[0]; renderDonut(L,U); renderTable(L,U); renderLevelChart(L); }
    saveBtn.onclick=()=>{ save(levelSelect.value, unitSelect.value, tradeSelect.value, statusSelect.value); refresh(); };
    levelSelect.onchange=refresh; unitSelect.onchange=refresh; refresh();

    // PDF Export function (entire level)
    window.exportFitoutPdf = async function(){
      try{
        if(!window.jspdf || !window.htm2canvas && !window.html2canvas){ console.error('Libraries missing'); return; }
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({orientation:'landscape', unit:'pt', format:'a4'});
        const pageW = pdf.internal.pageSize.getWidth(); const pageH = pdf.internal.pageSize.getHeight(); const margin=24;

        function ensureLogoData(){ const c=document.createElement('canvas'); c.width=80; c.height=80; const x=c.getContext('2d'); x.drawImage(pdfLogo,0,0,c.width,c.height); return c.toDataURL('image/png'); }
        const logoData = ensureLogoData();
        pdf.setFillColor(24,31,50); pdf.roundedRect(margin, margin, pageW-margin*2, 56, 8, 8, 'F');
        pdf.addImage(logoData,'PNG', margin+12, margin+8, 40, 40);
        pdf.setTextColor(230); pdf.setFont('helvetica','bold'); pdf.setFontSize(18); pdf.text('FITOUT PROGRESS — Report', margin+60, margin+34);
        pdf.setFont('helvetica','normal'); pdf.setFontSize(11); pdf.text(`Level ${levelSelect.value} (all units)`, margin+60, margin+54);
        pdf.text(new Date().toLocaleString(), pageW - margin - 180, margin+54);

        // level avg donut on offscreen canvas
        const lvlAvg = (function(){ const arr=units.map(u=>unitAvg(levelSelect.value,u)); return Math.round(arr.reduce((a,b)=>a+b,0)/arr.length); })();
        const tmp=document.createElement('canvas'); tmp.width=220; tmp.height=220; const tctx=tmp.getContext('2d');
        new Chart(tctx,{type:'doughnut', data:{labels:['COMPLETE','INCOMPLETE'], datasets:[{data:[lvlAvg,100-lvlAvg], backgroundColor:[greenGrad(tctx), redGrad(tctx)], borderWidth:0}]},
          options:{cutout:'72%', plugins:{legend:{display:false}, tooltip:{enabled:false}}},
          plugins:[{id:'center', afterDatasetsDraw(chart){ const m=chart.getDatasetMeta(0).data[0]; const cx=chart.ctx; cx.save(); cx.textAlign='center'; cx.fillStyle='#e5e7eb'; cx.font='700 24px Inter, system-ui'; cx.fillText(`${lvlAvg}%`, m.x, m.y-4); cx.font='600 10px Inter, system-ui'; cx.fillText('COMPLETE', m.x, m.y+12); cx.restore(); }}]
        });
        await new Promise(r=>setTimeout(r,150));
        const donutImg=tmp.toDataURL('image/png');

        // left card
        const leftX=margin, leftW=300, topY=margin+80, leftH=260;
        pdf.setFillColor(15,23,42); pdf.setDrawColor(30,41,59); pdf.roundedRect(leftX, topY, leftW, leftH, 8, 8, 'FD');
        pdf.addImage(donutImg,'PNG', leftX+40, topY+20, 220, 220);
        pdf.setTextColor(230); pdf.setFont('helvetica','bold'); pdf.setFontSize(12); pdf.text('Level Average', leftX+16, topY+leftH-12);

        // right summary
        const rightX=leftX+leftW+16, rightW=pageW - margin - rightX, rightH=260;
        pdf.roundedRect(rightX, topY, rightW, rightH, 8, 8, 'FD');
        pdf.setFontSize(12); pdf.text('Units — % Complete', rightX+16, topY+20);
        pdf.setFont('helvetica','normal'); pdf.setFontSize(10);
        const data = units.map(u=>({u, pct: unitAvg(levelSelect.value,u)}));
        let y=topY+40; const col1=rightX+16, col2=rightX+rightW*0.5;
        data.forEach(d=>{ if(y<topY+rightH-12){ pdf.text(`Unit ${d.u}`, col1, y); pdf.text(`${d.pct}%`, col2, y); y+=16; } });

        // bar chart screenshot
        const barCanvas = await html2canvas(document.querySelector('#levelBar'), {backgroundColor:null, scale:2});
        const img=barCanvas.toDataURL('image/png'); const ratio=barCanvas.height/barCanvas.width;
        const barY=topY+leftH+16; const availH=pageH - barY - margin; const barW=pageW - margin*2; const barH=Math.min(availH, barW*ratio);
        pdf.roundedRect(margin, barY, barW, barH+24, 8, 8, 'FD'); pdf.addImage(img,'PNG', margin+16, barY+12, barW-32, barH);

        pdf.save(`Fitout_Level${levelSelect.value}.pdf`);
      }catch(err){ console.error('Export error', err); alert('PDF export failed. Please refresh and try again.'); }
    };

    // Also bind via addEventListener and a late retry
    exportBtn.addEventListener('click', window.exportFitoutPdf);
    setTimeout(()=>{ exportBtn.removeEventListener('click', window.exportFitoutPdf); exportBtn.addEventListener('click', window.exportFitoutPdf); }, 1200);
  });
})();