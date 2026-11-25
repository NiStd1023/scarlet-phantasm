const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const listeners={},audio={src:'music/stage1-v5.mp3',paused:true,currentTime:0,play(){this.paused=false;return Promise.resolve()},pause(){this.paused=true},addEventListener(){}};
const elements={},classes={add(){},remove(){}};let draws=[];
const gradient={addColorStop(){}};const ctx=new Proxy({drawImage(img){draws.push(img.src)},createLinearGradient(){return gradient},createRadialGradient(){return gradient}}, {get(target,key){return key in target?target[key]:(()=>{})},set(target,key,value){target[key]=value;return true}});
function el(id){if(id==='bgm')return audio;return elements[id]||(elements[id]={textContent:'',innerHTML:'',hidden:false,classList:classes,attrs:{},setAttribute(k,v){this.attrs[k]=v},addEventListener(type,fn){listeners[id+':'+type]=fn},setPointerCapture(){},getBoundingClientRect(){return{width:480,height:720}}})};el('game').getContext=()=>ctx;
const storage={};
const sandbox={document:{getElementById:el},window:{addEventListener(){},AudioContext:function(){this.state='running';this.currentTime=0;this.destination={};this.createOscillator=()=>({frequency:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(x){return x},start(){},stop(){}});this.createGain=()=>({gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}})}},localStorage:{getItem(k){return Object.hasOwn(storage,k)?storage[k]:null},setItem(k,v){storage[k]=String(v)}},Image:function(){this.complete=true;this.naturalWidth=384;this.naturalHeight=384;this.width=384;this.height=384},requestAnimationFrame(){},Math,console};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync('dist/game.js','utf8'),sandbox);const run=x=>vm.runInContext(x,sandbox);
listeners['preview2:click']();assert.match(audio.src,/stage2-v5/);listeners['preview3:click']();assert.match(audio.src,/stage3-v5/);run('start()');assert.match(audio.src,/stage1-v5/);assert.equal(run('game.player.power'),1);
// Power tiers and focus mode must have visibly different projectile shapes and trajectories.
run('game.shots=[];game.player.power=2;game.player.focus=false;firePlayerVolley(game,game.player)');
assert.equal(run("game.shots.filter(s=>s.style==='lance').length"),2);
assert.equal(run("game.shots.filter(s=>s.style==='feather').length"),2);
const wide=run("Math.abs(game.shots.find(s=>s.style==='feather').vx)");
run('game.shots=[];game.player.focus=true;firePlayerVolley(game,game.player)');
assert.ok(run("Math.abs(game.shots.find(s=>s.style==='feather').vx)")<wide);
assert.ok(run("game.shots.find(s=>s.style==='feather').vx")>0);
assert.ok(run('game.shots[0].vy') < -560);
run('game.shots=[];game.player.power=1;game.player.focus=false');
run("game.items.push({x:game.player.x,y:game.player.y,vy:0,type:'power'});update(.01)");assert.equal(run('game.player.power'),2);assert.equal(el('weapon').textContent,'Lv. 2');run('game.shots=[];game.player.shot=0;update(.01)');assert.equal(run('game.shots.length'),4);
run("game.items.push({x:game.player.x,y:game.player.y,vy:0,type:'power'});update(.01);game.shots=[];game.player.shot=0;update(.01)");assert.equal(run('game.player.power'),3);assert.equal(run('game.shots.length'),5);assert.equal(run("game.shots.filter(s=>s.style==='star').length"),1);run("game.bullets.push({x:10,y:10,vx:0,vy:1,r:5,color:'#fff'});bomb()");assert.ok(run('game.player.cast')>0);assert.ok(run('game.player.inv')>0);assert.equal(run('game.bullets.length'),0);assert.equal(run('game.bombs'),2);
run('game.enemyCount=3;enemy()');assert.equal(run('game.enemies[0].drop'),'power');
run("enemy();game.enemies[0].cast=.4;draw()");assert.ok(draws.some(x=>x==='assets/player_cast.webp'));assert.ok(draws.some(x=>x==='assets/enemy_cast.webp'));run('game.player.cast=0;game.enemies[0].cast=0;draw()');assert.ok(draws.some(x=>x==='assets/player.webp'));assert.ok(draws.some(x=>x==='assets/enemy.webp'));
run("spawnBoss('mid');pattern(game.boss);draw()");assert.ok(run('game.boss.cast')>0);assert.ok(draws.some(x=>x==='assets/midboss.webp'));assert.match(audio.src,/boss1-v5/);
run('game.boss.hp=0;update(.01)');assert.match(audio.src,/stage1-v5/);run("spawnBoss('end');draw()");assert.ok(draws.some(x=>x==='assets/boss1.webp'));run('game.boss.hp=0;update(.01)');assert.equal(run('game.stage'),2);assert.match(audio.src,/stage2-v5/);
run("spawnBoss('end');draw()");assert.ok(draws.some(x=>x==='assets/boss2.webp'));assert.match(audio.src,/boss2-v5/);run('game.boss.hp=0;update(.01)');assert.equal(run('game.stage'),3);assert.match(audio.src,/stage3-v5/);
run("spawnBoss('end');game.boss.hp=game.boss.max*.4;pattern(game.boss);draw()");assert.ok(draws.some(x=>x==='assets/boss3_rage.webp'));run('game.boss.hp=game.boss.max;draw()');assert.ok(draws.some(x=>x==='assets/boss3.webp'));assert.match(audio.src,/boss3-v5/);run('pause()');assert.equal(audio.paused,true);listeners['start:click']();assert.equal(audio.paused,false);run('game.boss.hp=0;update(.01)');assert.equal(run('state'),'win');assert.equal(audio.paused,true);
console.log('PASS: image sprites, action states, two power upgrades and shot counts, bomb cast, 3 boss images, music transitions, pause and victory');

