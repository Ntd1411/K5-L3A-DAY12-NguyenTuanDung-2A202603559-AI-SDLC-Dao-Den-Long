# Kế hoạch Phase 2 · Ticket-02 “Ba hòn đảo”

## 1. Mục tiêu và mốc hồi quy

Chuẩn hóa Đêm 1 theo Test Contract v1.1, thêm Đêm 2 – Đảo Cau và Đêm 3 – Đảo Chuông, rồi nối ba đêm thành một lượt chơi trên trình duyệt. Dùng JavaScript, Vite, Three.js và lõi mô phỏng 60 tick/giây dùng chung cho web và Node.js. Ticket-02 là nguồn chuẩn cho cơ chế, tọa độ, màu sắc và schema. [Ticket-02](../contracts/ticket-2.md) · [PRD-0](../contracts/prd-0.md)

Mốc hồi quy cục bộ là commit `f3973e2`. Bản này đã qua 14 test, build và đối chiếu từng byte cho 5 bằng chứng JSONL. Ca hai đèn chồng vùng sáng cho `S1 = (4, 0, 3)` tại tick 1, cách cả hai đèn đúng 5 m. Giữ bộ bằng chứng v1.0 để tái lập tại mốc đó. Khi v1.1 thay đổi một kỳ vọng, ghi giá trị hoặc luật cũ, giá trị hoặc luật mới và điều khoản tương ứng. Chạy hành vi hồi quy Đêm 1 với số chuẩn mới. [Kế hoạch Phase 1](phase-1.md) · [Bằng chứng Phase 1](../proof/phase-1/)

## 2. Kiến trúc và thứ tự giao việc

Đưa hình học, điểm sinh và cấu hình riêng của mỗi đêm vào dữ liệu dùng chung. Lõi `src/sim/` xử lý vật lý, AI, thời gian và sự kiện. `src/web/` dùng trạng thái đó để vẽ, cập nhật HUD, điều hướng và phát âm thanh. CLI chạy một đêm theo `--night`. Chuỗi ba đêm và tổng điểm đã thắng thuộc lớp điều hướng của bản web.

| Mốc | Công việc | Điều kiện bàn giao |
| --- | --- | --- |
| **A · Contract và Đêm 1 chuẩn** | Cập nhật manifest, bộ đếm, CLI, schema và dữ liệu Đêm 1. Viết fixture cho di chuyển, pause và lượt nạp sáng đầu tiên. | `npm test` chạy được. CLI đọc `--night 1`, snapshot mới đúng schema, headless cùng seed cho JSONL giống từng byte. |
| **B · Cơ chế chuẩn** | Làm lướt, rơi và hồi sinh, đom đóm theo lịch, điểm, Bóng Mực, vùng an toàn, Tỏa Sáng và thứ tự va chạm. | Scenario xác nhận các ngưỡng, thời điểm sinh, thứ tự sự kiện và ba kết thúc. Chạy hồi quy Đêm 1. |
| **C · Đảo Cau và Đảo Chuông** | Dựng hình học và di chuyển trên cầu, bục, dốc và tầng. Thêm Gió Lạc, Bùa Gió và gió mạnh. | `--night 2` và `--night 3` chạy độc lập. Có fixture kiểm tra đường sang đảo, lên tầng cao và từng tính năng mới. |
| **D · Trải nghiệm trình duyệt** | Nối chuỗi ba đêm, màn kết quả và chơi lại, pause, cài đặt, âm thanh, HUD và bảng màu chuẩn. | Chơi trọn ba đêm đến màn Bình Minh, thử thua và chơi lại đúng đêm, kiểm ảnh hoặc clip cho các thay đổi giao diện. |
| **E · Nghiệm thu và bàn giao** | Chạy test, build, thử clone sạch, đo headless và FPS bản Chuẩn, cập nhật hướng dẫn và lưu bằng chứng. | Kết quả tái lập được từ README và đáp ứng checklist ở cuối tài liệu. |

Giao từng mốc theo thứ tự trên. Khi bàn giao mỗi mốc, agent gửi lệnh đã chạy, kết quả, liên kết bằng chứng và các mục còn chờ xác nhận. Dùng `three-webgl-game` cho cảnh 3D, `game-ui-frontend` cho HUD và menu, `game-playtest` cho kiểm chứng trình duyệt. [Hướng dẫn repo](../../AGENTS.md)

