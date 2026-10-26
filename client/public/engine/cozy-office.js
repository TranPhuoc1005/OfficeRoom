/* Cozy Office v5: editable furniture and distance-driven sprite locomotion. */
window.$ = window.$ || (s => document.querySelector(s));
window.$$ = window.$$ || (s => [...document.querySelectorAll(s)]);
window.esc = window.esc || (v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
window.toast = (typeof window.toast === 'function') ? window.toast : (s => { console.log(s); const t = document.querySelector('#toast'); if (t) { t.textContent = s; t.classList.remove('hidden'); setTimeout(() => t.classList.add('hidden'), 4000); } });
window.data = window.data || { version: 1, agents: [], tasks: [] };

window.initCozyOffice = function() {
  'use strict';
  const room = document.querySelector('.office'), viewport = document.querySelector('.world-viewport');
  if (!room || !viewport) return;
  if (room.dataset.cozyInitialized) {
    window.updatePixelOffice?.();
    return;
  }
  room.dataset.cozyInitialized = 'true';
  room.classList.add('pixel-room');
  if (!room.querySelector('.sprite-world')) {
    room.innerHTML = '<div class="office-art"></div><div class="office-warmth"></div><div class="sprite-world"></div>';
  }
  const layer = room.querySelector('.sprite-world');
const atlas=new Image(),walkAtlas=new Image(),styleAtlas=new Image();atlas.src='/assets/characters-atlas.png';walkAtlas.src='/assets/walk-cycle.png';styleAtlas.src='/assets/character-styles.png';
const anWalkAtlas=new Image();anWalkAtlas.src='/assets/an-walk-full.png';let anWalkReady=false,anWalkMeta=null;anWalkAtlas.onload=()=>anWalkReady=true;fetch('/assets/an-walk-regions.json').then(r=>r.json()).then(m=>anWalkMeta=m);
const seatedAtlas=new Image();seatedAtlas.src='/assets/characters-seated.png';let seatedReady=false,seatedMeta=null;seatedAtlas.onload=()=>seatedReady=true;fetch('/assets/seated-regions.json').then(r=>r.json()).then(m=>seatedMeta=m);
let ready=false,walkReady=false,styleReady=false,spriteMeta=null,actors=new Map(),signature='',paused=matchMedia('(prefers-reduced-motion: reduce)').matches,last=0,selected=null,vw=0,vh=0;
const variants=['Tóc bob · cardigan','Kính tròn · sơ mi','Tai nghe · hoodie','Tóc búi · áo tím','Tóc lavender · bomber','Tóc vàng · blazer','Đuôi ngựa · hoodie','Tóc bạc · tai nghe'];
const variant=a=>{const v=Number.isInteger(a?.spriteVariant)?a.spriteVariant:Number.isInteger(a?.avatar?.spriteVariant)?a.avatar.spriteVariant:null;return v!==null&&v>=0&&v<8?v:Math.max(0,(data?.agents||[]).findIndex(x=>x.id===a?.id))%8;};
fetch('/assets/sprite-regions.json').then(r=>r.json()).then(m=>{spriteMeta=m;portraits();document.querySelectorAll('[data-outfit]').forEach(b=>paint(b.querySelector('canvas'),{spriteVariant:Number(b.dataset.outfit)}))});styleAtlas.onload=()=>{styleReady=true;portraits()};
function paint(canvas,a,direction='down',phase=0,moving=false,seated=false){
const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);if(!spriteMeta)return;
const v=variant(a),side=direction==='left'||direction==='right';let img,rect;
if(seated&&seatedReady&&seatedMeta){img=seatedAtlas;rect=seatedMeta[v][direction==='up'?1:direction==='down'?0:2]}else if(v===3&&moving&&anWalkReady&&anWalkMeta){img=anWalkAtlas;rect=anWalkMeta[Math.floor(phase)%4]}else if(v<4){if(!ready)return;if(moving&&walkReady&&v<3){img=walkAtlas;rect=spriteMeta.walk[v][Math.floor(phase)%8]}else{img=atlas;rect=spriteMeta.idle[v][moving?2+Math.floor(phase/2)%2:direction==='up'?1:side?2:0]}}
else{if(!styleReady)return;img=styleAtlas;rect=spriteMeta.styles[v-4][moving?2+Math.floor(phase/2)%2:direction==='up'?1:0]}
if(!rect)return;const [x,y,w,h]=rect,scale=Math.min(canvas.width*.86/w,canvas.height*(seated?.78:.94)/h),dw=w*scale,dh=h*scale;
c.save();c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';if(direction==='left'||(moving&&direction==='up')){c.translate(canvas.width,0);c.scale(-1,1)}c.drawImage(img,x,y,w,h,(canvas.width-dw)/2,canvas.height-dh,dw,dh);c.restore();
}
const agent = id => (window.data?.agents || []).find(a => a.id === id);
function portraits(){document.querySelectorAll('.agent-row,.team-card').forEach(el=>{const id=el.dataset.editAgent||el.querySelector('[data-edit-agent]')?.dataset.editAgent,a=agent(id),av=el.querySelector('.avatar');if(!a||!av)return;av.innerHTML='<canvas width="256" height="256" aria-hidden="true"></canvas>';paint(av.firstChild,a)})}
function select(a){if(window.officeLayout?.editing)return;selected=a.id;actors.forEach(x=>x.button.classList.toggle('selected',x.agent.id===a.id));if(typeof window.onSelectAgent==='function'){window.onSelectAgent(a.agent||a);return}const chip=$('#selectionChip');if(chip){chip.innerHTML='<strong>'+esc(a.name)+'</strong><small>'+esc(a.role)+'</small>';chip.classList.remove('hidden')}if($('#cozyTip'))$('#cozyTip').classList.add('hidden');if(typeof taskForm==='function')taskForm(null,a.id)}
function statusOf(a){return (data?.tasks||[]).some(t=>t.agentId===a.id&&t.status==='doing')?'doing':(data?.tasks||[]).some(t=>t.agentId===a.id&&t.status==='review')?'review':'idle'}
function update(){window.officeReports?.sync();portraits();window.gameSyncHud?.();const list=(data?.agents||[]).slice(0,8),key=list.map(a=>a.id+a.name+a.role+variant(a)+JSON.stringify(a.appearance)+a.personality+String(a.showThoughts)).join('|');if(key===signature){for(const a of actors.values()){const status=statusOf(a.agent);if(status!==a.status){a.path=[];a.wait=0;a.goal=null;a.seated=false;a.workIssue=null}a.status=status}return}signature=key;const previous=actors;actors=new Map();layer.querySelectorAll('.cozy-actor').forEach(e=>e.remove());list.forEach((ag,i)=>{const b=document.createElement('button');b.className='cozy-actor';b.setAttribute('aria-label','Giao việc cho '+ag.name);b.title=ag.name+' — '+ag.role;b.innerHTML='<canvas width="256" height="256" aria-hidden="true"></canvas><span class="actor-name"></span><span class="actor-state hidden"></span><span class="actor-thought hidden"></span>';b.querySelector('.actor-name').textContent=ag.name;b.onclick=()=>select(ag);layer.append(b);const old=previous.get(ag.id),a={agent:ag,index:i,x:old?.x??vw*(.35+i*.1),y:old?.y??vh*.75,dir:old?.dir??'down',wait:old?.wait??i*.8,path:[],phase:0,button:b,canvas:b.querySelector('canvas'),status:statusOf(ag),goal:null,seated:false,workIssue:null,life:old?.life||restoreLife(ag.id,i),activityPoint:null,activityDir:'down'};actors.set(ag.id,a);paint(a.canvas,ag);position(a)});if(selected&&!actors.has(selected)){$('#selectionChip')?.classList.add('hidden');selected=null}}
function resize(){const r=viewport.getBoundingClientRect();if(r.width<1||r.height<1)return;const ow=vw,oh=vh;vw=r.width;vh=r.height;window.officeLayout?.resize();actors.forEach(a=>{if(ow&&oh){a.x=a.x/ow*vw;a.y=a.y/oh*vh}a.path=[];a.goal=null;a.seated=false;a.activityPoint=null;a.workIssue=null;if(a.life)OfficeLife.cancel(a.life);position(a)});resizeEntrance()}
function position(a){const s=vw<650?60:Math.max(70,Math.min(94,vw/20));const leisureSeat=a.life?.current&&a.life.elapsed>0&&a.activityPoint?.seated;const px=leisureSeat?a.activityPoint.seatX:a.x,py=leisureSeat?a.activityPoint.seatY:a.y;a.button.style.left=px+'px';a.button.style.top=py+'px';a.button.style.width=s+'px';a.button.style.height=s+'px';a.button.style.zIndex=String(leisureSeat?a.activityPoint.depth:101+Math.round(a.y));a.button.classList.toggle('seated',!!a.seated);a.button.title=a.agent.name+' — '+(a.workIssue||(a.status==='doing'&&a.seated?'Đang ngồi làm việc':a.life?.current?lifeNames[a.life.current.key]:a.agent.role));a.button.classList.toggle('selected',a.agent.id===selected);const tag=a.button.querySelector('.actor-state');tag.classList.toggle('hidden',a.status==='idle');tag.textContent=a.printState==='printing'?'▤':a.printState==='walking'?'↗':a.workIssue?'!':a.seated?'⌨':a.status==='doing'?'↗':'!';const activity=a.life?.current;tag.classList.toggle('life-state',!!activity&&a.status!=='doing'&&!a.printState);if(activity&&a.status!=='doing'&&!a.printState)tag.textContent=({tea:'☕',rest:'z',game:'＋',phone:'▯',music:'♪',restroom:'WC',wander:'·'})[activity.key];tag.classList.toggle('hidden',a.status==='idle'&&!a.printState&&!activity);const thought=a.button.querySelector('.actor-thought');const show=activity&&a.agent.showThoughts!==false&&a.status!=='doing'&&!a.printState&&a.life.elapsed<5;thought.classList.toggle('hidden',!show);thought.textContent=show?OfficeLife.rules[activity.key].thought:'';a.button.dataset.activity=activity?.key||'';const priv=window.officeLayout?.privateRoom(a.x,a.y);a.button.classList.toggle('private-room-occupant',!!priv);window.officeLayout?.setRoomOccupancy(a.agent.id,priv?.roomId||null);a.button.classList.toggle('in-restroom',activity?.key==='restroom'&&a.life.elapsed>0);}
const toggle=$('#motionToggle');function controls(){if(!toggle)return;toggle.textContent=paused?'▶':'Ⅱ';toggle.setAttribute('aria-pressed',String(paused));toggle.setAttribute('aria-label',paused?'Tiếp tục hoạt ảnh':'Tạm dừng hoạt ảnh');toggle.title=paused?'Tiếp tục hoạt ảnh':'Tạm dừng hoạt ảnh'}if(toggle)toggle.onclick=()=>{paused=!paused;controls();if(paused)actors.forEach(a=>{a.button.classList.remove('walking');paint(a.canvas,a.agent,a.dir,a.phase,false,a.seated)})};controls();
window.setCozyPaused = function(p) {
  paused = Boolean(p);
  controls();
  if (paused) {
    actors.forEach(a => {
      a.button.classList.remove('walking');
      paint(a.canvas, a.agent, a.dir, a.phase, false, a.seated);
    });
  }
};
if(typeof window.agentForm==='function'){const originalAgentForm=window.agentForm;window.agentForm=id=>{originalAgentForm(id);const form=$('#agentForm');if(!form)return;const source=id?agent(id):null;let chosen=source?variant(source):data.agents.length%8;const beforeIds=new Set(data.agents.map(a=>a.id)),group=document.createElement('section');group.className='character-editor original-art';
group.innerHTML='<h3>Nhân vật chibi gốc</h3><p>Giữ nguyên nét vẽ và tỉ lệ của bộ đã chọn trước đó.</p><div class="character-studio-main"><div class="character-preview"><canvas width="240" height="300" aria-label="Xem trước nhân vật chibi gốc"></canvas><button type="button" id="previewWalk" aria-pressed="true">Đang đi bộ</button></div><div class="original-choices"></div></div><div class="life-settings"><label>Tính cách lúc rảnh<select id="aPersonality"><option value="balanced">Cân bằng</option><option value="social">Thích giao lưu</option><option value="gamer">Thích chơi game</option><option value="quiet">Trầm tính, thích âm nhạc</option></select></label><label>Bong bóng tâm trạng<select id="aThoughts"><option value="yes">Hiện khi đang nghỉ</option><option value="no">Ẩn</option></select></label></div><p>Phối tóc, áo, quần riêng theo đúng nét chibi này cần bộ ảnh tách lớp đồng bộ; hiện chưa áp dụng bộ phối pixel khác vào nhân vật gốc.</p>';
form.insertBefore(group,form.firstChild);variants.forEach((name,i)=>{const b=document.createElement('button');b.type='button';b.className='original-choice';b.dataset.outfit=i;b.setAttribute('aria-label','Chọn '+name);b.setAttribute('aria-pressed',String(i===chosen));b.innerHTML='<canvas width="180" height="220" aria-hidden="true"></canvas><small>'+esc(name)+'</small>';paint(b.querySelector('canvas'),{spriteVariant:i});b.onclick=()=>{chosen=i;group.querySelectorAll('[data-outfit]').forEach(x=>x.setAttribute('aria-pressed',String(Number(x.dataset.outfit)===i)))};group.querySelector('.original-choices').append(b)});
$('#aPersonality').value=source?.personality||'balanced';$('#aThoughts').value=source?.showThoughts===false?'no':'yes';let walking=!matchMedia('(prefers-reduced-motion: reduce)').matches;$('#previewWalk').setAttribute('aria-pressed',String(walking));$('#previewWalk').textContent=walking?'Đang đi bộ':'Đứng yên';$('#previewWalk').onclick=()=>{walking=!walking;$('#previewWalk').setAttribute('aria-pressed',String(walking));$('#previewWalk').textContent=walking?'Đang đi bộ':'Đứng yên'};
const preview=group.querySelector('.character-preview canvas');function frame(t){if(!form.isConnected||!$('#modal').open)return;paint(preview,{spriteVariant:chosen},walking?'right':'down',t/105,walking);requestAnimationFrame(frame)}requestAnimationFrame(frame);
form.addEventListener('submit',()=>{const look=chosen,personality=$('#aPersonality').value,thoughts=$('#aThoughts').value==='yes';queueMicrotask(()=>{if($('#modal').open)return;const a=id?agent(id):data.agents.find(x=>!beforeIds.has(x.id));if(a){a.spriteVariant=look;a.personality=personality;a.showThoughts=thoughts;if(typeof window.save==='function')window.save()}})})};}
const entrance=$('#entrance'),scene=$('#entranceScene');let welcomeMode='login';
function resizeEntrance(){if(!scene)return;const w=innerWidth,h=innerHeight,ratio=1672/941,scale=Math.max(w/1672,h/941),sw=1672*scale,sh=941*scale;scene.style.width=sw+'px';scene.style.height=sh+'px';scene.style.left=((w<800)?(w-sw)*.33:(w-sw))+'px';scene.style.top=(h-sh)/2+'px';}
function openOffice(){if(entrance){entrance.classList.add('leaving');document.body.classList.remove('full-intro');setTimeout(()=>{entrance.classList.add('hidden');entrance.classList.remove('leaving')},matchMedia('(prefers-reduced-motion: reduce)').matches?0:450);}window.gameOpenPanel?.('office');resize();toast('Chào mừng về văn phòng · Bản xem thiết kế')}
function openReception(){if(!entrance)return;entrance.classList.remove('hidden','leaving');document.body.classList.add('full-intro');setWelcome('login');resizeEntrance()}
function setWelcome(mode){welcomeMode=mode;if(!$('#welcomeTitle'))return;$('#welcomeTitle').textContent=mode==='register'?'Mở văn phòng mới':mode==='reset'?'Tìm lại chìa khóa':'Vào văn phòng';$('#welcomeSub').textContent=mode==='register'?'Một góc nhỏ cho những ý tưởng lớn.':mode==='reset'?'Cùng trở lại với đội của bạn.':'Một ngày mới, cùng đội của bạn.';if($('#enterOffice'))$('#enterOffice').innerHTML=mode==='login'?'Vào văn phòng mẫu <span>→</span>':'Khám phá văn phòng mẫu <span>→</span>';$('#backWelcome')?.classList.toggle('hidden',mode==='login');$('#createPreview')?.classList.toggle('hidden',mode!=='login');const rf=document.querySelector('.reception-form');if(rf)rf.dataset.mode=mode;$('#officeNameBlock')?.classList.toggle('hidden',mode!=='register');$('#previewPasswordBlock')?.classList.toggle('hidden',mode==='reset');$('#forgotPreview')?.classList.toggle('hidden',mode!=='login');if(mode==='reset'){$('#previewAuthNote')&&($('#previewAuthNote').textContent='Bản minh họa · Luồng khôi phục sẽ dùng Auth của app thật.')}else if($('#previewAuthNote'))$('#previewAuthNote').textContent='Bản xem giao diện · Không nhập tài khoản thật';}
if($('#enterOffice'))$('#enterOffice').onclick=openOffice;if($('#skipEntrance'))$('#skipEntrance').onclick=openOffice;if($('#returnReception'))$('#returnReception').onclick=openReception;if($('#createPreview'))$('#createPreview').onclick=()=>setWelcome('register');if($('#forgotPreview'))$('#forgotPreview').onclick=()=>setWelcome('reset');if($('#backWelcome'))$('#backWelcome').onclick=()=>setWelcome('login');if($('#showPassword'))$('#showPassword').onclick=()=>{const el=$('#previewPassword');if(el){const show=el.type==='password';el.type=show?'text':'password';$('#showPassword').setAttribute('aria-label',show?'Ẩn mật khẩu minh họa':'Hiện mật khẩu minh họa')}};
if($('#fullscreen'))$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{toast('Trình duyệt chưa bật chế độ toàn màn hình.')}};
if(entrance)for(let i=0;i<5;i++){const leaf=document.createElement('i');leaf.className='leaf-particle';leaf.style.left=(8+i*14)+'%';leaf.style.top='-20px';leaf.style.animationDelay=(-i*2.7)+'s';leaf.style.animationDuration=(12+i*2)+'s';entrance.append(leaf)}


