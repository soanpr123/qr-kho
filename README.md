# QR Kho

Web quét QR sản phẩm bằng camera hoặc ảnh, tự gộp mã trùng và sao chép kết quả dạng `SP001 x 2, SP002`.

## Sử dụng

- Bật camera và cấp quyền truy cập, rồi quét từng mã liên tiếp.
- Đưa mã ra khỏi khung khoảng 1 giây trước khi quét lại cùng mã.
- Có thể tải nhiều ảnh (mỗi ảnh một mã QR), nhập mã thủ công, tăng/giảm hoặc xóa sản phẩm.
- Danh sách lưu trong localStorage trên thiết bị. Ảnh được xử lý tại trình duyệt.

## GitHub Pages

Không cần build hoặc cài thư viện. Trong Settings → Pages, chọn Deploy from a branch, nhánh main, thư mục / (root).

Camera cần HTTPS hoặc localhost. Chạy thử cục bộ bằng `python -m http.server 8765`.

## Thư viện

Sử dụng [nimiq/qr-scanner](https://github.com/nimiq/qr-scanner) phiên bản 1.4.2, giấy phép MIT trong `QR-SCANNER-LICENSE.txt`.
