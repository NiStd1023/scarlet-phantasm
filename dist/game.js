'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id), W=480,H=720, keys=new Set();
const art=new Image();art.src='key-art.png';
const sprites={};
for(const key of ['player','player_cast','enemy','enemy_cast','midboss','boss1','boss2','boss3','boss3_rage']){const img=new Image();img.src='assets/'+key+'.webp';sprites[key]=img;}
let state='title', prev=0, game, dragging=false, lastPointer=null, focusTouch=false, soundOn=true, audio=null;
const musicAudio=$('bgm');
musicAudio.loop=true; musicAudio.preload='auto'; musicAudio.volume=.8;
let musicTrack='stage1', musicBlocked=false, musicRequest=0, previewing=false;
const trackNames={stage1:'霧之森・戰鬥曲',boss1:'霧之森・頭目曲',stage2:'緋月之庭・戰鬥曲',boss2:'緋月之庭・頭目曲',stage3:'紅月終焉・戰鬥曲',boss3:'紅月終焉・頭目曲'};
function audioStatus(){
  $('sound').textContent=soundOn?'♫':'♪̸';
  $('sound').setAttribute('aria-label',musicBlocked?'重新啟用音樂':soundOn?'關閉聲音':'開啟聲音');
  $('sound').setAttribute('aria-pressed',String(soundOn));
  $('sound').title=musicBlocked?'點擊重新啟用音樂':soundOn?'關閉聲音':'開啟聲音';
  $('musicStatus').textContent=musicBlocked?'♫ 點音符重新啟用音樂':soundOn?'♫ '+(previewing?'試聽：':'')+trackNames[musicTrack]:'♪ 聲音已關閉';
  for(let i=1;i<=3;i++)$('preview'+i).setAttribute('aria-pressed',String(previewing&&musicTrack==='stage'+i&&!musicAudio.paused));
}
function playMusic(track=musicTrack){
  if(track!==musicTrack){musicAudio.pause();musicTrack=track;musicAudio.src='music/'+track+'-v5.mp3';}
  if(!soundOn||(state!=='play'&&!previewing)){audioStatus();return;}
  musicBlocked=false;audioStatus();
  const request=++musicRequest;
  try{const result=musicAudio.play();if(result&&typeof result.catch==='function')result.catch(()=>{
    if(request===musicRequest&&soundOn&&(state==='play'||previewing)){musicBlocked=true;audioStatus();}
  });}catch(e){musicBlocked=true;audioStatus();}
}
function pauseMusic(){musicRequest++;musicAudio.pause();}
musicAudio.addEventListener('error',()=>{if(soundOn&&(state==='play'||previewing)){musicBlocked=true;audioStatus();}});
musicAudio.addEventListener('playing',audioStatus);
musicAudio.addEventListener('pause',audioStatus);
function previewMusic(n){
 if(state==='play'||state==='pause')return;
 let track='stage'+n;
 if(previewing&&musicTrack===track&&!musicAudio.paused){pauseMusic();previewing=false;audioStatus();return;}
 previewing=true;soundOn=true;initAudio();playMusic(track);audioStatus();
}
for(let i=1;i<=3;i++)$('preview'+i).addEventListener('click',()=>previewMusic(i));

