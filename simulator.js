import { createSimulatorUI } from './simulator-ui.js';

const SIM = {
    running: false,
    mode: 'solo',
    level: 1,
    p1Name: 'Player 1',
    p2Name: 'Player 2',
    timer: 60,
    score: 0,
    coins: 0,
    winner: null,
    cars: [],
    slots: [],
    obstacles: [],
    nightMode: false,
    combo: 0
};

let canvas, ctx, miniCanvas, miniCtx, animId, timerInterval, audioCtx, engineOsc;

function getCarSVG(color) {
    return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 200"><rect x="10" y="10" width="80" height="180" rx="20" fill="${color}" stroke="#111" stroke-width="4"/><path d="M 20 60 Q 50 40 80 60 L 75 90 L 25 90 Z" fill="#1e1b4b"/><path d="M 25 140 L 75 140 L 70 160 Q 50 170 30 160 Z" fill="#1e1b4b"/><circle cx="25" cy="25" r="8" fill="#fef08a"/><circle cx="75" cy="25" r="8" fill="#fef08a"/><rect x="20" y="180" width="15" height="6" rx="2" fill="#ef4444"/><rect x="65" y="180" width="15" height="6" rx="2" fill="#ef4444"/></svg>`);
}

const carImgP1 = new Image(); carImgP1.src = getCarSVG('#a855f7');
const carImgP2 = new Image(); carImgP2.src = getCarSVG('#ef4444');

function initAudio() {
    if (audioCtx) return;
    try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        engineOsc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        g.gain.value = 0.03;
        engineOsc.type = 'sawtooth';
        engineOsc.frequency.value = 80;
        engineOsc.connect(g);
        g.connect(audioCtx.destination);
        engineOsc.start();
    } catch(e) {}
}

function playHorn() {
    if(!audioCtx) return;
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'square'; o.frequency.value = 400; g.gain.value = 0.1;
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); setTimeout(() => { g.gain.value=0; o.stop() }, 300);
}

function toast(msg) {
    const t = document.getElementById('simToast');
    if(!t) return;
    t.textContent = msg; t.classList.add('show');
    setTimeout(()=>t.classList.remove('show'), 1500);
}

function showCombo(txt) {
    const c = document.getElementById('simCombo');
    if(!c) return;
    c.textContent = txt; c.classList.add('show');
    setTimeout(()=>c.classList.remove('show'), 1200);
}

function resizeCanvas() {
    if(!canvas) return;
    const r = canvas.parentElement.getBoundingClientRect();
    canvas.width = r.width; canvas.height = r.height;
}

function generateMap(w, h) {
    const slots = [];
    const obstacles = [];
    const midX = w/2;
    
    // Left side slots (P1 / Solo L1)
    for(let i=0; i<5; i++){
        slots.push({x: 50 + i*80, y: 100, w: 60, h: 90, label: 'L'+(i+1), side: 'left'});
        slots.push({x: 50 + i*80, y: h - 190, w: 60, h: 90, label: 'L'+(i+6), side: 'left'});
    }
    
    // Right side slots (P2 / Solo L2)
    for(let i=0; i<5; i++){
        slots.push({x: midX + 50 + i*80, y: 100, w: 60, h: 90, label: 'R'+(i+1), side: 'right'});
        slots.push({x: midX + 50 + i*80, y: h - 190, w: 60, h: 90, label: 'R'+(i+6), side: 'right'});
    }
    
    obstacles.push({x:0, y:0, w:20, h:h});
    obstacles.push({x:w-20, y:0, w:20, h:h});
    obstacles.push({x:0, y:0, w:w, h:20});
    obstacles.push({x:0, y:h-20, w:w, h:20});
    
    // Middle divider
    obstacles.push({x: midX - 10, y: 0, w: 20, h: h, isDivider: true});
    
    // Small concrete blocks
    obstacles.push({x: 200, y: h/2 - 40, w: 80, h: 20});
    obstacles.push({x: midX + 200, y: h/2 - 40, w: 80, h: 20});
    
    return { slots, obstacles };
}

