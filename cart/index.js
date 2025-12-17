import { callAPI } from '../public/api.js';
import { showDialog } from '../dialog/index.js';

const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
let cartData = [];
const checked = new Set();
let busy = false;

document.addEventListener("DOMContentLoaded", async () => {
    const res = await callAPI('/auth/carts', 'GET');
    if (res.success) {
        cartData = res.data.listData;
        render();
    } else {
        document.getElementById("cartList").innerHTML = `<p class="text-center p-5">${res.message}</p>`;
    }

    document.querySelector(".checkout-btn").onclick = (e) => {
        if (!e.target.disabled) {
            localStorage.setItem("checkoutItems", JSON.stringify([...checked]));
            window.location.href = '../checkout/index.html';
        }
    };
});

// === 1. UI RENDER ===
function render() {
    const box = document.getElementById("cartList");
    box.innerHTML = "";

    if (!cartData.length) {
        box.innerHTML = "<p style='text-align:center; padding:20px'>Giỏ trống</p>";
        updateTotal();
        return;
    }

    cartData.forEach((p, pIdx) => {
        p.cartItemDTOList.forEach((item, cIdx) => {
            const variant = p.productVariantsDTOList.find(v => v.variantId === item.variantId);
            if (variant) box.appendChild(createRow(p, item, variant, pIdx, cIdx));
        });
    });
    updateTotal();
}

function createRow(p, item, v, pIdx, cIdx) {
    const row = document.createElement("div");
    row.className = "cart-item";
    row.dataset.idx = `${pIdx}-${cIdx}`;

    // Tạo các ô chọn biến thể (size, màu...)
    const selectsHtml = p.attributes.map(a => `
        <select class="variant-select" onchange="changeVar(this)">
            ${a.attributeValues.map(val =>
        `<option value="${val.attributeValueId}" ${v.attributeValueIdList.includes(val.attributeValueId) ? 'selected' : ''}>
                    ${val.attributeValueName}
                </option>`
    ).join('')}
        </select>
    `).join('');

    row.innerHTML = `
        <div class="checkbox-wrapper">
            <input type="checkbox" class="item-checkbox" onchange="toggle('${item.cartItemId}')" ${checked.has(item.cartItemId) ? 'checked' : ''}>
        </div>
        <img src="${v.imageUrl || 'https://via.placeholder.com/80'}" class="item-img">
        <div class="item-info">
            <div class="item-name">${p.productName}</div>
            <div class="variant-box">${selectsHtml}</div>
        </div>
        <div class="item-actions">
            <div class="item-meta">
                <div class="item-price">${money.format(v.price)}</div>
                <div class="item-unit">Kho: ${v.stock}</div>
            </div>
            <div class="qty-control">
                <button class="qty-btn" onclick="modQty('${item.cartItemId}', -1)">-</button>
                <input type="number" value="${item.quantity}" class="qty-input" onchange="modQty('${item.cartItemId}', 0, this.value)">
                <button class="qty-btn" onclick="modQty('${item.cartItemId}', 1)">+</button>
            </div>
        </div>
        <i class="fa-solid fa-trash-can delete-btn" onclick="del('${item.cartItemId}')"></i>
    `;
    return row;
}

function updateTotal() {
    let total = 0, count = 0;
    cartData.forEach(p => p.cartItemDTOList.forEach(i => {
        if (checked.has(i.cartItemId)) {
            const v = p.productVariantsDTOList.find(x => x.variantId === i.variantId);
            if (v) {
                total += v.price * i.quantity;
                count += i.quantity;
            }
        }
    }));

    document.querySelectorAll(".total-price").forEach(e => e.innerText = money.format(total));
    const btn = document.querySelector(".checkout-btn");
    btn.innerText = `Mua hàng (${count})`;
    btn.disabled = !count;
}

// === 2. LOGIC (Gán vào window để HTML gọi được) ===

window.toggle = (id) => {
    checked.has(id) ? checked.delete(id) : checked.add(id);
    updateTotal();
};

window.del = async (id) => {
    if (!confirm("Bạn có chắc muốn xóa sản phẩm này?")) return;

    const res = await callAPI(`/auth/carts/${id}`, 'DELETE');
    if (res.success) {
        cartData.forEach(p => {
            p.cartItemDTOList = p.cartItemDTOList.filter(i => i.cartItemId !== id);
        });
        checked.delete(id);
        render();
    } else {
        await showDialog("error", "Lỗi xóa sản phẩm");
    }
};

window.modQty = async (id, delta, manualVal) => {
    if (busy) return;
    busy = true;
    try {
        let item, v;
        // Tìm item và variant tương ứng trong cartData
        cartData.some(p => {
            item = p.cartItemDTOList.find(x => x.cartItemId === id);
            if (item) v = p.productVariantsDTOList.find(x => x.variantId === item.variantId);
            return item;
        });

        if (!item || !v) return;

        let newQ = manualVal ? parseInt(manualVal) : Number(item.quantity) + delta;

        // Kiểm tra hợp lệ
        if (isNaN(newQ) || newQ < 1) return window.del(id); // Nếu về 0 hoặc lỗi thì xóa
        if (newQ > v.stock) {
            await showDialog("error", `Trong kho chỉ còn ${v.stock} sản phẩm`);
            render(); // Reset lại số cũ trên UI
            return;
        }

        // Gọi API cập nhật
        const res = await callAPI('/auth/carts', 'PUT', { cartItemId: id, variantId: item.variantId, quantity: newQ });
        if (res.success) {
            item.quantity = newQ;
            render();
        } else {
            await showDialog("error", "Lỗi cập nhật số lượng");
            render();
        }
    } finally {
        busy = false;
    }
};

window.changeVar = async (el) => {
    const [pIdx, cIdx] = el.closest(".cart-item").dataset.idx.split('-');
    const item = cartData[pIdx].cartItemDTOList[cIdx];
    const product = cartData[pIdx];

    // Lấy tất cả option đang chọn của dòng đó
    const ids = Array.from(el.parentNode.querySelectorAll("select")).map(s => s.value);

    // Tìm variant khớp với các option đó
    const newV = product.productVariantsDTOList.find(v =>
        ids.every(id => v.attributeValueIdList.includes(id))
    );

    if (newV) {
        const res = await callAPI('/auth/carts', 'PUT', {
            cartItemId: item.cartItemId,
            variantId: newV.variantId,
            quantity: item.quantity
        });

        if (res.success) {
            item.variantId = newV.variantId;
            render();
        } else {
            await showDialog("error", "Lỗi đổi phân loại");
        }
    } else {
        await showDialog("error", "Phân loại này hiện đang hết hàng hoặc không tồn tại");
        render(); // Reset lại select cũ
    }
};