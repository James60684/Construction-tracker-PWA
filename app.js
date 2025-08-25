
(function(){
  function whenChartReady(cb){ if(window.Chart) return cb(); const id=setInterval(()=>{if(window.Chart){clearInterval(id);cb()}},50); setTimeout(()=>clearInterval(id),5000); }
  whenChartReady(()=>{
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

    function fill(sel,arr){ sel.innerHTML = arr.map(v=>`<option>${v}</option>`).join('') }
    fill(levelSelect, levels); fill(unitSelect, units); fill(tradeSelect, trades); fill(statusSelect, statuses);

    function key(l,u,t){return `cprog:${l}|${u}|${t}`}
    function save(l,u,t,s){ localStorage.setItem(key(l,u,t),s); localStorage.setItem(key(l,u,t)+':ts', new Date().toLocaleString()); }
    function readUnit(l,u){ const out={}; trades.forEach(t=>{const v=localStorage.getItem(key(l,u,t)); if(v!=null) out[t]=v}); return out; }
    function unitAvg(l,u){ const m=readUnit(l,u); const vals=trades.map(t=>parseInt((m[t]||'0%'))||0); return Math.round(vals.reduce((a,b)=>a+b,0)/trades.length); }
    function levelAvg(l){ const arr=units.map(u=>unitAvg(l,u)); return Math.round(arr.reduce((a,b)=>a+b,0)/arr.length); }

    // Dynamic gradient based on pct: lighter at 0%, brighter at 100%
    function greenGradient(ctx, pct, w, h){
      const startLight = 35, endLight = 60; // HSL lightness
      const L = startLight + (endLight-startLight)*(pct/100);
      // convert hsl to rgb helper
      function hsl(h,s,l){h/=360;s/=100;l/=100;const a=s*Math.min(l,1-l);function f(n){const k=(n+h/30)%12;const c=l-a*max(min(k-3,9-k,1),-1);return Math.round(255*c)};const max=Math.max,min=Math.min;return `rgb(${f(0)},${f(8)},${f(4)})`}
      const g=ctx.createLinearGradient(0,h,w,0);
      g.addColorStop(0, hsl(140,60,L)); g.addColorStop(1, hsl(140,70,Math.min(L+8,70)));
      return g;
    }
    function redGradient(ctx, pct, w, h){
      const startLight = 30, endLight = 55;
      const L = startLight + (endLight-startLight)*((100-pct)/100);
      function hsl(h,s,l){h/=360;s/=100;l/=100;const a=s*Math.min(l,1-l);function f(n){const k=(n+h/30)%12;const c=l-a*max(min(k-3,9-k,1),-1);return Math.round(255*c)};const max=Math.max,min=Math.min;return `rgb(${f(0)},${f(8)},${f(4)})`}
      const g=ctx.createLinearGradient(0,h,w,0);
      g.addColorStop(0, hsl(4,75,L)); g.addColorStop(1, hsl(4,80,Math.min(L+8,70)));
      return g;
    }

    let donut, levelBar;
    function renderDonut(l,u){
      const c=document.getElementById('unitDonut'); const ctx=c.getContext('2d'); const avg=unitAvg(l,u);
      if (donut) donut.destroy();
      const green=greenGradient(ctx, avg, c.width, c.height);
      const red=redGradient(ctx, avg, c.width, c.height);
      donut=new Chart(ctx,{ type:'doughnut',
        data:{labels:['COMPLETE','INCOMPLETE'],datasets:[{data:[avg,100-avg],backgroundColor:[green,red],borderWidth:0}]},
        options:{cutout:'72%', plugins:{legend:{display:false}, tooltip:{enabled:false}}},
        plugins:[{id:'center', afterDatasetsDraw(chart){ const m=chart.getDatasetMeta(0).data[0]; if(!m) return; const c2=chart.ctx; c2.save(); c2.textAlign='center'; c2.fillStyle='#e5e7eb'; c2.font='700 30px Inter, system-ui'; c2.fillText(`${avg}%`, m.x, m.y-6); c2.font='600 12px Inter, system-ui'; c2.fillText('COMPLETE', m.x, m.y+16); c2.restore(); }}]
      });
    }

    const tbodyEl = tbody;
    function renderTable(l,u){
      tbodyEl.innerHTML='';
      const map=readUnit(l,u);
      trades.forEach(t=>{
        const s=map[t]||'0%'; const ts=localStorage.getItem(key(l,u,t)+':ts')||'';
        const tr=document.createElement('tr'); tr.innerHTML=`<td>${t}</td><td><span class="badge">${s==='100%'?'COMPLETE':s}</span></td><td>${ts}</td>`; tbodyEl.appendChild(tr);
      });
    }

    function unitAvgForLevel(l){ return units.map(u=>unitAvg(l,u)); }

    function renderLevelChart(l){
      const c=document.getElementById('levelBar'); const ctx=c.getContext('2d'); const data=unitAvgForLevel(l);
      if (levelBar) levelBar.destroy();
      const grad=greenGradient(ctx, levelAvg(l), c.width, c.height);
      levelBar=new Chart(ctx,{ type:'bar', data:{labels:units, datasets:[{data, backgroundColor:grad, borderRadius:10}]},
        options:{plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true, max:100}}} });
    }

    function refresh(){ const L=levelSelect.value||levels[0], U=unitSelect.value||units[0]; renderDonut(L,U); renderTable(L,U); renderLevelChart(L); }
    saveBtn.onclick=()=>{ save(levelSelect.value, unitSelect.value, tradeSelect.value, statusSelect.value); refresh(); };
    levelSelect.onchange = refresh; unitSelect.onchange = refresh;
    refresh();

    // PDF Export (ENTIRE LEVEL)
    exportBtn.addEventListener('click', async ()=>{
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({orientation:'landscape', unit:'pt', format:'a4'});
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 24;

      // Add header with logo
      pdf.setFillColor(24,31,50);
      pdf.roundedRect(margin, margin, pageW - margin*2, 56, 8, 8, 'F');
      // logo
      const logoW = 40, logoH = 40; 
      // convert DOM image to data URL via canvas
      const cnv = document.createElement('canvas'); cnv.width=logoW*2; cnv.height=logoH*2; const cx = cnv.getContext('2d');
      const img = pdfLogo; cx.drawImage(img, 0, 0, cnv.width, cnv.height);
      const logoData = cnv.toDataURL('image/png');
      pdf.addImage(logoData, 'PNG', margin+12, margin+8, logoW, logoH);

      pdf.setTextColor(230); pdf.setFont('helvetica','bold'); pdf.setFontSize(18);
      pdf.text('FITOUT PROGRESS — Report', margin+60, margin+34);
      pdf.setFont('helvetica','normal'); pdf.setFontSize(11);
      pdf.text(`Level ${levelSelect.value} (all units)`, margin+60, margin+54);
      pdf.text(new Date().toLocaleString(), pageW - margin - 180, margin+54);

      function nodeToImg(sel, wTarget){
        return html2canvas(document.querySelector(sel), {backgroundColor: null, scale: 2}).then(canvas=>{
          const ratio = canvas.height / canvas.width;
          return {img: canvas.toDataURL('image/png'), w: wTarget, h: wTarget * ratio};
        });
      }

      // small donut for level average
      const lvlAvg = levelAvg(levelSelect.value);
      const donutC = document.createElement('canvas'); donutC.width=220; donutC.height=220; const dctx=donutC.getContext('2d');
      const g = greenGradient(dctx, lvlAvg, donutC.width, donutC.height);
      const r = redGradient(dctx, lvlAvg, donutC.width, donutC.height);
      new Chart(dctx,{type:'doughnut', data:{labels:['COMPLETE','INCOMPLETE'],datasets:[{data:[lvlAvg,100-lvlAvg],backgroundColor:[g,r],borderWidth:0}]},
        options:{cutout:'72%', plugins:{legend:{display:false}, tooltip:{enabled:false}}},
        plugins:[{id:'center', afterDatasetsDraw(chart){ const m=chart.getDatasetMeta(0).data[0]; const c2=chart.ctx; c2.save(); c2.textAlign='center'; c2.fillStyle='#e5e7eb'; c2.font='700 24px Inter, system-ui'; c2.fillText(`${lvlAvg}%`, m.x, m.y-4); c2.font='600 10px Inter, system-ui'; c2.fillText('COMPLETE', m.x, m.y+12); c2.restore(); }}]});
      await new Promise(r=>setTimeout(r,150));
      const donutImg = donutC.toDataURL('image/png');

      // Left card with donut
      const leftX = margin; const leftW = 300; const topY = margin+80; const leftH = 260;
      pdf.setFillColor(15,23,42); pdf.setDrawColor(30,41,59); pdf.roundedRect(leftX, topY, leftW, leftH, 8, 8, 'FD');
      pdf.addImage(donutImg, 'PNG', leftX+40, topY+20, 220, 220);
      pdf.setTextColor(230); pdf.setFont('helvetica','bold'); pdf.setFontSize(12);
      pdf.text('Level Average', leftX+16, topY+leftH-12);

      // Units table on right
      const rightX = leftX + leftW + 16; const rightW = pageW - margin - rightX; const rightH = 260;
      pdf.roundedRect(rightX, topY, rightW, rightH, 8, 8, 'FD');
      pdf.setFontSize(12); pdf.text('Units — % Complete', rightX+16, topY+20);
      pdf.setFont('helvetica','normal'); pdf.setFontSize(10);
      const data = units.map(u=>({u, pct: unitAvg(levelSelect.value, u)}));
      let y = topY + 40; const col1 = rightX+16; const col2 = rightX + rightW*0.5;
      data.forEach(d=>{ if(y < topY+rightH-12){ pdf.text(`Unit ${d.u}`, col1, y); pdf.text(`${d.pct}%`, col2, y); y += 16; } });

      // Level bar image
      const lvlBarImg = await nodeToImg('#levelBar', pageW - margin*2);
      const barY = topY + leftH + 16; const barH = Math.min(pageH - barY - margin, lvlBarImg.h);
      pdf.roundedRect(margin, barY, pageW - margin*2, barH+24, 8, 8, 'FD');
      pdf.addImage(lvlBarImg.img, 'PNG', margin+16, barY+12, pageW - margin*2 - 32, barH);

      pdf.save(`Fitout_Level${levelSelect.value}.pdf`);
    });
  });
})();