# Nhật ký lab

## Phase 4 · Ticket-04 "Bình minh: phát hành v1.0.0" (Contract v1.3)

### 20/11/2026 · Kế hoạch và giả định Phase 4 (bắt đầu 17:53 ICT)

- **Mốc hồi quy**: Commit `30ac376` (`tag: phase-3`, `29/29` test đạt).
- **Phạm vi**: Nâng `game.contract.json` lên `1.3`, bổ sung `run_cmd` (`node scripts/run.js`), `bench_cmd` (`node scripts/bench.js`), `soak_cmd` (`node scripts/soak.js`), bảng xếp hạng cục bộ (top 10 + `--export-leaderboard`), 4 tính năng tiếp cận (đổi phím, chỉ báo hình ảnh, giảm chuyển động, cỡ chữ ≥ 18 px + chữ lớn ×1.25), đóng gói `v1.0.0`, `CREDITS.md`, `LICENSE`, retro 4 phase và video demo.
- **Giả định & quy ước**:
  - `bench.js` khởi chạy Chrome/Chromium có sẵn trên hệ thống với `--disable-gpu-vsync --window-size=1280,720`, mở bản build `dist/?bench=1&seed=...&duration=...` qua HTTP loopback và nhận kết quả đo qua `POST /api/bench-result`, không cần phụ thuộc ngoài.
  - `soak.js` dùng một tiến trình Node.js chạy xoay vòng Đêm `1 → 2 → 3` với seed `seed + i`, dùng một luồng RNG riêng cho input ngẫu nhiên (đổi hướng mỗi 30 tick; xác suất nhảy 5%, lướt 3%, Tỏa Sáng 2%, tương tác 10%).
  - Bảng xếp hạng lưu tại `data/leaderboard.json` (ghi nguyên tử qua tệp tạm rồi đổi tên), hỗ trợ tên `^[A-Za-z0-9_À-ỹ ]{3,12}$` (khớp `[A-Za-z0-9_]{3,12}` và tiếng Việt), giữ top 10 theo `score` giảm dần, hòa điểm xếp đạt sớm trước.

### 20/11/2026 · Nghiệm thu & Phát hành v1.0.0 (17:53–19:04 ICT)

- **Lệnh kiểm chứng & Kết quả**:
  - `npm test`: **Đạt (33/33 test)** ([phase4-bench-soak-leaderboard.test.js](tests/phase4-bench-soak-leaderboard.test.js) + toàn bộ test hồi quy Phase 1–3).
  - `npm run build`: **Đạt** (`dist/` build trong `3.20s`).
  - `node scripts/soak.js --seed 7 --nights 10 --out docs/proof/phase-4/soak.json`: **Đạt** (`nights = 10`, `crashes = 0`, `mem_start_mb = 91.55`, `mem_end_mb = 110.42`, `duration_s = 1.196`) → [soak.json](soak.json).
  - `node scripts/bench.js --seed 42 --duration 30 --out docs/proof/phase-4/bench.json` (Chrome `1280×720`, `Intel(R) UHD Graphics 620`, 200 Bóng Mực `wander` + 100 đom đóm, `L1`–`L3` sáng): **Đạt** (`avg_fps = 36.5`, `p1_low_fps = 10.8`, `frame_ms_p95 = 50 ms`, `frames = 1098`, `load_ms = 902`, `peak_mem_mb = 317`) → [bench.json](bench.json).
  - **Playtest Mốc C–D qua `node scripts/run.js` (`1280×720`, Chrome, 0 lỗi console)**:
    - Cỡ chữ mặc định `18px`, bật **Chữ lớn (×1.25)** tăng lên `22.5px`; bật **Giảm chuyển động** và reload xác nhận `localStorage` lưu bền vững.
    - Đổi phím có báo trùng (`⚠ Phím KeyE đã dùng cho "Nạp/Châm"!`) và **Khôi phục mặc định** trả về `Space`.
    - Chỉ báo Bóng Mực xuất hiện (`⚠ Bóng Mực vừa xuất hiện!` + mũi tên `shade-arrow`), lưu điểm `"Dung_01"` lên Top 10 và kiểm chứng `node scripts/run.js --export-leaderboard /tmp/lb-export.json` khớp 100%.
    - Ảnh chụp & video: [01-menu-large-text.png](docs/proof/phase-4/01-menu-large-text.png), [02-shade-spawn-indicator.png](docs/proof/phase-4/02-shade-spawn-indicator.png), [03-leaderboard-top10.png](docs/proof/phase-4/03-leaderboard-top10.png), [demo.mp4](docs/demo/demo.mp4).
- **Đóng gói & Tài liệu**: Đã tạo [LICENSE](LICENSE), [CREDITS.md](CREDITS.md), [CHANGELOG.md](CHANGELOG.md), [docs/retro-4-phases.md](docs/retro-4-phases.md), cập nhật [README.md](README.md) và đóng gói `dao-den-long-web-v1.0.0.zip` (kiểm tra giải nén sạch ở `/tmp/clean-release-test`).

---

## Phase 3 · Ticket-03 "Đèn cạn dầu" (Contract v1.2)

### 20/11/2026 · Mốc A–B bắt đầu 17:23 ICT

