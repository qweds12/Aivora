const tools=[
["video","🎬","Video Studio","سيناريو وإعلانات ومشاهد فيديو"],
["image","🖼️","Image Studio","وصف احترافي لتوليد الصور"],
["social","📱","Social Studio","منشورات وحملات للسوشيال"],
["prompt","🧠","Prompt Builder","برومبتات احترافية"],
["cv","📄","CV Builder","سيرة ذاتية ورسالة تقديم"],
["idea","💡","Business Ideas","أفكار مشاريع ومنتجات"]
];
let selected="prompt";
const row=document.querySelector("#toolButtons"),cards=document.querySelector("#cards");
tools.forEach(([id,ico,name,desc])=>{
 const b=document.createElement("button"); b.textContent=ico+" "+name;b.onclick=()=>selectTool(id,b);row.appendChild(b);
 const c=document.createElement("article");c.className="card";c.innerHTML=`<div class="ico">${ico}</div><h3>${name}</h3><p>${desc}</p>`;c.onclick=()=>{selectTool(id,b);document.querySelector("#input").focus()};cards.appendChild(c);
});
selectTool("prompt",row.children[3]);
function selectTool(id,b){selected=id;[...row.children].forEach(x=>x.classList.remove("active"));b.classList.add("active")}
document.querySelector("#create").onclick=async()=>{
 const input=document.querySelector("#input").value.trim(), out=document.querySelector("#output");
 if(!input){out.innerHTML='<div class="result">اكتب طلبك أولاً.</div>';return}
 out.innerHTML='<div class="result">⏳ جاري إنشاء النتيجة...</div>';
 try{
  const r=await fetch("/api/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({tool:selected,input,language:document.querySelector("#lang").value})});
  const d=await r.json(); if(!r.ok) throw Error(d.error||"Error");
  out.innerHTML=`<div class="result"><h3>✨ ${d.result.title}</h3>${d.result.sections.map(s=>`<section><b>${escapeHtml(s.title)}</b><p>${escapeHtml(s.text).replace(/\n/g,"<br>")}</p></section>`).join("")}<small>Mode: ${d.mode} · Cost: ${d.credits} Credits</small></div>`;
  saveProject(input,d.result.title); updateStats();
 }catch(e){out.innerHTML=`<div class="result">⚠️ ${escapeHtml(e.message)}</div>`}
};
document.querySelectorAll("[data-plan]").forEach(b=>b.onclick=async()=>{const plan=b.dataset.plan;if(plan==="free"){localStorage.setItem("plan","Free");updateStats();return}const r=await fetch("/api/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({plan})});const d=await r.json();alert(d.message||"Checkout")});
document.querySelector("#login").onclick=()=>alert("تسجيل الدخول الحقيقي يحتاج Supabase Auth أو مزود هوية متصل في الإنتاج.");
function saveProject(input,title){const a=JSON.parse(localStorage.getItem("projects")||"[]");a.unshift({input,title,date:new Date().toISOString()});localStorage.setItem("projects",JSON.stringify(a))}
function updateStats(){document.querySelector("#projects").textContent=JSON.parse(localStorage.getItem("projects")||"[]").length;document.querySelector("#plan").textContent=localStorage.getItem("plan")||"Free"}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
updateStats();
