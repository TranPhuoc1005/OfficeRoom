/* Pure workstation model: stable object/agent IDs, rotation and geometry. */
(function(root){'use strict';
const DESKS=['desk','whitedesk','longdesk'],CHAIRS=['chair','whitechair'],SCREENS=['monitor','dualmonitor'];
const isDesk=o=>DESKS.includes(o.type),isChair=o=>CHAIRS.includes(o.type),isScreen=o=>SCREENS.includes(o.type),ownable=o=>Boolean(o&&o.type!=='roomfloor');
const rotation=o=>((Number(o.rotation)||0)%360+360)%360;
function normalize(layout){const next=JSON.parse(JSON.stringify(layout));for(const o of next.objects){o.rotation??=0;o.ownerId??=null;o.deskId??=null}return next}
function assign(layout,id,ownerId){const o=layout.objects.find(o=>o.id===id);if(!o||!ownable(o))return;o.ownerId=ownerId||null;
 if(isDesk(o)){
  for(const item of layout.objects){if(item.deskId===o.id)item.ownerId=o.ownerId}
 }else if(o.deskId){
  const d=layout.objects.find(x=>x.id===o.deskId&&isDesk(x));
  if(d){
   if(!d.ownerId&&o.ownerId)d.ownerId=o.ownerId;
   else if(d.ownerId&&o.ownerId&&d.ownerId!==o.ownerId)d.ownerId=o.ownerId;
  }
 }
 if(o.ownerId){
  for(const item of layout.objects){if(!(isChair(item)||isScreen(item))||item.ownerId!==o.ownerId||item.deskId)continue;const desks=layout.objects.filter(d=>isDesk(d)&&d.ownerId===item.ownerId);desks.sort((a,b)=>(a.x-item.x)**2+(a.y-item.y)**2-((b.x-item.x)**2+(b.y-item.y)**2));if(desks[0])item.deskId=desks[0].id}
 }
}
function rotate(layout,id,angle,{width=1000,height=800,group=true,sizeOf=null}={}){if(![0,90,180,270].includes(angle))throw Error('Góc xoay không hợp lệ.');const result=normalize(layout),o=result.objects.find(o=>o.id===id);if(!o)return result;const delta=angle-rotation(o),rad=delta*Math.PI/180,cos=Math.round(Math.cos(rad)),sin=Math.round(Math.sin(rad));
 const members=group&&isDesk(o)?result.objects.filter(x=>x.deskId===o.id&&x.ownerId===o.ownerId):[];
 for(const m of members){const dx=(m.x-o.x)*width,dy=(m.y-o.y)*height;m.x=o.x+(dx*cos+dy*sin)/width;m.y=o.y+(-dx*sin+dy*cos)/height;m.rotation=(rotation(m)+delta+360)%360;if(m.x<0||m.x>1||m.y<.32||m.y>1)throw Error('Bộ bàn ghế sẽ ra ngoài phòng. Dời bàn vào giữa trước khi xoay.')}o.rotation=angle;if(sizeOf){for(const t of [o,...members]){const r=footprint(t,sizeOf(t),width,height);if(r.x<2||r.x+r.w>width-2||r.y<height*.32||r.y+r.h>height-3)throw Error('Bộ bàn ghế sẽ ra ngoài phòng. Dời bàn vào trong trước khi xoay.')}}return result;
}
function footprint(o,size,width,height){const g=Math.min(width/48,height/30);if(['partition','glasswall','door'].includes(o.type)&&o.length!==undefined){let w=o.length*g*(o.scale??1),h=g*.35*(o.scale??1);if(rotation(o)%180)[w,h]=[h,w];return{x:o.x*width-w/2,y:o.y*height-h/2,w,h}}if(o.type==='roomfloor')return{x:o.x*width-o.roomWidth*g/2,y:o.y*height-o.roomDepth*g/2,w:o.roomWidth*g,h:o.roomDepth*g};if(['plant','lamp','whiteplant','whitelamp'].includes(o.type)){const d=size*(['lamp','whitelamp'].includes(o.type)?.18:.35)+12;return{x:o.x*width-d/2,y:o.y*height-d/2,w:d,h:d}}let w=size*(o.type==='partition'||o.type==='glasswall'?.88:o.type==='door'?.68:isDesk(o)?.80:isChair(o)?.55:.62),h=size*(o.type==='partition'||o.type==='glasswall'||o.type==='door'?.10:isDesk(o)?.22:isChair(o)?.35:.23);if(rotation(o)%180)[w,h]=[h,w];return{x:o.x*width-w/2-6,y:o.y*height-h/2-6,w:w+12,h:h+12}}
function resolve(layout,agentId,{width,height,sizeOf}){
 const fail=reason=>({ok:false,reason});
 let chairs=layout.objects.filter(o=>isChair(o)&&o.ownerId===agentId);
 if(!chairs.length){
  const allAgents = (typeof window!=='undefined'&&window.data?.agents)||[];
  const agentIdx = allAgents.findIndex(a=>a.id===agentId);
  const unownedChairs = layout.objects.filter(o=>isChair(o)&&!o.ownerId);
  if(unownedChairs.length>0){
   chairs=[unownedChairs[(agentIdx>=0?agentIdx:0)%unownedChairs.length]];
  }else{
   const allChairs=layout.objects.filter(isChair);
   if(allChairs.length>0){
    chairs=[allChairs[(agentIdx>=0?agentIdx:0)%allChairs.length]];
   }
  }
 }
 if(!chairs.length)return fail('Chưa có ghế trong văn phòng');
 const complete=[];let reason='Ghế chưa liên kết với bàn';
 for(const chair of chairs){
  let desk=layout.objects.find(o=>o.id===chair.deskId&&isDesk(o));
  if(!desk){
   const desks=layout.objects.filter(isDesk);
   desks.sort((a,b)=>Math.hypot((a.x-chair.x)*width,(a.y-chair.y)*height)-Math.hypot((b.x-chair.x)*width,(b.y-chair.y)*height));
   desk=desks[0];
  }
  if(!desk)continue;
  let monitors=layout.objects.filter(o=>isScreen(o)&&(o.deskId===desk.id||o.ownerId===agentId));
  if(!monitors.length){
   const allScreens=layout.objects.filter(isScreen);
   allScreens.sort((a,b)=>Math.hypot((a.x-desk.x)*width,(a.y-desk.y)*height)-Math.hypot((b.x-desk.x)*width,(b.y-desk.y)*height));
   if(allScreens[0])monitors=[allScreens[0]];
  }
  const angle=rotation(desk),rad=angle*Math.PI/180;
  complete.push({ok:true,desk,chair,monitors,rotation:angle,direction:['up','left','down','right'][angle/90],seat:{x:chair.x*width,y:chair.y*height},approach:{x:chair.x*width+Math.sin(rad)*(sizeOf?sizeOf(chair)*.5:20),y:chair.y*height+Math.cos(rad)*(sizeOf?sizeOf(chair)*.5:20)}});
 }
 return complete[0]||fail(reason);
}
const api={isDesk,isChair,isScreen,ownable,rotation,normalize,assign,rotate,footprint,resolve};root.OfficeWorkstations=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