- **Mốc bàn giao trước** — Phase 2 đã chốt tại commit `7412f1e`, annotated tag `phase-2` đã push lên GitHub. Test cuối Phase 2 đạt 19/19.
- **Phạm vi phiên này** — Nâng contract lên v1.2; thêm nhiên liệu số nguyên theo đơn vị `1/60`, hao dầu, châm dầu, tắt/thắp lại, `ever_lit`, `relit_count`, sức chứa động và công thức điểm mới. Giữ mô phỏng 60 tick/s dùng chung cho Node và web.
- **Quy ước** — `fuelUnits = fuel × 60`, tối đa `6000`. Mỗi tick đèn sáng mất 1 unit. Scenario `lit: true` không ghi `fuel` mặc định 100 và `ever_lit: true`; đèn tắt mặc định 0. `successful_lights` chỉ tăng do tương tác trong đêm, kể cả thắp lại.
- **Tiêu chí nghiệm thu Mốc A–B** — Snapshot tick 0 có `fuel`, `ever_lit`, `relit_count`, `player.capacity`; validation chấp nhận override v1.2 và loại dữ liệu sai; test biên hao dầu, châm thiếu dưới 10 fuel, bỏ qua đèn đầy, tắt đúng một lần, thắp lại giá 5, capacity 10→12 và trần 20; `npm test` và `npm run build` đạt.
- **Hồi quy có chủ đích** — Các assertion Phase 2 về thắng ngay `all_lit`, thời lượng đêm, điểm nạp và `carry_capacity` phải được thay bằng luật Ticket-03, không skip. Các test di chuyển, lướt, rơi, map, gió, pause và mã thoát CLI phải tiếp tục đạt.
- **Kết quả bắt đầu Phase 3 lúc 17:29 ICT** — Đã nâng `game.contract.json` lên v1.2 và triển khai lõi Mốc A–B: fuel fixed-point, hao/châm dầu, `lantern_out`, thắp lại, capacity động, trạng thái `drain`, điểm xung khi drain và xét `dawn_survived`. Thêm [ADR 0001](docs/adr/0001-lantern-fuel-and-dawn.md) và [CHANGELOG](CHANGELOG.md).
- **Kiểm chứng** — `npm test` đạt **25/25**; `npm run build` đạt trong `2.99s`; CLI tick 0 trả snapshot v1.2 có `capacity`, `fuel`, `ever_lit`, `relit_count` và dòng `end`. Hai test Phase 2 bị luật mới thay thế đã đổi assertion kèm chú thích, không skip.

### 20/11/2026 · Hoàn thiện Mốc C–D & Nghiệm thu Phase 3 (17:45–17:51 ICT)

- **Lệnh kiểm chứng & Kết quả**:
  - `npm test`: **Đạt (29/29 test)** ([sim-phase3-fuel.test.js](tests/sim-phase3-fuel.test.js), [sim-m1-m2.test.js](tests/sim-m1-m2.test.js), [sim-m3-night1.test.js](tests/sim-m3-night1.test.js), [sim-phase2-mechanics.test.js](tests/sim-phase2-mechanics.test.js), [web-input.test.js](tests/web-input.test.js)).
  - `npm run build`: **Đạt** (`dist/` build trong `3.99s`).
  - `scripts/verify-headless.py` (tất định 2 lần chạy giống hệt từng byte cho cả 6 kịch bản v1.2):
    - [lantern-lifecycle.jsonl](docs/proof/phase-3/lantern-lifecycle.jsonl)
    - [multi-drain.jsonl](docs/proof/phase-3/multi-drain.jsonl)
    - [refuel-safe-zone.jsonl](docs/proof/phase-3/refuel-safe-zone.jsonl)
    - [night1-dawn-win.jsonl](docs/proof/phase-3/night1-dawn-win.jsonl)
    - [night2-dawn-win.jsonl](docs/proof/phase-3/night2-dawn-win.jsonl)
    - [night3-dawn-win.jsonl](docs/proof/phase-3/night3-dawn-win.jsonl)
  - **Playtest & Hiệu năng trình duyệt 1280×720 (Chrome 157, WebGL 2, Chế độ Chuẩn `lightMode=false`, 0 lỗi console)**:
    - Xác nhận HUD sức chứa động (`0/10`), mục tiêu bình minh (`GIỮ SÁNG 0/3` Đêm 1, `0/5` Đêm 3), gợi ý `E — Nạp sáng L1 (0/10)`, cài đặt **Bảng màu dễ phân biệt** (`accessiblePalette: true` lưu bền vững qua reload trong `localStorage`), Bóng Mực `#00B3FF` và cảnh báo `⚠`.
    - Kết quả đo Đêm 3 (`samples = 2555`, `durationSec = 46 s`, `36` draw calls, `10710` triangles): **`55.6 FPS` trung bình**, **`p95 = 33.3 ms`** (`>= 30 FPS`).
    - Ảnh chụp bằng chứng: [01-night1-unlit-prompt.png](docs/proof/phase-3/01-night1-unlit-prompt.png), [02-accessible-palette-shade.png](docs/proof/phase-3/02-accessible-palette-shade.png), [03-night1-accessible-hud.png](docs/proof/phase-3/03-night1-accessible-hud.png), [04-night3-wind-perf.png](docs/proof/phase-3/04-night3-wind-perf.png).
