// app.js (v5.10) – full file

(function () {
  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    // Wait for external libs (Chart.js + jsPDF)
    let tries = 0;
    const wait = setInterval(() => {
      if (window.Chart && window.jspdf) {
        clearInterval(wait);
        init();
      } else if (++tries > 100) {
        clearInterval(wait);
        init(); // try anyway
      }
    }, 40);

    function init() {
      const levelSelect = document.getElementById("levelSelect");
      const unitSelect = document.getElementById("unitSelect");
      const tradeSelect = document.getElementById("tradeSelect");
      const statusSelect = document.getElementById("statusSelect");
      const saveBtn = document.getElementById("saveBtn");
      const exportBtn = document.getElementById("exportPdfBtn");
      const tbody = document.querySelector("#tradeTable tbody");

      const LEVELS = ["1","2","3","4","5","6","7","8"];
      const UNITS  = ["01","02","03","04","05","06","07","08","09","10","11","12"];
      const TRADES = [
        "Sheeting","Setting + Sanding","Paint - Sealer Coat","Plaster - Defects",
        "Paint - 1st & 2nd Coat","Waterproof - Primed","Waterproof - Membrane 1st Coat",
        "Waterproof - Flood Test","Waterproof - Screed","Waterproof - Membrane 2nd Coat",
        "Joinery - 1st pass","Tiling - Bathroom - Floors","Tiling - Bathroom - Walls",
        "Tiling - Grout","Joinery - Stone","Plumbing - Fitoff","Electrical - Fitoff","Flooring"
      ];
      const STATUSES = ["0%","10%","20%","30%","40%","50%","60%","70%","80%","90%","100%"];

      function fill(sel, arr) {
        sel.innerHTML = arr.map(v => `<option>${v}</option>`).join("");
      }
      fill(levelSelect, LEVELS);
      fill(unitSelect, UNITS);
      fill(tradeSelect, TRADES);
      fill(statusSelect, STATUSES);

      const key = (l,u,t) => `cprog:${l}|${u}|${t}`;
      function save(l,u,t,s){
        localStorage.setItem(key(l,u,t), s);
        localStorage.setItem(key(l,u,t)+":ts", new Date().toLocaleString());
      }
      function unitMap(l,u){
        const m = {};
        TRADES.forEach(t => {
          const v = localStorage.getItem(key(l,u,t));
          if (v != null) m[t] = v;
        });
        return m;
      }
      function unitAvg(l,u){
        const m = unitMap(l,u);
        const vals = TRADES.map(t => parseInt(m[t] || "0%") || 0);
        const s = Math.round(vals.reduce((a,b)=>a+b,0) / TRADES.length);
        return Math.max(0, Math.min(100, s));
      }
      function levelAverages(l){ return UNITS.map(u => unitAvg(l,u)); }

      function greenGrad(ctx){
        const g = ctx.createLinearGradient(0, ctx.canvas.height, ctx.canvas.width, 0);
        g.addColorStop(0, "#86efac");
        g.addColorStop(1, "#16a34a");
        return g;
      }
      function redGrad(ctx){
        const g = ctx.createLinearGradient(0, ctx.canvas.height, ctx.canvas.width, 0);
        g.addColorStop(0, "#fecaca");
        g.addColorStop(1, "#7f1d1d");
        return g;
      }

      let donut, levelBar;
      Chart.defaults.animation = { duration: 400 };

      function renderDonut(l,u){
        const c = document.getElementById("unitDonut");
        const ctx = c.getContext("2d");
        const avg = unitAvg(l,u);
        if (donut) donut.destroy();
        donut = new Chart(ctx, {
          type: "doughnut",
          data: {
            labels: ["COMPLETE", "INCOMPLETE"],
            datasets: [{
              data: [avg, 100-avg],
              backgroundColor: [greenGrad(ctx), redGrad(ctx)],
              borderWidth: 0
            }]
          },
          options: {
            cutout: "72%",
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } }
          },
          plugins: [{
            id: "center",
            afterDatasetsDraw(chart){
              const d = chart.getDatasetMeta(0).data[0];
              if (!d) return;
              const cx = chart.ctx;
              cx.save();
              cx.textAlign = "center";
              cx.fillStyle = "#e5e7eb";
              cx.font = "700 30px Inter, system-ui";
              cx.fillText(`${avg}%`, d.x, d.y - 6);
              cx.font = "600 12px Inter, system-ui";
              cx.fillText("COMPLETE", d.x, d.y + 16);
              cx.restore();
            }
          }]
        });
      }

      function renderTable(l,u){
        tbody.innerHTML = "";
        const m = unitMap(l,u);
        TRADES.forEach(t => {
          const s = m[t] || "0%";
          const ts = localStorage.getItem(key(l,u,t)+":ts") || "";
          const tr = document.createElement("tr");
          tr.innerHTML = `<td>${t}</td><td><span class="badge">${s==="100%"?"COMPLETE":s}</span></td><td>${ts}</td>`;
          tbody.appendChild(tr);
        });
      }

      function renderLevelBar(l){
        const c = document.getElementById("levelBar");
        const ctx = c.getContext("2d");
        if (levelBar) levelBar.destroy();
        levelBar = new Chart(ctx, {
          type: "bar",
          data: { labels: UNITS, datasets: [{ data: levelAverages(l), backgroundColor: greenGrad(ctx), borderRadius: 10 }]},
          options: { plugins: { legend: { display:false }}, scales: { y: { beginAtZero:true, max:100 } } }
        });
      }

      function refresh(){
        const L = levelSelect.value || LEVELS[0];
        const U = unitSelect.value || UNITS[0];
        renderDonut(L,U);
        renderTable(L,U);
        renderLevelBar(L);
      }

      saveBtn.onclick = () => {
        save(levelSelect.value, unitSelect.value, tradeSelect.value, statusSelect.value);
        setTimeout(refresh, 0);
      };
      levelSelect.onchange = refresh;
      unitSelect.onchange = refresh;
      refresh();

      // --------- Robust PDF export (captures existing canvases) ----------
      document.getElementById("exportPdfBtn").addEventListener("click", async () => {
        try {
          const { jsPDF } = window.jspdf;
          const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
          const w = pdf.internal.pageSize.getWidth();
          const M = 24;

          // Header bar
          pdf.setFillColor(11,18,32);
          if (pdf.roundedRect) pdf.roundedRect(M, M, w - M*2, 56, 8, 8, "F"); else pdf.rect(M, M, w - M*2, 56, "F");

          // Logo if loaded
          const logo = document.getElementById("pdfLogoWhite");
          if (logo && (logo.complete || logo.naturalWidth)) {
            pdf.addImage(logo, "PNG", M+12, M+10, 40, 40);
          }

          // Title
          pdf.setTextColor(230);
          pdf.setFont("helvetica","bold");
          pdf.setFontSize(18);
          pdf.text("FITOUT PROGRESS — Report", M+60, M+34);
          pdf.setFont("helvetica","normal");
          pdf.setFontSize(11);
          pdf.text(`Level ${levelSelect.value} (all units) — ${new Date().toLocaleString()}`, M+60, M+54);

          // Grab existing canvases
          const donutCanvas = document.getElementById("unitDonut");
          const barCanvas   = document.getElementById("levelBar");

          let y = M + 80;

          // Donut card
          if (donutCanvas) {
            const img = donutCanvas.toDataURL("image/png", 1.0);
            pdf.setFillColor(15,23,42); pdf.setDrawColor(30,41,59);
            if (pdf.roundedRect) pdf.roundedRect(M, y, 340, 280, 8,8,"FD"); else pdf.rect(M, y, 340, 280, "FD");
            pdf.addImage(img, "PNG", M+20, y+20, 300, 240);
          }

          // Bar card
          if (barCanvas) {
            const img = barCanvas.toDataURL("image/png", 1.0);
            const cardX = M + 340 + 16;
            pdf.setFillColor(15,23,42); pdf.setDrawColor(30,41,59);
            if (pdf.roundedRect) pdf.roundedRect(cardX, y, w - cardX - M, 280, 8,8,"FD"); else pdf.rect(cardX, y, w - cardX - M, 280, "FD");
            pdf.addImage(img, "PNG", cardX+16, y+16, w - cardX - M - 32, 248);
          }

          pdf.save(`Fitout_Level${levelSelect.value}.pdf`);
        } catch (err) {
          console.error("PDF Export failed:", err);
          alert("PDF export failed. Please refresh and try again.");
        }
      });
      // -------------------------------------------------------------------
    }
  });
})();
