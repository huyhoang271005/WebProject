# Dự án Quản lý Cửa hàng Bách hoá

## Giới thiệu
Đây là ứng dụng web quản lý cửa hàng bách hoá được xây dựng bằng **Vanilla JavaScript**. Dự án cung cấp giải pháp toàn diện cho việc quản lý sản phẩm, đơn hàng, khách hàng và tích hợp các tính năng thời gian thực để nâng cao trải nghiệm người dùng.

## Tính năng chính

### 1. Quản lý Sản phẩm (Catalog & Products)
- Xem danh sách sản phẩm.
- Chi tiết sản phẩm.
- Quản lý danh mục.
- Tìm kiếm và lọc sản phẩm.

### 2. Quản lý Đơn hàng (Orders & Cart)
- Thêm sản phẩm vào giỏ hàng.
- Quy trình thanh toán (Checkout).
- Quản lý trạng thái đơn hàng.
- Lịch sử mua hàng.

### 3. Quản lý Người dùng (Users & Auth)
- Đăng ký, Đăng nhập, Quản lý tài khoản.
- Phân quyền người dùng (Role & Permission).
- Trang cá nhân (Profile).

### 4. Giao tiếp & Tương tác
- **Chat**: Nhắn tin trực tiếp (Message).
- **Thông báo**: Hệ thống thông báo thời gian thực (Notification).
- **Phản hồi**: Gửi feedback.

### 5. Khác
- Thanh toán (Payment).
- Theo dõi sức khỏe hệ thống (Server Health).

## Công nghệ sử dụng

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES Modules).
- **Real-time**:
    - **WebSocket**: Dùng cho tính năng chat và cập nhật trạng thái tức thời.
    - **Server-Sent Events (SSE)**: Dùng cho thông báo hệ thống.
- **Backend API**: Kết nối với API tại `https://myproject.huyhoang271.id.vn`.

## Cài đặt và Hướng dẫn sử dụng

Vì dự án không sử dụng bundler (như Webpack hay Vite) mà sử dụng trực tiếp ES Modules, bạn cần chạy ứng dụng thông qua một Web Server.

### Cách 1: Sử dụng Live Server (VS Code Extension)
1. Cài đặt extension **Live Server** trong VS Code.
2. Mở file `index.html`.
3. Nhấn chuột phải và chọn **"Open with Live Server"**.

### Cách 2: Sử dụng Python SimpleHTTPServer
Nếu bạn đã cài đặt Python:
```bash
# Tại thư mục gốc của dự án
python -m http.server 8000
# Truy cập http://localhost:8000
```

### Cách 3: Sử dụng Node.js http-server
Nếu bạn đã cài đặt Node.js:
```bash
npx http-server .
```

## Cấu trúc thư mục

- `auth/`: Các tính năng xác thực (Login, Register).
- `products/`, `products-manager/`: Quản lý hiển thị và chỉnh sửa sản phẩm.
- `orders/`, `order-manager/`: Quản lý đơn hàng.
- `lib/`: Các thư viện tiện ích, cấu hình API (`api.js`), WebSocket, SSE.
- `message/`: Tính năng chat.
- `notification/`: Tính năng thông báo.
- `assets/` (nếu có): Chứa hình ảnh, icons.

## Lưu ý
- Đảm bảo trình duyệt của bạn hỗ trợ ES Modules.
- Kiểm tra kết nối mạng để tải dữ liệu từ API server.