- **Tài liệu**: Đã cập nhật [README.md](README.md), [CHANGELOG.md](CHANGELOG.md), [ADR 0001](docs/adr/0001-lantern-fuel-and-dawn.md) và `WORKLOG.md`.

## Nâng cấp mỹ thuật WebGL

### 20/11/2026 · Nhân vật và quần thể đảo (bắt đầu 17:08 ICT)

- **Phạm vi** — Chỉ thay đổi lớp hiển thị Three.js. Giữ nguyên mô phỏng, va chạm, tọa độ contract, camera, HUD và cách tính điểm.
- **Hướng mỹ thuật** — Low-poly truyện cổ tích Việt Nam, silhouette rõ. Làm lại Mây, Bóng Mực và Gió Lạc; thêm tầng đất-đá cho đảo, cỏ, đá, cây có biến thể, biển mây bao quanh và ánh sáng vàng ấm từ đèn.
- **Ngân sách hiệu năng** — Không thêm texture ngoài hay post-processing. Dùng geometry low-poly, material dùng chung và `InstancedMesh` cho cỏ, đá, tán cây và mây; chỉ vật thể chính đổ bóng. Chế độ Nhẹ tắt bóng và chi tiết phụ.
- **Tiêu chí nghiệm thu** — Ba đêm vẫn khớp map gameplay; nhân vật, cây/cỏ/đá, đảo, mây và ánh đèn đều nhìn rõ từ camera chơi; không có lỗi console/WebGL; `npm test` và `npm run build` đạt; bản Chuẩn 1280×720 giữ tối thiểu 30 FPS trên máy mục tiêu.
- **Cách xác minh** — Chạy test/build hồi quy, playtest Chrome từng đêm, kiểm tra console, chụp ảnh so sánh và đo FPS sau thời gian ổn định. Ghi lại lệnh, số đo và bằng chứng khi hoàn tất.
- **Hoàn thành lúc 17:18 ICT** — Mây có thêm tay/chân, tóc, mắt, vành nón, khăn bay và đèn cầm tay; Bóng Mực có đầu, sừng, tua và mắt; Gió Lạc có thân vải, mặt nạ và mắt sáng. Đèn lồng có bệ, khung, mái và quả chóp rõ hình.
- **Môi trường** — Đảo có ba lớp cỏ/đất/đá thu nhỏ dần xuống dưới, viền cát, cỏ và đá rải theo seed; cây chuyển sang tán low-poly hai cụm; 120 khối cầu instance ghép thành biển mây quanh đảo. Hai `PointLight` dùng lại cho các đèn đã sáng gần Mây, giữ chi phí cố định; Chế độ Nhẹ ẩn cỏ/đá phụ và tắt đèn động.
- **Hồi quy** — `npm test` đạt **19/19** khi chạy ngoài sandbox (ca CLI cần `spawnSync`); `npm run build` đạt trong `2.35s`. Vite còn cảnh báo chunk JS `583.00 kB`, không phải lỗi build.
- **Playtest và hiệu năng** — Chrome WebGL 2, `ANGLE (Intel, Mesa Intel UHD Graphics 620, OpenGL ES 3.2)`, 1280×720, bản Chuẩn, 0 lỗi console. Đêm 1–3 dùng `34–60` draw call, `3` texture và khoảng `10.5–11.0k` tam giác khi khởi tạo. Benchmark Đêm 3 trong `60.014s`, có `10` Bóng Mực, đạt **59.4 FPS** trung bình và **p95 16.8 ms** (`3563` mẫu).
- **Bằng chứng** — [Đêm 1](docs/proof/visual-upgrade/night-1.png), [Đêm 2](docs/proof/visual-upgrade/night-2.png), [Đêm 3](docs/proof/visual-upgrade/night-3.png) và [benchmark có Bóng Mực](docs/proof/visual-upgrade/night-3-perf.png).
- **AI và retro** — Lần chụp đầu phát hiện mặt cỏ trùng cao độ mặt đất gây z-fighting và mây dodecahedron trông giống đá nổi. Đã nâng mặt cỏ/viền cát và đổi mây thành cụm cầu bán trong suốt, sau đó chụp lại cả ba đêm. Token/chi phí không có số liệu từ harness.

## Phase 2 · Ticket-02 "Ba hòn đảo" (Contract v1.1)

### 20/11/2026 · Kế hoạch, giả định và tiêu chí nghiệm thu Phase 2

