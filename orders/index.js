import { callAPI } from '../public/api.js';
import { toggleLoading } from '../public/loader.js';
import { convertToVNTime } from '../public/public.js';

const formatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

document.addEventListener("DOMContentLoaded", async () => {
    await loadOrderHistory();
});

async function loadOrderHistory() {
    try {
        if (typeof toggleLoading === 'function') toggleLoading(true);

        // Gọi API lấy danh sách đơn hàng (thường là /auth/orders)
        const res = await callAPI('/auth/orders', 'GET');

        if (res.success) {
            renderOrders(res.data); // Nếu res.data là mảng đơn hàng
        }
    } catch (err) {
        console.error("Lỗi tải đơn hàng:", err);
    } finally {
        if (typeof toggleLoading === 'function') toggleLoading(false);
        document.getElementById('loadPage').style.display = 'none';
        document.getElementById('info').style.display = 'block';
    }
}

function renderOrders(orders) {
    const container = document.getElementById("orderList");

    // Nếu đơn hàng là một object đơn lẻ (như bạn gửi) hoặc mảng, ta cần xử lý
    const orderArray = Array.isArray(orders) ? orders : [orders];

    if (orderArray.length === 0) {
        container.innerHTML = `<div class="empty">Bạn chưa có đơn hàng nào.</div>`;
        return;
    }

    container.innerHTML = orderArray.map(order => `
        <div class="order-card">
            <div class="order-header">
                <span class="order-date">Ngày đặt: ${convertToVNTime(order.createdAt)}</span>
                <span class="status-badge status-${order.orderStatus.toLowerCase()}">${order.orderStatus}</span>
            </div>
            
            <div class="order-items">
                ${order.orderItemDTOList.map(item => `
                    <div class="item">
                        <img src="${item.imageUrl}" alt="${item.productName}">
                        <div class="item-info">
                            <div class="name">${item.productName}</div>
                            <div class="variant">${item.attributeValues.join(" - ")}</div>
                            <div class="qty">x${item.quantity}</div>
                        </div>
                        <div class="price">${formatter.format(item.price)}</div>
                    </div>
                `).join('')}
            </div>

            <div class="order-footer">
                <div class="payment-method">Thanh toán: <b>${order.paymentMethod}</b></div>
                <div class="total">Tổng cộng: <b>${formatter.format(calculateTotal(order.orderItemDTOList))}</b></div>
            </div>
            
            ${order.orderStatus === 'PENDING' ? `<button class="btn-cancel">Hủy đơn hàng</button>` : ''}
        </div>
    `).join('');
}

function calculateTotal(items) {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}