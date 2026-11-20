# Credits & Ghi công

## Công nghệ & Thư viện
- **Three.js (`^0.174.0`)** — MIT License · Dựng cảnh 3D WebGL 2.
- **Vite (`^6.2.0`)** — MIT License · Bundler & preview server.
- **Node.js (`node:test`) & Python 3** — Chạy lõi mô phỏng headless, soak test, benchmark và harness kiểm chứng.

## Tài nguyên hình ảnh & Âm thanh
- **Đồ họa 3D low-poly**: Toàn bộ hình học nhân vật (Mây, Bóng Mực, Gió Lạc), đảo, cầu tre, tháp chuông, đèn lồng, cây và biển mây được tạo trực tiếp bằng hình học tham số Three.js trong `src/web/render/world.js` (không sử dụng asset ngoài).
- **Texture quầng sáng**: Tạo trực tiếp bằng HTML5 Canvas 2D radial gradient (`createSoftGlowTexture`).
- **Âm thanh & Nhạc nền**: Tổng hợp thời gian thực bằng Web Audio API trong `src/web/audio.js` (không dùng file âm thanh ngoài).

## Công cụ AI & Harness
- **Antigravity / Codex** — Hỗ trợ phân tích hợp đồng, sinh mã, viết test, tối ưu render và kiểm chứng trình duyệt.
- **Game Studio Skills** (`vendor/game-studio/`) — `three-webgl-game`, `game-ui-frontend`, `game-playtest`.