## 3. Chuẩn hóa lõi và Contract v1.1

- **Manifest và CLI.** Đặt `contract_version` thành `1.1`. Đồng bộ các giá trị chuẩn và khai báo `dash_speed`, `dash_duration_s`, `dash_cooldown_s`, `night2_duration_s`, `night3_duration_s`. Nhận `--night 1|2|3`, giữ mã thoát `2` và `stderr` cho JSON hoặc cấu trúc đầu vào sai. Thêm `--night` cho harness để chạy cùng seed và so đầu ra ở cả ba đêm. [Harness hiện có](../../scripts/verify-headless.py)
- **Tick và pause.** Dùng bộ đếm nguyên cho các khoảng thời gian theo tick. `tick` đi theo lượt xử lý input, kể cả khi pause. `sim_tick` và tất cả bộ đếm gameplay chỉ chạy khi mô phỏng tiến. Dùng `tick` để đọc frame và ghi mốc sự kiện, dùng `sim_tick` để lên lịch sinh. Giữ trạng thái input của trường bị lược bỏ và kích hoạt `dash`/`pause` theo cạnh lên. Test cả lệnh kết thúc trong lúc pause.
- **Thứ tự một bước.** Xử lý pause → giảm bộ đếm → di chuyển và kiểm rơi → nhặt đom đóm/bùa → nạp đèn → cập nhật vùng sáng → Tỏa Sáng → di chuyển kẻ địch → Gió Lạc cướp rồi Bóng Mực chạm theo ID → sinh thực thể → xét kết quả → snapshot. Thực thể vừa sinh chỉ tương tác từ tick kế tiếp.
- **JSONL.** Mọi snapshot khai báo `night`, `wind`, các trường mới của `player` và mảng `motes`, `drifters`, `charms`. `motes` có `kind` và `ttl_s`, `drifters` có `state` và `stolen`, `charms` có `available` và `respawn_s`. Đọc đầy đủ override và cờ mới của scenario, gồm bộ đếm player, trạng thái/timer Bóng Mực, `random_drifters` và `wind_enabled`. Các mảng thay thế mặc định phải hoạt động cả khi rỗng. Kiểm payload của `night_start`, `dash`, `paused`, `resumed`, `charm_picked`, `drifter_steal`, `drifter_drop` và `player_hit` có `lost` khi rơi.
- **Di chuyển và rơi.** Chạy 6 m/s, đạt tốc độ hoặc dừng trong tối đa 6 tick, điều khiển đầy đủ khi ở trên không. Nhảy tại mặt đỡ với vận tốc Y 7 m/s và trọng lực −20 m/s². Lướt 14 m/s trong 12 tick, hồi 90 tick tính từ lúc bắt đầu, lấy hướng di chuyển hoặc hướng đang quay mặt. Lướt trên không giữ độ cao và Mây vẫn có thể mất lửa. Khi Y xuống dưới −10, trừ đúng một lửa, mất toàn bộ đom đóm và bỏ qua bất tử. Mây còn lửa thì chờ 60 tick rồi hồi sinh ở điểm xuất phát, vận tốc về 0 và bất tử 90 tick. Trong thời gian chờ, số lần nhặt và bị chạm đều bằng 0.
- **Đom đóm, đèn và điểm.** Bắt đầu với 20 điểm sinh khác nhau. Sinh một con tại mỗi bội số 240 nếu dưới trần 30 và còn điểm trống. Nhặt trong XZ ≤ 1 m, chênh cao ≤ 1,5 m, túi tối đa 10. Mỗi đèn cần 10, tương tác trong 2 m, chọn đèn chưa sáng gần nhất rồi phá hòa bằng ID. Tính điểm tại nạp sáng (+10 mỗi đơn vị), thắp (+100), trúng Tỏa Sáng (+5 mỗi Bóng Mực mỗi lần) và khi thắng (+2 mỗi giây nguyên còn lại, +50 mỗi lửa). Thứ tự kết thúc là `no_flames` → `all_lit` → `dawn`.
- **Bóng Mực và vùng sáng.** Dùng đúng trạng thái `spawning`, `wander`, `chase`, `recoil`, `stunned`. Hai con đầu ở tick 300, các con sau theo lịch và giới hạn của từng đêm. ID ổn định, duy nhất kể cả với scenario. Kiểm bán kính phát hiện/bỏ đuổi 12/18 m, tốc độ 4 m/s hoặc 4,5 m/s ở Đêm 3 và điều kiện chạm XZ ≤ 1 m, chênh cao ≤ 1,5 m. Hit trừ tối đa một lửa mỗi tick, rơi `floor(carried/2)` trong vành 1,5–2,5 m, TTL 480 tick, nhặt từ tick sau, bất tử 90 tick. Bóng gây hit lùi 2 m trong 60 tick. Vùng sáng 6 m chặn Bóng ở mép, đưa Bóng mắc trong vùng mới thắp ra mép trong tối đa 30 tick và vô hiệu sát thương của Bóng trong lúc đẩy. Kiểm thêm vùng chồng nhau và vùng gần mép địa hình.
- **Tỏa Sáng.** Tốn 3 đom đóm, hồi 180 tick. Chốt mục tiêu trong bán kính 3D 5 m từ tâm cách chân Mây 0,8 m ngay lúc bấm. Choáng 120 tick, đẩy ngang tổng 4 m trong 15 tick đầu, dừng khi gặp vật cản và dùng +X khi trùng vị trí. Lần trúng mới làm mới cả hai hiệu ứng. Kiểm mục tiêu đúng biên, lệch tầng, bị chặn và đã choáng.

