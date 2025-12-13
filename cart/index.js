import { callAPI } from '../public/api.js'; 
import { showDialog } from '../dialog/index.js';

// Định dạng tiền tệ VNĐ
const moneyFormat = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

// Biến toàn cục lưu dữ liệu
let cartDataGlobal = [];
// Cờ chặn spam click
let isUpdating = false;

document.addEventListener("DOMContentLoaded", async () => {
    await loadCart();
    setupCheckoutEvent();
});

// === 1. HÀM TẢI DỮ LIỆU GIỎ HÀNG (GET) ===
async function loadCart() {
    // Gọi API lấy danh sách: GET /auth/carts
    const res = await callAPI('/auth/carts', 'GET'); 

    if (res.success) {
        cartDataGlobal = res.data;
        renderCartUI(cartDataGlobal);
    } else {
        // Xử lý khi lỗi hoặc rỗng
        document.getElementById("cartList").innerHTML = `
            <div style="text-align: center; margin-top: 50px; color: #666;">
                <i class="fa-solid fa-cart-arrow-down" style="font-size: 3rem; margin-bottom: 10px;"></i>
                <p>Giỏ hàng trống hoặc chưa đăng nhập</p>
                <p style="font-size: 0.8rem; color: red">${res.message || ''}</p>
            </div>`;
        updateSummary(0, 0);
    }
}

