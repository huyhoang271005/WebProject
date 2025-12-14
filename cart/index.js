import { showDialog } from '../dialog/index.js';
import { callAPI } from '../public/api.js'; 

const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

let cartData = [];       // Dữ liệu RAM (Quan trọng để không phải load lại API)
let checkedItems = new Set(); // Lưu các món được tick
let isBusy = false;      // Chặn spam click

// === 1. HÀM API (Gọn nhẹ & Tự xử lý Token/FormData) ===
async function api(path, method = 'GET', body = null) {
    try {
        const opts = {
            method,
            headers: { "Authorization": `Bearer ${MY_TOKEN}`, "ngrok-skip-browser-warning": "1" }
        };
        if (body) {
            // Tự chuyển JSON -> Form Data (để tránh lỗi 415/422 Backend)
            opts.body = new URLSearchParams(body);
            opts.headers["Content-Type"] = "application/x-www-form-urlencoded";
        }
        const res = await fetch(API_BASE + path, opts);
        if (res.status === 401) return { success: false, message: "Hết hạn đăng nhập" };
        return await res.json();
    } catch (e) { return { success: false, message: "Lỗi kết nối" }; }
}

// === 2. HÀM TIỆN ÍCH (Tìm nhanh item trong RAM) ===
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

// === 3. KHỞI TẠO ===
document.addEventListener("DOMContentLoaded", async () => {
    // CHỈ GỌI API LOAD CART ĐÚNG 1 LẦN DUY NHẤT Ở ĐÂY
    const res = await api('/auth/carts');
    if (res.success) {
        cartData = res.data;
        render();
    } else {
        document.getElementById("cartList").innerHTML = `<p class="text-center p-5 text-red-500">${res.message}</p>`;
    }
    
    // Sự kiện nút Mua hàng
    document.querySelector(".checkout-btn").onclick = (e) => {
        if(!e.target.disabled) {
            localStorage.setItem("checkoutItems", JSON.stringify([...checkedItems]));
            window.location.href = '../checkout/index.html';
        }
    };
});

// === 4. RENDER GIAO DIỆN (Hoàn toàn từ RAM) ===
function render() {
    const container = document.getElementById("cartList");
    container.innerHTML = "";
    
    if (!cartData?.length) return container.innerHTML = "<p style='text-align:center; padding:20px'>Giỏ hàng trống</p>";

    cartData.forEach((p) => {
        p.cartItemDTOList.forEach((item) => {
            const variant = p.productVariantsDTOList.find(v => v.variantId === item.variantId);
            if (!variant) return;

            // Dropdown chọn màu/size
            let selects = `<div class="variant-box">` + p.attributes.map(attr => `
                <select class="variant-select" onchange="changeVar(this)">
                    ${attr.attributeValues.map(v => 
                        `<option value="${v.attributeValueId}" ${variant.attributeValueIdList.includes(v.attributeValueId) ? 'selected' : ''}>${v.attributeValueName}</option>`
                    ).join('')}
                </select>
            `).join('') + `</div>`;

            const row = document.createElement("div");
            row.className = "cart-item";
            row.dataset.id = item.cartItemId; // Gắn ID để truy xuất

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
    // Chỉ tính tiền những món được TICK
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

// === 5. CÁC HÀM XỬ LÝ (Tối ưu: Update RAM -> Render) ===

// Tick chọn mua
window.toggle = (id) => {
    checkedItems.has(id) ? checkedItems.delete(id) : checkedItems.add(id);
    updateTotal();
};

// Xóa sản phẩm
window.remove = async (id) => {
    if (!confirm("Bạn muốn xóa sản phẩm này?")) return;
    const res = await api(`/auth/carts/${id}`, 'DELETE');
    if (res.success) {
        // Update RAM: Lọc bỏ item đã xóa
        cartData.forEach(p => p.cartItemDTOList = p.cartItemDTOList.filter(i => i.cartItemId !== id));
        checkedItems.delete(id);
        render(); // Vẽ lại ngay lập tức
    } else {
        await showDialog("error", res.message);
    }
};

// Tăng/Giảm/Nhập số lượng
window.modifyQty = async (id, delta, manualVal = null) => {
    if (isBusy) return; isBusy = true;
    try {
        const data = findItem(id);
        if (!data) return;

        let newQ = manualVal ? parseInt(manualVal) : Number(data.item.quantity) + Number(delta);
        
        if (isNaN(newQ) || newQ < 1) return window.remove(id); 
        if (newQ > data.variant.stock) {
            await showDialog("error", `Kho chỉ còn ${data.variant.stock}`);
            render(); // Reset lại số cũ
            return;
        }

        const res = await api('/auth/carts', 'PUT', { 
            cartItemId: id, 
            variantId: data.item.variantId, 
            quantity: newQ 
        });

        if (res.success) {
            // === KEY POINT: Cập nhật RAM & Render ===
            data.item.quantity = newQ; 
            render(); 
        } else {
            await showDialog("error", res.message);
            render(); // Reset nếu lỗi
        }
    } finally { isBusy = false; }
};

// Đổi biến thể (Màu/Size)
window.changeVar = async (el) => {
    const row = el.closest(".cart-item");
    const { item, product } = findItem(row.dataset.id);
    
    const selectedIds = Array.from(row.querySelectorAll(".variant-select")).map(s => s.value);
    const newVar = product.productVariantsDTOList.find(v => selectedIds.every(id => v.attributeValueIdList.includes(id)));

    if (newVar) {
        const res = await api('/auth/carts', 'PUT', { 
            cartItemId: item.cartItemId, 
            variantId: newVar.variantId, 
            quantity: item.quantity 
        });

        if (res.success) {
            // === KEY POINT: Cập nhật RAM & Render ===
            item.variantId = newVar.variantId; 
            render(); 
        } else { 
            await showDialog("error", res.message); 
            render();
        }
    } else {
        await showDialog("error", "Hết hàng hoặc không tồn tại!");
        render(); // Reset dropdown về cũ
    }
};