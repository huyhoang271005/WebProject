import { callAPI } from '../lib/api.js';
import { toggleLoading } from '../lib/loader.js';
import { showDialog } from '../dialog/index.js';

const formatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
const STORAGE_KEYS = {
    BUY_NOW: 'buyNowData',
    CHECKED_IDS: 'checkedCartIds'
};

let selectedContactId = null;
let currentCheckoutItems = [];
let isBuyNowMode = false;
let allAddresses = []; // Lưu danh sách addresses để lấy thông tin

document.addEventListener("DOMContentLoaded", async () => {
    const buyNowData = sessionStorage.getItem(STORAGE_KEYS.BUY_NOW);
    const checkedIds = JSON.parse(
        sessionStorage.getItem(STORAGE_KEYS.CHECKED_IDS) ||
        sessionStorage.getItem("checkoutItems") ||
        "[]"
    );

    if (buyNowData) {
        isBuyNowMode = true;
        const item = JSON.parse(buyNowData);
        await loadDataForBuyNow(item);
    } else if (checkedIds.length > 0) {
        isBuyNowMode = false;
        await loadDataFromCart(checkedIds);
    } else {
        await showDialog("error", "Thông tin thanh toán không hợp lệ hoặc đã hết hạn!");
        window.location.href = "../cart/index.html";
        return;
    }

    // Gắn sự kiện nút đặt hàng
    document.getElementById("btnConfirmOrder").onclick = handleOrder;
});

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
            cartItemId: null,
            variantId: item.variantId,
            attributeValues: item.attributeValues || [],
            productName: item.productName,
            variantName: item.variantName,
            thumbnail: item.thumbnail,
            imageUrl: item.thumbnail,
            originalPrice: item.originalPrice || item.price,
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

async function loadDataFromCart(checkedIds) {
    try {
        if (typeof toggleLoading === 'function') toggleLoading(true);

        // Không dùng Promise.all để tránh lỗi gọi refresh token đồng thời (race condition)
        // khi access token bị thiếu, dẫn đến một trong hai API bị lỗi.
        const resAddr = await callAPI('/contacts', 'GET');
        const resCart = await callAPI('/carts?page=0&size=999', 'GET');

        // Process Address
        if (resAddr && resAddr.success && resAddr.data?.listData?.length > 0) {
            renderAddresses(resAddr.data.listData);
        } else {
            handleNoAddress();
        }

        // Process Cart Items
        if (resCart && resCart.success && resCart.data?.listData) {
            const allItems = [];
            resCart.data.listData.forEach(product => {
                if (!product.cartItemDTOList) return;

                product.cartItemDTOList.forEach(item => {
                    const variant = product.productVariantsDTOList?.find(v => v.variantId === item.variantId);

                    // Match checked IDs (robust comparison converting both to strings)
                    const isChecked = checkedIds.some(id => String(id) === String(item.cartItemId));

                    if (variant && isChecked) {
                        // Extract attribute values
                        const attributeValues = [];
                        if (product.attributes && variant.attributeValueIdList) {
                            variant.attributeValueIdList.forEach(valueId => {
                                for (const attr of product.attributes) {
                                    const val = attr.attributeValues.find(av => av.attributeValueId === valueId);
                                    if (val) {
                                        attributeValues.push(val.attributeValueName);
                                        break;
                                    }
                                }
                            });
                        }

                        allItems.push({
                            cartItemId: item.cartItemId,
                            variantId: item.variantId,
                            attributeValues: attributeValues,
                            productName: product.productName,
                            variantName: getVariantName(product, variant),
                            thumbnail: variant.imageUrl || product.imageUrl || 'https://via.placeholder.com/80',
                            imageUrl: variant.imageUrl || product.imageUrl || null,
                            originalPrice: variant.originalPrice || variant.price,
                            price: variant.price,
                            quantity: item.quantity
                        });
                    }
                });
            });

            currentCheckoutItems = allItems;
            renderProducts(allItems);

            if (allItems.length === 0) {
                console.warn("No matching cart items found for checkedIds:", checkedIds);
            }
        } else {
            console.error("Failed to fetch cart data:", resCart);
        }
    } catch (err) {
        console.error("Lỗi load giỏ hàng:", err);
    } finally {
        finishLoading();
    }
}

// Hàm bổ trợ lấy tên phân loại
function getVariantName(product, variant) {
    if (!product.attributes) return '';
    return variant.attributeValueIdList.map(id => {
        for (const attr of product.attributes) {
            const val = attr.attributeValues.find(av => av.attributeValueId === id);
            if (val) return val.attributeValueName;
        }
        return '';
    }).filter(Boolean).join(' - ');
}

function handleNoAddress() {
    document.getElementById('emptyAddressState').style.display = 'block';
    document.getElementById('manageAddressLink').style.display = 'none';
    document.getElementById('btnConfirmOrder').disabled = true;
}

