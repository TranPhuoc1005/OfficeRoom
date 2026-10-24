/* Original procedural pixel art; no external images or dependencies. */
(()=>{
const room=document.querySelector('.office');
room.classList.add('pixel-room');
room.innerHTML='<div class="pixel-stage"><canvas class="room-art" width="480" height="300" aria-hidden="true"></canvas><div class="pixel-actors"></div></div><div class="pixel-caption"><span>✦ Bấm nhân vật để giao việc · Chuyển động minh họa</span><button class="small" id="motionToggle" aria-pressed="false">Ⅱ Tạm dừng</button></div>';
const art=room.querySelector('.room-art'),g=art.getContext('2d'),layer=room.querySelector('.pixel-actors'),toggle=room.querySelector('#motionToggle');
g.imageSmoothingEnabled=false;
let actors=new Map(),paused=matchMedia('(prefers-reduced-motion: reduce)').matches,last=0,layout='';
function rect(x,y,w,h,c){g.fillStyle=c;g.fillRect(x,y,w,h)}
function plant(x,y){rect(x-6,y,12,9,'#aa7259');rect(x-8,y-3,16,4,'#c58e69');rect(x-1,y-20,3,19,'#50704a');rect(x-9,y-17,8,6,'#72935c');rect(x+1,y-23,7,7,'#61834e');rect(x-6,y-26,7,6,'#88a669');rect(x+3,y-12,8,5,'#779956')}
function desk(x,y){rect(x-35,y+8,70,31,'#9b7959');rect(x-35,y+3,70,31,'#bd956a');rect(x-33,y+3,66,3,'#e0ba82');rect(x-33,y+33,5,9,'#765a48');rect(x+28,y+33,5,9,'#765a48');rect(x-13,y+8,25,17,'#41504b');rect(x-11,y+10,21,12,'#8bb3a0');rect(x-9,y+12,17,2,'#d4e3b3');rect(x-9,y+16,10,2,'#b4cc9e');rect(x-2,y+25,4,4,'#526b5f');rect(x-9,y+28,18,3,'#e1d7af');rect(x+20,y+21,7,7,'#f7e5bc');rect(x+27,y+22,3,4,'#d7bc95');rect(x-29,y+16,10,13,'#e4d4a4');rect(x-27,y+19,6,1,'#b3a17d');rect(x-27,y+22,6,1,'#b3a17d');rect(x-10,y+45,20,12,'#6b8069');rect(x-12,y+43,24,5,'#8e9c7d')}
function drawRoom(n){g.clearRect(0,0,480,300);rect(0,0,480,300,'#b39978');rect(7,7,466,282,'#c5ae8e');for(let y=49;y<288;y+=15){rect(8,y,464,1,'#b7a183');for(let x=8+(Math.floor(y/15)%2)*30;x<473;x+=60)rect(x,y,1,15,'#b7a183')}
rect(7,7,466,40,'#e3dfc5');rect(7,44,466,6,'#9b8264');rect(7,7,466,3,'#f7f0d7');
for(let x=65;x<400;x+=116){rect(x,12,80,28,'#a3b8aa');rect(x+3,15,74,21,'#bcd4c8');rect(x+6,17,18,3,'#e3edce');rect(x+37,12,3,26,'#f7eed4');rect(x-3,39,86,5,'#be9c70')}
plant(29,44);plant(451,44);
rect(15,64,22,68,'#886d52');rect(17,66,18,64,'#aa8960');for(let j=0;j<3;j++){rect(17,85+j*19,18,3,'#6e5d48');for(let i=0;i<4;i++)rect(19+i*4,70+j*19,3,14,['#7f9974','#c9b47d','#9fa9ad','#a87860'][i])}
rect(443,75,22,38,'#9b8366');rect(441,70,26,8,'#d4b28a');rect(446,78,15,20,'#e9d9b3');rect(449,80,9,10,'#495f50');rect(449,92,7,4,'#b08656');rect(444,112,20,3,'#735d49');
rect(57,65,366,173,'#a8b398');rect(60,68,360,167,'#b9c2a6');rect(63,71,354,161,'#b2bda0');for(let x=64;x<418;x+=8){rect(x,71,3,2,'#d0d3b2');rect(x,229,3,2,'#d0d3b2')}
const cols=n>4?4:2;for(let i=0;i<n;i++){const x=cols===2?142+(i%2)*196:91+(i%4)*99;desk(x,Math.floor(i/cols)?171:77)}
// Rest area, low coffee table, entrance mat.
rect(16,186,23,39,'#6d8471');rect(13,182,27,10,'#829781');rect(13,186,5,39,'#829781');rect(17,223,20,4,'#4f6856');rect(444,189,20,30,'#c39b6d');rect(442,186,24,5,'#deb986');rect(449,192,7,7,'#eee1b8');plant(451,258);plant(28,262);rect(196,269,88,17,'#777f67');rect(200,272,80,11,'#92987a');rect(218,286,44,4,'#655b4d');
}
function sprite(canvas,a,dir,step){
const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;c.clearRect(0,0,32,40);
const kind=a.index%4,back=dir==='up',side=dir==='left'||dir==='right',flip=dir==='left',walk=step?1:0;
const tint=(hex,d)=>'#'+hex.slice(1).match(/../g).map(s=>Math.max(0,Math.min(255,parseInt(s,16)+d)).toString(16).padStart(2,'0')).join('');
const shirt=a.agent.color,edge=tint(shirt,-46),lit=tint(shirt,32),dark=tint(shirt,-19);
const skin=['#f4c39e','#edbb90','#e5ac85','#f1c4a5'][kind],skinShade=['#d69a79','#ce956f','#c48c6d','#d5a085'][kind];
const hair=['#684434','#343f42','#3b3540','#704934'][kind],hairMid=['#895a40','#53605b','#575064','#956347'][kind],hairLight=['#b17b50','#748279','#766b7f','#ba885c'][kind],outline='#343a3b';
const r=(x,y,w,h,col)=>{c.fillStyle=col;c.fillRect(x,y,w,h)};
// Ground shadow and a subtle one-pixel walking bounce.
r(7,37,18,2,'#344c3926');r(10,36,12,3,'#344c391c');
c.save();if(flip){c.translate(32,0);c.scale(-1,1)}c.translate(0,walk?-1:0);
// Short legs and contrasting shoes.
r(10,28,5,8-walk,outline);r(17,28,5,7+walk,outline);r(11,29,3,5-walk,'#64777c');r(18,29,3,4+walk,'#64777c');
r(9,34-walk,7,3,'#394b50');r(17,34+walk,7,3,'#394b50');r(10,35-walk,5,1,'#f0e5ca');r(18,35+walk,5,1,'#f0e5ca');
// Hoodie, cardigan or shirt silhouette; tiny hands swing in opposition.
r(10,20,12,2,edge);r(8,22,16,8,edge);r(10,21,12,8,shirt);r(11,22,3,6,lit);r(20,23,3,6,dark);r(10,29,12,2,dark);
r(6,23+walk,3,6,edge);r(7,24+walk,3,4,shirt);r(23,23-walk,3,6,edge);r(22,24-walk,3,4,lit);
r(7,28+walk,3,3,skinShade);r(7,28+walk,2,2,skin);r(23,28-walk,3,3,skinShade);r(23,28-walk,2,2,skin);
if(kind===0){r(14,21,4,3,'#f1dec4');r(15,23,2,4,'#d8c7a9');r(10,28,12,2,'#4f6d57')}
if(kind===1){r(14,21,4,4,'#f7e8cc');r(15,23,2,5,'#947157');r(11,25,2,1,'#ede2c9');r(10,29,12,1,'#715e4c')}
if(kind===2){r(12,21,8,3,dark);r(13,22,6,2,'#e0deca');r(12,24,1,4,'#e6dfc4');r(19,24,1,4,'#e6dfc4');r(13,28,6,1,dark)}
if(kind===3){r(13,21,6,8,'#efe1ce');r(12,22,2,8,lit);r(19,22,2,8,dark);r(19,24,1,1,'#d8ba87');r(19,27,1,1,'#d8ba87')}
// Distinct hair silhouette behind the face.
if(kind===3){r(18,0,7,2,hair);r(17,2,10,5,outline);r(18,2,8,5,hair);r(19,2,4,2,hairMid);r(18,7,6,2,'#d8ac75')}
r(10,3,12,1,outline);r(7,4,18,2,outline);r(5,6,22,10,outline);r(6,6,20,11,hair);r(7,5,18,4,hair);r(10,4,12,2,hairMid);
if(kind===0){r(5,12,4,9,hair);r(23,12,4,9,hair);r(7,20,3,2,hairMid);r(22,20,3,2,hairMid)}
if(back){
r(7,8,18,10,hair);r(8,6,15,4,hairMid);r(10,6,8,1,hairLight);r(7,10,2,5,hairMid);r(23,9,2,6,hairMid);r(10,18,12,2,hair);r(12,20,8,1,skinShade);
if(kind===0){r(7,17,3,5,hairMid);r(22,16,3,6,hairMid);r(22,9,3,2,'#e3bd72')}
if(kind===2){r(5,8,2,9,'#303d4b');r(25,8,2,9,'#303d4b');r(7,4,18,2,'#a5bdba');r(6,7,2,7,'#88a6a3');r(24,7,2,7,'#88a6a3')}
}else{
// Soft face planes, ears and chin.
r(7,11,18,7,skinShade);r(8,10,16,8,skin);r(10,18,12,2,skin);r(12,20,8,1,skinShade);r(6,12,2,4,skin);r(24,12,2,4,skinShade);r(9,10,13,2,'#f8d4b1');
if(side){r(7,7,9,11,hair);r(8,7,5,8,hairMid);r(9,7,3,1,hairLight);r(16,8,7,3,hair);r(15,10,3,3,hair);r(21,13,3,4,'#3f3c40');r(21,13,1,1,'#fff7df');r(24,15,2,2,skin);r(19,17,4,1,'#e4a092');r(21,19,2,1,'#a66c61');
if(kind===1){r(19,12,6,1,'#515652');r(19,12,1,5,'#515652');r(19,16,6,1,'#515652')}
}else{
// Large readable eyes, reflected light and rosy cheeks.
r(10,12,3,1,'#7c5b50');r(19,12,3,1,'#7c5b50');r(10,13,3,4,'#383d40');r(19,13,3,4,'#383d40');r(10,13,1,1,'#fff9e8');r(19,13,1,1,'#fff9e8');r(11,16,2,1,'#786855');r(20,16,2,1,'#786855');r(8,17,3,1,'#e9a397');r(22,17,3,1,'#e9a397');r(15,17,2,1,'#dc9f7b');r(14,19,4,1,'#a76a60');r(15,19,2,1,'#c57c6d');
// Side-swept fringe, layers and individual highlights.
r(7,7,17,3,hair);r(8,6,14,2,hairMid);r(9,6,8,1,hairLight);r(7,9,4,4,hair);r(10,9,4,2,hair);r(14,8,4,2,hair);r(22,8,3,5,hair);r(23,12,2,2,hairMid);
if(kind===0){r(8,8,3,6,hairMid);r(12,8,2,3,hairMid);r(20,7,4,2,'#ddba72');r(21,6,2,4,'#f4d9a2')}
if(kind===1){r(7,5,5,3,hairMid);r(8,4,3,1,hairLight);r(9,12,5,1,'#515652');r(18,12,5,1,'#515652');r(8,13,1,4,'#515652');r(14,13,1,4,'#515652');r(17,13,1,4,'#515652');r(23,13,1,4,'#515652');r(9,17,5,1,'#515652');r(18,17,5,1,'#515652');r(15,14,2,1,'#515652')}
if(kind===3){r(9,8,4,3,hairMid);r(12,8,3,2,hairLight);r(23,17,1,2,'#e6be73')}
}
if(kind===2){r(6,6,2,8,'#a9c1bc');r(7,4,18,2,'#a9c1bc');r(24,6,2,8,'#a9c1bc');r(4,11,4,7,'#344450');r(5,12,2,4,'#83a6aa');r(24,11,4,7,'#344450');r(25,12,2,4,'#83a6aa')}
}
c.restore();
}
function pathFor(a){const h=a.home,aisle=h.y<160?145:245;const side=a.index%2?427:52;const rest=side===52?177:229;return [{x:h.x,y:aisle},{x:side,y:aisle},{x:side,y:rest},{x:side,y:245},{x:h.x,y:245},...(h.y<160?[{x:side,y:245},{x:side,y:145},{x:h.x,y:145}]:[]),{x:h.x,y:h.y}];}
function portraits(){document.querySelectorAll('.agent-row,.team-card').forEach(el=>{const id=el.dataset.editAgent||el.querySelector('[data-edit-agent]')?.dataset.editAgent;const i=data.agents.findIndex(a=>a.id===id);if(i<0)return;const av=el.querySelector('.avatar');if(!av)return;av.innerHTML='<canvas width="32" height="40" aria-hidden="true"></canvas>';sprite(av.firstChild,{index:i,agent:data.agents[i]},'down',0)})}
function update(){portraits();const list=data.agents.slice(0,8),key=list.map(a=>a.id+a.color+a.name).join('|');if(key===layout){for(const a of actors.values())a.busy=data.tasks.some(t=>t.agentId===a.agent.id&&t.status==='doing');return}layout=key;drawRoom(list.length);layer.innerHTML='';const previous=actors;actors=new Map();const cols=list.length>4?4:2;list.forEach((ag,i)=>{const home={x:cols===2?142+i%2*196:91+i%4*99,y:Math.floor(i/cols)?228:134},button=document.createElement('button');button.className='pixel-agent';button.setAttribute('aria-label','Giao việc cho '+ag.name);button.title=ag.name+' — '+ag.role;button.innerHTML='<canvas width="32" height="40" aria-hidden="true"></canvas><span></span>';button.querySelector('span').textContent=ag.name;button.onclick=()=>taskForm(null,ag.id);layer.append(button);const a={agent:ag,index:i,home,x:home.x,y:home.y,button,canvas:button.querySelector('canvas'),dir:'down',wait:1+i*1.7,path:[],busy:data.tasks.some(t=>t.agentId===ag.id&&t.status==='doing')};const old=previous.get(ag.id);if(old&&previous.size===list.length){a.x=old.x;a.y=old.y;a.wait=old.wait;a.path=old.path;a.dir=old.dir}actors.set(ag.id,a);sprite(a.canvas,a,'down',0);position(a)});}
function position(a){a.button.style.left=(a.x/480*100)+'%';a.button.style.top=(a.y/300*100)+'%';a.button.style.zIndex=String(Math.round(a.y));a.button.classList.toggle('has-task',a.busy)}
function controls(){toggle.textContent=paused?'▶ Tiếp tục':'Ⅱ Tạm dừng';toggle.setAttribute('aria-pressed',String(paused));toggle.setAttribute('aria-label',paused?'Tiếp tục chuyển động':'Tạm dừng chuyển động')}
toggle.onclick=()=>{paused=!paused;controls()};controls();window.updatePixelOffice=update;update();
function tick(now){const dt=Math.min((now-last)/1000||0,.06);last=now;if(!paused&&!document.hidden&&!document.querySelector('#officeView').classList.contains('hidden'))for(const a of actors.values()){let moving=false;if(a.wait>0)a.wait-=dt;else{if(!a.path.length)a.path=pathFor(a);const p=a.path[0],dx=p.x-a.x,dy=p.y-a.y,d=Math.hypot(dx,dy),speed=18+a.index%3*3;if(d<speed*dt){a.x=p.x;a.y=p.y;a.path.shift();if(!a.path.length)a.wait=4+Math.random()*7;else if(Math.random()<.12)a.wait=1}else{moving=true;a.x+=dx/d*speed*dt;a.y+=dy/d*speed*dt;a.dir=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up'} }sprite(a.canvas,a,a.dir,moving&&Math.floor(now/190)%2);position(a)}requestAnimationFrame(tick)}requestAnimationFrame(tick);
})();