function createCar(isP1) {
    return {
        isP1,
        x: isP1 ? canvas.width/4 : canvas.width*0.75,
        y: canvas.height/2 + 50,
        angle: -Math.PI/2,
        speed: 0,
        steer: 0,
        gear: 'D',
        fuel: 100,
        damage: 0,
        nitro: false,
        lights: false,
        drifting: false,
        parked: false,
        targetSlot: null,
        level: 1,
        slotJumps: 0,
        keys: { gas:false, reverseGas:false, left:false, right:false, brake:false, nitro:false }
    };
}

function rectCollision(ax,ay,aw,ah,bx,by,bw,bh) {
    return ax<bx+bw && ax+aw>bx && ay<by+bh && ay+ah>by;
}

function checkCollisions(c) {
    const w=24, h=48;
    const cb = {x: c.x-w/2, y: c.y-h/2, w, h};
    
    for(const o of SIM.obstacles) {
        if(rectCollision(cb.x,cb.y,cb.w,cb.h,o.x,o.y,o.w,o.h)){
            c.speed *= -0.3;
            c.damage = Math.min(100, c.damage+5);
            if(c.damage>=100 && SIM.mode==='solo') {
                endGame(false);
            } else if (c.damage>=100 && SIM.mode==='duo') {
                c.damage = 0;
                c.x = c.isP1 ? canvas.width/4 : (canvas.width/4)*3;
                c.y = canvas.height/2 + 50;
                c.angle = -Math.PI/2;
                c.speed = 0;
                toast(`${c.isP1 ? 'P1' : 'P2'} wrecked! Respawning...`);
            }
            return true;
        }
    }
    for(const s of SIM.slots) {
        if(s===c.targetSlot) continue;
        if(rectCollision(cb.x,cb.y,cb.w,cb.h,s.x,s.y,s.w,s.h)){
            c.speed *= -0.3;
            c.damage = Math.min(100, c.damage+3);
            return true;
        }
    }
    return false;
}

function checkParking(c) {
    if(c.parked || SIM.winner) return;
    const t = c.targetSlot;
    if(!t) return;
    
    if(c.x > t.x && c.x < t.x+t.w && c.y > t.y && c.y < t.y+t.h && Math.abs(c.speed) < 0.5) {
        const dx = Math.abs(c.x - (t.x+t.w/2)), dy = Math.abs(c.y - (t.y+t.h/2));
        const acc = Math.max(0, 100 - dx*2 - dy*2)|0;
        c.parked = true;
        
        if (SIM.mode === 'solo') {
            SIM.score += acc*10 + SIM.timer*5;
            SIM.coins += Math.floor(acc/10)+5;
            if(acc>90) showCombo('PERFECT! 🎯'); else showCombo('GREAT! ⭐');
            
            setTimeout(() => {
                if (SIM.level === 1) {
                    toast('Level 1 Complete! Get ready for Level 2...');
                    SIM.level = 2;
                    setTimeout(() => startGame('solo'), 1500);
                } else {
                    endGame(true, acc);
                }
            }, 1000);
        } else {
            if (c.level < 3) {
                if(acc>90) showCombo('PERFECT! 🎯'); else showCombo('GREAT! ⭐');
                toast(`${c.isP1 ? SIM.p1Name : SIM.p2Name} reached Level ${c.level + 1}!`);
                setTimeout(() => {
                    c.level++;
                    c.x = c.isP1 ? canvas.width/4 : (canvas.width/4)*3;
                    c.y = canvas.height/2 + 50;
                    c.angle = -Math.PI/2;
                    c.speed = 0;
                    c.parked = false;
                    c.slotJumps = 0;
                    const slots = SIM.slots.filter(s => s.side === (c.isP1 ? 'left' : 'right'));
                    c.targetSlot = slots[Math.floor(Math.random() * slots.length)];
                }, 1000);
            } else {
                SIM.winner = c.isP1 ? SIM.p1Name : SIM.p2Name;
                showCombo(`${SIM.winner} WINS! 🏆`);
                setTimeout(() => endGame(true, acc), 2000);
            }
        }
    }
}

