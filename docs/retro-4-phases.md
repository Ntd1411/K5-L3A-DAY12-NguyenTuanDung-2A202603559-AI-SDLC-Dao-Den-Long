# Tổng kết & Retro 4 Phase · Đảo Đèn Lồng

## 1. Đánh giá tổng hợp 4 Phase

| Phase | Hợp đồng | Trọng tâm | Kết quả kiểm chứng |
| --- | --- | --- | --- |
| **Phase 1** | v1.0 | Dựng lõi 60 tick/s, Đêm 1, xung Q, vùng an toàn, harness | 14/14 test, 5 JSONL tất định, 58.8 FPS (Chế độ Nhẹ 720p) |
| **Phase 2** | v1.1 | Chuẩn hóa số liệu, 3 Đêm (Đảo Bến/Cau/Chuông), Gió Lạc, Bùa Gió, âm thanh, HUD | 19/19 test, 21.600 tick headless 0.38s, 55.1 FPS Chuẩn 720p |
| **Phase 3** | v1.2 | Change Request "Đèn cạn dầu", Bóng Mực `drain`, sức chứa động, thắng bình minh 60%, bảng màu dễ phân biệt | 29/29 test, 6 JSONL tất định, 55.6 FPS Chuẩn 720p |
| **Phase 4** | v1.3 | Benchmark 200 Bóng + 100 đom đóm, Soak 10 Đêm, Bảng xếp hạng cục bộ, Tiếp cận, Đóng gói `v1.0.0` | 33/33 test, `soak.json` 0 crash, `bench.json` + playtest + gói zip |

## 2. Điều hiệu quả & chưa hiệu quả khi làm việc với AI

- **Hiệu quả**:
  - Tách biệt hoàn toàn `src/sim/` (thuần JS, không phụ thuộc DOM/Three.js) khỏi `src/web/` giúp cùng một lõi chạy trên cả trình duyệt và Node.js CLI, đồng thời viết test nhanh (~200–400 ms cho toàn bộ suite).
  - Giao việc theo từng mốc nhỏ kèm tiêu chí nghiệm thu rõ ràng (`WORKLOG.md`, `docs/plans/phase-*.md`) giúp AI giữ đúng tên trường, cờ CLI và thứ tự tick của contract.
- **Chưa hiệu quả**:
  - Khi làm việc ở chế độ mặc định, nếu không đo hiệu năng thực tế sớm trên GPU tích hợp (Intel UHD 620), AI có xu hướng chọn `MeshStandardMaterial` + nhiều `PointLight`, dẫn tới tụt FPS xuống 14.9 FPS ở Phase 2 trước khi tối ưu lại bằng `MeshLambertMaterial` và `InstancedMesh`.

## 3. Những lần AI sai & cách phát hiện

1. **Nút Tiếp tục làm game đứng ở Phase 2**: AI đọc `pause` theo cạnh lên nhưng khi click nút HTML `Tiếp tục`, `prevInput.pause` vẫn giữ `true` từ lần nhấn `P`. Phát hiện khi playtest thực tế `P → Tiếp tục → P → Tiếp tục` trên Chrome và kiểm tra `sim_tick`.
2. **Lệch 1 tick ở Lướt & Bóng Mực `recoil`**: Giảm `dashTicks` trước khi kiểm tra giữ độ cao khiến tick 12 bị kéo xuống bởi trọng lực; `stateTicksLeft` chuyển trạng thái trước bước di chuyển khiến `recoil` chỉ lùi 59/60 bước. Phát hiện bằng kiểm tra biên từng tick và bổ sung test hồi quy.
3. **Tỏa Sáng cộng dư `+0.8 m` vào `shade.pos`**: Làm mục tiêu cách `5.054 m` vẫn bị choáng. Phát hiện qua ca biên 3D trong headless và khóa lại bằng test `5.054 m > 5 m`.
4. **Cộng trùng điểm khi chơi lại Đêm đã thắng**: Sửa bằng lưu điểm theo từng Đêm (`nightScores[1..3]`).
5. **Tăng RSS trong Soak test do JIT warmup**: V8 chưa biên dịch hết đường dẫn Đêm 2/3 trước khi đo `mem_start_mb`; đã tách bước warmup 3 Đêm và chạy GC trước khi lấy mốc đầu.

## 4. Harness & tiết kiệm token

- **Harness hữu ích nhất**: `scripts/verify-headless.py` (chạy 2 lần cùng seed, so sánh từng byte JSONL), `.github/workflows/ci.yml` (tự động hóa kiểm chứng khi push), kết hợp `AGENTS.md` (bắt buộc ghi giả định vào `WORKLOG.md` trước khi sửa mã) và bộ fixture JSONL theo từng phase.
- **Ước tính token / chi phí & cách tiết kiệm**:
  - Harness cục bộ không xuất tổng số token chính thức của từng phiên; ước tính theo quy mô hội thoại mỗi phase (Phase 1 ~80k–120k token, Phase 2 ~150k–220k token, Phase 3 ~80k–120k token, Phase 4 ~120k–180k token, chi phí tương đương khoảng \$1–\$3 tùy model).
  - **Cách tiết kiệm**: Đọc có chọn lọc theo đoạn dòng cần sửa, gom nhiều thao tác đọc/sửa độc lập trong cùng lượt, và dùng `node --test` + `verify-headless.py` để xác minh nhanh thay vì mở trình duyệt cho mọi thay đổi logic.

## 5. Nếu làm lại từ đầu

- Thiết kế ngay `InstancedMesh` cho thực thể số lượng lớn (đom đóm, Bóng Mực, cây/cỏ) và bộ đếm số nguyên fixed-point ngay từ Phase 1 để không phải chuyển đổi lại ở Phase 3–4.
