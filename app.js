
(function(){
  function whenChartReady(cb){ if(window.Chart) return cb(); const id=setInterval(()=>{if(window.Chart){clearInterval(id);cb()}},50); setTimeout(()=>clearInterval(id),5000); }
  whenChartReady(()=>{
    const levelSelect=document.getElementById('levelSelect');
    const unitSelect=document.getElementById('unitSelect');
    const tradeSelect=document.getElementById('tradeSelect');
    const statusSelect=document.getElementById('statusSelect');
    const saveBtn=document.getElementById('saveBtn');
    const tbody=document.querySelector('#tradeTable tbody');

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
      const grad=ctx.createLinearGradient(0,c.height,c.width,0); grad.addColorStop(0,'#16a34a'); grad.addColorStop(1,'#22c55e');
      donut=new Chart(ctx,{ type:'doughnut', data:{labels:['COMPLETE','Remaining'],datasets:[{data:[avg,100-avg],backgroundColor:[grad,'rgba(31,41,55,.6)'],borderWidth:0}]},
        options:{cutout:'72%', plugins:{legend:{display:true,position:'bottom',labels:{usePointStyle:true,pointStyle:'circle'}}}},
        plugins:[{id:'center', afterDatasetsDraw(chart){ const m=chart.getDatasetMeta(0).data[0]; if(!m) return; const c=chart.ctx; c.save(); c.font='700 28px Inter, system-ui'; c.fillStyle='#e5e7eb'; c.textAlign='center'; c.fillText(`${avg}%`, m.x, m.y); c.restore(); }}]
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
      const c=document.getElementById('levelBar'); const ctx=c.getContext('2d'); const data=units.map(u=>unitAvg(l,u));
      if (levelBar) levelBar.destroy();
      const grad=ctx.createLinearGradient(0,c.height,600,0); grad.addColorStop(0,'#16a34a'); grad.addColorStop(1,'#22c55e');
      levelBar=new Chart(ctx,{ type:'bar', data:{labels:units, datasets:[{data, backgroundColor:grad, borderRadius:10}]},
        options:{plugins:{legend:{display:false}}, scales:{y:{beginAtZero:true, max:100}}} });
    }

    function refresh(){ const L=levelSelect.value||levels[0], U=unitSelect.value||units[0]; renderDonut(L,U); renderTable(L,U); renderLevelChart(L); }
    saveBtn.onclick=()=>{ save(levelSelect.value, unitSelect.value, tradeSelect.value, statusSelect.value); refresh(); };
    levelSelect.onchange = refresh; unitSelect.onchange = refresh;
    refresh();
  });
})();