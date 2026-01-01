import { callAPI } from '../public/api.js';
import { toggleLoading } from '../public/loader.js';

const formatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
let selectedContactId = null;
let currentCheckoutItems = [];
let isBuyNowMode = false;

document.addEventListener("DOMContentLoaded", async () => {
    // BƯỚC 1: Kiểm tra xem khách đang đi theo luồng nào
    const buyNowDataRaw = sessionStorage.getItem("buyNowData");
    const cartItemIds = JSON.parse(localStorage.getItem("checkoutItems") || "[]");

    if (buyNowDataRaw) {
        // LUỒNG 1: MUA NGAY
        isBuyNowMode = true;
        const item = JSON.parse(buyNowDataRaw);
        await loadDataForBuyNow(item);
    } else if (cartItemIds.length > 0) {
        // LUỒNG 2: THANH TOÁN TỪ GIỎ HÀNG
        isBuyNowMode = false;
        await loadDataFromCart(cartItemIds);
    } else {
        alert("Thông tin thanh toán không hợp lệ hoặc đã hết hạn!");
        window.location.href = "../cart/index.html";
        return;
    }

    // Gắn sự kiện nút đặt hàng
    document.getElementById("btnConfirmOrder").onclick = handleOrder;
});

/**
 * Xử lý Load dữ liệu cho luồng MUA NGAY
 */
async function loadDataForBuyNow(item) {
    try {
        if (typeof toggleLoading === 'function') toggleLoading(true);

        // Chỉ cần lấy địa chỉ người dùng
        const resAddr = await callAPI('/contacts', 'GET');
        if (resAddr.success && resAddr.data?.listData?.length > 0) {
            renderAddresses(resAddr.data.listData);
        } else {
            handleNoAddress();
            return;
        }

        // Chuyển đổi dữ liệu sang mảng chung
        currentCheckoutItems = [{
            variantId: item.variantId,
            productName: item.productName,
            variantName: item.variantName,
            thumbnail: item.thumbnail,
            price: item.price,
            quantity: item.quantity
        }];

        renderProducts(currentCheckoutItems);
    } catch (err) {
        console.error("Lỗi mua ngay:", err);
    } finally {
        finishLoading();
    }
}

/**
 * Xử lý Load dữ liệu cho luồng GIỎ HÀNG (Logic cũ của bạn)
 */
async function loadDataFromCart(checkedIds) {
    try {
        if (typeof toggleLoading === 'function') toggleLoading(true);

        const [resAddr, resCart] = await Promise.all([
            callAPI('/contacts', 'GET'),
            callAPI('/carts?page=0&size=999', 'GET')
        ]);

        if (resAddr.success && resAddr.data?.listData?.length > 0) {
            renderAddresses(resAddr.data.listData);
        } else {
            handleNoAddress();
            return;
        }

        if (resCart.success && resCart.data?.listData) {
            const allItems = [];
            resCart.data.listData.forEach(product => {
                product.cartItemDTOList.forEach(item => {
                    const variant = product.productVariantsDTOList.find(v => v.variantId === item.variantId);
                    if (variant && checkedIds.includes(item.cartItemId)) {
                        allItems.push({
                            cartItemId: item.cartItemId, // Lưu lại để xóa sau khi đặt hàng
                            variantId: item.variantId,
                            productName: product.productName,
                            variantName: getVariantName(product, variant),
                            thumbnail: variant.imageUrl || 'https://via.placeholder.com/80',
                            price: variant.price,
                            quantity: item.quantity
                        });
                    }
                });
            });
            currentCheckoutItems = allItems;
            renderProducts(allItems);
        }
    } catch (err) {
        console.error("Lỗi load giỏ hàng:", err);
    } finally {
        finishLoading();
    }
}

// Hàm bổ trợ lấy tên phân loại
function getVariantName(product, variant) {
    return variant.attributeValueIdList.map(id => {
        for (const attr of product.attributes) {
            const val = attr.attributeValues.find(av => av.attributeValueId === id);
            if (val) return val.attributeValueName;
        }
        return '';
    }).filter(Boolean).join(' - ');
}

function handleNoAddress() {
    if (confirm("Bạn chưa có địa chỉ giao hàng. Chuyển đến trang thêm địa chỉ?")) {
        window.location.href = "../contact/index.html";
    }
}

function finishLoading() {
    if (typeof toggleLoading === 'function') toggleLoading(false);
    document.getElementById('loadPage').style.display = 'none';
    document.getElementById('info').style.display = 'block';
}

function renderAddresses(list) {
    const container = document.getElementById("listAddress");
    container.innerHTML = list.map((addr, index) => `
        <div class="address-box ${index === 0 ? 'selected' : ''}" 
             onclick="changeAddress(this, '${addr.contactId}')">
            <strong>${escapeHtml(addr.contactName)} - ${escapeHtml(addr.phone)}</strong>
            <p>${escapeHtml(addr.address)}</p>
        </div>
    `).join('<div style="height:10px"></div>');
    selectedContactId = list[0].contactId;
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
                    <b>${escapeHtml(item.productName)}</b><br>
                    <small>Phân loại: ${escapeHtml(item.variantName)}</small><br>
                    <span>${formatter.format(item.price)} x ${item.quantity}</span>
                </div>
                <div class="product-total">${formatter.format(subTotal)}</div>
            </div>`;
    }).join('');
    document.getElementById("txtTotalPrice").innerText = formatter.format(total);
}

async function handleOrder() {
    if (!selectedContactId) return alert("Vui lòng chọn địa chỉ!");
    const paymentMethodEl = document.querySelector('input[name="paymentType"]:checked');
    if (!paymentMethodEl) return alert("Vui lòng chọn phương thức thanh toán!");

    const payload = {
        contactId: selectedContactId,
        paymentMethod: paymentMethodEl.value,
        orderItemDTOList: currentCheckoutItems.map(item => ({
            variantId: item.variantId,
            quantity: item.quantity
        }))
    };

    if (!confirm("Xác nhận đặt hàng?")) return;

    try {
        toggleLoading(true);
        const res = await callAPI('/orders', 'POST', payload);
        if (res.success) {

            if (payload.paymentMethod === 'VN_PAY') {
                const pay = await callAPI(`/payment/vn-pay/${res.data.orderId}`);
                if(pay.success){
                    window.location.href = pay.data;
                }
            } else {
                alert("Đặt hàng thành công!");
                window.location.href = "../orders/index.html";
            }
        } else {
            alert("Lỗi: " + res.message);
        }
    } catch (e) {
        alert("Đã xảy ra lỗi.");
    } finally {
        toggleLoading(false);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}