async function exportPdf(){
  const { jsPDF } = window.jspdf;
  try{
    const pdf = new jsPDF({ orientation:'landscape', unit:'pt', format:'a4' });
    const w = pdf.internal.pageSize.getWidth(), h = pdf.internal.pageSize.getHeight(), M = 24;

    // Header card
    pdf.setFillColor(11,18,32);
    if (pdf.roundedRect) pdf.roundedRect(M, M, w - M*2, 56, 8, 8, 'F'); else pdf.rect(M, M, w - M*2, 56, 'F');

    // Load white logo (don’t fail hard if it can’t load)
    const logo = new Image();
    logo.crossOrigin = 'anonymous';
    logo.src = 'assets/logo_white.png?v=59';
    await new Promise(res => { logo.onload = res; logo.onerror = res; });

    try {
      const lc = document.createElement('canvas');
      lc.width = 80; lc.height = 80;
      lc.getContext('2d').drawImage(logo, 0, 0, 80, 80);
      pdf.addImage(lc.toDataURL('image/png'), 'PNG', M+12, M+8, 40, 40);
    } catch(_) { /* keep going without logo */ }

    pdf.setTextColor(230);
    pdf.setFont('helvetica','bold'); pdf.setFontSize(18);
    pdf.text('FITOUT PROGRESS — Report', M+60, M+34);
    pdf.setFont('helvetica','normal'); pdf.setFontSize(11);
    pdf.text(`Level ${levelSelect.value} (all units)`, M+60, M+54);
    pdf.text(new Date().toLocaleString(), w - M - 200, M + 54);

    // Helpers
    const greenGrad = ctx => { const g = ctx.createLinearGradient(0, ctx.canvas.height, ctx.canvas.width, 0); g.addColorStop(0,'#86efac'); g.addColorStop(1,'#16a34a'); return g; };
    const redGrad   = ctx => { const g = ctx.createLinearGradient(0, ctx.canvas.height, ctx.canvas.width, 0); g.addColorStop(0,'#fecaca'); g.addColorStop(1,'#7f1d1d'); return g; };

    // Compute level averages safely
    const UNITS = ['01','02','03','04','05','06','07','08','09','10','11','12'];
    const TRADES = ['Sheeting','Setting + Sanding','Paint - Sealer Coat','Plaster - Defects','Paint - 1st & 2nd Coat','Waterproof - Primed','Waterproof - Membrane 1st Coat','Waterproof - Flood Test','Waterproof - Screed','Waterproof - Membrane 2nd Coat','Joinery - 1st pass','Tiling - Bathroom - Floors','Tiling - Bathroom - Walls','Tiling - Grout','Joinery - Stone','Plumbing - Fitoff','Electrical - Fitoff','Flooring'];
    const key = (l,u,t) => `cprog:${l}|${u}|${t}`;
    const unitAvg = (L,u) => {
      const vals = TRADES.map(t => parseInt((localStorage.getItem(key(L,u,t))||'0%'))||0);
      const s = Math.round(vals.reduce((a,b)=>a+b,0)/TRADES.length);
      return Math.max(0, Math.min(100, s));
    };
    const L = levelSelect.value;
    const levelData = UNITS.map(u => unitAvg(L,u));
    const levelAvgVal = Math.round(levelData.reduce((a,b)=>a+b,0)/levelData.length);

    // Offscreen donut (await two RAFs so Safari paints gradients)
    const dc = document.createElement('canvas'); dc.width = 220; dc.height = 220;
    const dctx = dc.getContext('2d', { willReadFrequently:true });
    new Chart(dctx, {
      type:'doughnut',
      data:{ labels:['COMPLETE','INCOMPLETE'], datasets:[{ data:[levelAvgVal, 100-levelAvgVal], backgroundColor:[greenGrad(dctx), redGrad(dctx)], borderWidth:0 }] },
      options:{ cutout:'72%', plugins:{ legend:{display:false}, tooltip:{enabled:false} }, animation:false }
    });
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const donutImg = dc.toDataURL('image/png');

    // Place donut card
    const leftX = M, topY = M+80, leftW = 300, leftH = 260;
    pdf.setFillColor(15,23,42); pdf.setDrawColor(30,41,59);
    if (pdf.roundedRect) pdf.roundedRect(leftX, topY, leftW, leftH, 8, 8, 'FD'); else pdf.rect(leftX, topY, leftW, leftH, 'FD');
    pdf.addImage(donutImg, 'PNG', leftX+40, topY+20, 220, 220);
    pdf.setTextColor(230); pdf.setFont('helvetica','bold'); pdf.setFontSize(12);
    pdf.text('Level Average', leftX+16, topY+leftH-12);

    // Right table (units)
    const rightX = leftX + leftW + 16, rightW = w - M - rightX, rightH = 260;
    if (pdf.roundedRect) pdf.roundedRect(rightX, topY, rightW, rightH, 8, 8, 'FD'); else pdf.rect(rightX, topY, rightW, rightH, 'FD');
    const thH=28,rowH=20; pdf.setFillColor(11,18,32);
    if (pdf.roundedRect) pdf.roundedRect(rightX+8, topY+10, rightW-16, thH, 4,4, 'F'); else pdf.rect(rightX+8, topY+10, rightW-16, thH, 'F');
    pdf.setTextColor(255); pdf.setFont('helvetica','bold'); pdf.setFontSize(11);
    const c1=rightX+16, c2=rightX+rightW*0.55, c3=rightX+rightW*0.78;
    pdf.text('Unit', c1, topY+28); pdf.text('% Complete', c2, topY+28); pdf.text('Updated', c3, topY+28);

    pdf.setFont('helvetica','normal'); pdf.setFontSize(10);
    let y = topY+48;
    UNITS.forEach((u,i)=>{
      if (y > topY + rightH - 12) return;
      if (i%2===0){ pdf.setFillColor(17,24,39); pdf.rect(rightX+8, y-12, rightW-16, rowH, 'F'); }
      let latest = '';
      TRADES.forEach(t => { const ts = localStorage.getItem(`${key(L,u,t)}:ts`) || ''; if (ts > latest) latest = ts; });
      pdf.setTextColor(229); pdf.text(`Unit ${u}`, c1, y);
      pdf.setTextColor(200); pdf.text(`${unitAvg(L,u)}%`, c2, y);
      pdf.text(latest || '-', c3, y);
      y += rowH;
    });

    // Bottom bar chart (offscreen + RAF)
    const bc = document.createElement('canvas'); bc.width = 900; bc.height = 300;
    const bctx = bc.getContext('2d', { willReadFrequently:true });
    new Chart(bctx, {
      type:'bar',
      data:{ labels:UNITS, datasets:[{ data: levelData, backgroundColor: greenGrad(bctx), borderRadius:10 }] },
      options:{ plugins:{ legend:{display:false} }, scales:{ y:{ beginAtZero:true, max:100 } }, animation:false }
    });
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const barImg = bc.toDataURL('image/png');

    const barY = topY + leftH + 16, barW = w - M*2, ratio = bc.height / bc.width, barH = Math.min(h - barY - M, barW * ratio);
    pdf.setFillColor(15,23,42); pdf.setDrawColor(30,41,59);
    if (pdf.roundedRect) pdf.roundedRect(M, barY, barW, barH+24, 8, 8, 'FD'); else pdf.rect(M, barY, barW, barH+24, 'FD');
    pdf.addImage(barImg, 'PNG', M+16, barY+12, barW-32, barH);

    pdf.save(`Fitout_Level${L}.pdf`);
  }catch(err){
    console.error('PDF export failed', err);
    alert('PDF export failed. Please refresh and try again.');
  }
}