function updateCar(dt, c) {
    if(c.parked || SIM.winner) return;
    
    const turnInput = (c.keys.right?1:0) - (c.keys.left?1:0);
    const nitroMul = c.nitro && c.keys.nitro ? 1.8 : 1;
    
    let engineForce = 0;
    if(c.keys.gas) engineForce = 200 * nitroMul;
    else if(c.keys.reverseGas) engineForce = -150;
    
    let brakingForce = 0;
    if(c.keys.brake) brakingForce = 300 * Math.sign(c.speed);
    else if(c.keys.reverseGas && c.speed > 10) { brakingForce = 300; engineForce = 0; }
    else if(c.keys.gas && c.speed < -10) { brakingForce = -300; engineForce = 0; }
    
    c.speed += (engineForce - brakingForce - c.speed*2)*dt;
    c.speed = Math.max(-100, Math.min(200*nitroMul, c.speed));
    
    if(c.speed>10) c.gear='D'; else if(c.speed<-10) c.gear='R';
    
    if(Math.abs(c.speed)>1){
        const turnRate = 3*dt*Math.sign(c.speed);
        c.angle += turnInput * turnRate;
        if(Math.abs(turnInput)>0 && Math.abs(c.speed)>80){
            c.drifting=true; if(SIM.mode==='solo') SIM.score+=1;
        }else c.drifting=false;
    } else c.drifting=false;
    
    c.x += Math.cos(c.angle)*c.speed*dt;
    c.y += Math.sin(c.angle)*c.speed*dt;
    c.fuel = Math.max(0, c.fuel - (Math.abs(c.speed)*0.002 + (c.nitro&&c.keys.nitro?0.05:0)));
    
    if(c.fuel<=0){ c.speed*=0.95; if(Math.abs(c.speed)<0.1) c.speed=0; }
    
    c.x = Math.max(25, Math.min(canvas.width-25, c.x));
    c.y = Math.max(25, Math.min(canvas.height-25, c.y));
    
    checkCollisions(c);
    checkParking(c);
    
    if (SIM.mode === 'duo' && c.level === 3 && c.slotJumps < 2) {
        const t = c.targetSlot;
        if (t) {
            const dist = Math.hypot(c.x - (t.x+t.w/2), c.y - (t.y+t.h/2));
            if (dist < 90) {
                c.slotJumps++;
                toast(`${c.isP1 ? 'P1' : 'P2'} target moved! 😈`);
                const slots = SIM.slots.filter(s => s.side === (c.isP1 ? 'left' : 'right') && s !== t);
                c.targetSlot = slots[Math.floor(Math.random() * slots.length)];
            }
        }
    }
    
    if(engineOsc && c.isP1){ engineOsc.frequency.value = 80 + Math.abs(c.speed)*2; }
}

function drawRoad(ctx, w, h) {
    ctx.fillStyle = '#2a2a3e'; ctx.fillRect(0,0,w,h);
    ctx.strokeStyle = '#3a3a5e'; ctx.lineWidth = 1;
    for(let i=0; i<w; i+=40) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,h); ctx.stroke(); }
    for(let i=0; i<h; i+=40) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(w,i); ctx.stroke(); }
    
    ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2; ctx.setLineDash([15,10]);
    ctx.beginPath(); ctx.moveTo(w/2,0); ctx.lineTo(w/2,h); ctx.stroke(); ctx.setLineDash([]);
}

function drawSlots(ctx) {
    for(const s of SIM.slots) {
        const isP1Target = SIM.cars.find(c => c.isP1)?.targetSlot === s;
        const isP2Target = SIM.cars.find(c => !c.isP1)?.targetSlot === s;
        const isTarget = isP1Target || isP2Target;
        
        let color = 'rgba(100,100,140,0.2)', strokeColor = '#6b7280';
        if (isP1Target) { color = 'rgba(168,85,247,0.2)'; strokeColor = '#a855f7'; }
        if (isP2Target) { color = 'rgba(239,68,68,0.2)'; strokeColor = '#ef4444'; }
        
        ctx.fillStyle = color; ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.strokeStyle = strokeColor; ctx.lineWidth = isTarget ? 3 : 1;
        ctx.strokeRect(s.x, s.y, s.w, s.h);
        
        if (isTarget) {
            ctx.setLineDash([4,4]);
            ctx.beginPath(); ctx.moveTo(s.x+s.w/2, s.y); ctx.lineTo(s.x+s.w/2, s.y+s.h); ctx.stroke();
            ctx.setLineDash([]);
        }
        ctx.fillStyle = strokeColor; ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center';
        ctx.fillText(s.label, s.x+s.w/2, s.y+s.h/2+4);
    }
}

