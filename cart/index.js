import { callAPI } from '../public/api.js'; 
import { showDialog } from '../dialog/index.js';

const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
let cartData = [], checked = new Set(), busy = false;let currentPage = 0;      // Trang hiện tại (Bắt đầu từ 0 hoặc 1 tùy API của bạn)
const pageSize = 10;      // Số lượng sản phẩm mỗi lần load
let hasMore = true;       // Cờ kiểm tra xem còn dữ liệu để load không
let isLoading = false;

// --- 3. KHỞI TẠO & CUỘN VÔ TẬN ---
document.addEventListener("DOMContentLoaded", async () => {
    // Tạo element "Đang tải thêm..."
    const cartBox = document.getElementById("cartList");
    const loader = document.createElement("div");
    loader.id = "loading-more";
    loader.innerHTML = '<div style="text-align:center; padding:15px; color:#666; clear:both;"><i class="fas fa-spinner fa-spin"></i> Đang tải thêm sản phẩm...</div>';
    loader.style.display = "none";
    
    // Nhét nó vào ngay sau danh sách sản phẩm (trong khung cha)
    if(cartBox.parentElement) {
         cartBox.parentElement.appendChild(loader);
    }

    // Load trang 0 ngay khi vào
    await loadCart(0, pageSize);

    // Bắt sự kiện cuộn
    window.addEventListener('scroll', () => {
        // Công thức kiểm tra chạm đáy
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 50) {
            if (hasMore && !isLoading) {
                console.log("Load tiếp trang: " + (currentPage + 1));
                loadCart(currentPage + 1, pageSize);
            }
        }
    });

    // Code nút Mua hàng (giữ nguyên của bạn)
    document.querySelector(".checkout-btn").onclick = (e) => {
        if(!e.target.disabled) {
            localStorage.setItem("checkoutItems", JSON.stringify([...checked]));
            window.location.href = '../checkout/index.html'; 
        }
    };
});
// --- 2. HÀM LOAD CART ---
async function loadCart(page = 0, size = 10) {
    // Chặn gọi nếu đang tải hoặc hết hàng (trừ lần đầu)
    if (isLoading || (page > 0 && !hasMore)) return;
    
    isLoading = true;
    
    // Hiện spinner quay quay
    const loader = document.getElementById("loading-more");
    if (page > 0 && loader) loader.style.display = "block";

    // --- GỌI API ---
    // Không bọc try-catch nữa, tin tưởng vào Backend/callAPI
    const res = await callAPI(`/auth/carts?page=${page}&size=${size}`, 'GET');
    
    // Kiểm tra kết quả trả về
    if (res && res.success) { 
        const newData = res.data.listData || [];
        
        // Cập nhật cờ còn hàng hay không
        hasMore = res.data.hasNext;

        if (page === 0) {
            cartData = newData; // Gán mới
        } else {
            cartData = [...cartData, ...newData]; // Nối đuôi
        }

        currentPage = page;
        render(); 
    } else {
        // Backend trả về lỗi logic (success: false)
        if (page === 0) {
            const msg = res ? res.message : "Không tải được dữ liệu";
            document.getElementById("cartList").innerHTML = `<p class="text-center p-5">${msg}</p>`;
        }
    }

    // --- DỌN DẸP (Chạy cuối cùng) ---
    isLoading = false;
    if (loader) loader.style.display = "none";
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

    // Duyệt qua từng SẢN PHẨM CHA (Ví dụ: Snack, Sữa...)
    cartData.forEach((p, pIdx) => {
        // 1. Tạo cái khung bao ngoài cho cả nhóm sản phẩm này
        const groupWrapper = document.createElement("div");
        groupWrapper.className = "product-group"; // Class mới dùng để làm nền trắng

        let hasItem = false;

        // 2. Duyệt qua các biến thể con bên trong (43g, 73g...)
        p.cartItemDTOList.forEach((item, cIdx) => {
            const variant = p.productVariantsDTOList.find(v => v.variantId === item.variantId);
            if(variant) {
                // Tạo dòng item con và nhét vào khung bao
                groupWrapper.appendChild(createRow(p, item, variant, pIdx, cIdx));
                hasItem = true;
            }
        });

        // 3. Nếu nhóm này có sản phẩm thì mới hiện ra
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
    // Gửi mảng chứa 1 phần tử [id]
    // ⚠️ QUAN TRỌNG: Bạn hãy xem trong Postman cái Request "POST DeleteCart" nó có URL là gì
    // Ví dụ: /auth/carts/delete hay /auth/carts/remove-multiple
    // Tôi đang để tạm là '/auth/carts/delete', bạn sửa lại cho đúng nhé!
    const res = await callAPI('/auth/carts/delete', 'POST', [id]); 
    
    if(res.success) {
        cartData.forEach(p => p.cartItemDTOList = p.cartItemDTOList.filter(i => i.cartItemId !== id));
        checked.delete(id); render();
    } else await showDialog("error", res.message || "Lỗi xóa");
};

// --- HÀM MỚI: XÓA NHIỀU MỤC CÙNG LÚC ---
window.deleteSelected = async () => {
    if(!checked.size) return;
    if(!confirm(`Xóa ${checked.size} mục đã chọn?`)) return;

    // Chuyển Set thành Array: ['id1', 'id2', ...]
    const listIds = Array.from(checked);

    // Gọi API POST gửi danh sách lên
    // ⚠️ URL ở đây cũng phải giống URL bên trên
    const res = await callAPI('/auth/carts/delete', 'POST', listIds);

    if(res.success) {
        // Xóa thành công trên server -> Xóa trong RAM
        cartData.forEach(p => {
            if (p.cartItemDTOList) {
                p.cartItemDTOList = p.cartItemDTOList.filter(i => !checked.has(i.cartItemId));
            }
        });
        
        checked.clear(); // Xóa xong thì bỏ chọn hết
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
    if(busy) return; 
    busy = true; // Khóa lại để tránh click liên tục
    try {
        const row = el.closest(".cart-item");
        const [pIdx, cIdx] = row.dataset.idx.split('-');
        
        const product = cartData[pIdx];                 // Sản phẩm cha (Ví dụ: Snack)
        const currentItem = product.cartItemDTOList[cIdx]; // Item đang được chọn sửa (Ví dụ: Snack 43g)
        
        // 1. Lấy Variant ID mới từ dropdown mà người dùng vừa chọn
        const ids = Array.from(row.querySelectorAll(".variant-select")).map(s => s.value);
        const newV = product.productVariantsDTOList.find(v => ids.every(id => v.attributeValueIdList.includes(id)));

        // Kiểm tra hợp lệ
        if (!newV) { 
            await showDialog("error", "Hết hàng hoặc không tồn tại"); 
            render(); // Reset lại dropdown về cũ
            return; 
        }
        if (newV.variantId === currentItem.variantId) return; // Nếu chọn lại cái cũ thì không làm gì

        // === 2. QUAN TRỌNG: TÌM DÒNG TRÙNG (LOGIC GỘP) ===
        // Tìm xem trong giỏ đã có dòng nào (khác dòng hiện tại) mang VariantId mới này chưa?
        const duplicateItem = product.cartItemDTOList.find(i => 
            i.variantId === newV.variantId && 
            i.cartItemId !== currentItem.cartItemId
        );

        if (duplicateItem) {
            // >>> TRƯỜNG HỢP 1: CÓ TRÙNG -> GỘP <<<
            console.log("Phát hiện trùng -> Thực hiện gộp...");

            // Bước A: Tính tổng số lượng (Số lượng dòng đích + Số lượng dòng đang sửa)
            const newTotalQty = Number(duplicateItem.quantity) + Number(currentItem.quantity);
            
            // Kiểm tra tồn kho trước khi gộp
            if (newTotalQty > newV.stock) {
                // await showDialog("error", `Không thể gộp: Tổng số lượng (${newTotalQty}) vượt quá tồn kho (${newV.stock})`);
                render(); // Reset UI
                return;
            }

            // Bước B: Cập nhật dòng đích (duplicateItem) lên số lượng tổng
            const resUpdate = await callAPI('/auth/carts', 'PUT', { 
                cartItemId: duplicateItem.cartItemId, 
                variantId: duplicateItem.variantId, 
                quantity: newTotalQty 
            });

            if (resUpdate.success) {
                // Bước C: Xóa dòng hiện tại (currentItem) vì đã cộng dồn sang kia rồi
                const resDelete = await callAPI('/auth/carts/delete', 'POST', [currentItem.cartItemId]);
                if (resDelete.success) {
                    // === CẬP NHẬT GIAO DIỆN TỨC THÌ (KHÔNG CẦN RELOAD) ===
                    // 1. Xóa item hiện tại khỏi dữ liệu cục bộ
                    product.cartItemDTOList = product.cartItemDTOList.filter(i => i.cartItemId !== currentItem.cartItemId);
                    // 2. Cập nhật số lượng mới cho item đích
                    duplicateItem.quantity = newTotalQty;
                    // 3. Xử lý checkbox: Nếu dòng bị xóa đang được check, phải bỏ nó ra khỏi Set checked
                    checked.delete(currentItem.cartItemId);

                    await showDialog("success", "Đã gộp sản phẩm thành công!");
                    render(); // Vẽ lại giao diện
                } else {
                    await showDialog("error", "Lỗi khi xóa dòng thừa");
                    render();
                }
            } else {
                await showDialog("error", resUpdate.message || "Lỗi cập nhật số lượng gộp");
                render();
            }

        } else {
            // >>> TRƯỜNG HỢP 2: KHÔNG TRÙNG -> ĐỔI BÌNH THƯỜNG <<<
            console.log("Không trùng -> Đổi biến thể bình thường");
            
            const res = await callAPI('/auth/carts', 'PUT', { 
                cartItemId: currentItem.cartItemId, 
                variantId: newV.variantId, 
                quantity: currentItem.quantity 
            });
            
            if (res.success) {
                currentItem.variantId = newV.variantId; // Cập nhật ID mới vào RAM
                render();
            } else {
                await showDialog("error", res.message || "Lỗi đổi phân loại");
                render(); // Reset UI
            }
        }
    } finally {
        busy = false; // Mở khóa click
    }
};