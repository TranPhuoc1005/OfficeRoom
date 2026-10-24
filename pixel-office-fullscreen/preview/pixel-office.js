/* Full-screen office map. Original procedural pixel art, no external assets. */
(()=>{
let W=1120,H=700,displayScale=1,deskHomes=[];const room=document.querySelector('.office'),viewport=document.querySelector('.world-viewport');room.classList.add('pixel-room');
room.innerHTML='<div class="pixel-stage"><canvas class="room-art" width="1120" height="700" aria-hidden="true"></canvas><div class="pixel-actors"></div><div class="zone-label" style="left:35%;top:20%">THE WORKROOM</div><div class="zone-label" style="left:9%;top:27.5%">MEETING ROOM</div><div class="zone-label" style="left:10%;top:63%">SLOW CORNER</div><div class="zone-label" style="left:79%;top:23%">COFFEE & IDEAS</div><div class="zone-label" style="left:79%;top:61%">QUIET ZONE</div><div class="map-caption">A LITTLE ROOM FOR BIG IDEAS</div></div>';
const stage=room.querySelector('.pixel-stage'),g=room.querySelector('canvas').getContext('2d'),layer=room.querySelector('.pixel-actors'),toggle=document.querySelector('#motionToggle');g.imageSmoothingEnabled=false;
let actors=new Map(),obstacles=[],layout='',last=0,paused=matchMedia('(prefers-reduced-motion: reduce)').matches,selected=null;
const rect=(x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),w,h)};
function block(x,y,w,h){obstacles.push({x:x-13,y:y-9,w:w+26,h:h+20})}
function plant(x,y,large=false){const s=large?1.5:1;g.save();g.translate(x,y);g.scale(s,s);rect(-9,-4,18,17,'#866748');rect(-11,-7,22,5,'#d0a176');rect(-7,-2,14,12,'#bc885d');rect(-3,-38,5,31,'#65825a');rect(-17,-34,13,9,'#73925e');rect(2,-41,11,12,'#8ba56a');rect(-10,-47,12,13,'#9caf74');rect(2,-27,18,9,'#7d985c');rect(-16,-18,13,8,'#99ad72');rect(-9,-42,6,5,'#b3bf89');g.restore();block(x-13,y-12,26,26)}
function desk(x,y,color){rect(x-48,y+14,96,37,'#a98359');rect(x-48,y+6,96,39,'#bd996e');rect(x-46,y+6,92,4,'#e3bd87');rect(x-46,y+43,5,15,'#93734e');rect(x+41,y+43,5,15,'#93734e');rect(x-21,y+12,40,27,'#4c5953');rect(x-18,y+14,34,20,'#aec2a0');rect(x-15,y+17,24,2,'#e1e8bb');rect(x-15,y+22,16,2,'#7f9e82');rect(x-15,y+27,21,2,'#d2ddb4');rect(x-3,y+38,5,7,'#606e5a');rect(x-16,y+44,31,3,'#e6dcb4');rect(x-17,y+50,35,7,'#d6cba3');for(let i=0;i<6;i++)rect(x-14+i*5,y+52,2,2,'#8e967e');rect(x+29,y+32,9,10,'#fff0cd');rect(x+38,y+34,4,5,'#d3b68b');rect(x-40,y+28,13,19,'#ddd3a7');rect(x-38,y+31,8,1,'#ad9e79');rect(x-38,y+35,8,1,'#ad9e79');rect(x-17,y+66,34,19,'#6c806b');rect(x-20,y+64,40,8,'#93a086');rect(x-14,y+84,28,5,'#58705c');block(x-48,y+3,96,58)}
function rug(x,y,w,h,c){rect(x+3,y+4,w,h,'#a8947533');rect(x,y,w,h,'#a6b194');rect(x+4,y+4,w-8,h-8,c);for(let i=x+9;i<x+w-9;i+=12){rect(i,y+7,4,2,'#dbe0b7');rect(i,y+h-9,4,2,'#dbe0b7')}}
function sofa(x,y,w,vertical=false){if(vertical){rect(x+4,y+3,34,w,'#73816a');rect(x,y,34,w-4,'#8e9b7e');rect(x,y,7,w-4,'#a4ad8b');for(let yy=y+8;yy<y+w-4;yy+=28)rect(x+8,yy,22,25,'#9ca789');rect(x,y-4,39,8,'#a5af8f');rect(x,y+w-10,39,8,'#a5af8f');block(x,y,39,w)}else{rect(x+3,y+3,w,36,'#71816c');rect(x,y,w,34,'#8b9b80');rect(x,y,w,9,'#b2bb99');for(let xx=x+9;xx<x+w-5;xx+=36)rect(xx,y+11,32,19,'#a1ad8d');rect(x-4,y,9,38,'#a9b595');rect(x+w-6,y,9,38,'#a9b595');block(x,y,w,38)}}
function shelf(x,y,w){rect(x,y,w,46,'#9c7b54');rect(x+3,y+3,w-6,40,'#c29e6d');for(let row=0;row<2;row++){for(let i=0;i<Math.floor(w/9)-1;i++){const xx=x+6+i*9;rect(xx,y+6+row*20,6,14,['#8e9d79','#d1bf8a','#a67e62','#7f9490'][i%4]);rect(xx+1,y+8+row*20,2,1,'#e7d7ab')}rect(x+2,y+21+row*20,w-4,4,'#ad885c')}block(x,y,w,46)}
function drawRoom(n){
obstacles=[];deskHomes=[];g.clearRect(0,0,W,H);
// The room itself fills the viewport; its dimensions adapt to the screen.
rect(0,0,W,H,'#cfb591');for(let y=87;y<H;y+=18){rect(0,y,W,1,'#baa27d');for(let x=(Math.floor(y/18)%2)*40;x<W;x+=80){rect(x,y,1,18,'#baa27d');if(x+29<W)rect(x+13,y+5,16,1,'#d8bf98')}}
rect(0,0,W,86,'#d8d9bb');rect(0,0,W,4,'#f5ebd0');rect(0,81,W,9,'#a98a61');rect(0,81,W,3,'#e5cba0');
for(let x=34;x+135<W;x+=180){rect(x,24,136,49,'#9ebaaa');rect(x+4,28,128,38,'#bfd5bf');rect(x+8,32,26,4,'#e1ebcd');rect(x+66,25,4,46,'#ece9cd');rect(x+2,66,132,5,'#dfe8ca');rect(x-4,73,144,7,'#b89a6d')}
const compact=W<850,side=compact?28:Math.min(245,W*.21),left=side,right=W-side;
const top=compact?163:172,workBottom=compact?Math.min(H-430,top+340):Math.max(top+240,H-220),rows=Math.max(1,Math.ceil(n/(n>4?4:2))),cols=n>4?4:2;
// On narrow screens use two columns with as many rows as needed.
const actualCols=compact?2:cols,actualRows=Math.max(1,Math.ceil(n/actualCols));
const mainWidth=right-left;
rug(left-7,top-30,mainWidth+14,Math.max(150,workBottom-top+85),'#b9c3a4');
for(let i=0;i<n;i++){const c=i%actualCols,r=Math.floor(i/actualCols),x=left+mainWidth*(c+.5)/actualCols,y=top+(actualRows>1?r*Math.min(170,(workBottom-top)/(actualRows-1)):0);desk(x,y);deskHomes.push({x:Math.round(x/16)*16,y:Math.round((y+100)/16)*16})}
if(!compact){
const lx=25,ly=161,lw=side-50; rug(lx,ly,lw,210,'#bdc4aa');shelf(lx+12,108,Math.min(120,lw-24));
const tx=lx+lw/2-47;rect(tx,ly+55,94,80,'#a28059');rect(tx-3,ly+50,94,80,'#cba97c');rect(tx+24,ly+64,31,21,'#74816e');rect(tx+28,ly+68,23,13,'#a9baa0');rect(tx+17,ly+104,14,9,'#ede0bb');block(tx-3,ly+49,98,83);
for(const yy of [ly+65,ly+105]){rect(tx-27,yy,17,25,'#8e9f82');rect(tx+104,yy,17,25,'#8e9f82');block(tx-27,yy,17,25);block(tx+104,yy,17,25)}
const loungeY=Math.max(ly+250,H-285);rug(lx,loungeY,lw,140,'#b4b99d');sofa(lx+15,loungeY+23,Math.min(110,lw-45));rect(lx+lw/2-28,loungeY+87,56,28,'#c7a77b');rect(lx+lw/2-12,loungeY+92,14,10,'#f1e5be');block(lx+lw/2-28,loungeY+87,56,28);plant(lx+lw-22,loungeY+118);
const rx=W-side+25,rw=side-50; rug(rx,161,rw,210,'#c0c7ac');
rect(rx+15,201,38,71,'#e1d6b9');rect(rx+19,182,30,22,'#adc9c0');rect(rx+23,179,22,4,'#e0e8cb');rect(rx+21,215,26,14,'#6f8276');rect(rx+25,220,4,5,'#9bc3bb');rect(rx+39,220,4,5,'#b98464');block(rx+15,179,38,93);
rect(rx+rw-69,190,55,132,'#d4bc97');rect(rx+rw-72,185,61,6,'#f4e6c9');rect(rx+rw-63,198,42,30,'#728578');rect(rx+rw-58,203,32,17,'#9aaba0');rect(rx+rw-62,249,41,3,'#eedcb5');block(rx+rw-72,185,61,138);plant(rx+rw-18,351);
rug(rx,loungeY,rw,140,'#b1bda0');sofa(rx+17,loungeY+25,Math.min(111,rw-35));shelf(rx+18,loungeY+88,Math.min(130,rw-36));plant(rx+rw-19,loungeY+119);
plant(side-11,Math.min(430,H-180));plant(W-side+11,Math.min(430,H-180));
}else{
// Portrait layout: keep all desks visible; move rest/coffee beneath them.
const lower=H-285,half=W/2;
rug(18,lower,half-26,140,'#b4b99e');sofa(35,lower+30,Math.max(75,half-72));rect(half/2-20,lower+95,45,24,'#c9a779');block(half/2-20,lower+95,45,24);
rug(half+8,lower,half-26,140,'#bec7ab');rect(half+28,lower+31,36,63,'#e5d9bd');rect(half+32,lower+13,28,21,'#b2cfc0');rect(half+34,lower+44,24,11,'#788b7b');block(half+28,lower+13,36,81);shelf(half+83,lower+35,Math.max(36,half-123));plant(W-34,lower+120);
}
plant(22,118);plant(W-24,118);
const labels=stage.querySelectorAll('.zone-label');labels.forEach(e=>e.hidden=true);if(labels[0]){labels[0].hidden=false;labels[0].style.left=(left+15)+'px';labels[0].style.top=(top-53)+'px'}
if(!compact){for(const [i,x,y] of [[1,40,140],[2,40,Math.max(411,H-307)],[3,W-side+38,140],[4,W-side+38,Math.max(411,H-307)]]){labels[i].hidden=false;labels[i].style.left=x+'px';labels[i].style.top=y+'px'}}
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
const STEP=16;let COLS=70,ROWS=44;
function blocked(x,y){return x<15||x>W-15||y<112||y>H-145||obstacles.some(o=>x>o.x&&x<o.x+o.w&&y>o.y&&y<o.y+o.h)}
function cell(x,y){return {x:Math.max(0,Math.min(COLS-1,Math.round(x/STEP))),y:Math.max(0,Math.min(ROWS-1,Math.round(y/STEP)))}}
function nearest(p){if(!blocked(p.x*STEP,p.y*STEP))return p;for(let d=1;d<14;d++)for(let dy=-d;dy<=d;dy++)for(let dx=-d;dx<=d;dx++)if(Math.abs(dx)===d||Math.abs(dy)===d){const q={x:p.x+dx,y:p.y+dy};if(!blocked(q.x*STEP,q.y*STEP))return q}return null}
function route(s,t){const a=nearest(cell(s.x,s.y)),b=nearest(cell(t.x,t.y));if(!a||!b)return[];const key=p=>p.y*COLS+p.x,ak=key(a),bk=key(b),queue=[ak],parent=new Map([[ak,null]]);let index=0;while(index<queue.length){const k=queue[index++];if(k===bk)break;const x=k%COLS,y=Math.floor(k/COLS);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,k2=yy*COLS+xx;if(xx<0||xx>=COLS||yy<0||yy>=ROWS||parent.has(k2)||blocked(xx*STEP,yy*STEP))continue;parent.set(k2,k);queue.push(k2)}}if(!parent.has(bk))return[];const result=[];let k=bk;while(k!==ak){result.push({x:k%COLS*STEP,y:Math.floor(k/COLS)*STEP});k=parent.get(k)}result.reverse();return result;}
function portraits(){document.querySelectorAll('.agent-row,.team-card').forEach(el=>{const id=el.dataset.editAgent||el.querySelector('[data-edit-agent]')?.dataset.editAgent,i=data.agents.findIndex(a=>a.id===id);if(i<0)return;const av=el.querySelector('.avatar');if(!av)return;av.innerHTML='<canvas width="32" height="40" aria-hidden="true"></canvas>';sprite(av.firstChild,{index:i,agent:data.agents[i]},'down',0)})}
function selectAgent(id){selected=id;actors.forEach(a=>a.button.classList.toggle('selected',a.agent.id===id));const a=actors.get(id);if(!a)return;const chip=$('#selectionChip');chip.classList.remove('hidden');chip.innerHTML='<strong>'+esc(a.agent.name)+'</strong><small>'+esc(a.agent.role)+'</small>';taskForm(null,id)}
function update(){portraits();if(window.gameSyncHud)window.gameSyncHud();const list=data.agents.slice(0,8),key=list.map(a=>a.id+a.color+a.name).join('|');if(key===layout){for(const a of actors.values())a.busy=data.tasks.some(t=>t.agentId===a.agent.id&&t.status==='doing');return}layout=key;drawRoom(list.length);layer.innerHTML='';const previous=actors;actors=new Map();const cols=list.length>4?4:2;list.forEach((ag,i)=>{const home=deskHomes[i]||{x:W/2,y:220};const btn=document.createElement('button');btn.className='pixel-agent';btn.setAttribute('aria-label','Giao việc cho '+ag.name);btn.title=ag.name+' — '+ag.role;btn.innerHTML='<canvas width="32" height="40" aria-hidden="true"></canvas><span></span>';btn.querySelector('span').textContent=ag.name;btn.onclick=()=>selectAgent(ag.id);layer.append(btn);const a={agent:ag,index:i,home,x:home.x,y:home.y,button:btn,canvas:btn.querySelector('canvas'),dir:'down',wait:3+i*2,path:[],busy:data.tasks.some(t=>t.agentId===ag.id&&t.status==='doing')};const old=previous.get(ag.id);if(old&&previous.size===list.length&&!blocked(old.x,old.y)){a.x=old.x;a.y=old.y;a.wait=old.wait;a.path=old.path;a.dir=old.dir}actors.set(ag.id,a);sprite(a.canvas,a,'down',0);position(a)});if(selected&&!actors.has(selected)){$('#selectionChip').classList.add('hidden');selected=null}}
function position(a){a.button.style.left=a.x+'px';a.button.style.top=a.y+'px';a.button.style.zIndex=String(Math.round(a.y));a.button.classList.toggle('selected',selected===a.agent.id);a.button.classList.toggle('has-task',a.busy)}
function controls(){toggle.textContent=paused?'▶':'Ⅱ';toggle.setAttribute('aria-pressed',String(paused));toggle.setAttribute('aria-label',paused?'Tiếp tục hoạt ảnh':'Tạm dừng hoạt ảnh');toggle.title=paused?'Tiếp tục hoạt ảnh':'Tạm dừng hoạt ảnh'}toggle.onclick=()=>{paused=!paused;controls()};controls();
function resizeRoom(){
const r=viewport.getBoundingClientRect();displayScale=r.width<700?.85:Math.max(.8,Math.min(1.5,(r.height-100)/650));W=Math.ceil(r.width/displayScale);H=Math.ceil(r.height/displayScale);COLS=Math.ceil(W/STEP);ROWS=Math.ceil(H/STEP);
const canvas=room.querySelector('.room-art');canvas.width=W;canvas.height=H;g.imageSmoothingEnabled=false;stage.style.width=W+'px';stage.style.height=H+'px';canvas.style.width=W+'px';canvas.style.height=H+'px';stage.style.transform='scale('+displayScale+')';layout='';actors.clear();update();
}
$('#fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{toast('Trình duyệt này chưa bật chế độ toàn màn hình.')}};
window.addEventListener('resize',resizeRoom);window.updatePixelOffice=update;resizeRoom();
function restStops(){return W<850?[{x:W/2,y:H-185},{x:W/2,y:132},{x:W-35,y:H/2}]:[{x:W-240,y:395},{x:240,y:395},{x:W/2,y:H-180},{x:W/2,y:132}];}
function tick(now){const dt=Math.min((now-last)/1000||0,.06);last=now;if(!paused&&!document.hidden)for(const a of actors.values()){let moving=false;if(a.wait>0)a.wait-=dt;else{if(!a.path.length){a.destination=(a.destination??-1)+1;const goal=a.destination%2===0?restStops()[(a.index+a.destination)%restStops().length]:a.home;a.path=route(a,goal);if(!a.path.length)a.wait=3}const p=a.path[0];if(p){const dx=p.x-a.x,dy=p.y-a.y,d=Math.hypot(dx,dy),speed=31+a.index%3*3;if(d<speed*dt){a.x=p.x;a.y=p.y;a.path.shift();if(!a.path.length)a.wait=5+Math.random()*6}else{moving=true;a.x+=dx/d*speed*dt;a.y+=dy/d*speed*dt;a.dir=Math.abs(dx)>Math.abs(dy)?dx>0?'right':'left':dy>0?'down':'up'}}}sprite(a.canvas,a,a.dir,moving&&Math.floor(now/175)%2);position(a)}requestAnimationFrame(tick)}requestAnimationFrame(tick);
})();
