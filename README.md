# Đảo Đèn Lồng · Phase 1 (Đêm 1 – Đảo Bến)

Game 3D góc nhìn thứ ba bằng **JavaScript, Vite và Three.js (WebGL 2)** với lõi mô phỏng cố định **60 tick/giây** dùng chung cho trình duyệt và CLI headless (Test Contract v1.0).

## Cài đặt và chơi (2 lệnh)

Yêu cầu Node.js `>= 20` và npm.

```sh
npm ci
npm run dev
```

Mở địa chỉ hiển thị trên terminal (mặc định `http://127.0.0.1:5173/`). Có thể thêm `?light=1` hoặc bấm nút **Chế độ: Chuẩn / Nhẹ** ở góc trên bên phải để bật chế độ Nhẹ.

## Điều khiển

| Phím / Thao tác | Hành động |
| --- | --- |
| `W A S D` / `↑ ↓` | Di chuyển Mây theo hướng camera |
| Kéo chuột hoặc `← →` | Xoay camera quanh Mây |
| `Space` | Nhảy |
| `E` | Nạp đom đóm vào đèn chưa sáng gần nhất trong tầm (mỗi đèn cần 5) |
| `Q` | Phát xung sáng (tốn 2 đom đóm, làm choáng và đẩy lùi Bóng Mực trong tầm) |

## Cách tính điểm

- Nhặt đom đóm: **+10** điểm / đom đóm (mang tối đa 8).
- Thắp sáng một Đèn Lồng Lớn: **+100** điểm / đèn (cần nạp 5 đom đóm).
- Làm choáng Bóng Mực bằng xung `Q`: **+20** điểm / Bóng Mực.
- Thưởng khi thắng (thắp đủ 5 đèn `L1`–`L5`): **+1** điểm / giây nguyên còn lại + **+25** điểm / lửa còn lại.

## Chạy test và kiểm chứng headless

```sh
npm test
npm run build
python3 scripts/verify-headless.py --seed 42 --ticks 130 --inputs tests/fixtures/light-l1-inputs.json --out docs/proof/phase-1/light-l1.jsonl
```

Chạy trực tiếp CLI headless theo Test Contract v1.0:

```sh
node scripts/headless.js --seed 42 --night 1 --ticks 120 --out docs/proof/phase-1/smoke.jsonl
```

## Bằng chứng và nhật ký

- Nhật ký & giả định: [WORKLOG.md](WORKLOG.md)
- Hợp đồng & tuning: [game.contract.json](game.contract.json) · [PRD-0](docs/contracts/prd-0.md)
- Bằng chứng JSONL & ảnh/clip: [docs/proof/phase-1/](docs/proof/phase-1/)
  - [smoke.jsonl](docs/proof/phase-1/smoke.jsonl)
  - [light-l1.jsonl](docs/proof/phase-1/light-l1.jsonl)
  - [night1-pulse-win.jsonl](docs/proof/phase-1/night1-pulse-win.jsonl)
  - [night1-no-flames.jsonl](docs/proof/phase-1/night1-no-flames.jsonl)
  - [night1-dawn.jsonl](docs/proof/phase-1/night1-dawn.jsonl)
  - [03-l1-lit.png](docs/proof/phase-1/03-l1-lit.png) · [04-night1-lightmode-720p.png](docs/proof/phase-1/04-night1-lightmode-720p.png) · [light-l1.mp4](docs/proof/phase-1/light-l1.mp4)
