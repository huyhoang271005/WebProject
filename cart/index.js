import { callAPI } from '../public/api.js'; 
import { showDialog } from '../dialog/index.js';

const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
let cartData = [], checked = new Set(), busy = false;

document.addEventListener("DOMContentLoaded", async () => {
    await loadCart();
    document.querySelector(".checkout-btn").onclick = (e) => {
        if(!e.target.disabled) {
            localStorage.setItem("checkoutItems", JSON.stringify([...checked]));
            window.location.href = '../checkout/index.html'; 
        }
    };
});

// === 1. LOAD DATA ===
async function loadCart() {
    const res = await callAPI('/auth/carts', 'GET');
    if (res.success) { 
        cartData = res.data.listData || []; 
        render(); 
    } else document.getElementById("cartList").innerHTML = `<p class="text-center p-5">${res.message}</p>`;
}

// === 2. UI RENDER ===
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
    row.dataset.idx = `${pIdx}-${cIdx}`; // Lưu vị trí để tìm nhanh

    const selects = `<div class="variant-box">` + p.attributes.map(a => `
        <select class="variant-select" onchange="changeVar(this)">
            ${a.attributeValues.map(val => `<option value="${val.attributeValueId}" ${v.attributeValueIdList.includes(val.attributeValueId)?'selected':''}>${val.attributeValueName}</option>`).join('')}
        </select>`).join('') + `</div>`;

    row.innerHTML = `
        <div class="checkbox-wrapper">
            <input type="checkbox" class="item-checkbox" onchange="toggle('${item.cartItemId}')" ${checked.has(item.cartItemId)?'checked':''}>
        </div>
        <img src="${v.imageUrl||'https://via.placeholder.com/80'}" class="item-img">
        <div class="item-info"><div class="item-name">${p.productName}</div>${selects}</div>
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
        <div class="delete-btn-wrapper"><i class="fa-solid fa-trash-can delete-btn" onclick="del('${item.cartItemId}')"></i></div>`;
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

// === 3. LOGIC XỬ LÝ ===

window.toggle = (id) => { checked.has(id) ? checked.delete(id) : checked.add(id); updateTotal(); };

window.del = async (id) => {
    if(!confirm("Xóa nhé?")) return;
    if((await callAPI(`/auth/carts/${id}`, 'DELETE')).success) {
        // Xóa khỏi RAM
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

// --- LOGIC MỚI: ĐỔI BIẾN THỂ & GỘP DÒNG ---
window.changeVar = async (el) => {
    if(busy) return; busy = true; // Chặn spam click
    try {
        const row = el.closest(".cart-item");
        const [pIdx, cIdx] = row.dataset.idx.split('-');
        
        const product = cartData[pIdx];                 // Sản phẩm cha
        const currentItem = product.cartItemDTOList[cIdx]; // Item đang sửa
        
        // 1. Tìm biến thể mới dựa trên dropdown
        const ids = Array.from(row.querySelectorAll(".variant-select")).map(s => s.value);
        const newVariant = product.productVariantsDTOList.find(v => ids.every(id => v.attributeValueIdList.includes(id)));

        if (!newVariant) { await showDialog("error", "Hết hàng/Không tồn tại"); render(); return; }
        if (newVariant.variantId === currentItem.variantId) return; // Chưa đổi gì thì thôi

        // 2. Kiểm tra xem trong giỏ đã có dòng nào trùng với biến thể mới chưa?
        // (Tìm item khác trong cùng sản phẩm có variantId == newVariant.variantId)
        const existingItem = product.cartItemDTOList.find(i => 
            i.variantId === newVariant.variantId && i.cartItemId !== currentItem.cartItemId
        );

        if (existingItem) {
            // === TRƯỜNG HỢP GỘP (MERGE) ===
            const newTotalQty = Number(currentItem.quantity) + Number(existingItem.quantity);
            
            // Check tồn kho cho tổng mới
            if (newTotalQty > newVariant.stock) {
                await showDialog("error", `Không thể gộp. Tổng số lượng (${newTotalQty}) vượt quá kho (${newVariant.stock})`);
                render(); return;
            }

            // Bước A: Cập nhật số lượng cho dòng đích (existingItem)
            const resUpdate = await callAPI('/auth/carts', 'PUT', { 
                cartItemId: existingItem.cartItemId, 
                variantId: existingItem.variantId, 
                quantity: newTotalQty 
            });

            // Bước B: Xóa dòng hiện tại (currentItem) vì đã gộp sang kia rồi
            if (resUpdate.success) {
                const resDelete = await callAPI(`/auth/carts/${currentItem.cartItemId}`, 'DELETE');
                
                if (resDelete.success) {
                    // Cập nhật RAM: Xóa current, Update existing
                    product.cartItemDTOList = product.cartItemDTOList.filter(i => i.cartItemId !== currentItem.cartItemId);
                    existingItem.quantity = newTotalQty;
                    checked.delete(currentItem.cartItemId); // Bỏ check dòng bị xóa
                    
                    await showDialog("success", "Đã gộp sản phẩm thành công!");
                    render();
                }
            } else {
                await showDialog("error", "Lỗi khi gộp sản phẩm");
            }

        } else {
            // === TRƯỜNG HỢP ĐỔI BÌNH THƯỜNG (SWAP) ===
            const res = await callAPI('/auth/carts', 'PUT', { 
                cartItemId: currentItem.cartItemId, 
                variantId: newVariant.variantId, 
                quantity: currentItem.quantity 
            });

            if (res.success) {
                currentItem.variantId = newVariant.variantId; // Update RAM
                render();
            } else {
                await showDialog("error", res.message || "Lỗi đổi loại");
                render();
            }
        }
    } finally {
        busy = false;
    }
};