atlas.onload=()=>{ready=true;update();actors.forEach(a=>paint(a.canvas,a.agent,a.dir))};walkAtlas.onload=()=>walkReady=true;
atlas.onerror=walkAtlas.onerror=()=>toast('Chưa tải được bộ hình nhân vật. Hãy tải lại trang.');
window.updatePixelOffice=update;window.addEventListener('resize',resize);const officeSizeObserver=new ResizeObserver(()=>resize());officeSizeObserver.observe(viewport);
window.addEventListener('office-layout-change',()=>actors.forEach(a=>{a.path=[];a.goal=null;a.wait=0;a.seated=false;a.workIssue=null;if(a.life)OfficeLife.cancel(a.life);a.activityPoint=null}));
const lifeNames={tea:'Uống trà',rest:'Nghỉ trên sofa',game:'Chơi game',phone:'Bấm điện thoại',music:'Nghe nhạc',restroom:'Đi vệ sinh',wander:'Đi dạo'};let savedLife={};try{savedLife=JSON.parse(localStorage.getItem('pixel-office-life-v9')||'{}')}catch{}
function restoreLife(id,i){const st=OfficeLife.create(id,i*17),saved=savedLife[id];if(saved&&saved.needs)for(const k of Object.keys(st.needs))if(Number.isFinite(saved.needs[k]))st.needs[k]=Math.max(0,Math.min(100,saved.needs[k]));return st}
const lifeButton=document.createElement('button');lifeButton.id='lifeOverview';lifeButton.textContent='Xem sinh hoạt & nhu cầu';const sv=document.querySelector('#settingsView');if(sv)sv.append(lifeButton);lifeButton.onclick=()=>{const labels={energy:'Năng lượng',comfort:'Thoải mái',fun:'Giải trí',social:'Kết nối',hygiene:'Vệ sinh'};modal('Sinh hoạt trong văn phòng','<p class=help>Mô phỏng tại thời điểm mở bảng. Công việc thật và báo cáo được ưu tiên; nhu cầu không làm thay đổi kết quả task.</p>'+[...actors.values()].map(a=>'<section class=life-card><b>'+esc(a.agent.name)+'</b><small>'+esc(a.status==='doing'?'Đang làm việc':lifeNames[a.life.current?.key]||'Đang nghỉ')+'</small>'+Object.entries(a.life.needs).map(([k,v])=>'<label>'+labels[k]+'<meter min=0 max=100 value='+Math.round(v)+'></meter><span>'+Math.round(v)+'</span></label>').join('')+'</section>').join(''))};
function saveLife(){const next={};actors.forEach(a=>next[a.agent.id]={needs:a.life.needs});try{localStorage.setItem('pixel-office-life-v9',JSON.stringify(next))}catch{}}
setInterval(saveLife,15000);addEventListener('pagehide',saveLife);
function cancelIdle(a){OfficeLife.cancel(a.life);a.activityPoint=null;a.seated=false;a.path=[];a.wait=0;a.goal=null}
function occupied(id,except){return [...actors.values()].some(a=>a!==except&&a.life?.current?.objectId===id)}
function chooseIdle(a,layout,nav){
 const choices=OfficeLife.choices(a.life,a.agent.personality,k=>!OfficeLife.rules[k].objects.length||layout.activityPlaces(k,a.agent.id).some(p=>!occupied(p.objectId,a)));
 for(const {key} of choices){const rule=OfficeLife.rules[key];let targets=rule.objects.length?layout.activityPlaces(key,a.agent.id).filter(p=>!occupied(p.objectId,a)).sort((p,q)=>Math.hypot(p.x-a.x,p.y-a.y)-Math.hypot(q.x-a.x,q.y-a.y)):[{...nav.nearest(a.x,a.y),objectId:null,direction:'down',seated:false}];if(key==='wander'){const goal=layout.randomFloor();targets=goal?[{...goal}]:[]}
 for(const target of targets){if(!Number.isFinite(target.x)||!Number.isFinite(target.y))continue;const path=nav.path(a.x,a.y,target.x,target.y);if(!path.length&&Math.hypot(a.x-target.x,a.y-target.y)>Math.max(vw/48,vh/32))continue;a.life.current={key,objectId:target.objectId||null};a.life.elapsed=0;a.activityPoint=target;a.path=path;a.path.push({x:target.x,y:target.y});a.goal=target;a.seated=false;return true}}
 a.wait=1;return false;
}
function idle(a,layout,nav,dt){OfficeLife.decay(a.life,dt);const cur=a.life.current;if(cur){if(a.path.length)return;if(!a.activityPoint){cancelIdle(a);return}a.life.elapsed+=dt;a.seated=!!a.activityPoint.seated;a.dir=a.activityPoint.direction||'down';if(a.life.elapsed>=OfficeLife.rules[cur.key].duration){OfficeLife.finish(a.life);a.activityPoint=null;a.seated=false;a.wait=2}return}if(a.life.cooldown<=0)chooseIdle(a,layout,nav)}
resize();update();document.body.classList.remove('full-intro');if(new URLSearchParams(location.search).get('view')==='office'&&entrance){entrance.classList.add('hidden');}
function workIssue(a,reason){if(a.workIssue!==reason)toast(a.agent.name+': '+reason);a.workIssue=reason}
function tick(now){if(!room.isConnected)return;const dt=Math.min((now-last)/1000||0,.05);last=now;const layout=window.officeLayout;
const isIntro=Boolean(entrance&&document.body.classList.contains('full-intro'));
if(!paused&&!document.hidden&&!isIntro&&!layout?.editing)for(const a of actors.values()){
let moving=false;const nav=layout?.navigation(a.agent.id);if(!nav)continue;const printJob=window.officeReports?.claim(a.agent.id);a.printState=printJob?'walking':null;if(printJob&&a.printJobId!==printJob.id){a.printJobId=printJob.id;a.seated=false;a.workIssue=null;a.path=[];a.wait=0;a.goal=null}if(!printJob)a.printJobId=null;if((printJob||a.status==='doing')&&a.life.current)cancelIdle(a);
if(nav.blocked(a.x,a.y)){const free=nav.nearest(a.x,a.y);if(free){a.x=free.x;a.y=free.y;a.path=[];a.goal=null}}
if(a.status!=='doing'&&!printJob){idle(a,layout,nav,dt)}if(a.wait>0)a.wait-=dt;
else if(!a.path.length){
if(printJob){const target=layout.printer();if(target){const near=Math.hypot(a.x-target.x,a.y-target.y)<14;if(near){a.printState='printing';if(window.officeReports.advance(printJob.id,dt)){a.wait=1.5}}else{a.path=nav.path(a.x,a.y,target.x,target.y);a.goal=target;if(!a.path.length)a.wait=.7}}else a.wait=1}
else if(a.status==='doing'){
const st=layout.workstation(a.agent.id);if(!st.ok){workIssue(a,st.reason);a.seated=false;a.wait=1}
else if(nav.blocked(st.seat.x,st.seat.y)){workIssue(a,'Ghế bị đồ vật khác chặn');a.seated=false;a.wait=1}
else if(Math.hypot(a.x-st.seat.x,a.y-st.seat.y)<2){a.seated=true;a.dir=st.direction;a.workIssue=null;a.wait=.1}
else{a.seated=false;a.workIssue=null;const path=nav.path(a.x,a.y,st.seat.x,st.seat.y);if(path.length||Math.hypot(a.x-st.seat.x,a.y-st.seat.y)<Math.max(vw/48,vh/32)){path.push(st.seat);a.path=path;a.goal=st.seat}else{workIssue(a,'Không có đường tới ghế');a.wait=1}}
}
else if(!a.life.current&&a.life.cooldown<=0)chooseIdle(a,layout,nav)
}
let distance=0,remaining=(vw<650?37:67)*dt;
while(a.path.length&&remaining>0){const p=a.path[0],dx=p.x-a.x,dy=p.y-a.y,d=Math.hypot(dx,dy);if(d<.01){a.path.shift();continue}moving=true;const step=Math.min(d,remaining);a.x+=dx/d*step;a.y+=dy/d*step;distance+=step;remaining-=step;a.dir=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up';if(d<=step+.001){a.path.shift();if(!a.path.length){a.wait=printJob?0:a.status==='doing'?.4:0;if(a.status==='doing')a.dir='up'}}}
// Frames follow distance, so pausing or a slow frame cannot slide the feet.
a.phase+=distance/(vw<650?4.8:7);if(!moving&&a.life.current)a.phase+=dt*3;a.button.classList.toggle('walking',moving);paint(a.canvas,a.agent,a.dir,a.phase,moving,a.seated);position(a)
}requestAnimationFrame(tick)}requestAnimationFrame(tick);
};
if (typeof document !== 'undefined' && document.querySelector('.office')) {
  window.initCozyOffice();
}
