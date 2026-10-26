/* Deterministic, local idle simulation; no model calls or agent reasoning. */
(()=>{'use strict';
const rules={tea:{need:'energy',objects:['coffee','table','whitetable','sofa','whitesofa','pantrycounter'],duration:13,thought:'Một tách trà rồi làm tiếp thôi.'},rest:{need:'comfort',objects:['sofa','whitesofa'],duration:16,thought:'Ngồi nghỉ một lát cho thư giãn.'},game:{need:'fun',objects:['sofa','whitesofa','table','whitetable'],duration:14,thought:'Chơi một ván ngắn nào.'},phone:{need:'social',objects:[],duration:10,thought:'Xem có tin nhắn mới không.'},music:{need:'fun',objects:[],duration:16,thought:'Bật bài nhạc yêu thích thôi.'},restroom:{need:'hygiene',objects:['restroom'],duration:12,thought:'Mình đi vệ sinh một lát.'},wander:{need:'comfort',objects:[],duration:3,thought:'Đi dạo cho giãn chân nào.'}};
function create(id,seed=0){return{id,needs:{energy:65+seed%25,comfort:55+seed%30,fun:45+seed%40,social:60,hygiene:70},current:null,cooldown:1+seed%5,elapsed:0,last:null}}
function decay(s,dt){for(const [k,rate]of Object.entries({energy:.21,comfort:.28,fun:.35,social:.19,hygiene:.16}))s.needs[k]=Math.max(0,s.needs[k]-dt*rate);s.cooldown=Math.max(0,s.cooldown-dt)}
function choices(s,personality='balanced',available=()=>true){return Object.keys(rules).filter(k=>k!==s.last&&available(k)).map(k=>({key:k,score:100-s.needs[rules[k].need]+(personality==='social'&&['tea','phone'].includes(k)?22:personality==='gamer'&&k==='game'?30:personality==='quiet'&&['music','rest'].includes(k)?22:0)+(k==='wander'?-35:0)})).sort((a,b)=>b.score-a.score)}
function finish(s){if(s.current){const r=rules[s.current.key];s.needs[r.need]=Math.min(100,s.needs[r.need]+38);s.last=s.current.key}s.current=null;s.elapsed=0;s.cooldown=3}
function cancel(s){s.current=null;s.elapsed=0;s.cooldown=0}
const api={rules,create,decay,choices,finish,cancel};if(typeof window!=='undefined')window.OfficeLife=api;if(typeof module!=='undefined')module.exports=api;
})();
