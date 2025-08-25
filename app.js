
const levelSelect=document.getElementById('levelSelect');
const unitSelect=document.getElementById('unitSelect');
const tradeSelect=document.getElementById('tradeSelect');
const statusSelect=document.getElementById('statusSelect');
const saveBtn=document.getElementById('saveBtn');
const tbody=document.querySelector('#tradeTable tbody');
const summaryText=document.getElementById('summaryText');

const levels=['1','2','3','4','5','6','7','8'];
const units=['01','02','03','04','05','06','07','08','09','10','11','12'];
const trades=['Sheeting','Setting + Sanding','Paint - Sealer Coat','Plaster - Defects','Paint - 1st & 2nd Coat','Waterproof - Primed','Waterproof - Membrane 1st Coat','Waterproof - Flood Test','Waterproof - Screed','Waterproof - Membrane 2nd Coat','Joinery - 1st pass','Tiling - Bathroom - Floors','Tiling - Bathroom - Walls','Tiling - Grout','Joinery - Stone','Plumbing - Fitoff','Electrical - Fitoff','Flooring'];
const statuses=['0%','10%','20%','30%','40%','50%','60%','70%','80%','90%','100%'];

function fill(sel,arr){sel.innerHTML=arr.map(v=>`<option>${v}</option>`).join('')}
fill(levelSelect,levels);fill(unitSelect,units);fill(tradeSelect,trades);fill(statusSelect,statuses);

function key(l,u,t){return `cprog:${l}|${u}|${t}`}
function save(l,u,t,s){localStorage.setItem(key(l,u,t),s)}

function read(l,u){const out={};trades.forEach(t=>{const v=localStorage.getItem(key(l,u,t));if(v)out[t]=v});return out}

let donut;
function render(l,u){
  tbody.innerHTML='';
  const map=read(l,u);
  let total=0;
  trades.forEach(t=>{
    const s=map[t]||'0%';total+=parseInt(s);
    tbody.innerHTML+=`<tr><td>${t}</td><td>${s}</td></tr>`;
  });
  const avg=Math.round(total/trades.length);
  summaryText.textContent=`Average completion: ${avg}%`;
  if(donut)donut.destroy();
  const ctx=document.getElementById('unitDonut').getContext('2d');
  donut=new Chart(ctx,{type:'doughnut',data:{labels:['Done','Remaining'],datasets:[{data:[avg,100-avg]}]}})
}
saveBtn.onclick=()=>{save(levelSelect.value,unitSelect.value,tradeSelect.value,statusSelect.value);render(levelSelect.value,unitSelect.value)};
levelSelect.onchange=()=>render(levelSelect.value,unitSelect.value);
unitSelect.onchange=()=>render(levelSelect.value,unitSelect.value);
render(levelSelect.value,unitSelect.value);
