# Changelog

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

### Kiểm chứng

- `npm test`: **29/29** test đạt (schema v1.2, hao/châm dầu, tắt/thắp lại, multi-drain, ngưỡng 30, sức chứa 10→20, 3/5–4/6–5/7 bình minh, cài đặt bảng màu dễ phân biệt, hồi quy Phase 1–2).
- `scripts/verify-headless.py`: 6 kịch bản JSONL đối chiếu 2 lần chạy giống nhau từng byte tại `docs/proof/phase-3/`.
- Trình duyệt: thanh dầu 3D trên đèn, nhấp nháy 1 Hz dưới 30, đèn tắt xẹp 20% + vết rách, HUD sức chứa & mục tiêu bình minh, cài đặt **Bảng màu dễ phân biệt** lưu `localStorage`.
