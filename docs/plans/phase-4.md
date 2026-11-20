# Kế hoạch Phase 4 · Ticket-04 “Bình minh: phát hành v1.0.0”

## 1. Mục tiêu và thứ tự giao việc

Nâng hợp đồng lên **v1.3**, thêm benchmark, soak test, bảng xếp hạng cục bộ và các tùy chọn tiếp cận. Đóng gói game và bàn giao tag `phase-4` cùng GitHub Release `v1.0.0`. Lấy commit đã nghiệm thu Phase 3 làm mốc hồi quy. Mọi yêu cầu v1.0–v1.2 còn hiệu lực tiếp tục được kiểm thử. [Ticket-04](../contracts/ticket-4.md) · [Kế hoạch Phase 3](phase-3.md)

| Mốc | Giao việc | Điều kiện bàn giao |
| --- | --- | --- |
| **A · Lệnh chạy và đo** | Cập nhật manifest và dựng launcher web, benchmark, soak. Viết test cho công thức và schema trước khi chạy phép đo thật. | Lệnh nhận đúng cờ contract, về mã `0` khi hoàn tất và xuất JSON có thể đọc máy. |
| **B · Tải chuẩn và tối ưu** | Xác nhận cảnh benchmark, chạy soak một tiến trình, tìm chi phí render và bộ nhớ qua số đo. | Có `bench.json` và `soak.json` từ bản chạy thật. Mỗi lần đổi tối ưu có số liệu trước/sau trên cùng cấu hình. |
| **C · Bảng xếp hạng và tiếp cận** | Nối lưu điểm, xuất CLI, đổi phím, chỉ báo hình ảnh, giảm chuyển động và cỡ chữ. | Browser kiểm được các luồng lưu, tải lại, xuất điểm và thao tác cài đặt. |
| **D · Hồi quy và phát hành** | Thử clone sạch, đóng gói bản chạy, làm tài liệu, retro, demo, tag và Release. | Bằng chứng khớp commit nộp, gói chạy và video mở được từ repo công khai. |

Dùng `three-webgl-game` khi tối ưu render, `game-ui-frontend` cho bảng điểm và cài đặt, `game-playtest` để thu bằng chứng. Mỗi mốc bàn giao kèm lệnh tái lập và kết quả thực. [Hướng dẫn agent](../../AGENTS.md)

## 2. Contract v1.3 và cách chạy bản web

- Cập nhật `game.contract.json` thành `1.3`, khai báo `bench_cmd` và `soak_cmd` dự kiến là `node scripts/bench.js` và `node scripts/soak.js`. Duy trì `headless_cmd`, schema sự kiện và các cờ đang dùng. Chạy hồi quy ba đêm với dầu, hút dầu, châm dầu, thắp lại, bình minh, pause và bảng màu của v1.2.
- Phương án cho `run_cmd` là `node scripts/run.js`. Launcher dùng chung gói web Vite và kho bảng xếp hạng cục bộ. Chế độ chơi phục vụ bản build qua HTTP loopback. Nhánh `--export-leaderboard out.json` đọc cùng kho và xuất JSON trực tiếp từ CLI. Ghi điều kiện build và cách chọn trình duyệt trong README. Từ clone sạch, quy trình chơi tối đa ba lệnh, dự kiến `npm ci`, `npm run build`, rồi `node scripts/run.js`.
- Dùng lệnh build trong manifest để người chấm có đủ phụ thuộc và `dist/` trước khi gọi bench hoặc run. Launcher phải báo lỗi có thể xử lý nếu thiếu trình duyệt phù hợp hoặc thiếu bản build. Các chế độ bench/soak tắt phần sáng tạo có thể làm lệch cảnh chuẩn hay số đo.

## 3. Benchmark 1280×720

### Cảnh tải chuẩn

- Mở Chromium có cửa sổ, viewport và kích thước render 1280×720, tỷ lệ pixel 1, chế độ Chuẩn của bản build. Dùng cùng hiệu ứng và ánh sáng với bản chơi. Ghi phiên bản Chromium, Three.js, bộ dựng hình WebGL, GPU, hệ điều hành, chế độ nguồn và cấu hình máy.
- Nạp Đêm 1. Tạo đúng **200 Bóng Mực** `wander` rải đều theo seed 42 và **100 đom đóm**. `L1`–`L3` sáng với 100 dầu. Tắt sinh thêm, sát thương, nhặt đồ, hao dầu và điều kiện kết thúc. Bóng giữ hành vi di chuyển `wander` của lõi v1.2.
- Mây ở `(0,0,0)` với input trung tính. Camera bắt đầu tại `(30,15,0)`, nhìn tâm, quay ngược chiều kim đồng hồ khi nhìn từ trên xuống, bán kính 30 m và chu kỳ 15 giây. Test tọa độ bắt đầu và sau một vòng. Khởi động 3 giây, đo đúng `--duration`, lưu JSON và đóng cửa sổ, server và tiến trình tự khởi chạy.