## 4. Ba bản đồ và các ca kiểm chứng

| Bản đồ | Dữ liệu cần hoàn thành | Kiểm chứng |
| --- | --- | --- |
| **Đêm 1 · Đảo Bến** | Đĩa R40, 5 đèn, 24 điểm đom đóm và 12 điểm Bóng Mực theo tọa độ/góc của ticket. Đêm dài 300 giây. Bóng sinh mỗi 480 tick sau lượt đầu và tối đa 6. | So vị trí với ticket, thử đi qua R40 để rơi, kiểm điểm sinh Bóng cách Mây ít nhất 15 m và sinh đúng lịch. |
| **Đêm 2 · Đảo Cau** | Hai đĩa R28, cầu tre `[26,44] × [-2,2]` trên XZ, 2 bục phóng, 6 đèn, 24 điểm đom đóm, 16 điểm Bóng và 1 Bùa Gió. Đêm dài 330 giây. Bóng sinh mỗi 420 tick sau lượt đầu và tối đa 8. | Đi qua và rơi cạnh cầu. Từ cả hai bục, thử hướng phóng giữ đến khi đáp, thêm một ca có lướt trên đường bay. Kiểm bùa tại `(35,0,0)`. |
| **Đêm 3 · Đảo Chuông** | Đĩa R45, các tầng Y=0/3/6, 2 dốc rộng 3 m, bục phóng lên tầng 2, tháp chuông, 7 đèn, 30 điểm đom đóm, 16 điểm Bóng, 2 Bùa Gió và gió mạnh. Đêm dài 360 giây. Bóng sinh mỗi 360 tick sau lượt đầu và tối đa 10. | Kiểm dốc, chặn vách và tháp, bước khỏi tầng cao, đáp bằng bục lên tầng 2 và nhặt đom đóm đúng tầng. Kiểm báo gió trước 120 tick, gió 2 m/s trong 300 tick mỗi 1.800 tick, và `wind_enabled: false`. |

Sinh tọa độ từ bộ dữ liệu chung, chuẩn hóa góc theo quy ước của Ticket-02. Kiểm hình học bằng tọa độ trước khi dựng cảnh. Một tuyến thử Đêm 2 cần qua cầu và gặp Gió Lạc. Một tuyến Đêm 3 cần tới đèn tầng cao và đi qua lúc gió mạnh.

## 5. Tiêu chí nghiệm thu cho từng tính năng Phần 3

