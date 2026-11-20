import { findNearestInteractableLantern } from '../../sim/index.js';

function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  const min = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(min).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

const REASON_LABELS = {
  all_lit: 'Cả 5 Đèn Lồng Lớn đã tỏa sáng đẩy lùi sương đen.',
  no_flames: 'Mây đã tắt hết lửa trước khi thắp xong đảo.',
  dawn: 'Bình minh đã tới trước khi cả 5 đèn được thắp.'
};

/**
 * Low-chrome DOM HUD overlay + end screen driven purely by simulation state.
 */
export function createHud(root, { onToggleLightMode, onReplay }) {
  root.innerHTML = `
    <div class="hit-flash" data-hud="hit-flash"></div>
    <div class="hud-cluster" aria-live="polite">
      <div class="hud-item">
        <span class="hud-label">Đom đóm</span>
        <span class="hud-value" data-hud="carried">0/8</span>
      </div>
      <div class="hud-item">
        <span class="hud-label">Đèn</span>
        <span class="hud-value" data-hud="lanterns">0/5</span>
      </div>
      <div class="hud-item">
        <span class="hud-label">Lửa</span>
        <span class="hud-value" data-hud="flames">3</span>
      </div>
      <div class="hud-item">
        <span class="hud-label">Xung Q</span>
        <span class="hud-value muted" data-hud="pulse">Cần 2 sáng</span>
      </div>
      <div class="hud-item">
        <span class="hud-label">Thời gian</span>
        <span class="hud-value" data-hud="time">03:00</span>
      </div>
      <div class="hud-item">
        <span class="hud-label">Điểm</span>
        <span class="hud-value" data-hud="score">0</span>
      </div>
    </div>
    <div class="hud-actions">
      <button type="button" class="hud-btn" data-hud="light-mode-btn">Chế độ: Chuẩn</button>
    </div>
    <div class="hud-prompt hidden" data-hud="prompt"></div>
    <div class="hud-controls">
      WASD đi · Kéo chuột / ← → xoay · Space nhảy · E nạp sáng · Q xung sáng
    </div>
    <div class="end-overlay hidden" data-hud="end-overlay">
      <div class="end-card">
        <div class="end-title" data-hud="end-title">Hoàn thành Đêm 1</div>
        <div class="end-reason" data-hud="end-reason"></div>
        <div class="end-stats">
          <div>
            <div class="end-stat-label">Điểm cuối</div>
            <div class="end-stat-value" data-hud="end-score">0</div>
          </div>
          <div>
            <div class="end-stat-label">Đèn đã thắp</div>
            <div class="end-stat-value" data-hud="end-lanterns">0/5</div>
          </div>
          <div>
            <div class="end-stat-label">Lửa còn</div>
            <div class="end-stat-value" data-hud="end-flames">0</div>
          </div>
          <div>
            <div class="end-stat-label">Thời gian còn</div>
            <div class="end-stat-value" data-hud="end-time">00:00</div>
          </div>
        </div>
        <button type="button" class="end-replay-btn" data-hud="replay-btn">Chơi lại</button>
      </div>
    </div>
  `;

  const carriedEl = root.querySelector('[data-hud="carried"]');
  const lanternsEl = root.querySelector('[data-hud="lanterns"]');
  const flamesEl = root.querySelector('[data-hud="flames"]');
  const pulseEl = root.querySelector('[data-hud="pulse"]');
  const timeEl = root.querySelector('[data-hud="time"]');
  const scoreEl = root.querySelector('[data-hud="score"]');
  const promptEl = root.querySelector('[data-hud="prompt"]');
  const hitFlashEl = root.querySelector('[data-hud="hit-flash"]');
  const lightModeBtn = root.querySelector('[data-hud="light-mode-btn"]');
  const endOverlay = root.querySelector('[data-hud="end-overlay"]');
  const endTitleEl = root.querySelector('[data-hud="end-title"]');
  const endReasonEl = root.querySelector('[data-hud="end-reason"]');
  const endScoreEl = root.querySelector('[data-hud="end-score"]');
  const endLanternsEl = root.querySelector('[data-hud="end-lanterns"]');
  const endFlamesEl = root.querySelector('[data-hud="end-flames"]');
  const endTimeEl = root.querySelector('[data-hud="end-time"]');
  const replayBtn = root.querySelector('[data-hud="replay-btn"]');

  lightModeBtn.addEventListener('click', () => {
    if (onToggleLightMode) onToggleLightMode();
  });
  replayBtn.addEventListener('click', () => {
    if (onReplay) onReplay();
  });

  let hitFlashTimer = 0;

  return {
    setLightModeLabel(enabled) {
      lightModeBtn.textContent = enabled ? 'Chế độ: Nhẹ' : 'Chế độ: Chuẩn';
    },
    triggerHitFlash() {
      hitFlashTimer = 0.35;
      hitFlashEl.classList.add('active');
    },
    update(sim, dt = 0) {
      if (hitFlashTimer > 0) {
        hitFlashTimer = Math.max(0, hitFlashTimer - dt);
        if (hitFlashTimer === 0) hitFlashEl.classList.remove('active');
      }

      carriedEl.textContent = `${sim.player.carried}/${sim.tuning.carry_capacity}`;
      const litCount = sim.lanterns.filter((l) => l.lit).length;
      lanternsEl.textContent = `${litCount}/${sim.lanterns.length}`;
      flamesEl.textContent = String(sim.player.flames);
      timeEl.textContent = formatTime(sim.timeLeftS);
      scoreEl.textContent = String(sim.score);

      if (sim.player.pulseCooldown > 0) {
        pulseEl.textContent = `Hồi ${sim.player.pulseCooldown.toFixed(1)}s`;
        pulseEl.className = 'hud-value muted';
      } else if (sim.player.carried >= sim.tuning.pulse_cost) {
        pulseEl.textContent = 'Sẵn sàng';
        pulseEl.className = 'hud-value ready';
      } else {
        pulseEl.textContent = `Cần ${sim.tuning.pulse_cost} sáng`;
        pulseEl.className = 'hud-value muted';
      }

      const nearLantern = findNearestInteractableLantern(sim);
      if (nearLantern && sim.state === 'playing') {
        promptEl.classList.remove('hidden');
        if (sim.player.carried > 0) {
          promptEl.textContent = `E · Nạp sáng ${nearLantern.id} (${nearLantern.deposited}/${sim.tuning.lantern_cost})`;
        } else {
          promptEl.textContent = `${nearLantern.id} (${nearLantern.deposited}/${sim.tuning.lantern_cost}) · Nhặt thêm đom đóm`;
        }
      } else {
        promptEl.classList.add('hidden');
      }

      if (sim.state === 'won' || sim.state === 'lost') {
        endOverlay.classList.remove('hidden');
        endTitleEl.textContent =
          sim.state === 'won' ? 'Thắng! Đảo Bến đã rực sáng' : 'Thua! Đêm 1 kết thúc';
        endReasonEl.textContent = REASON_LABELS[sim.endReason] ?? sim.endReason;
        endScoreEl.textContent = String(sim.score);
        endLanternsEl.textContent = `${litCount}/${sim.lanterns.length}`;
        endFlamesEl.textContent = String(sim.player.flames);
        endTimeEl.textContent = formatTime(sim.timeLeftS);
      } else {
        endOverlay.classList.add('hidden');
      }
    }
  };
}
