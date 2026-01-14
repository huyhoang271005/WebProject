import { callAPI } from '../lib/api.js';
import { showDialog } from '../dialog/index.js';
import { loadNavbar } from '../navbar/navbar.js';

const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
let cartData = [], checked = new Set(), busy = false;
let currentPage = 0;      // Trang hiện tại
const pageSize = 10;      // Số lượng load
let hasMore = true;       // Cờ kiểm tra còn dữ liệu
let isLoading = false;    // Cờ kiểm tra trạng thái đang tải

// --- 1. KHỞI TẠO & SỰ KIỆN ---
document.addEventListener("DOMContentLoaded", async () => {
    await loadNavbar();
    const cartBox = document.getElementById("cartList");
    
    // Tạo loader spinner
    const loader = document.createElement("div");
    loader.id = "loading-more";
    loader.innerHTML = '<div style="text-align:center; padding:15px; color:#666; clear:both;"><i class="fas fa-spinner fa-spin"></i> Đang tải thêm sản phẩm...</div>';
    loader.style.display = "none";
    
    if(cartBox && cartBox.parentElement) {
         cartBox.parentElement.appendChild(loader);
    }

    // Load trang đầu tiên
    await loadCart(0, pageSize);

    // Sự kiện cuộn vô tận
    window.addEventListener('scroll', () => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 50) {
            if (hasMore && !isLoading) {
                console.log("Load tiếp trang: " + (currentPage + 1));
                loadCart(currentPage + 1, pageSize);
            }
        }
    });

    // Nút mua hàng
    const checkoutBtn = document.querySelector(".checkout-btn");
    if(checkoutBtn) {
        checkoutBtn.onclick = (e) => {
            if(!e.target.disabled) {
                localStorage.setItem("checkoutItems", JSON.stringify([...checked]));
                window.location.href = '../checkout/index.html'; 
            }
        };
    }
});

// --- 2. HÀM LOAD DỮ LIỆU ---
async function loadCart(page = 0, size = 10) {
    if (isLoading || (page > 0 && !hasMore)) return;
    
    isLoading = true;
    const loader = document.getElementById("loading-more");
    if (page > 0 && loader) loader.style.display = "block";

    const res = await callAPI(`/carts?page=${page}&size=${size}`, 'GET');
    
    if (res && res.success) { 
        const newData = res.data.listData || [];
        hasMore = res.data.hasMore;

        if (page === 0) {
            cartData = newData; 
        } else {
            cartData = [...cartData, ...newData]; 
        }

        currentPage = page;
        render(); 
    } else {
        if (page === 0) {
            const msg = res ? res.message : "Không tải được dữ liệu";
            const box = document.getElementById("cartList");
            if(box) box.innerHTML = `<p class="text-center p-5">${msg}</p>`;
        }
    }

    isLoading = false;
    if (loader) loader.style.display = "none";
}

// --- 3. UI RENDER ---
function render() {
    const box = document.getElementById("cartList");
    if(!box) return;

    box.innerHTML = "";
    
    if (!cartData.length) {
        box.innerHTML = "<p style='text-align:center; padding:20px'>Giỏ trống</p>";
        updateTotal();
        return;
    }

    cartData.forEach((p, pIdx) => {
        const groupWrapper = document.createElement("div");
        groupWrapper.className = "product-group";

        let hasItem = false;

        if(p.cartItemDTOList) {
            p.cartItemDTOList.forEach((item, cIdx) => {
                const variant = p.productVariantsDTOList.find(v => v.variantId === item.variantId);
                if(variant) {
                    groupWrapper.appendChild(createRow(p, item, variant, pIdx, cIdx));
                    hasItem = true;
                }
            });
        }

        if (hasItem) {
            box.appendChild(groupWrapper);
        }
    });
    
    updateTotal();
}