function drawObstacles(ctx) {
    ctx.fillStyle = '#4a4a6e';
    for(const o of SIM.obstacles) {
        if (!o.isDivider) ctx.fillRect(o.x, o.y, o.w, o.h);
    }
}

function drawCars(ctx) {
    for (const c of SIM.cars) {
        ctx.save();
        ctx.translate(c.x, c.y);
        ctx.rotate(c.angle + Math.PI/2);
        const w=24, h=48;
        
        if(c.drifting){
            ctx.shadowColor = c.isP1 ? '#a855f7' : '#ef4444';
            ctx.shadowBlur = 20;
        }
        ctx.drawImage(c.isP1 ? carImgP1 : carImgP2, -w/2, -h/2, w, h);
        ctx.shadowBlur = 0;
        
        if(c.lights || SIM.nightMode){
            ctx.fillStyle = 'rgba(255,255,200,0.8)';
            ctx.beginPath(); ctx.moveTo(-6,-h/2); ctx.lineTo(-15,-h/2-30); ctx.lineTo(0,-h/2-25); ctx.fill();
            ctx.beginPath(); ctx.moveTo(6,-h/2); ctx.lineTo(15,-h/2-30); ctx.lineTo(0,-h/2-25); ctx.fill();
        }
        if(c.nitro && c.keys.nitro){
            ctx.fillStyle = '#f97316';
            ctx.beginPath(); ctx.moveTo(-4,h/2); ctx.lineTo(0,h/2+15+Math.random()*10); ctx.lineTo(4,h/2); ctx.fill();
        }
        if(c.drifting){
            ctx.strokeStyle='rgba(200,200,200,0.3)'; ctx.lineWidth=3;
            ctx.beginPath(); ctx.moveTo(-w/2,h/2); ctx.lineTo(-w/2,h/2+20); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(w/2,h/2); ctx.lineTo(w/2,h/2+20); ctx.stroke();
        }
        ctx.restore();
    }
}

function drawMinimap() {
    if(!miniCtx) return;
    const s = 120 / Math.max(canvas.width, canvas.height);
    miniCtx.fillStyle = '#1a1a2e'; miniCtx.fillRect(0,0,120,120);
    miniCtx.fillStyle = '#3a3a5e';
    for(const sl of SIM.slots) miniCtx.fillRect(sl.x*s, sl.y*s, sl.w*s, sl.h*s);
    
    for (const c of SIM.cars) {
        if(c.targetSlot) {
            miniCtx.fillStyle = c.isP1 ? '#a855f7' : '#ef4444';
            miniCtx.fillRect(c.targetSlot.x*s, c.targetSlot.y*s, c.targetSlot.w*s, c.targetSlot.h*s);
        }
        miniCtx.fillStyle = c.isP1 ? '#c084fc' : '#f87171';
        miniCtx.beginPath(); miniCtx.arc(c.x*s, c.y*s, 3, 0, Math.PI*2); miniCtx.fill();
    }
}

function updateHUD() {
    const p1 = SIM.cars.find(c => c.isP1);
    const p2 = SIM.cars.find(c => !c.isP1);
    
    if(p1){
        document.getElementById('simSpeedVal').textContent = Math.abs(Math.round(p1.speed));
        document.getElementById('simGearVal').textContent = p1.gear;
        document.getElementById('simGearVal').className = 'sim-gear-val' + (p1.gear==='R'?' reverse':'');
        document.getElementById('simFuelBar').style.width = p1.fuel+'%';
        document.getElementById('simDamageBar').style.width = p1.damage+'%';
    }
    
    if (SIM.mode === 'solo') {
        document.getElementById('simScore').textContent = SIM.score;
        document.getElementById('simCoins').textContent = SIM.coins;
        document.getElementById('simTimer').textContent = SIM.timer;
        document.getElementById('simLevel').textContent = SIM.level;
    } else {
        if (p1) document.getElementById('hudDuoP1').textContent = `🎮 ${SIM.p1Name} (Lv.${p1.level}/3)`;
        if (p2) document.getElementById('hudDuoP2').textContent = `🎮 ${SIM.p2Name} (Lv.${p2.level}/3)`;
    }
}

