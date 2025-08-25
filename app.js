
(function(){
  function ready(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  ready(function(){
    const wait = setInterval(()=>{
      if (window.Chart && window.html2canvas && window.jspdf){ clearInterval(wait); init(); }
    }, 50);

    function init(){
      const levelSelect=document.getElementById('levelSelect');
      const unitSelect=document.getElementById('unitSelect');
      const tradeSelect=document.getElementById('tradeSelect');
      const statusSelect=document.getElementById('statusSelect');
      const saveBtn=document.getElementById('saveBtn');
      const tbody=document.querySelector('#tradeTable tbody');
      const exportBtn=document.getElementById('exportPdfBtn');
      const pdfLogoWhite=document.getElementById('pdfLogoWhite');

      const levels=['1','2','3','4','5','6','7','8'];
      const units=['01','02','03','04','05','06','07','08','09','10','11','12'];
      const trades=['Sheeting','Setting + Sanding','Paint - Sealer Coat','Plaster - Defects','Paint - 1st & 2nd Coat','Waterproof - Primed','Waterproof - Membrane 1st Coat','Waterproof - Flood Test','Waterproof - Screed','Waterproof - Membrane 2nd Coat','Joinery - 1st pass','Tiling - Bathroom - Floors','Tiling - Bathroom - Walls','Tiling - Grout','Joinery - Stone','Plumbing - Fitoff','Electrical - Fitoff','Flooring'];
      const statuses=['0%','10%','20%','30%','40%','50%','60%','70%','80%','90%','100%'];

      function fill(sel,arr){ sel.innerHTML = arr.map(v=>`<option>${v}</option>`).join('') }
      fill(levelSelect,levels); fill(unitSelect,units); fill(tradeSelect,trades); fill(statusSelect,statuses);

      function key(l,u,t){return `cprog:${l}|${u}|${t}`}
      function save(l,u,t,s){ localStorage.setItem(key(l,u,t),s); localStorage.setItem(key(l,u,t)+':ts', new Date().toLocaleString()); }
      function readUnit(l,u){ const out={}; trades.forEach(t=>{const v=localStorage.getItem(key(l,u,t)); if(v!=null) out[t]=v}); return out; }
      function unitAvg(l,u){ const m=readUnit(l,u); const vals=trades.map(t=>parseInt((m[t]||'0%'))||0); return Math.round(vals.reduce((a,b)=>a+b,0)/trades.length); }
      function unitAvgForLevel(l){ return units.map(u=>unitAvg(l,u)); }
      function levelAvg(l){ const arr=units.map(u=>unitAvg(l,u)); return Math.round(arr.reduce((a,b)=>a+b,0)/arr.length); }

      function greenGrad(ctx){ const g=ctx.createLinearGradient(0,ctx.canvas.height,ctx.canvas.width,0); g.addColorStop(0,'#86efac'); g.addColorStop(1,'#16a34a'); return g; }
      function redGrad(ctx){ const g=ctx.createLinearGradient(0,ctx.canvas.height,ctx.canvas.width,0); g.addColorStop(0,'#fecaca'); g.addColorStop(1,'#7f1d1d'); return g; }

      let donut, levelBar;
      Chart.defaults.animation = { duration: 400 };

      function renderDonut(l,u){
        const c=document.getElementById('unitDonut'); const ctx=c.getContext('2d'); const avg=unitAvg(l,u);
        if (donut) donut.destroy();
        donut=new Chart(ctx,{ type:'doughnut',
          data:{labels:['COMPLETE','INCOMPLETE'],datasets:[{data:[avg,100-avg],backgroundColor:[greenGrad(ctx),redGrad(ctx)],borderWidth:0}]},
          options:{cutout:'72%', plugins:{legend:{display:false}, tooltip:{enabled:false}}},
          plugins:[{id:'center', afterDatasetsDraw(chart){ const m=chart.getDatasetMeta(0).data[0]; if(!m) return; const cx=chart.ctx; cx.save(); cx.textAlign='center'; cx.fillStyle='#e5e7eb'; cx.font='700 30px Inter, system-ui'; cx.fillText(`${avg}%`, m.x, m.y-6); cx.font='600 12px Inter, system-ui'; cx.fillText('COMPLETE', m.x, m.y+16); cx.restore(); }}]
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

      function renderLevelChart(l){
        const c=document.getElementById('levelBar'); const ctx=c.getContext('2d'); const data=unitAvgForLevel(l);
        if (levelBar) levelBar.destroy();
        levelBar=new Chart(ctx,{ type:'bar', data:{labels:units, datasets:[{data, backgroundColor:greenGrad(ctx), borderRadius:10}]},
          options:{plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true, max:100}}} });
      }

      function refresh(){ const L=levelSelect.value||levels[0], U=unitSelect.value||units[0]; renderDonut(L,U); renderTable(L,U); renderLevelChart(L); }
      saveBtn.onclick=()=>{ save(levelSelect.value, unitSelect.value, tradeSelect.value, statusSelect.value); refresh(); };
      levelSelect.onchange=refresh; unitSelect.onchange=refresh; refresh();

      // PDF Export with brand-styled table
      async function exportPdf(){
        try{
          const { jsPDF } = window.jspdf;
          const pdf = new jsPDF({orientation:'landscape', unit:'pt', format:'a4'});
          const pageW = pdf.internal.pageSize.getWidth();
          const pageH = pdf.internal.pageSize.getHeight();
          const margin = 24;

          // Header (navy background + white logo + title)
          pdf.setFillColor(11,18,32); // navy
          pdf.roundedRect(margin, margin, pageW - margin*2, 56, 8, 8, 'F');
          // logo
          const cnv = document.createElement('canvas'); cnv.width=80; cnv.height=80; const cx=cnv.getContext('2d');
          const logoEl = pdfLogoWhite; cx.drawImage(logoEl,0,0,cnv.width,cnv.height);
          const logoData = cnv.toDataURL('image/png');
          pdf.addImage(logoData, 'PNG', margin+12, margin+8, 40, 40);
          // title
          pdf.setTextColor(230); pdf.setFont('helvetica','bold'); pdf.setFontSize(18);
          pdf.text('FITOUT PROGRESS — Level Report', margin+60, margin+34);
          pdf.setFont('helvetica','normal'); pdf.setFontSize(11);
          pdf.text(`Level ${levelSelect.value} (all units)`, margin+60, margin+54);
          pdf.text(new Date().toLocaleString(), pageW - margin - 200, margin+54);

          // Small level-average donut (left card)
          const L = levelSelect.value; const avg = levelAvg(L);
          const dC = document.createElement('canvas'); dC.width=220; dC.height=220; const dctx=dC.getContext('2d');
          function greenGradPDF(ctx){ const g=ctx.createLinearGradient(0,ctx.canvas.height,ctx.canvas.width,0); g.addColorStop(0,'#86efac'); g.addColorStop(1,'#16a34a'); return g; }
          function redGradPDF(ctx){ const g=ctx.createLinearGradient(0,ctx.canvas.height,ctx.canvas.width,0); g.addColorStop(0,'#fecaca'); g.addColorStop(1,'#7f1d1d'); return g; }
          new Chart(dctx,{type:'doughnut', data:{labels:['COMPLETE','INCOMPLETE'],datasets:[{data:[avg,100-avg],backgroundColor:[greenGradPDF(dctx),redGradPDF(dctx)],borderWidth:0}]},
            options:{cutout:'72%', plugins:{legend:{display:false}, tooltip:{enabled:false}}, animation:false},
            plugins:[{id:'center', afterDatasetsDraw(chart){ const m=chart.getDatasetMeta(0).data[0]; const c2=chart.ctx; c2.save(); c2.textAlign='center'; c2.fillStyle='#e5e7eb'; c2.font='700 24px Inter, system-ui'; c2.fillText(`${avg}%`, m.x, m.y-4); c2.font='600 10px Inter, system-ui'; c2.fillText('COMPLETE', m.x, m.y+12); c2.restore(); }}]
          });
          await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
          const donutImg = dC.toDataURL('image/png');

          const leftX = margin; const leftW = 300; const topY = margin+80; const leftH = 260;
          pdf.setFillColor(15,23,42); pdf.setDrawColor(30,41,59); pdf.roundedRect(leftX, topY, leftW, leftH, 8, 8, 'FD');
          pdf.addImage(donutImg, 'PNG', leftX+40, topY+20, 220, 220);
          pdf.setTextColor(230); pdf.setFont('helvetica','bold'); pdf.setFontSize(12);
          pdf.text('Level Average', leftX+16, topY+leftH-12);

          // Right card: brand-styled table
          const rightX = leftX + leftW + 16; const rightW = pageW - margin - rightX; const rightH = 260;
          pdf.setFillColor(15,23,42); pdf.setDrawColor(30,41,59); pdf.roundedRect(rightX, topY, rightW, rightH, 8, 8, 'FD');

          // Table header bar
          const thH = 28; const rowH = 20;
          pdf.setFillColor(11,18,32); // navy header
          pdf.roundedRect(rightX+8, topY+10, rightW-16, thH, 4, 4, 'F');
          pdf.setTextColor(255); pdf.setFont('helvetica','bold'); pdf.setFontSize(11);
          const col1 = rightX + 16; const col2 = rightX + rightW*0.55; const col3 = rightX + rightW*0.78;
          pdf.text('Unit', col1, topY+10+18);
          pdf.text('% Complete', col2, topY+10+18);
          pdf.text('Updated', col3, topY+10+18);

          // Rows (striped)
          pdf.setFont('helvetica','normal'); pdf.setFontSize(10);
          const unitData = units.map(u=>({u, pct: unitAvg(L,u), ts: (function(){ // find most recent TS for unit
            let maxTs='';
            trades.forEach(t=>{ const ts=localStorage.getItem(key(L,u,t)+':ts')||''; if(ts>maxTs) maxTs=ts; });
            return maxTs;
          })()}));
          let y = topY + 10 + thH + 6;
          for (let i=0;i<unitData.length;i++){
            const d = unitData[i];
            // row bg
            if (y + rowH > topY + rightH - 10) break; // keep inside card
            if (i % 2 === 0) { pdf.setFillColor(17,24,39); pdf.rect(rightX+8, y-14, rightW-16, rowH, 'F'); }
            pdf.setTextColor(229); pdf.text(`Unit ${d.u}`, col1, y);
            pdf.setTextColor(200); pdf.text(`${d.pct}%`, col2, y);
            pdf.text(d.ts || '-', col3, y);
            y += rowH;
          }

          // Bottom card: level bar chart image
          const barCanvas = await html2canvas(document.querySelector('#levelBar'), {backgroundColor:null, scale:2, useCORS:true});
          const img = barCanvas.toDataURL('image/png');
          const ratio = barCanvas.height / barCanvas.width;
          const barY = topY + leftH + 16;
          const availH = pageH - barY - margin;
          const barW = pageW - margin*2;
          const barH = Math.min(availH, barW * ratio);
          pdf.setFillColor(15,23,42); pdf.setDrawColor(30,41,59);
          pdf.roundedRect(margin, barY, barW, barH+24, 8, 8, 'FD');
          pdf.addImage(img, 'PNG', margin+16, barY+12, barW-32, barH);

          pdf.save(`Fitout_Level${L}.pdf`);
        }catch(err){
          console.error('PDF export failed', err);
          alert('PDF export failed. Please refresh and try again.');
        }
      }

      exportBtn.addEventListener('click', exportPdf);
    }
  });
})();