- **Giờ làm (ICT, UTC+7)** — Bắt đầu 16:18.
- **Mục tiêu** — Chuẩn hóa Đêm 1 theo Test Contract v1.1, bổ sung Đêm 2 (Đảo Cau) và Đêm 3 (Đảo Chuông), hoàn thiện cơ chế (lướt, rơi/hồi sinh, Bóng Mực `spawning/wander/chase/recoil/stunned`, Gió Lạc, Bùa Gió, gió mạnh, vùng an toàn đẩy dần, Tỏa Sáng 3D), nối chuỗi 3 Đêm trên web cùng HUD/menu/pause/cài đặt/âm thanh/bảng màu chuẩn.
- **Giả định & quy ước chốt (trước khi sửa mã)**:
  - **Pause & `tick` vs `sim_tick`**: Đọc input theo `tick` kể cả khi pause (`tick` tăng mỗi bước, `sim_tick` và mọi bộ đếm gameplay đứng yên khi pause). Nếu kết thúc CLI giữa lúc đang pause, `end.state` giữ thuộc bộ giá trị `{playing, won, lost}` (dùng `playing` nếu chưa thắng/thua), trong khi snapshot ghi `state: "paused"`. Lệnh `resumed` tiếp tục mô phỏng ngay trong bước đó.
  - **Snapshot tick 0 & `night_start`**: Ghi snapshot tick 0 sau khi dựng scenario; sự kiện `night_start {night}` phát tại tick 0 (hoặc bước đầu tiên) — cụ thể, để giữ đúng bất biến của `verify-headless.py` ("The first record must be the tick-0 snapshot"), `serializeSnapshot(sim)` là dòng đầu tiên tại tick 0, và `night_start` được ghi ngay sau snapshot tick 0 (cùng `tick: 0`) khi chạy headless hoặc khi bắt đầu đêm.
  - **Hậu tố `_s` & boolean**: `player.invuln` là boolean (`invulnTicks > 0`), các trường `dash_cd_s`, `pulse_cd_s`, `charm_s`, `ttl_s`, `respawn_s` xuất theo giây làm tròn 3 chữ số thập phân (`ticks / 60`). Với đom đóm thường (`kind: "random"`), `ttl_s` đặt là `null`.
  - **Gió Lạc (Drifter)**: Sinh tại các điểm sương (bộ điểm sinh Bóng Mực chuẩn của Đêm 2/3) theo `rng`, cách Mây nếu cần hoặc ngẫu nhiên trên tập điểm. Thực thể sinh ở bước hiện tại xuất hiện trong snapshot của bước đó và bắt đầu tương tác từ tick kế tiếp (`spawnedThisTick`).
  - **Rơi & hồi sinh**: Khi `player.pos[1] < -10` (mỗi lần rơi chỉ trừ 1 lửa, bỏ qua bất tử), nếu còn lửa thì vào trạng thái chờ `respawnTicks = 60` (vị trí giữ dưới -10 hoặc ẩn, không nhặt đom đóm/bùa, không bị chạm), hết 60 tick hồi sinh về điểm xuất phát với vận tốc 0 và `invulnTicks = 90`.
  - **Điểm chuẩn hóa v1.1**: `+10` mỗi đom đóm nạp vào đèn, `+100` mỗi đèn thắp, `+5` mỗi Bóng Mực trúng Tỏa Sáng (mỗi con mỗi lần, kể cả đang choáng), `+ floor(giây còn lại) * 2 + 50 * lửa còn` khi thắng.
  - **Tương thích ngược Phase 1**: Mốc hồi quy Phase 1 nằm ở commit `f3973e2`. Khi chuyển sang Contract v1.1, các hằng số Đêm 1 thay đổi theo Ticket-02 (`player_speed` 7→6, `carry_capacity` 8→10, `lantern_cost` 5→10, `island_radius` 36→40, `night1_duration_s` 180→300, điểm nạp thay vì điểm nhặt, v.v.). Các test Phase 1 được cập nhật/viết lại theo số chuẩn v1.1 kèm lý do rõ ràng.
- **Tiêu chí nghiệm thu theo mốc**:
  - **Mốc A**: `game.contract.json` lên `1.1`, CLI hỗ trợ `--night 1|2|3`, mã thoát `2` khi sai định dạng, `snapshot` và `scenario` validation đủ trường v1.1, dữ liệu Đêm 1 chuẩn, `npm test` & `verify-headless.py` (tất định 2 lần chạy) đạt.
  - **Mốc B**: Test unit & fixture headless xác nhận lướt (`dash`), rơi/hồi sinh, sinh đom đóm 240 tick (trần 30), điểm v1.1, Bóng Mực 5 trạng thái + lịch sinh + recoil + đẩy khỏi vùng an toàn tối đa 30 tick, Tỏa Sáng 3D + đẩy 15 tick, pause/resume, 3 kết thúc.
  - **Mốc C**: `--night 2` và `--night 3` chạy độc lập, test hình học cầu/bục phóng/dốc/tầng/tháp chuông, Gió Lạc, Bùa Gió, gió mạnh (báo trước 120 tick, đẩy 300 tick mỗi 1800 tick, `wind_enabled: false`).
  - **Mốc D**: Trình duyệt chơi trọn 3 đêm -> Bình Minh, thua chơi lại đúng đêm giữ tổng điểm các đêm đã thắng, Pause (`Esc`/`P`), Settings lưu `localStorage`, Web Audio SFX + nhạc nền, HUD đầy đủ theo bảng màu chuẩn.
  - **Mốc E**: `npm ci`, `npm test`, `npm run build` sạch; đo headless Đêm 3 21.600 tick `<= 30s`; đo bản Chuẩn `1280x720` đạt `>= 30 FPS` trung bình; cập nhật `README.md`, `AGENTS.md`, lưu bằng chứng vào `docs/proof/phase-2/`.

### 20/11/2026 · Nghiệm thu & Bằng chứng Phase 2 (16:18–16:30 ICT)