### Cách lấy số và điều kiện đạt

| Trường | Cách kiểm chứng |
| --- | --- |
| `contract_version` | `bench.json` ghi chuỗi `"1.3"`. Test đầy đủ tên, kiểu và đơn vị các trường trước khi ghi tệp. |
| `frames`, `avg_fps` | Ghi khoảng thời gian giữa các khung trong cửa sổ đo cố định, giữ cả khung giật. Kiểm `avg_fps = 1000 × N / Σdt` và ghi thêm thời gian đo thực trong nhật ký để đối chiếu số khung. |
| `p1_low_fps`, `frame_ms_p95` | Lấy `k = max(1, ceil(0.01 × N))`, chia 1000 cho trung bình `k` khoảng khung chậm nhất. Tính p95 từ dãy `dt` và test công thức bằng một dãy mẫu biết trước. |
| `load_ms`, `peak_mem_mb` | Tính thời gian nạp từ lúc launcher bắt đầu tới khung đầu của cảnh. Ghi RSS đỉnh của tiến trình phù hợp, hoặc `null` kèm giải thích trong README nếu bản web thiếu số đo này. |
| `vsync_off`, `renderer`, `os` | Ghi giá trị thực tế và phiên bản. Chỉ đặt `vsync_off: true` khi xác minh đã tắt. Ghi giới hạn VSync của trình duyệt trong README nếu vẫn bật. |

Chạy `node scripts/bench.js --seed 42 --duration 30 --out docs/proof/phase-4/bench.json`. Ngưỡng chấm trên máy giảng viên là **`avg_fps ≥ 60`**, **`p1_low_fps ≥ 30`** và **`load_ms ≤ 10000`**. Ghi rõ máy chấm hoặc máy tự đo. Số tự đo dùng để so hồi quy và dẫn hướng tối ưu.

Với tải 200 Bóng, đo riêng số lượt vẽ, chi phí bóng đổ, CPU cập nhật cảnh và frame chậm. Ưu tiên dùng chung hình học/vật liệu, gom vật thể lặp và giảm cấp phát trong vòng render. Chạy lại cảnh chuẩn sau mỗi thay đổi và so ảnh với bản chơi để giữ hiệu ứng theo ticket.

## 4. Soak test một tiến trình

Chạy `node scripts/soak.js --seed 7 --nights 10 --out docs/proof/phase-4/soak.json`. Một tiến trình Node.js dùng cùng lõi gọi tạo, chạy và reset từng đêm theo vòng `1 → 2 → 3` tới đủ 10 kết quả. Mỗi đêm kết thúc theo trạng thái game hoặc hết thời lượng v1.2. Ghi quy ước chỉ số `i` dùng cho seed `7 + i` và dùng một luồng RNG input riêng để lần chạy có thể tái lập.

- Đổi hướng mỗi 30 tick. Mỗi tick lấy xác suất input nhảy 5%, lướt 3%, Tỏa Sáng 2%, tương tác 10% và đưa qua xử lý cạnh lên của lõi. Test seed lặp lại cho cùng chuỗi input và kết quả.
- Đo RSS `mem_start_mb` sau tải đêm đầu, `mem_end_mb` sau reset cuối. Giải phóng tham chiếu tới đêm trước khi đo. Lưu `nights`, `crashes`, `results`, hai số RSS và `duration_s`. Kiểm `results.length = 10`, **`crashes = 0`** và **`mem_end_mb ≤ 1.2 × mem_start_mb`**.
- Giữ JSON đo vào repo cùng lệnh, môi trường và mốc commit. Dùng log chi tiết để phân tích lỗi reset, giữ thực thể qua đêm hoặc tăng RSS nếu phép đo chưa đạt.

## 5. Bảng xếp hạng cục bộ

