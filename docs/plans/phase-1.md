# Kế hoạch Phase 1 · Đảo Đèn Lồng

## 1. Mục tiêu và phạm vi

Hoàn thành **Đêm 1 – Đảo Bến**, một màn chơi 3D góc nhìn thứ ba trên trình duyệt. Trải nghiệm đã chốt là cổ tích Việt Nam ấm áp, khám phá là chính và căng nhẹ khi rời vùng sáng. Mây chạy quanh đảo, thu thập đom đóm, thắp năm Đèn Lồng Lớn và dùng xung sáng khi bị Bóng Mực dồn. Test Contract v1.0 là tiêu chí bắt buộc để nghiệm thu headless. [PRD-0 và Test Contract v1.0](../contracts/prd-0.md)

Phase 1 tập trung vào một vòng chơi từ lúc bắt đầu tới thắng hoặc thua, có điểm, HUD và chơi lại. Sau khi vòng chơi đạt tiêu chí nghiệm thu, dùng thời gian còn lại để chỉnh cân bằng và hiệu ứng. Phần trình bày thêm dùng trạng thái sẵn có của mô phỏng để giữ nguyên kết quả headless.

## 2. Thiết kế màn chơi và đồ họa

| Hạng mục | Thiết kế |
| --- | --- |
| Đảo Bến | Đảo tròn giữa biển mây, tâm đảo là điểm xuất phát `(0, 0, 0)`. Đặt `L1` và cụm đom đóm đầu tiên trong tầm nhìn. Bốn đèn còn lại tỏa ra các hướng, đủ khoảng trống để chọn thứ tự đi. |
| Mây và camera | Mây có nón lá treo đèn nhỏ. Camera sau lưng, hơi cao. `WASD` đi theo góc nhìn, chuột xoay camera, `Space` nhảy. |
| Đom đóm và đèn | Đom đóm có màu vàng rõ trên nền tối. Đèn đủ sáng thì đổi màu và làm vùng đất xung quanh sáng lên, giúp người chơi thấy tiến độ ngay trên đảo. |
| Bóng Mực | Tạo hình tím đen, chuyển động dễ nhận biết. Khi trúng xung, dùng tư thế hoặc màu để phân biệt trạng thái choáng. Va chạm phản hồi bằng HUD và hiệu ứng nhẹ. |
| HUD | Hiện đom đóm đang mang, số đèn đã sáng trên tổng năm đèn, số lửa, thời gian và điểm. Hiện `E · Nạp sáng` khi đến gần đèn phù hợp và trạng thái sẵn sàng của `Q`. Màn kết quả hiện lý do, điểm và nút chơi lại. |

Dùng hình khối low-poly và bảng màu giới hạn. Quầng sáng, vật liệu phát sáng và mảng màu trên mặt đất tạo hiệu ứng thắp đèn. Chế độ **Nhẹ** giới hạn độ phân giải render, gom đom đóm để giảm lượt vẽ và dùng hiệu ứng đơn giản. [Hướng dẫn hiệu năng WebGL](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)

## 3. Luật chơi và giả định cần kiểm chứng

| Luật | Phương án khởi điểm |
| --- | --- |
| Thu thập | Tự nhặt trong bán kính. Mang tối đa **8** đom đóm. Bố trí hoặc sinh theo seed đủ để thắp năm đèn và dùng xung vài lần. Bảo đảm cụm đầu đủ cho người chơi học cách thắp `L1`. |
| Nạp sáng | Nhấn `E` để nạp vào đèn chưa sáng gần nhất trong tầm. Cho phép nạp nhiều lần. Mỗi đèn cần **5** đom đóm, mỗi lần chỉ trừ lượng đèn còn thiếu. Nếu hai đèn cách đều, chọn theo ID để kết quả ổn định. |
| Nguy hiểm | Bắt đầu với **3** lửa. Va chạm làm mất một lửa, sau đó có thời gian miễn nhiễm ngắn. Giữ đom đóm đang mang (`hit_drop_ratio: 0`). Bóng Mực tránh vùng quanh đèn đã sáng. |
| Xung sáng | Nhấn `Q` tiêu **2** đom đóm, làm choáng và đẩy lùi các Bóng Mực trong tầm. Cần đủ sáng và qua thời gian hồi chiêu. Việc giữ phím chỉ kích hoạt một lần cho mỗi lần nhấn. |
| Biên đảo | Giới hạn di chuyển ở mép đảo (`fall_enabled: false`). Vị trí do scenario đặt phải được phản ánh đúng tại tick 0. |
| Kết thúc | **180 giây** mỗi đêm. Thắng khi cả năm đèn sáng (`all_lit`). Thua khi hết lửa (`no_flames`) hoặc hết giờ (`dawn`). Nếu nhiều điều kiện xuất hiện cùng tick, ưu tiên thắp đủ đèn, rồi hết lửa, rồi hết giờ. Ghi và test thứ tự này như một giả định thiết kế. |
| Điểm | Thử **10** điểm mỗi đom đóm, **100** mỗi đèn và **20** mỗi Bóng Mực bị choáng. Khi thắng, cộng **1** điểm mỗi giây nguyên còn lại và **25** mỗi lửa còn lại. Cộng thưởng kết thúc đúng một lần. |

