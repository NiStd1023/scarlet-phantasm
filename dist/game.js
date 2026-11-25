'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id), W=480,H=720, keys=new Set();
const art=new Image();art.src='key-art.png';
const sprites={};
for(const key of ['player','player_cast','enemy','enemy_cast','midboss','boss1','boss2','boss3','boss3_rage']){const img=new Image();img.src='assets/'+key+'.webp';sprites[key]=img;}
let state='title', prev=0, game, dragging=false, lastPointer=null, focusTouch=false, soundOn=true, audio=null;
// Level 1 is the original game. Each later level increases pressure while
// keeping the same boss identities, player hitbox, lives, and BOMB rules.
const DIFFICULTY_LEVELS=[
 {name:'初見',description:'原有難度・適合熟悉操作',speed:1,density:1,bossHp:1,enemyHp:1,spawn:1,enemyInterval:1,bossInterval:1,extraEnemy:0},
 {name:'緋光',description:'敵彈稍快・頭目攻勢提高',speed:1.05,density:1.06,bossHp:1.08,enemyHp:1.05,spawn:.96,enemyInterval:.96,bossInterval:.96,extraEnemy:0},
 {name:'幻舞',description:'敵方火力與彈幕密度增加',speed:1.10,density:1.12,bossHp:1.18,enemyHp:1.10,spawn:.91,enemyInterval:.91,bossInterval:.91,extraEnemy:1},
 {name:'狂瀾',description:'敵人更密集・頭目更持久',speed:1.16,density:1.20,bossHp:1.30,enemyHp:1.16,spawn:.86,enemyInterval:.86,bossInterval:.86,extraEnemy:1},
 {name:'血月',description:'高速彈幕・需要精準閃避',speed:1.22,density:1.29,bossHp:1.43,enemyHp:1.22,spawn:.81,enemyInterval:.81,bossInterval:.81,extraEnemy:2},
 {name:'終焉',description:'極限火力・挑戰彈幕極限',speed:1.30,density:1.40,bossHp:1.58,enemyHp:1.30,spawn:.75,enemyInterval:.75,bossInterval:.75,extraEnemy:2}
];
const difficultyLevel=value=>{const n=Number(value);return Number.isInteger(n)&&n>=1&&n<=DIFFICULTY_LEVELS.length?n:1};
let selectedDifficulty=1;
try{selectedDifficulty=difficultyLevel(localStorage.getItem('scarlet-difficulty'))}catch(e){}
function difficultySettings(){return DIFFICULTY_LEVELS[difficultyLevel(game&&game.difficulty)-1]}
function selectDifficulty(value){
 if(state==='play'||state==='pause')return;
 selectedDifficulty=difficultyLevel(value);
 $('difficulty').value=String(selectedDifficulty);
 $('difficultyInfo').textContent=DIFFICULTY_LEVELS[selectedDifficulty-1].description;
 $('difficultyLabel').textContent='難度 Lv.'+selectedDifficulty;
 try{localStorage.setItem('scarlet-difficulty',String(selectedDifficulty))}catch(e){}
}
$('difficulty').addEventListener('change',e=>selectDifficulty(e.target.value));
selectDifficulty(selectedDifficulty);
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
function sound(freq=440,duration=.09,type='sine',vol=.035,slide=1,delay=0){if(!soundOn||!audio)return;let t=audio.currentTime+delay,o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(30,freq*slide),t+duration);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g).connect(audio.destination);o.start(t);o.stop(t+duration+.01)}
function pickupSound(type){
 // Short rising phrases make power and bomb pickups recognizable in battle.
 const notes=type==='power'?[660,880,1175]:[523,698,1047];
 notes.forEach((freq,i)=>sound(freq,.12+i*.025,i===2?'sine':'triangle',.035,1.12,i*.07));
}
function hitFeedback(){
 sound(210,.28,'sawtooth',.055,.38);sound(460,.18,'triangle',.035,.48);
 // Shake only the artwork: the frame and controls retain their layout.
 canvas.classList.remove('hit-shake');void canvas.offsetWidth;canvas.classList.add('hit-shake');
 try{if(typeof navigator!=='undefined'&&typeof navigator.vibrate==='function')navigator.vibrate([55,35,75])}catch(e){}
}
canvas.addEventListener('animationend',e=>{if(e.animationName==='hit-shake')canvas.classList.remove('hit-shake')});
function initAudio(){try{if(!audio)audio=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume()}catch(e){}}
function reset(){canvas.classList.remove('hit-shake');game={difficulty:selectedDifficulty,stage:1,time:0,score:0,lives:3,bombs:3,player:{x:W/2,y:H-105,inv:2,shot:0,power:1,cast:0,lean:0,shotGlow:0,hurt:0,focus:false,volley:0},bullets:[],shots:[],enemies:[],items:[],particles:[],stars:Array.from({length:50},()=>({x:Math.random()*W,y:Math.random()*H,s:Math.random()*1.7+.4,v:Math.random()*30+10})),spawn:1,enemyCount:0,mid:false,end:false,boss:null,flash:0,background:0};updateHUD()}
function updateHUD(){$('lives').textContent='♥ '.repeat(game.lives).trim()||'—';$('bombs').textContent='✦ '.repeat(game.bombs).trim()||'—';$('score').textContent=String(game.score).padStart(8,'0');$('weapon').textContent='Lv. '+game.player.power;$('stageLabel').textContent=`STAGE 0${game.stage}`;$('stageName').textContent=['霧之森','緋月之庭','紅月終焉'][game.stage-1];$('difficultyLabel').textContent='難度 Lv.'+game.difficulty;$('high').textContent=String(Math.max(high,game.score)).padStart(8,'0')}
let noticeTimer=0;function notice(text){$('notice').textContent=text;$('notice').classList.add('show');noticeTimer=2.2}
function start(){initAudio();previewing=false;pauseMusic();musicAudio.currentTime=0;reset();state='play';$('difficultyControls').hidden=true;$('previewControls').hidden=true;playMusic('stage1');$('overlay').classList.add('hidden');$('start').textContent='重新開始 ✦';prev=0;notice('第一關　霧之森')}
function finish(win){state=win?'win':'over';pauseMusic();$('difficultyControls').hidden=false;$('previewControls').hidden=false;if(game.score>high){high=game.score;try{localStorage.setItem('scarlet-high',String(high))}catch(e){}}updateHUD();$('overlay').classList.remove('hidden');$('overlayText').textContent=win?'紅月落下，結界重新恢復平靜。恭喜通關！':'夜色尚未散去，再次挑戰紅月吧。';$('start').innerHTML=win?'再次挑戰 <span>✦</span>':'重新挑戰 <span>✦</span>';sound(win?660:150,.8,'triangle',.09,win?1.5:.4)}
function bomb(){if(state!=='play'||game.bombs<=0)return;initAudio();game.bombs--;game.player.inv=3;game.player.cast=1.6;game.bullets=[];game.flash=.65;for(const e of game.enemies)e.hp-=35;if(game.boss)game.boss.hp-=125;for(let i=0;i<40;i++)particle(game.player.x,game.player.y,'#ffd7b6',Math.random()*250);sound(180,.5,'sawtooth',.07,.4);sound(550,.7,'sine',.07,1.9);notice('靈力爆發');updateHUD()}
function enemy(){
 let x=55+Math.random()*(W-110),hp=Math.round([15,20,25][game.stage-1]*difficultySettings().enemyHp);game.enemyCount++;
 let roll=Math.random(),drop=game.enemyCount%4===0?'power':roll<.18?'bomb':roll<.29?'power':null;
 game.enemies.push({x,y:-30,base:x,hp,max:hp,t:0,phase:Math.random()*6,shot:1+Math.random(),shotPhase:0,drop,kind:Math.random()<.5?0:1,cast:0,hitfx:0})
}
function spawnBoss(kind){
 let hp=Math.round((kind==='mid'?(game.stage===3?360:260):(game.stage===3?780:500))*difficultySettings().bossHp);
 game.boss={x:W/2,y:-70,hp,max:hp,t:0,shot:1,kind,phase:0,cast:0,attackType:0,hitfx:0};
 playMusic('boss'+game.stage);
 notice(kind==='mid'?'道中頭目　現身':game.stage===3?'終極頭目　現身':'關卡頭目　現身');
 sound(240,.5,'sawtooth',.05,.65)
}
// Keep dense attacks bounded so the game remains responsive on mobile devices.
const MAX_ENEMY_BULLETS=420;
function fireBullet(x,y,a,s,color,r=5,{shape='orb',curve=0,curveTime=2.4,weave=0,weaveRate=3,weavePhase=0,boss=false}={}){
 if(game.bullets.length>=MAX_ENEMY_BULLETS)return;
 const speed=s*difficultySettings().speed;
 game.bullets.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,color,r,shape,curve,curveTime,weave,weaveRate,weavePhase,boss,age:0});
}
function advanceEnemyBullet(z,dt){
 // Rotate the velocity gradually: these are actual curved trajectories, not
 // straight bullets arranged in a circle. The turn eases into a straight path.
 const age=z.age||0,remaining=Math.max(0,(z.curveTime||0)-age);
 if(z.curve&&remaining>0){
   const step=Math.min(dt,remaining),turn=z.curve*step*(remaining-step*.5)/z.curveTime,c=Math.cos(turn),s=Math.sin(turn),vx=z.vx;
   z.vx=vx*c-z.vy*s;z.vy=vx*s+z.vy*c;
 }
 z.x+=z.vx*dt;z.y+=z.vy*dt;
 // The lateral offset is integrated, not accumulated, so a fluttering bullet
 // stays bounded around its path even if the frame rate changes.
 if(z.weave){const v=Math.hypot(z.vx,z.vy)||1,w=z.weave*(Math.sin((age+dt)*z.weaveRate+z.weavePhase)-Math.sin(age*z.weaveRate+z.weavePhase));z.x-=z.vy/v*w;z.y+=z.vx/v*w}
 z.age=age+dt;
}
function enemyPattern(e){
 const p=game.player,a=Math.atan2(p.y-e.y,p.x-e.x),stage=game.stage,phase=e.shotPhase++;
 if(e.kind===0){
   // Flower fairies release paired curving petals around an aimed center.
   const half=(stage===1?2:3)+difficultySettings().extraEnemy;
   for(let i=-half;i<=half;i++)fireBullet(e.x,e.y,a+i*.17,105+stage*7,
     i%2?'#ff8eae':'#ffd4ba',4,{shape:'petal',curve:i===0?0:Math.sign(i)*.25,curveTime:1.5});
 }else{
   // The second enemy type sweeps alternating crystal fans across the player.
   const direction=phase%2?1:-1,half=(stage===3?3:2)+difficultySettings().extraEnemy;
   for(let i=-half;i<=half;i++)fireBullet(e.x,e.y,a+i*.14,112+stage*8,
     i%2?'#aebeff':'#eed0ff',4,{shape:'crystal',curve:direction*.32,curveTime:1.8});
 }
}
// Each encounter has its own silhouette, palette, spell names, and geometry.
// Mid-bosses share a sprite but not their spell books.
const BOSS_PROFILES=[
 {name:'霧之守護者',accent:'#bcaaff',second:'#8de8f3',emblem:'book',spells:['霧書・環形符印','幻羽交錯','秘典・流光雨','霧晶星軌']},
 {name:'霧之幻影',accent:'#a8ebf0',second:'#d6b9ff',emblem:'butterfly',spells:['幻蝶・霧花輪','雲水雙瀑','浮夢蝶舞','蒼霧千瓣']},
 {name:'緋月守衛',accent:'#ffd080',second:'#dca4ff',emblem:'seal',spells:['禁書・封印陣','金符交叉','咒紋護輪','赤金連符']},
 {name:'緋月之主',accent:'#ff7897',second:'#ffc09b',emblem:'wings',spells:['血薔薇・蝠翼','緋刃雙斬','紅夜圓舞','薔薇獵陣']},
 {name:'深紅使徒',accent:'#ca9aff',second:'#ff82b1',emblem:'cross',spells:['深淵十字','咒炎追跡','逆轉星環','冥火交響']},
 {name:'紅月終焉',accent:'#ff8b9a',second:'#ffd18b',emblem:'eclipse',spells:['終焉・血月星輪','皇冠・流星雨','緋月雙重奏','天蝕・萬華鏡']}
];
function bossProfile(b,stage=game.stage){return BOSS_PROFILES[(stage-1)*2+(b.kind==='end'?1:0)]}
function pattern(b){
 const p=game.player,a=Math.atan2(p.y-b.y,p.x-b.x),phase=b.phase%4;
 const id=(game.stage-1)*2+(b.kind==='end'?1:0),profile=BOSS_PROFILES[id];
 const rage=id===5&&b.hp<b.max*.5,boost=rage?1.12:1;
 b.cast=.56;b.attackType=phase;b.spellName=profile.spells[phase];
 const shot=(angle,speed,shape,color,curve=0,weave=0,x=0)=>fireBullet(b.x+x,b.y,angle,speed*boost,color,5,
   {shape,boss:true,curve:curve*(rage?1.12:1),curveTime:2.2,weave,weaveRate:3.2,weavePhase:angle});
 const ring=(n,offset,speed,shape,colors,curve=0,weave=0)=>{
   n=Math.max(1,Math.round(n*difficultySettings().density));
   for(let i=0;i<n;i++)shot(offset+i*Math.PI*2/n,speed,shape,colors[i%colors.length],typeof curve==='function'?curve(i):curve,weave);
 };
 const fan=(n,center,spread,speed,shape,colors,curve=0,weave=0)=>{
   n=Math.max(1,Math.round(n*difficultySettings().density));
   for(let i=0;i<n;i++){let q=n===1?0:(i/(n-1)-.5)*2;shot(center+q*spread,speed,shape,colors[i%colors.length],typeof curve==='function'?curve(q,i):curve,weave)}
 };
 const c=profile.accent,d=profile.second,spin=b.t*.34;
 switch(id){
 case 0: // Mist guardian: spellbook seals and violet quills.
   if(phase===0){ring(16,spin,91,'sigil',[c,d],i=>i%2?.38:-.38);ring(8,-spin,128,'feather',[d],-.28)}
   else if(phase===1){fan(7,a-.23,.45,120,'feather',[c,d],-.4,5);fan(7,a+.23,.45,120,'feather',[d,c],.4,5)}
   else if(phase===2){for(let row=0;row<3;row++)fan(5,a+(row-1)*.09,.5,91+row*22,'sigil',[c,d],(row-1)*.22)}
   else{ring(12,spin,101,'sigil',[c,d],.55);ring(8,-spin,136,'feather',[d],-.45)}
   break;
 case 1: // The mist phantom paints floating butterfly and teardrop arcs.
   if(phase===0){ring(18,spin,91,'butterfly',[c,d],i=>i%2?.55:-.55,13);ring(8,-spin,126,'droplet',[c],-.28)}
   else if(phase===1){fan(9,a-.28,.58,111,'droplet',[c,d],-.5,7);fan(9,a+.28,.58,111,'droplet',[d,c],.5,7)}
   else if(phase===2){ring(12,spin,99,'butterfly',[d,c],.7,14);ring(12,-spin,124,'butterfly',[c,d],-.7,14)}
   else{for(let row=0;row<3;row++)fan(7,a+(row-1)*.13,.76,90+row*22,row===1?'butterfly':'droplet',[c,d],(row-1)*.42,9)}
   break;
 case 2: // Scarlet guard: structured gold wards, diagonal lines and seals.
   if(phase===0){ring(12,Math.PI/4+spin,101,'ward',[c,d],.18);ring(12,-spin,138,'sigil',[d,c],-.22)}
   else if(phase===1){for(let row=0;row<3;row++)fan(6,a+(row-1)*.22,.52,100+row*22,'ward',[c,d],(row-1)*.26)}
   else if(phase===2){ring(20,spin,103,'ward',[c,d],i=>i%2?.35:-.35);fan(5,a,.3,158,'sigil',[d],0)}
   else{fan(9,a-.35,.7,122,'sigil',[c,d],.36);fan(9,a+.35,.7,122,'ward',[d,c],-.36)}
   break;
 case 3: // Scarlet mistress: bat swarms and curved rose-blades.
   if(phase===0){ring(18,spin,105,'bat',[c,d],i=>i%2?.52:-.52,9);ring(8,-spin,145,'blade',[d],.28)}
   else if(phase===1){fan(9,a-.28,.68,145,'blade',[c,d],-.62);fan(9,a+.28,.68,145,'blade',[d,c],.62)}
   else if(phase===2){ring(14,spin,96,'bat',[c,d],.72,12);ring(14,-spin,127,'blade',[d,c],-.6)}
   else{for(let row=0;row<3;row++)fan(7,a+(row-1)*.11,.8,110+row*24,row===1?'bat':'blade',[c,d],(row-1)*.55,row===1?8:0)}
   break;
 case 4: // Crimson apostle: occult crosses and curling violet flames.
   if(phase===0){ring(16,Math.PI/4+spin,108,'cross',[c,d],i=>i%2?.3:-.3);ring(8,-spin,140,'flame',[d],.48,7)}
   else if(phase===1){fan(9,a,.75,119,'flame',[c,d],q=>q*.7,15);fan(5,a,.4,150,'cross',[d],-.18)}
   else if(phase===2){ring(12,spin,100,'cross',[c,d],.68);ring(12,-spin,130,'cross',[d,c],-.68)}
   else{for(let row=0;row<3;row++)fan(7,a+(row-1)*.2,.68,104+row*24,row===1?'cross':'flame',[c,d],(row-1)*.48,8)}
   break;
 case 5: // Final queen: crescents and stars in an unmistakable eclipse.
   if(phase===0){ring(rage?24:20,spin,112,'moon',[c,d],i=>i%2?.58:-.58);ring(10,-spin,146,'star',[d,c],-.45)}
   else if(phase===1){for(let row=0;row<3;row++)fan(9,a+(row-1)*.12,.78,118+row*23,row===1?'moon':'star',[c,d],(row-1)*.5,5)}
   else if(phase===2){ring(16,spin,102,'moon',[c,d],.76);ring(16,-spin,137,'moon',[d,c],-.76);ring(8,spin*.5,165,'star',[d],.2)}
   else{for(let row=0;row<3;row++)fan(rage?11:9,a+(row-1)*.13,.95,110+row*24,row===1?'star':'moon',[c,d],(row-1)*.58,5)}
   break;
 }
 b.phase++;
}
function particle(x,y,color,speed){let a=Math.random()*Math.PI*2;game.particles.push({x,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,life:.4+Math.random()*.5,color})}
function dieEnemy(e){game.score+=100;for(let i=0;i<8;i++)particle(e.x,e.y,'#f5b0b0',Math.random()*95);if(e.drop)game.items.push({x:e.x,y:e.y,vy:45,type:e.drop});sound(370,.09,'triangle',.025,.5)}
function hit(){if(game.player.inv>0)return;game.lives--;game.player.inv=2.8;game.player.hurt=.5;game.bullets=[];game.flash=.3;for(let i=0;i<24;i++)particle(game.player.x,game.player.y,'#fff0d1',Math.random()*190);hitFeedback();updateHUD();if(game.lives<=0)finish(false)}
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
if(!g.boss){g.time+=dt;g.spawn-=dt;if(g.spawn<=0&&g.time<48){enemy();g.spawn=Math.max(.50,Math.max(.65,1.35-g.stage*.15)*difficultySettings().spawn)}if(g.time>=20&&!g.mid){g.mid=true;spawnBoss('mid')}else if(g.time>=48&&!g.end){g.end=true;spawnBoss('end')}}
for(const s of g.stars){s.y+=s.v*dt;if(s.y>H){s.y=0;s.x=Math.random()*W}}
for(const s of g.shots){s.age=(s.age||0)+dt;s.y+=(s.vy||-560)*dt;s.x+=((s.vx||0)+Math.sin(s.age*9+(s.phase||0))*(s.wave||0))*dt}g.shots=g.shots.filter(s=>s.y>-20&&s.x>-20&&s.x<W+20);
for(const e of g.enemies){e.t+=dt;e.cast=Math.max(0,e.cast-dt);e.hitfx=Math.max(0,e.hitfx-dt);e.y+=55*dt;e.x=e.base+Math.sin(e.t*1.5+e.phase)*35;e.shot-=dt;if(e.shot<=0){e.shot=2.1*difficultySettings().enemyInterval;e.cast=.45;enemyPattern(e)}}
let b=g.boss;if(b){b.t+=dt;b.cast=Math.max(0,b.cast-dt);b.hitfx=Math.max(0,b.hitfx-dt);b.y=Math.min(115,b.y+75*dt);b.x=W/2+Math.sin(b.t*.8)*125;b.shot-=dt;if(b.y>=100&&b.shot<=0){pattern(b);b.shot=(game.stage===3&&b.kind==='end'?(b.hp<b.max*.5?.60:.76):b.kind==='mid'?1.15:.82)*difficultySettings().bossInterval}}
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
 g.score+=500;pickupSound(i.type);updateHUD()}}g.items=g.items.filter(i=>!i.collected&&i.y<H+30);
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
 // Boss bullets have an extra halo and a silhouette of their own; ordinary
 // enemies retain their smaller petal/crystal vocabulary.
 if(z.boss)circle(0,0,z.r*2.45,z.color+'22');
 circle(0,0,z.r*(z.boss?1.95:1.8),z.color+(z.boss?'55':'38'));
 ctx.fillStyle=z.color;ctx.strokeStyle='#fff0eacc';ctx.lineWidth=.8;
 const r=z.r;
 if(z.shape==='sigil'){
   ctx.fillRect(-r*.8,-r*1.5,r*1.6,r*3);ctx.strokeRect(-r*.8,-r*1.5,r*1.6,r*3);
   ctx.strokeStyle='#fff8eeee';ctx.beginPath();ctx.moveTo(0,-r);ctx.lineTo(0,r);ctx.moveTo(-r*.48,0);ctx.lineTo(r*.48,0);ctx.stroke();
 }else if(z.shape==='feather'){
   ctx.beginPath();ctx.moveTo(0,-r*2.2);ctx.quadraticCurveTo(r*1.3,-r*.5,r*.55,r);ctx.lineTo(0,r*1.7);ctx.quadraticCurveTo(-r*1.2,r*.5,0,-r*2.2);ctx.fill();ctx.stroke();
   ctx.beginPath();ctx.moveTo(0,-r*1.5);ctx.lineTo(0,r);ctx.stroke();
 }else if(z.shape==='butterfly'){
   ctx.beginPath();ctx.moveTo(0,-r*.65);ctx.quadraticCurveTo(-r*2.1,-r*2,-r*1.7,r*.25);ctx.quadraticCurveTo(-r*1.5,r*1.7,0,r*.65);ctx.quadraticCurveTo(r*1.5,r*1.7,r*1.7,r*.25);ctx.quadraticCurveTo(r*2.1,-r*2,0,-r*.65);ctx.fill();ctx.stroke();
   ctx.fillStyle='#fff8ef';ctx.fillRect(-1,-r*.7,2,r*1.5);
 }else if(z.shape==='droplet'){
   ctx.beginPath();ctx.moveTo(0,-r*2.1);ctx.bezierCurveTo(r*1.5,-r*.5,r*1.35,r*.8,0,r*1.45);ctx.bezierCurveTo(-r*1.35,r*.8,-r*1.5,-r*.5,0,-r*2.1);ctx.fill();ctx.stroke();
 }else if(z.shape==='ward'){
   ctx.beginPath();ctx.moveTo(0,-r*1.8);ctx.lineTo(r*1.4,0);ctx.lineTo(0,r*1.8);ctx.lineTo(-r*1.4,0);ctx.closePath();ctx.fill();ctx.stroke();
   ctx.strokeStyle='#fff8eeee';ctx.beginPath();ctx.moveTo(-r*.7,0);ctx.lineTo(r*.7,0);ctx.moveTo(0,-r);ctx.lineTo(0,r);ctx.stroke();
 }else if(z.shape==='bat'){
   ctx.beginPath();ctx.moveTo(0,-r);ctx.quadraticCurveTo(-r*1.25,-r*2,-r*2.2,-r*.7);ctx.lineTo(-r*1.5,r*.85);ctx.lineTo(-r*.8,r*.32);ctx.lineTo(0,r*1.3);ctx.lineTo(r*.8,r*.32);ctx.lineTo(r*1.5,r*.85);ctx.lineTo(r*2.2,-r*.7);ctx.quadraticCurveTo(r*1.25,-r*2,0,-r);ctx.fill();ctx.stroke();
 }else if(z.shape==='blade'){
   ctx.beginPath();ctx.moveTo(0,-r*2.7);ctx.lineTo(r*.78,r*.35);ctx.lineTo(0,r*1.6);ctx.lineTo(-r*.78,r*.35);ctx.closePath();ctx.fill();ctx.stroke();
   ctx.beginPath();ctx.moveTo(0,-r*1.9);ctx.lineTo(0,r*.9);ctx.stroke();
 }else if(z.shape==='cross'){
   ctx.beginPath();ctx.moveTo(-r*.42,-r*1.8);ctx.lineTo(r*.42,-r*1.8);ctx.lineTo(r*.42,-r*.42);ctx.lineTo(r*1.5,-r*.42);ctx.lineTo(r*1.5,r*.42);ctx.lineTo(r*.42,r*.42);ctx.lineTo(r*.42,r*1.8);ctx.lineTo(-r*.42,r*1.8);ctx.lineTo(-r*.42,r*.42);ctx.lineTo(-r*1.5,r*.42);ctx.lineTo(-r*1.5,-r*.42);ctx.lineTo(-r*.42,-r*.42);ctx.closePath();ctx.fill();ctx.stroke();
 }else if(z.shape==='flame'){
   ctx.beginPath();ctx.moveTo(0,-r*2.2);ctx.quadraticCurveTo(r*1.6,-r*.4,r*.9,r*.8);ctx.quadraticCurveTo(0,r*1.8,-r*.9,r*.8);ctx.quadraticCurveTo(-r*1.3,-r*.25,0,-r*2.2);ctx.fill();ctx.stroke();
 }else if(z.shape==='moon'){
   ctx.beginPath();ctx.moveTo(r*.8,-r*1.8);ctx.bezierCurveTo(-r*1.8,-r*1.6,-r*1.8,r*1.6,r*.8,r*1.8);ctx.bezierCurveTo(-r*.2,r*.7,-r*.2,-r*.7,r*.8,-r*1.8);ctx.fill();ctx.stroke();
 }else if(z.shape==='star'){
   ctx.rotate((z.age||0)*2);ctx.beginPath();for(let i=0;i<10;i++){let a=i*Math.PI/5-Math.PI/2,d=i%2?r*.58:r*1.8;i?ctx.lineTo(Math.cos(a)*d,Math.sin(a)*d):ctx.moveTo(Math.cos(a)*d,Math.sin(a)*d)}ctx.closePath();ctx.fill();ctx.stroke();
 }else if(z.shape==='petal'){
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
 const enraged=b.hp<b.max*.5,profile=bossProfile(b,stage),colour=profile.accent;
 ctx.shadowBlur=enraged?25:13;ctx.shadowColor=colour;
 rune(0,0,enraged?62:51,enraged?'#ff729ddd':colour+'99',b.t*(enraged?.7:.3));
 if(enraged){ctx.strokeStyle='#ff9ebcaa';ctx.lineWidth=3;for(let i=0;i<4;i++){let a=b.t*1.5+i*Math.PI/2;ctx.beginPath();ctx.moveTo(Math.cos(a)*53,Math.sin(a)*35);ctx.lineTo(Math.cos(a)*69,Math.sin(a)*50);ctx.stroke()}}
 if(b.cast>0){
   const color=profile.second;rune(0,0,75+(1-b.cast)*8,color+'bb',b.t*(b.attackType%2?1:-1));
   ctx.save();ctx.rotate(b.t*.5);ctx.strokeStyle=colour+'cc';ctx.lineWidth=2;
   if(profile.emblem==='book'||profile.emblem==='seal'){ctx.strokeRect(-58,-44,116,88);ctx.rotate(Math.PI/4);ctx.strokeRect(-47,-47,94,94)}
   else if(profile.emblem==='butterfly'||profile.emblem==='wings'){ctx.beginPath();ctx.ellipse(-41,0,32,54,-.45,0,Math.PI*2);ctx.ellipse(41,0,32,54,.45,0,Math.PI*2);ctx.stroke()}
   else if(profile.emblem==='cross'){ctx.beginPath();ctx.moveTo(-69,0);ctx.lineTo(69,0);ctx.moveTo(0,-69);ctx.lineTo(0,69);ctx.stroke()}
   else{ctx.beginPath();ctx.arc(0,0,65,0,Math.PI*2);ctx.arc(15,-7,48,0,Math.PI*2);ctx.stroke()}
   ctx.restore();for(let i=0;i<6;i++){let a=b.t*2+i*Math.PI/3;circle(Math.cos(a)*65,Math.sin(a)*35,4,color)}
 }
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
if(g.boss){let b=g.boss,profile=bossProfile(b,g.stage);drawBoss(b,g.stage);ctx.fillStyle='#332235';ctx.fillRect(28,22,W-56,5);ctx.fillStyle=profile.accent;ctx.fillRect(28,22,(W-56)*Math.max(0,b.hp/b.max),5);ctx.fillStyle='#fff0e9';ctx.font='13px serif';ctx.fillText((b.kind==='mid'?'MID BOSS  ·  ':'BOSS  ·  ')+profile.name,28,17);if(b.spellName){ctx.textAlign='right';ctx.fillStyle=profile.second;ctx.font='13px serif';ctx.fillText('✦ '+b.spellName,W-28,45);ctx.textAlign='start'}}
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