- Mở nhập tên từ màn **Bình Minh** sau thắng Đêm 3 và từ màn thua ở bất kỳ đêm nào. Kiểm tên `^[A-Za-z0-9_]{3,12}$`; hỗ trợ tiếng Việt là phần cộng điểm. Ghi `name`, `score`, `nights_won`, `achieved_at` ISO 8601 có múi giờ và seed lượt chơi. Tính điểm từ các đêm đã thắng, kể cả khi đêm hiện tại thua.
- Dùng kho JSON trên đĩa mà cả launcher, giao diện và nhánh xuất CLI cùng đọc. Ghi file qua tệp tạm rồi đổi tên để kết quả còn nguyên nếu quá trình ghi bị gián đoạn. Sắp điểm giảm dần, hòa điểm sắp thời điểm đạt sớm trước, cắt còn 10. Dùng thứ tự ổn định khi hai thời điểm giống nhau.
- Mở **Bảng xếp hạng** từ menu. Kiểm tên sai và tên đúng ở hai đầu 3/12 ký tự, chèn mục thứ 11, hòa điểm qua hai múi giờ, thua ở từng đêm và thắng đủ ba đêm. Tắt hẳn launcher, mở lại và so bảng trên UI với `node scripts/run.js --export-leaderboard /tmp/leaderboard.json` có `{"entries":[...]}` theo đúng thứ tự.

## 6. Dễ tiếp cận và kiểm tra trình duyệt

| Yêu cầu | Tiêu chí nghiệm thu |
| --- | --- |
| **Đổi phím** | Đổi được 4 hướng, nhảy, lướt, tương tác, Tỏa Sáng và pause. Trùng phím có báo lỗi và giữ cài đặt trước đó. Nút **Khôi phục mặc định** trả toàn bộ bảng về mặc định. Tải lại trang và thử phím mới trong game. |
| **Chỉ báo thay âm thanh** | Tắt âm lượng rồi thử Bóng Mực xuất hiện có mũi tên hướng ở mép màn, cảnh báo gió, 10 giây cuối và đèn yếu dưới 30 dầu. Kiểm mũi tên Bóng Mực tách biệt với mũi tên tìm đèn theo trạng thái quan sát được. |
| **Giảm chuyển động** | Bật tùy chọn rồi thử bị đánh và các hiệu ứng có rung hoặc chớp màn. Cảnh báo bằng chữ hoặc biểu tượng vẫn hiển thị. |
| **Cỡ chữ** | Kiểm cỡ chữ hiển thị thực tế từ **18 px** ở 1280×720 trên HUD, menu, thông báo, bảng điểm và cài đặt. Bật **Chữ lớn ×1.25**, kiểm phần tử nhỏ nhất và các dòng tên dài để phát hiện tràn hoặc che nút. |

Lưu ảnh và clip của cài đặt sau tải lại, chỉ báo khi tắt âm lượng và bản chữ lớn. Kiểm lại chế độ bảng màu dễ phân biệt của Phase 3 cùng các tùy chọn mới.

## 7. Bàn giao `v1.0.0`

- [ ] Từ clone sạch, chạy lệnh cài/chơi trong tối đa ba bước, `npm test`, `npm run build` và các lệnh headless, bench, soak. Chơi qua ba đêm và kiểm lại luồng thua, chơi lại, pause và lưu cài đặt.
- [ ] Commit `bench.json`, `soak.json` do lệnh thật tạo cùng bằng chứng hồi quy tại `docs/proof/phase-4/`. Cập nhật `README.md` với mô tả, ảnh/GIF, cấu hình, thao tác cài, điều khiển và các lệnh test, headless, bench, soak.
- [ ] Tạo `CHANGELOG.md` cho cả bốn phase, `CREDITS.md` cho mọi asset, âm thanh và công cụ AI tạo nội dung, và `LICENSE`. Ghi retro 1–2 trang về Evaluation các phase, lỗi AI, cách phát hiện, harness hữu ích, token/chi phí ước tính, cách tiết kiệm và điều sẽ đổi nếu làm lại.
- [ ] Gói đề xuất là web tĩnh Vite kèm launcher Node và hướng dẫn chạy, ví dụ `dao-den-long-web-v1.0.0.zip`. Giải nén ở thư mục sạch, thử chơi và xuất bảng xếp hạng trước khi đính Release.
- [ ] Quay demo `.mp4` **dưới 5 phút** có chơi thật, kết quả test, headless và bench. Đính Release hoặc lưu `docs/demo/demo.mp4` khi dưới **100 MB**. Đặt link ở đầu README.
- [ ] Xác minh tag `phase-1` đến `phase-4` đúng commit và bằng chứng. Tạo GitHub Release `v1.0.0` từ bản đã nghiệm thu Phase 4. Thử mở repo, tải gói chạy và xem video khi chưa đăng nhập. Ghi rõ phần còn thiếu nếu có. [Hướng dẫn nộp bài](https://github.com/VinUni-AI20k/K5-L3-LAB-Day12-AI-SDLC/blob/main/SUBMISSION.md)