function createRow(p, item, v, pIdx, cIdx) {
    const row = document.createElement("div");
    row.className = "cart-item";
    row.dataset.idx = `${pIdx}-${cIdx}`;

    // Fix lỗi select option không selected đúng do khác kiểu dữ liệu
    const selects = `<div class="variant-box">` + p.attributes.map(a => `
        <select class="variant-select" onchange="changeVar(this)">
            ${a.attributeValues.map(val => `
                <option value="${val.attributeValueId}" 
                ${String(v.attributeValueIdList).includes(String(val.attributeValueId)) ? 'selected' : ''}>
                ${val.attributeValueName}
                </option>`).join('')}
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
    const allItemIds = [];
    
    cartData.forEach(p => {
        if(p.cartItemDTOList) {
            p.cartItemDTOList.forEach(i => allItemIds.push(i.cartItemId));
        }
    });

    cartData.forEach(p => {
        if(p.cartItemDTOList) {
            p.cartItemDTOList.forEach(i => {
                if(checked.has(i.cartItemId)) {
                    const v = p.productVariantsDTOList.find(x => x.variantId === i.variantId);
                    if(v) { total += v.price * i.quantity; count += i.quantity; }
                }
            });
        }
    });

    document.querySelectorAll(".total-price").forEach(e => e.innerText = money.format(total));
    const btn = document.querySelector(".checkout-btn");
    if(btn) {
        btn.innerText = `MUA HÀNG (${count})`; 
        btn.disabled = !count;
    }

    const checkAllBox = document.getElementById("checkAll");
    const countDisplay = document.getElementById("count-display");
    const delSelectedBtn = document.querySelector(".delete-selected");

    if (countDisplay) countDisplay.innerText = allItemIds.length;

    if (checkAllBox) {
        const isAllChecked = allItemIds.length > 0 && allItemIds.every(id => checked.has(id));
        checkAllBox.checked = isAllChecked;
    }

    if (delSelectedBtn) {
        delSelectedBtn.style.display = checked.size > 0 ? "block" : "none";
    }
}

// --- 4. CÁC HÀNH ĐỘNG (ACTIONS) ---

window.toggleAll = (source) => {
    if (source.checked) {
        cartData.forEach(p => {
            if(p.cartItemDTOList) p.cartItemDTOList.forEach(i => checked.add(i.cartItemId));
        });
    } else {
        checked.clear();
    }
    render();
};

window.toggle = (id) => { 
    checked.has(id) ? checked.delete(id) : checked.add(id); 
    updateTotal();
};

window.del = async (id) => {
    if(!confirm("Xóa sản phẩm này?")) return;
    const res = await callAPI('/carts/delete', 'POST', [id]); 
    
    if(res.success) {
        cartData.forEach(p => {
            if(p.cartItemDTOList) p.cartItemDTOList = p.cartItemDTOList.filter(i => i.cartItemId !== id);
        });
        checked.delete(id); 
        render();
    } else await showDialog("error", res.message || "Lỗi xóa");
};

window.deleteSelected = async () => {
    if(!checked.size) return;
    if(!confirm(`Xóa ${checked.size} mục đã chọn?`)) return;

    const listIds = Array.from(checked);
    const res = await callAPI('/carts/delete', 'POST', listIds);

    if(res.success) {
        cartData.forEach(p => {
            if (p.cartItemDTOList) {
                p.cartItemDTOList = p.cartItemDTOList.filter(i => !checked.has(i.cartItemId));
            }
        });
        
        checked.clear(); 
        await showDialog("success", "Đã xóa thành công!");
        render();
    } else {
        await showDialog("error", res.message || "Lỗi xóa nhiều");
    }
};

window.modQty = async (id, delta, manualVal) => {
    if(busy) return; busy = true;
    try {
        let item, v;
        cartData.some(p => { 
            if(p.cartItemDTOList) {
                item = p.cartItemDTOList.find(x => x.cartItemId === id); 
                if(item) v = p.productVariantsDTOList.find(x => x.variantId === item.variantId); 
                return item;
            }
        });
        if(!item) return;

        let newQ = manualVal ? parseInt(manualVal) : Number(item.quantity) + delta;
        if(isNaN(newQ) || newQ < 1) return window.del(id);
        if(newQ > v.stock) { await showDialog("error", `Kho còn ${v.stock}`); render(); return; }

        if((await callAPI('/carts', 'PUT', { cartItemId: id, variantId: item.variantId, quantity: newQ })).success) {
            item.quantity = newQ; render();
        } else { await showDialog("error", "Lỗi cập nhật"); render(); }
    } finally { busy = false; }
};

window.changeVar = async (el) => {
    if(busy) return; 
    busy = true; 
    try {
        const row = el.closest(".cart-item");
        // Kiểm tra xem row có còn tồn tại không (đề phòng spam click)
        if (!row) return; 

        const [pIdx, cIdx] = row.dataset.idx.split('-');
        
        // Safety check: Kiểm tra cartData có bị out-index không
        if (!cartData[pIdx] || !cartData[pIdx].cartItemDTOList[cIdx]) {
            await refreshCart(); // Dữ liệu sai -> Tự fix
            return;
        }

        const product = cartData[pIdx];
        const currentItem = product.cartItemDTOList[cIdx];
        
        // 1. Lấy Variant ID mới
        const ids = Array.from(row.querySelectorAll(".variant-select")).map(s => s.value);
        const newV = product.productVariantsDTOList.find(v => 
            ids.every(id => String(v.attributeValueIdList).includes(String(id)))
        );

        if (!newV) { 
            await showDialog("error", "Hết hàng hoặc không tồn tại"); 
            render(); 
            return; 
        }
        if (String(newV.variantId) === String(currentItem.variantId)) return; 

        // 2. Tìm trùng
        let duplicateItem = null;
        for (const p of cartData) {
            if(p.cartItemDTOList) {
                const found = p.cartItemDTOList.find(i => 
                    String(i.variantId) === String(newV.variantId) && 
                    String(i.cartItemId) !== String(currentItem.cartItemId)
                );
                if (found) { duplicateItem = found; break; }
            }
        }

        if (duplicateItem) {
            // >>> GỘP <<<
            console.log("Phát hiện trùng -> Gộp...");
            const newTotalQty = Number(duplicateItem.quantity) + Number(currentItem.quantity);
            
            if (newTotalQty > newV.stock) {
                await showDialog("error", `Không thể gộp: Tổng (${newTotalQty}) vượt quá kho (${newV.stock})`);
                render(); return;
            }

            const resUpdate = await callAPI('/carts', 'PUT', { 
                cartItemId: duplicateItem.cartItemId, 
                variantId: duplicateItem.variantId, 
                quantity: newTotalQty 
            });

            if (resUpdate.success) {
                const resDelete = await callAPI('/carts/delete', 'POST', [currentItem.cartItemId]);
                if (resDelete.success) {
                    product.cartItemDTOList = product.cartItemDTOList.filter(i => i.cartItemId !== currentItem.cartItemId);
                    duplicateItem.quantity = newTotalQty;
                    
                    if(checked.has(currentItem.cartItemId)) {
                        checked.delete(currentItem.cartItemId);
                        checked.add(duplicateItem.cartItemId);
                    }
                    
                    await showDialog("success", "Đã gộp thành công!");
                    render();
                } else {
                    // Xóa lỗi -> Khả năng cao là ID sai -> Refresh
                    await refreshCart();
                }
            } else {
                // Update lỗi (404) -> Item đích là ma -> Refresh
                console.error("Lỗi cập nhật gộp:", resUpdate);
                await refreshCart(); 
            }

        } else {
            // >>> ĐỔI THƯỜNG <<<
            const res = await callAPI('/carts', 'PUT', { 
                cartItemId: currentItem.cartItemId, 
                variantId: newV.variantId, 
                quantity: currentItem.quantity 
            });
            
            if (res.success) {
                currentItem.variantId = newV.variantId;
                render();
            } else {
                // Lỗi 404 hoặc lỗi khác -> Refresh cho chắc
                console.error("Lỗi đổi variant:", res);
                await refreshCart();
            }
        }
    } catch (e) {
        console.error(e);
        await refreshCart(); // Có biến -> Tự chữa lành
    } finally {
        busy = false;
    }
};

async function refreshCart() {
    console.warn("Phát hiện dữ liệu không đồng bộ -> Đang tải lại...");
    
    // 1. Reset toàn bộ biến
    cartData = [];
    checked.clear();
    currentPage = 0;
    hasMore = true;
    isLoading = false;
    
    // 2. Xóa giao diện cũ và hiện loading
    const box = document.getElementById("cartList");
    if (box) box.innerHTML = '<div style="text-align:center; padding:20px"><i class="fas fa-spinner fa-spin"></i> Đang đồng bộ lại dữ liệu...</div>';
    
    // 3. Gọi tải lại trang 0
    await loadCart(0, pageSize);
}