Các giá trị trên là mốc chơi thử. Trong lần cân bằng đầu, điều chỉnh tốc độ, bán kính, thời điểm Bóng Mực xuất hiện, hồi chiêu và miễn nhiễm. Thử một lượt khám phá chậm và một lượt có dùng xung. Sau khi đo, ghi giá trị thực tế và lý do thay đổi vào `WORKLOG.md`. Mọi giá trị công bố trong `tuning` phải khớp với mô phỏng.

## 4. Kiến trúc và lệnh dự kiến

| Phần | Trách nhiệm |
| --- | --- |
| `src/sim/` | JavaScript ES modules thuần cho trạng thái màn, RNG theo seed và bước mô phỏng cố định `1/60` giây. Nhận tuning, input và scenario, trả trạng thái và sự kiện. |
| `src/web/` | Vite và Three.js. Đọc bàn phím, chuột, đưa input vào mô phỏng và hiển thị bằng WebGL 2. Cập nhật camera, HUD và hiệu ứng theo nhịp vẽ. Chế độ Nhẹ chỉ điều chỉnh hiển thị. |
| `scripts/headless.js` | CLI Node.js đọc các cờ của contract, chạy cùng lõi và ghi JSONL. Chạy ngay khi có dữ liệu, với tốc độ do máy xử lý được. |
| `tests/` | Test logic và scenario nhỏ chạy qua CLI. Dùng `npm test` để chạy toàn bộ bằng test runner của Node.js. |
| `game.contract.json` | Công bố `contract_version`, `team`, các lệnh và tuning. Trình duyệt và CLI đọc cùng bộ tuning từ tệp này rồi truyền vào lõi. |

Các lệnh dự kiến sau khi dựng dự án là `npm ci` (`build_cmd`), `npm run dev` (`run_cmd`), `node scripts/headless.js` (`headless_cmd`) và `npm run build` để tạo bản web tĩnh. Người dùng đã xác nhận máy của mình chạy được WebGL. Bước đầu sẽ mở cảnh WebGL 2 để xác nhận đúng phiên bản renderer cần. [Tài liệu WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html)

Các quy tắc phải giữ khi tích hợp hai đường chạy:

- Sau khi dựng scenario, ghi snapshot tick 0 trước input. Input của bước `k` tạo trạng thái và sự kiện ở tick `k+1`. Dừng sau đúng số bước yêu cầu hoặc khi có kết quả thắng/thua. `sim_tick` bằng `tick` trong Phase 1.
- Input giữ giá trị các trường vắng mặt. `jump`, `interact` và `pulse` kích hoạt khi chuyển từ `false` sang `true`. Chuẩn hóa vector đi chéo trước khi áp dụng tốc độ theo góc camera.
- Tính bán kính trên mặt phẳng XZ, lấy cả điểm nằm đúng ranh giới. Áp dụng override, cờ sinh ngẫu nhiên và mảng rỗng theo contract. Dựng scenario giữ điểm ban đầu và chưa phát sự kiện.
- Dùng seed cho quá trình sinh thực thể và cấp ID ổn định. Chỉ làm tròn tọa độ đến ba chữ số thập phân khi ghi JSONL. Ghi các snapshot theo tần suất yêu cầu và một dòng `end` ở cuối. Tệp input hoặc scenario sai định dạng phải ghi lỗi ra `stderr` và trả mã `2`.

## 5. Thứ tự triển khai

| Mốc | Việc thực hiện | Điều kiện hoàn thành |
| --- | --- | --- |
| **A · Nền tảng** | Dựng dự án, mở cảnh hộp xoay trên trình duyệt, thêm manifest và CLI tối thiểu. | Cảnh chạy trên máy mục tiêu. Harness xác nhận hai lần chạy cùng tham số có snapshot tick 0 và dòng `end` giống nhau. |
| **B · Vòng chơi đầu tiên** | Làm di chuyển, nhảy, camera, đom đóm và nạp một đèn. Giữ năm ID đèn trong dữ liệu màn và tập trung kiểm tra `L1` trước. | Mây tới được `L1` trong trình duyệt. Scenario kiểm tra di chuyển, nhặt, nạp từng phần và thắp đèn. |
| **C · Hoàn thành mô phỏng Đêm 1** | Hoàn thiện bố cục năm đèn, sinh Bóng Mực, va chạm, vùng sáng, xung, đồng hồ, điểm và các kết thúc. Hoàn chỉnh validation CLI. | `npm test` kiểm tra cả ba kết thúc, tương tác chính, lỗi tệp đầu vào và tính tất định. |
| **D · Hoàn thành bản chơi** | Lắp đồ họa low-poly, HUD, màn kết quả, chơi lại và chế độ Nhẹ. | Chơi được từ lúc bắt đầu tới thắng hoặc thua, rồi chơi lại. Quan sát người chơi mới tìm và thắp được đèn đầu tiên mà không cần chỉ đường. |
| **E · Kiểm chứng và bàn giao** | Chơi toàn màn, đo hiệu năng, chạy lại scenario và thử từ bản clone sạch. Lưu bằng chứng và hoàn thành README. | Có thể tái lập kết quả theo README và truy vết từng yêu cầu chính đến bằng chứng khớp với mã chuẩn bị gắn tag. |

