import { sortAndCapLeaderboard } from '../sim/index.js';

const LB_STORAGE_KEY = 'dao-den-long-leaderboard';

function formatIsoWithOffset(date = new Date()) {
  const tzOffsetMin = -date.getTimezoneOffset();
  const sign = tzOffsetMin >= 0 ? '+' : '-';
  const absMin = Math.abs(tzOffsetMin);
  const hh = String(Math.floor(absMin / 60)).padStart(2, '0');
  const mm = String(absMin % 60).padStart(2, '0');
  const pad = (n) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}${sign}${hh}:${mm}`
  );
}

function readLocalLeaderboard() {
  try {
    const raw = window.localStorage.getItem(LB_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? sortAndCapLeaderboard(parsed) : [];
  } catch {
    return [];
  }
}

function writeLocalLeaderboard(entries) {
  try {
    window.localStorage.setItem(LB_STORAGE_KEY, JSON.stringify(sortAndCapLeaderboard(entries)));
  } catch {
    // ignore
  }
}

export async function fetchLeaderboard() {
  try {
    const res = await fetch('/api/leaderboard');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.entries)) {
        writeLocalLeaderboard(data.entries);
        return data.entries;
      }
    }
  } catch {
    // Fallback to localStorage when served by vite dev without run.js
  }
  return readLocalLeaderboard();
}

export async function submitLeaderboardScore({ name, score, nights_won, seed }) {
  const entry = {
    name: name.trim(),
    score: Math.max(0, Math.floor(score)),
    nights_won: Math.max(0, Math.min(3, nights_won)),
    achieved_at: formatIsoWithOffset(new Date()),
    seed
  };
  try {
    const res = await fetch('/api/leaderboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.entries)) {
        writeLocalLeaderboard(data.entries);
        return data.entries;
      }
    }
  } catch {
    // Fallback to localStorage
  }
  const updated = sortAndCapLeaderboard([...readLocalLeaderboard(), entry]);
  writeLocalLeaderboard(updated);
  return updated;
}
