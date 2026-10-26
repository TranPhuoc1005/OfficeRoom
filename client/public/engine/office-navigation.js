/* Pure grid navigation. Furniture footprints are in viewport pixels. */
(function(root){
'use strict';
function createNavigation(width,height,obstacles=[]){
 const spacing=Math.min(width/48,height/32),cols=Math.ceil(width/spacing),rows=Math.ceil(height/spacing),cw=width/cols,ch=height/rows,lower=Math.floor(rows*.32),upper=rows-1;
 const key=(x,y)=>y*cols+x, cell=(x,y)=>({x:Math.max(0,Math.min(cols-1,Math.floor(x/cw))),y:Math.max(lower,Math.min(upper,Math.floor(y/ch)))});
 const center=(x,y)=>({x:(x+.5)*cw,y:(y+.5)*ch});
 const valid=(x,y)=>x>=0&&x<cols&&y>=lower&&y<=upper;
 const blockedCell=(x,y)=>!valid(x,y)||obstacles.some(b=>{const px=x*cw,py=y*ch,p=center(x,y);return b.strict?px<b.x+b.w&&px+cw>b.x&&py<b.y+b.h&&py+ch>b.y:p.x>b.x&&p.x<b.x+b.w&&p.y>b.y&&p.y<b.y+b.h});
 function nearest(x,y){const a=cell(x,y);let best=null,d=Infinity;for(let yy=lower;yy<=upper;yy++)for(let xx=0;xx<cols;xx++)if(!blockedCell(xx,yy)){const p=center(xx,yy),dd=(p.x-x)**2+(p.y-y)**2;if(dd<d){d=dd;best=p}}return best}
 function path(sx,sy,tx,ty){
  const from=cell(sx,sy),raw=cell(tx,ty);const end=blockedCell(raw.x,raw.y)?nearest(tx,ty):center(raw.x,raw.y);if(!end)return[];const to=cell(end.x,end.y),target=key(to.x,to.y),start=key(from.x,from.y);
  if(start===target)return[];const queue=[from],parents=new Map([[start,null]]);let head=0;
  while(head<queue.length){const a=queue[head++];for(const [dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const x=a.x+dx,y=a.y+dy,k=key(x,y);if(blockedCell(x,y)||parents.has(k))continue;parents.set(k,key(a.x,a.y));if(k===target){const result=[];let cur=k;while(cur!==start){result.push(center(cur%cols,Math.floor(cur/cols)));cur=parents.get(cur)}return result.reverse()}queue.push({x,y})}}
  return[];
 }
 return{path,nearest,blocked:(x,y)=>x<0||x>width||y<lower*ch||y>(upper+1)*ch||obstacles.some(b=>x>b.x&&x<b.x+b.w&&y>b.y&&y<b.y+b.h),center,cols,rows};
}
root.OfficeNavigation={createNavigation};if(typeof module!=='undefined')module.exports={createNavigation};
})(typeof window!=='undefined'?window:globalThis);