- **Lệnh kiểm chứng & Kết quả**:
  - `npm test`: **Đạt (16/16 test)** ([sim-m1-m2.test.js](tests/sim-m1-m2.test.js), [sim-m3-night1.test.js](tests/sim-m3-night1.test.js), [sim-phase2-mechanics.test.js](tests/sim-phase2-mechanics.test.js), [sim-maps-night2-3.test.js](tests/sim-maps-night2-3.test.js), [web-input.test.js](tests/web-input.test.js)).
  - `npm run build`: **Đạt** (`dist/` build trong `1.33s`).
  - `scripts/verify-headless.py` (tất định 2 lần chạy giống hệt từng byte):
    - [smoke.jsonl](docs/proof/phase-2/smoke.jsonl) (`--night 1 --ticks 1`)
    - [night1-dash-pause.jsonl](docs/proof/phase-2/night1-dash-pause.jsonl) (`--night 1 --ticks 120`)
    - [night2-bridge-drifter.jsonl](docs/proof/phase-2/night2-bridge-drifter.jsonl) (`--night 2 --ticks 180`)
    - [night3-full-21600.jsonl](docs/proof/phase-2/night3-full-21600.jsonl) (`--night 3 --ticks 21600 --snapshot-every 600`, `end.ticks = 21600`)
  - **Đo hiệu năng headless Đêm 3 (21.600 tick)**: `time -p node scripts/headless.js --night 3 --seed 42 --ticks 21600 --snapshot-every 600 --scenario tests/fixtures/p2-night3-dawn-scenario.json --out /tmp/bench-21600.jsonl` → **`real 0.38s`** (`<= 30s`).
  - **Playtest & Hiệu năng trình duyệt 1280×720 (Chế độ Chuẩn, `lightMode=false`)**:
    - Trình duyệt: `Chrome 157` (`WebGL 2`, 0 lỗi console) trên `Linux x86_64`.
    - Tối ưu GPU cho bản Chuẩn ([src/web/render/app.js](src/web/render/app.js), [src/web/render/world.js](src/web/render/world.js)): chuyển vật liệu sang `MeshLambertMaterial`, bỏ 7 `PointLight` dư trên từng đèn lồng (giữ `hemiLight`, `moonLight` `PCFShadowMap 512×512`, `playerLight` và vòng phát sáng `CanvasTexture`), khóa `pixelRatio = 1` ở `1280×720`.
    - Kết quả đo trên Đêm 3 (sau 5 giây ổn định, `shades = 9`): `samples = 3661`, `durationSec = 66.4 s`, **`55.1 FPS` trung bình**, **`p95 = 33.3 ms`** (`>= 30 FPS`).
    - Đã kiểm tra `P → Tiếp tục → P → Tiếp tục` (`paused` → `playing` và `sim_tick` tăng bình thường), kiểm tra `localStorage['dao-den-long-settings']` sau reload: `{"volume":0.5,"sensitivity":1.5,"lightMode":false}`.
    - Ảnh chụp bằng chứng: [01-menu.png](docs/proof/phase-2/01-menu.png), [02-night1-hud.png](docs/proof/phase-2/02-night1-hud.png), [03-pause.png](docs/proof/phase-2/03-pause.png), [04-night2-bridge.png](docs/proof/phase-2/04-night2-bridge.png), [05-night3-belltower.png](docs/proof/phase-2/05-night3-belltower.png).
- **Sửa 4 lỗi phát hiện khi kiểm tra độc lập (16:34–16:40 ICT)**:
  1. **Nút Tiếp tục ([src/web/main.js](src/web/main.js))**: Xóa trạng thái `prevInput.pause` bị kẹt sau lần nhấn `P` để `togglePause()` luôn kích hoạt cạnh lên `false → true` khi bấm **Tiếp tục**.
  2. **Tỏa Sáng 3D ([src/sim/step.js](src/sim/step.js))**: Dùng trực tiếp `shade.pos` / `drifter.pos` làm tâm mục tiêu (thay vì cộng thêm `0.8` m), bảo đảm mục tiêu ngoài `5.0` m (ví dụ `5.054` m) không bị choáng.
  3. **Lướt 12 tick & giật lùi 60 tick ([src/sim/step.js](src/sim/step.js))**: Giữ `isDashingThisTick` trước khi giảm `dashTicks` để đủ 12 tick giữ độ cao; chuyển bước kiểm tra hết `stateTicksLeft` xuống cuối bước di chuyển kẻ địch để Bóng Mực `recoil` đủ 60 bước (`2.0` m).
  4. **Tổng điểm không cộng trùng ([src/web/main.js](src/web/main.js))**: Lưu điểm thắng theo từng Đêm (`nightScores[1..3]`) và reset `nightScores[night]` khi chơi lại Đêm đó.
  - Đã thêm 3 ca test hồi quy biên vào [tests/sim-phase2-mechanics.test.js](tests/sim-phase2-mechanics.test.js) (`npm test`: **19/19 đạt**, `npm run build` & `verify-headless.py` đạt).
