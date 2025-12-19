import { callAPI } from '../public/api.js';
import { toggleLoading } from '../public/loader.js';

const formatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
let selectedContactId = null;
let currentCheckoutItems = []; // Lưu danh sách items đã chọn (đã flatten)

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Lấy danh sách ID từ localStorage
    const checkedIds = JSON.parse(localStorage.getItem("checkoutItems") || "[]");
    if (checkedIds.length === 0) {
        alert("Giỏ hàng của bạn đang trống hoặc chưa chọn sản phẩm!");
        window.location.href = "../cart/index.html";
        return;
    }

    await loadData(checkedIds);

    // 2. Gắn sự kiện nút đặt hàng
    document.getElementById("btnConfirmOrder").onclick = handleOrder;
});

/**
 * Load dữ liệu địa chỉ và sản phẩm từ API
 */
async function loadData(checkedIds) {
    try {
        if (typeof toggleLoading === 'function') toggleLoading(true);

        // Gọi đồng thời API lấy Địa chỉ và Giỏ hàng
        const [resAddr, resCart] = await Promise.all([
            callAPI('/contacts', 'GET'),           // ✅ SỬA: Bỏ /auth vì endpoint đúng là /contacts
            callAPI('/auth/carts?page=0&size=999', 'GET')
        ]);

        // ✅ SỬA: Render địa chỉ với cấu trúc đúng
        if (resAddr.success && resAddr.data?.listData?.length > 0) {
            renderAddresses(resAddr.data.listData);
        } else {
            // Không có địa chỉ -> Chuyển sang trang thêm địa chỉ
            if (confirm("Bạn chưa có địa chỉ giao hàng. Chuyển đến trang thêm địa chỉ?")) {
                window.location.href = "../contact/index.html";
            } else {
                window.location.href = "../cart/index.html";
            }
            return;
        }

        // ✅ SỬA: Xử lý dữ liệu giỏ hàng đúng cấu trúc
        if (resCart.success && resCart.data?.listData) {
            const cartData = resCart.data.listData; // Mảng products

            // Flatten: Lấy tất cả items từ cartItemDTOList của mỗi product
            const allItems = [];
            cartData.forEach(product => {
                product.cartItemDTOList.forEach(item => {
                    // Tìm variant tương ứng
                    const variant = product.productVariantsDTOList.find(
                        v => v.variantId === item.variantId
                    );

                    if (variant && checkedIds.includes(item.cartItemId)) {
                        allItems.push({
                            cartItemId: item.cartItemId,
                            variantId: item.variantId,
                            productName: product.productName,
                            variantName: variant.attributeValueIdList
                                .map(id => {
                                    // Tìm tên attribute value
                                    for (const attr of product.attributes) {
                                        const val = attr.attributeValues.find(
                                            av => av.attributeValueId === id
                                        );
                                        if (val) return val.attributeValueName;
                                    }
                                    return '';
                                })
                                .filter(Boolean)
                                .join(' - '),
                            thumbnail: variant.imageUrl || 'https://via.placeholder.com/80',
                            price: variant.price,
                            quantity: item.quantity
                        });
                    }
                });
            });

            if (allItems.length === 0) {
                alert("Dữ liệu sản phẩm đã thay đổi hoặc không tìm thấy. Vui lòng quay lại giỏ hàng.");
                window.location.href = "../cart/index.html";
                return;
            }

            currentCheckoutItems = allItems;
            renderProducts(allItems);
        } else {
            alert("Không thể tải giỏ hàng. Vui lòng thử lại!");
            window.location.href = "../cart/index.html";
        }

    } catch (err) {
        console.error("Lỗi load trang checkout:", err);
        alert("Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại!");
    } finally {
        if (typeof toggleLoading === 'function') toggleLoading(false);
        document.getElementById('loadPage').style.display = 'none';
        document.getElementById('info').style.display = 'block';
    }
}

/**
 * Render danh sách địa chỉ
 */