// Enemy patterns must produce genuinely curved motion and distinct, readable shapes.
run('start(); game.bullets=[]; game.stage=3; spawnBoss("end"); game.boss.y=115; game.boss.phase=0; pattern(game.boss)');
assert.ok(run('game.bullets.length')>=20);
assert.ok(run('game.bullets.some(z=>z.curve>0) && game.bullets.some(z=>z.curve<0)'));
const originalDirection=run('Math.atan2(game.bullets[0].vy,game.bullets[0].vx)');
run('advanceEnemyBullet(game.bullets[0],.2)');
assert.ok(Math.abs(run('Math.atan2(game.bullets[0].vy,game.bullets[0].vx)')-originalDirection)>.05);
run('game.bullets=[]; for(let i=0;i<4;i++) pattern(game.boss)');
assert.deepEqual(Array.from(run('new Set(game.bullets.map(z=>z.shape))')).sort(),['moon','star']);
assert.ok(run('game.bullets.every(z=>z.boss)'));
assert.ok(run('game.bullets.every(z=>Number.isFinite(z.vx)&&Number.isFinite(z.vy))'));
run('game.bullets=[]; enemy(); game.enemies[0].y=50; game.enemies[0].kind=0; enemyPattern(game.enemies[0]); game.enemies[0].kind=1; enemyPattern(game.enemies[0])');
assert.ok(run('game.bullets.some(z=>z.shape==="petal") && game.bullets.some(z=>z.shape==="crystal")'));
run('game.bullets=[]; for(let i=0;i<MAX_ENEMY_BULLETS+20;i++) fireBullet(100,100,0,100,"#ffffff")');
assert.equal(run('game.bullets.length'),420);
run('game.bullets=[]; game.boss=null; game.enemies=[]; game.spawn=Infinity; game.bullets.push({x:100,y:200,vx:0,vy:0,r:4,age:11.99}); update(.02)');
assert.equal(run('game.bullets.length'),0);
console.log('PASS: enemy and boss shapes, curved motion, projectile limit and expiry');