- **AI và retro**:
  - Khi đo 21.600 tick Đêm 3 lần đầu, `p2-night3-dawn-scenario.json` bị gió đẩy rơi khỏi tầng 2 tại tick `5618` nên không chạy đủ 21.600 tick; đã tắt gió trong fixture đo (`wind_enabled: false`) và xác nhận `end.ticks === 21600`.
  - Việc tách `src/sim/maps.js` dùng chung cho mô phỏng và dựng cảnh Three.js giúp tọa độ cầu tre, bục phóng, dốc 30°/150° và tháp chuông khớp 100% giữa headless và web. Token/chi phí chưa có số liệu từ harness.

---

## Phase 1 · PRD-0

### 20/11/2026 · Chuẩn bị harness

- **Mốc cập nhật (ICT, UTC+7)** — 14:44 sửa hướng dẫn và script, 14:45 ghi kết quả kiểm chứng. Giờ lấy theo thời điểm sửa tệp.
- Dùng Codex để đối chiếu PRD-0 với hướng dẫn, checkpoint, quy định, rubric và cách nộp của lab chính.
- Giữ hướng dẫn trong `AGENTS.md`. Dùng Python 3 và thư viện chuẩn cho script kiểm chứng để phần harness độc lập với công nghệ làm game.
- Phạm vi hiện tại là kiểm chứng harness. Tiêu chí nghiệm thu gameplay và bằng chứng chạy game sẽ được ghi khi có bản triển khai.
- `python3 scripts/verify-headless.py --help` chạy được. Kiểm tra script trong thư mục tạm bằng runner mô phỏng. Cả 10 trường hợp cho kết quả mong đợi, gồm hai lần chạy giống nhau, thắng sớm, đầu ra khác nhau, JSONL sai, thiếu cấu hình và lỗi từ runner.
- Token và chi phí của lần chuẩn bị chưa có số liệu. Giới hạn ngữ cảnh ở tài liệu lab và PRD-0.

### 20/11/2026 · Mốc C–E (Hoàn thiện Đêm 1, đồ họa/HUD/chơi lại, hiệu năng và README)

- **Giờ làm (ICT, UTC+7)** — Bắt đầu 15:43, hoàn thành Mốc C–E lúc 15:49.
- **Yêu cầu và giả định**
  - Mục tiêu: Hoàn thiện mô phỏng Bóng Mực (`shade_spawned`, đuổi theo người chơi, tránh `safe_radius` quanh đèn đã sáng, va chạm `player_hit` và miễn nhiễm `invuln_s`), Xung sáng `Q` (`pulse`, làm choáng `pulse_stun_s`, đẩy lùi `pulse_push_m`, hồi chiêu `pulse_cooldown_s`, trừ `pulse_cost`), 3 kết thúc (`all_lit`, `no_flames`, `dawn`) với thứ tự ưu tiên `all_lit > no_flames > dawn`, đồ họa low-poly đầy đủ + Chế độ Nhẹ, màn kết quả + Chơi lại, đo FPS 720p và hoàn thiện `README.md`.
  - Giả định thiết kế:
    - Khi `random_shades !== false`, màn bắt đầu với 2 Bóng Mực (`S1`, `S2`) ở nửa sau đảo (`[-20, 0, -10]`, `[20, 0, -10]`) để không chắn đường học thắp `L1`, và sinh thêm tối đa tới 5 Bóng Mực mỗi 30 giây (`1800` tick) theo `rng`.
    - `pulse` phát sự kiện `{"type":"event","tick":...,"name":"pulse","data":{"stunned_ids":[...]}}` mỗi lần kích hoạt hợp lệ (kể cả khi `stunned_ids` rỗng).
    - Khi `shades` bị đẩy hoặc đi vào `safe_radius` của đèn đã sáng (`lit: true`), đẩy lùi ra rìa `safe_radius` trên mặt phẳng XZ.
- **Tiêu chí nghiệm thu**
  - `npm test` kiểm chứng đủ `pulse`, `player_hit`, `invuln_s`, `safe_radius`, cả 3 kết thúc (`all_lit`, `no_flames`, `dawn`), ưu tiên kết thúc cùng tick, tính tất định và lỗi CLI mã `2`.
  - `verify-headless.py` xác nhận các kịch bản thắng/thua/xung cho output giống hệt nhau qua 2 lần chạy.
  - Trình duyệt chơi được từ đầu tới thắng/thua và bấm **Chơi lại**; chế độ Nhẹ ở `1280×720` đạt trung bình `>= 30 FPS`.
  - `README.md` có hướng dẫn cài & chạy trong tối đa 3 lệnh, điều khiển, tính điểm, lệnh test/headless và liên kết bằng chứng.
