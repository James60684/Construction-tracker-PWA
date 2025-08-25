
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

    let donut, levelBar;
    function renderDonut(l,u){
      const c=document.getElementById('unitDonut'); const ctx=c.getContext('2d'); const avg=unitAvg(l,u);
      if (donut) donut.destroy();
      const green=ctx.createLinearGradient(0,c.height,c.width,0); green.addColorStop(0,'#16a34a'); green.addColorStop(1,'#22c55e');
      const red=ctx.createLinearGradient(0,c.height,c.width,0); red.addColorStop(0,'#b91c1c'); red.addColorStop(1,'#ef4444');
      donut=new Chart(ctx,{ type:'doughnut',
        data:{labels:['COMPLETE','INCOMPLETE'],datasets:[{data:[avg,100-avg],backgroundColor:[green,red],borderWidth:0}]},
        options:{cutout:'72%', plugins:{legend:{display:false}}},
        plugins:[{id:'center', afterDatasetsDraw(chart){ const m=chart.getDatasetMeta(0).data[0]; if(!m) return; const c=chart.ctx; c.save(); c.font='700 30px Inter, system-ui'; c.fillStyle='#e5e7eb'; c.textAlign='center'; c.fillText(`${avg}%`, m.x, m.y); c.restore(); }}]
      });
    }

    function renderTable(l,u){
      tbody.innerHTML='';
      const map=readUnit(l,u);
      trades.forEach(t=>{
        const s=map[t]||'0%'; const ts=localStorage.getItem(key(l,u,t)+':ts')||'';
        const tr=document.createElement('tr'); tr.innerHTML=`<td>${t}</td><td><span class="badge">${s==='100%'?'COMPLETE':s}</span></td><td>${ts}</td>`; tbody.appendChild(tr);
      });
    }

    function unitAvgForLevel(l){ return units.map(u=>unitAvg(l,u)); }

    function renderLevelChart(l){
      const c=document.getElementById('levelBar'); const ctx=c.getContext('2d'); const data=unitAvgForLevel(l);
      if (levelBar) levelBar.destroy();
      const grad=ctx.createLinearGradient(0,c.height,600,0); grad.addColorStop(0,'#16a34a'); grad.addColorStop(1,'#22c55e');
      levelBar=new Chart(ctx,{ type:'bar', data:{labels:units, datasets:[{data, backgroundColor:grad, borderRadius:10}]},
        options:{plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true, max:100}}} });
    }

    function refresh(){ const L=levelSelect.value||levels[0], U=unitSelect.value||units[0]; renderDonut(L,U); renderTable(L,U); renderLevelChart(L); }
    saveBtn.onclick=()=>{ save(levelSelect.value, unitSelect.value, tradeSelect.value, statusSelect.value); refresh(); };
    levelSelect.onchange = refresh; unitSelect.onchange = refresh;
    refresh();

    // PDF Export
    exportBtn.addEventListener('click', async ()=>{
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({orientation:'landscape', unit:'pt', format:'a4'});
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      // Header
      pdf.setFillColor(24,31,50); // dark header bg
      pdf.roundedRect(24, 24, pageW-48, 56, 8, 8, 'F');
      pdf.setTextColor(230); pdf.setFont('helvetica','bold'); pdf.setFontSize(18);
      pdf.text('FITOUT PROGRESS — Report', 40, 58);
      pdf.setFont('helvetica','normal'); pdf.setFontSize(11);
      pdf.text(`Level ${levelSelect.value} — Unit ${unitSelect.value}`, 40, 76);
      pdf.text(new Date().toLocaleString(), pageW-200, 76);

      // Helper to capture a DOM node to image
      async function nodeToImg(nodeSel, wTarget){
        const node = document.querySelector(nodeSel);
        const canvas = await html2canvas(node, {backgroundColor: null, scale: 2});
        const img = canvas.toDataURL('image/png');
        const ratio = canvas.height / canvas.width;
        return {img, w: wTarget, h: wTarget * ratio};
      }

      // Cards style boxes
      function card(x,y,w,h){ pdf.setFillColor(15,23,42); pdf.setDrawColor(30,41,59); pdf.roundedRect(x,y,w,h,8,8,'FD'); }

      // Left: Donut image
      const donutImg = await nodeToImg('#unitDonut', 350);
      card(24, 96, 380, 300);
      pdf.addImage(donutImg.img, 'PNG', 42, 112, donutImg.w, donutImg.h);

      // Right: Trades table summary
      const cardX = 420, cardW = pageW - cardX - 24;
      card(cardX, 96, cardW, 300);
      pdf.setTextColor(230); pdf.setFontSize(12); pdf.setFont('helvetica','bold');
      pdf.text('Trades Status', cardX+16, 120);
      pdf.setFont('helvetica','normal'); pdf.setFontSize(10);
      const map=readUnit(levelSelect.value, unitSelect.value);
      let y = 140, col1 = cardX+16, col2 = cardX + (cardW*0.6), col3 = cardX + (cardW*0.82);
      trades.forEach(t=>{
        const s = (map[t]||'0%'); const ts = localStorage.getItem(key(levelSelect.value,unitSelect.value,t)+':ts')||'';
        if (y > 96+300-16) return; // prevent overflow; keep summary concise
        pdf.text(t, col1, y);
        pdf.text(s=='100%'?'COMPLETE':s, col2, y);
        pdf.text(ts, col3, y);
        y += 18;
      });

      // Bottom: Level chart image
      const lvlImg = await nodeToImg('#levelBar', pageW-48);
      const hAvail = pageH - (96+320) - 32;
      const h = Math.min(lvlImg.h, hAvail);
      card(24, 420, pageW-48, h+32);
      pdf.addImage(lvlImg.img, 'PNG', 40, 436, pageW-80, h);

      pdf.save(`Fitout_Level${levelSelect.value}_Unit${unitSelect.value}.pdf`);
    });
  });
})();