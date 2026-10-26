const assert=require('node:assert/strict');const W=require('../preview/office-workstations.js');
const clone=x=>JSON.parse(JSON.stringify(x));let layout={version:1,objects:[{id:'desk-a',type:'whitedesk',x:.5,y:.5,rotation:0,ownerId:'a'},{id:'chair-a',type:'whitechair',x:.5,y:.56,rotation:0,ownerId:'a',deskId:'desk-a'},{id:'screen-a',type:'monitor',x:.5,y:.46,rotation:0,ownerId:'a',deskId:'desk-a'},{id:'chair-b',type:'whitechair',x:.7,y:.6,rotation:0,ownerId:'b',deskId:null}]};
const metrics={width:1000,height:800,sizeOf:()=>160};
assert(W.resolve(layout,'a',metrics).ok);assert(!W.resolve(layout,'b',metrics).ok,'cannot borrow another agent desk');
const before=clone(layout);const rotated=W.rotate(layout,'desk-a',90,{width:1000,height:800});assert.equal(rotated.objects[0].rotation,90);assert.equal(rotated.objects[1].rotation,90);assert(rotated.objects[1].x>.5);assert(W.resolve(rotated,'a',metrics).ok);assert.deepEqual(layout,before,'rotation is transactional');
let full=layout;for(const a of [90,180,270,0])full=W.rotate(full,'desk-a',a,{width:1000,height:800});for(let i=0;i<layout.objects.length;i++){assert(Math.abs(full.objects[i].x-layout.objects[i].x)<1e-10);assert(Math.abs(full.objects[i].y-layout.objects[i].y)<1e-10)}
const ungrouped=W.rotate(layout,'desk-a',90,{group:false});assert(!W.resolve(ungrouped,'a',metrics).ok,'mismatched orientation cannot seat');
const changed=clone(layout);W.assign(changed,'desk-a','b');assert.equal(changed.objects[1].deskId,null,'remove foreign link on owner change');assert.equal(changed.objects[2].deskId,null);assert(!W.resolve(changed,'a',metrics).ok);
const noScreen=clone(layout);noScreen.objects=noScreen.objects.filter(x=>x.id!=='screen-a');assert.match(W.resolve(noScreen,'a',metrics).reason,/màn hình/);
const far=clone(layout);far.objects[1].y=.82;assert(!W.resolve(far,'a',metrics).ok);
const migrated=W.normalize({version:1,objects:[{id:'legacy',type:'desk',x:.5,y:.5}]});assert.equal(migrated.objects[0].rotation,0);assert.equal(migrated.objects[0].ownerId,null);assert.equal(migrated.objects[0].id,'legacy');
const edge=clone(layout);edge.objects[0].x=.95;edge.objects[1].x=.95;edge.objects[2].x=.95;assert.throws(()=>W.rotate(edge,'desk-a',90,{...metrics}),/ngoài phòng/);
const f0=W.footprint(layout.objects[0],200,1000,800),f90=W.footprint(rotated.objects[0],200,1000,800);assert.equal(f0.w,f90.h);assert.equal(f0.h,f90.w);
const foreign=clone(layout);foreign.objects[3].deskId='desk-a';const safe=W.rotate(foreign,'desk-a',90);assert.deepEqual(safe.objects[3],W.normalize(foreign).objects[3],'do not rotate a foreign-owned piece');
console.log('PASS: ownership isolation, matching setup, group rotation/roundtrip, mismatch, owner change, missing equipment, bounds and migration');