// === 2. HÀM VẼ GIAO DIỆN (RENDER) ===
function renderCartUI(products) {
    const container = document.getElementById("cartList");
    container.innerHTML = ""; 

    let totalBill = 0;
    let totalItems = 0;

    // Kiểm tra giỏ rỗng
    if (!products || products.length === 0) {
        container.innerHTML = "<p style='text-align:center; padding: 20px;'>Chưa có sản phẩm nào trong giỏ</p>";
        updateSummary(0, 0);
        return;
    }

    products.forEach((product, pIndex) => {
        // Duyệt qua từng item trong cartItemDTOList
        product.cartItemDTOList.forEach((cartItem, cIndex) => {
            
            // Tìm biến thể khớp với variantId trong giỏ
            const currentVariant = product.productVariantsDTOList.find(v => v.variantId === cartItem.variantId);
            
            // Nếu dữ liệu lỗi (không tìm thấy variant), bỏ qua để tránh crash web
            if(!currentVariant) return;

            // Tính toán tổng tiền
            totalBill += Number(currentVariant.price) * cartItem.quantity;
            totalItems += cartItem.quantity;

            // Tạo thẻ div cho dòng sản phẩm
            const itemRow = document.createElement("div");
            itemRow.className = "cart-item";
            // Lưu index để dùng cho hàm đổi biến thể
            itemRow.dataset.pIndex = pIndex; 
            itemRow.dataset.cIndex = cIndex;

            // --- Xử lý Dropdown thuộc tính (Shopee Style) ---
            let attributeHTML = `<div class="variant-box">`;
            product.attributes.forEach(attr => {
                attributeHTML += `<select class="variant-select" onchange="handleVariantChange(this)">`;
                attr.attributeValues.forEach(val => {
                    // Kiểm tra xem variant hiện tại có chứa thuộc tính này không để set 'selected'
                    const isSelected = currentVariant.attributeValueIdList.includes(val.attributeValueId);
                    attributeHTML += `<option value="${val.attributeValueId}" ${isSelected ? 'selected' : ''}>${val.attributeValueName}</option>`;
                });
                attributeHTML += `</select>`;
            });
            attributeHTML += `</div>`;
            // ------------------------------------------------

            // Chèn HTML vào dòng
            itemRow.innerHTML = `
                <i class="fa-solid fa-trash-can delete-btn" onclick="removeItem('${cartItem.cartItemId}')" title="Xóa sản phẩm"></i>
                
                <img src="${currentVariant.imageUrl || 'https://via.placeholder.com/100'}" class="item-img">
                
                <div class="item-info">
                    <div class="item-name">${product.productName}</div>
                    ${attributeHTML}
                    <div class="item-price">${moneyFormat.format(currentVariant.price)}</div>
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

// Hàm cập nhật phần tổng tiền bên phải
function updateSummary(total, items) {
    const totalEls = document.querySelectorAll(".total-price");
    totalEls.forEach(el => el.innerText = moneyFormat.format(total));
    
    const checkoutBtn = document.querySelector(".checkout-btn");
    checkoutBtn.innerText = `MUA HÀNG (${items})`;
    
    // Disable nút mua nếu không có hàng
    if(items === 0) {
        checkoutBtn.disabled = true;
        checkoutBtn.style.opacity = "0.6";
        checkoutBtn.style.cursor = "not-allowed";
    } else {
        checkoutBtn.disabled = false;
        checkoutBtn.style.opacity = "1";
        checkoutBtn.style.cursor = "pointer";
    }
}

// Chuyển trang khi bấm Mua hàng
function setupCheckoutEvent() {
    const btn = document.querySelector(".checkout-btn");
    btn.onclick = () => {
        if(!btn.disabled) {
            window.location.href = '../checkout/index.html'; // Sửa đường dẫn nếu cần
        }
    };
}

// === 3. XỬ LÝ SỰ KIỆN: ĐỔI BIẾN THỂ (DROPDOWN) ===
window.handleVariantChange = async (selectElement) => {
    const itemRow = selectElement.closest(".cart-item");
    const pIndex = itemRow.dataset.pIndex;
    const cIndex = itemRow.dataset.cIndex;

    const product = cartDataGlobal[pIndex];
    const cartItem = product.cartItemDTOList[cIndex];

    // Lấy tất cả giá trị đang chọn trong các thẻ select
    const allSelects = itemRow.querySelectorAll(".variant-select");
    const selectedIds = Array.from(allSelects).map(s => s.value);

    // Logic: Tìm variant nào trong danh sách mà chứa ĐỦ tất cả các ID thuộc tính đang chọn
    const newVariant = product.productVariantsDTOList.find(variant => {
        return selectedIds.every(id => variant.attributeValueIdList.includes(id));
    });

    if (newVariant) {
        // Cập nhật giao diện ngay lập tức (Ảnh, Giá, Tồn kho)
        itemRow.querySelector(".item-img").src = newVariant.imageUrl || 'https://via.placeholder.com/100';
        itemRow.querySelector(".item-price").innerText = moneyFormat.format(newVariant.price);
        itemRow.querySelector(".item-unit").innerHTML = `Kho: <span class="stock-val">${newVariant.stock}</span>`;

        // Cập nhật ID biến thể vào cartItem trong bộ nhớ tạm
        cartItem.variantId = newVariant.variantId;
        
        // Lưu ý: Hiện tại Backend chưa cung cấp API đổi variant, nên đây chỉ là đổi trên giao diện.
        // Khi F5 lại trang nó sẽ về như cũ. Nếu muốn lưu, cần hỏi thêm API Update Variant.
        
    } else {
        await showDialog("error", "Phiên bản này không có sẵn hoặc hết hàng!");
        // (Có thể thêm code reset lại dropdown nếu muốn)
    }
};

// === 4. XỬ LÝ SỰ KIỆN: TĂNG GIẢM SỐ LƯỢNG (PUT) ===
window.updateQty = async (cartItemId, delta) => {
   if (isUpdating) return;
    isUpdating = true;

    try {
        // 1. Tìm thông tin sản phẩm
        let foundItem = null;
        let foundVariant = null;

        for (const p of cartDataGlobal) {
            const item = p.cartItemDTOList.find(i => i.cartItemId === cartItemId);
            if (item) {
                foundItem = item;
                // Tìm variant tương ứng
                foundVariant = p.productVariantsDTOList.find(v => v.variantId === item.variantId);
                break;
            }
        }

        if (!foundItem || !foundVariant) { isUpdating = false; return; }

        const newQty = foundItem.quantity + delta;

        // 2. Validate
        if (newQty < 1) {
            await removeItem(cartItemId);
            isUpdating = false;
            return;
        }

        if (newQty > foundVariant.stock) {
            await showDialog("error", `Trong kho chỉ còn ${foundVariant.stock} sản phẩm!`);
            isUpdating = false;
            return;
        }

        // 3. Chuẩn bị dữ liệu gửi đi (Đã bổ sung variantId)
        const payload = {
            cartItemId: cartItemId,
            variantId: foundItem.variantId, // <--- THÊM DÒNG QUAN TRỌNG NÀY
            quantity: newQty
        };

        // 4. Gọi API
        const res = await callAPI('/auth/carts', 'PUT', payload);

        if (res.success) {
            await loadCart();
        } else {
            await showDialog("error", res.message || "Lỗi cập nhật số lượng");
        }

    } catch (e) {
        console.error(e);
        await showDialog("error", "Có lỗi xảy ra");
    } finally {
        isUpdating = false;
    }
};

// === 5. XỬ LÝ SỰ KIỆN: XÓA SẢN PHẨM (DELETE) ===
window.removeItem = async (cartItemId) => {
    if (!confirm("Bạn có chắc chắn muốn xóa sản phẩm này?")) return;

    // Gọi API Xóa: DELETE /auth/carts/{id}
    const res = await callAPI(`/auth/carts/${cartItemId}`, 'DELETE');

    if (res.success) {
        // await showDialog("success", "Đã xóa sản phẩm"); // Tắt thông báo cho thao tác nhanh
        await loadCart(); 
    } else {
        await showDialog("error", res.message || "Lỗi khi xóa sản phẩm");
    }
};