import { callAPI } from '../public/api.js'; 
import { showDialog } from '../dialog/index.js';

// Định dạng tiền tệ VNĐ
const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

// Dữ liệu trong RAM (Single Source of Truth)
// Mọi thao tác sửa/xóa sẽ cập nhật trực tiếp vào biến này
let cartDataGlobal = []; 
let isUpdating = false;

document.addEventListener("DOMContentLoaded", async () => {
    // CHỈ GỌI API LOAD CART ĐÚNG 1 LẦN DUY NHẤT Ở ĐÂY
    await loadCart();
    setupCheckoutEvent();
});

// === 1. HÀM TẢI DỮ LIỆU (Chỉ gọi lần đầu) ===
async function loadCart() {
    const res = await callAPI('/auth/carts', 'GET'); 

    if (res.success) {
        cartDataGlobal = res.data;
        renderCartUI(); // Vẽ giao diện từ RAM
    } else {
        document.getElementById("cartList").innerHTML = `
            <div style="text-align: center; margin-top: 50px; color: #666;">
                <p>Giỏ hàng trống hoặc lỗi tải</p>
                <p style="font-size: 0.8rem; color: red">${res.message || ''}</p>
            </div>`;
        updateSummary(0, 0);
    }
}

// === 2. HÀM VẼ GIAO DIỆN (Từ RAM - Không gọi API) ===
function renderCartUI() {
    const container = document.getElementById("cartList");
    container.innerHTML = ""; 

    let totalBill = 0;
    let totalItems = 0;

    // Kiểm tra nếu RAM trống
    if (!cartDataGlobal || cartDataGlobal.length === 0) {
        container.innerHTML = "<p style='text-align:center; padding: 20px;'>Giỏ hàng trống</p>";
        updateSummary(0, 0);
        return;
    }

    cartDataGlobal.forEach((product, pIndex) => {
        product.cartItemDTOList.forEach((cartItem, cIndex) => {
            const currentVariant = product.productVariantsDTOList.find(v => v.variantId === cartItem.variantId);
            if(!currentVariant) return;

            totalBill += Number(currentVariant.price) * cartItem.quantity;
            totalItems += cartItem.quantity;

            const itemRow = document.createElement("div");
            itemRow.className = "cart-item";
            // Lưu index để truy xuất nhanh vào RAM
            itemRow.dataset.pIndex = pIndex; 
            itemRow.dataset.cIndex = cIndex;

            // Render Dropdown
            let attributeHTML = `<div class="variant-box">`;
            product.attributes.forEach(attr => {
                attributeHTML += `<select class="variant-select" onchange="handleVariantChange(this)">`;
                attr.attributeValues.forEach(val => {
                    const isSelected = currentVariant.attributeValueIdList.includes(val.attributeValueId);
                    attributeHTML += `<option value="${val.attributeValueId}" ${isSelected ? 'selected' : ''}>${val.attributeValueName}</option>`;
                });
                attributeHTML += `</select>`;
            });
            attributeHTML += `</div>`;

            itemRow.innerHTML = `
                <i class="fa-solid fa-trash-can delete-btn" onclick="removeItem('${cartItem.cartItemId}')"></i>
                
                <img src="${currentVariant.imageUrl || 'https://via.placeholder.com/100'}" class="item-img">
                
                <div class="item-info">
                    <div class="item-name">${product.productName}</div>
                    ${attributeHTML}
                    <div class="item-price">${money.format(currentVariant.price)}</div>
                    <div class="item-unit">Kho: <span class="stock-val">${currentVariant.stock}</span></div>
                </div>

                <div class="qty-control">
                    <button class="qty-btn" onclick="updateQty('${cartItem.cartItemId}', -1)">-</button>
                    <input type="text" value="${cartItem.quantity}" class="qty-input" readonly>
                    <button class="qty-btn" onclick="updateQty('${cartItem.cartItemId}', 1)">+</button>
                </div>
            `;
            container.appendChild(itemRow);
        });
    });

    updateSummary(totalBill, totalItems);
}

function updateSummary(total, items) {
    const totalEls = document.querySelectorAll(".total-price");
    totalEls.forEach(el => el.innerText = money.format(total));
    const btn = document.querySelector(".checkout-btn");
    btn.innerText = `MUA HÀNG (${items})`;
    
    if(items === 0) {
        btn.disabled = true;
        btn.style.opacity = "0.6";
    } else {
        btn.disabled = false;
        btn.style.opacity = "1";
    }
}

