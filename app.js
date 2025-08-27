(() => {
  const trades = [
    'Sheeting','Setting + Sanding','Paint - Sealer Coat','Plaster - Defects','Paint - 1st & 2nd Coat',
    'Waterproof - Primed','Waterproof - Membrane 1st Coat','Waterproof - Flood Test','Waterproof - Screed',
    'Waterproof - Membrane 2nd Coat','Joinery - 1st pass','Tiling - Bathroom - Floors','Tiling - Bathroom - Walls',
    'Tiling - Grout','Joinery - Stone','Plumbing - Fitoff','Electrical - Fitoff','Flooring'
  ];
  const levels = ['1','2','3','4','5','6','7','8'];
  const units = ['01','02','03','04','05','06','07','08','09','10','11','12'];
  const statuses = ['0%','10%','20%','30%','40%','50%','60%','70%','80%','90%','100%'];

  const $ = s => document.querySelector(s);
  const level = $('#levelSelect'), unit = $('#unitSelect'), trade = $('#tradeSelect'), status = $('#statusSelect');
  const tbody = $('#tradeTable tbody');
  const donutCanvas = document.getElementById('unitDonut');
  const barCanvas = document.getElementById('levelBar');

  function fill(sel, arr){ sel.innerHTML = arr.map(v=>`<option>${v}</option>`).join(''); }
  fill(level, levels); fill(unit, units); fill(trade, trades); fill(status, statuses);

  const k = (l,u,t)=>`fp:v8:${l}|${u}|${t}`;
  function set(l,u,t,s){ localStorage.setItem(k(l,u,t), s); localStorage.setItem(k(l,u,t)+':ts', Date.now()); }
  function getUnit(l,u){ const m={}; trades.forEach(t=>{ const v=localStorage.getItem(k(l,u,t)); if(v) m[t]=v; }); return m; }
  function unitAvg(l,u){ const m=getUnit(l,u); const vals = trades.map(t => parseInt((m[t]||'0').replace('%',''))||0); return Math.round(vals.reduce((a,b)=>a+b,0)/trades.length); }
  function levelAverages(l){ return units.map(u => unitAvg(l,u)); }

  let donut, bar;
  function render(){
    const l = level.value || '1', u = unit.value || '01';
    // donut
    if(donut) donut.destroy();
    const ctxD = donutCanvas.getContext('2d');
    const avg = unitAvg(l,u)||0;
    const gg = ctxD.createLinearGradient(0,0,0,donutCanvas.height); gg.addColorStop(0,'#8EF1BF'); gg.addColorStop(1,'#18B273');
    const rg = ctxD.createLinearGradient(0,0,0,donutCanvas.height); rg.addColorStop(0,'#FF9AA8'); rg.addColorStop(1,'#E0314B');
    donut = new Chart(ctxD, { type:'doughnut', data:{ datasets:[{data:[avg,100-avg], backgroundColor:[gg,rg], borderWidth:0}]},
      options:{ cutout:'72%', plugins:{ legend:{display:false}, tooltip:{enabled:false} } } });
    Chart.register({ id:'center', afterDraw(c){ const {ctx, chartArea:{width,height}}=c; ctx.save(); ctx.fillStyle='#E9EEF5'; ctx.textAlign='center'; ctx.font='700 28px system-ui'; ctx.fillText(avg+'%', width/2, height/2 - 6); ctx.font='600 12px system-ui'; ctx.fillText('COMPLETE', width/2, height/2 + 16); ctx.restore(); }});
    donut.update();

    // table
    tbody.innerHTML='';
    const map = getUnit(l,u);
    trades.forEach(t=>{
      const s = map[t] || '0%';
      const ts = localStorage.getItem(k(l,u,t)+':ts');
      const tr = document.createElement('tr'); tr.innerHTML = `<td>${t}</td><td>${s}</td><td>${ts? new Date(parseInt(ts)).toLocaleString():''}</td>`; tbody.appendChild(tr);
    });

    // bar
    if(bar) bar.destroy();
    const ctxB = barCanvas.getContext('2d');
    const grad = ctxB.createLinearGradient(0,0,0,barCanvas.height); grad.addColorStop(0,'#8EF1BF'); grad.addColorStop(1,'#18B273');
    bar = new Chart(ctxB, { type:'bar', data:{ labels:units, datasets:[{ data: levelAverages(l), backgroundColor: grad, borderRadius:8 }]},
      options:{ plugins:{legend:{display:false}}, scales:{ y:{ beginAtZero:true, max:100 } } } });
  }

  document.getElementById('saveBtn').addEventListener('click', ()=>{
    set(level.value, unit.value, trade.value, status.value); render();
  });
  level.addEventListener('change', render); unit.addEventListener('change', render);
  render();

  // PDF
  document.getElementById('exportPdfBtn').addEventListener('click', ()=>{
    try{
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit:'pt', format:'a4' });
      const w = pdf.internal.pageSize.getWidth(), M=24;
      pdf.setFillColor(15,22,36); pdf.rect(0,0,w,60,'F');
      pdf.setTextColor(255); pdf.setFont('helvetica','bold'); pdf.setFontSize(16);
      pdf.text('PROGRESS TRACKER — Report', M, 36);
      pdf.setFont('helvetica','normal'); pdf.setFontSize(10);
      pdf.text(`Level ${level.value} — Unit ${unit.value}`, M, 52);
      const donutImg = donutCanvas.toDataURL('image/png'); pdf.addImage(donutImg,'PNG', M, 80, 260, 260);
      const barImg = barCanvas.toDataURL('image/png'); pdf.addImage(barImg,'PNG', M, 360, 560, 200);
      let y=80; pdf.setTextColor(230); pdf.setFontSize(12); pdf.text('Trades Status', 320, y-10);
      const rows = Array.from(tbody.children).map(tr=> Array.from(tr.children).map(td=>td.textContent));
      const col=[320, 470, 540]; pdf.setFontSize(10);
      pdf.text('Trade', col[0], y); pdf.text('Status', col[1], y); pdf.text('Updated', col[2], y); y+=12; pdf.line(col[0], y, 560, y); y+=6;
      rows.forEach(r=>{ pdf.text(r[0].slice(0,32), col[0], y); pdf.text(r[1], col[1], y); pdf.text((r[2]||'').slice(0,19), col[2], y); y+=14; });
      pdf.save(`progress-tracker-L${level.value}-U${unit.value}.pdf`);
    }catch(e){ alert('PDF export failed: '+e.message); }
  });
})();