import * as THREE from 'three';
import {
  SIM_DT,
  dist3D,
  findNearestInteractableLantern,
  isValidLeaderboardName
} from '../../sim/index.js';
import { DEFAULT_KEY_BINDINGS } from '../settings.js';

function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  const min = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(min).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

const ACTION_LABELS = {
  up: 'Tiến',
  down: 'Lùi',
  left: 'Trái',
  right: 'Phải',
  jump: 'Nhảy',
  dash: 'Lướt',
  interact: 'Nạp/Châm',
  pulse: 'Tỏa Sáng',
  pause: 'Tạm dừng'
};

export function createHud(root, callbacks) {
  root.innerHTML = `
    <div class="hit-flash" data-hud="hit-flash"></div>
    <div class="offscreen-arrow hidden" data-hud="lantern-arrow" title="Đèn cần giữ sáng gần nhất">▲</div>
    <div class="shade-arrow hidden" data-hud="shade-arrow" title="Bóng Mực vừa xuất hiện">▼</div>

    <!-- Playing HUD -->
    <div class="hud-playing hidden" data-screen="playing">
      <div class="hud-top-left" data-hud="flames"></div>

      <div class="hud-top-center">
        <div class="hud-timer" data-hud="time">04:00</div>
        <div class="hud-wind hidden" data-hud="wind-banner">Gió mạnh sắp tới!</div>
        <div class="hud-subtitle-banner hidden" data-hud="subtitle-banner"></div>
      </div>

      <div class="hud-top-right">
        <div class="hud-stat">
          <span class="hud-label">Giữ sáng</span>
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
        WASD đi · Kéo chuột / ← → xoay · Space nhảy · Shift lướt · E nạp/châm · Q tỏa sáng · Esc/P tạm dừng
      </div>
    </div>

    <!-- Main Menu -->
    <div class="modal-overlay" data-screen="menu">
      <div class="modal-card">
        <h1 class="modal-title">Đảo Đèn Lồng</h1>
        <p class="modal-subtitle">Giữ đủ đèn sáng tới bình minh trên cả ba hòn đảo.</p>
        <div class="modal-actions">
          <button type="button" class="primary-btn" data-action="start-game">Bắt đầu hành trình</button>
          <button type="button" class="secondary-btn" data-action="open-leaderboard">Bảng xếp hạng</button>
          <button type="button" class="secondary-btn" data-action="open-settings">Cài đặt</button>
        </div>
      </div>
    </div>

    <!-- Leaderboard Modal -->
    <div class="modal-overlay hidden" data-screen="leaderboard">
      <div class="modal-card">
        <h2 class="modal-title">Bảng xếp hạng (Top 10)</h2>
        <table class="lb-table">
          <thead>
            <tr><th>#</th><th>Tên</th><th>Điểm</th><th>Đêm</th></tr>
          </thead>
          <tbody data-hud="lb-body"></tbody>
        </table>
        <div class="modal-actions">
          <button type="button" class="primary-btn" data-action="close-leaderboard">Đóng</button>
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
        <h2 class="modal-title">Cài đặt & Tiếp cận</h2>
        <div class="settings-list">
          <label class="setting-row">
            <span>Âm lượng: <strong data-hud="vol-val">70%</strong></span>
            <input type="range" min="0" max="100" value="70" data-input="volume" />
          </label>
          <label class="setting-row">
            <span>Độ nhạy chuột: <strong data-hud="sens-val">1.0x</strong></span>
            <input type="range" min="30" max="250" value="100" data-input="sensitivity" />
          </label>
          <label class="setting-row setting-toggle">
            <input type="checkbox" data-input="accessible-palette" />
            <span>Bảng màu dễ phân biệt</span>
          </label>
          <label class="setting-row setting-toggle">
            <input type="checkbox" data-input="reduce-motion" />
            <span>Giảm chuyển động</span>
          </label>
          <label class="setting-row setting-toggle">
            <input type="checkbox" data-input="large-text" />
            <span>Chữ lớn (×1.25)</span>
          </label>
          <div class="setting-row">
            <span>Đổi phím điều khiển:</span>
            <div class="keybinds-grid" data-hud="keybinds-grid"></div>
            <div class="form-error hidden" data-hud="keybind-error"></div>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="secondary-btn" data-action="reset-keybinds">Khôi phục mặc định</button>
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
        <div class="lb-save-container hidden" data-hud="lb-save-box">
          <div class="lb-save-row">
            <input type="text" maxlength="12" placeholder="Tên (3-12 ký tự)" class="lb-input" data-input="player-name" />
            <button type="button" class="primary-btn" data-action="save-score">Lưu điểm</button>
          </div>
          <div class="form-error hidden" data-hud="lb-error"></div>
          <div class="form-ok hidden" data-hud="lb-ok"></div>
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
    leaderboard: root.querySelector('[data-screen="leaderboard"]'),
    intro: root.querySelector('[data-screen="intro"]'),
    paused: root.querySelector('[data-screen="paused"]'),
    settings: root.querySelector('[data-screen="settings"]'),
    result: root.querySelector('[data-screen="result"]')
  };

  const flamesEl = root.querySelector('[data-hud="flames"]');
  const timeEl = root.querySelector('[data-hud="time"]');
  const windBannerEl = root.querySelector('[data-hud="wind-banner"]');
  const subtitleBannerEl = root.querySelector('[data-hud="subtitle-banner"]');
  const lanternsEl = root.querySelector('[data-hud="lanterns"]');
  const scoreEl = root.querySelector('[data-hud="score"]');
  const totalScoreEl = root.querySelector('[data-hud="total-score"]');
  const promptEl = root.querySelector('[data-hud="prompt"]');
  const moteBarEl = root.querySelector('[data-hud="mote-bar"]');
  let moteBarSlots = root.querySelectorAll('[data-hud="mote-bar"] .mote-slot');
  let renderedCapacity = 10;
  const moteCaptionEl = root.querySelector('[data-hud="mote-caption"]');
  const charmChipEl = root.querySelector('[data-hud="charm-chip"]');
  const dashChipEl = root.querySelector('[data-hud="dash-chip"]');
  const pulseChipEl = root.querySelector('[data-hud="pulse-chip"]');
  const arrowEl = root.querySelector('[data-hud="lantern-arrow"]');
  const shadeArrowEl = root.querySelector('[data-hud="shade-arrow"]');
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

  const lbBody = root.querySelector('[data-hud="lb-body"]');
  const lbSaveBox = root.querySelector('[data-hud="lb-save-box"]');
  const playerNameInput = root.querySelector('[data-input="player-name"]');
  const saveScoreBtn = root.querySelector('[data-action="save-score"]');
  const lbErrorEl = root.querySelector('[data-hud="lb-error"]');
  const lbOkEl = root.querySelector('[data-hud="lb-ok"]');

  const volInput = root.querySelector('[data-input="volume"]');
  const volVal = root.querySelector('[data-hud="vol-val"]');
  const sensInput = root.querySelector('[data-input="sensitivity"]');
  const sensVal = root.querySelector('[data-hud="sens-val"]');
  const accessibleInput = root.querySelector('[data-input="accessible-palette"]');
  const reduceMotionInput = root.querySelector('[data-input="reduce-motion"]');
  const largeTextInput = root.querySelector('[data-input="large-text"]');
  const keybindsGrid = root.querySelector('[data-hud="keybinds-grid"]');
  const keybindErrorEl = root.querySelector('[data-hud="keybind-error"]');

  let listeningAction = null;
  let currentBindings = { ...DEFAULT_KEY_BINDINGS };
  let subtitleTimer = 0;
  let shadeAlertTarget = null;
  let shadeAlertTimer = 0;

  function renderKeybinds() {
    keybindsGrid.innerHTML = Object.entries(ACTION_LABELS)
      .map(([action, label]) => {
        const code = currentBindings[action] || DEFAULT_KEY_BINDINGS[action];
        const isListening = listeningAction === action;
        return `<button type="button" class="keybind-btn ${isListening ? 'listening' : ''}" data-bind-action="${action}">
          <span>${label}</span><strong>${isListening ? 'Nhấn phím...' : code}</strong>
        </button>`;
      })
      .join('');

    keybindsGrid.querySelectorAll('[data-bind-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        listeningAction = btn.getAttribute('data-bind-action');
        keybindErrorEl.classList.add('hidden');
        renderKeybinds();
      });
    });
  }

  window.addEventListener('keydown', (e) => {
    if (!listeningAction) return;
    e.preventDefault();
    e.stopPropagation();
    const code = e.code;
    const conflict = Object.entries(currentBindings).find(
      ([act, bound]) => act !== listeningAction && bound === code
    );
    if (conflict) {
      keybindErrorEl.textContent = `⚠ Phím ${code} đã dùng cho "${ACTION_LABELS[conflict[0]]}"!`;
      keybindErrorEl.classList.remove('hidden');
      listeningAction = null;
      renderKeybinds();
      return;
    }
    currentBindings[listeningAction] = code;
    listeningAction = null;
    keybindErrorEl.classList.add('hidden');
    callbacks.onChangeKeyBindings({ ...currentBindings });
    renderKeybinds();
  });

  root.querySelector('[data-action="start-game"]').addEventListener('click', callbacks.onStartGame);
  root.querySelector('[data-action="begin-night"]').addEventListener('click', callbacks.onBeginNight);
  root.querySelector('[data-action="resume"]').addEventListener('click', callbacks.onResume);
  root.querySelectorAll('[data-action="replay-night"]').forEach((btn) =>
    btn.addEventListener('click', callbacks.onReplayNight)
  );
  root.querySelectorAll('[data-action="open-settings"]').forEach((btn) =>
    btn.addEventListener('click', callbacks.onOpenSettings)
  );
  root.querySelector('[data-action="close-settings"]').addEventListener('click', () => {
    listeningAction = null;
    callbacks.onCloseSettings();
  });
  root.querySelector('[data-action="reset-keybinds"]').addEventListener('click', () => {
    currentBindings = { ...DEFAULT_KEY_BINDINGS };
    listeningAction = null;
    keybindErrorEl.classList.add('hidden');
    callbacks.onChangeKeyBindings({ ...currentBindings });
    renderKeybinds();
  });
  root.querySelector('[data-action="open-leaderboard"]').addEventListener('click', callbacks.onOpenLeaderboard);
  root.querySelector('[data-action="close-leaderboard"]').addEventListener('click', () => setScreen('menu'));
  root.querySelectorAll('[data-action="to-menu"]').forEach((btn) =>
    btn.addEventListener('click', callbacks.onToMenu)
  );
  nextNightBtn.addEventListener('click', callbacks.onNextNight);
  lightModeBtn.addEventListener('click', callbacks.onToggleLightMode);
  root.querySelector('[data-hud="pause-btn"]').addEventListener('click', callbacks.onPause);

  saveScoreBtn.addEventListener('click', async () => {
    const rawName = playerNameInput.value.trim();
    if (!isValidLeaderboardName(rawName)) {
      lbErrorEl.textContent = 'Tên phải từ 3–12 ký tự (chữ, số, _).';
      lbErrorEl.classList.remove('hidden');
      return;
    }
    lbErrorEl.classList.add('hidden');
    saveScoreBtn.disabled = true;
    await callbacks.onSaveLeaderboard(rawName);
    lbOkEl.textContent = 'Đã lưu vào Bảng xếp hạng!';
    lbOkEl.classList.remove('hidden');
  });

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

  accessibleInput.addEventListener('change', () => {
    callbacks.onToggleAccessiblePalette(accessibleInput.checked);
  });
  reduceMotionInput.addEventListener('change', () => {
    callbacks.onToggleReduceMotion(reduceMotionInput.checked);
  });
  largeTextInput.addEventListener('change', () => {
    callbacks.onToggleLargeText(largeTextInput.checked);
  });

  let hitFlashTimer = 0;
  const projVec = new THREE.Vector3();

  function setScreen(name) {
    for (const [k, el] of Object.entries(screens)) {
      el.classList.toggle('hidden', k !== name);
    }
    if (name !== 'playing') {
      arrowEl.classList.add('hidden');
      shadeArrowEl.classList.add('hidden');
    }
  }

  function showLeaderboard(entries) {
    lbBody.innerHTML =
      entries.length === 0
        ? '<tr><td colspan="4">Chưa có kỷ lục nào.</td></tr>'
        : entries
            .map(
              (e, idx) =>
                `<tr><td>${idx + 1}</td><td>${e.name}</td><td class="gold">${e.score}</td><td>${e.nights_won}/3</td></tr>`
            )
            .join('');
    setScreen('leaderboard');
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
    accessibleInput.checked = Boolean(settings.accessiblePalette);
    reduceMotionInput.checked = Boolean(settings.reduceMotion);
    largeTextInput.checked = Boolean(settings.largeText);
    currentBindings = { ...DEFAULT_KEY_BINDINGS, ...(settings.keyBindings || {}) };
    keybindErrorEl.classList.add('hidden');
    renderKeybinds();
    screens.settings.classList.remove('hidden');
  }

  function hideSettings() {
    screens.settings.classList.add('hidden');
  }

  function setLightModeLabel(enabled) {
    lightModeBtn.textContent = enabled ? 'Nhẹ' : 'Chuẩn';
  }

  function setAccessiblePalette(enabled) {
    root.classList.toggle('accessible-palette', enabled);
  }

  function setReduceMotion(enabled) {
    root.classList.toggle('reduce-motion', enabled);
  }

  function setLargeText(enabled) {
    root.classList.toggle('large-text', enabled);
  }

  function triggerHitFlash() {
    if (root.classList.contains('reduce-motion')) return;
    hitFlashTimer = 0.25;
    hitFlashEl.classList.add('active');
  }

  function triggerShadeSpawnedAlert(shadePos) {
    subtitleBannerEl.textContent = '⚠ Bóng Mực vừa xuất hiện!';
    subtitleBannerEl.classList.add('danger');
    subtitleBannerEl.classList.remove('hidden');
    subtitleTimer = 3.5;
    shadeAlertTarget = shadePos ? [...shadePos] : null;
    shadeAlertTimer = 4.0;
  }

  function showResult(sim, totalScore) {
    const litCount = sim.lanterns.filter((l) => l.lit).length;
    const isWon = sim.state === 'won';
    if (isWon && sim.night === 3) {
      endTitleEl.textContent = 'Bình Minh Rạng Rỡ!';
      endReasonEl.textContent = 'Mây đã giữ đủ đèn sáng tới bình minh trên cả ba hòn đảo.';
      nextNightBtn.classList.add('hidden');
    } else if (isWon) {
      endTitleEl.textContent = `Hoàn thành Đêm ${sim.night}`;
      endReasonEl.textContent = `Mây đã giữ đủ đèn trên ${sim.map.name} sáng tới bình minh.`;
      nextNightBtn.classList.remove('hidden');
    } else {
      endTitleEl.textContent = `Thất bại ở Đêm ${sim.night}`;
      endReasonEl.textContent =
        sim.endReason === 'no_flames'
          ? 'Mây đã tắt hết Ngọn Lửa.'
          : 'Bình minh đã tới nhưng số đèn còn sáng chưa đủ.';
      nextNightBtn.classList.add('hidden');
    }
    endScoreEl.textContent = String(sim.score);
    endTotalEl.textContent = String(totalScore);
    endLanternsEl.textContent = `${litCount}/${sim.lanterns.length}`;
    endFlamesEl.textContent = String(sim.player.flames);

    const canSave = !isWon || sim.night === 3;
    lbSaveBox.classList.toggle('hidden', !canSave);
    saveScoreBtn.disabled = false;
    lbErrorEl.classList.add('hidden');
    lbOkEl.classList.add('hidden');

    setScreen('result');
  }

  function updateEdgeArrow(el, targetPos, camera, yOffset = 1.6, rotateOffset = 0) {
    projVec.set(targetPos[0], targetPos[1] + yOffset, targetPos[2]);
    projVec.project(camera);
    const behind = projVec.z > 1;
    const offScreen = behind || Math.abs(projVec.x) > 0.92 || Math.abs(projVec.y) > 0.92;
    if (offScreen) {
      let nx = behind ? -projVec.x : projVec.x;
      let ny = behind ? -projVec.y : projVec.y;
      const mag = Math.hypot(nx, ny) || 1;
      nx /= mag;
      ny /= mag;
      const cx = window.innerWidth * 0.5 + nx * (window.innerWidth * 0.42);
      const cy = window.innerHeight * 0.5 - ny * (window.innerHeight * 0.40);
      const angleDeg = (Math.atan2(nx, ny) * 180) / Math.PI + rotateOffset;
      el.style.left = `${cx}px`;
      el.style.top = `${cy}px`;
      el.style.transform = `translate(-50%, -50%) rotate(${angleDeg}deg)`;
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  }

  function update(sim, totalScore, camera, dt = 0) {
    if (hitFlashTimer > 0) {
      hitFlashTimer = Math.max(0, hitFlashTimer - dt);
      if (hitFlashTimer === 0) hitFlashEl.classList.remove('active');
    }
    if (subtitleTimer > 0) {
      subtitleTimer = Math.max(0, subtitleTimer - dt);
      if (subtitleTimer === 0) subtitleBannerEl.classList.add('hidden');
    }
    if (shadeAlertTimer > 0) {
      shadeAlertTimer = Math.max(0, shadeAlertTimer - dt);
      if (shadeAlertTimer === 0) shadeAlertTarget = null;
    }

    // Flames
    const maxFlames = sim.tuning.flames;
    flamesEl.innerHTML = Array.from({ length: maxFlames }, (_, i) => {
      const lit = i < sim.player.flames;
      return `<span class="flame-pip ${lit ? 'lit' : 'out'}">🔥</span>`;
    }).join('');

    // Timer
    const dangerPrefix =
      (root.classList.contains('accessible-palette') || sim.timeLeftS <= 10) && sim.timeLeftS <= 30
        ? '⚠ '
        : '';
    timeEl.textContent = `${dangerPrefix}${formatTime(sim.timeLeftS)}`;
    timeEl.classList.toggle('danger', sim.timeLeftS <= 30);

    // Wind & low-fuel visual indicators
    const lowFuelLanterns = sim.lanterns.filter(
      (l) => l.lit && l.fuelUnits < sim.tuning.low_fuel_threshold * 60
    );
    if (sim.wind.warning) {
      windBannerEl.textContent = '⚠ Gió mạnh sắp tới!';
      windBannerEl.classList.remove('hidden');
    } else if (sim.wind.active) {
      windBannerEl.textContent = '⚠ Gió mạnh đang thổi!';
      windBannerEl.classList.remove('hidden');
    } else if (lowFuelLanterns.length > 0) {
      windBannerEl.textContent = `⚠ Đèn ${lowFuelLanterns.map((l) => l.id).join(', ')} sắp cạn dầu!`;
      windBannerEl.classList.remove('hidden');
    } else if (sim.timeLeftS <= 10 && sim.state === 'playing') {
      windBannerEl.textContent = `⚠ Còn ${Math.ceil(sim.timeLeftS)} giây tới bình minh!`;
      windBannerEl.classList.remove('hidden');
    } else {
      windBannerEl.classList.add('hidden');
    }

    const litCount = sim.lanterns.filter((l) => l.lit).length;
    const targetCount = Math.ceil(sim.tuning.win_ratio * sim.lanterns.length);
    lanternsEl.textContent = `${litCount}/${targetCount}`;
    scoreEl.textContent = String(sim.score);
    totalScoreEl.textContent = String(totalScore);

    // Dynamic capacity mote bar
    const cap = sim.player.capacity ?? sim.tuning.carry_capacity;
    if (cap !== renderedCapacity) {
      renderedCapacity = cap;
      moteBarEl.innerHTML = Array.from({ length: cap }, () => '<span class="mote-slot"></span>').join('');
      moteBarSlots = moteBarEl.querySelectorAll('.mote-slot');
    }
    moteBarSlots.forEach((slot, idx) => {
      slot.classList.toggle('filled', idx < sim.player.carried);
    });
    moteCaptionEl.textContent = `Đom đóm ${sim.player.carried}/${cap}`;

    // Charm, Dash, Pulse
    if (sim.player.charmTicks > 0) {
      charmChipEl.textContent = `Bùa Gió: ${(sim.player.charmTicks * SIM_DT).toFixed(1)}s`;
      charmChipEl.classList.remove('hidden');
    } else {
      charmChipEl.classList.add('hidden');
    }

    if (sim.player.charmTicks > 0 || sim.player.dashCdTicks === 0) {
      dashChipEl.textContent = 'Lướt: Sẵn sàng';
      dashChipEl.classList.add('ready');
    } else {
      dashChipEl.textContent = `Lướt: ${(sim.player.dashCdTicks * SIM_DT).toFixed(1)}s`;
      dashChipEl.classList.remove('ready');
    }

    if (sim.player.pulseCdTicks > 0) {
      pulseChipEl.textContent = `Tỏa Sáng: ${(sim.player.pulseCdTicks * SIM_DT).toFixed(1)}s`;
      pulseChipEl.classList.remove('ready');
    } else if (sim.player.carried >= sim.tuning.pulse_cost) {
      pulseChipEl.textContent = 'Tỏa Sáng: Sẵn sàng';
      pulseChipEl.classList.add('ready');
    } else {
      pulseChipEl.textContent = `Tỏa Sáng: Cần ${sim.tuning.pulse_cost}`;
      pulseChipEl.classList.remove('ready');
    }

    // Interact prompt
    const nearestInteract = findNearestInteractableLantern(sim);
    if (nearestInteract && sim.state === 'playing') {
      if (nearestInteract.lit) {
        const fuelRounded = Math.round(nearestInteract.fuelUnits / 60);
        promptEl.textContent = `E — Châm dầu ${nearestInteract.id} (${fuelRounded}/${sim.tuning.fuel_max})`;
      } else if (nearestInteract.everLit) {
        promptEl.textContent = `E — Thắp lại ${nearestInteract.id} (${nearestInteract.deposited}/${sim.tuning.relight_cost})`;
      } else {
        promptEl.textContent = `E — Nạp sáng ${nearestInteract.id} (${nearestInteract.deposited}/${sim.tuning.lantern_cost})`;
      }
      promptEl.classList.remove('hidden');
    } else {
      promptEl.classList.add('hidden');
    }

    // Off-screen arrows
    if (sim.state === 'playing' && camera) {
      const targetLantern = findNearestInteractableLantern(sim) ||
        sim.lanterns
          .filter((l) => !l.lit || l.fuelUnits < sim.tuning.low_fuel_threshold * 60)
          .sort((a, b) => dist3D(sim.player.pos, a.pos) - dist3D(sim.player.pos, b.pos))[0];
      if (targetLantern) {
        updateEdgeArrow(arrowEl, targetLantern.pos, camera, 2.2, 0);
      } else {
        arrowEl.classList.add('hidden');
      }

      if (shadeAlertTarget && shadeAlertTimer > 0) {
        updateEdgeArrow(shadeArrowEl, shadeAlertTarget, camera, 1.0, 180);
      } else {
        shadeArrowEl.classList.add('hidden');
      }
    } else {
      arrowEl.classList.add('hidden');
      shadeArrowEl.classList.add('hidden');
    }
  }

  return {
    setScreen,
    showLeaderboard,
    showIntro,
    showSettings,
    hideSettings,
    setLightModeLabel,
    setAccessiblePalette,
    setReduceMotion,
    setLargeText,
    triggerHitFlash,
    triggerShadeSpawnedAlert,
    showResult,
    update
  };
}