| Tính năng | Tiêu chí quan sát và bằng chứng |
| --- | --- |
| **Gió Lạc** | Fixture Đêm 2/3 kiểm sinh mỗi 1.200 tick, tối đa 2, ID `D<n>`. Kiểm `idle` ở 2 m/s và `chase` ở 7 m/s khi Mây mang ít nhất 5 đom đóm và cách ≤ 15 m. Mất điều kiện thì về `idle`. Chạm trong 1,2 m thì cướp tối đa 3, chỉ một lần, bỏ chạy 240 tick và Mây giữ nguyên số lửa. Thử cướp trước Bóng Mực cùng tick, kể cả khi Mây bất tử hoặc đứng trong vùng sáng. Tỏa Sáng cắt đuổi và thu hồi đồ đã cướp từ con đang `flee`, có `drifter_drop` và mốc biến mất sau 120 tick. |
| **Bùa Gió** | Fixture kiểm vị trí `C1`/`C2`, nhặt theo ngưỡng của đom đóm và hiệu lực 600 tick, tốc độ 7,2 m/s, lướt 12 tick ở 14 m/s và bỏ qua hồi chiêu khi bùa còn hiệu lực. Test nhặt lại để làm mới, nhấn khi đang lướt, hết bùa và bùa xuất hiện lại sau 2.700 tick. Đối chiếu `charm_picked`, `charm_s` và `respawn_s`. |
| **Chuỗi ba đêm** | Dùng fixture kết thúc cho từng đêm để đối chiếu điểm. Trên web, đi từ menu qua giới thiệu tên đảo và lời Ông Đăng, chơi, tới kết quả rồi sang đêm kế. Mỗi đêm mới có 3 lửa. Thua cho phép chơi lại đúng đêm với tổng điểm các đêm đã thắng. Thắng Đêm 3 mở Bình Minh và cộng điểm mỗi đêm thắng đúng một lần. |
| **Tạm dừng** | Fixture pause qua các mốc hồi chiêu, TTL và sinh, kiểm `tick` vẫn tăng còn `sim_tick`, thời gian, vị trí và bộ đếm giữ nguyên. Test `paused`/`resumed` theo cạnh lên. Trên web thử `Esc` và `P`, lần lượt thử **Tiếp tục**, **Chơi lại Đêm**, **Cài đặt** và **Về menu**. |
| **Cài đặt** | Chỉnh âm lượng và độ nhạy chuột, tải lại trang rồi xác nhận cả hai giá trị được áp dụng. Chạy lại cùng fixture headless ở cấu hình mặc định để kiểm các điều khiển và trạng thái mô phỏng dùng cho đối chiếu. |
| **Âm thanh** | Fixture tạo các mốc gameplay để đối chiếu điểm phát cue. Playtest nghe nhạc nền đêm và hiệu ứng nhặt, thắp đèn, Tỏa Sáng, bị đánh, nhảy, lướt, thắng, thua, Bóng Mực xuất hiện và đếm ngược 10 giây cuối. Kiểm báo gió Đêm 3 và âm lượng sau khi tải lại. |
| **HUD** | Fixture tạo các trạng thái đếm ngược, túi đầy, gần đèn và hồi chiêu. Ở `1280×720`, kiểm lửa trên trái, đồng hồ trên giữa chuyển đỏ và nhấp nháy ở ≤ 30 s, đèn/điểm trên phải, 10 ô đom đóm dưới giữa, hồi chiêu dưới phải. Hiện `E — Nạp ánh sáng (x/10)` khi tới gần đèn. Xoay camera để kiểm mũi tên chỉ đèn chưa sáng gần nhất ngoài màn hình. |
| **Màu sắc và ánh sáng** | Kiểm từng vật liệu, màu UI và hiệu ứng theo bảng Hex của ticket với dung sai tối đa 10% mỗi kênh RGB. Lấy snapshot 0 đèn, giữa màn và đủ đèn làm đầu vào đối chiếu ảnh. Cường độ ánh sáng môi trường tại ba mốc theo `0.15 + 0.55 × (đèn sáng / tổng đèn)`. Giữ các mốc low-poly của Phase 1 tại vị trí phù hợp với bản đồ chuẩn. |

