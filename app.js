
(function(){
  function ready(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  ready(function(){
    let tries = 0;
    const wait = setInterval(()=>{
      if (window.Chart && window.html2canvas && window.jspdf) { clearInterval(wait); init(); }
      else if (++tries > 80) { console.warn('Libs late, init anyway'); clearInterval(wait); init(); }
    }, 50);

    function init(){
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
      fill(levelSelect,levels); fill(unitSelect,units); fill(tradeSelect,trades); fill(statusSelect,statuses);

      function key(l,u,t){return `cprog:${l}|${u}|${t}`}
      function save(l,u,t,s){ localStorage.setItem(key(l,u,t),s); localStorage.setItem(key(l,u,t)+':ts', new Date().toLocaleString()); }
      function readUnit(l,u){ const out={}; trades.forEach(t=>{const v=localStorage.getItem(key(l,u,t)); if(v!=null) out[t]=v}); return out; }
      function unitAvg(l,u){ const m=readUnit(l,u); const vals=trades.map(t=>parseInt((m[t]||'0%'))||0); return Math.round(vals.reduce((a,b)=>a+b,0)/trades.length); }
      function unitAvgForLevel(l){ return units.map(u=>unitAvg(l,u)); }
      function levelAvg(l){ const a=unitAvgForLevel(l); return Math.round(a.reduce((x,y)=>x+y,0)/a.length); }

      function greenGrad(ctx){ const g=ctx.createLinearGradient(0,ctx.canvas.height,ctx.canvas.width,0); g.addColorStop(0,'#86efac'); g.addColorStop(1,'#16a34a'); return g; }
      function redGrad(ctx){ const g=ctx.createLinearGradient(0,ctx.canvas.height,ctx.canvas.width,0); g.addColorStop(0,'#fecaca'); g.addColorStop(1,'#ef4444'); return g; }

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
        tbody.innerHTML=''; const map=readUnit(l,u);
        trades.forEach(t=>{ const s=map[t]||'0%'; const ts=localStorage.getItem(key(l,u,t)+':ts')||'';
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
      levelSelect.onchange=refresh; unitSelect.onchange=refresh;
      refresh();

      function nextFrame(){ return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); }

      async function exportPdf(){
        try{
          const oldAnim = Chart.defaults.animation; Chart.defaults.animation = false;
          refresh(); await nextFrame();

          const { jsPDF } = window.jspdf;
          const pdf = new jsPDF({orientation:'landscape', unit:'pt', format:'a4'});
          const pageW = pdf.internal.pageSize.getWidth(), pageH = pdf.internal.pageSize.getHeight(), margin=24;

          const logoData = (function(){ const c=document.createElement('canvas'); c.width=80; c.height=80; const x=c.getContext('2d'); x.drawImage(pdfLogo,0,0,c.width,c.height); return c.toDataURL('image/png'); })();
          pdf.setFillColor(24,31,50); pdf.roundedRect(margin, margin, pageW-margin*2, 56, 8, 8, 'F');
          pdf.addImage(logoData,'PNG', margin+12, margin+8, 40, 40);
          pdf.setTextColor(230); pdf.setFont('helvetica','bold'); pdf.setFontSize(18); pdf.text('FITOUT PROGRESS — Report', margin+60, margin+34);
          pdf.setFont('helvetica','normal'); pdf.setFontSize(11); pdf.text(`Level ${levelSelect.value} (all units)`, margin+60, margin+54);
          pdf.text(new Date().toLocaleString(), pageW - margin - 180, margin+54);

          const L=levelSelect.value; const avg = levelAvg(L);
          const temp=document.createElement('canvas'); temp.width=220; temp.height=220; const tctx=temp.getContext('2d');
          new Chart(tctx,{type:'doughnut', data:{labels:['COMPLETE','INCOMPLETE'], datasets:[{data:[avg,100-avg], backgroundColor:[greenGrad(tctx),redGrad(tctx)], borderWidth:0}]},
            options:{cutout:'72%', plugins:{legend:{display:false}, tooltip:{enabled:false}}, animation:false},
            plugins:[{id:'center', afterDatasetsDraw(chart){ const m=chart.getDatasetMeta(0).data[0]; const cx=chart.ctx; cx.save(); cx.textAlign='center'; cx.fillStyle='#e5e7eb'; cx.font='700 24px Inter, system-ui'; cx.fillText(`${avg}%`, m.x, m.y-4); cx.font='600 10px Inter, system-ui'; cx.fillText('COMPLETE', m.x, m.y+12); cx.restore(); }}]
          });
          await nextFrame();
          const donutImg = temp.toDataURL('image/png');

          const leftX=margin, leftW=300, topY=margin+80, leftH=260;
          pdf.setFillColor(15,23,42); pdf.setDrawColor(30,41,59); pdf.roundedRect(leftX, topY, leftW, leftH, 8, 8, 'FD');
          pdf.addImage(donutImg,'PNG', leftX+40, topY+20, 220, 220);
          pdf.setTextColor(230); pdf.setFont('helvetica','bold'); pdf.setFontSize(12); pdf.text('Level Average', leftX+16, topY+leftH-12);

          const rightX = leftX+leftW+16, rightW = pageW - margin - rightX, rightH = 260;
          pdf.roundedRect(rightX, topY, rightW, rightH, 8, 8, 'FD');
          pdf.setFontSize(12); pdf.text('Units — % Complete', rightX+16, topY+20);
          pdf.setFont('helvetica','normal'); pdf.setFontSize(10);
          const data = units.map(u=>({u, pct: unitAvg(L,u)}));
          let y = topY+40; const c1=rightX+16, c2=rightX+rightW*0.5;
          data.forEach(d=>{ if(y<topY+rightH-12){ pdf.text(`Unit ${d.u}`, c1, y); pdf.text(`${d.pct}%`, c2, y); y+=16; } });

          const barCanvas = await html2canvas(document.querySelector('#levelBar'), {backgroundColor:null, scale:2, useCORS:true});
          const img = barCanvas.toDataURL('image/png'); const ratio = barCanvas.height / barCanvas.width;
          const barY = topY + leftH + 16; const availH = pageH - barY - margin; const barW = pageW - margin*2; const barH = Math.min(availH, barW*ratio);
          pdf.roundedRect(margin, barY, barW, barH+24, 8, 8, 'FD');
          pdf.addImage(img,'PNG', margin+16, barY+12, barW-32, barH);

          Chart.defaults.animation = { duration: 400 };
          pdf.save(`Fitout_Level${levelSelect.value}.pdf`);
        }catch(err){
          console.error('PDF export failed', err);
          alert('PDF export failed. Please refresh and try again.');
        }
      }

      exportBtn.addEventListener('click', exportPdf);
      setTimeout(()=>{ exportBtn.onclick = exportPdf; }, 800);
    }
  });
})();