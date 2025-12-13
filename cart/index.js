// Import các hàm dùng chung (Đảm bảo đường dẫn đúng với dự án của bạn)
import { callAPI } from '../public/api.js'; 
import { showDialog } from '../dialog/index.js';

// Định dạng tiền tệ VNĐ
const moneyFormat = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

// Biến toàn cục lưu dữ liệu giỏ hàng để xử lý
let cartDataGlobal = [];

document.addEventListener("DOMContentLoaded", async () => {
    await loadCart();
});

async function loadCart() {
  const res = await callAPI('/auth/carts', 'GET'); 

    // console.log(res); // Mở cái này ra để soi dữ liệu nếu cần
    
    // Nếu gọi thành công thì nạp dữ liệu vào biến toàn cục và vẽ giao diện
    if (res.success) {
        cartDataGlobal = res.data; // Gán dữ liệu thật server trả về
        renderCartUI(cartDataGlobal);
    } else {
        // Nếu lỗi hoặc chưa có gì thì báo trống
        document.getElementById("cartList").innerHTML = `
            <div style="text-align: center; margin-top: 50px;">
                <p>Giỏ hàng đang trống hoặc lỗi tải dữ liệu</p>
                <p style="color: red">${res.message || ''}</p>
            </div>`;
        updateSummary(0, 0); // Reset tiền về 0
    }
}

function renderCartUI(products) {
    const container = document.getElementById("cartList");
    container.innerHTML = ""; // Xóa nội dung loading

    let totalBill = 0;
    let totalItems = 0;

    products.forEach((product, pIndex) => {
        product.cartItemDTOList.forEach((cartItem, cIndex) => {
            
            // Tìm biến thể hiện tại trong danh sách variants của sản phẩm
            const currentVariant = product.productVariantsDTOList.find(v => v.variantId === cartItem.variantId);
            if(!currentVariant) return;

            // Cộng dồn tổng tiền
            totalBill += Number(currentVariant.price) * cartItem.quantity;
            totalItems += cartItem.quantity;

            // === TẠO GIAO DIỆN DÒNG SẢN PHẨM ===
            const itemRow = document.createElement("div");
            itemRow.className = "cart-item";
            
            // Gắn index vào dataset để hàm handleVariantChange biết đang sửa dòng nào
            itemRow.dataset.pIndex = pIndex; 
            itemRow.dataset.cIndex = cIndex;

            // Xử lý Dropdown thuộc tính
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
                
                <img src="${currentVariant.imageUrl || 'https://via.placeholder.com/80'}" class="item-img">
                
                <div class="item-info">
                    <div class="item-name">${product.productName}</div>
                    ${attributeHTML}
                    <div class="item-price">${moneyFormat.format(currentVariant.price)}</div>
                    <div class="item-unit">Kho: ${currentVariant.stock}</div>
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

    // Cập nhật tổng tiền ra ngoài giao diện
    updateSummary(totalBill, totalItems);
}

function updateSummary(total, items) {
    const totalEls = document.querySelectorAll(".total-price");
    totalEls.forEach(el => el.innerText = moneyFormat.format(total));
    document.querySelector(".checkout-btn").innerText = `MUA HÀNG (${items})`;
}

// === XỬ LÝ SỰ KIỆN GLOBAL ===

// 1. Hàm xử lý khi đổi Dropdown
window.handleVariantChange = (selectElement) => {
    const itemRow = selectElement.closest(".cart-item");
    const pIndex = itemRow.dataset.pIndex;
    const cIndex = itemRow.dataset.cIndex;

    const product = cartDataGlobal[pIndex];
    const cartItem = product.cartItemDTOList[cIndex];

    // Lấy tất cả giá trị đang chọn trong các thẻ select
    const allSelects = itemRow.querySelectorAll(".variant-select");
    const selectedIds = Array.from(allSelects).map(s => s.value);

    // Tìm biến thể khớp với bộ ID vừa chọn
    const newVariant = product.productVariantsDTOList.find(variant => {
        // Kiểm tra xem variant có chứa ĐỦ tất cả các ID đang chọn không
        // (Lưu ý: Logic này giả định variant.attributeValueIdList chứa đủ id của các thuộc tính)
        return selectedIds.every(id => variant.attributeValueIdList.includes(id));
    });

    if (newVariant) {
        // Cập nhật giao diện ngay lập tức
        itemRow.querySelector(".item-img").src = newVariant.imageUrl || 'https://via.placeholder.com/80';
        itemRow.querySelector(".item-price").innerText = moneyFormat.format(newVariant.price);
        itemRow.querySelector(".item-unit").innerText = `Kho: ${newVariant.stock}`;

        // Cập nhật dữ liệu gốc (để khi bấm Mua hàng gửi đúng ID)
        cartItem.variantId = newVariant.variantId;

        // Tính lại tổng tiền
        recalculateTotal();
    } else {
        // alert("Biến thể này không tồn tại!");
        showDialog("error", "Phiên bản này không có sẵn!");
    }
};

function recalculateTotal() {
    let total = 0;
    let count = 0;
    cartDataGlobal.forEach(p => {
        p.cartItemDTOList.forEach(item => {
            const variant = p.productVariantsDTOList.find(v => v.variantId === item.variantId);
            if(variant) {
                total += Number(variant.price) * item.quantity;
                count += item.quantity;
            }
        });
    });
    updateSummary(total, count);
}

// 2. Hàm tăng giảm số lượng
window.updateQty = (id, delta) => {
    console.log("Update Qty", id, delta);
    // Code gọi API update số lượng ở đây...
};

// 3. Hàm xóa
window.removeItem = (id) => {
    console.log("Remove", id);
    // Code gọi API xóa ở đây...
};