# Kế hoạch Phase 3 · Ticket-03 “Đèn cạn dầu”

## 1. Mục tiêu và thứ tự giao việc

Chuyển mục tiêu của cả ba đêm sang **giữ đủ đèn sáng đến bình minh**. Đèn hao dầu, có thể được châm dầu và thắp lại. Bóng Mực có thể hút dầu từ đèn yếu. Nâng hợp đồng lên v1.2, cập nhật HUD, điểm và chế độ **Bảng màu dễ phân biệt**. Dùng lõi JavaScript 60 tick/giây chung cho web và headless. [Ticket-03](../contracts/ticket-3.md) · [Kế hoạch Phase 2](phase-2.md)

| Mốc | Giao việc | Điều kiện bàn giao |
| --- | --- | --- |
| **A · Luật thay thế và schema** | Chốt mốc đầu vào Phase 2, ghi ADR, cập nhật tuning, validation scenario và snapshot v1.2. | Có test cho snapshot tick 0, override nhiên liệu/sức chứa và bảng các kỳ vọng v1.1 bị thay thế. |
| **B · Vòng đời đèn** | Làm hao dầu, châm, tắt, thắp lại, sức chứa động và điểm tương ứng. | Fixture tái lập được toàn bộ vòng đời đèn. Biên nhiên liệu, chọn đèn và điểm có assertion. |
| **C · Bóng Mực và bình minh** | Thêm `drain`, vùng sáng theo nhiên liệu, thứ tự xét bình minh và thưởng. | Test ngưỡng 30, hút đồng thời, tỏa sáng lên Bóng đang hút, thắng/thua ở tick cuối của cả ba đêm. |
| **D · Web và nghiệm thu** | Cập nhật cài đặt, hình ảnh đèn, HUD, màn kết quả và tài liệu bàn giao. | Chạy test, build, headless và playtest. Lưu bằng chứng, ADR, changelog và mốc `phase-3`. |

Mỗi mốc bàn giao kèm lệnh tái lập, kết quả và liên kết bằng chứng. Dùng `three-webgl-game` cho hình ảnh đèn, `game-ui-frontend` cho HUD và cài đặt, `game-playtest` cho nghiệm thu trên trình duyệt. [Hướng dẫn repo](../../AGENTS.md)

## 2. Mô hình đèn, sức chứa và điểm

| Nội dung | Triển khai và tiêu chí nghiệm thu |
| --- | --- |
| **Đơn vị nhiên liệu** | Lưu số nguyên theo đơn vị `1/60` dầu. Đầy là `6000`, ngưỡng yếu là `1800`. Trừ 1 đơn vị nội bộ mỗi tick cho đèn sáng, cộng 5 đơn vị hao hụt cho mỗi Bóng đang hút hợp lệ. Hai Bóng cùng hút làm đèn mất tổng cộng 11 dầu trong 60 tick. Chỉ làm tròn đến một chữ số thập phân khi xuất snapshot. |
| **Chọn đèn và châm dầu** | Dùng chung một hàm cho gameplay và HUD. Xét đèn tắt hoặc đèn sáng còn thiếu dầu trong tầm, chọn gần nhất rồi phá hòa bằng ID. Đèn đầy bị loại khỏi danh sách. Tính `used = min(carried, ceil((6000 − fuelUnits) / 600))`, giới hạn nhiên liệu ở `6000` và trừ đúng `used` đom đóm. Phát `refuel` và cộng 5 điểm cho mỗi đom đóm thực dùng. Test đèn đầy, đèn thiếu dưới 10 dầu, số mang giới hạn và hai đèn cách đều. |
| **Tắt và thắp lại** | Dầu hết ở bước trừ dầu thì phát `lantern_out` đúng một lần, đặt `lit = false`, `fuel = 0`, `deposited = 0` và lưu `ever_lit`. Đèn mới cần 10 đom đóm, đèn từng sáng cần 5. Cả hai lần đều bắt đầu với 100 dầu. Trường `data.relight` của `lantern_lit` phân biệt hai trường hợp và `relit_count` tăng mỗi lần thắp lại. Test cả ca tắt và thắp lại trong cùng tick. |
| **Sức chứa** | `capacity = min(20, 10 + 2 × successful_lights)`. Tăng bộ đếm sau mỗi lần thắp thành công, kể cả thắp lại. Fixture có đèn sáng sẵn giữ bộ đếm đầu vào ở mức khai báo hoặc mặc định 0. Test sức chứa 10, 12 và trần 20, rồi chơi lại hoặc chuyển đêm để xác nhận đặt lại. |
| **Điểm** | +5 mỗi đom đóm nạp hoặc châm, +100 lần thắp đầu, +40 lần thắp lại. Pulse nhận tổng +5 mỗi Bóng thường hoặc tổng +15 mỗi Bóng đang `drain` ngay trước xung. Khi thắng, cộng `50 + floor(fuel)` cho mỗi đèn sáng và +50 cho mỗi lửa còn lại. Thưởng theo thời gian bằng 0. Test tổng điểm từng giao dịch và thưởng cuối đêm chỉ cộng một lần. |

