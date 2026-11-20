# Đảo Đèn Lồng · Phase 3 ("Đèn cạn dầu" · Contract v1.2)

Game 3D góc nhìn thứ ba bằng **JavaScript, Vite và Three.js (WebGL 2)** với lõi mô phỏng cố định **60 tick/giây** dùng chung cho trình duyệt và CLI headless (Test Contract v1.2).

## Cài đặt và chơi (2 lệnh)

Yêu cầu Node.js `>= 20` và npm.

```sh
npm ci
npm run dev
```

Mở địa chỉ hiển thị trên terminal (mặc định `http://127.0.0.1:5173/`). Có thể thêm `?light=1` hoặc bấm nút **Chuẩn / Nhẹ** ở góc trên bên phải để chuyển chế độ đồ họa, hoặc bật **Bảng màu dễ phân biệt** trong **Cài đặt**.

## Điều khiển

| Phím / Thao tác | Hành động |
| --- | --- |
| `W A S D` / `↑ ↓` | Di chuyển Mây theo hướng camera (6.0 m/s, 7.2 m/s khi có Bùa Gió) |
| Kéo chuột hoặc `← →` | Xoay camera quanh Mây (chỉnh độ nhạy trong Cài đặt) |
| `Space` | Nhảy tại mặt đỡ (7.0 m/s, trọng lực −20 m/s²) |
| `Shift` | Lướt (14 m/s trong 0.2 s, hồi 1.5 s; bỏ qua hồi chiêu khi có Bùa Gió) |
| `E` | Nạp đom đóm thắp đèn (10 lần đầu / 5 thắp lại) hoặc châm dầu (+10 dầu/đom đóm, tối đa 100) |
| `Q` | Tỏa Sáng (tốn 3 đom đóm, bán kính 3D 5 m, hồi 3 s, choáng 120 tick & đẩy 4 m) |
| `Esc` / `P` | Tạm dừng / Tiếp tục |

## Luật chơi & Cách tính điểm (Contract v1.2)

- **Giữ đèn sáng đến bình minh**: Đêm 1 / 2 / 3 kéo dài **240 / 270 / 300 giây**. Cần giữ ít nhất **60%** số đèn đang sáng tại tick bình minh (**3/5**, **4/6**, **5/7**) để thắng (`dawn_survived`).
- **Nhiên liệu & Bóng Mực hút dầu**: Đèn sáng bắt đầu với `100` dầu, tự hao `1/giây`. Khi `fuel < 30`, đèn nhấp nháy và mất vùng an toàn; Bóng Mực `wander` có thể áp sát `drain` hút `5 dầu/giây`.
- **Sức chứa động**: Khởi điểm `10`, tăng `+2` sau mỗi lần thắp thành công trong đêm (tối đa `20`).
- **Điểm**: **+5** mỗi đom đóm nạp/châm · **+100** thắp lần đầu · **+40** thắp lại · **+5** mỗi Bóng Mực trúng Tỏa Sáng (**+15** nếu đang `drain`) · thưởng bình minh khi thắng: **+50 + floor(fuel)** mỗi đèn đang sáng + **+50** mỗi Ngọn Lửa còn lại.

## Chạy test và kiểm chứng headless

```sh
npm test
npm run build
python3 scripts/verify-headless.py --night 1 --seed 42 --ticks 200 --scenario tests/fixtures/p3-lifecycle-scenario.json --inputs tests/fixtures/p3-interact-inputs.json --out /tmp/p3-lifecycle.jsonl
```

Chạy trực tiếp CLI headless cho từng Đêm (`--night 1|2|3`):

```sh
node scripts/headless.js --night 1 --seed 42 --ticks 120 --out /tmp/smoke-night1.jsonl
node scripts/headless.js --night 2 --seed 42 --ticks 180 --out /tmp/smoke-night2.jsonl
node scripts/headless.js --night 3 --seed 42 --ticks 180 --out /tmp/smoke-night3.jsonl
```

## Bằng chứng và nhật ký

- Nhật ký & giả định: [WORKLOG.md](WORKLOG.md)
- ADR vòng đời đèn & bình minh: [docs/adr/0001-lantern-fuel-and-dawn.md](docs/adr/0001-lantern-fuel-and-dawn.md)
- Changelog v1.2: [CHANGELOG.md](CHANGELOG.md)
- Hợp đồng & tuning: [game.contract.json](game.contract.json) · [Ticket-03](docs/contracts/ticket-3.md)
- Bằng chứng Phase 3: [docs/proof/phase-3/](docs/proof/phase-3/)
- Bằng chứng Phase 2 (mốc v1.1): [docs/proof/phase-2/](docs/proof/phase-2/)
- Bằng chứng Phase 1 (mốc v1.0): [docs/proof/phase-1/](docs/proof/phase-1/)
