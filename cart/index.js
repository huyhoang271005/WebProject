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
    
    // Nếu giỏ trống
    if (!cartData.length) {
        box.innerHTML = "<p style='text-align:center; padding:20px'>Giỏ trống</p>";
        updateTotal();
        return;
    }

    // Vẽ từng dòng sản phẩm
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
    
    // Lấy danh sách tất cả ID hiện có trong giỏ (để so sánh với checked)
    const allItemIds = [];
    cartData.forEach(p => p.cartItemDTOList.forEach(i => allItemIds.push(i.cartItemId)));

    // Tính tổng tiền
    cartData.forEach(p => p.cartItemDTOList.forEach(i => {
        if(checked.has(i.cartItemId)) {
            const v = p.productVariantsDTOList.find(x => x.variantId === i.variantId);
            if(v) { total += v.price * i.quantity; count += i.quantity; }
        }
    }));

    // Cập nhật giao diện tổng tiền
    document.querySelectorAll(".total-price").forEach(e => e.innerText = money.format(total));
    const btn = document.querySelector(".checkout-btn");
    btn.innerText = `MUA HÀNG (${count})`; btn.disabled = !count;

    // --- LOGIC MỚI: ĐỒNG BỘ CHECKBOX "CHỌN TẤT CẢ" ---
    const checkAllBox = document.getElementById("checkAll");
    const countDisplay = document.getElementById("count-display");
    const delSelectedBtn = document.querySelector(".delete-selected");

    // 1. Hiển thị số lượng tổng sản phẩm
    if (countDisplay) countDisplay.innerText = allItemIds.length;

    // 2. Nếu tích đủ hết -> Check All sáng. Nếu không -> Tắt.
    if (checkAllBox) {
        const isAllChecked = allItemIds.length > 0 && allItemIds.every(id => checked.has(id));
        checkAllBox.checked = isAllChecked;
    }

    // 3. Hiện nút "Xóa đã chọn" nếu có ít nhất 1 item được chọn
    if (delSelectedBtn) {
        delSelectedBtn.style.display = checked.size > 0 ? "block" : "none";
    }
}

// === 3. CÁC HÀNH ĐỘNG (ACTIONS) ===

// --- HÀM MỚI: CHỌN TẤT CẢ ---
window.toggleAll = (source) => {
    if (source.checked) {
        // Lấy tất cả ID trong giỏ hàng và thêm vào Set
        cartData.forEach(p => p.cartItemDTOList.forEach(i => checked.add(i.cartItemId)));
    } else {
        // Bỏ chọn tất cả -> Xóa sạch Set
        checked.clear();
    }
    render(); // Vẽ lại để cập nhật checkbox con và tổng tiền
};

window.toggle = (id) => { 
    checked.has(id) ? checked.delete(id) : checked.add(id); 
    updateTotal(); // Chỉ cần update total và checkAll box, không cần render lại cả list
};

window.del = async (id) => {
    if(!confirm("Xóa sản phẩm này?")) return;
    if((await callAPI(`/auth/carts/${id}`, 'DELETE')).success) {
        cartData.forEach(p => p.cartItemDTOList = p.cartItemDTOList.filter(i => i.cartItemId !== id));
        checked.delete(id); render();
    } else await showDialog("error", "Lỗi xóa");
};

// --- HÀM MỚI: XÓA NHIỀU MỤC CÙNG LÚC ---
window.deleteSelected = async () => {
    if (checked.size === 0) return;
    if (!confirm(`Bạn chắc chắn muốn xóa ${checked.size} sản phẩm đã chọn?`)) return;

    let successCount = 0;
    // Duyệt qua từng ID đã check và gọi API xóa
    // (Lưu ý: Nếu Backend có API xóa nhiều thì nên dùng API đó sẽ tốt hơn, ở đây mình gọi vòng lặp tạm)
    for (const id of checked) {
        const res = await callAPI(`/auth/carts/${id}`, 'DELETE');
        if (res.success) {
            // Xóa khỏi RAM
            cartData.forEach(p => p.cartItemDTOList = p.cartItemDTOList.filter(i => i.cartItemId !== id));
            successCount++;
        }
    }

    if (successCount > 0) {
        checked.clear(); // Xóa xong thì clear tập đã chọn
        render();        // Vẽ lại giao diện
        // showDialog("success", `Đã xóa ${successCount} sản phẩm`); // Optional: Hiện thông báo
    } else {
        await showDialog("error", "Có lỗi xảy ra khi xóa");
    }
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
    if(busy) return; busy = true;
    try {
        const row = el.closest(".cart-item");
        const [pIdx, cIdx] = row.dataset.idx.split('-');
        const product = cartData[pIdx];
        const currentItem = product.cartItemDTOList[cIdx];
        
        const ids = Array.from(row.querySelectorAll(".variant-select")).map(s => s.value);
        const newVariant = product.productVariantsDTOList.find(v => ids.every(id => v.attributeValueIdList.includes(id)));

        if (!newVariant) { await showDialog("error", "Hết hàng/Không tồn tại"); render(); return; }
        if (newVariant.variantId === currentItem.variantId) return;

        const existingItem = product.cartItemDTOList.find(i => 
            i.variantId === newVariant.variantId && i.cartItemId !== currentItem.cartItemId
        );

        if (existingItem) {
            const newTotalQty = Number(currentItem.quantity) + Number(existingItem.quantity);
            if (newTotalQty > newVariant.stock) {
                await showDialog("error", `Tổng số lượng (${newTotalQty}) vượt quá kho (${newVariant.stock})`);
                render(); return;
            }

            const resUpdate = await callAPI('/auth/carts', 'PUT', { cartItemId: existingItem.cartItemId, variantId: existingItem.variantId, quantity: newTotalQty });
            if (resUpdate.success) {
                if ((await callAPI(`/auth/carts/${currentItem.cartItemId}`, 'DELETE')).success) {
                    product.cartItemDTOList = product.cartItemDTOList.filter(i => i.cartItemId !== currentItem.cartItemId);
                    existingItem.quantity = newTotalQty;
                    checked.delete(currentItem.cartItemId);
                    await showDialog("success", "Gộp thành công!");
                    render();
                }
            } else await showDialog("error", "Lỗi gộp");
        } else {
            const res = await callAPI('/auth/carts', 'PUT', { cartItemId: currentItem.cartItemId, variantId: newVariant.variantId, quantity: currentItem.quantity });
            if (res.success) { currentItem.variantId = newVariant.variantId; render(); }
            else { await showDialog("error", res.message || "Lỗi đổi loại"); render(); }
        }
    } finally { busy = false; }
};