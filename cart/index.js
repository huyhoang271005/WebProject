import { callAPI } from '../lib/api.js';
import { showDialog } from '../dialog/index.js';
import { loadNavbar } from '../navbar/navbar.js';

const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
let cartData = [], checked = new Set(), busy = false;
let currentPage = 0;
const pageSize = 10;
let hasMore = true;
let isLoading = false;

// Keeps track of which popup is currently open (if any)
let activePopup = null;
// Temporary state for the popup selection
let tempSelection = {};

// --- 1. INITIALIZATION & EVENTS ---
document.addEventListener("DOMContentLoaded", async () => {
    await loadNavbar();
    const cartBox = document.getElementById("cartList");

    // Loader
    const loader = document.createElement("div");
    loader.id = "loading-more";
    loader.innerHTML = '<div style="text-align:center; padding:15px; color:#666; clear:both;"><i class="fas fa-spinner fa-spin"></i> Đang tải thêm sản phẩm...</div>';
    loader.style.display = "none";
    if (cartBox && cartBox.parentElement) cartBox.parentElement.appendChild(loader);

    // Initial Load
    await loadCart(0, pageSize);

    // Infinite Scroll
    window.addEventListener('scroll', () => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 50) {
            if (hasMore && !isLoading) {
                console.log("Load page: " + (currentPage + 1));
                loadCart(currentPage + 1, pageSize);
            }
        }
    });

    // Close popups when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.classification-wrapper') && !e.target.closest('.classification-popup')) {
            closeAllPopups();
        }
    });

    // Checkout Button
    const checkoutBtn = document.querySelector(".checkout-btn");
    if (checkoutBtn) {
        checkoutBtn.onclick = (e) => {
            if (!e.target.disabled) {
                sessionStorage.setItem("checkoutItems", JSON.stringify([...checked]));
                window.location.href = '../checkout/index.html';
            }
        };
    }
});

// --- 2. DATA LOADING ---
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
            if (box) box.innerHTML = `<p class="text-center p-5">${msg}</p>`;
        }
    }

    isLoading = false;
    if (loader) loader.style.display = "none";
}

// --- 3. UI RENDER ---
function render() {
    const box = document.getElementById("cartList");
    if (!box) return;

    box.innerHTML = "";

    if (!cartData.length) {
        box.innerHTML = `
            <div style='text-align:center; padding:50px 20px'>
                <i class="fa-solid fa-cart-arrow-down" style="font-size: 48px; color: #ddd; margin-bottom: 20px;"></i>
                <p style="color: #666;">Giỏ hàng của bạn còn trống</p>
                <a href="/" style="display: inline-block; margin-top: 15px; padding: 10px 25px; background: #ee4d2d; color: white; text-decoration: none; border-radius: 2px;">Mua ngay</a>
            </div>`;
        updateTotal();
        return;
    }

    cartData.forEach((p, pIdx) => {
        const groupWrapper = document.createElement("div");
        groupWrapper.className = "product-group";

        let hasItem = false;

        if (p.cartItemDTOList) {
            p.cartItemDTOList.forEach((item, cIdx) => {
                const variant = p.productVariantsDTOList.find(v => v.variantId === item.variantId);
                if (variant) {
                    groupWrapper.appendChild(createRow(p, item, variant, pIdx, cIdx));
                    hasItem = true;
                }
            });
        }

        if (hasItem) box.appendChild(groupWrapper);
    });

    updateTotal();
}

/**
 * Generates HTML for a single cart item row
 */
