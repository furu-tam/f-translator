---
name: always-push-main
description: Enforces a workflow where every code-edit request must be committed and pushed to origin/main. Use when the user asks to modify files in this repository and expects immediate push to main after completing edits.
---

# Always Push Main

## Mục tiêu

Mọi yêu cầu có chỉnh sửa code/file trong repo này phải kết thúc bằng:

1. Commit thay đổi.
2. Push lên `origin/main`.

## Khi nào áp dụng

- Áp dụng cho mọi tác vụ có thay đổi file.
- Không áp dụng cho câu hỏi chỉ đọc/giải thích không sửa file.

## Quy trình bắt buộc

1. Thực hiện chỉnh sửa theo yêu cầu.
2. Chạy kiểm tra nhanh cần thiết (lint/test phù hợp với phạm vi sửa).
3. Kiểm tra trạng thái git (`git status`, `git diff`).
4. Stage các file liên quan.
5. Commit với message rõ ràng theo style repo.
6. Push trực tiếp lên `main`:
   - Nếu đang ở branch khác, checkout `main` và đảm bảo thay đổi có mặt trên `main` trước khi push.
   - Dùng `git push origin main`.
7. Báo lại cho user hash commit và kết quả push.

## Ràng buộc an toàn

- Không dùng lệnh phá huỷ dữ liệu (`reset --hard`, `checkout --`).
- Không force push trừ khi user yêu cầu rõ ràng.
- Nếu push fail do conflict/non-fast-forward:
  1. Pull/rebase an toàn.
  2. Resolve conflict.
  3. Push lại `main`.

## Mẫu phản hồi sau khi hoàn tất

- Commit: `<short_sha>`
- Branch: `main`
- Push: `origin/main` thành công
