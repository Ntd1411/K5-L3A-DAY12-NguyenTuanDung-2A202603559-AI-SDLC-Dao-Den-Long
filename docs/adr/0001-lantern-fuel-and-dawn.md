# ADR 0001: Nhiên liệu đèn và luật bình minh

- Trạng thái: Chấp nhận
- Ngày: 20/11/2026
- Liên quan: Ticket-03, Test Contract v1.2

## Bối cảnh

Phase 3 thay mục tiêu thắng sớm khi thắp hết đèn bằng việc giữ đủ đèn sáng tới bình minh. Nhiên liệu phải hao và bị nhiều Bóng Mực hút cùng lúc mà vẫn cho kết quả JSONL tất định.

## Quyết định

- Lưu `fuelUnits` dưới dạng số nguyên, mỗi unit bằng `1/60` fuel. Đèn đầy có 6.000 unit. Snapshot mới chuyển sang fuel và làm tròn một chữ số thập phân.
- Trong bước 2 của tick, mỗi đèn sáng mất 1 unit, sau đó cộng thêm 5 unit cho mỗi Bóng Mực `drain` hợp lệ. Mọi `fuel_drain` cùng tick nhìn thấy giá trị sau tổng hao hụt và được phát theo ID Bóng Mực.
- Scenario `lit: true` không ghi fuel mặc định 100 và `ever_lit: true`. Scenario đặt sẵn không tăng `successful_lights`.
- Khi châm từ dưới 30 lên tối thiểu 30, bật lại vùng an toàn ngay trong tick tương tác và cho Bóng bên trong tối đa 30 tick để bị đẩy ra.
- Xét kết quả sau mọi cập nhật. `no_flames` luôn ưu tiên. Khi hết giờ, `ceil(0.6 × số đèn)` đang sáng thì thắng `dawn_survived`, nếu không thì thua `dawn`. Không cò thắng `all_lit`.

## Hệ quả

Phép tính nhiên liệu không tích lũy sai số float và nhiều lần chạy cùng seed giữ nguyên output. Test Phase 2 về điểm, thời lượng và thắng sớm phải đổi theo contract v1.2; các test gameplay khác tiếp tục là hồi quy bắt buộc.