// === 3. CÁC HÀM XỬ LÝ (Tối ưu: Update RAM -> Render) ===

// Tăng/Giảm số lượng
window.updateQty = async (cartItemId, delta) => {
    if (isUpdating) return;
    isUpdating = true;

    try {
        // 1. Tìm object trong RAM (Không gọi API)
        let foundItem = null;
        let foundVariant = null;

        for (const p of cartDataGlobal) {
            const item = p.cartItemDTOList.find(i => i.cartItemId === cartItemId);
            if (item) {
                foundItem = item;
                foundVariant = p.productVariantsDTOList.find(v => v.variantId === item.variantId);
                break;
            }
        }

        if (!foundItem) { isUpdating = false; return; }

        const newQty = Number(foundItem.quantity) + Number(delta);

        if (newQty < 1) {
            await removeItem(cartItemId);
            isUpdating = false;
            return;
        }

        if (newQty > foundVariant.stock) {
            await showDialog("error", `Kho chỉ còn ${foundVariant.stock}`);
            renderCartUI(); // Reset lại số cũ trên UI
            isUpdating = false;
            return;
        }

        // 2. Gọi API Update
        const payload = {
            cartItemId: cartItemId,
            variantId: foundItem.variantId,
            quantity: newQty
        };

        const res = await callAPI('/auth/carts', 'PUT', payload);

        if (res.success) {
            // === KEY POINT: Cập nhật RAM & Render ===
            // Sửa trực tiếp số lượng trong biến cartDataGlobal
            foundItem.quantity = newQty; 
            
            console.log("Update thành công -> Vẽ lại UI từ RAM (Không load lại API)");
            renderCartUI(); // Vẽ lại giao diện ngay lập tức
        } else {
            await showDialog("error", res.message || "Lỗi cập nhật");
            renderCartUI(); // Reset về cũ nếu lỗi
        }

    } catch (e) {
        console.error(e);
        await showDialog("error", "Lỗi xử lý");
    } finally {
        isUpdating = false;
    }
};

// Đổi biến thể (Màu/Size)
window.handleVariantChange = async (selectElement) => {
    const itemRow = selectElement.closest(".cart-item");
    // Lấy index để truy xuất nhanh vào RAM
    const pIndex = itemRow.dataset.pIndex;
    const cIndex = itemRow.dataset.cIndex;

    const product = cartDataGlobal[pIndex];
    const cartItem = product.cartItemDTOList[cIndex];

    const allSelects = itemRow.querySelectorAll(".variant-select");
    const selectedIds = Array.from(allSelects).map(s => s.value);

    // Tìm variant mới trong RAM
    const newVariant = product.productVariantsDTOList.find(v => 
        selectedIds.every(id => v.attributeValueIdList.includes(id))
    );

    if (newVariant) {
        const payload = {
            cartItemId: cartItem.cartItemId,
            variantId: newVariant.variantId,
            quantity: cartItem.quantity
        };

        const res = await callAPI('/auth/carts', 'PUT', payload);

        if (res.success) {
            // === KEY POINT: Cập nhật RAM & Render ===
            cartItem.variantId = newVariant.variantId; 
            renderCartUI(); 
        } else {
            await showDialog("error", res.message || "Lỗi đổi biến thể");
            renderCartUI();
        }
    } else {
        await showDialog("error", "Phiên bản này không có sẵn!");
        renderCartUI();
    }
};

// Xóa sản phẩm
window.removeItem = async (cartItemId) => {
    if (!confirm("Bạn có chắc chắn muốn xóa?")) return;

    const res = await callAPI(`/auth/carts/${cartItemId}`, 'DELETE');

    if (res.success) {
        // === KEY POINT: Cập nhật RAM & Render ===
        // Lọc bỏ item đã xóa khỏi mảng cartDataGlobal
        cartDataGlobal.forEach(p => {
            p.cartItemDTOList = p.cartItemDTOList.filter(i => i.cartItemId !== cartItemId);
        });
        
        console.log("Xóa thành công -> Vẽ lại UI từ RAM");
        renderCartUI(); 
    } else {
        await showDialog("error", res.message || "Lỗi xóa");
    }
};

function setupCheckoutEvent() {
    const btn = document.querySelector(".checkout-btn");
    btn.onclick = () => {
        if(!btn.disabled) {
            window.location.href = '../checkout/index.html'; 
        }
    };
}