Chốt cách khởi tạo `ever_lit` khi scenario chỉ khai báo `lit`. Đèn `lit: true` dùng 100 dầu nếu `fuel` vắng mặt. `relit_count` bắt đầu từ 0 vì ticket cung cấp trường này ở đầu ra. Ghi cách xử lý các tổ hợp khác thường trong ADR và thêm fixture nếu ảnh hưởng hợp đồng.

## 3. Hút dầu, vùng sáng và bình minh

- **Thứ tự một tick.** Ở bước giảm bộ đếm của Ticket-02, gom hao dầu thụ động và lượng hút cho mỗi đèn. Xử lý sự kiện `fuel_drain` đến hạn và đèn tắt trước di chuyển, nhặt vật phẩm, tương tác và Tỏa Sáng. Sau tương tác, cập nhật vùng sáng rồi mới xử lý xung, di chuyển và va chạm kẻ địch. Xét kết quả sau toàn bộ thay đổi của tick. Pause giữ nguyên nhiên liệu, bộ đếm hút và `sim_tick`.
- **Mục tiêu của Bóng Mực.** Bóng `wander` chọn đèn yếu đang sáng gần nhất trên XZ, phá hòa bằng ID. Nếu thiếu mục tiêu yếu, ưu tiên đèn tắt gần nhất. Bóng `chase` tiếp tục đuổi Mây. Khi tới trong 2 m, Bóng chuyển sang `drain`, đứng yên và giữ `target_lantern_id`. Trong `drain`, kiểm Mây đến trong 6 m, trúng xung, đèn tắt, dầu hồi lên ngưỡng hoặc khoảng cách tới đèn vượt 2 m. Sau choáng trở về `wander`. Ghi quy ước khi phát hiện Mây và tìm đèn yếu cùng tick, rồi test rõ kết quả.
- **Vùng an toàn 6 m.** Dùng cùng điều kiện `lit && fuelUnits >= 1800` trong chọn điểm sinh, chặn Bóng Mực và kiểm va chạm. Đúng 30 còn vùng an toàn, dưới 30 mất vùng. Khi châm từ dưới lên ít nhất 30, đưa Bóng bên trong ra ngoài trong tối đa 30 tick và chặn sát thương của chúng trong thời gian đẩy. Kiểm lại vùng chồng lấn và cạnh địa hình. So ngưỡng trên giá trị nội bộ vì snapshot `30.0` có thể là giá trị đã làm tròn.
- **Sự kiện hút dầu.** Chọn và ghi trong ADR mốc bắt đầu đếm 60 tick hút cho từng Bóng, quy tắc khi ngắt quãng và thứ tự nếu nhiều sự kiện cùng tick. Phương án mặc định là đếm từ tick đầu tiên thực sự trừ dầu, giữ bộ đếm khi pause và phát `fuel_drain` cùng giá trị dầu sau khi áp dụng hao hụt của tick. Dùng seed và thứ tự ID để giữ JSONL tất định.
- **Xét bình minh.** Đêm 1/2/3 kéo dài **240/270/300 giây**. Hết lửa là `no_flames` ngay cả ở tick cuối. Nếu sống qua tick hết giờ, cần số đèn đang sáng ≥ `ceil(0.6 × tổng đèn)` tương ứng **3/5, 4/6, 5/7** để thắng `dawn_survived`. Thiếu đèn thì thua `dawn`. Fixture phải chứng minh đủ đèn trước hạn vẫn `playing`, rồi kiểm một đèn tắt hoặc được thắp lại đúng tick cuối.