function finishLoading() {
    if (typeof toggleLoading === 'function') toggleLoading(false);
    document.getElementById('loadPage').style.display = 'none';
    document.getElementById('info').style.display = 'block';
}

function renderAddresses(list) {
    const container = document.getElementById('listAddress');
    const emptyState = document.getElementById('emptyAddressState');
    const manageLink = document.getElementById('manageAddressLink');

    if (!list || list.length === 0) {
        emptyState.style.display = 'block';
        manageLink.style.display = 'none';
        return;
    }

    // Lưu danh sách addresses
    allAddresses = list;

    emptyState.style.display = 'none';
    manageLink.style.display = 'inline-flex';

    container.innerHTML = list.map((addr, idx) => `
        <div class="address-box ${idx === 0 ? 'selected' : ''}" onclick="changeAddress(this, '${addr.contactId}')"
             data-id="${addr.contactId}">
            <strong>${escapeHtml(addr.contactName)} - ${escapeHtml(addr.phone)}</strong>
            <p>${escapeHtml(addr.address)}</p>
        </div>
    `).join('');

    selectedContactId = list[0]?.contactId || null;
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
                <img src="${item.thumbnail}" referrerpolicy="no-referrer">
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
    if (!selectedContactId) {
        await showDialog("warning", "Vui lòng chọn địa chỉ giao hàng");
        return;
    }
    if (currentCheckoutItems.length === 0) {
        await showDialog("warning", "Không có sản phẩm nào để đặt hàng");
        return;
    }

    // Lấy thông tin contact đã chọn
    const selectedContact = allAddresses.find(addr => addr.contactId === selectedContactId);
    if (!selectedContact) {
        await showDialog("error", "Không tìm thấy thông tin địa chỉ");
        return;
    }

    const paymentMethod = document.querySelector('input[name="paymentType"]:checked').value;

    // Build orderData theo format mới
    const orderData = {
        contactId: selectedContactId,
        contactName: selectedContact.contactName,
        phone: selectedContact.phone,
        address: selectedContact.address,
        paymentMethod: paymentMethod,
        orderItemDTOList: currentCheckoutItems.map(item => ({
            cartItemId: item.cartItemId || null,
            variantId: item.variantId,
            attributeValues: item.attributeValues || [],
            productName: item.productName,
            originalPrice: item.originalPrice || item.price,
            price: item.price,
            imageUrl: item.thumbnail || item.imageUrl || null,
            quantity: item.quantity
        }))
    };

    const btnOrder = document.getElementById('btnConfirmOrder');
    setButtonLoading(btnOrder, true);

    try {
        const result = await callAPI('/orders', 'POST', orderData);

        if (result.success) {
            const orderId = result.data?.orderId || result.data?.id;

            if (!orderId) {
                await showDialog("error", 'Đặt hàng thành công nhưng không nhận được mã đơn hàng');
                setButtonLoading(btnOrder, false);
                return;
            }

            // Clear temp data
            sessionStorage.removeItem(STORAGE_KEYS.BUY_NOW);
            sessionStorage.removeItem(STORAGE_KEYS.CHECKED_IDS);
            sessionStorage.removeItem("checkoutItems");

            // Xử lý redirect theo payment method
            if (paymentMethod === 'VN_PAY') {
                // Gọi API lấy payment URL cho VNPay
                try {
                    const paymentResult = await callAPI(`/payment/vn-pay/${orderId}`, 'GET');

                    if (paymentResult.success && paymentResult.data) {
                        // paymentResult.data có thể là string URL hoặc object {paymentUrl: ...}
                        const paymentUrl = typeof paymentResult.data === 'string'
                            ? paymentResult.data
                            : paymentResult.data.paymentUrl;

                        if (paymentUrl) {
                            window.location.href = paymentUrl;
                        } else {
                            await showDialog("error", 'Không thể lấy link thanh toán VNPay');
                            window.location.href = '../payment/index.html?success=false';
                        }
                    } else {
                        await showDialog("error", paymentResult.message || 'Lỗi khi tạo link thanh toán');
                        window.location.href = '../payment/index.html?success=false';
                    }
                } catch (paymentError) {
                    console.error('Lỗi lấy VNPay URL:', paymentError);
                    await showDialog("error", 'Có lỗi khi tạo link thanh toán');
                    window.location.href = '../payment/index.html?success=false';
                }
            } else {
                // COD - redirect về trang thành công
                window.location.href = '../payment/index.html?success=true';
            }
        } else {
            await showDialog("error", result.message || 'Không thể đặt hàng');
            setButtonLoading(btnOrder, false);
        }
    } catch (error) {
        console.error('Lỗi đặt hàng:', error);
        await showDialog("error", 'Có lỗi xảy ra. Vui lòng thử lại!');
        setButtonLoading(btnOrder, false);
    }
}

function setButtonLoading(button, isLoading) {
    if (isLoading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}