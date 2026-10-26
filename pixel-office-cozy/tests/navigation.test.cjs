const assert=require('node:assert/strict');
const {createNavigation}=require('../preview/office-navigation.js');
const wall={x:460,y:320,w:80,h:200},n=createNavigation(1000,800,[wall]);
const path=n.path(200,400,800,400);
assert(path.length>0,'Find route around cabinet');
assert(path.every(p=>!n.blocked(p.x,p.y)),'Every waypoint outside furniture');
assert(path.some(p=>p.y<320||p.y>520),'Route around cabinet edge');
const closed=createNavigation(1000,800,[{x:460,y:240,w:80,h:600}]);
assert.equal(closed.path(200,400,800,400).length,0,'No route through complete barrier');
const near=n.nearest(500,400);assert(near&&!n.blocked(near.x,near.y),'Recover valid floor after furniture moved');
for(const [w,h]of[[390,844],[1440,900],[1920,1080]]){const a=createNavigation(w,h,[]),p=a.path(w*.2,h*.7,w*.8,h*.4);assert(p.length>0);assert(p.every(p=>p.x>0&&p.x<w&&p.y>h*.30&&p.y<h))}
console.log('PASS: route around furniture, blocked routes, nearest floor, mobile/desktop bounds');