## 4. Contract v1.2 và hồi quy

- Cập nhật `game.contract.json` với `contract_version: "1.2"` và tám khóa `fuel_max`, `fuel_decay_per_s`, `fuel_per_mote`, `relight_cost`, `win_ratio`, `drain_per_s`, `low_fuel_threshold`, `capacity_max`. Dùng `scripts/headless.js` và harness hiện có với `--night 1|2|3`.
- Thêm `fuel`, `ever_lit`, `relit_count` vào từng đèn và `capacity` vào `player` trong snapshot. Nhận override `lit`, `fuel`, `ever_lit`, `player.successful_lights` và `shades[].target_lantern_id` trong scenario, cùng trạng thái Bóng Mực `drain`. Tệp sai định dạng vẫn trả mã `2` qua `stderr`.
- Kiểm payload và thứ tự của `refuel {lantern_id, amount, fuel}`, `lantern_out {lantern_id}`, `fuel_drain {lantern_id, shade_id, fuel}` và `lantern_lit.relight`. Fixture kiểm `game_over.reason` chỉ dùng `dawn_survived`, `dawn` và `no_flames` theo ca tương ứng.
- Trong ADR hoặc changelog, liệt kê các test v1.1 cần đổi vì thắng sớm, thời lượng đêm, điểm, đèn sáng và sức chứa. Chạy lại các ca di chuyển, lướt 12 tick, rơi/hồi sinh, giật lùi 60 tick, xung 3D, cầu/bục/tầng, gió, Gió Lạc, Bùa Gió, pause–resume và tổng điểm qua các đêm. Dùng hai lần chạy cùng seed để đối chiếu JSONL. [Harness headless](../../scripts/verify-headless.py)

## 5. Trình duyệt và bàn giao

- Thanh dầu gắn trên đèn sáng, đèn và thanh nhấp nháy **1 Hz** khi dầu dưới 30. HUD hiện đang mang/sức chứa và mục tiêu số đèn cần giữ tới bình minh. Gợi ý `E` phân biệt châm dầu với thắp lại. Cập nhật intro, màn kết quả, mũi tên mục tiêu và cường độ ánh sáng theo số đèn hiện sáng.
- Thêm cài đặt **Bảng màu dễ phân biệt** và kiểm tải lại trang. Khi bật, viền và mắt Bóng Mực dùng `#00B3FF`, cảnh báo UI dùng `#FFFFFF` kèm `⚠`. Đèn tắt xẹp 20% và có vết rách trên giấy. Chụp cùng góc nhìn ở ba trạng thái đèn đầy, yếu và tắt để đối chiếu.
- Lưu ADR về vòng đời đèn và luật thắng, ví dụ `docs/adr/0001-lantern-fuel-and-dawn.md`. Tạo hoặc cập nhật `CHANGELOG.md` cho thay đổi phá vỡ tương thích v1.2. Cập nhật `README.md`, hướng dẫn agent và `WORKLOG.md` khi triển khai.
- Chạy `npm test`, `npm run build`, scenario headless cả ba đêm và playtest có châm dầu, đèn yếu, thắp lại, bình minh và chơi lại. Lưu fixture, JSONL, ảnh/clip và kết quả tại `docs/proof/phase-3/`. Đo lại 720p bản Chuẩn theo tuyến Phase 2 để phát hiện hồi quy từ render thanh dầu hoặc đèn nhấp nháy. Ghi rõ mốc commit và gắn tag `phase-3` theo hướng dẫn lab. [Mốc bàn giao](https://github.com/VinUni-AI20k/K5-L3-LAB-Day12-AI-SDLC/blob/main/SUBMISSION.md)