let high=0;try{high=Number(localStorage.getItem('scarlet-high'))||0}catch(e){}; $('high').textContent=String(high).padStart(8,'0');
function sound(freq=440,duration=.09,type='sine',vol=.035,slide=1){if(!soundOn||!audio)return;let t=audio.currentTime,o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(30,freq*slide),t+duration);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g).connect(audio.destination);o.start(t);o.stop(t+duration+.01)}
function initAudio(){try{if(!audio)audio=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume()}catch(e){}}
function reset(){game={stage:1,time:0,score:0,lives:3,bombs:3,player:{x:W/2,y:H-105,inv:2,shot:0,power:1,cast:0,lean:0,shotGlow:0,hurt:0,focus:false,volley:0},bullets:[],shots:[],enemies:[],items:[],particles:[],stars:Array.from({length:50},()=>({x:Math.random()*W,y:Math.random()*H,s:Math.random()*1.7+.4,v:Math.random()*30+10})),spawn:1,enemyCount:0,mid:false,end:false,boss:null,flash:0,background:0};updateHUD()}
function updateHUD(){$('lives').textContent='♥ '.repeat(game.lives).trim()||'—';$('bombs').textContent='✦ '.repeat(game.bombs).trim()||'—';$('score').textContent=String(game.score).padStart(8,'0');$('weapon').textContent='Lv. '+game.player.power;$('stageLabel').textContent=`STAGE 0${game.stage}`;$('stageName').textContent=['霧之森','緋月之庭','紅月終焉'][game.stage-1];$('high').textContent=String(Math.max(high,game.score)).padStart(8,'0')}
let noticeTimer=0;function notice(text){$('notice').textContent=text;$('notice').classList.add('show');noticeTimer=2.2}
function start(){initAudio();previewing=false;pauseMusic();musicAudio.currentTime=0;reset();state='play';$('previewControls').hidden=true;playMusic('stage1');$('overlay').classList.add('hidden');$('start').textContent='重新開始 ✦';prev=0;notice('第一關　霧之森')}
function finish(win){state=win?'win':'over';pauseMusic();$('previewControls').hidden=false;if(game.score>high){high=game.score;try{localStorage.setItem('scarlet-high',String(high))}catch(e){}}updateHUD();$('overlay').classList.remove('hidden');$('overlayText').textContent=win?'紅月落下，結界重新恢復平靜。恭喜通關！':'夜色尚未散去，再次挑戰紅月吧。';$('start').innerHTML=win?'再次挑戰 <span>✦</span>':'重新挑戰 <span>✦</span>';sound(win?660:150,.8,'triangle',.09,win?1.5:.4)}
function bomb(){if(state!=='play'||game.bombs<=0)return;initAudio();game.bombs--;game.player.inv=3;game.player.cast=1.6;game.bullets=[];game.flash=.65;for(const e of game.enemies)e.hp-=35;if(game.boss)game.boss.hp-=125;for(let i=0;i<40;i++)particle(game.player.x,game.player.y,'#ffd7b6',Math.random()*250);sound(180,.5,'sawtooth',.07,.4);sound(550,.7,'sine',.07,1.9);notice('靈力爆發');updateHUD()}
function enemy(){
 let x=55+Math.random()*(W-110),hp=[15,20,25][game.stage-1];game.enemyCount++;
 let roll=Math.random(),drop=game.enemyCount%4===0?'power':roll<.18?'bomb':roll<.29?'power':null;
 game.enemies.push({x,y:-30,base:x,hp,max:hp,t:0,phase:Math.random()*6,shot:1+Math.random(),shotPhase:0,drop,kind:Math.random()<.5?0:1,cast:0,hitfx:0})
}
function spawnBoss(kind){
 let hp=kind==='mid'?(game.stage===3?360:260):(game.stage===3?780:500);
 game.boss={x:W/2,y:-70,hp,max:hp,t:0,shot:1,kind,phase:0,cast:0,attackType:0,hitfx:0};
 playMusic('boss'+game.stage);
 notice(kind==='mid'?'道中頭目　現身':game.stage===3?'終極頭目　現身':'關卡頭目　現身');
 sound(240,.5,'sawtooth',.05,.65)
}
// Keep dense attacks bounded so the game remains responsive on mobile devices.
const MAX_ENEMY_BULLETS=420;
function fireBullet(x,y,a,s,color,r=5,{shape='orb',curve=0,curveTime=2.4}={}){
 if(game.bullets.length>=MAX_ENEMY_BULLETS)return;
 game.bullets.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,color,r,shape,curve,curveTime,age:0});
}
function advanceEnemyBullet(z,dt){
 // Rotate the velocity gradually: these are actual curved trajectories, not
 // straight bullets arranged in a circle. The turn eases into a straight path.
 const age=z.age||0,remaining=Math.max(0,(z.curveTime||0)-age);
 if(z.curve&&remaining>0){
   const step=Math.min(dt,remaining),turn=z.curve*step*(remaining-step*.5)/z.curveTime,c=Math.cos(turn),s=Math.sin(turn),vx=z.vx;
   z.vx=vx*c-z.vy*s;z.vy=vx*s+z.vy*c;
 }
 z.x+=z.vx*dt;z.y+=z.vy*dt;z.age=age+dt;
}
function enemyPattern(e){
 const p=game.player,a=Math.atan2(p.y-e.y,p.x-e.x),stage=game.stage,phase=e.shotPhase++;
 if(e.kind===0){
   // Flower fairies release paired curving petals around an aimed center.
   const half=stage===1?2:3;
   for(let i=-half;i<=half;i++)fireBullet(e.x,e.y,a+i*.17,105+stage*7,
     i%2?'#ff8eae':'#ffd4ba',4,{shape:'petal',curve:i===0?0:Math.sign(i)*.25,curveTime:1.5});
 }else{
   // The second enemy type sweeps alternating crystal fans across the player.
   const direction=phase%2?1:-1,half=stage===3?3:2;
   for(let i=-half;i<=half;i++)fireBullet(e.x,e.y,a+i*.14,112+stage*8,
     i%2?'#aebeff':'#eed0ff',4,{shape:'crystal',curve:direction*.32,curveTime:1.8});
 }
}
function pattern(b){
 b.cast=.48;b.attackType=b.phase%4;
 const p=game.player,a=Math.atan2(p.y-b.y,p.x-b.x),lvl=game.stage,phase=b.phase%4;
 const finalRage=lvl===3&&b.kind==='end'&&b.hp<b.max*.5;
 const speed=finalRage?1.13:1,turn=finalRage?1.18:1;
 const palette=[['#ff91b4','#a6c9ff','#ffe0ad'],['#ff88a9','#c4a8ff','#ffd49f'],['#ff739b','#b6b7ff','#ffd09b']][lvl-1];
 if(phase===0){
   // Alternating clockwise/counterclockwise petals form a rotating flower.
   const count=(b.kind==='mid'?16:20+lvl*2)+(finalRage?4:0);
   for(let i=0;i<count;i++){
     const angle=i*Math.PI*2/count+b.t*.22;
     fireBullet(b.x,b.y,angle,(92+lvl*9)*speed,palette[i%2],5,
       {shape:'petal',curve:(i%2?1:-1)*(.35+lvl*.035)*turn,curveTime:2.3});
   }
 }else if(phase===1){
   // Curved aimed needles leave a readable opening around the middle.
   const half=lvl===1?4:5;
   for(let i=-half;i<=half;i++)fireBullet(b.x,b.y,a+i*.16,(125+lvl*8)*speed,
     palette[(i+half)%3],4,{shape:'needle',curve:i===0?0:Math.sign(i)*.27*turn,curveTime:1.7});
 }else if(phase===2){
   // Two counter-rotating rings create interleaving spiral arms.
   const count=b.kind==='mid'?8:9+lvl;
   for(let ring=0;ring<2;ring++)for(let i=0;i<count;i++){
     const angle=b.t*.52+i*Math.PI*2/count+ring*.18;
     fireBullet(b.x,b.y,angle,(88+ring*29+lvl*5)*speed,palette[ring?1:0],4,
       {shape:ring?'crystal':'orb',curve:(ring?-.58:.58)*turn,curveTime:2.1});
   }
 }else{
   // Layered fans bend in opposite directions to form expanding arcs.
   const half=lvl===3?4:3;
   for(let row=0;row<3;row++)for(let i=-half;i<=half;i++){
     const angle=a+i*.17+(row-1)*.055;
     fireBullet(b.x,b.y,angle,(100+row*22+lvl*5)*speed,palette[row],4,
       {shape:row===1?'needle':'petal',curve:(row-1)*.32*turn,curveTime:1.8});
   }
 }
 b.phase++;
}
function particle(x,y,color,speed){let a=Math.random()*Math.PI*2;game.particles.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:.4+Math.random()*.5,color})}
function dieEnemy(e){game.score+=100;for(let i=0;i<8;i++)particle(e.x,e.y,'#f5b0b0',Math.random()*95);if(e.drop)game.items.push({x:e.x,y:e.y,vy:45,type:e.drop});sound(370,.09,'triangle',.025,.5)}
function hit(){if(game.player.inv>0)return;game.lives--;game.player.inv=2.8;game.player.hurt=.5;game.bullets=[];game.flash=.3;for(let i=0;i<24;i++)particle(game.player.x,game.player.y,'#fff0d1',Math.random()*190);sound(240,.35,'sawtooth',.07,.3);updateHUD();if(game.lives<=0)finish(false)}
function firePlayerVolley(g,p){
 const focus=p.focus, speed=focus?620:560, wide=focus?-34:68, flip=p.volley++%2;
 const shot=(x,y,style,vx,power=1,wave=0)=>g.shots.push({x,y,vx,vy:-speed,power,style,wave,phase:flip*Math.PI,age:0});
 // Twin talisman-lances remain the readable core at every power level.
 shot(p.x-9,p.y-18,'lance',focus?-3:-9,1);shot(p.x+9,p.y-18,'lance',focus?3:9,1);
 // At level 2 the paired charms release feather blades in an outward fan.
 if(p.power>=2){shot(p.x-25,p.y-8,'feather',-wide,1,focus?0:22);shot(p.x+25,p.y-8,'feather',wide,1,focus?0:-22)}
 // Level 3 adds a bright rotating star, with a gentle weave outside focus mode.
 if(p.power>=3)shot(p.x,p.y-25,'star',0,1.3,focus?0:36);
}
function update(dt){if(state!=='play')return;let g=game,p=g.player;g.background+=dt;g.flash=Math.max(0,g.flash-dt);p.inv=Math.max(0,p.inv-dt);p.cast=Math.max(0,p.cast-dt);p.hurt=Math.max(0,p.hurt-dt);p.shotGlow=Math.max(0,p.shotGlow-dt);let focus=keys.has('shift')||focusTouch;p.focus=focus;let speed=focus?130:240,dx=(keys.has('arrowright')||keys.has('d')?1:0)-(keys.has('arrowleft')||keys.has('a')?1:0),dy=(keys.has('arrowdown')||keys.has('s')?1:0)-(keys.has('arrowup')||keys.has('w')?1:0);if(dx&&dy){dx*=.707;dy*=.707}p.lean+=(dx*.22-p.lean)*Math.min(1,dt*8);p.x=Math.max(14,Math.min(W-14,p.x+dx*speed*dt));p.y=Math.max(20,Math.min(H-20,p.y+dy*speed*dt));p.shot-=dt;if(p.shot<=0){
 p.shot=.11;p.shotGlow=.10;firePlayerVolley(g,p);
}
if(!g.boss){g.time+=dt;g.spawn-=dt;if(g.spawn<=0&&g.time<48){enemy();g.spawn=Math.max(.65,1.35-g.stage*.15)}if(g.time>=20&&!g.mid){g.mid=true;spawnBoss('mid')}else if(g.time>=48&&!g.end){g.end=true;spawnBoss('end')}}
for(const s of g.stars){s.y+=s.v*dt;if(s.y>H){s.y=0;s.x=Math.random()*W}}
for(const s of g.shots){s.age=(s.age||0)+dt;s.y+=(s.vy||-560)*dt;s.x+=((s.vx||0)+Math.sin(s.age*9+(s.phase||0))*(s.wave||0))*dt}g.shots=g.shots.filter(s=>s.y>-20&&s.x>-20&&s.x<W+20);
for(const e of g.enemies){e.t+=dt;e.cast=Math.max(0,e.cast-dt);e.hitfx=Math.max(0,e.hitfx-dt);e.y+=55*dt;e.x=e.base+Math.sin(e.t*1.5+e.phase)*35;e.shot-=dt;if(e.shot<=0){e.shot=2.1;e.cast=.45;enemyPattern(e)}}
let b=g.boss;if(b){b.t+=dt;b.cast=Math.max(0,b.cast-dt);b.hitfx=Math.max(0,b.hitfx-dt);b.y=Math.min(115,b.y+75*dt);b.x=W/2+Math.sin(b.t*.8)*125;b.shot-=dt;if(b.y>=100&&b.shot<=0){pattern(b);b.shot=game.stage===3&&b.kind==='end'?(b.hp<b.max*.5?.60:.76):b.kind==='mid'?1.15:.82}}
for(const s of g.shots){for(const e of g.enemies){if(!s.dead&&Math.hypot(s.x-e.x,s.y-e.y)<17){e.hp-=5*(s.power||1);e.hitfx=.12;s.dead=true;if(g.particles.length<100)particle(s.x,s.y,s.style==='feather'?'#bcd5ff':'#ffe3b6',65)}}if(b&&!s.dead&&Math.hypot(s.x-b.x,s.y-b.y)<32){b.hp-=5*(s.power||1);b.hitfx=.1;s.dead=true;if(g.particles.length<100)particle(s.x,s.y,s.style==='feather'?'#bcd5ff':'#ffe3b6',65)}}
g.shots=g.shots.filter(s=>!s.dead);g.enemies=g.enemies.filter(e=>{if(e.hp<=0){dieEnemy(e);return false}return e.y<H+50});
if(b&&b.hp<=0){g.score+=b.kind==='mid'?3000:10000;for(let i=0;i<50;i++)particle(b.x,b.y,['#ff99ad','#ffe5ba','#aabbff'][i%3],Math.random()*220);g.items.push({x:b.x-15,y:b.y,vy:45,type:'bomb'},{x:b.x+15,y:b.y,vy:45,type:'power'});g.bullets=[];g.boss=null;sound(180,.6,'sawtooth',.08,.3);if(b.kind==='end'){
 if(g.stage<3){g.stage++;g.time=0;g.mid=false;g.end=false;g.enemies=[];g.player.inv=3;notice(g.stage===2?'第二關　緋月之庭':'終極關卡　紅月終焉');playMusic('stage'+g.stage)}
 else{finish(true)}
 }else{notice('道中頭目　擊破');playMusic('stage'+g.stage)}updateHUD()}
for(const z of g.bullets){advanceEnemyBullet(z,dt);if(Math.hypot(z.x-p.x,z.y-p.y)<z.r+3)hit()}g.bullets=g.bullets.filter(z=>z.age<12&&z.x>-30&&z.x<W+30&&z.y>-30&&z.y<H+30);
for(const e of g.enemies)if(Math.hypot(e.x-p.x,e.y-p.y)<15)hit();if(g.boss&&Math.hypot(g.boss.x-p.x,g.boss.y-p.y)<25)hit();
for(const i of g.items){i.y+=i.vy*dt;if(Math.hypot(i.x-p.x,i.y-p.y)<22){i.collected=true;
 if(i.type==='power'){p.power=Math.min(3,p.power+1);notice(p.power===3?'靈符武裝　MAX':'靈符武裝　升級')}
 else g.bombs=Math.min(5,g.bombs+1);
 g.score+=500;sound(700,.25,'sine',.04,1.5);updateHUD()}}g.items=g.items.filter(i=>!i.collected&&i.y<H+30);
for(const q of g.particles){q.x+=q.vx*dt;q.y+=q.vy*dt;q.life-=dt}g.particles=g.particles.filter(q=>q.life>0);if(noticeTimer>0){noticeTimer-=dt;if(noticeTimer<=0)$('notice').classList.remove('show')}
}
function circle(x,y,r,col){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=col;ctx.fill()}
function drawPlayerShot(s){
 ctx.save();ctx.translate(s.x,s.y);ctx.rotate(Math.atan2(s.vx||0,-(s.vy||-560)));
 circle(0,0,s.style==='star'?13:8,s.style==='feather'?'#a9c3ff44':s.style==='star'?'#ffd48755':'#ffb1cd44');
 // Light trails point back toward the player without obscuring hostile bullets.
 ctx.fillStyle=s.style==='feather'?'#9bbaff33':s.style==='star'?'#ffbf873f':'#ffb8d533';
 ctx.beginPath();ctx.moveTo(-3,5);ctx.lineTo(0,29);ctx.lineTo(3,5);ctx.closePath();ctx.fill();
 if(s.style==='feather'){
   ctx.fillStyle='#a7bdff';ctx.strokeStyle='#eef0ff';ctx.lineWidth=1;
   ctx.beginPath();ctx.moveTo(0,-13);ctx.quadraticCurveTo(8,-5,5,5);ctx.quadraticCurveTo(3,10,0,12);ctx.quadraticCurveTo(-3,10,-5,5);ctx.quadraticCurveTo(-8,-5,0,-13);ctx.fill();ctx.stroke();
   ctx.strokeStyle='#ffffffbb';ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(0,9);ctx.stroke();
 }else if(s.style==='star'){
   ctx.rotate((s.age||0)*7);ctx.fillStyle='#ffc77f';ctx.strokeStyle='#fff0d0';ctx.lineWidth=1;
   ctx.beginPath();for(let i=0;i<8;i++){let a=i*Math.PI/4-Math.PI/2,r=i%2?5:12;i?ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r):ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r)}ctx.closePath();ctx.fill();ctx.stroke();circle(0,0,3,'#fff');
 }else{
   ctx.fillStyle='#ff94ba';ctx.strokeStyle='#ffeddd';ctx.lineWidth=1;
   ctx.beginPath();ctx.moveTo(0,-14);ctx.lineTo(5,0);ctx.lineTo(0,10);ctx.lineTo(-5,0);ctx.closePath();ctx.fill();ctx.stroke();
   ctx.fillStyle='#fff9e9';ctx.fillRect(-1,-8,2,13);
 }
 ctx.restore();
}
function drawEnemyBullet(z){
 ctx.save();ctx.translate(z.x,z.y);ctx.rotate(Math.atan2(z.vy,z.vx)+Math.PI/2);
 // Translucent halos are cheaper than a separate canvas shadow per bullet.
 circle(0,0,z.r*1.8,z.color+'38');
 ctx.fillStyle=z.color;ctx.strokeStyle='#fff0eacc';ctx.lineWidth=.8;
 if(z.shape==='petal'){
   ctx.beginPath();ctx.moveTo(0,-z.r*2.1);ctx.quadraticCurveTo(z.r*1.45,-z.r*.2,z.r*.8,z.r);
   ctx.quadraticCurveTo(0,z.r*1.8,-z.r*.8,z.r);ctx.quadraticCurveTo(-z.r*1.45,-z.r*.2,0,-z.r*2.1);ctx.fill();ctx.stroke();
 }else if(z.shape==='crystal'){
   ctx.beginPath();ctx.moveTo(0,-z.r*1.8);ctx.lineTo(z.r,0);ctx.lineTo(0,z.r*1.8);ctx.lineTo(-z.r,0);ctx.closePath();ctx.fill();ctx.stroke();
 }else if(z.shape==='needle'){
   ctx.beginPath();ctx.moveTo(0,-z.r*2.5);ctx.lineTo(z.r*.7,z.r*.8);ctx.lineTo(0,z.r*1.4);ctx.lineTo(-z.r*.7,z.r*.8);ctx.closePath();ctx.fill();ctx.stroke();
 }else circle(0,0,z.r,z.color);
 circle(0,-z.r*.2,Math.max(1,z.r*.3),'#fff9f2');ctx.restore();
}
function sprite(img,w,h){
 if(img&&img.complete&&img.naturalWidth){let scale=Math.min(w/img.naturalWidth,h/img.naturalHeight),iw=img.naturalWidth*scale,ih=img.naturalHeight*scale;ctx.drawImage(img,-iw/2,-ih/2,iw,ih);return;}
 ctx.fillStyle='#f5cfbd';ctx.beginPath();ctx.ellipse(0,0,w*.19,h*.30,0,0,Math.PI*2);ctx.fill();
}
function rune(x,y,r,color,angle=0){ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();for(let i=0;i<8;i++){ctx.rotate(Math.PI/4);ctx.beginPath();ctx.moveTo(0,-r+1);ctx.lineTo(0,-r+7);ctx.stroke()}ctx.restore()}
function charm(x,y,t,cast){
 ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(t)*.18);ctx.shadowBlur=cast?18:8;ctx.shadowColor=cast?'#ffd77b':'#ff879e';ctx.fillStyle=cast?'#ffe1a0':'#f6e6cd';ctx.strokeStyle='#d75675';ctx.lineWidth=1.5;ctx.fillRect(-5,-9,10,18);ctx.strokeRect(-5,-9,10,18);ctx.fillStyle='#d24a60';ctx.fillRect(-2,-4,4,8);ctx.restore()
}
function drawEnemy(e){
 ctx.save();ctx.translate(e.x,e.y+Math.sin(e.t*5)*2);ctx.rotate(Math.sin(e.t*3+e.phase)*.10);
 if(e.cast>0){ctx.shadowColor='#f78ac8';ctx.shadowBlur=14;rune(0,2,25,'#e793cf99',e.t)}
 ctx.filter=e.hitfx>0?'brightness(2)':e.kind?'hue-rotate(24deg) saturate(1.2)':'none';
 sprite(sprites[e.cast>0?'enemy_cast':'enemy'],54,66);ctx.restore();
}
function drawBoss(b,stage){
 ctx.save();ctx.translate(b.x,b.y+Math.sin(b.t*3)*3);
 const enraged=b.hp<b.max*.5,colour=['#9bcde6','#f07b9d','#e99cfb'][stage-1];
 ctx.shadowBlur=enraged?25:13;ctx.shadowColor=colour;
 rune(0,0,enraged?62:51,enraged?'#ff729ddd':colour+'99',b.t*(enraged?.7:.3));
 if(enraged){ctx.strokeStyle='#ff9ebcaa';ctx.lineWidth=3;for(let i=0;i<4;i++){let a=b.t*1.5+i*Math.PI/2;ctx.beginPath();ctx.moveTo(Math.cos(a)*53,Math.sin(a)*35);ctx.lineTo(Math.cos(a)*69,Math.sin(a)*50);ctx.stroke()}}
 if(b.cast>0){let color=['#ffc8d3','#b7c7ff','#ffbb78','#eaa7ff'][b.attackType];rune(0,0,75+(1-b.cast)*8,color,b.t*(b.attackType%2?1:-1));for(let i=0;i<6;i++){let a=b.t*2+i*Math.PI/3;circle(Math.cos(a)*65,Math.sin(a)*35,4,color)}}
 ctx.rotate(Math.sin(b.t*1.7)*.035);ctx.filter=b.hitfx>0?'brightness(2)':enraged?'saturate(1.5) brightness(1.12)':'none';
 sprite(sprites[b.kind==='mid'?'midboss':stage===3&&enraged?'boss3_rage':'boss'+stage],b.kind==='mid'?108:130,b.kind==='mid'?126:150);
 ctx.restore();
}
function drawPlayer(p,t){
 ctx.save();ctx.translate(p.x,p.y+Math.sin(t*7)*1.3);ctx.rotate(p.lean);
 if(p.inv>0||p.cast>0){ctx.shadowColor='#ffe4ac';ctx.shadowBlur=15;rune(0,0,p.cast>0?48:32,p.cast>0?'#ffe0a0dd':'#fff2ce99',t*2)}
 if(p.focus){ctx.fillStyle='#ffccd622';circle(0,0,27,'#ffbfd522');rune(0,0,28,'#ffcfdbbb',-t)}
 if(p.power>=2){let spread=p.focus?20:29;charm(-spread,-3,t,p.cast>0);charm(spread,-3,-t,p.cast>0)}
 if(p.power>=3){rune(0,1,37,'#ffb87788',t*.8);charm(0,21,t*.7,true)}
 if(p.cast>0){ctx.fillStyle='#ffd899aa';for(let i=0;i<8;i++){let a=t*4+i*Math.PI/4;circle(Math.cos(a)*46,Math.sin(a)*46,3,'#ffe4a3')}}
 ctx.globalAlpha=p.hurt>0?.72:1;ctx.shadowBlur=p.shotGlow>0?10:4;ctx.shadowColor=p.cast>0?'#ffe4a0':'#ffb8d8';ctx.filter=p.hurt>0?'brightness(1.8)':p.cast>0?'saturate(1.35) brightness(1.12)':'none';
 sprite(sprites[p.cast>0?'player_cast':'player'],67,80);ctx.filter='none';ctx.globalAlpha=1;
 // The small glowing dot is the actual hit point, independent of the artwork.
 ctx.shadowBlur=8;ctx.shadowColor='#ffffff';circle(0,0,3.5,'#fff');circle(0,0,1.5,'#ea588b');ctx.restore();
}
function draw(){let g=game;ctx.clearRect(0,0,W,H);ctx.fillStyle='#1a1022';ctx.fillRect(0,0,W,H);if(art.complete&&art.naturalWidth){let ratio=Math.max(W/art.width,H/art.height),iw=art.width*ratio,ih=art.height*ratio;ctx.globalAlpha=.72;ctx.drawImage(art,(W-iw)/2,(H-ih)/2,iw,ih);ctx.globalAlpha=1}ctx.fillStyle='rgba(13,8,22,.48)';ctx.fillRect(0,0,W,H);let grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,'#18091933');grad.addColorStop(1,'#090c20aa');ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);if(!g)return;
if(g.stage===3){
 let aura=ctx.createRadialGradient(W/2,100,30,W/2,100,430);aura.addColorStop(0,'#d13a5b44');aura.addColorStop(1,'#2d061400');ctx.fillStyle=aura;ctx.fillRect(0,0,W,H);
 ctx.save();ctx.translate(W/2,100);ctx.rotate(g.background*.12);ctx.strokeStyle='#ed89942b';ctx.lineWidth=1;for(let r=78;r<145;r+=30){ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke()}ctx.restore();
}
for(const s of g.stars){ctx.fillStyle='#ffd2c7aa';ctx.fillRect(s.x,s.y,s.s,s.s)}
for(const shot of g.shots)drawPlayerShot(shot);
for(const e of g.enemies)drawEnemy(e);
if(g.boss){let b=g.boss;drawBoss(b,g.stage);ctx.fillStyle='#332235';ctx.fillRect(28,22,W-56,5);ctx.fillStyle='#ef9ba9';ctx.fillRect(28,22,(W-56)*Math.max(0,b.hp/b.max),5);ctx.fillStyle='#f2d6d4';ctx.font='11px serif';ctx.fillText(b.kind==='mid'?['MID BOSS  ·  霧之守護者','MID BOSS  ·  緋月守衛','MID BOSS  ·  深紅使徒'][g.stage-1]:['BOSS  ·  霧之幻影','BOSS  ·  緋月之主','FINAL BOSS  ·  紅月終焉'][g.stage-1],28,17)}
for(const z of g.bullets)drawEnemyBullet(z);
for(const i of g.items){ctx.save();ctx.translate(i.x,i.y);ctx.rotate(Math.PI/4);ctx.shadowBlur=13;ctx.shadowColor='#ffd78d';ctx.fillStyle=i.type==='power'?'#8d7aca':'#bf5264';ctx.fillRect(-9,-9,18,18);ctx.strokeStyle='#ffe3a8';ctx.strokeRect(-9,-9,18,18);ctx.restore();ctx.fillStyle='#fff4d2';ctx.font='bold 12px serif';ctx.textAlign='center';ctx.fillText(i.type==='power'?'P':'B',i.x,i.y+4);ctx.textAlign='start'}
let p=g.player;drawPlayer(p,g.background);
for(const q of g.particles){ctx.globalAlpha=Math.max(0,q.life);circle(q.x,q.y,2,q.color)}ctx.globalAlpha=1;if(g.flash>0){ctx.fillStyle=`rgba(255,230,220,${g.flash*.48})`;ctx.fillRect(0,0,W,H)} }
function loop(t){let dt=Math.min(.033,(t-(prev||t))/1000);prev=t;update(dt);draw();requestAnimationFrame(loop)}
$('start').addEventListener('click',()=>{if(state==='pause'){initAudio();state='play';playMusic();$('overlay').classList.add('hidden')}else start()});$('bombBtn').addEventListener('pointerdown',e=>{e.preventDefault();bomb()});$('focusBtn').addEventListener('pointerdown',e=>{e.preventDefault();focusTouch=true;$('focusBtn').classList.add('active');$('focusBtn').setPointerCapture(e.pointerId)});for(const type of ['pointerup','pointercancel','lostpointercapture'])$('focusBtn').addEventListener(type,()=>{focusTouch=false;$('focusBtn').classList.remove('active')});
function pause(){if(state==='play'){state='pause';pauseMusic();$('overlayText').textContent='稍作休息，準備好再繼續。';$('start').innerHTML='繼續遊戲 <span>✦</span>';$('overlay').classList.remove('hidden');}else if(state==='pause'){$('start').click()}}
$('pause').addEventListener('click',pause);$('sound').addEventListener('click',()=>{
 if(musicBlocked&&soundOn){initAudio();playMusic();return;}
 soundOn=!soundOn;
 if(soundOn){initAudio();playMusic();}else{pauseMusic();musicBlocked=false;audioStatus();}
});
window.addEventListener('keydown',e=>{let k=e.key.toLowerCase();if(['arrowup','arrowdown','arrowleft','arrowright',' ','shift'].includes(k))e.preventDefault();if(!e.repeat&&(k==='x'||k===' '))bomb();if(!e.repeat&&(k==='escape'||k==='p'))pause();keys.add(k)});window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));window.addEventListener('blur',()=>{keys.clear();focusTouch=false;if(state==='play')pause();else if(previewing){pauseMusic();previewing=false;audioStatus()}});
canvas.addEventListener('pointerdown',e=>{if(state!=='play')return;e.preventDefault();dragging=true;lastPointer={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId)});canvas.addEventListener('pointermove',e=>{if(!dragging||state!=='play')return;e.preventDefault();let rect=canvas.getBoundingClientRect(),factor=focusTouch?.5:1;game.player.lean=Math.max(-.25,Math.min(.25,(e.clientX-lastPointer.x)*.012));game.player.x=Math.max(14,Math.min(W-14,game.player.x+(e.clientX-lastPointer.x)*W/rect.width*factor));game.player.y=Math.max(20,Math.min(H-20,game.player.y+(e.clientY-lastPointer.y)*H/rect.height*factor));lastPointer={x:e.clientX,y:e.clientY}});for(const t of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(t,()=>{dragging=false;lastPointer=null});
reset();audioStatus();requestAnimationFrame(loop);
