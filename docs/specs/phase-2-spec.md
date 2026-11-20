# Spec & Tiêu chí nghiệm thu · Phase 2 (Ticket-02 "Ba hòn đảo")

Tài liệu này tổng hợp tiêu chí nghiệm thu chi tiết cho từng mục ở Phần 3 và Phần 4 của [Ticket-02](../contracts/ticket-2.md).

## 1. Chuẩn hóa lõi & Contract v1.1

- **`game.contract.json`**: `contract_version: "1.1"`, đồng bộ toàn bộ `tuning` theo Phần 1 Ticket-02 (`player_speed: 6.0`, `carry_capacity: 10`, `lantern_cost: 10`, `pickup_radius: 1.0`, `interact_radius: 2.0`, `pulse_cost: 3`, `pulse_radius: 5.0`, `pulse_stun_s: 2.0`, `pulse_push_m: 4.0`, `pulse_cooldown_s: 3.0`, `dash_speed: 14.0`, `dash_duration_s: 0.2`, `dash_cooldown_s: 1.5`, `night1_duration_s: 300`, `night2_duration_s: 330`, `night3_duration_s: 360`, `flames: 3`, `invuln_s: 1.5`, `hit_drop_ratio: 0.5`, `safe_radius: 6.0`, `shade_speed: 4.0`, `shade_hit_radius: 1.0`, `fall_enabled: true`).
- **CLI**: `node scripts/headless.js --night 1|2|3` chạy độc lập từng đêm; input/scenario sai JSON hoặc sai schema trả mã thoát `2` và ghi `stderr`.
- **Snapshot & Events**: Đủ trường `night`, `wind {active, dir_deg}`, `player.{vel, grounded, invuln, dash_cd_s, pulse_cd_s, charm_s}`, `motes` (`kind`, `ttl_s`), `drifters` (`state`, `stolen`), `charms` (`available`, `respawn_s`). Đủ sự kiện `night_start`, `dash`, `paused`, `resumed`, `charm_picked`, `drifter_steal`, `drifter_drop`, `player_hit.lost`.

## 2. Cơ chế gameplay chuẩn

- **Di chuyển & Lướt (`Shift`)**: Chạy 6 m/s (tăng tốc/dừng ≤ 6 tick), nhảy 7 m/s tại mặt đỡ, trọng lực −20 m/s². Lướt 14 m/s trong 12 tick, hồi 90 tick từ lúc bắt đầu, giữ nguyên Y khi lướt trên không, không bất tử khi lướt.
- **Rơi & Hồi sinh**: `Y < -10` trừ 1 lửa (bỏ qua bất tử), mất toàn bộ đom đóm. Hết lửa → `no_flames` ngay. Còn lửa → chờ 60 tick (không nhặt, không bị chạm), hồi sinh tại điểm xuất phát, vận tốc 0, bất tử 90 tick.
- **Đom đóm & Đèn**: 20 con ban đầu tại 20 điểm khác nhau, trần 30, sinh thêm 1 con mỗi 240 tick nếu dưới trần và còn điểm trống. Nhặt trong XZ ≤ 1.0 m và |ΔY| ≤ 1.5 m. Đèn nạp tối đa 10, tương tác ≤ 2.0 m (chọn gần nhất, hòa chọn ID nhỏ hơn).
- **Bóng Mực & Vùng an toàn**: Trạng thái `spawning`, `wander`, `chase`, `recoil`, `stunned`. Phát hiện 12 m, bỏ đuổi 18 m, tốc độ 4.0 m/s (Đêm 3: 4.5 m/s). Chạm XZ ≤ 1.0 m và |ΔY| ≤ 1.5 m → trừ tối đa 1 lửa/tick, rơi `floor(carried/2)` trong vành 1.5–2.5 m (TTL 480 tick, nhặt từ tick sau), bất tử 90 tick, bóng lùi 2 m trong 60 tick (`recoil`). Đèn sáng tạo vùng 6 m chặn ngoài mép; bóng kẹt bên trong khi vừa thắp bị đẩy ra mép trong tối đa 30 tick và không gây sát thương.
- **Tỏa Sáng (`Q`)**: Tốn 3 đom đóm, hồi 180 tick. Chốt mục tiêu trong 5 m 3D từ tâm `(x, y + 0.8, z)` ngay tick kích hoạt. Choáng 120 tick, đẩy ngang 4 m trong 15 tick đầu (dừng nếu gặp vật cản, trùng vị trí đẩy +X). Trúng lại làm mới cả choáng và đẩy.

