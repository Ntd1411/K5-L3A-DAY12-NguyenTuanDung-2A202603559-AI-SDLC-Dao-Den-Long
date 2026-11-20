# Repository Guidelines

## Nguồn yêu cầu

Đảo Đèn Lồng là bài lab cá nhân qua bốn phase. Bắt đầu với [PRD-0 và Test Contract v1.0](docs/contracts/prd-0.md). Khi phase tiếp theo được phát hành, đọc ticket trên [bảng lab](https://claude.ai/artifact/Q1RYyv1dxjUczzCbd2ZnoW) và xác định yêu cầu cũ nào đã thay đổi. Xem quy trình và mốc bàn giao tại [GUIDE](https://github.com/VinUni-AI20k/K5-L3-LAB-Day12-AI-SDLC/blob/main/GUIDE.md) và [SUBMISSION](https://github.com/VinUni-AI20k/K5-L3-LAB-Day12-AI-SDLC/blob/main/SUBMISSION.md).

## Skills cho Phase 1

Đọc [kế hoạch Phase 1](docs/plans/phase-1.md), rồi mở trực tiếp `SKILL.md` theo phần việc. Các skill và tài liệu tham chiếu nằm trong repo. [Nguồn Game Studio](vendor/game-studio/UPSTREAM.md)

- Dùng [three-webgl-game](vendor/game-studio/skills/three-webgl-game/SKILL.md) khi dựng cảnh, camera và vòng hiển thị.
- Dùng [game-playtest](vendor/game-studio/skills/game-playtest/SKILL.md) khi chơi thử và thu bằng chứng trên trình duyệt.
- Dùng [game-ui-frontend](vendor/game-studio/skills/game-ui-frontend/SKILL.md) khi làm HUD, menu hoặc màn chơi lại.
- Dùng [web-3d-asset-pipeline](vendor/game-studio/skills/web-3d-asset-pipeline/SKILL.md) khi đưa mô hình GLB hoặc glTF vào game.

Ưu tiên PRD-0 và kế hoạch repo khi áp dụng skill. Dùng JavaScript, Vite, Three.js và một lõi mô phỏng 60 tick/giây dùng chung cho web và Node.js. Mỗi mốc bàn giao kèm lệnh tái lập, kết quả và bằng chứng đã thu thập.

## Làm việc theo phase

1. Trước khi sửa mã, ghi giả định, tiêu chí nghiệm thu và cách kiểm chứng trong [`WORKLOG.md`](WORKLOG.md).
2. Làm từng thay đổi nhỏ. Tách mô phỏng khỏi hiển thị. Giữ tên trường, cờ CLI, sự kiện và ID theo contract. Dùng đúng giá trị `tuning` đang chạy trong game.
3. Chạy test của phần mới và kiểm chứng hồi quy còn hiệu lực. Ghi lý do khi ticket thay đổi khiến test cũ cần sửa hoặc bỏ.
4. Ghi lệnh, kết quả, đường dẫn bằng chứng và phần chưa đạt. Ghi lỗi AI, điều chỉnh harness, token hoặc chi phí ước tính và một nhận xét cuối phase.

## Chạy và kiểm chứng

Khi có game, khai báo `build_cmd`, `run_cmd` và `headless_cmd` trong `game.contract.json` ở thư mục gốc. Viết hướng dẫn cài và chơi trong tối đa ba lệnh ở `README.md`, rồi thử từ bản clone sạch trên macOS hoặc Linux. Ghi điều khiển, cách tính điểm và cách chạy test. Nếu có phần sáng tạo, ghi vào mục “Sáng tạo của tôi” kèm bằng chứng phần lõi vẫn đạt.

Sau khi chạy `build_cmd`, dùng harness Phase 1 để kiểm tra snapshot tick 0, dòng `end` và tính tất định. Truyền thêm `--scenario` và `--inputs` để kiểm tra từng kịch bản.

```sh
python3 scripts/verify-headless.py --out docs/proof/phase-1/smoke.jsonl
```

Kiểm chứng riêng quy tắc 60 tick/giây, hành vi chơi và mã thoát `2` khi tệp đầu vào sai định dạng. Lưu ảnh hoặc clip cho HUD và các phần cần quan sát trực tiếp. Đánh dấu đạt dựa trên kết quả chạy thật.

## Git và bàn giao

Giữ commit nhỏ và thông điệp rõ. Lưu harness trong lịch sử Git, giữ bằng chứng khớp mã tại tag và loại `.env` cùng khóa API khỏi commit. Đến hạn, push tag `phase-1` đến `phase-4` tương ứng với từng mốc và ghi rõ phần còn thiếu. Phase 4 có Release `v1.0.0` kèm bản chạy được và video `.mp4` dưới 5 phút, liên kết ở đầu README.