## 6. Kiểm chứng và bằng chứng

| Nội dung | Cách kiểm chứng | Bằng chứng lưu lại |
| --- | --- | --- |
| Tick, seed và schema | Chạy cùng đầu vào hai lần. Kiểm `--ticks 0`, số bước khi đang chơi, dừng sớm khi kết thúc, chu kỳ snapshot, đối chiếu tick giữa input và event. Thử scenario có mảng rỗng và đèn sáng sẵn. | Lệnh, fixture, JSONL và kết quả test. |
| Di chuyển và đom đóm | Đi thẳng và đi chéo, xoay camera 90°, nhảy và tiếp đất. Đặt đom đóm đúng bán kính rồi thử nhặt khi túi đầy. | Kết quả test tọa độ, `mote_picked` và số lượng đang mang. |
| Thắp đèn và xung | Thử nạp thiếu rồi nạp đủ, giữ `E`, dùng `Q` khi thiếu sáng hoặc còn hồi chiêu. Kiểm đẩy lùi, thời gian choáng, va chạm trong khoảng miễn nhiễm và Bóng Mực tránh vùng sáng. | Test đối chiếu `deposit`, `lantern_lit`, `pulse`, `player_hit` và thay đổi trạng thái. |
| Kết thúc và lỗi CLI | Tạo scenario cho `all_lit`, `no_flames`, `dawn` và trường hợp nhiều điều kiện cùng tick. Đối chiếu điểm cuối. Thử JSON hỏng và input có tick trùng. | `game_over`, dòng `end`, mã thoát và `stderr`. |
| Trải nghiệm trên web | Chơi một lượt thắng, một lượt thua, rồi chơi lại. Quan sát một người mới đi đến đèn đầu tiên, ghi chỗ họ dừng hoặc cần trợ giúp. | Clip hoặc ảnh kèm ghi chú về camera, HUD, vùng sáng và trạng thái sau khi chơi lại. |
| Hiệu năng | Chạy bản build ở chế độ Nhẹ, render 1280 × 720. Để cảnh ổn định 5 giây rồi đo 60 giây trên cùng tuyến có đèn, đom đóm, Bóng Mực và xung. Mục tiêu nội bộ là trung bình từ **30 FPS**. Ghi thêm p95 thời gian khung hình để theo dõi hiện tượng giật. | Cấu hình máy, hệ điều hành, trình duyệt, độ phân giải render, tuyến đo, FPS trung bình và p95. Dùng máy hiện có trước và ghi cấu hình thực tế. |

Lệnh smoke dự kiến ở mốc A, sau khi khai báo manifest và CLI:

```sh
python3 scripts/verify-headless.py --seed 42 --ticks 1 --out docs/proof/phase-1/smoke.jsonl
```

Dùng harness để đối chiếu hai lượt chạy. Dùng `npm test` để đối chiếu kết quả gameplay với kỳ vọng của từng scenario. Lưu bằng chứng tại `docs/proof/phase-1/` và ghi trạng thái đạt hoặc chưa đạt, lệnh tái lập và lý do trong `WORKLOG.md`. [Harness hiện có](../../scripts/verify-headless.py) · [Nhật ký lab](../../WORKLOG.md)

## 7. Checklist bàn giao

- [ ] Game chơi được trên trình duyệt, có đủ năm đèn, ba lý do kết thúc, điểm, HUD và chơi lại.
- [ ] `game.contract.json` đầy đủ. Các lệnh và headless hoạt động sau khi cài từ bản clone sạch trên macOS hoặc Linux.
- [ ] README có hướng dẫn cài và chơi trong tối đa ba lệnh, điều khiển, cách tính điểm, cách chạy test/headless và liên kết bằng chứng. Ghi nguồn và giấy phép nếu dùng asset ngoài. Thêm mục “Sáng tạo của tôi” nếu có phần mở rộng.
- [ ] Bằng chứng khớp mã nộp. `WORKLOG.md` có giả định, giờ làm theo ICT, phần chưa đạt, nhật ký AI và ước tính token hoặc chi phí nếu có số liệu.
- [ ] Lưu harness trong lịch sử Git. Đến hạn, gắn và push tag `phase-1` theo quy định lab. [Hướng dẫn nộp bài](https://github.com/VinUni-AI20k/K5-L3-LAB-Day12-AI-SDLC/blob/main/SUBMISSION.md)