function gameLoop() {
    if(!SIM.running) return;
    const dt = 1/60;
    for (const c of SIM.cars) updateCar(dt, c);
    drawRoad(ctx, canvas.width, canvas.height);
    drawSlots(ctx);
    drawObstacles(ctx);
    drawCars(ctx);
    drawMinimap();
    updateHUD();
    animId = requestAnimationFrame(gameLoop);
}

function startTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if(!SIM.running || SIM.mode === 'duo') return;
        SIM.timer--;
        if(SIM.timer <= 0) {
            SIM.timer = 0;
            endGame(false);
        }
    }, 1000);
}

function endGame(success, accuracy) {
    SIM.running = false;
    clearInterval(timerInterval);
    if(engineOsc) try { engineOsc.frequency.value = 80; } catch(e){}
    
    const sc = document.getElementById('simScorecard');
    sc.classList.add('active');
    
    if (SIM.mode === 'solo') {
        document.getElementById('scTitle').textContent = success ? 'PARKING COMPLETE! 🎉' : 'TIME UP! ⏰';
        document.getElementById('scRank').textContent = success ? (accuracy>90 ? '⭐ Rank: Master' : (accuracy>70 ? '⭐ Rank: Expert' : '⭐ Rank: Rookie')) : 'Try again!';
        document.getElementById('scStatsSolo').style.display = 'grid';
        document.getElementById('scScore').textContent = SIM.score;
        document.getElementById('scTime').textContent = (60 - SIM.timer) + 's';
        document.getElementById('scAccuracy').textContent = (accuracy||0) + '%';
        document.getElementById('scCoins').textContent = SIM.coins;
        
        try {
            const hs = JSON.parse(localStorage.getItem('simHighScores')||'[]');
            hs.push({score: SIM.score, coins: SIM.coins, date: Date.now(), level: SIM.level});
            hs.sort((a,b)=>b.score-a.score);
            localStorage.setItem('simHighScores', JSON.stringify(hs.slice(0,20)));
        } catch(e){}
    } else {
        document.getElementById('scTitle').textContent = success ? `${SIM.winner} WINS! 🏆` : 'DRAW!';
        document.getElementById('scRank').textContent = 'Great Match!';
        document.getElementById('scStatsSolo').style.display = 'none';
    }
    
    toast(success ? 'Match Complete!' : 'Better luck next time!');
}

