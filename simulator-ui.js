export function createSimulatorUI() {
  if (document.getElementById('simulator-overlay')) return;
  const el = document.createElement('div');
  el.id = 'simulator-overlay';
  el.innerHTML = `
    <div class="sim-loading" id="simLoading" style="display:none;">
      <div class="sim-loading-car">🏎️</div>
      <div class="sim-loading-logo"><span class="fast">FAST</span><span class="park">PARK</span></div>
      <div class="sim-loading-sub">Parking Simulator</div>
      <div class="sim-loading-bar-wrap"><div class="sim-loading-bar" id="simLoadBar"></div></div>
      <div class="sim-loading-text" id="simLoadText">Initializing engine...</div>
    </div>
    
    <div class="sim-menu-overlay" id="simMenuOverlay" style="display:none;">
      <div class="sim-menu-box" id="simModeSelect">
        <h2 class="sim-menu-title">SELECT MODE</h2>
        <div class="sim-menu-btns">
          <button class="sim-menu-btn primary" id="btnModeSolo">🧍 SOLO MODE</button>
          <button class="sim-menu-btn" id="btnModeDuo" style="background: linear-gradient(135deg, #ef4444, #f97316);">👯 DUO BATTLE</button>
        </div>
      </div>
      <div class="sim-menu-box" id="simNameSelect" style="display:none;">
        <h2 class="sim-menu-title" style="color:#f97316;">ENTER NAMES</h2>
        <input type="text" id="p1Name" class="sim-menu-input" placeholder="Player 1 Name (WASD) - Purple">
        <input type="text" id="p2Name" class="sim-menu-input" placeholder="Player 2 Name (Arrows) - Red">
        <div class="sim-menu-btns">
          <button class="sim-menu-btn primary" id="btnStartGame" style="background: linear-gradient(135deg, #ef4444, #f97316);">START DUO MATCH</button>
          <button class="sim-menu-btn" id="btnBackToMode" style="padding:10px; font-size:12px;">Back</button>
        </div>
      </div>
    </div>

    <div class="sim-game-area">
      <canvas id="simCanvas"></canvas>
      <div class="sim-headlight-overlay" id="simHeadlightOverlay"></div>
      
      <div class="sim-hud-top">
        <div class="sim-hud-left" id="hudSoloLeft">
          <div class="sim-hud-badge timer">⏱ <span class="val" id="simTimer">60</span>s</div>
          <div class="sim-hud-badge score">⭐ <span class="val" id="simScore">0</span></div>
        </div>
        <div class="sim-hud-right" id="hudSoloRight">
          <div class="sim-hud-badge">🪙 <span class="val" id="simCoins">0</span></div>
          <div class="sim-hud-badge">🎯 Lv.<span class="val" id="simLevel">1</span></div>
        </div>
        
        <div class="sim-hud-badge" id="hudDuoP1" style="display:none; border-color:#a855f7; color:#a855f7; font-size:16px;">P1</div>
        <div class="sim-hud-badge" id="hudDuoP2" style="display:none; border-color:#ef4444; color:#ef4444; font-size:16px;">P2</div>
      </div>
      
      <div class="sim-target-msg" id="simTargetMsg">🅿️ Park in Slot A3</div>
      
      <div class="sim-speedometer">
        <div class="sim-speed-val" id="simSpeedVal">0</div>
        <div class="sim-speed-unit">km/h</div>
      </div>
      <div class="sim-gear-indicator">
        <div class="sim-gear-label">Gear</div>
        <div class="sim-gear-val" id="simGearVal">D</div>
      </div>
      
      <div class="sim-bars">
        <div class="sim-bar-item"><div class="sim-bar-label">⛽ Fuel</div><div class="sim-bar-track"><div class="sim-bar-fill fuel" id="simFuelBar" style="width:100%"></div></div></div>
        <div class="sim-bar-item"><div class="sim-bar-label">💥 Damage</div><div class="sim-bar-track"><div class="sim-bar-fill damage" id="simDamageBar" style="width:0%"></div></div></div>
      </div>
      
      <div class="sim-minimap"><canvas id="simMinimap" width="120" height="120"></canvas></div>
      <div class="sim-combo" id="simCombo">PERFECT!</div>
      <div class="sim-toast" id="simToast">+100 points!</div>
      
      <div class="sim-key-hints" id="simKeyHintsSolo">
        <div class="sim-key-hint"><kbd>W</kbd>/<kbd>↑</kbd> Gas</div>
        <div class="sim-key-hint"><kbd>S</kbd>/<kbd>↓</kbd> Rev/Brake</div>
        <div class="sim-key-hint"><kbd>A</kbd>/<kbd>D</kbd> Turn</div>
        <div class="sim-key-hint"><kbd>Shift</kbd> Nitro</div>
      </div>
      <div class="sim-key-hints" id="simKeyHintsDuo" style="display:none;">
        <div class="sim-key-hint" style="color:#c084fc;"><b>P1:</b> <kbd>WASD</kbd> Drive</div>
        <div class="sim-key-hint" style="color:#f87171;"><b>P2:</b> <kbd>Arrows</kbd> Drive</div>
      </div>
      
      <div class="sim-controls" id="simControls">
        <div class="sim-ctrl-group">
          <button class="sim-ctrl-btn" id="btnLeft">◀</button>
          <button class="sim-ctrl-btn horn" id="btnHorn">🔔</button>
        </div>
        <div class="sim-ctrl-group">
          <button class="sim-ctrl-btn nitro" id="btnNitro">🚀</button>
          <button class="sim-ctrl-btn" id="btnReverse">R</button>
        </div>
        <div class="sim-ctrl-group">
          <button class="sim-ctrl-btn brake" id="btnBrake">⏹</button>
          <button class="sim-ctrl-btn gas" id="btnGas">▲</button>
          <button class="sim-ctrl-btn" id="btnRight">▶</button>
        </div>
      </div>
      <button class="sim-close-btn" id="simCloseBtn">✕</button>
    </div>
    
    <div class="sim-scorecard" id="simScorecard">
      <div class="sim-scorecard-card">
        <div class="sim-scorecard-title" id="scTitle">PARKING COMPLETE!</div>
        <div class="sim-scorecard-rank" id="scRank">⭐ Rank: Expert</div>
        <div class="sim-scorecard-stats" id="scStatsSolo">
          <div class="sim-stat-box"><div class="label">Score</div><div class="value gold" id="scScore">0</div></div>
          <div class="sim-stat-box"><div class="label">Time</div><div class="value" id="scTime">0s</div></div>
          <div class="sim-stat-box"><div class="label">Accuracy</div><div class="value green" id="scAccuracy">0%</div></div>
          <div class="sim-stat-box"><div class="label">Coins</div><div class="value gold" id="scCoins">0</div></div>
        </div>
        <div class="sim-scorecard-btns">
          <button class="sim-sc-btn secondary" id="scClose">Exit</button>
          <button class="sim-sc-btn primary" id="scReplay">Menu 🔁</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(el);
}