// All six encounters have different identities and four functional spells.
const signatureShapes=['sigil','butterfly','ward','bat','cross','moon'];
const spellNames=new Set(), encounterSignatures=new Set();
for(let stage=1;stage<=3;stage++)for(const kind of ['mid','end']){
  const index=(stage-1)*2+(kind==='end'?1:0),phaseSignatures=[];
  run(`start();game.stage=${stage};spawnBoss('${kind}');game.boss.y=115;game.boss.t=2`);
  for(let phase=0;phase<4;phase++){
    run('game.bullets=[];pattern(game.boss)');
    const summary=run(`({name:game.boss.spellName,count:game.bullets.length,
      shapes:[...new Set(game.bullets.map(z=>z.shape))].sort(),
      colors:[...new Set(game.bullets.map(z=>z.color))].sort(),
      boss:game.bullets.every(z=>z.boss),valid:game.bullets.every(z=>Number.isFinite(z.vx)&&Number.isFinite(z.vy)&&z.r>0)})`);
    assert.ok(summary.name && !spellNames.has(summary.name),`duplicate spell for ${stage} ${kind}`);spellNames.add(summary.name);
    assert.ok(summary.count>=10&&summary.count<=48,`unexpected burst size ${summary.count}`);
    assert.ok(summary.boss && summary.valid);
    assert.ok(summary.shapes.every(s=>!['petal','crystal'].includes(s)),`boss bullets resemble normal enemies`);
    phaseSignatures.push(`${summary.count}:${Array.from(summary.shapes).join(',')}`);
    run('for(const z of game.bullets)for(let j=0;j<90;j++)advanceEnemyBullet(z,1/60)');
    assert.ok(run('game.bullets.every(z=>Number.isFinite(z.x)&&Number.isFinite(z.y))'));
  }
  assert.ok(new Set(phaseSignatures).size>=3,`repetitive patterns for ${stage} ${kind}`);
  run('game.bullets=[];game.boss.phase=0;pattern(game.boss)');
  assert.ok(run(`game.bullets.some(z=>z.shape==='${signatureShapes[index]}')`));
  const signature=run(`bossProfile(game.boss).emblem+':'+game.bullets[0].shape+':'+game.bullets[0].color`);
  assert.ok(!encounterSignatures.has(signature));encounterSignatures.add(signature);
  run('draw()');
}
assert.equal(spellNames.size,24);assert.equal(encounterSignatures.size,6);
run('game.bullets=[];game.boss.phase=0;game.boss.hp=game.boss.max;pattern(game.boss)');
const normalFinalCount=run('game.bullets.length'),normalFinalSpeed=run('Math.hypot(game.bullets[0].vx,game.bullets[0].vy)');
run('game.bullets=[];game.boss.phase=0;game.boss.hp=game.boss.max*.4;pattern(game.boss)');
assert.ok(run('game.bullets.length')>normalFinalCount);
assert.ok(run('Math.hypot(game.bullets[0].vx,game.bullets[0].vy)')>normalFinalSpeed);
run('bomb()');assert.equal(run('game.bullets.length'),0);
console.log('PASS: six distinct boss identities, 24 spells, finite trajectories, final rage and bomb clearing');

// Exercise the actual update loop for a prolonged encounter without player damage.
let highestCount=0;
for(let stage=1;stage<=3;stage++)for(const kind of ['mid','end']){
  run(`start();game.stage=${stage};spawnBoss('${kind}');game.boss.y=115;game.player.inv=999;game.player.shot=Infinity`);
  const result=run(`(()=>{let max=0;for(let i=0;i<1200;i++){update(1/60);max=Math.max(max,game.bullets.length)}return {max,phases:game.boss.phase,valid:game.bullets.every(z=>Number.isFinite(z.x)&&Number.isFinite(z.y))}})()`);
  assert.ok(result.phases>=4&&result.valid&&result.max<=420,`invalid encounter ${stage} ${kind}`);
  highestCount=Math.max(highestCount,result.max);
}
console.log(`PASS: six 20-second boss encounters remain bounded (peak ${highestCount} bullets)`);

