import * as THREE from 'three';
import { SIM_DT, dist3D, findNearestInteractableLantern } from '../../sim/index.js';

function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  const min = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(min).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

export function createHud(root, callbacks) {
  root.innerHTML = `
    <div class="hit-flash" data-hud="hit-flash"></div>
    <div class="offscreen-arrow hidden" data-hud="lantern-arrow" title="Đèn chưa sáng gần nhất">▲</div>

    <!-- Playing HUD -->
    <div class="hud-playing hidden" data-screen="playing">
      <div class="hud-top-left" data-hud="flames"></div>

      <div class="hud-top-center">
        <div class="hud-timer" data-hud="time">05:00</div>
        <div class="hud-wind hidden" data-hud="wind-banner">Gió mạnh sắp tới!</div>
      </div>

      <div class="hud-top-right">
        <div class="hud-stat">
          <span class="hud-label">Đèn</span>
          <span class="hud-value" data-hud="lanterns">0/5</span>
        </div>
        <div class="hud-stat">
          <span class="hud-label">Điểm</span>
          <span class="hud-value gold" data-hud="score">0</span>
        </div>
        <div class="hud-stat">
          <span class="hud-label">Tổng</span>
          <span class="hud-value gold" data-hud="total-score">0</span>
        </div>
        <button type="button" class="hud-btn" data-hud="light-mode-btn">Chuẩn</button>
        <button type="button" class="hud-btn" data-hud="pause-btn">Tạm dừng (P)</button>
      </div>

      <div class="hud-prompt hidden" data-hud="prompt"></div>

      <div class="hud-bottom-center">
        <div class="mote-bar" data-hud="mote-bar">
          ${Array.from({ length: 10 }, () => '<span class="mote-slot"></span>').join('')}
        </div>
        <div class="mote-caption" data-hud="mote-caption">Đom đóm 0/10</div>
      </div>

      <div class="hud-bottom-right">
        <div class="skill-chip hidden" data-hud="charm-chip">Bùa Gió: 10.0s</div>
        <div class="skill-chip" data-hud="dash-chip">Lướt (Shift): Sẵn sàng</div>
        <div class="skill-chip" data-hud="pulse-chip">Tỏa Sáng (Q): Cần 3</div>
      </div>

      <div class="hud-controls">
        WASD đi · Kéo chuột / ← → xoay · Space nhảy · Shift lướt · E nạp sáng · Q tỏa sáng · Esc/P tạm dừng
      </div>
    </div>

    <!-- Main Menu -->
    <div class="modal-overlay" data-screen="menu">
      <div class="modal-card">
        <h1 class="modal-title">Đảo Đèn Lồng</h1>
        <p class="modal-subtitle">Thắp sáng ba hòn đảo trước khi bình minh tới.</p>
        <div class="modal-actions">
          <button type="button" class="primary-btn" data-action="start-game">Bắt đầu hành trình</button>
          <button type="button" class="secondary-btn" data-action="open-settings">Cài đặt</button>
        </div>
      </div>
    </div>

    <!-- Night Intro -->
    <div class="modal-overlay hidden" data-screen="intro">
      <div class="modal-card">
        <div class="intro-kicker" data-hud="intro-night">Đêm 1</div>
        <h2 class="modal-title" data-hud="intro-island">Đảo Bến</h2>
        <p class="intro-quote" data-hud="intro-quote"></p>
        <div class="modal-actions">
          <button type="button" class="primary-btn" data-action="begin-night">Bắt đầu Đêm</button>
        </div>
      </div>
    </div>

    <!-- Pause Overlay -->
    <div class="modal-overlay hidden" data-screen="paused">
      <div class="modal-card">
        <h2 class="modal-title">Tạm dừng</h2>
        <div class="modal-actions vertical">
          <button type="button" class="primary-btn" data-action="resume">Tiếp tục</button>
          <button type="button" class="secondary-btn" data-action="replay-night">Chơi lại Đêm</button>
          <button type="button" class="secondary-btn" data-action="open-settings">Cài đặt</button>
          <button type="button" class="secondary-btn" data-action="to-menu">Về menu</button>
        </div>
      </div>
    </div>

    <!-- Settings Modal -->
    <div class="modal-overlay hidden" data-screen="settings">
      <div class="modal-card">
        <h2 class="modal-title">Cài đặt</h2>
        <div class="settings-list">
          <label class="setting-row">
            <span>Âm lượng: <strong data-hud="vol-val">70%</strong></span>
            <input type="range" min="0" max="100" value="70" data-input="volume" />
          </label>
          <label class="setting-row">
            <span>Độ nhạy chuột: <strong data-hud="sens-val">1.0x</strong></span>
            <input type="range" min="30" max="250" value="100" data-input="sensitivity" />
          </label>
        </div>
        <div class="modal-actions">
          <button type="button" class="primary-btn" data-action="close-settings">Đóng</button>
        </div>
      </div>
    </div>

    <!-- Result / Dawn Victory -->
    <div class="modal-overlay hidden" data-screen="result">
      <div class="modal-card">
        <h2 class="modal-title" data-hud="end-title">Hoàn thành Đêm</h2>
        <p class="modal-subtitle" data-hud="end-reason"></p>
        <div class="end-stats">
          <div>
            <div class="end-stat-label">Điểm đêm</div>
            <div class="end-stat-value gold" data-hud="end-score">0</div>
          </div>
          <div>
            <div class="end-stat-label">Tổng điểm</div>
            <div class="end-stat-value gold" data-hud="end-total">0</div>
          </div>
          <div>
            <div class="end-stat-label">Đèn sáng</div>
            <div class="end-stat-value" data-hud="end-lanterns">0/5</div>
          </div>
          <div>
            <div class="end-stat-label">Lửa còn</div>
            <div class="end-stat-value" data-hud="end-flames">0</div>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="primary-btn hidden" data-action="next-night">Đêm tiếp theo</button>
          <button type="button" class="secondary-btn" data-action="replay-night">Chơi lại Đêm</button>
          <button type="button" class="secondary-btn" data-action="to-menu">Về menu</button>
        </div>
      </div>
    </div>
  `;

  const screens = {
    playing: root.querySelector('[data-screen="playing"]'),
    menu: root.querySelector('[data-screen="menu"]'),
    intro: root.querySelector('[data-screen="intro"]'),
    paused: root.querySelector('[data-screen="paused"]'),
    settings: root.querySelector('[data-screen="settings"]'),
    result: root.querySelector('[data-screen="result"]')
  };

  const flamesEl = root.querySelector('[data-hud="flames"]');
  const timeEl = root.querySelector('[data-hud="time"]');
  const windBannerEl = root.querySelector('[data-hud="wind-banner"]');
  const lanternsEl = root.querySelector('[data-hud="lanterns"]');
  const scoreEl = root.querySelector('[data-hud="score"]');
  const totalScoreEl = root.querySelector('[data-hud="total-score"]');
  const promptEl = root.querySelector('[data-hud="prompt"]');
  const moteBarSlots = root.querySelectorAll('[data-hud="mote-bar"] .mote-slot');
  const moteCaptionEl = root.querySelector('[data-hud="mote-caption"]');
  const charmChipEl = root.querySelector('[data-hud="charm-chip"]');
  const dashChipEl = root.querySelector('[data-hud="dash-chip"]');
  const pulseChipEl = root.querySelector('[data-hud="pulse-chip"]');
  const arrowEl = root.querySelector('[data-hud="lantern-arrow"]');
  const hitFlashEl = root.querySelector('[data-hud="hit-flash"]');
  const lightModeBtn = root.querySelector('[data-hud="light-mode-btn"]');

  const introNightEl = root.querySelector('[data-hud="intro-night"]');
  const introIslandEl = root.querySelector('[data-hud="intro-island"]');
  const introQuoteEl = root.querySelector('[data-hud="intro-quote"]');

  const endTitleEl = root.querySelector('[data-hud="end-title"]');
  const endReasonEl = root.querySelector('[data-hud="end-reason"]');
  const endScoreEl = root.querySelector('[data-hud="end-score"]');
  const endTotalEl = root.querySelector('[data-hud="end-total"]');
  const endLanternsEl = root.querySelector('[data-hud="end-lanterns"]');
  const endFlamesEl = root.querySelector('[data-hud="end-flames"]');
  const nextNightBtn = root.querySelector('[data-action="next-night"]');

  const volInput = root.querySelector('[data-input="volume"]');
  const volVal = root.querySelector('[data-hud="vol-val"]');
  const sensInput = root.querySelector('[data-input="sensitivity"]');
  const sensVal = root.querySelector('[data-hud="sens-val"]');

  root.querySelector('[data-action="start-game"]').addEventListener('click', callbacks.onStartGame);
  root.querySelector('[data-action="begin-night"]').addEventListener('click', callbacks.onBeginNight);
  root.querySelector('[data-action="resume"]').addEventListener('click', callbacks.onResume);
  root.querySelectorAll('[data-action="replay-night"]').forEach((btn) =>
    btn.addEventListener('click', callbacks.onReplayNight)
  );
  root.querySelectorAll('[data-action="open-settings"]').forEach((btn) =>
    btn.addEventListener('click', callbacks.onOpenSettings)
  );
  root.querySelector('[data-action="close-settings"]').addEventListener('click', callbacks.onCloseSettings);
  root.querySelectorAll('[data-action="to-menu"]').forEach((btn) =>
    btn.addEventListener('click', callbacks.onToMenu)
  );
  nextNightBtn.addEventListener('click', callbacks.onNextNight);
  lightModeBtn.addEventListener('click', callbacks.onToggleLightMode);
  root.querySelector('[data-hud="pause-btn"]').addEventListener('click', callbacks.onPause);

  volInput.addEventListener('input', () => {
    const v = Number(volInput.value) / 100;
    volVal.textContent = `${Math.round(v * 100)}%`;
    callbacks.onChangeVolume(v);
  });

  sensInput.addEventListener('input', () => {
    const s = Number(sensInput.value) / 100;
    sensVal.textContent = `${s.toFixed(1)}x`;
    callbacks.onChangeSensitivity(s);
  });

  let hitFlashTimer = 0;
  const projVec = new THREE.Vector3();

  function setScreen(name) {
    for (const [k, el] of Object.entries(screens)) {
      el.classList.toggle('hidden', k !== name);
    }
    if (name !== 'playing') {
      arrowEl.classList.add('hidden');
    }
  }

  function showIntro(night, map) {
    introNightEl.textContent = `Đêm ${night} / 3`;
    introIslandEl.textContent = map.name;
    introQuoteEl.textContent = `“${map.elderQuote}” — Ông Đăng`;
    setScreen('intro');
  }

  function showSettings(settings) {
    volInput.value = String(Math.round(settings.volume * 100));
    volVal.textContent = `${Math.round(settings.volume * 100)}%`;
    sensInput.value = String(Math.round(settings.sensitivity * 100));
    sensVal.textContent = `${settings.sensitivity.toFixed(1)}x`;
    screens.settings.classList.remove('hidden');
  }

  function hideSettings() {
    screens.settings.classList.add('hidden');
  }

  function setLightModeLabel(enabled) {
    lightModeBtn.textContent = enabled ? 'Nhẹ' : 'Chuẩn';
  }

  function triggerHitFlash() {
    hitFlashTimer = 0.25;
    hitFlashEl.classList.add('active');
  }

  function showResult(sim, totalScore) {
    const litCount = sim.lanterns.filter((l) => l.lit).length;
    const isWon = sim.state === 'won';
    if (isWon && sim.night === 3) {
      endTitleEl.textContent = 'Bình Minh Rạng Rỡ!';
      endReasonEl.textContent = 'Mây đã thắp sáng cả ba hòn đảo và đẩy lùi sương đen.';
      nextNightBtn.classList.add('hidden');
    } else if (isWon) {
      endTitleEl.textContent = `Hoàn thành Đêm ${sim.night}`;
      endReasonEl.textContent = `Tất cả ${sim.lanterns.length} Đèn Lồng Lớn trên ${sim.map.name} đã tỏa sáng.`;
      nextNightBtn.classList.remove('hidden');
    } else {
      endTitleEl.textContent = `Thất bại ở Đêm ${sim.night}`;
      endReasonEl.textContent =
        sim.endReason === 'no_flames'
          ? 'Mây đã tắt hết Ngọn Lửa.'
          : 'Bình minh đã tới trước khi thắp đủ đèn.';
      nextNightBtn.classList.add('hidden');
    }
    endScoreEl.textContent = String(sim.score);
    endTotalEl.textContent = String(totalScore);
    endLanternsEl.textContent = `${litCount}/${sim.lanterns.length}`;
    endFlamesEl.textContent = String(sim.player.flames);
    setScreen('result');
  }

  function update(sim, totalScore, camera, dt = 0) {
    if (hitFlashTimer > 0) {
      hitFlashTimer = Math.max(0, hitFlashTimer - dt);
      if (hitFlashTimer === 0) hitFlashEl.classList.remove('active');
    }

    // Flames
    const maxFlames = sim.tuning.flames;
    flamesEl.innerHTML = Array.from({ length: maxFlames }, (_, i) => {
      const lit = i < sim.player.flames;
      return `<span class="flame-pip ${lit ? 'lit' : 'out'}">🔥</span>`;
    }).join('');

    // Timer
    timeEl.textContent = formatTime(sim.timeLeftS);
    timeEl.classList.toggle('danger', sim.timeLeftS <= 30);

    // Wind banner
    if (sim.wind.warning) {
      windBannerEl.textContent = 'Gió mạnh sắp tới!';
      windBannerEl.classList.remove('hidden');
    } else if (sim.wind.active) {
      windBannerEl.textContent = 'Gió mạnh đang thổi!';
      windBannerEl.classList.remove('hidden');
    } else {
      windBannerEl.classList.add('hidden');
    }

    const litCount = sim.lanterns.filter((l) => l.lit).length;
    lanternsEl.textContent = `${litCount}/${sim.lanterns.length}`;
    scoreEl.textContent = String(sim.score);
    totalScoreEl.textContent = String(totalScore);

    // 10-slot mote bar
    moteBarSlots.forEach((slot, idx) => {
      slot.classList.toggle('filled', idx < sim.player.carried);
    });
    moteCaptionEl.textContent = `Đom đóm ${sim.player.carried}/${sim.tuning.carry_capacity}`;

    // Charm, Dash, Pulse
    if (sim.player.charmTicks > 0) {
      charmChipEl.textContent = `Bùa Gió: ${(sim.player.charmTicks * SIM_DT).toFixed(1)}s`;
      charmChipEl.classList.remove('hidden');
    } else {
      charmChipEl.classList.add('hidden');
    }

    if (sim.player.charmTicks > 0 || sim.player.dashCdTicks === 0) {
      dashChipEl.textContent = 'Lướt (Shift): Sẵn sàng';
      dashChipEl.classList.add('ready');
    } else {
      dashChipEl.textContent = `Lướt (Shift): ${(sim.player.dashCdTicks * SIM_DT).toFixed(1)}s`;
      dashChipEl.classList.remove('ready');
    }

    if (sim.player.pulseCdTicks > 0) {
      pulseChipEl.textContent = `Tỏa Sáng (Q): ${(sim.player.pulseCdTicks * SIM_DT).toFixed(1)}s`;
      pulseChipEl.classList.remove('ready');
    } else if (sim.player.carried >= sim.tuning.pulse_cost) {
      pulseChipEl.textContent = 'Tỏa Sáng (Q): Sẵn sàng';
      pulseChipEl.classList.add('ready');
    } else {
      pulseChipEl.textContent = `Tỏa Sáng (Q): Cần ${sim.tuning.pulse_cost}`;
      pulseChipEl.classList.remove('ready');
    }

    // Interact prompt
    const nearestInteract = findNearestInteractableLantern(sim);
    if (nearestInteract && sim.state === 'playing') {
      promptEl.textContent = `E — Nạp ánh sáng (${nearestInteract.deposited}/${sim.tuning.lantern_cost})`;
      promptEl.classList.remove('hidden');
    } else {
      promptEl.classList.add('hidden');
    }

    // Off-screen arrow to nearest unlit lantern
    if (sim.state === 'playing' && camera) {
      let nearestUnlit = null;
      let bestDist = Infinity;
      for (const l of sim.lanterns) {
        if (l.lit) continue;
        const d = dist3D(sim.player.pos, l.pos);
        if (d < bestDist) {
          bestDist = d;
          nearestUnlit = l;
        }
      }
      if (nearestUnlit) {
        projVec.set(nearestUnlit.pos[0], nearestUnlit.pos[1] + 2.2, nearestUnlit.pos[2]);
        projVec.project(camera);
        const behind = projVec.z > 1;
        const offScreen =
          behind || Math.abs(projVec.x) > 0.92 || Math.abs(projVec.y) > 0.92;
        if (offScreen) {
          let nx = behind ? -projVec.x : projVec.x;
          let ny = behind ? -projVec.y : projVec.y;
          const mag = Math.hypot(nx, ny) || 1;
          nx /= mag;
          ny /= mag;
          const cx = window.innerWidth * 0.5 + nx * (window.innerWidth * 0.42);
          const cy = window.innerHeight * 0.5 - ny * (window.innerHeight * 0.40);
          const angleDeg = (Math.atan2(nx, ny) * 180) / Math.PI;
          arrowEl.style.left = `${cx}px`;
          arrowEl.style.top = `${cy}px`;
          arrowEl.style.transform = `translate(-50%, -50%) rotate(${angleDeg}deg)`;
          arrowEl.classList.remove('hidden');
        } else {
          arrowEl.classList.add('hidden');
        }
      } else {
        arrowEl.classList.add('hidden');
      }
    } else {
      arrowEl.classList.add('hidden');
    }
  }

  return {
    setScreen,
    showIntro,
    showSettings,
    hideSettings,
    setLightModeLabel,
    triggerHitFlash,
    showResult,
    update
  };
}
