/* Task output -> printer delivery -> immutable readable report.
   Production: feed real completed task output through enqueue(), keep runner external. */
(()=>{'use strict';
const agent = id => (window.data?.agents || []).find(a => a.id === id);
window.agent = window.agent || agent;
const KEY='pixel-office-reports-v6';let reports=[],active=null,elapsed=0;
try{const raw=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(raw))reports=raw.filter(r=>r&&['id','taskId','agentId','title','content','created'].every(k=>typeof r[k]==='string')).map(r=>({...r,state:r.state==='published'?'published':'queued'}))}catch{}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(reports))}catch{toast('Chưa lưu được báo cáo trên máy; hãy tải nội dung để giữ bản sao.')}}
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(36)}
function enqueue(task){const content=String(task.result||'').trim();if(!content)return null;const id=task.id+':'+hash(content);const old=reports.find(r=>r.id===id&&r.content===content);if(old)return old;const r={id,taskId:task.id,agentId:task.agentId,agentName:agent(task.agentId)?.name||'Agent',title:task.title,content,created:new Date().toISOString(),state:'queued'};reports.push(r);persist();badge();return r}
function markReady(t){t.reportReadyHash=hash(String(t.result||'').trim())}
function sync(){const tasks=window.data?.tasks||[];for(const t of tasks){const res=String(t?.result||'').trim();if(['review','done'].includes(t.status)&&res){if(!t.reportReadyHash)markReady(t);if(t.reportReadyHash===hash(res))enqueue(t)}}badge()}
function badge(){const b=document.querySelector('#reportsButton');if(b){const count=reports.filter(r=>r.state==='published').length;let s=b.querySelector('span:last-of-type')||b.querySelector('span:last-child');if(!s){s=document.createElement('span');b.appendChild(s)}s.textContent=count?'Báo cáo · '+count:'Báo cáo'}}
function claim(agentId){if(!window.officeLayout?.printer())return null;const agents=window.data?.agents||[];if(active){const r=reports.find(r=>r.id===active);if(r&&agents.some(a=>a.id===r.agentId))return r.agentId===agentId?r:null;active=null;elapsed=0}const r=reports.find(r=>r.state==='queued'&&agents.some(a=>a.id===r.agentId));if(!r||r.agentId!==agentId)return null;active=r.id;elapsed=0;return r}
function advance(id,dt){if(id!==active)return false;elapsed+=dt;if(elapsed<1.4)return false;const r=reports.find(r=>r.id===id);if(!r)return false;r.state='published';r.publishedAt=new Date().toISOString();active=null;elapsed=0;persist();badge();toast(r.agentName+' đã xuất báo cáo · Mở máy in hoặc mục Báo cáo');window.dispatchEvent(new CustomEvent('office-report-published',{detail:{reportId:r.id,taskId:r.taskId}}));return true}
function reportText(r){return r.title+'\n'+r.agentName+' · '+(r.publishedAt||r.created)+'\n\n'+r.content}
function download(r){const url=URL.createObjectURL(new Blob([reportText(r)],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='bao-cao-'+r.taskId.replace(/[^a-z0-9_-]/gi,'').slice(0,60)+'.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function detail(id){const r=reports.find(r=>r.id===id&&r.state==='published');if(!r)return;modal('Báo cáo · '+r.title,'<div class="report-meta">'+esc(r.agentName)+' · '+esc(new Date(r.publishedAt).toLocaleString('vi-VN'))+'</div><p class="help">Nội dung kết quả được lưu nguyên văn từ task.</p><div class="printed-report"></div><div class="modal-actions"><button id="backReports">← Danh sách</button><button id="copyReport">Sao chép</button><button id="downloadReport" class="primary">Tải báo cáo .txt</button></div>');const pr=document.querySelector('.printed-report');if(pr)pr.textContent=r.content;const bBack=$('#backReports');if(bBack)bBack.onclick=open;const bDl=$('#downloadReport');if(bDl)bDl.onclick=()=>download(r);const bCp=$('#copyReport');if(bCp)bCp.onclick=async()=>{try{await navigator.clipboard.writeText(reportText(r));toast('Đã sao chép báo cáo')}catch{toast('Không sao chép tự động được; bạn có thể tải báo cáo .txt.')}}}
function open(){sync();const printer=!!window.officeLayout?.printer();modal('Máy in & báo cáo','<p class="help">'+(printer?'Agent mang kết quả tới máy in sau khi task có đầu ra hoàn tất.':'Chưa có máy in. Thêm Máy in báo cáo trong kho đồ để xuất các báo cáo đang chờ.')+'</p><div id="reportList"></div>');const list=$('#reportList');if(!list)return;if(!reports.length){list.innerHTML='<div class="empty">Chưa có báo cáo. Bản xem thử: giao task → lưu kết quả và gửi duyệt. Trong app thật, dùng đầu ra task từ runner.</div>';return}for(const r of [...reports].reverse().slice(0,100)){const b=document.createElement('button');b.className='report-row';b.disabled=r.state!=='published';b.innerHTML='<span class="report-symbol">▤</span><span><strong></strong><small></small></span><em></em>';b.querySelector('strong').textContent=r.title;b.querySelector('small').textContent=r.agentName;b.querySelector('em').textContent=r.state==='published'?'Xem báo cáo ↗':r.id===active?'Đang chuyển tới máy in…':'Đang chờ máy in';b.onclick=()=>detail(r.id);list.append(b)}}
window.addEventListener('office-report-published',()=>{if(document.querySelector('#modal')?.open&&document.querySelector('#reportList'))open()});
window.officeReports={sync,markReady,enqueue,claim,advance,open,detail};
const repBtn = document.querySelector('#reportsButton');
if (repBtn) repBtn.onclick=()=>{window.officeLayout?.setEditing(false);open()};
document.addEventListener('click', e => {
  if (e.target.closest('#reportsButton')) {
    window.officeLayout?.setEditing(false);
    open();
  }
});
badge();
})();