function renderAddresses(list) {
    const container = document.getElementById("listAddress");

    container.innerHTML = list.map((addr, index) => `
        <div class="address-box ${index === 0 ? 'selected' : ''}" 
             onclick="changeAddress(this, '${addr.contactId}')">
            <strong>${escapeHtml(addr.contactName)} - ${escapeHtml(addr.phone)}</strong>
            <p style="font-size: 13px; color: #666; margin: 5px 0 0 0;">
                ${escapeHtml(addr.address)}
            </p>
        </div>
    `).join('<div style="height:10px"></div>');

    // Mặc định chọn địa chỉ đầu tiên
    selectedContactId = list[0].contactId;
}

/**
 * Thay đổi địa chỉ được chọn
 */
window.changeAddress = (el, id) => {
    document.querySelectorAll('.address-box').forEach(b => b.classList.remove('selected'));
    el.classList.add('selected');
    selectedContactId = id;
};

/**
 * Render danh sách sản phẩm đã chọn
 */
function renderProducts(items) {
    const container = document.getElementById("listOrderItems");
    let total = 0;

    container.innerHTML = items.map(item => {
        const subTotal = item.price * item.quantity;
        total += subTotal;

        return `
            <div class="product-item">
                <img src="${item.thumbnail}" alt="${escapeHtml(item.productName)}">
                <div class="product-info">
                    <b>${escapeHtml(item.productName)}</b><br>
                    <small>Phân loại: ${escapeHtml(item.variantName)}</small><br>
                    <span>${formatter.format(item.price)} x ${item.quantity}</span>
                </div>
                <div class="product-total">
                    ${formatter.format(subTotal)}
                </div>
            </div>
        `;
    }).join('');

    document.getElementById("txtTotalPrice").innerText = formatter.format(total);
}

/**
 * Xử lý đặt hàng
 */
async function handleOrder() {
    if (!selectedContactId) {
        alert("Vui lòng chọn địa chỉ nhận hàng!");
        return;
    }

    // Lấy phương thức thanh toán
    const paymentMethodEl = document.querySelector('input[name="paymentType"]:checked');
    if (!paymentMethodEl) {
        alert("Vui lòng chọn phương thức thanh toán!");
        return;
    }

    // ✅ SỬA: Payload đúng theo API backend
    const payload = {
        contactId: selectedContactId,
        paymentMethod: paymentMethodEl.value, // VN_PAY hoặc COD
        orderItemDTOList: currentCheckoutItems.map(item => ({
            variantId: item.variantId,
            quantity: item.quantity
        }))
    };

    if (!confirm("Xác nhận đặt hàng và thanh toán?")) {
        return;
    }

    try {
        if (typeof toggleLoading === 'function') toggleLoading(true);

        // Gọi API tạo đơn hàng
        const res = await callAPI('/auth/orders', 'POST', payload);

        if (res.success) {
            // ✅ SỬA: Xóa giỏ hàng đúng cách (gọi API delete với array IDs)
            const cartItemIds = currentCheckoutItems.map(item => item.cartItemId);
            await callAPI('/auth/carts/delete', 'POST', cartItemIds);

            // Dọn dẹp localStorage
            localStorage.removeItem("checkoutItems");

            // Điều hướng theo phương thức thanh toán
            if (payload.paymentMethod === 'VN_PAY' && res.data?.paymentUrl) {
                // Chuyển sang trang thanh toán VNPay
                window.location.href = res.data.paymentUrl;
            } else {
                // Thanh toán COD thành công
                alert("Đặt hàng thành công!");
                window.location.href = "../order/index.html";
            }
        } else {
            alert("Lỗi: " + (res.message || "Không thể đặt hàng"));
        }
    } catch (e) {
        console.error("Lỗi đặt hàng:", e);
        alert("Đã xảy ra lỗi không xác định. Vui lòng thử lại!");
    } finally {
        if (typeof toggleLoading === 'function') toggleLoading(false);
    }
}

/**
 * Escape HTML để tránh XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}