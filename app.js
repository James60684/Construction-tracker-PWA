
(function () {
  function ready(fn){ if(document.readyState!=="loading") fn(); else document.addEventListener("DOMContentLoaded", fn); }
  ready(function(){
    let tries=0; const tick=setInterval(()=>{ if(window.Chart && window.jspdf){clearInterval(tick); init();} else if(++tries>100){clearInterval(tick); init();}},40);
    function init(){
      const Ls=document.getElementById("levelSelect"), Us=document.getElementById("unitSelect"), Ts=document.getElementById("tradeSelect"), Ss=document.getElementById("statusSelect");
      const saveBtn=document.getElementById("saveBtn"), exportBtn=document.getElementById("exportPdfBtn"), tbody=document.querySelector("#tradeTable tbody");
      const LEVELS=["1","2","3","4","5","6","7","8"], UNITS=["01","02","03","04","05","06","07","08","09","10","11","12"];
      const TRADES=["Sheeting","Setting + Sanding","Paint - Sealer Coat","Plaster - Defects","Paint - 1st & 2nd Coat","Waterproof - Primed","Waterproof - Membrane 1st Coat","Waterproof - Flood Test","Waterproof - Screed","Waterproof - Membrane 2nd Coat","Joinery - 1st pass","Tiling - Bathroom - Floors","Tiling - Bathroom - Walls","Tiling - Grout","Joinery - Stone","Plumbing - Fitoff","Electrical - Fitoff","Flooring"];
      const STAT=["0%","10%","20%","30%","40%","50%","60%","70%","80%","90%","100%"];
      const fill=(s,a)=>s.innerHTML=a.map(v=>`<option>${v}</option>`).join(""); fill(Ls,LEVELS); fill(Us,UNITS); fill(Ts,TRADES); fill(Ss,STAT);
      const key=(l,u,t)=>`cprog:${l}|${u}|${t}`, save=(l,u,t,s)=>{localStorage.setItem(key(l,u,t),s); localStorage.setItem(key(l,u,t)+":ts", new Date().toLocaleString());};
      const unitMap=(l,u)=>{const m={}; TRADES.forEach(t=>{const v=localStorage.getItem(key(l,u,t)); if(v!=null) m[t]=v;}); return m;};
      const unitAvg=(l,u)=>{const m=unitMap(l,u); const vals=TRADES.map(t=>parseInt((m[t]||'0').replace('%',''))||0); const s=Math.round(vals.reduce((a,b)=>a+b,0)/TRADES.length); return Math.max(0,Math.min(100,s));};
      const levelAverages=l=>UNITS.map(u=>unitAvg(l,u));
      const grad=(ctx,a,b)=>{const g=ctx.createLinearGradient(0,ctx.canvas.height,ctx.canvas.width,0); g.addColorStop(0,a); g.addColorStop(1,b); return g;};
      const gG=ctx=>grad(ctx,"#86efac","#16a34a"), rG=ctx=>grad(ctx,"#fecaca","#7f1d1d");
      let donut, bar; Chart.defaults.animation={duration:400};
      function renderDonut(l,u){const c=document.getElementById("unitDonut"), ctx=c.getContext("2d"), avg=unitAvg(l,u); if(donut) donut.destroy();
        donut=new Chart(ctx,{type:"doughnut",data:{labels:["COMPLETE","INCOMPLETE"],datasets:[{data:[avg,100-avg],backgroundColor:[gG(ctx),rG(ctx)],borderWidth:0}]},options:{cutout:"72%",maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{enabled:false}}},plugins:[{id:"center",afterDatasetsDraw(chart){const d=chart.getDatasetMeta(0).data[0]; if(!d) return; const cx=chart.ctx; cx.save(); cx.textAlign="center"; cx.fillStyle="#e5e7eb"; cx.font="700 30px Inter, system-ui"; cx.fillText(`${avg}%`, d.x, d.y-6); cx.font="600 12px Inter, system-ui"; cx.fillText("COMPLETE", d.x, d.y+16); cx.restore();}}]});}
      function renderTable(l,u){tbody.innerHTML=""; const m=unitMap(l,u); TRADES.forEach(t=>{const s=m[t]||"0%", ts=localStorage.getItem(key(l,u,t)+":ts")||""; const tr=document.createElement("tr"); tr.innerHTML=`<td>${t}</td><td><span class="badge">${s==="100%"?"COMPLETE":s}</span></td><td>${ts}</td>`; tbody.appendChild(tr);});}
      function renderBar(l){const c=document.getElementById("levelBar"), ctx=c.getContext("2d"); if(bar) bar.destroy(); bar=new Chart(ctx,{type:"bar",data:{labels:UNITS,datasets:[{data:levelAverages(l),backgroundColor:gG(ctx),borderRadius:10}]},options:{plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,max:100}}});}
      function refresh(){const L=Ls.value||LEVELS[0], U=Us.value||UNITS[0]; renderDonut(L,U); renderTable(L,U); renderBar(L);}
      saveBtn.onclick=()=>{save(Ls.value,Us.value,Ts.value,Ss.value); setTimeout(refresh,0);}; Ls.onchange=refresh; Us.onchange=refresh; refresh();
      exportBtn.addEventListener("click",async()=>{try{const {jsPDF}=window.jspdf; const pdf=new jsPDF({orientation:"landscape",unit:"pt",format:"a4"}); const w=pdf.internal.pageSize.getWidth(), M=24;
        pdf.setFillColor(11,18,32); if(pdf.roundedRect) pdf.roundedRect(M,M,w-M*2,56,8,8,"F"); else pdf.rect(M,M,w-M*2,56,"F");
        const logo=document.getElementById("pdfLogoWhite"); if(logo && (logo.complete||logo.naturalWidth)) pdf.addImage(logo,"PNG",M+12,M+10,40,40);
        pdf.setTextColor(230); pdf.setFont("helvetica","bold"); pdf.setFontSize(18); pdf.text("FITOUT PROGRESS — Report", M+60, M+34);
        pdf.setFont("helvetica","normal"); pdf.setFontSize(11); pdf.text(`Level ${Ls.value} (all units) — ${new Date().toLocaleString()}`, M+60, M+54);
        const donut=document.getElementById("unitDonut"), bar=document.getElementById("levelBar"); let y=M+80;
        if(donut){const img=donut.toDataURL("image/png",1.0); pdf.setFillColor(15,23,42); pdf.setDrawColor(30,41,59); if(pdf.roundedRect) pdf.roundedRect(M,y,340,280,8,8,"FD"); else pdf.rect(M,y,340,280,"FD"); pdf.addImage(img,"PNG",M+20,y+20,300,240);}
        if(bar){const img=bar.toDataURL("image/png",1.0); const x=M+340+16; pdf.setFillColor(15,23,42); pdf.setDrawColor(30,41,59); if(pdf.roundedRect) pdf.roundedRect(x,y,w-x-M,280,8,8,"FD"); else pdf.rect(x,y,w-x-M,280,"FD"); pdf.addImage(img,"PNG",x+16,y+16,w-x-M-32,248);}
        pdf.save(`Fitout_Level${Ls.value}.pdf`);
      }catch(e){console.error(e); alert("PDF export failed. Please refresh and try again.");}});
    }
  });
})();