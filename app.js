
(function(){
  function ready(fn){ if(document.readyState!=='loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  ready(function(){
    let tries=0; const wait=setInterval(()=>{ if(window.Chart&&window.jspdf){clearInterval(wait);init();} else if(++tries>100){clearInterval(wait);init();}},40);

    function init(){
      // was: 'assets/logo_white.png'
const logo = new Image();
logo.src = 'logo_white.png';

// and the hidden img element (if present in index.html):
<img id="pdfLogoWhite" src="logo_white.png" style="display:none" alt="logo white">
      const levelSelect=document.getElementById('levelSelect');
      const unitSelect=document.getElementById('unitSelect');
      const tradeSelect=document.getElementById('tradeSelect');
      const statusSelect=document.getElementById('statusSelect');
      const saveBtn=document.getElementById('saveBtn');
      const exportBtn=document.getElementById('exportPdfBtn');
      const tbody=document.querySelector('#tradeTable tbody');
      const pdfLogoWhite=document.getElementById('pdfLogoWhite');

      const LEVELS=['1','2','3','4','5','6','7','8'];
      const UNITS=['01','02','03','04','05','06','07','08','09','10','11','12'];
      const TRADES=['Sheeting','Setting + Sanding','Paint - Sealer Coat','Plaster - Defects','Paint - 1st & 2nd Coat','Waterproof - Primed','Waterproof - Membrane 1st Coat','Waterproof - Flood Test','Waterproof - Screed','Waterproof - Membrane 2nd Coat','Joinery - 1st pass','Tiling - Bathroom - Floors','Tiling - Bathroom - Walls','Tiling - Grout','Joinery - Stone','Plumbing - Fitoff','Electrical - Fitoff','Flooring'];
      const STATUSES=['0%','10%','20%','30%','40%','50%','60%','70%','80%','90%','100%'];

      function fill(sel,arr){sel.innerHTML=arr.map(v=>`<option>${v}</option>`).join('');}
      fill(levelSelect,LEVELS); fill(unitSelect,UNITS); fill(tradeSelect,TRADES); fill(statusSelect,STATUSES);

      const key=(l,u,t)=>`cprog:${l}|${u}|${t}`;
      function save(l,u,t,s){localStorage.setItem(key(l,u,t),s);localStorage.setItem(key(l,u,t)+':ts',new Date().toLocaleString());}
      function unitMap(l,u){const m={}; TRADES.forEach(t=>{const v=localStorage.getItem(key(l,u,t)); if(v!=null)m[t]=v}); return m;}
      function unitAvg(l,u){const m=unitMap(l,u); const vals=TRADES.map(t=>parseInt((m[t]||'0%'))||0); return Math.round(vals.reduce((a,b)=>a+b,0)/TRADES.length);}
      function levelAverages(l){return UNITS.map(u=>unitAvg(l,u));}
      function levelAvg(l){const arr=levelAverages(l); return Math.round(arr.reduce((a,b)=>a+b,0)/arr.length);}

      function greenGrad(ctx){const g=ctx.createLinearGradient(0,ctx.canvas.height,ctx.canvas.width,0);g.addColorStop(0,'#86efac');g.addColorStop(1,'#16a34a');return g;}
      function redGrad(ctx){const g=ctx.createLinearGradient(0,ctx.canvas.height,ctx.canvas.width,0);g.addColorStop(0,'#fecaca');g.addColorStop(1,'#7f1d1d');return g;}

      let donut,levelBar;
      Chart.defaults.animation={duration:400};

      function renderDonut(l,u){
        const c=document.getElementById('unitDonut'); const ctx=c.getContext('2d'); const avg=unitAvg(l,u);
        if(donut) donut.destroy();
        donut=new Chart(ctx,{type:'doughnut',
          data:{labels:['COMPLETE','INCOMPLETE'],datasets:[{data:[avg,100-avg],backgroundColor:[greenGrad(ctx),redGrad(ctx)],borderWidth:0}]},
          options:{cutout:'72%', plugins:{legend:{display:false}, tooltip:{enabled:false}}},
          plugins:[{id:'center', afterDatasetsDraw(chart){const m=chart.getDatasetMeta(0).data[0]; if(!m)return; const cx=chart.ctx; cx.save(); cx.textAlign='center'; cx.fillStyle='#e5e7eb'; cx.font='700 30px Inter, system-ui'; cx.fillText(`${avg}%`, m.x, m.y-6); cx.font='600 12px Inter, system-ui'; cx.fillText('COMPLETE', m.x, m.y+16); cx.restore();}}]
        });
      }
      function renderTable(l,u){
        tbody.innerHTML=''; const m=unitMap(l,u);
        TRADES.forEach(t=>{ const s=m[t]||'0%'; const ts=localStorage.getItem(key(l,u,t)+':ts')||'';
          const tr=document.createElement('tr'); tr.innerHTML=`<td>${t}</td><td><span class="badge">${s==='100%'?'COMPLETE':s}</span></td><td>${ts}</td>`; tbody.appendChild(tr);
        });
      }
      function renderLevelBar(l){
        const c=document.getElementById('levelBar'); const ctx=c.getContext('2d'); const data=levelAverages(l);
        if(levelBar) levelBar.destroy();
        levelBar=new Chart(ctx,{type:'bar', data:{labels:UNITS, datasets:[{data, backgroundColor:greenGrad(ctx), borderRadius:10}]},
          options:{plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true, max:100}}}});
      }
      function refresh(){const L=levelSelect.value||LEVELS[0], U=unitSelect.value||UNITS[0]; renderDonut(L,U); renderTable(L,U); renderLevelBar(L);}

      saveBtn.onclick=()=>{save(levelSelect.value,unitSelect.value,tradeSelect.value,statusSelect.value); refresh();};
      levelSelect.onchange=refresh; unitSelect.onchange=refresh; refresh();

      async function exportPdf(){
        try{
          const { jsPDF } = window.jspdf;
          const pdf = new jsPDF({orientation:'landscape', unit:'pt', format:'a4'});
          const w=pdf.internal.pageSize.getWidth(), h=pdf.internal.pageSize.getHeight(), M=24;

          // Header
          pdf.setFillColor(11,18,32); pdf.roundedRect(M,M,w-M*2,56,8,8,'F');
          const logo=new Image(); logo.src='assets/logo_white.png';
          await new Promise(res=>{logo.onload=res; logo.onerror=res;});
          const lc=document.createElement('canvas'); lc.width=80; lc.height=80; lc.getContext('2d').drawImage(logo,0,0,80,80);
          pdf.addImage(lc.toDataURL('image/png'),'PNG',M+12,M+8,40,40);
          pdf.setTextColor(230); pdf.setFont('helvetica','bold'); pdf.setFontSize(18); pdf.text('FITOUT PROGRESS — Report', M+60, M+34);
          pdf.setFont('helvetica','normal'); pdf.setFontSize(11); pdf.text(`Level ${levelSelect.value} (all units)`, M+60, M+54);
          pdf.text(new Date().toLocaleString(), w-M-200, M+54);

          // Offscreen donut (Level avg)
          const L=levelSelect.value; const avg=levelAvg(L);
          const dc=document.createElement('canvas'); dc.width=220; dc.height=220; const dctx=dc.getContext('2d');
          new Chart(dctx,{type:'doughnut', data:{labels:['COMPLETE','INCOMPLETE'],datasets:[{data:[avg,100-avg],backgroundColor:[greenGrad(dctx), redGrad(dctx)], borderWidth:0}]},
            options:{cutout:'72%', plugins:{legend:{display:false}, tooltip:{enabled:false}}, animation:false},
            plugins:[{id:'c', afterDatasetsDraw(chart){const m=chart.getDatasetMeta(0).data[0]; const cx=chart.ctx; cx.save(); cx.textAlign='center'; cx.fillStyle='#e5e7eb'; cx.font='700 24px Inter, system-ui'; cx.fillText(`${avg}%`, m.x, m.y-4); cx.font='600 10px Inter, system-ui'; cx.fillText('COMPLETE', m.x, m.y+12); cx.restore();}}]
          });
          await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
          const donutData=dc.toDataURL('image/png');

          // Left card (donut)
          const leftX=M, topY=M+80, leftW=300, leftH=260;
          pdf.setFillColor(15,23,42); pdf.setDrawColor(30,41,59); pdf.roundedRect(leftX, topY, leftW, leftH, 8, 8, 'FD');
          pdf.addImage(donutData,'PNG', leftX+40, topY+20, 220, 220);
          pdf.setTextColor(230); pdf.setFont('helvetica','bold'); pdf.setFontSize(12); pdf.text('Level Average', leftX+16, topY+leftH-12);

          // Right card: Units table (striped)
          const rightX=leftX+leftW+16, rightW=w-M-rightX, rightH=260;
          pdf.roundedRect(rightX, topY, rightW, rightH, 8, 8, 'FD');
          const thH=28, rowH=20;
          pdf.setFillColor(11,18,32); pdf.roundedRect(rightX+8, topY+10, rightW-16, thH, 4,4, 'F');
          pdf.setTextColor(255); pdf.setFont('helvetica','bold'); pdf.setFontSize(11);
          const c1=rightX+16, c2=rightX+rightW*0.55, c3=rightX+rightW*0.78;
          pdf.text('Unit', c1, topY+28); pdf.text('% Complete', c2, topY+28); pdf.text('Updated', c3, topY+28);
          pdf.setFont('helvetica','normal'); pdf.setFontSize(10);
          let y=topY+48;
          UNITS.forEach((u,i)=>{
            if(y>topY+rightH-12) return;
            if(i%2===0){ pdf.setFillColor(17,24,39); pdf.rect(rightX+8, y-12, rightW-16, rowH, 'F'); }
            let maxTs=''; TRADES.forEach(t=>{ const ts=localStorage.getItem(`${key(L,u,t)}:ts`)||''; if(ts>maxTs) maxTs=ts; });
            pdf.setTextColor(229); pdf.text(`Unit ${u}`, c1, y);
            pdf.setTextColor(200); pdf.text(`${unitAvg(L,u)}%`, c2, y);
            pdf.text(maxTs||'-', c3, y);
            y+=rowH;
          });

          // Bottom card: offscreen bar chart
          const bc=document.createElement('canvas'); bc.width=900; bc.height=300; const bctx=bc.getContext('2d');
          new Chart(bctx,{type:'bar', data:{labels:UNITS, datasets:[{data:levelAverages(L), backgroundColor:greenGrad(bctx), borderRadius:10}]},
            options:{plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true, max:100}}, animation:false}});
          await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
          const barImg=bc.toDataURL('image/png');
          const barY=topY+leftH+16, barW=w-M*2, ratio=bc.height/bc.width, barH=Math.min(h-barY-M, barW*ratio);
          pdf.setFillColor(15,23,42); pdf.setDrawColor(30,41,59); pdf.roundedRect(M, barY, barW, barH+24, 8,8,'FD');
          pdf.addImage(barImg,'PNG', M+16, barY+12, barW-32, barH);

          pdf.save(`Fitout_Level${L}.pdf`);
        }catch(err){
          console.error('PDF export failed', err);
          alert('PDF export failed. Please refresh and try again.');
        }
      }

      exportBtn.addEventListener('click', exportPdf);
      exportBtn.onclick = exportPdf;
    }
  });
})();
