# Changelog

## Phase 4 — Contract v1.3 (`v1.0.0`)

- Nâng `game.contract.json` lên `1.3` với `run_cmd` (`node scripts/run.js`), `bench_cmd` (`node scripts/bench.js`) và `soak_cmd` (`node scripts/soak.js`).
- Thêm chế độ benchmark `?bench=1` (200 Bóng Mực `wander`, 100 đom đóm, `L1`–`L3` sáng, camera quay bán kính 30 m/Y=15 m/15 s vòng) và tối ưu `InstancedMesh` cho đom đóm & Bóng Mực.
- Thêm soak test 10 Đêm liên tiếp trong một tiến trình (`scripts/soak.js`).
- Thêm Bảng xếp hạng cục bộ top 10 lưu đĩa (`data/leaderboard.json`) và lệnh `node scripts/run.js --export-leaderboard <path>`.
- Bổ sung 4 nhóm tiếp cận: đổi phím có phát hiện trùng & khôi phục mặc định, chỉ báo hình ảnh khi Bóng Mực xuất hiện / gió / 10 s cuối / đèn `< 30` dầu, giảm chuyển động, và cỡ chữ `≥ 18 px` kèm tùy chọn chữ lớn `×1.25`.
- Hoàn thiện `LICENSE`, `CREDITS.md`, tài liệu retro 4 phase, video demo và gói phát hành `v1.0.0`.

## Phase 3 — Contract v1.2

### Breaking changes

- Thay thắng sớm `all_lit` bằng thắng `dawn_survived` khi còn sống và giữ tối thiểu 60% đèn sáng tới hết giờ.
- Đổi thời lượng Đêm 1/2/3 thành 240/270/300 giây.
- Đèn sáng có nhiên liệu, có thể châm, tắt và thắp lại. Vùng an toàn bị mất khi fuel dưới 30.
- Snapshot thêm `lantern.fuel`, `ever_lit`, `relit_count` và `player.capacity`; Bóng Mực thêm trạng thái `drain`.
- Scenario thêm override fuel, `ever_lit`, `successful_lights` và `target_lantern_id`.
- Thêm sự kiện `refuel`, `lantern_out`, `fuel_drain`; `lantern_lit` thêm cờ `relight`.
- Thay toàn bộ công thức điểm theo Ticket-03 và bỏ thưởng thời gian.
- Sức chứa khởi điểm 10, tăng 2 sau mỗi lần thắp thành công và tối đa 20.

## Phase 2 — Contract v1.1

- Chuẩn hóa toàn bộ thông số gameplay Đêm 1 theo Ticket-02 (`player_speed = 6.0`, `carry_capacity = 10`, `lantern_cost = 10`, lướt `Shift`, rơi & hồi sinh).
- Bổ sung Đêm 2 (Đảo Cau, cầu tre, bục phóng, Gió Lạc, Bùa Gió) và Đêm 3 (Đảo Chuông 3 tầng, 2 dốc, tháp chuông, gió mạnh).
- Hoàn thiện chuỗi 3 Đêm, Pause (`Esc`/`P`), Cài đặt `localStorage`, Web Audio và HUD đầy đủ.

## Phase 1 — Contract v1.0

- Dựng dự án Vite + Three.js WebGL 2, lõi mô phỏng 60 tick/s dùng chung web/Node, Đêm 1 Đảo Bến, xung `Q`, Bóng Mực, vùng an toàn và harness `verify-headless.py`.
