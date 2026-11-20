# Đảo Đèn Lồng · Phase 2 ("Ba hòn đảo" · Contract v1.1)

Game 3D góc nhìn thứ ba bằng **JavaScript, Vite và Three.js (WebGL 2)** với lõi mô phỏng cố định **60 tick/giây** dùng chung cho trình duyệt và CLI headless (Test Contract v1.1).

## Cài đặt và chơi (2 lệnh)

Yêu cầu Node.js `>= 20` và npm.

```sh
npm ci
npm run dev
```

Mở địa chỉ hiển thị trên terminal (mặc định `http://127.0.0.1:5173/`). Có thể thêm `?light=1` hoặc bấm nút **Chuẩn / Nhẹ** ở góc trên bên phải để chuyển chế độ đồ họa.

## Điều khiển

| Phím / Thao tác | Hành động |
| --- | --- |
| `W A S D` / `↑ ↓` | Di chuyển Mây theo hướng camera (6.0 m/s, 7.2 m/s khi có Bùa Gió) |
| Kéo chuột hoặc `← →` | Xoay camera quanh Mây (chỉnh độ nhạy trong Cài đặt) |
| `Space` | Nhảy tại mặt đỡ (7.0 m/s, trọng lực −20 m/s²) |
| `Shift` | Lướt (14 m/s trong 0.2 s, hồi 1.5 s; bỏ qua hồi chiêu khi có Bùa Gió) |
| `E` | Nạp đom đóm vào đèn chưa sáng gần nhất trong 2.0 m (mỗi đèn cần 10) |
| `Q` | Tỏa Sáng (tốn 3 đom đóm, bán kính 3D 5 m, hồi 3 s, choáng 120 tick & đẩy 4 m) |
| `Esc` / `P` | Tạm dừng / Tiếp tục |

## Cách tính điểm

- Nạp đom đóm vào đèn: **+10** điểm / đom đóm.
- Thắp sáng một Đèn Lồng Lớn: **+100** điểm / đèn.
- Trúng Bóng Mực bằng Tỏa Sáng (`Q`): **+5** điểm / Bóng Mực / lần.
- Thưởng khi thắng mỗi Đêm: **+2** điểm / giây nguyên còn lại + **+50** điểm / Ngọn Lửa còn lại.
- Tổng điểm lượt chơi là tổng điểm các Đêm đã thắng qua chuỗi Đêm 1 (Đảo Bến) → Đêm 2 (Đảo Cau) → Đêm 3 (Đảo Chuông) → Bình Minh.

## Chạy test và kiểm chứng headless

```sh
npm test
npm run build
python3 scripts/verify-headless.py --night 3 --seed 42 --ticks 21600 --snapshot-every 600 --scenario tests/fixtures/p2-night3-dawn-scenario.json --out /tmp/night3-verify.jsonl
```

Chạy trực tiếp CLI headless cho từng Đêm (`--night 1|2|3`):

```sh
node scripts/headless.js --night 1 --seed 42 --ticks 120 --out /tmp/smoke-night1.jsonl
node scripts/headless.js --night 2 --seed 42 --ticks 180 --out /tmp/smoke-night2.jsonl
node scripts/headless.js --night 3 --seed 42 --ticks 180 --out /tmp/smoke-night3.jsonl
```

## Bằng chứng và nhật ký

- Nhật ký & giả định: [WORKLOG.md](WORKLOG.md)
- Spec Phase 2: [docs/specs/phase-2-spec.md](docs/specs/phase-2-spec.md)
- Hợp đồng & tuning: [game.contract.json](game.contract.json) · [Ticket-02](docs/contracts/ticket-2.md)
- Bằng chứng Phase 2: [docs/proof/phase-2/](docs/proof/phase-2/)
- Bằng chứng Phase 1 (mốc v1.0): [docs/proof/phase-1/](docs/proof/phase-1/)