function createRow(p, item, v, pIdx, cIdx) {
    const row = document.createElement("div");
    row.className = "cart-item";
    row.dataset.cartItemId = item.cartItemId;
    row.dataset.pIdx = pIdx;

    // Build the classification string (e.g., "Color: Red, Size: L")
    // And determine current selection map for the popup
    const currentAttributeMap = {}; // { attrId: valueId }
    // Reverse map from variantId to attribute values? 
    // The VariantDTO usually has attributeValueIdList. We need to match those to p.attributes

    const attrTexts = [];
    if (p.attributes) {
        p.attributes.forEach(attr => {
            // Find which value of this attribute is in the current variant
            // v.attributeValueIdList is likely a string "123,456" or array
            const valListStr = String(v.attributeValueIdList);

            const selectedVal = attr.attributeValues.find(val =>
                valListStr.includes(String(val.attributeValueId))
            );

            if (selectedVal) {
                attrTexts.push(`${selectedVal.attributeValueName}`);
                currentAttributeMap[attr.attributeId] = selectedVal.attributeValueId;
            }
        });
    }
    const classificationText = attrTexts.join(", ");

    // Popup HTML generation
    const popupHtml = `
    <div class="classification-popup" id="popup-${item.cartItemId}">
        ${p.attributes.map(attr => `
            <div class="popup-group">
                <div class="popup-label">${attr.attributeName}</div>
                <div class="popup-options">
                    ${attr.attributeValues.map(val => `
                        <div class="popup-chip ${currentAttributeMap[attr.attributeId] == val.attributeValueId ? 'selected' : ''}" 
                             onclick="selectAttribute(this, '${item.cartItemId}', '${attr.attributeId}', '${val.attributeValueId}')">
                            ${val.attributeValueName}
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('')}
        <div class="popup-actions">
            <button class="popup-btn btn-cancel" onclick="closeAllPopups()">Trở lại</button>
            <button class="popup-btn btn-confirm" onclick="confirmVariationChange('${item.cartItemId}', ${pIdx})">Xác nhận</button>
        </div>
    </div>
    `;

    row.innerHTML = `
        <div class="checkbox-wrap">
            <input type="checkbox" class="item-checkbox" onchange="toggle('${item.cartItemId}')" ${checked.has(item.cartItemId) ? 'checked' : ''}>
        </div>
        
        <a href="/product-detail/?id=${p.productId}">
            <img src="${v.imageUrl}" class="item-img" alt="product">
        </a>
        
        <div class="item-content">
            <div>
                <a href="/product-detail/?id=${p.productId}" class="item-name" 
                style="display: inline;">${p.productName}</a>
            </div>
            
            <div class="classification-wrapper">
                <div class="classification-btn" onclick="togglePopup('${item.cartItemId}')">
                    <span>Phân loại hàng: ${classificationText}</span>
                    <div class="arrow-down"></div>
                </div>
                ${popupHtml}
            </div>
            
            <div class="item-meta">
               <div class="item-price">${money.format(v.price)}</div>
               
               <div class="qty-control">
                    <button class="qty-btn" onclick="modQty('${item.cartItemId}', -1)">-</button>
                    <input type="text" value="${item.quantity}" class="qty-input" onchange="modQty('${item.cartItemId}', 0, this.value)">
                    <button class="qty-btn" onclick="modQty('${item.cartItemId}', 1)">+</button>
                </div>
            </div>
        </div>
        
        <div class="action-col">
            <div class="delete-btn" onclick="del('${item.cartItemId}')">Xóa</div>
        </div>
    `;
    return row;
}

// --- 4. POPUP LOGIC ---

window.togglePopup = (cartItemId) => {
    // If clicking same, close it
    if (activePopup === cartItemId) {
        closeAllPopups();
        return;
    }

    // Close others
    closeAllPopups();

    const popup = document.getElementById(`popup-${cartItemId}`);
    if (popup) {
        popup.classList.add("show");
        activePopup = cartItemId;

        // Initialize temp selection based on current rendered state logic
        // We can re-derive it from the DOM 'selected' chips
        tempSelection = {};
        const selectedChips = popup.querySelectorAll('.popup-chip.selected');
        const pIdx = popup.closest('.cart-item').dataset.pIdx;
        const product = cartData[pIdx];

        // Re-build tempSelection based on what is visually selected initially
        // This is a bit lazy but effective. Better would be to store it in a map.
        // But since we just rendered it, the DOM is truth.
        // We need to know which attribute each selected chip belongs to.
        // The structure is: .popup-group -> .popup-options -> .popup-chip
        // But we didn't store attrId on the group.
        // Let's rely on the onclick handler storing it or just use the product data structure.

        // Simpler: Just reset tempSelection to EMPTY and let user pick? 
        // No, user expects current selection to be there. 
        // THE HTML generation loop already marked 'selected'.
        // We just need to sync that to `tempSelection`.

        // Re-scanning the product attributes to build init state:
        // We need the Current Item's variant.
        const item = product.cartItemDTOList.find(i => i.cartItemId == cartItemId);
        const variant = product.productVariantsDTOList.find(v => v.variantId == item.variantId);

        if (product.attributes && variant) {
            product.attributes.forEach(attr => {
                const vIds = String(variant.attributeValueIdList);
                const val = attr.attributeValues.find(av => vIds.includes(String(av.attributeValueId)));
                if (val) {
                    tempSelection[attr.attributeId] = val.attributeValueId;
                }
            });
        }
    }
};

window.closeAllPopups = () => {
    document.querySelectorAll('.classification-popup').forEach(el => el.classList.remove('show'));
    activePopup = null;
    tempSelection = {};
};

window.selectAttribute = (chip, cartItemId, attrId, valueId) => {
    // 1. Visual update (Single select style for chips in same group)
    const optionGroup = chip.parentElement;
    optionGroup.querySelectorAll('.popup-chip').forEach(c => c.classList.remove('selected'));
    chip.classList.add('selected');

    // 2. State update
    tempSelection[attrId] = valueId;
};

window.confirmVariationChange = async (cartItemId, pIdx) => {
    if (busy) return;
    busy = true;

    try {
        const product = cartData[pIdx];
        const currentItem = product.cartItemDTOList.find(i => i.cartItemId == cartItemId);

        // 1. Check if all attributes are selected
        // Count attributes in product
        const requiredAttrCount = product.attributes ? product.attributes.length : 0;
        const selectedCount = Object.keys(tempSelection).length;

        if (selectedCount < requiredAttrCount) {
            await showDialog("warning", "Vui lòng chọn đầy đủ phân loại");
            return;
        }

        // 2. Find matching Variant
        // tempSelection is { attrId: valId, ... }
        // We need to find a variant whose attributeValueIdList contains ALL of these valIds
        const selectedValIds = Object.values(tempSelection).map(String);

        const newV = product.productVariantsDTOList.find(v => {
            const vAttrIds = String(v.attributeValueIdList);
            return selectedValIds.every(id => vAttrIds.includes(id));
        });

        if (!newV) {
            await showDialog("error", "Sản phẩm phân loại này tạm hết hàng hoặc không tồn tại");
            return;
        }

        if (String(newV.variantId) === String(currentItem.variantId)) {
            closeAllPopups();
            return; // No change
        }

        // 3. Logic: Check for duplicates (same as before)
        let duplicateItem = null;
        for (const p of cartData) {
            if (p.cartItemDTOList) {
                const found = p.cartItemDTOList.find(i =>
                    String(i.variantId) === String(newV.variantId) &&
                    String(i.cartItemId) !== String(currentItem.cartItemId)
                );
                if (found) { duplicateItem = found; break; }
            }
        }

        if (duplicateItem) {
            // MERGE logic
            const newTotalQty = Number(duplicateItem.quantity) + Number(currentItem.quantity);
            if (newTotalQty > newV.stock) {
                await showDialog("error", `Tổng số lượng (${newTotalQty}) vượt quá kho (${newV.stock})`);
                return;
            }

            const resUpd = await callAPI('/carts', 'PUT', { cartItemId: duplicateItem.cartItemId, variantId: duplicateItem.variantId, quantity: newTotalQty });
            if (resUpd.success) {
                await callAPI('/carts/delete', 'POST', [currentItem.cartItemId]);

                // Update local state
                duplicateItem.quantity = newTotalQty;
                product.cartItemDTOList = product.cartItemDTOList.filter(i => i.cartItemId !== currentItem.cartItemId);
                checked.delete(currentItem.cartItemId);

                closeAllPopups();
                render(); // Full re-render to reflect removal
                await showDialog("success", "Đã gộp thành công!");
            } else {
                await showDialog("error", resUpd.message);
            }

        } else {
            // NORMAL UPDATE logic
            const res = await callAPI('/carts', 'PUT', { cartItemId: currentItem.cartItemId, variantId: newV.variantId, quantity: currentItem.quantity });
            if (res.success) {
                currentItem.variantId = newV.variantId;
                closeAllPopups();
                render(); // Re-render to update image/price/name
            } else {
                await showDialog("error", res.message);
            }
        }

    } finally {
        busy = false;
    }
};


// --- HELPERS ---

function updateTotal() {
    let total = 0, count = 0;
    const allItemIds = [];

    cartData.forEach(p => {
        if (p.cartItemDTOList) {
            p.cartItemDTOList.forEach(i => allItemIds.push(i.cartItemId));
        }
    });

    cartData.forEach(p => {
        if (p.cartItemDTOList) {
            p.cartItemDTOList.forEach(i => {
                if (checked.has(i.cartItemId)) {
                    const v = p.productVariantsDTOList.find(x => x.variantId === i.variantId);
                    if (v) { total += v.price * i.quantity; count += i.quantity; }
                }
            });
        }
    });

    document.querySelectorAll(".total-price-display").forEach(e => e.innerText = money.format(total));
    const btn = document.querySelector(".checkout-btn");
    if (btn) {
        btn.innerText = `Mua Hàng (${count})`;
        btn.disabled = !count;
    }

    const checkAllBox = document.getElementById("checkAll");
    const checkAllMobile = document.getElementById("checkAllMobile"); // Mobile toggle

    const countDisplay = document.getElementById("count-display");
    const delSelectedBtn = document.querySelector(".delete-selected");

    if (countDisplay) countDisplay.innerText = allItemIds.length;

    const isAllChecked = allItemIds.length > 0 && allItemIds.every(id => checked.has(id));

    if (checkAllBox) checkAllBox.checked = isAllChecked;
    if (checkAllMobile) checkAllMobile.checked = isAllChecked;

    if (delSelectedBtn) {
        delSelectedBtn.style.display = checked.size > 0 ? "block" : "none";
    }
}

// --- GLOBAL EXPORTS for HTML ---
window.toggleAll = (source) => {
    // If we click one check-all, sync the other one visually (optional, but render handles it)
    const isChecked = source.checked;

    if (isChecked) {
        cartData.forEach(p => {
            if (p.cartItemDTOList) p.cartItemDTOList.forEach(i => checked.add(i.cartItemId));
        });
    } else {
        checked.clear();
    }
    render(); // Re-render updates all checkboxes state
};

window.toggle = (id) => {
    checked.has(id) ? checked.delete(id) : checked.add(id);
    updateTotal(); // Just update total, no need to full render if we assume checkboxes key-state sync
    // But rendering is safer to update Select-All state
    const allItemIds = [];
    cartData.forEach(p => p.cartItemDTOList && p.cartItemDTOList.forEach(i => allItemIds.push(i.cartItemId)));
    const isAll = allItemIds.length > 0 && allItemIds.every(x => checked.has(x));

    const ca1 = document.getElementById("checkAll");
    const ca2 = document.getElementById("checkAllMobile");
    if (ca1) ca1.checked = isAll;
    if (ca2) ca2.checked = isAll;
};

window.del = async (id) => {
    if (!confirm("Xóa sản phẩm này?")) return;
    const res = await callAPI('/carts/delete', 'POST', [id]);
    if (res.success) {
        cartData.forEach(p => {
            if (p.cartItemDTOList) p.cartItemDTOList = p.cartItemDTOList.filter(i => i.cartItemId !== id);
        });
        // Remove empty product groups?
        cartData = cartData.filter(p => p.cartItemDTOList && p.cartItemDTOList.length > 0);

        checked.delete(id);
        render();
    } else await showDialog("error", res.message || "Lỗi xóa");
};

window.deleteSelected = async () => {
    if (!checked.size) return;
    if (!confirm(`Xóa ${checked.size} mục đã chọn?`)) return;

    const listIds = Array.from(checked);
    const res = await callAPI('/carts/delete', 'POST', listIds);

    if (res.success) {
        cartData.forEach(p => {
            if (p.cartItemDTOList) {
                p.cartItemDTOList = p.cartItemDTOList.filter(i => !checked.has(i.cartItemId));
            }
        });
        cartData = cartData.filter(p => p.cartItemDTOList && p.cartItemDTOList.length > 0);

        checked.clear();
        await showDialog("success", "Đã xóa thành công!");
        render();
    } else {
        await showDialog("error", res.message || "Lỗi xóa nhiều");
    }
};

window.modQty = async (id, delta, manualVal) => {
    if (busy) return; busy = true;
    try {
        let item, v;
        cartData.some(p => {
            if (p.cartItemDTOList) {
                item = p.cartItemDTOList.find(x => x.cartItemId === id);
                if (item) v = p.productVariantsDTOList.find(x => x.variantId === item.variantId);
                return item;
            }
        });
        if (!item) return;

        let newQ = manualVal ? parseInt(manualVal) : Number(item.quantity) + delta;
        if (isNaN(newQ) || newQ < 1) {
            // Require confirm before set to 1 or delete? 
            if (newQ < 1) newQ = 1; // Don't auto delete on minus, Shopee logic usually stops at 1
        }

        if (newQ > v.stock) {
            // Revert input 
            render(); // lazy way to revert
            await showDialog("error", `Kho chỉ còn ${v.stock}`);
            return;
        }

        if (newQ !== Number(item.quantity)) {
            const res = await callAPI('/carts', 'PUT', { cartItemId: id, variantId: item.variantId, quantity: newQ });
            if (res.success) {
                item.quantity = newQ;
            } else {
                await showDialog("error", "Lỗi cập nhật");
            }
        }
        render(); // Always render to ensure input value is clean
    } finally { busy = false; }
};