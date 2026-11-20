import { findNearestInteractableLantern } from '../../sim/index.js';

function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  const min = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(min).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
}

/**
 * Low-chrome DOM HUD overlay driven purely by simulation state.
 */
export function createHud(root) {
  root.innerHTML = `
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
        <span class="hud-label">Thời gian</span>
        <span class="hud-value" data-hud="time">03:00</span>
      </div>
      <div class="hud-item">
        <span class="hud-label">Điểm</span>
        <span class="hud-value" data-hud="score">0</span>
      </div>
    </div>
    <div class="hud-prompt hidden" data-hud="prompt"></div>
    <div class="hud-controls">
      WASD đi · Kéo chuột / ← → xoay · Space nhảy · E nạp sáng
    </div>
  `;

  const carriedEl = root.querySelector('[data-hud="carried"]');
  const lanternsEl = root.querySelector('[data-hud="lanterns"]');
  const flamesEl = root.querySelector('[data-hud="flames"]');
  const timeEl = root.querySelector('[data-hud="time"]');
  const scoreEl = root.querySelector('[data-hud="score"]');
  const promptEl = root.querySelector('[data-hud="prompt"]');

  return {
    update(sim) {
      carriedEl.textContent = `${sim.player.carried}/${sim.tuning.carry_capacity}`;
      const litCount = sim.lanterns.filter((l) => l.lit).length;
      lanternsEl.textContent = `${litCount}/${sim.lanterns.length}`;
      flamesEl.textContent = String(sim.player.flames);
      timeEl.textContent = formatTime(sim.timeLeftS);
      scoreEl.textContent = String(sim.score);

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
    }
  };
}
