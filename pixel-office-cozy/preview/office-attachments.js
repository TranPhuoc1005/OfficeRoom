/* Physical parent/child placement: coordinates on a desk, not just ownership. */
(function(root){'use strict';const W=root.OfficeWorkstations||(typeof require==='function'?require('./office-workstations.js'):null),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function axes(d){const r=W.rotation(d)*Math.PI/180;return{c:Math.round(Math.cos(r)),s:Math.round(Math.sin(r))}}
function lift(d,m){return m.sizeOf(d)*(d.type==='longdesk'?.28:d.type==='desk'?.32:.41)}
function projected(d,u,v,m,raised){const{c,s}=axes(d),size=m.sizeOf(d);return{x:d.x*m.width+(u*c+v*s)*size,y:d.y*m.height+(-u*s+v*c)*size-(raised?lift(d,m):0)}}
function local(d,p,m,raised){const{c,s}=axes(d),size=m.sizeOf(d),dx=p.x-d.x*m.width,dy=p.y-d.y*m.height+(raised?lift(d,m):0);return{u:(dx*c-dy*s)/size,v:(dx*s+dy*c)/size}}
function detach(o){o.mount=null;o.follow=null;o.deskId=null}
function attach(layout,id,deskId,m,point=null){const o=layout.objects.find(x=>x.id===id),d=layout.objects.find(x=>x.id===deskId&&W.isDesk(x));if(!o||!d||(!W.isScreen(o)&&!W.isChair(o)))throw Error('Chọn màn hình/ghế và bàn hợp lệ.');if(o.ownerId&&d.ownerId&&o.ownerId!==d.ownerId)throw Error('Hai món khác chủ. Hãy gán cùng chủ trước khi ghép.');if(!o.ownerId&&d.ownerId)o.ownerId=d.ownerId;
o.deskId=d.id;o.rotation=W.rotation(d);const raised=W.isScreen(o),p=point?local(d,point,m,raised):{u:0,v:raised?0:.28};if(raised){o.mount={u:clamp(p.u,-.38,.38),v:clamp(p.v,-.08,.08)};o.follow=null}else{o.follow={u:clamp(p.u,-.45,.45),v:clamp(p.v,.15,.65)};o.mount=null}sync(layout,m);return o}
function sync(layout,m){for(const o of layout.objects){if(!o.mount&&!o.follow)continue;const d=layout.objects.find(x=>x.id===o.deskId&&W.isDesk(x));if(!d){detach(o);continue}const at=o.mount||o.follow,p=projected(d,at.u,at.v,m,!!o.mount);o.x=p.x/m.width;o.y=p.y/m.height;o.rotation=W.rotation(d)}}
function hitDesk(layout,point,m){return [...layout.objects].reverse().find(d=>{if(!W.isDesk(d))return false;const p=local(d,point,m,true);return Math.abs(p.u)<=.50&&Math.abs(p.v)<=.17})||null}
function remove(layout,id,m){sync(layout,m);for(const o of layout.objects)if(o.deskId===id)detach(o);layout.objects=layout.objects.filter(o=>o.id!==id)}
function validate(o){for(const key of ['mount','follow'])if(o[key]!=null){const p=o[key];if(!Number.isFinite(p.u)||!Number.isFinite(p.v)||Math.abs(p.u)>1||Math.abs(p.v)>1)throw Error('Tọa độ liên kết mặt bàn không hợp lệ.')}}
const api={lift,projected,local,detach,attach,sync,hitDesk,remove,validate};root.OfficeAttachments=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
