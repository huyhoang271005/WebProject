import { callAPI } from '../public/api.js'; // <--- Quay lại dùng hàng chính chủ
import { showDialog } from '../dialog/index.js';

const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

let cartData = [];       // Dữ liệu RAM
let checkedItems = new Set(); // Lưu các món được tick
let isBusy = false;      // Chặn spam click

// === 1. HÀM TIỆN ÍCH (Tìm nhanh item trong RAM) ===
const findItem = (id) => {
    for (const p of cartData) {
        const item = p.cartItemDTOList.find(i => i.cartItemId === id);
        if (item) return { 
            item, 
            variant: p.productVariantsDTOList.find(v => v.variantId === item.variantId),
            product: p 
        };
    }
    return null;
};

// === 2. KHỞI TẠO ===
document.addEventListener("DOMContentLoaded", async () => {
    // Gọi API gốc của nhóm
    const res = await callAPI('/auth/carts', 'GET');
    
    if (res.success) {
        cartData = res.data;
        render();
    } else {
        document.getElementById("cartList").innerHTML = `<p class="text-center p-5 text-red-500">${res.message || 'Lỗi tải dữ liệu'}</p>`;
    }
    
    // Sự kiện nút Mua hàng
    document.querySelector(".checkout-btn").onclick = (e) => {
        if(!e.target.disabled) {
            localStorage.setItem("checkoutItems", JSON.stringify([...checkedItems]));
            window.location.href = '../checkout/index.html';
        }
    };
});

// === 3. RENDER GIAO DIỆN (Từ RAM) ===
function render() {
    const container = document.getElementById("cartList");
    container.innerHTML = "";
    
    if (!cartData?.length) return container.innerHTML = "<p style='text-align:center; padding:20px'>Giỏ hàng trống</p>";

    cartData.forEach((p) => {
        p.cartItemDTOList.forEach((item) => {
            const variant = p.productVariantsDTOList.find(v => v.variantId === item.variantId);
            if (!variant) return;

            // Dropdown
            let selects = `<div class="variant-box">` + p.attributes.map(attr => `
                <select class="variant-select" onchange="changeVar(this)">
                    ${attr.attributeValues.map(v => 
                        `<option value="${v.attributeValueId}" ${variant.attributeValueIdList.includes(v.attributeValueId) ? 'selected' : ''}>${v.attributeValueName}</option>`
                    ).join('')}
                </select>
            `).join('') + `</div>`;

            const row = document.createElement("div");
            row.className = "cart-item";
            row.dataset.id = item.cartItemId; 

            row.innerHTML = `
                <div class="checkbox-wrapper">
                    <input type="checkbox" class="item-checkbox" onchange="toggle('${item.cartItemId}')" ${checkedItems.has(item.cartItemId) ? 'checked' : ''}>
                </div>
                <img src="${variant.imageUrl || 'https://via.placeholder.com/80'}" class="item-img">
                <div class="item-info">
                    <div class="item-name">${p.productName}</div>
                    ${selects}
                    <div class="item-price">${money.format(variant.price)}</div>
                    <div class="item-unit">Kho: ${variant.stock}</div>
                </div>
                <div class="qty-control">
                    <button class="qty-btn" onclick="modifyQty('${item.cartItemId}', -1)">-</button>
                    <input type="number" value="${item.quantity}" class="qty-input" 
                           onchange="modifyQty('${item.cartItemId}', 0, this.value)">
                    <button class="qty-btn" onclick="modifyQty('${item.cartItemId}', 1)">+</button>
                    <i class="fa-solid fa-trash-can delete-btn" style="margin-left:15px" onclick="remove('${item.cartItemId}')"></i>
                </div>
            `;
            container.appendChild(row);
        });
    });
    updateTotal();
}

function updateTotal() {
    let total = 0, count = 0;
    cartData.forEach(p => p.cartItemDTOList.forEach(i => {
        if (checkedItems.has(i.cartItemId)) {
            const v = p.productVariantsDTOList.find(v => v.variantId === i.variantId);
            if (v) { total += Number(v.price) * i.quantity; count += i.quantity; }
        }
    }));
    
    document.querySelectorAll(".total-price").forEach(e => e.innerText = money.format(total));
    const btn = document.querySelector(".checkout-btn");
    btn.innerText = `MUA HÀNG (${count})`;
    btn.disabled = count === 0;
}

// === 4. CÁC HÀM XỬ LÝ (Tối ưu: Update RAM -> Render) ===

window.toggle = (id) => {
    checkedItems.has(id) ? checkedItems.delete(id) : checkedItems.add(id);
    updateTotal();
};

window.remove = async (id) => {
    if (!confirm("Bạn muốn xóa sản phẩm này?")) return;
    
    // Gọi API Delete gốc
    const res = await callAPI(`/auth/carts/${id}`, 'DELETE');
    
    if (res.success) {
        // Xóa khỏi RAM & Render lại
        cartData.forEach(p => p.cartItemDTOList = p.cartItemDTOList.filter(i => i.cartItemId !== id));
        checkedItems.delete(id);
        render(); 
    } else {
        await showDialog("error", res.message || "Lỗi xóa");
    }
};

window.modifyQty = async (id, delta, manualVal = null) => {
    if (isBusy) return; isBusy = true;
    try {
        const data = findItem(id);
        if (!data) return;

        let newQ = manualVal ? parseInt(manualVal) : Number(data.item.quantity) + Number(delta);
        
        if (isNaN(newQ) || newQ < 1) return window.remove(id); 
        if (newQ > data.variant.stock) {
            await showDialog("error", `Kho chỉ còn ${data.variant.stock}`);
            render(); 
            return;
        }

        const payload = { 
            cartItemId: id, 
            variantId: data.item.variantId, 
            quantity: newQ 
        };

        // Gọi API PUT gốc (Giả sử api.js đã fix lỗi JSON/Form Data)
        const res = await callAPI('/auth/carts', 'PUT', payload);

        if (res.success) {
            // Update RAM & Render lại
            data.item.quantity = newQ; 
            render(); 
        } else {
            await showDialog("error", res.message || "Lỗi cập nhật");
            render(); // Reset về cũ
        }
    } finally { isBusy = false; }
};

window.changeVar = async (el) => {
    const row = el.closest(".cart-item");
    const { item, product } = findItem(row.dataset.id);
    
    const selectedIds = Array.from(row.querySelectorAll(".variant-select")).map(s => s.value);
    const newVar = product.productVariantsDTOList.find(v => selectedIds.every(id => v.attributeValueIdList.includes(id)));

    if (newVar) {
        const payload = { 
            cartItemId: item.cartItemId, 
            variantId: newVar.variantId, 
            quantity: item.quantity 
        };

        // Gọi API PUT gốc
        const res = await callAPI('/auth/carts', 'PUT', payload);

        if (res.success) {
            // Update RAM & Render lại
            item.variantId = newVar.variantId; 
            render(); 
        } else { 
            await showDialog("error", res.message || "Lỗi đổi biến thể"); 
            render();
        }
    } else {
        await showDialog("error", "Hết hàng hoặc không tồn tại!");
        render();
    }
};