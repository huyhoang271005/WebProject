import { callAPI } from '../public/api.js'; 
import { showDialog } from '../dialog/index.js';

const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

let cartDataGlobal = [];
let checkedItems = new Set();
let isBusy = false;

document.addEventListener("DOMContentLoaded", async () => {
    await loadCart();
    setupCheckoutEvent();
});

// ============================================================
//  PHẦN 1: LOGIC XỬ LÝ DỮ LIỆU (GỌI API, TÍNH TOÁN)
// ============================================================

async function loadCart() {
    const res = await callAPI('/auth/carts', 'GET'); 
    if (res.success) {
        cartDataGlobal = res.data;
        renderCartUI();
    } else {
        showEmptyMsg(res.message);
    }
}

async function updateItem(cartItemId, newQty, newVariantId = null) {
    if (isBusy) return; isBusy = true;
    try {
        // Tìm dữ liệu trong RAM
        let foundItem, foundVariant;
        for (const p of cartDataGlobal) {
            const i = p.cartItemDTOList.find(x => x.cartItemId === cartItemId);
            if (i) { foundItem = i; foundVariant = p.productVariantsDTOList.find(v => v.variantId === (newVariantId || i.variantId)); break; }
        }

        if (!foundItem) return;

        // Validate
        if (newQty < 1) return removeItem(cartItemId);
        if (newQty > foundVariant.stock) {
            await showDialog("error", `Kho chỉ còn ${foundVariant.stock}`);
            renderCartUI(); return;
        }

        // Gọi API
        const payload = { 
            cartItemId, 
            quantity: newQty, 
            variantId: foundVariant.variantId 
        };
        const res = await callAPI('/auth/carts', 'PUT', payload);

        if (res.success) {
            // Update RAM
            foundItem.quantity = newQty;
            if (newVariantId) foundItem.variantId = newVariantId;
            renderCartUI();
        } else {
            await showDialog("error", res.message);
            renderCartUI();
        }
    } finally { isBusy = false; }
}

window.removeItem = async (id) => {
    if (!confirm("Xóa sản phẩm này?")) return;
    const res = await callAPI(`/auth/carts/${id}`, 'DELETE');
    if (res.success) {
        cartDataGlobal.forEach(p => p.cartItemDTOList = p.cartItemDTOList.filter(i => i.cartItemId !== id));
        checkedItems.delete(id);
        renderCartUI();
    } else {
        await showDialog("error", res.message);
    }
};

window.toggleCheck = (id) => {
    checkedItems.has(id) ? checkedItems.delete(id) : checkedItems.add(id);
    updateSummary();
};

window.updateQty = (id, delta) => {
    let curr = 0;
    cartDataGlobal.forEach(p => { const i = p.cartItemDTOList.find(x => x.cartItemId === id); if(i) curr = i.quantity; });
    updateItem(id, Number(curr) + delta);
};

window.manualUpdate = (input, id) => {
    let val = parseInt(input.value);
    if (!isNaN(val)) updateItem(id, val);
};

window.changeVar = (select) => {
    const row = select.closest(".cart-item");
    const pIndex = row.dataset.pIndex;
    const cIndex = row.dataset.cIndex;
    const product = cartDataGlobal[pIndex];
    const cartItem = product.cartItemDTOList[cIndex];

    const selectedIds = Array.from(row.querySelectorAll(".variant-select")).map(s => s.value);
    const newVar = product.productVariantsDTOList.find(v => selectedIds.every(id => v.attributeValueIdList.includes(id)));

    if (newVar) updateItem(cartItem.cartItemId, cartItem.quantity, newVar.variantId);
    else { showDialog("error", "Hết hàng!"); renderCartUI(); }
};

// ============================================================
//  PHẦN 2: UI GENERATOR (TẠO GIAO DIỆN HTML)
//  (Phần này nhìn giống HTML nhất để bạn dễ chỉnh sửa)
// ============================================================

function renderCartUI() {
    const container = document.getElementById("cartList");
    container.innerHTML = ""; 

    if (!cartDataGlobal?.length) return showEmptyMsg();

    cartDataGlobal.forEach((product, pIndex) => {
        product.cartItemDTOList.forEach((cartItem, cIndex) => {
            const variant = product.productVariantsDTOList.find(v => v.variantId === cartItem.variantId);
            if (variant) {
                // Gọi hàm tạo HTML riêng cho từng dòng
                container.appendChild(createItemRow(product, cartItem, variant, pIndex, cIndex));
            }
        });
    });
    updateSummary();
}

// Hàm này chuyên để tạo HTML, bạn muốn sửa giao diện thì sửa ở đây
function createItemRow(product, item, variant, pIndex, cIndex) {
    const row = document.createElement("div");
    row.className = "cart-item";
    row.dataset.pIndex = pIndex;
    row.dataset.cIndex = cIndex;

    // Tạo Dropdown thuộc tính
    const dropdowns = `<div class="variant-box">` + product.attributes.map(attr => `
        <select class="variant-select" onchange="changeVar(this)">
            ${attr.attributeValues.map(v => 
                `<option value="${v.attributeValueId}" ${variant.attributeValueIdList.includes(v.attributeValueId) ? 'selected' : ''}>${v.attributeValueName}</option>`
            ).join('')}
        </select>
    `).join('') + `</div>`;

    // HTML chính (Dễ nhìn hơn)
    row.innerHTML = `
        <div style="display:flex; align-items:center; margin-right:10px">
            <input type="checkbox" class="item-checkbox" style="width:18px; height:18px; cursor:pointer"
                   onchange="toggleCheck('${item.cartItemId}')" 
                   ${checkedItems.has(item.cartItemId) ? 'checked' : ''}>
        </div>

        <img src="${variant.imageUrl || 'https://via.placeholder.com/100'}" class="item-img">
        
        <div class="item-info">
            <div class="item-name">${product.productName}</div>
            ${dropdowns}
            <div class="item-price">${money.format(variant.price)}</div>
            <div class="item-unit">Kho: ${variant.stock}</div>
        </div>

        <div class="qty-control">
            <button class="qty-btn" onclick="updateQty('${item.cartItemId}', -1)">-</button>
            <input type="number" value="${item.quantity}" class="qty-input" 
                   onchange="manualUpdate(this, '${item.cartItemId}')"
                   onkeypress="if(event.key === 'Enter') manualUpdate(this, '${item.cartItemId}')">
            <button class="qty-btn" onclick="updateQty('${item.cartItemId}', 1)">+</button>
        </div>
        
        <i class="fa-solid fa-trash-can delete-btn" style="margin-left:15px" onclick="removeItem('${item.cartItemId}')"></i>
    `;
    return row;
}

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

function showEmptyMsg(msg = '') {
    document.getElementById("cartList").innerHTML = `
        <div style="text-align: center; margin-top: 50px; color: #666;">
            <p>Giỏ hàng trống</p><p style="color:red; font-size:0.8rem">${msg}</p>
        </div>`;
    updateSummary();
}

function setupCheckoutEvent() {
    document.querySelector(".checkout-btn").onclick = (e) => {
        if(!e.target.disabled) {
            localStorage.setItem("checkoutItems", JSON.stringify([...checkedItems]));
            window.location.href = '../checkout/index.html';
        }
    };
}