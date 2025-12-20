import { callAPI } from '../public/api.js';

const moneyFormatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

// === 1. KHỞI TẠO BIẾN ===
let currentPage = 0;
const pageSize = 10;
let hasMore = true; 
let isLoading = false;

document.addEventListener("DOMContentLoaded", () => {
    loadOrders(0);

    // Sự kiện cuộn xuống đáy để tải thêm
    window.addEventListener('scroll', () => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 50) {
            if (hasMore && !isLoading) {
                loadOrders(currentPage + 1);
            }
        }
    });
});

// === 2. HÀM TẢI DANH SÁCH (Đã bỏ try-catch) ===
async function loadOrders(page) {
    // Chặn nếu đang tải hoặc hết dữ liệu (trừ trang đầu)
    if (isLoading || (page > 0 && !hasMore)) return;
    
    isLoading = true;
    const spinner = document.getElementById("loading-spinner");
    if(spinner) spinner.style.display = "block";

    // --- GỌI API ---
    const res = await callAPI(`/auth/admin/orders?page=${page}&size=${pageSize}`, 'GET');

    // Kiểm tra kết quả trả về từ Backend
    if (res && res.success) {
        const newData = res.data.listData || [];
        hasMore = res.data.hasMore;
        currentPage = page;
        renderOrders(newData);
    } else {
        // Backend trả về lỗi logic (VD: Không có quyền, Token hết hạn...)
        console.warn("Lỗi tải đơn:", res ? res.message : "Không xác định");
        if (page === 0) {
            document.getElementById("order-list-container").innerHTML = `<p style="text-align:center; padding:20px;">${res?.message || "Không tải được dữ liệu"}</p>`;
        }
    }

    // Kết thúc loading
    isLoading = false;
    if(spinner) spinner.style.display = "none";
}

// === 3. HÀM RENDER GIAO DIỆN (Giữ nguyên logic cũ) ===
function renderOrders(orders) {
    const container = document.getElementById("order-list-container");
    // Nếu là trang 0 thì xóa trắng danh sách cũ đi
    if (currentPage === 0) container.innerHTML = "";

    if (!orders || orders.length === 0) {
        if (currentPage === 0) container.innerHTML = "<p style='text-align:center'>Chưa có đơn hàng nào.</p>";
        return;
    }

    orders.forEach(order => {
        const orderCard = document.createElement("div");
        orderCard.className = "order-card";
        
        // Xử lý hiển thị trạng thái
        let statusText = order.orderStatus;
        let statusClass = "status-other";
        if(order.orderStatus === "WAITING") { statusText = "Chờ duyệt"; statusClass = "status-waiting"; }
        else if(order.orderStatus === "PENDING") { statusText = "Đã duyệt"; statusClass = "status-pending"; }
        else if(order.orderStatus === "REJECT") { statusText = "Đã hủy"; statusClass = "status-other"; }

        // Tính tổng tiền
        const totalOrderPrice = order.orderItemDTOList.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        orderCard.innerHTML = `
            <div class="order-header">
                <div>
                    <strong>Mã:</strong> <span class="order-id-full">${order.orderId}</span>
                </div>
                <span class="badge-status ${statusClass}">${statusText}</span>
            </div>
            
            <div class="order-body">
                <div class="item-list-container"></div>
            </div>

            <div class="order-footer">
                <div class="total-money-label">
                    Tổng tiền: <span class="total-money-value">${moneyFormatter.format(totalOrderPrice)}</span>
                </div>
                
                <div class="action-buttons">
                    ${order.orderStatus === 'WAITING' ? `
                        <button class="btn-action btn-reject" onclick="processOrder('${order.orderId}', 'REJECT', this)">
                            <i class="fa-solid fa-xmark"></i> Từ chối
                        </button>
                        <button class="btn-action btn-approve" onclick="processOrder('${order.orderId}', 'APPROVE', this)">
                            <i class="fa-solid fa-check"></i> Đồng ý
                        </button>
                    ` : ''}
                </div>
            </div>
        `;

        // Render từng món hàng
        const itemListContainer = orderCard.querySelector(".item-list-container");
        order.orderItemDTOList.forEach(item => {
            const variantText = item.attributeValues ? item.attributeValues.join(", ") : "";
            const itemRow = document.createElement("div");
            itemRow.className = "order-item";
            itemRow.innerHTML = `
                <img src="${item.imageUrl || 'https://via.placeholder.com/60'}" class="item-img">
                <div class="item-info">
                    <div class="item-name">${item.productName}</div>
                    <div class="item-variant">${variantText}</div>
                </div>
                <div class="item-quantity-price">
                    <div class="item-calc">${moneyFormatter.format(item.price)} x ${item.quantity}</div>
                    <div class="item-total">${moneyFormatter.format(item.price * item.quantity)}</div>
                </div>
            `;
            itemListContainer.appendChild(itemRow);
        });

        container.appendChild(orderCard);
    });
}

// === 4. HÀM XỬ LÝ NÚT BẤM  ===
window.processOrder = async (orderId, action, btnElement) => {
    const actionText = action === 'APPROVE' ? "ĐỒNG Ý" : "TỪ CHỐI";
    if (!confirm(`Xác nhận ${actionText} đơn hàng này?`)) return;

    // UX: Khóa nút bấm để tránh click đúp
    const originalContent = btnElement.innerHTML;
    btnElement.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ...';
    btnElement.disabled = true;

    // --- GỌI API ---
    // Backend bắt lỗi rồi nên cứ gọi thẳng
    const res = await callAPI('/auth/admin/orders', 'PUT', {
        orderId: orderId,
        orderStatus: action === 'APPROVE' ? 'PENDING' : 'REJECT'
    });

    if (res && res.success) {
        alert("Thành công!");
        
        // Tải lại trang hiện tại (reset lại list) để cập nhật trạng thái mới nhất
        currentPage = 0;
        loadOrders(0);
    } else {
        // Backend trả về success: false (ví dụ: Đơn đã bị hủy trước đó)
        alert("Lỗi: " + (res?.message || "Thao tác thất bại"));
        
        // Mở lại nút nếu lỗi
        btnElement.innerHTML = originalContent;
        btnElement.disabled = false;
    }
};