## 3. Tính năng mới (Phần 3 Ticket-02)

1. **Gió Lạc (Đêm 2 & 3)**: Sinh mỗi 1.200 tick tại điểm sương ngẫu nhiên, tối đa 2 con, ID `D1, D2, ...`. `idle` (2 m/s) → `chase` (7 m/s) khi Mây mang ≥ 5 đom đóm và cách ≤ 15 m; mất điều kiện về `idle`. Chạm XZ ≤ 1.2 m (trước Bóng Mực cùng tick, bỏ qua vùng an toàn và bất tử) cướp `min(3, carried)` rồi `flee` 240 tick và biến mất. Tỏa Sáng trúng lúc `chase` → `flee` không cướp; trúng lúc `flee` có đồ → thả lại toàn bộ thành đom đóm rơi (`drifter_drop`) và biến mất sau 120 tick.
2. **Bùa Gió (`C1`, `C2`)**: Đêm 2 tại `(35, 0, 0)`, Đêm 3 tại `(30, 0, 25)` và `(-30, 0, 25)`. Nhặt theo ngưỡng đom đóm. Hiệu lực 600 tick (nhặt lại làm mới): tốc độ chạy 7.2 m/s và Lướt không hồi chiêu (nhấn khi đang lướt bị bỏ qua). Xuất hiện lại sau 2.700 tick.
3. **Chuỗi 3 Đêm**: Menu chính → Giới thiệu Đêm (tên đảo + lời Ông Đăng) → Chơi → Kết quả → Đêm tiếp theo. Thắng Đêm 3 mở màn Bình Minh với tổng điểm các Đêm đã thắng. Thua cho phép chơi lại đúng Đêm đó với tổng điểm các Đêm trước giữ nguyên.
4. **Tạm dừng (`Esc` / `P`)**: Dừng hoàn toàn `sim_tick`, thời gian, bộ đếm, sinh thực thể, TTL. Menu gồm: Tiếp tục, Chơi lại Đêm, Cài đặt, Về menu.
5. **Cài đặt**: Âm lượng và độ nhạy chuột lưu vào `localStorage`, giữ nguyên khi tải lại trang.
6. **Âm thanh**: Web Audio API tổng hợp nhạc nền đêm và hiệu ứng cho: nhặt, thắp đèn, Tỏa Sáng, bị đánh, nhảy, lướt, thắng, thua, Bóng Mực xuất hiện, đếm ngược 10 s cuối, cảnh báo gió Đêm 3.
7. **HUD đầy đủ**: Ngọn Lửa (trên trái), đồng hồ `mm:ss` (trên giữa, đỏ + nhấp nháy khi ≤ 30 s), đèn `k/n` và điểm (trên phải), thanh đom đóm 10 ô (dưới giữa), hồi chiêu Lướt & Tỏa Sáng (dưới phải), nhắc `E — Nạp ánh sáng (x/10)` gần đèn, mũi tên chỉ đèn chưa sáng gần nhất khi ngoài màn hình.
8. **Bảng màu & Ánh sáng**: Vật liệu, UI và hiệu ứng tuân thủ bảng Hex chuẩn (±10% mỗi kênh RGB). Ánh sáng môi trường theo `0.15 + 0.55 * (đèn sáng / tổng đèn)`.
