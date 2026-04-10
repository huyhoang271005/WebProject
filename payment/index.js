// Xử lý logic hiển thị trạng thái thanh toán
// Chạy ngay khi file được load (module type)
import {loadNavbar} from "../navbar/navbar.js";

document.addEventListener('DOMContentLoaded', async () => {
    sessionStorage.clear();
    await loadNavbar();
    const urlParams = new URLSearchParams(window.location.search);
    // Lấy giá trị success
    const successParam = urlParams.get('success');
    const orderId = urlParams.get('orderId');
    
    console.log("Payment URL param 'success':", successParam); // Log để check

    const card = document.getElementById('paymentCard');
    if (!card) return;

    // Xóa nội dung loading cũ
    card.innerHTML = '';

    if (successParam === 'false') {
        renderFailure(card, orderId);
    } else {
        // Mặc định là success
        renderSuccess(card, orderId);
    }
});

function renderSuccess(container, orderId) {
    // Thêm class cho body để có thể style background nếu cần
    document.body.classList.add('page-success');
    container.classList.add('card-success');

    container.innerHTML = `
        <div class="status-icon icon-success">
            <i class="fa-solid fa-check"></i>
        </div>
        <h1 class="status-title title-success">Thanh toán thành công</h1>
        <p class="status-message">
            Giao dịch của bạn đã được xử lý thành công.<br>
            Cảm ơn bạn đã mua sắm tại cửa hàng!
        </p>
        <div class="action-buttons">
            <a href="/orders/?orderId=${orderId}" class="btn btn-success" id="btn-order">
                <i class="fa-solid fa-box-open"></i> Xem đơn hàng
            </a>
            <a href="/" class="btn btn-outline">
                <i class="fa-solid fa-home"></i> Về trang chủ
            </a>
        </div>
    `;
}

function renderFailure(container, orderId) {
    document.body.classList.add('page-failure');
    container.classList.add('card-failure');

    container.innerHTML = `
        <div class="status-icon icon-failure">
            <i class="fa-solid fa-xmark"></i>
        </div>
        <h1 class="status-title title-failure">Thanh toán thất bại</h1>
        <p class="status-message">
            Giao dịch không thành công hoặc đã bị hủy.<br>
            Vui lòng thử lại hoặc chọn phương thức thanh toán khác.
        </p>
        <div class="action-buttons">
            <a href="/orders/?orderId=${orderId}" class="btn btn-failure">
                <i class="fa-solid fa-rotate-right"></i> Thử lại
            </a>
            <a href="/" class="btn btn-outline">
               <i class="fa-solid fa-home"></i> Về trang chủ
            </a>
        </div>
    `;
}
