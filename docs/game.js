'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const WORLD_W=900,WORLD_H=1220,trackLayer=document.createElement('canvas');
let pixelScale=1,touchAiming=false,pointerKind='mouse';
const $=id=>document.getElementById(id),colors=['#42c7ed','#a98aef','#ffad60','#ef749d','#6fe0ae'];
const center={x:590,y:340},spacing=51,path=[{x:835,y:1130,s:0}];
let total=0;
function extendCurve(c1,c2,end){const start=path[path.length-1];for(let i=1;i<=350;i++){const t=i/350,u=1-t,p={x:u*u*u*start.x+3*u*u*t*c1.x+3*u*t*t*c2.x+t*t*t*end.x,y:u*u*u*start.y+3*u*u*t*c1.y+3*u*t*t*c2.y+t*t*t*end.y};const previous=path[path.length-1];total+=Math.hypot(p.x-previous.x,p.y-previous.y);path.push({...p,s:total});}}
// One continuous route: outer left hairpin, lower sweep, upper loop, inner spiral.
const trackCurves=[
[600,1180,140,1180,85,1055],
[30,955,130,850,80,740],
[45,620,35,490,80,390],
[80,240,100,95,140,105],
[190,60,215,120,190,205],
[145,325,160,380,210,510],
[245,620,260,660,220,790],
[175,895,160,955,245,1010],
[350,1110,635,1125,735,1020],
[820,970,815,900,800,820],
[790,740,740,660,770,560],
[790,440,860,430,805,300],
[810,160,710,100,570,110],
[430,90,350,140,320,225],
[270,300,275,415,330,470],
[380,550,520,535,600,625],
[730,710,730,840,620,900],
[545,965,400,970,375,880],
[320,835,325,765,365,730],
[410,695,470,705,500,750]
];
// Match both tangent direction and magnitude at every Bézier join.
for(let i=0;i<trackCurves.length-1;i++){const a=trackCurves[i],b=trackCurves[i+1],x=a[4],y=a[5],li=Math.hypot(x-a[2],y-a[3]),lo=Math.hypot(b[0]-x,b[1]-y);let tx=(x-a[2])/li+(b[0]-x)/lo,ty=(y-a[3])/li+(b[1]-y)/lo;const norm=Math.hypot(tx,ty)||1;tx/=norm;ty/=norm;const prev=i?trackCurves[i-1].slice(4):[835,1130],before=Math.hypot(x-prev[0],y-prev[1]),after=Math.hypot(b[4]-x,b[5]-y),h=Math.min(90,(li+lo)/2,before*.45,after*.45);a[2]=x-tx*h;a[3]=y-ty*h;b[0]=x+tx*h;b[1]=y+ty*h;}
for(const [a,b,c,d,e,f] of trackCurves)extendCurve({x:a,y:b},{x:c,y:d},{x:e,y:f});
function point(s){s=Math.max(0,Math.min(total,s));let lo=0,hi=path.length-1;while(lo<hi){const m=(lo+hi)>>1;if(path[m].s<s)lo=m+1;else hi=m;}if(!lo)return {x:path[0].x,y:path[0].y};const a=path[lo-1],b=path[lo],t=(s-a.s)/(b.s-a.s||1);return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};}
function increasing(a){return a.length===5&&a.every((v,i)=>!i||v>a[i-1]);}
function findRun(values){for(let i=0;i<=values.length-5;i++)if(increasing(values.slice(i,i+5)))return i;return -1;}
const random=()=>1+Math.floor(Math.random()*30);
let balls=[],ammo=12,next=8,score=0,shots=0,state='ready',last=0,selected=-1,bullet=null,particles=[],aim={x:450,y:100},muted=true,audio,toastUntil=0,head=0,impact=null,ammoColor=4,nextColor=0,pointerActive=false,currentSpeed=6,elapsed=0,spawnClock=0,maxCombo=0; 
function generate(){balls=[];for(let group=0;group<5;group++){let vals;do{vals=Array.from({length:5},random)}while(findRun(vals)>=0);for(let v of vals)balls.push({v,color:Math.floor(Math.random()*5),s:0});}if(findRun(balls.map(b=>b.v))>=0){generate();return;}head=spacing*24+50;balls.forEach((b,i)=>b.s=head-i*spacing);}
function pickAmmo(){// Mix random numbers with numbers that fit useful gaps in the current chain.
if(balls.length&&Math.random()<.7){const candidates=[];for(let i=0;i<=balls.length;i++){const low=i?balls[i-1].v:0,high=i<balls.length?balls[i].v:31;for(let n=low+1;n<high;n++)candidates.push(n);}if(candidates.length)return candidates[Math.floor(Math.random()*candidates.length)];}return random();}
const BASE_SPEED=6;
function speedMultiplier(count){if(count<=0)return 0;if(count>=25)return 1;if(count>=15)return 1+(25-count)/10;return Math.min(4,2+(15-count)/5);}
function targetMultiplier(){return Math.min(6,speedMultiplier(balls.length)*(1+Math.min(2,elapsed/240)));}
function spawnInterval(){return 2*Math.max(.9,2.2-elapsed/360);}
function spawnBall(){if(state!=='playing')return;if(!balls.length)head=24;else{const tailSlot=head-(balls.length-1)*spacing;head+=Math.max(0,spacing+24-tailSlot);}balls.push({v:random(),color:Math.floor(Math.random()*5),s:24});spawnClock=0;stats();}
function showSpeed(){const factor=currentSpeed/BASE_SPEED;$('speed').textContent=factor.toFixed(1)+'×';$('speed').style.color=factor>=3?'#ffb66e':'#76edc4';$('speed').title='ความเร็วเป้าหมาย '+targetMultiplier().toFixed(1)+' เท่า';}
function advanceSpeed(dt){const target=BASE_SPEED*targetMultiplier();currentSpeed+=(target-currentSpeed)*(1-Math.exp(-1.5*dt));showSpeed();}
function stats(){$('score').textContent=score;$('left').textContent=balls.length;$('shots').textContent=shots;showSpeed();}
function tone(freq,length=.1){if(muted)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();audio.resume();const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.setValueAtTime(freq,audio.currentTime);g.gain.setValueAtTime(.06,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+length);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+length);}catch{}}
function toast(t){$('toast').textContent=t;toastUntil=performance.now()+2100;}
function recordRun(status=state){PlayerStats.save({score,shots,seconds:Math.round(elapsed*10)/10,cleared:score/20,combo:maxCombo},status);}
function begin(){const name=$('player-name').value.trim();if(!name){$('player-name').focus();$('save-status').textContent='กรุณากรอกชื่อผู้เล่นก่อนเริ่มเกม';return;}if(state==='playing'||state==='paused')recordRun('restarted');PlayerStats.begin(name);maxCombo=0;elapsed=0;spawnClock=0;currentSpeed=BASE_SPEED;generate();ammo=pickAmmo();next=pickAmmo();score=shots=0;selected=-1;pointerActive=false;touchAiming=false;bullet=null;impact=null;ammoColor=Math.floor(Math.random()*5);nextColor=Math.floor(Math.random()*5);particles=[];state='playing';$('overlay').classList.add('hidden');$('pause').disabled=false;$('pause').textContent='พักเกม';stats();recordRun('playing');canvas.focus();}
function finish(){state='lost';recordRun('lost');$('title').textContent='ถึงปลายทางแล้ว';$('intro').textContent=`ได้ ${score} คะแนน • ยิง ${shots} ครั้ง • เล่น ${Math.floor(elapsed/60)} นาที ${Math.floor(elapsed%60)} วินาที`;$('start').textContent='เล่นอีกครั้ง';$('overlay').classList.remove('hidden');$('pause').disabled=true;tone(160,.35);}
function clearRuns(){let i,combo=0;while((i=findRun(balls.map(b=>b.v)))>=0){const gone=balls.splice(i,5);for(const b of gone){const p=point(b.s);for(let n=0;n<14;n++)particles.push({x:p.x,y:p.y,vx:(Math.random()-.5)*220,vy:(Math.random()-.5)*220,life:.8,color:colors[b.color]});}head=Math.max(spacing*(balls.length-1)+30,head-5*spacing);score+=100;combo++;}if(combo){maxCombo=Math.max(maxCombo,combo);recordRun();toast(`เรียงครบ 5! +${combo*100} คะแนน`);tone(660,.25);}selected=-1;stats();if(!balls.length){spawnBall();toast(`เคลียร์หมด! เล่นต่อได้เลย • ${score} คะแนน`);}}
function shoot(index){if(state!=='playing'||bullet||impact||index<0||index>=balls.length)return;selected=index;const target=balls[index];bullet={x:center.x,y:center.y,target,side:insertionSide(target),value:ammo,color:ammoColor};ammo=next;ammoColor=nextColor;next=pickAmmo();nextColor=Math.floor(Math.random()*5);shots++;tone(320,.07);stats();}
function insertionSide(target){if(!pointerActive)return 1;const p=point(target.s),ahead=point(target.s+5),behind=point(target.s-5);return (aim.x-p.x)*(ahead.x-behind.x)+(aim.y-p.y)*(ahead.y-behind.y)>=0?-1:1;}
function gapPoint(target,side){return point(target.s+(side<0?1:-1)*spacing/2);}
function aimingPoint(){if(bullet)return gapPoint(bullet.target,bullet.side);if(impact)return point(impact.ball.s);const target=balls[selected];return target?gapPoint(target,insertionSide(target)):aim;}
function insertBall(shot){const targetIndex=balls.indexOf(shot.target);if(targetIndex<0)return;const index=targetIndex+(shot.side<0?0:1);const added={v:shot.value,color:shot.color,s:shot.target.s+(shot.side<0?1:-1)*spacing/2};balls.splice(index,0,added);head+=spacing;impact={ball:added,remaining:.6};selected=index;toast(`แทรกเลข ${shot.value} • เพิ่ม 1 ลูก`);tone(480,.12);stats();}
function pause(){if(state==='playing'){state='paused';$('pause').textContent='เล่นต่อ';}else if(state==='paused'){state='playing';$('pause').textContent='พักเกม';}if(state==='paused'||state==='playing')recordRun();}
function ball(x,y,r,value,color,highlight=false){ctx.save();ctx.shadowColor=color;ctx.shadowBlur=highlight?22:8;const g=ctx.createRadialGradient(x-r*.35,y-r*.4,r*.05,x,y,r);g.addColorStop(0,'#fff');g.addColorStop(.2,color);g.addColorStop(.7,color);g.addColorStop(1,'#26334c');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle=highlight?'#fff':'#ffffff55';ctx.lineWidth=highlight?3:1;ctx.stroke();ctx.fillStyle='#071422';ctx.font=`800 ${r*.91}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(value,x,y+1);ctx.restore();}
function paintTrack(ctx){ctx.clearRect(0,0,WORLD_W,WORLD_H);ctx.fillStyle='#070b20';ctx.fillRect(0,0,WORLD_W,WORLD_H);
for(const [x,y,r,c] of [[630,270,590,'#32266080'],[140,850,530,'#09526e60'],[750,1120,460,'#40246c65']]){const glow=ctx.createRadialGradient(x,y,0,x,y,r);glow.addColorStop(0,c);glow.addColorStop(1,'#070b2000');ctx.fillStyle=glow;ctx.fillRect(0,0,WORLD_W,WORLD_H);}
let seed=5731;const seeded=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};for(let i=0;i<230;i++){const x=seeded()*WORLD_W,y=seeded()*WORLD_H,r=.5+seeded()*1.25;ctx.globalAlpha=.25+seeded()*.65;ctx.fillStyle=i%5?'#d9eeff':'#b9a5ff';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
ctx.lineCap=ctx.lineJoin='round';const trace=()=>{ctx.beginPath();ctx.moveTo(path[0].x,path[0].y);for(const c of trackCurves)ctx.bezierCurveTo(...c);};
ctx.save();ctx.shadowColor='#38d7ff';ctx.shadowBlur=18;ctx.strokeStyle='#2799ba66';ctx.lineWidth=65;trace();ctx.stroke();ctx.restore();
for(const [w,c] of [[65,'#153c64'],[59,'#6dcdf2'],[54,'#0e2449'],[43,'#10182f']]){ctx.strokeStyle=c;ctx.lineWidth=w;trace();ctx.stroke();}
for(let s=80;s<total;s+=170){const p=point(s),q=point(s+8),a=Math.atan2(q.y-p.y,q.x-p.x);ctx.save();ctx.translate(p.x,p.y);ctx.rotate(a);ctx.strokeStyle='#648cb8';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-6,-6);ctx.lineTo(1,0);ctx.lineTo(-6,6);ctx.stroke();ctx.restore();}}
function resizeCanvas(){const r=canvas.getBoundingClientRect();const dpr=Math.min(window.devicePixelRatio||1,2.5);const width=Math.max(1,Math.round(r.width*dpr)),height=Math.round(width*WORLD_H/WORLD_W);if(canvas.width===width&&canvas.height===height&&trackLayer.width===width)return;canvas.width=trackLayer.width=width;canvas.height=trackLayer.height=height;pixelScale=width/WORLD_W;ctx.setTransform(pixelScale,0,0,pixelScale,0,0);const bg=trackLayer.getContext('2d');bg.setTransform(pixelScale,0,0,pixelScale,0,0);paintTrack(bg);}
function draw(){ctx.clearRect(0,0,WORLD_W,WORLD_H);ctx.drawImage(trackLayer,0,0,WORLD_W,WORLD_H);
const end=point(total);ctx.fillStyle='#ddd5ff';ctx.font='15px Tahoma';ctx.textAlign='center';ctx.fillText('ปลายทาง',end.x+9,end.y-43);ctx.save();ctx.shadowColor='#a882ff';ctx.shadowBlur=22;ctx.beginPath();ctx.arc(end.x,end.y,29,0,Math.PI*2);ctx.fillStyle='#090b15';ctx.fill();ctx.strokeStyle='#aa8aff';ctx.lineWidth=3;ctx.stroke();ctx.restore();const start=point(0);ctx.fillStyle='#a5d8f8';ctx.fillText('เริ่ม',start.x,start.y-48);
if((pointerActive&&state==='playing')||(selected>=0&&balls[selected])){const length=Math.hypot(aim.x-center.x,aim.y-center.y)||1;const p=selected>=0&&balls[selected]?aimingPoint():{x:center.x+(aim.x-center.x)/length*900,y:center.y+(aim.y-center.y)/length*900};ctx.save();ctx.setLineDash([5,10]);ctx.strokeStyle='#86efd485';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(center.x,center.y);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.restore();}
balls.forEach((b,i)=>{const p=point(b.s);ball(p.x,p.y,23,b.v,colors[b.color],impact&&impact.ball===b);});
if(selected>=0&&balls[selected]&&state==='playing'&&!impact){const p=aimingPoint();ctx.save();ctx.strokeStyle='#c5ffec';ctx.lineWidth=3;ctx.setLineDash([4,4]);ctx.beginPath();ctx.arc(p.x,p.y,20,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#fff';ctx.font='bold 23px system-ui';ctx.textAlign='center';ctx.fillText('+',p.x,p.y+7);ctx.restore();}
// The first ball indicates where to begin reading the number sequence.
if(balls.length){const p=point(balls[0].s);ctx.fillStyle='#d4edff';ctx.font='12px Tahoma';ctx.textAlign='center';ctx.fillText('หัวแถว',p.x,p.y-33);}
ctx.save();ctx.translate(center.x,center.y);ctx.fillStyle='#131d3c';ctx.strokeStyle='#6ddcff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,65,0,Math.PI*2);ctx.fill();ctx.stroke();let target=aimingPoint();ctx.rotate(Math.atan2(target.y-center.y,target.x-center.x));ctx.fillStyle='#a5deff';ctx.fillRect(17,-13,65,26);ctx.fillStyle='#3762a0';ctx.fillRect(23,-8,62,16);ctx.restore();ball(center.x,center.y,33,ammo,colors[ammoColor]);ctx.fillStyle='#bcd9f4';ctx.font='15px Tahoma';ctx.textAlign='center';ctx.fillText('ลูกที่จะยิง',center.x,center.y+90);ctx.fillText('ถัดไป',center.x+105,center.y+105);ball(center.x+105,center.y+60,23,next,colors[nextColor]);ctx.font='14px Tahoma';ctx.fillStyle='#93b0dc';ctx.fillText('สีต่างกันก็เรียงด้วยกันได้',center.x,center.y-100);
if(impact){const p=point(impact.ball.s);ctx.save();ctx.strokeStyle='#b6ffe7';ctx.globalAlpha=impact.remaining/.6;ctx.lineWidth=4;ctx.beginPath();ctx.arc(p.x,p.y,25+(1-impact.remaining/.6)*20,0,Math.PI*2);ctx.stroke();ctx.restore();}
if(bullet)ball(bullet.x,bullet.y,22,bullet.value,colors[bullet.color]);for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/.8);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,4,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
if(state==='paused'){ctx.fillStyle='#061122c9';ctx.fillRect(0,0,WORLD_W,WORLD_H);ctx.fillStyle='#fff';ctx.font='bold 35px Tahoma';ctx.fillText('พักเกม',450,310);ctx.font='20px Tahoma';ctx.fillText('กด “เล่นต่อ” เมื่อพร้อม',450,355);}}
function tick(t){let dt=Math.min((t-last)/1000,.05);last=t;if(state==='playing'){elapsed+=dt;spawnClock+=dt;advanceSpeed(dt);head+=currentSpeed*dt;const follow=1-Math.exp(-6*dt);balls.forEach((b,i)=>{b.s+=(head-i*spacing-b.s)*follow;});if(impact){impact.remaining-=dt;if(impact.remaining<=0){impact=null;clearRuns();}}if(bullet){if(!balls.includes(bullet.target)){bullet=null}else{const p=gapPoint(bullet.target,bullet.side),d=Math.hypot(p.x-bullet.x,p.y-bullet.y),step=850*dt;if(d<=step){insertBall(bullet);bullet=null;}else{bullet.x+=(p.x-bullet.x)/d*step;bullet.y+=(p.y-bullet.y)/d*step;}}}if(!impact&&spawnClock>=spawnInterval())spawnBall();if(!impact&&balls.length&&Math.max(head,balls[0].s)>=total-6)finish();}if(state!=='paused'){particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt});particles=particles.filter(p=>p.life>0);}if(t>toastUntil)$('toast').textContent='';if(pointerActive&&state==='playing'&&!bullet&&!impact)selected=mouseTarget(aim);draw();requestAnimationFrame(tick);}
function locate(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*WORLD_W/r.width,y:(e.clientY-r.top)*WORLD_H/r.height};}
function nearest(p){let best=-1,d=pointerKind==='touch'?62:39;balls.forEach((b,i)=>{const q=point(b.s),n=Math.hypot(p.x-q.x,p.y-q.y);if(n<d){d=n;best=i}});return best;}
// Aim anywhere along the direction from the launcher; highlight the first ball on that ray.
function mouseTarget(p){const direct=nearest(p);if(direct>=0)return direct;const dx=p.x-center.x,dy=p.y-center.y,length=Math.hypot(dx,dy);if(length<30)return -1;const ux=dx/length,uy=dy/length;let best=-1,first=Infinity;balls.forEach((b,i)=>{const q=point(b.s),rx=q.x-center.x,ry=q.y-center.y,forward=rx*ux+ry*uy,side=Math.abs(rx*uy-ry*ux);if(forward>65&&side<=31){const hit=forward-Math.sqrt(31*31-side*side);if(hit<first){first=hit;best=i;}}});return best;}
function updateAim(e){aim=locate(e);pointerKind=e.pointerType||'mouse';pointerActive=true;canvas.style.cursor='crosshair';if(state==='playing'&&!bullet&&!impact)selected=mouseTarget(aim);}
function fireAim(){if(state!=='playing'||bullet||impact)return;const target=mouseTarget(aim);if(target>=0)shoot(target);else toast(pointerKind==='touch'?'ลากนิ้วเล็งช่อง + แล้วปล่อยเพื่อยิง':'เล็งเส้นประไปที่ลูกบอล แล้วคลิกซ้ายเพื่อยิง');}
canvas.addEventListener('pointermove',e=>{if(e.pointerType==='touch'&&!touchAiming)return;updateAim(e);});
canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;if(!e.isPrimary&&e.isPrimary!==undefined)return;e.preventDefault();canvas.focus({preventScroll:true});updateAim(e);if(e.pointerType==='touch'||e.pointerType==='pen'){touchAiming=true;canvas.setPointerCapture(e.pointerId);}else fireAim();});
canvas.addEventListener('pointerup',e=>{if(!touchAiming)return;updateAim(e);touchAiming=false;fireAim();if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);});
canvas.addEventListener('pointercancel',()=>{touchAiming=false;pointerActive=false;if(!bullet&&!impact)selected=-1;});
canvas.addEventListener('pointerleave',()=>{if(touchAiming)return;pointerActive=false;if(!bullet&&!impact)selected=-1;});
canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Enter',' '].includes(e.key)){e.preventDefault();pointerActive=false;if(state!=='playing'||!balls.length)return;if(e.key==='ArrowRight')selected=(selected+1)%balls.length;else if(e.key==='ArrowLeft')selected=(selected-1+balls.length)%balls.length;else shoot(selected<0?0:selected);}});
$('open-stats').onclick=()=>{if(state==='playing')pause();PlayerStats.open();};setInterval(()=>{if(state==='playing')recordRun();},15000);window.addEventListener('pagehide',()=>{if(state==='playing'||state==='paused')recordRun('interrupted');});$('start').onclick=begin;$('restart').onclick=begin;$('pause').onclick=pause;$('sound').onclick=()=>{muted=!muted;$('sound').textContent=muted?'เสียง: ปิด':'เสียง: เปิด';$('sound').setAttribute('aria-pressed',String(!muted));$('sound').setAttribute('aria-label',muted?'เปิดเสียง':'ปิดเสียง');tone(440);};document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')pause();});generate();resizeCanvas();new ResizeObserver(resizeCanvas).observe(canvas);window.addEventListener('resize',resizeCanvas);requestAnimationFrame(tick);