- **Bằng chứng Mốc C–E (15:46–15:49 ICT)**
  - `npm test`: **Đạt (12/12 test)** ([sim-m1-m2.test.js](tests/sim-m1-m2.test.js), [web-input.test.js](tests/web-input.test.js), [sim-m3-night1.test.js](tests/sim-m3-night1.test.js)).
  - `npm run build`: **Đạt** (`dist/`).
  - `scripts/verify-headless.py`: **Đạt** cho cả 5 kịch bản ([smoke.jsonl](docs/proof/phase-1/smoke.jsonl), [light-l1.jsonl](docs/proof/phase-1/light-l1.jsonl), [night1-pulse-win.jsonl](docs/proof/phase-1/night1-pulse-win.jsonl), [night1-no-flames.jsonl](docs/proof/phase-1/night1-no-flames.jsonl), [night1-dawn.jsonl](docs/proof/phase-1/night1-dawn.jsonl)).
  - **Playtest & Hiệu năng 720p (`game-playtest`)**:
    - Máy đo: `Linux 7.3.4-1-cachyos x86_64`, `Intel(R) Core(TM) i5-8250U CPU @ 1.60GHz`, Chrome 157 (`WebGL 2`), bản build `vite preview` chế độ Nhẹ (`?light=1`) ở `1280×720`.
    - Kết quả (`600` mẫu khung hình): **`58.8 FPS` trung bình**, **`p95 = 16.8 ms`** (đạt mục tiêu `>= 30 FPS`).
    - Đã kiểm tra thắp `L1`, Bóng Mực dừng ngoài `safe_radius`, xung `Q` tiêu `2` đom đóm và hiện hồi chiêu, `resetGame()` đưa trạng thái về tick 0 sạch sẽ. Ảnh chụp: [04-night1-lightmode-720p.png](docs/proof/phase-1/04-night1-lightmode-720p.png).
  - **Sửa 3 tồn đọng Phase 1 & 3 nâng cấp đồ họa (16:03 ICT)**:
    - Bảo vệ Mây khi đứng trong `safe_radius` (`isPlayerInSafeZone`) để không bị Bóng Mực ngoài vòng đánh xuyên mép; thêm `pushOutsideSafeZones` lặp giải quyết chồng lấn nhiều vùng sáng.
    - Tính `nextShadeIndex` dựa trên số ID `S<n>` lớn nhất trong `scenario.shades` + kiểm tra tập ID đang tồn tại khi sinh ngẫu nhiên (tránh trùng `S2`).
    - Tăng số đom đóm mặc định từ `32` lên `40` để đủ dùng xung `Q` 4 lần (`25 + 8 = 33`) vẫn thắng được.
    - Đồ họa ([src/web/render/world.js](src/web/render/world.js)): nâng ánh trăng (`hemi` `1.05`, `moon` `1.2`, mặt đảo `0x314154`), thêm mốc low-poly riêng quanh `L1`–`L5` (cổng đá, cụm thông, cọc bến, đá rêu, mái chòi) và làm quầng sáng chuyển mềm ra mép bằng `CanvasTexture` radial gradient.
    - `npm test` đạt **14/14**, `npm run build` đạt, `verify-headless.py` đạt.
- **AI và retro** — Trong test `pulse`, phát hiện Bóng Mực ở trạng thái `chase` tiến thêm 2 tick trước khi nhấn `Q` nên khoảng cách sau đẩy phụ thuộc vị trí ngay trước tick xung; đã chỉnh assertion theo `distBeforePulse + pulse_push_m`. Đã thêm `<link rel="icon" href="data:," />` vào `index.html` để tránh 404 favicon. Token/chi phí chưa có số liệu từ harness.

### 20/11/2026 · Mốc A–B (Nền tảng và Vòng chơi đầu tiên)

- **Giờ làm (ICT, UTC+7)** — Bắt đầu 15:15, hoàn thành Mốc A–B lúc 15:28.
- **Yêu cầu và giả định**
  - Mục tiêu: Hoàn thành Mốc A (dựng dự án Vite + Three.js WebGL 2, `game.contract.json`, `scripts/headless.js`, kiểm chứng `verify-headless.py`) và Mốc B (lõi mô phỏng 60 tick/s cho di chuyển `WASD` theo góc camera, nhảy `Space`, camera góc nhìn thứ ba, nhặt đom đóm tự động trong `pickup_radius`, nạp từng phần bằng `E` vào đèn gần nhất trong `interact_radius` và thắp sáng `L1`, giữ đủ 5 ID đèn `L1`..`L5`).
  - Giả định thiết kế:
    - Bán kính Đảo Bến là `36` m (`fall_enabled: false`, kẹp vị trí player trong bán kính đảo trên mặt phẳng XZ).
    - Trọng lực nhảy: vận tốc nhảy ban đầu `7.5` m/s, trọng lực `20` m/s² (chạm đất tại `y = 0`).
    - Đèn `L1` đặt tại `(0, 0, 14)` thẳng phía trước hướng nhìn ban đầu của Mây tại `(0, 0, 0)`, cùng cụm đom đóm đầu tiên trên đường tới `L1` để người chơi thấy ngay và học cách thắp `L1`. Bốn đèn còn lại (`L2`..`L5`) phân bố quanh đảo.
    - Xoay camera trên trình duyệt: hỗ trợ kéo chuột (pointer drag) hoặc phím mũi tên trái/phải để xoay `cam_yaw_deg` (không bắt buộc pointer lock để dễ test và chơi trên mọi trình duyệt).
    - Tọa độ `move: [x, z]` theo Test Contract v1.0: `x' = x*cos(θ) + z*sin(θ)`, `z' = -x*sin(θ) + z*cos(θ)` với `θ = cam_yaw_deg * π / 180`. Trên trình duyệt, `W` tương ứng tiến theo hướng camera (`z = +1` khi `cam_yaw_deg = 0` hướng về `+Z`), `S` là `-1`, `D` là `+1` (hoặc theo chuẩn camera sau lưng). Lưu ý kiểm tra kỹ dấu hướng camera trên web để `W` luôn tiến về phía trước màn hình.