let controlsBound = false;
function bindControls() {
    if(controlsBound) return;
    controlsBound = true;
    
    document.addEventListener('keydown', e => {
        if(!SIM.running) return;
        const k = e.key.toLowerCase();
        if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright',' ','shift','h','r','l','n'].includes(k)){
            e.preventDefault();
        }
        
        const p1 = SIM.cars.find(c => c.isP1);
        const p2 = SIM.cars.find(c => !c.isP1);
        
        if (p1) {
            if(k==='w') p1.keys.gas=true;
            if(k==='s') p1.keys.reverseGas=true;
            if(k==='a') p1.keys.left=true;
            if(k==='d') p1.keys.right=true;
            if(k===' ' && SIM.mode==='solo') p1.keys.brake=true;
            if(k==='shift' && SIM.mode==='solo') { p1.keys.nitro=true; p1.nitro=true; }
            if(k==='l') p1.lights = !p1.lights;
        }
        
        if (p2) {
            if(k==='arrowup') p2.keys.gas=true;
            if(k==='arrowdown') p2.keys.reverseGas=true;
            if(k==='arrowleft') p2.keys.left=true;
            if(k==='arrowright') p2.keys.right=true;
        } else if (p1 && SIM.mode==='solo') {
            if(k==='arrowup') p1.keys.gas=true;
            if(k==='arrowdown') p1.keys.reverseGas=true;
            if(k==='arrowleft') p1.keys.left=true;
            if(k==='arrowright') p1.keys.right=true;
        }
        
        if(k==='h') playHorn();
        if(k==='n') SIM.nightMode = !SIM.nightMode;
    }, {passive: false});

    document.addEventListener('keyup', e => {
        const k = e.key.toLowerCase();
        const p1 = SIM.cars.find(c => c.isP1);
        const p2 = SIM.cars.find(c => !c.isP1);
        
        if(p1) {
            if(k==='w') p1.keys.gas=false;
            if(k==='s') p1.keys.reverseGas=false;
            if(k==='a') p1.keys.left=false;
            if(k==='d') p1.keys.right=false;
            if(k===' ') p1.keys.brake=false;
            if(k==='shift') { p1.keys.nitro=false; p1.nitro=false; }
        }
        
        if(p2) {
            if(k==='arrowup') p2.keys.gas=false;
            if(k==='arrowdown') p2.keys.reverseGas=false;
            if(k==='arrowleft') p2.keys.left=false;
            if(k==='arrowright') p2.keys.right=false;
        } else if (p1 && SIM.mode==='solo') {
            if(k==='arrowup') p1.keys.gas=false;
            if(k==='arrowdown') p1.keys.reverseGas=false;
            if(k==='arrowleft') p1.keys.left=false;
            if(k==='arrowright') p1.keys.right=false;
        }
    });

    const tb = (id, key) => {
        const el = document.getElementById(id);
        if(!el) return;
        const setK = v => () => {
            if(!SIM.running) return;
            const p1 = SIM.cars.find(c => c.isP1);
            if(p1) p1.keys[key] = v;
        };
        el.addEventListener('touchstart', e => { e.preventDefault(); setK(true)(); });
        el.addEventListener('touchend', e => { e.preventDefault(); setK(false)(); });
        el.addEventListener('mousedown', setK(true));
        el.addEventListener('mouseup', setK(false));
        el.addEventListener('mouseleave', setK(false));
    };
    tb('btnGas','gas'); tb('btnBrake','reverseGas'); tb('btnLeft','left'); tb('btnRight','right'); tb('btnNitro','nitro');
    const horn = document.getElementById('btnHorn');
    if(horn) horn.addEventListener('click', () => playHorn());
}

function startLoading(cb) {
    const bar = document.getElementById('simLoadBar');
    const txt = document.getElementById('simLoadText');
    const ld = document.getElementById('simLoading');
    ld.style.display = 'flex';
    ld.classList.remove('fade-out');
    
    const msgs = ['Loading assets...','Building parking lot...','Calibrating physics...','Starting engine...','Ready!'];
    let p=0, mi=0;
    const iv = setInterval(() => {
        p += Math.random()*20 + 5;
        if(p>100) p=100;
        bar.style.width = p+'%';
        if(p > mi*25 && mi < msgs.length) { txt.textContent = msgs[mi]; mi++; }
        if(p>=100) {
            clearInterval(iv);
            setTimeout(() => {
                ld.classList.add('fade-out');
                setTimeout(() => { ld.style.display='none'; cb(); }, 800);
            }, 500);
        }
    }, 200);
}

