# Nhật ký lab

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
