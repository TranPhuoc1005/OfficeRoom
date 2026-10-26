const assert=require('node:assert/strict');
const L=require('../preview/office-life.js');
const C=require('../preview/character-studio.js');
const s=L.create('agent',17);const before={...s.needs};L.decay(s,20);for(const k of Object.keys(before))assert(s.needs[k]<before[k]);
s.needs.hygiene=0;assert.equal(L.choices(s,'balanced',()=>true)[0].key,'restroom');assert(!L.choices(s,'balanced',k=>k!=='restroom').some(x=>x.key==='restroom'));
s.current={key:'restroom',objectId:'wc-1'};s.elapsed=13;L.finish(s);assert.equal(s.current,null);assert.equal(s.needs.hygiene,38);assert.equal(s.last,'restroom');assert(!L.choices(s).some(x=>x.key==='restroom'));
s.current={key:'tea',objectId:'sofa'};L.cancel(s);assert.equal(s.current,null);assert.equal(s.cooldown,0);
assert.equal(new Set(C.malePresets.map(x=>JSON.stringify(x))).size,7);assert(C.malePresets.every(a=>a.hair<5));assert.deepEqual(C.normalize({hair:999,top:-1,hairColor:'not-a-color'},2),C.normalize({},2));
// Exercise renderer in every direction, walk half-cycle, pose and appearance.
const commands=[];const ctx=new Proxy({},{get:(t,k)=>t[k]??((...v)=>commands.push([k,...v])),set:(t,k,v)=>(t[k]=v,true)});const canvas={width:240,height:300,getContext:()=>ctx};
// Renderer is attached through browser namespace; module keeps same pure schema.
global.window={};delete require.cache[require.resolve('../preview/character-studio.js')];require('../preview/character-studio.js');
for(const a of C.malePresets)for(const direction of ['up','down','left','right'])for(const activity of ['','tea','phone','game','music','rest']){window.CharacterStudio.draw(canvas,a,direction,2,true,activity==='rest',activity)}
commands.length=0;window.CharacterStudio.draw(canvas,C.presets[3],'right',2,true);const one=JSON.stringify(commands);commands.length=0;window.CharacterStudio.draw(canvas,C.presets[3],'right',6,true);assert.notEqual(JSON.stringify(commands),one,'An swaps independent limbs at opposite walk phases');
console.log('Life/appearance: needs, availability, cooldown, cancel, 7 unique male presets, invalid values, all directions/props, opposite walk phases passed');
