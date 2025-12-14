import { callAPI } from '../public/api.js'; 
import { showDialog } from '../dialog/index.js';

const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
let cartDataGlobal = [];
let checkedItems = new Set();
let isUpdating = false;

document.addEventListener("DOMContentLoaded", async () => {
    await loadCart();
    document.querySelector(".checkout-btn").onclick = (e) => {
        if(!e.target.disabled) {
            localStorage.setItem("checkoutItems", JSON.stringify([...checkedItems]));
            window.location.href = '../checkout/index.html'; 
        }
    };
});

// === 1. LOAD DATA ===
async function loadCart() {
    const res = await callAPI('/auth/carts', 'GET'); 
    if (res.success) {
        cartDataGlobal = res.data;
        renderCartUI();
    } else {
        document.getElementById("cartList").innerHTML = `<p class="text-center p-5">${res.message}</p>`;
        updateSummary();
    }
}

// === 2. UI RENDER ===
function renderCartUI() {
    const container = document.getElementById("cartList");
    container.innerHTML = ""; 

    if (!cartDataGlobal?.length) return container.innerHTML = "<p style='text-align:center; padding:20px'>Giỏ hàng trống</p>";

    cartDataGlobal.forEach((product, pIndex) => {
        product.cartItemDTOList.forEach((cartItem, cIndex) => {
            const variant = product.productVariantsDTOList.find(v => v.variantId === cartItem.variantId);
            if(variant) {
                container.appendChild(createItemRow(product, cartItem, variant, pIndex, cIndex));
            }
        });
    });
    updateSummary();
}

// === HÀM TẠO HTML (CẤU TRÚC MỚI) ===
function createItemRow(product, item, variant, pIndex, cIndex) {
    const row = document.createElement("div");
    row.className = "cart-item";
    row.dataset.pIndex = pIndex; row.dataset.cIndex = cIndex;

    // Dropdown thuộc tính
    const dropdowns = `<div class="variant-box">` + product.attributes.map(attr => `
        <select class="variant-select" onchange="handleVariantChange(this)">
            ${attr.attributeValues.map(v => 
                `<option value="${v.attributeValueId}" ${variant.attributeValueIdList.includes(v.attributeValueId) ? 'selected' : ''}>${v.attributeValueName}</option>`
            ).join('')}
        </select>`).join('') + `</div>`;

    row.innerHTML = `
        <div class="checkbox-wrapper">
            <input type="checkbox" class="item-checkbox" onchange="toggleCheck('${item.cartItemId}')" ${checkedItems.has(item.cartItemId) ? 'checked' : ''}>
        </div>

        <img src="${variant.imageUrl || 'https://via.placeholder.com/80'}" class="item-img">
        
        <div class="item-info">
            <div class="item-name">${product.productName}</div>
            ${dropdowns}
        </div>

        <div class="item-actions">
            <div class="qty-control">
                <button class="qty-btn" onclick="updateQty('${item.cartItemId}', -1)">-</button>
                <input type="number" value="${item.quantity}" class="qty-input" 
                       onchange="manualQty(this, '${item.cartItemId}')"
                       onkeypress="if(event.key==='Enter') manualQty(this,'${item.cartItemId}')">
                <button class="qty-btn" onclick="updateQty('${item.cartItemId}', 1)">+</button>
            </div>
            
            <div class="item-meta">
                <div class="item-price">${money.format(variant.price)}</div>
                <div class="item-unit">Kho: ${variant.stock}</div>
            </div>
        </div>
        
        <div class="delete-btn-wrapper">
            <i class="fa-solid fa-trash-can delete-btn" onclick="removeItem('${item.cartItemId}')" title="Xóa"></i>
        </div>
    `;
    return row;
}

// === 3. LOGIC (Tối ưu RAM) ===
function updateSummary() {
    let total = 0, count = 0;
    cartDataGlobal.forEach(p => p.cartItemDTOList.forEach(i => {
        if (checkedItems.has(i.cartItemId)) {
            const v = p.productVariantsDTOList.find(x => x.variantId === i.variantId);
            if(v) { total += Number(v.price) * i.quantity; count += i.quantity; }
        }
    }));
    document.querySelectorAll(".total-price").forEach(e => e.innerText = money.format(total));
    const btn = document.querySelector(".checkout-btn");
    btn.innerText = `MUA HÀNG (${count})`;
    btn.disabled = count === 0;
}

window.toggleCheck = (id) => {
    checkedItems.has(id) ? checkedItems.delete(id) : checkedItems.add(id);
    updateSummary();
};

async function executeUpdate(cartItemId, newQty) {
    if (isUpdating) return; isUpdating = true;
    try {
        let foundItem, foundVariant;
        for (const p of cartDataGlobal) {
            const i = p.cartItemDTOList.find(x => x.cartItemId === cartItemId);
            if (i) { foundItem = i; foundVariant = p.productVariantsDTOList.find(v => v.variantId === i.variantId); break; }
        }
        if (!foundItem) return;

        if (newQty < 1) return removeItem(cartItemId);
        if (newQty > foundVariant.stock) {
            await showDialog("error", `Kho chỉ còn ${foundVariant.stock}`);
            renderCartUI(); return;
        }

        const res = await callAPI('/auth/carts', 'PUT', { cartItemId, variantId: foundItem.variantId, quantity: newQty });
        if (res.success) {
            foundItem.quantity = newQty; 
            renderCartUI(); 
        } else {
            await showDialog("error", res.message);
            renderCartUI();
        }
    } finally { isUpdating = false; }
}

window.updateQty = (id, delta) => {
    let curr = 0;
    cartDataGlobal.some(p => { const i = p.cartItemDTOList.find(x => x.cartItemId === id); if(i) { curr = i.quantity; return true; } });
    executeUpdate(id, Number(curr) + delta);
};

window.manualQty = (input, id) => {
    let val = parseInt(input.value);
    if (!isNaN(val)) executeUpdate(id, val);
};

window.handleVariantChange = async (select) => {
    const row = select.closest(".cart-item");
    const { pIndex, cIndex } = row.dataset;
    const item = cartDataGlobal[pIndex].cartItemDTOList[cIndex];
    const product = cartDataGlobal[pIndex];

    const selectedIds = Array.from(row.querySelectorAll(".variant-select")).map(s => s.value);
    const newVar = product.productVariantsDTOList.find(v => selectedIds.every(id => v.attributeValueIdList.includes(id)));

    if (newVar) {
        const res = await callAPI('/auth/carts', 'PUT', { cartItemId: item.cartItemId, variantId: newVar.variantId, quantity: item.quantity });
        if (res.success) {
            item.variantId = newVar.variantId;
            renderCartUI(); 
        } else await showDialog("error", res.message);
    } else {
        await showDialog("error", "Hết hàng!"); renderCartUI();
    }
};

window.removeItem = async (id) => {
    if (!confirm("Xóa nhé?")) return;
    const res = await callAPI(`/auth/carts/${id}`, 'DELETE');
    if (res.success) {
        cartDataGlobal.forEach(p => p.cartItemDTOList = p.cartItemDTOList.filter(i => i.cartItemId !== id));
        checkedItems.delete(id);
        renderCartUI();
    } else await showDialog("error", res.message);
};