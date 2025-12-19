import { callAPI } from '../public/api.js';
import { toggleLoading } from '../public/loader.js';

const formatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
let selectedContactId = null;
let currentCheckoutItems = [];

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Lấy danh sách ID từ giỏ hàng truyền sang
    const checkedIds = JSON.parse(localStorage.getItem("checkoutItems") || "[]");
    if (checkedIds.length === 0) {
        alert("Giỏ hàng của bạn đang trống hoặc chưa chọn sản phẩm!");
        window.location.href = "../cart/index.html";
        return;
    }

    await loadData(checkedIds);

    document.getElementById("btnConfirmOrder").onclick = handleOrder;
});

async function loadData(checkedIds) {
    try {
        if (typeof toggleLoading === 'function') toggleLoading(true);

        // Gọi đồng thời lấy Địa chỉ và Giỏ hàng
        const [resAddr, resCart] = await Promise.all([
            callAPI('/auth/contacts', 'GET'),
            callAPI('/auth/carts?page=0&size=999', 'GET') // Lấy size lớn để không bị sót do phân trang
        ]);

        // Render Địa chỉ
        if (resAddr.success && resAddr.data.length > 0) {
            renderAddresses(resAddr.data);
        }

        // Render Sản phẩm đã chọn
        if (resCart.success) {
            currentCheckoutItems = resCart.data.listData.filter(item =>
                checkedIds.includes(item.cartItemId.toString()) || checkedIds.includes(item.cartItemId)
            );

            if (currentCheckoutItems.length === 0) {
                alert("Dữ liệu sản phẩm đã thay đổi hoặc không tìm thấy. Vui lòng quay lại giỏ hàng.");
                window.location.href = "../cart/index.html";
                return;
            }
            renderProducts(currentCheckoutItems);
        }

    } catch (err) {
        console.error("Lỗi load trang checkout:", err);
    } finally {
        if (typeof toggleLoading === 'function') toggleLoading(false);
        document.getElementById('loadPage').style.display = 'none';
        document.getElementById('info').style.display = 'block';
    }
}

function renderAddresses(list) {
    const container = document.getElementById("listAddress");
    container.innerHTML = list.map((addr, index) => `
        <div class="address-box ${index === 0 ? 'selected' : ''}" 
             onclick="changeAddress(this, '${addr.contactId}')">
            <strong>${addr.recipientName} - ${addr.phoneNumber}</strong>
            <p style="font-size: 13px; color: #666; margin: 5px 0 0 0;">
                ${addr.addressDetail}, ${addr.ward}, ${addr.district}, ${addr.province}
            </p>
        </div>
    `).join('<div style="height:10px"></div>');

    selectedContactId = list[0].contactId; // Mặc định chọn cái đầu tiên
}

window.changeAddress = (el, id) => {
    document.querySelectorAll('.address-box').forEach(b => b.classList.remove('selected'));
    el.classList.add('selected');
    selectedContactId = id;
};

function renderProducts(items) {
    const container = document.getElementById("listOrderItems");
    let total = 0;

    container.innerHTML = items.map(item => {
        const subTotal = item.price * item.quantity;
        total += subTotal;
        return `
            <div class="product-item">
                <img src="${item.thumbnail}">
                <div class="product-info">
                    <b>${item.productName}</b><br>
                    <small>Phân loại: ${item.variantName}</small><br>
                    <span>${formatter.format(item.price)} x ${item.quantity}</span>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById("txtTotalPrice").innerText = formatter.format(total);
}

async function handleOrder() {
    if (!selectedContactId) {
        alert("Vui lòng chọn địa chỉ nhận hàng!");
        return;
    }

    const payload = {
        contactId: selectedContactId,
        paymentMethod: document.querySelector('input[name="paymentType"]:checked').value, // Sẽ là VN_PAY hoặc COD
        orderItemDTOList: currentCheckoutItems.map(item => ({
            variantId: item.variantId,
            quantity: item.quantity
        }))
    };

    if (confirm("Xác nhận đặt hàng và thanh toán?")) {
        try {
            if (typeof toggleLoading === 'function') toggleLoading(true);

            const res = await callAPI('/auth/orders', 'POST', payload);

            if (res.success) {
                // Xử lý thành công:
                // 1. Xóa các sản phẩm đã mua khỏi giỏ hàng server
                const deleteTasks = currentCheckoutItems.map(item =>
                    callAPI(`/auth/carts/${item.cartItemId}`, 'DELETE')
                );
                await Promise.all(deleteTasks);

                // 2. Dọn dẹp localStorage
                localStorage.removeItem("checkoutItems");

                // 3. Điều hướng
                if (payload.paymentMethod === 'VN_PAY' && res.data?.paymentUrl) {
                    window.location.href = res.data.paymentUrl; // Sang trang ngân hàng
                } else {
                    alert("Đặt hàng thành công!");
                    window.location.href = "../order/index.html"; // Về trang lịch sử đơn hàng
                }
            } else {
                alert("Lỗi: " + res.message);
            }
        } catch (e) {
            alert("Đã xảy ra lỗi không xác định.");
        } finally {
            if (typeof toggleLoading === 'function') toggleLoading(false);
        }
    }
}