Chuẩn bị fixture headless cho từng tính năng để tái lập trạng thái và sự kiện. Các mục DOM, lưu cài đặt, âm thanh và màu sắc có thêm kiểm tra trình duyệt tương ứng. Dùng `npm test` để đối chiếu kỳ vọng gameplay và dùng harness để so tính tất định trên cả ba đêm.

## 6. Các quy ước cần chốt trước khi viết fixture

Ticket là chuẩn ưu tiên. Các điểm sau là phương án dự kiến cho những chỗ ticket chưa chỉ rõ. Ghi quyết định và lý do vào `WORKLOG.md`, đối chiếu khi có ví dụ hoặc giải thích chính thức.

- Đọc input theo `tick` kể cả khi pause, tiếp tục mô phỏng trong bước `resumed`. Kiểm và ghi riêng quy ước `end.state` khi CLI dừng giữa lượt pause. Ticket yêu cầu `paused` cho snapshot. Phương án mặc định giữ `end.state` thuộc ba giá trị v1.0 và dùng `playing` cho lượt dừng giữa pause.
- Ghi snapshot tick 0 sau khi dựng scenario, tiếp đến `night_start {night}` tại tick 0. Dùng `invuln` dạng boolean và các trường có hậu tố `_s` theo giây. Kiểm các giá trị tùy chọn và đại diện của TTL cho đom đóm thường trong fixture schema.
- Dùng các điểm sương từ bộ điểm sinh Bóng Mực chuẩn của Đêm 2/3 cho Gió Lạc. Thực thể sinh ở bước hiện tại được hiển thị ở snapshot của bước đó và bắt đầu tương tác ở bước sau. Dùng Shift cho lướt trên trình duyệt và giữ input headless theo contract.
- Với đom đóm, test ngưỡng trần cho sinh định kỳ và ghi cách đếm đom đóm rơi. Đảm bảo thao tác rơi do va chạm và hoàn trả do Gió Lạc giữ đúng số lượng, thời hạn và thời điểm có thể nhặt lại.

## 7. Checklist bàn giao

- [ ] `npm ci`, `npm test` và `npm run build` thành công từ bản clone sạch. README cập nhật lệnh chơi, phím mới, cách tính điểm và cách chạy `--night 1|2|3`. Đầu ra khi chạy thử đi vào tệp tạm hoặc tên riêng để bảo toàn bằng chứng đã lưu.
- [ ] Tất cả scenario headless có kỳ vọng cụ thể, gồm vòng chơi Đêm 1 với số chuẩn mới, lướt, rơi, safe zone, pause, ba kết thúc, bản đồ mới, Gió Lạc và Bùa Gió. Kỳ vọng Phase 1 bị thay đổi có ghi lý do. Chạy lại cùng seed để so JSONL từng byte.
- [ ] Đo một lượt headless Đêm 3 đủ **21.600 tick** trong **≤ 30 giây**. Dùng scenario cho phép sống đến bình minh và xác nhận `end.ticks` để phân biệt với lượt kết thúc sớm. Lưu lệnh, thời gian đo và kết quả.
- [ ] Đo bản **Chuẩn** ở **1280×720**, mục tiêu **≥ 30 FPS trung bình**. Đo sau 5 giây ổn định trong 60 giây trên tuyến có vật thể động và hiệu ứng, lưu FPS, p95, cấu hình máy, trình duyệt và cách lặp lại. Thu ảnh/clip chơi thử, đặc biệt cầu, bục, tầng cao, Gió Lạc và màn Bình Minh.
- [ ] Lưu test, JSONL, ảnh/clip và bản đo trong `docs/proof/phase-2/`. Ghi kết quả đạt/chưa đạt, giờ làm ICT, giả định và nhật ký AI trong `WORKLOG.md`. Cập nhật `AGENTS.md` và hướng dẫn skill cho phạm vi Phase 2, giữ dấu vết trong lịch sử Git.
- [ ] Xác nhận mốc nộp Phase 1 và bảo đảm bằng chứng đúng commit. Khi đến hạn Phase 2, gắn tag `phase-2` vào commit bàn giao và kiểm tra repo công khai theo quy định lab. [Hướng dẫn nộp bài](https://github.com/VinUni-AI20k/K5-L3-LAB-Day12-AI-SDLC/blob/main/SUBMISSION.md)