function startGame(mode) {
    SIM.mode = mode;
    SIM.running = true;
    SIM.winner = null;
    SIM.timer = 60;
    if(mode === 'solo' && SIM.level === 1) {
        SIM.score = 0; SIM.coins = 0;
    }
    
    const map = generateMap(canvas.width, canvas.height);
    SIM.slots = map.slots;
    SIM.obstacles = map.obstacles;
    
    SIM.cars = [];
    if (mode === 'solo') {
        const c = createCar(true);
        const validSlots = SIM.slots.filter(s => s.side === (SIM.level === 1 ? 'left' : 'right'));
        c.targetSlot = validSlots[Math.floor(Math.random() * validSlots.length)];
        // Force car to start on the correct side
        c.x = SIM.level === 1 ? canvas.width/4 : (canvas.width/4)*3;
        SIM.cars.push(c);
        
        document.getElementById('simTargetMsg').textContent = `🅿️ Park in Slot ${c.targetSlot.label}`;
        
        document.getElementById('hudSoloLeft').style.display = 'flex';
        document.getElementById('hudSoloRight').style.display = 'flex';
        document.getElementById('hudDuoP1').style.display = 'none';
        document.getElementById('hudDuoP2').style.display = 'none';
        document.getElementById('simKeyHintsSolo').style.display = 'flex';
        document.getElementById('simKeyHintsDuo').style.display = 'none';
    } else {
        const p1 = createCar(true);
        const leftSlots = SIM.slots.filter(s => s.side === 'left');
        p1.targetSlot = leftSlots[Math.floor(Math.random() * leftSlots.length)];
        p1.x = canvas.width/4;
        
        const p2 = createCar(false);
        const rightSlots = SIM.slots.filter(s => s.side === 'right');
        p2.targetSlot = rightSlots[Math.floor(Math.random() * rightSlots.length)];
        p2.x = (canvas.width/4)*3;
        
        SIM.cars.push(p1, p2);
        
        document.getElementById('simTargetMsg').textContent = `🏁 DUO RACE! First to park wins!`;
        
        document.getElementById('hudSoloLeft').style.display = 'none';
        document.getElementById('hudSoloRight').style.display = 'none';
        document.getElementById('hudDuoP1').style.display = 'flex';
        document.getElementById('hudDuoP2').style.display = 'flex';
        document.getElementById('hudDuoP1').textContent = `🎮 ${SIM.p1Name} (Lv.1/3)`;
        document.getElementById('hudDuoP2').textContent = `🎮 ${SIM.p2Name} (Lv.1/3)`;
        document.getElementById('simKeyHintsSolo').style.display = 'none';
        document.getElementById('simKeyHintsDuo').style.display = 'flex';
    }
    
    document.getElementById('simScorecard').classList.remove('active');
    startTimer();
    animId = requestAnimationFrame(gameLoop);
}

function closeSimulator() {
    SIM.running = false;
    clearInterval(timerInterval);
    if(animId) cancelAnimationFrame(animId);
    if(engineOsc) try{engineOsc.stop()}catch(e){}
    audioCtx = null; engineOsc = null;
    const ov = document.getElementById('simulator-overlay');
    if(ov) ov.classList.remove('active');
    setTimeout(() => { if(ov) ov.remove(); }, 500);
}

export function launchSimulator() {
    const ci = document.getElementById('chat-input');
    if(ci) ci.blur();
    
    createSimulatorUI();
    const overlay = document.getElementById('simulator-overlay');
    overlay.classList.add('active');
    
    canvas = document.getElementById('simCanvas');
    ctx = canvas.getContext('2d');
    miniCanvas = document.getElementById('simMinimap');
    miniCtx = miniCanvas.getContext('2d');
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    document.getElementById('simCloseBtn').addEventListener('click', closeSimulator);
    document.getElementById('scClose').addEventListener('click', closeSimulator);
    
    // UI Flows
    const menuOverlay = document.getElementById('simMenuOverlay');
    const modeSelect = document.getElementById('simModeSelect');
    const nameSelect = document.getElementById('simNameSelect');
    
    document.getElementById('scReplay').addEventListener('click', () => {
        document.getElementById('simScorecard').classList.remove('active');
        menuOverlay.style.display = 'flex';
        modeSelect.style.display = 'block';
        nameSelect.style.display = 'none';
    });
    
    menuOverlay.style.display = 'none';
    
    startLoading(() => {
        menuOverlay.style.display = 'flex';
        modeSelect.style.display = 'block';
        nameSelect.style.display = 'none';
    });
    
    document.getElementById('btnModeSolo').onclick = () => {
        menuOverlay.style.display = 'none';
        SIM.level = 1;
        initAudio(); startGame('solo');
    };
    
    document.getElementById('btnModeDuo').onclick = () => {
        modeSelect.style.display = 'none';
        nameSelect.style.display = 'block';
    };
    
    document.getElementById('btnBackToMode').onclick = () => {
        nameSelect.style.display = 'none';
        modeSelect.style.display = 'block';
    };
    
    document.getElementById('btnStartGame').onclick = () => {
        SIM.p1Name = document.getElementById('p1Name').value.trim() || 'Player 1';
        SIM.p2Name = document.getElementById('p2Name').value.trim() || 'Player 2';
        menuOverlay.style.display = 'none';
        initAudio(); startGame('duo');
    };
    
    bindControls();
}