// The original difficulty is the default; choices persist and lock during a run.
run("state='title';selectDifficulty(1)");
assert.equal(el('difficulty').value,'1');assert.equal(el('difficultyLabel').textContent,'難度 Lv.1');
listeners['difficulty:change']({target:{value:'4'}});
assert.equal(storage['scarlet-difficulty'],'4');assert.equal(el('difficultyLabel').textContent,'難度 Lv.4');
run('start()');assert.equal(run('game.difficulty'),4);assert.equal(el('difficultyControls').hidden,true);
run('selectDifficulty(6)');assert.equal(run('game.difficulty'),4);assert.equal(run('selectedDifficulty'),4);
run('pause()');assert.equal(el('difficultyControls').hidden,true);run('selectDifficulty(2)');assert.equal(run('selectedDifficulty'),4);
run('finish(false)');assert.equal(el('difficultyControls').hidden,false);
run('selectDifficulty(99)');assert.equal(run('selectedDifficulty'),1);

const difficultyStats=[];
for(let level=1;level<=6;level++){
  run(`state='title';selectDifficulty(${level});start()`);
  assert.equal(run('game.difficulty'),level);assert.equal(el('difficultyLabel').textContent,`難度 Lv.${level}`);
  run('game.player.inv=999;game.player.shot=Infinity;game.spawn=0;update(.01)');
  const spawnInterval=run('game.spawn');
  run("game.enemies=[];enemy();game.enemies[0].kind=0;game.bullets=[];enemyPattern(game.enemies[0])");
  const enemyShots=run('game.bullets.length'),speed=run('Math.hypot(game.bullets[0].vx,game.bullets[0].vy)');
  run("game.bullets=[];spawnBoss('mid');game.boss.y=115;game.boss.shot=0;update(.01)");
  difficultyStats.push({spawnInterval,enemyShots,speed,hp:run('game.boss.max'),bossInterval:run('game.boss.shot'),burst:run('game.bullets.length')});
}
assert.ok(Math.abs(difficultyStats[0].spawnInterval-1.2)<1e-9&&Math.abs(difficultyStats[0].speed-112)<1e-9);
assert.equal(difficultyStats[0].enemyShots,5);assert.equal(difficultyStats[0].hp,260);
assert.equal(difficultyStats[0].bossInterval,1.15);assert.equal(difficultyStats[0].burst,24);
for(let i=1;i<difficultyStats.length;i++){
 const a=difficultyStats[i-1],b=difficultyStats[i];
 assert.ok(b.speed>a.speed&&b.hp>a.hp&&b.spawnInterval<a.spawnInterval&&b.bossInterval<a.bossInterval);
 assert.ok(b.enemyShots>=a.enemyShots&&b.burst>a.burst);
}
// Long simulations at the highest setting exercise all boss styles and rage.
let highDifficultyPeak=0;
for(let stage=1;stage<=3;stage++)for(const kind of ['mid','end']){
 run(`state='title';selectDifficulty(6);start();game.stage=${stage};spawnBoss('${kind}');game.boss.y=115;game.player.inv=999;game.player.shot=Infinity;if(${stage}===3&&'${kind}'==='end')game.boss.hp=game.boss.max*.4`);
 const result=run(`(()=>{let max=0;for(let i=0;i<1200;i++){update(1/60);max=Math.max(max,game.bullets.length)}return {max,phases:game.boss.phase,valid:game.bullets.every(z=>Number.isFinite(z.x)&&Number.isFinite(z.y))}})()`);
 assert.ok(result.phases>=4&&result.valid&&result.max<420,`unbounded level 6 encounter ${stage} ${kind}`);
 highDifficultyPeak=Math.max(highDifficultyPeak,result.max);
}
console.log(`PASS: six difficulty levels, original level 1, saved selection, locked runs and level 6 encounters (peak ${highDifficultyPeak} bullets)`);
