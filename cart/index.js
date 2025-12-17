import { callAPI } from '../public/api.js'; 
import { showDialog } from '../dialog/index.js';

const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
let cartData = [], checked = new Set(), busy = false;

document.addEventListener("DOMContentLoaded", async () => {
    const res = await callAPI('/auth/carts', 'GET');
    if (res.success) { cartData = res.data; render(); } 
    else document.getElementById("cartList").innerHTML = `<p class="text-center p-5">${res.message}</p>`;
    
    document.querySelector(".checkout-btn").onclick = (e) => {
        if(!e.target.disabled) {
            localStorage.setItem("checkoutItems", JSON.stringify([...checked]));
            window.location.href = '../checkout/index.html'; 
        }
    };
});

// === 1. UI RENDER ===
function render() {
    const box = document.getElementById("cartList");
    box.innerHTML = "";
    if (!cartData.length) return box.innerHTML = "<p style='text-align:center; padding:20px'>Giỏ trống</p>";

    cartData.forEach((p, pIdx) => p.cartItemDTOList.forEach((item, cIdx) => {
        const variant = p.productVariantsDTOList.find(v => v.variantId === item.variantId);
        if(variant) box.appendChild(createRow(p, item, variant, pIdx, cIdx));
    }));
    updateTotal();
}

function createRow(p, item, v, pIdx, cIdx) {
    const row = document.createElement("div");
    row.className = "cart-item";
    row.dataset.idx = `${pIdx}-${cIdx}`;

    const selects = `<div class="variant-box">` + p.attributes.map(a => `
        <select class="variant-select" onchange="changeVar(this)">
            ${a.attributeValues.map(val => `<option value="${val.attributeValueId}" ${v.attributeValueIdList.includes(val.attributeValueId)?'selected':''}>${val.attributeValueName}</option>`).join('')}
        </select>`).join('') + `</div>`;

    // --- HTML ĐÃ CẬP NHẬT CẤU TRÚC MỚI ---
    row.innerHTML = `
        <div class="checkbox-wrapper">
            <input type="checkbox" class="item-checkbox" onchange="toggle('${item.cartItemId}')" ${checked.has(item.cartItemId)?'checked':''}>
        </div>
        <img src="${v.imageUrl||'https://via.placeholder.com/80'}" class="item-img">
        
        <div class="item-info">
            <div class="item-name">${p.productName}</div>
            ${selects}
        </div>

        <div class="item-actions">
            <div class="qty-control">
                <button class="qty-btn" onclick="modQty('${item.cartItemId}', -1)">-</button>
                <input type="number" value="${item.quantity}" class="qty-input" onchange="modQty('${item.cartItemId}', 0, this.value)">
                <button class="qty-btn" onclick="modQty('${item.cartItemId}', 1)">+</button>
            </div>
            <div class="item-meta">
                <div class="item-price">${money.format(v.price)}</div>
                <div class="item-unit">Kho: ${v.stock}</div>
            </div>
        </div>
        
        <div class="delete-btn-wrapper">
            <i class="fa-solid fa-trash-can delete-btn" onclick="del('${item.cartItemId}')"></i>
        </div>`;
    return row;
}

function updateTotal() {
    let total = 0, count = 0;
    cartData.forEach(p => p.cartItemDTOList.forEach(i => {
        if(checked.has(i.cartItemId)) {
            const v = p.productVariantsDTOList.find(x => x.variantId === i.variantId);
            if(v) { total += v.price * i.quantity; count += i.quantity; }
        }
    }));
    document.querySelectorAll(".total-price").forEach(e => e.innerText = money.format(total));
    const btn = document.querySelector(".checkout-btn");
    btn.innerText = `MUA HÀNG (${count})`; btn.disabled = !count;
}

// === 2. LOGIC ===
window.toggle = (id) => { checked.has(id) ? checked.delete(id) : checked.add(id); updateTotal(); };

window.del = async (id) => {
    if(!confirm("Xóa nhé?")) return;
    if((await callAPI(`/auth/carts/${id}`, 'DELETE')).success) {
        cartData.forEach(p => p.cartItemDTOList = p.cartItemDTOList.filter(i => i.cartItemId !== id));
        checked.delete(id); render();
    } else await showDialog("error", "Lỗi xóa");
};

window.modQty = async (id, delta, manualVal) => {
    if(busy) return; busy = true;
    try {
        let item, v;
        cartData.some(p => { item = p.cartItemDTOList.find(x => x.cartItemId === id); if(item) v = p.productVariantsDTOList.find(x => x.variantId === item.variantId); return item; });
        if(!item) return;

        let newQ = manualVal ? parseInt(manualVal) : Number(item.quantity) + delta;
        if(isNaN(newQ) || newQ < 1) return window.del(id);
        if(newQ > v.stock) { await showDialog("error", `Kho còn ${v.stock}`); render(); return; }

        if((await callAPI('/auth/carts', 'PUT', { cartItemId: id, variantId: item.variantId, quantity: newQ })).success) {
            item.quantity = newQ; render();
        } else { await showDialog("error", "Lỗi cập nhật"); render(); }
    } finally { busy = false; }
};

window.changeVar = async (el) => {
    const [pIdx, cIdx] = el.closest(".cart-item").dataset.idx.split('-');
    const item = cartData[pIdx].cartItemDTOList[cIdx];
    const product = cartData[pIdx];
    const ids = Array.from(el.parentNode.querySelectorAll("select")).map(s => s.value);
    const newV = product.productVariantsDTOList.find(v => ids.every(id => v.attributeValueIdList.includes(id)));

    if(newV) {
        if((await callAPI('/auth/carts', 'PUT', { cartItemId: item.cartItemId, variantId: newV.variantId, quantity: item.quantity })).success) {
            item.variantId = newV.variantId; render();
        } else await showDialog("error", "Lỗi đổi");
    } else { await showDialog("error", "Hết hàng"); render(); }
};