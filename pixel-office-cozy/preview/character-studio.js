/* Layered code-native pixel rig. Canonical appearance is saved on each agent. */
(()=>{'use strict';
const options={hair:['Tóc rẽ ngôi','Tóc dựng','Tóc xoăn','Tóc mái','Undercut','Tóc bob','Tóc búi','Đuôi ngựa'],top:['Sơ mi','Hoodie','Áo thun','Blazer','Cardigan','Áo khoác'],pants:['Quần dài','Jeans','Quần short'],face:['Hiền','Tinh nghịch','Điềm tĩnh','Tươi vui'],glasses:['Không kính','Kính tròn','Kính vuông'],accessory:['Không','Tai nghe','Khuyên tai']};
const colors={hairColor:['#292837','#684b40','#b47b4c','#ddbc79','#676b95','#ae889e','#d8dce5'],topColor:['#5a8387','#5479a0','#98677b','#bd9b68','#797494','#5f7157','#d5dce4'],pantsColor:['#334454','#556375','#7d6c60','#c6bba4'],skin:['#f6d1b1','#e8b58c','#c68c68','#93654e']};
const presets=Array.from({length:8},(_,i)=>({hair:[5,0,3,6,2,4,7,1][i],top:i%6,pants:i%3,face:i%4,glasses:i===1?1:0,accessory:i===2||i===7?1:0,hairColor:colors.hairColor[i%7],topColor:colors.topColor[i%7],pantsColor:colors.pantsColor[i%4],skin:colors.skin[i%3]}));
const malePresets=Array.from({length:7},(_,i)=>({...presets[i],hair:[0,1,2,3,4,0,2][i],top:i%6,glasses:i%3,accessory:i===4?1:0}));
function normalize(raw={},index=0){const base=presets[((index%8)+8)%8],a={...base};for(const [k,vals]of Object.entries(options))if(Number.isInteger(raw[k])&&raw[k]>=0&&raw[k]<vals.length)a[k]=raw[k];for(const k of Object.keys(colors))if(/^#[0-9a-f]{6}$/i.test(raw[k]||''))a[k]=raw[k];return a}
function shade(hex,n){return '#'+[1,3,5].map(i=>Math.max(0,Math.min(255,parseInt(hex.slice(i,i+2),16)+n)).toString(16).padStart(2,'0')).join('')}
function draw(canvas,raw,direction='down',phase=0,moving=false,seated=false,activity=''){
 const a=normalize(raw),ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.imageSmoothingEnabled=false;const size=Math.min(canvas.width/80,canvas.height/100);ctx.translate((canvas.width-80*size)/2,canvas.height-100*size);ctx.scale(size,size);
 const side=direction==='left'||direction==='right',back=direction==='up';if(direction==='left'){ctx.translate(80,0);ctx.scale(-1,1)}
 const step=moving?Math.sin(phase*Math.PI/4):0,bob=moving?Math.abs(Math.sin(phase*Math.PI/4))*1.4:activity==='music'?Math.sin(phase)*1.1:0;
 const r=(x,y,w,h,col)=>{ctx.fillStyle=col;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))};
 const outline='#363b48',skin=a.skin,skinDark=shade(skin,-25),cloth=a.topColor,dark=shade(cloth,-25),hair=a.hairColor,hairDark=shade(hair,-24),pants=a.pantsColor;
 // Independent far and near limbs exchange front/back every half cycle.
 const leg=(x,s,far)=>{let y=seated?77:77+s*4,h=seated?10:(a.pants===2?9:17);r(x,y,9,h,outline);r(x+1,y,7,h-2,far?shade(pants,-14):pants);if(a.pants===2)r(x+1,y+8,7,8,skin);r(x-1,y+(a.pants===2?16:h-1),12,5,outline);r(x,y+(a.pants===2?16:h),10,2,'#e7e9eb')};
 leg(side?39:28,-step,true);leg(side?34:43,step,false);if(seated){r(side?35:28,77,side?21:10,8,pants);r(side?49:43,82,8,9,pants);r(side?48:42,89,12,4,outline)}
 const arm=(x,s,far)=>{const y=seated?61:59+s*5;const phone=['phone','game'].includes(activity),tea=activity==='tea';r(x,y,9,seated||phone||tea?14:20,outline);r(x+1,y+1,7,11,far?dark:cloth);r(x+1,y+11,7,6,skin);if(seated||phone||tea){r(x+(side?4:0),y+10,12,7,skin);r(x+(side?4:0),y+10,12,2,skinDark)}};
 arm(side?29:23,step,true);
 r(29,54,24,25,outline);r(30,55,22,22,cloth);r(30,72,22,5,dark);r(36,52,12,6,skinDark);
 if(a.top===0){r(39,57,2,18,'#edf1ec');r(35,57,5,4,'#e3ebec');r(42,57,5,4,'#e3ebec')}
 if(a.top===1){r(32,55,18,6,dark);r(34,69,14,5,dark);r(37,61,1,7,'#dce6e8');r(44,61,1,7,'#dce6e8')}
 if(a.top===3){r(38,56,7,20,'#edf0e8');r(31,56,6,15,dark);r(46,56,5,16,dark);r(35,56,4,5,'#e1e6e5');r(44,56,3,7,'#e1e6e5');r(47,66,2,2,'#e2c395')}if(a.top===4){r(37,55,8,21,'#f4eadd');r(36,57,2,18,dark);r(44,57,2,18,dark);for(let y=61;y<75;y+=5)r(46,y,2,2,'#e3ccb0')}if(a.top===5){r(40,55,2,22,'#c3d7dc');r(30,65,7,4,dark);r(46,65,5,4,dark);r(31,55,19,3,dark)}if(a.pants===1){r(30,80,1,10,'#9cb2c3');r(47,80,1,10,'#9cb2c3');r(31,83,5,1,'#809aaf')}
 // Large readable head, stepped pixel contour, cheek and hair volume.
 r(side?23:19,14,side?39:44,5,hairDark);r(side?20:16,19,side?43:50,25,hairDark);r(side?24:20,28,side?38:42,23,outline);r(side?25:21,28,side?35:40,21,skin);r(side?29:25,49,side?28:32,4,skinDark);r(side?28:24,31,side?31:34,15,skin);
 if(!back){r(side?53:28,34,3,6,outline);if(!side)r(49,34,3,6,outline);r(side?53:29,34,1,2,'#fff');if(!side)r(50,34,1,2,'#fff');r(side?56:26,42,4,2,'#d9978e');if(!side)r(51,42,5,2,'#d9978e');r(side?54:38,46,a.face===3?7:5,a.face===1||a.face===3?2:1,'#9c6460');if(a.face===2){r(side?51:26,31,6,1,hairDark);if(!side)r(48,31,6,1,hairDark)}}
 else r(22,26,39,26,hair);
 r(side?23:19,15,side?36:44,13,hair);r(side?25:22,13,side?29:36,4,shade(hair,12));r(side?21:18,25,8,18,hair);
 if(a.hair===0){r(27,23,13,8,hair);r(40,23,16,5,hair);r(37,20,3,7,hairDark)}
 if(a.hair===1){r(25,8,8,13,hair);r(36,5,9,16,hair);r(49,9,8,12,hair);r(29,7,4,6,shade(hair,18))}
 if(a.hair===2){for(let i=0;i<5;i++){r(19+i*8,11+(i%2)*3,10,13,hair);r(21+i*8,12+(i%2)*3,4,3,shade(hair,18))}r(55,23,8,10,hair)}
 if(a.hair===3){r(26,23,10,10,hair);r(36,23,8,7,hair);r(44,23,10,10,hair)}
 if(a.hair===4){r(20,24,8,12,shade(hair,25));r(29,11,27,11,hair);r(45,21,15,6,hair)}
 if(a.hair===5){r(16,25,7,27,hair);r(59,24,7,28,hair);r(22,24,33,6,hair)}
 if(a.hair===6){r(29,3,23,12,hairDark);r(32,2,17,11,hair);r(32,12,18,3,'#cf93a2')}
 if(a.hair===7){r(side?12:56,22,10,33,hairDark);r(side?13:57,25,8,31,hair);r(side?16:57,23,5,4,'#c29b7e')}
 if(!back&&a.glasses){ctx.strokeStyle=a.glasses===1?'#4a4652':'#3f5366';ctx.lineWidth=2;for(const x of(side?[49]:[25,46])){ctx.beginPath();if(a.glasses===1)ctx.roundRect(x,32,12,11,5);else ctx.rect(x,32,12,9);ctx.stroke()}r(side?45:37,35,side?5:9,2,'#4a4652')}
 if(a.accessory===1||activity==='music'){r(17,23,4,18,'#4f6789');r(60,23,4,18,'#4f6789');r(16,32,8,12,'#7296bd');r(59,32,8,12,'#7296bd');r(21,11,38,3,'#7296bd')}
 if(a.accessory===2)r(side?25:58,45,3,4,'#edc978');
 arm(side?47:51,-step,false);
 if(activity==='phone'||activity==='game'){r(47,69,activity==='game'?20:10,13,'#334553');r(49,71,activity==='game'?16:6,7,'#8dbabf');if(activity==='game'){r(47,74,4,3,'#354957');r(62,73,2,2,'#e4ac86')}}
 if(activity==='tea'){r(53,69,12,10,'#faf4df');r(55,68,8,2,'#926f55');r(64,71,3,5,'#e6dcc5');r(57,62,1,4,'#d2e3e2')}
 ctx.restore();
}
if(typeof window!=='undefined')window.CharacterStudio={options,colors,presets,malePresets,normalize,draw};if(typeof module!=='undefined')module.exports={options,colors,presets,malePresets,normalize};
})();