- **Tiêu chí nghiệm thu**
  - Mốc A: `npm ci` và `npm run build` thành công; `python3 scripts/verify-headless.py --seed 42 --ticks 1 --out docs/proof/phase-1/smoke.jsonl` chạy 2 lần cho output giống hệt nhau, có snapshot tick 0 và dòng `end`.
  - Mốc B: `npm test` kiểm tra di chuyển thẳng/chéo, xoay camera 90°, nhảy và tiếp đất, nhặt đom đóm đúng `pickup_radius` và giới hạn `carry_capacity = 8`, nạp từng phần rồi nạp đủ `lantern_cost = 5` để thắp `L1` (`lantern_lit`), giữ phím `E` chỉ kích hoạt 1 lần; trình duyệt hiển thị Mây, đảo, 5 đèn, đom đóm, HUD gọn và chụp được ảnh/clip Mây tới thắp sáng `L1`.
- **Bằng chứng (đã chạy lúc 15:18–15:19 ICT)**
  - `npm test`: **Đạt (5/5 test)** (`tests/sim-m1-m2.test.js`).
  - `npm run build`: **Đạt** (`dist/` tạo thành công trong 1.23s).
  - `python3 scripts/verify-headless.py --seed 42 --ticks 1 --out docs/proof/phase-1/smoke.jsonl`: **Đạt** (`docs/proof/phase-1/smoke.jsonl`, hai lần chạy giống hệt nhau).
  - `python3 scripts/verify-headless.py --seed 42 --ticks 130 --inputs tests/fixtures/light-l1-inputs.json --out docs/proof/phase-1/light-l1.jsonl`: **Đạt** (`docs/proof/phase-1/light-l1.jsonl`, ghi nhận `mote_picked` x6, `deposit` 5 vào `L1`, `lantern_lit` `L1`, điểm `160`).
  - **Playtest trình duyệt (`game-playtest`)**: **Đạt** trên Chrome 1280×720 (`http://127.0.0.1:5173/`, `isWebGL2: true`, không lỗi console từ game). Mây đi từ `(0, 0, 0)` bằng `W`, nhặt 6 đom đóm tới `L1` (`E · Nạp sáng L1 (0/5)`), nhấn `E` nạp 5 đom đóm thắp sáng `L1` (`lit: true`, `Đèn 1/5`, `Điểm 160`).
  - Bằng chứng lưu tại:
    - [docs/proof/phase-1/01-initial.png](docs/proof/phase-1/01-initial.png)
    - [docs/proof/phase-1/02-near-l1-prompt.png](docs/proof/phase-1/02-near-l1-prompt.png)
    - [docs/proof/phase-1/03-l1-lit.png](docs/proof/phase-1/03-l1-lit.png)
    - [docs/proof/phase-1/light-l1.mp4](docs/proof/phase-1/light-l1.mp4)
  - **Sửa lỗi nhấn nhanh & `.gitignore` (15:34 ICT)**:
    - Tách [src/web/input.js](src/web/input.js) để latch các phím rời rạc (`Space`, `KeyE`, `KeyQ`) khi `keydown` (bỏ qua `repeat`) và chỉ tiêu thụ bên trong vòng lặp `while (accumulator >= SIM_DT)` ở [src/web/main.js](src/web/main.js), tránh mất lần nhấn khi nhấn-nhả giữa hai tick.
    - Thêm [.gitignore](.gitignore) loại `node_modules/`, `dist/`, `.env*`, `*.log` khỏi `git status`.
    - `npm test` đạt **7/7** (thêm 2 test ở [tests/web-input.test.js](tests/web-input.test.js)); `npm run build` đạt.
- **AI và retro** — Dùng `three-webgl-game` để tách hẳn `src/sim/` khỏi Three.js `src/web/render/` và DOM HUD `src/web/ui/`. Khi tích hợp camera sau lưng theo `cam_yaw_deg`, đã đối chiếu hệ tọa độ tay phải của Three.js để ánh xạ `D` (`-X`) / `A` (`+X`) khớp hướng màn hình với công thức quay của Test Contract v1.0. Token/chi phí chưa có số liệu trực tiếp từ harness.

### Mẫu ghi cho mỗi phase

- **Giờ làm (ICT, UTC+7)** — Ngày, giờ bắt đầu và giờ kết thúc của phiên làm việc.
- **Yêu cầu và giả định** — Mã hoặc tên yêu cầu, điều cần làm rõ và quyết định đã chọn.
- **Tiêu chí nghiệm thu** — Đầu vào hoặc thao tác, kết quả mong đợi và cách kiểm tra.
- **Bằng chứng** — Lệnh tái lập, đường dẫn báo cáo hoặc ảnh, kết quả đạt/chưa đạt và lý do. Ghi cấu hình máy nếu có số đo.
- **Hồi quy** — Kiểm tra phase trước đã chạy lại và lý do sửa hoặc bỏ test khi yêu cầu đổi.
- **AI và retro** — Việc giao cho AI, lỗi đã phát hiện, cách sửa harness, token hoặc chi phí ước tính và điều cần cải thiện.
