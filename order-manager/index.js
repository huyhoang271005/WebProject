import { callAPI } from '../lib/api.js';

const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
let allOrders = []; 
let currentFilteredOrders = []; // Biến lưu danh sách đang hiển thị (để support sort khi đang search)

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Mặc định load tab "Chờ xác nhận"
    await loadOrders('PENDING');
    
    // 2. Xử lý Active Tab
    const tabs = document.querySelectorAll('.tab-btn');
    if(tabs.length > 0) {
        tabs.forEach(t => t.classList.remove('active'));
        if(tabs[0]) tabs[0].classList.add('active'); 
    }

    // 3. Xử lý click ngoài modal
    window.onclick = (event) => {
        const modal = document.getElementById("detailModal");
        if (event.target == modal) closeModal();
    };

    // 4. Sự kiện nhấn Enter trong ô tìm kiếm
    const searchInput = document.getElementById("searchInput");
    if(searchInput) {
        searchInput.addEventListener("keypress", function(event) {
            if (event.key === "Enter") {
                searchOrder();
            }
        });
    }
});

// ============================================================
// 1. TẢI DỮ LIỆU
// ============================================================
async function loadOrders(status) {
    const spinner = document.getElementById("loading-spinner");
    const tbody = document.getElementById("orderList");
    
    // Reset ô tìm kiếm khi chuyển tab
    if(document.getElementById("searchInput")) document.getElementById("searchInput").value = "";

    if(spinner) spinner.style.display = "block";
    tbody.innerHTML = "";

    try {
        const endpoint = `/admin/orders?orderStatus=${status}&page=0&size=100`;
        console.log("Calling API:", endpoint); 
        const res = await callAPI(endpoint, 'GET'); 
        
        if (res.success) {
            allOrders = res.data.listData || [];
            allOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            // Clone ra danh sách hiển thị
            currentFilteredOrders = [...allOrders];

            isAscending = false; 
            updateSortIcon();    
            renderOrders(currentFilteredOrders);
        } else {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center p-5">${res.message || "Không có đơn hàng"}</td></tr>`;
            allOrders = [];
            currentFilteredOrders = [];
        }
    } catch (e) {
        console.error(e);
        tbody.innerHTML = `<tr><td colspan="7" class="text-center p-5" style="color:red">Lỗi kết nối server</td></tr>`;
    } finally {
        if(spinner) spinner.style.display = "none";
    }
}

// ============================================================
// 2. RENDER BẢNG
// ============================================================
function renderOrders(listData) {
    const tbody = document.getElementById("orderList");
    tbody.innerHTML = "";

    if (!listData || listData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center p-5">Không tìm thấy đơn hàng nào</td></tr>`;
        return;
    }

    listData.forEach(order => {
        const totalAmount = order.orderItemDTOList.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const st = order.orderStatus; 
        
        let actionButtons = '';

        if (st === 'PENDING') {
            actionButtons = `
                <button class="btn-approve" onclick="updateStatus('${order.orderId}', 'CONFIRMED', 'Duyệt đơn chuyển sang giao hàng?')" title="Duyệt đơn">
                    <i class="fa-solid fa-truck-fast"></i> Duyệt
                </button>
                <button class="btn-reject" onclick="updateStatus('${order.orderId}', 'CANCELED', 'Hủy đơn hàng này?')" title="Hủy đơn">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            `;
        } 
        else if (st === 'DELIVERING') {
            actionButtons = `
                <button class="btn-approve" style="background-color:#3B82F6;" onclick="updateStatus('${order.orderId}', 'CONFIRMED', 'Xác nhận khách đã nhận hàng?')" title="Xác nhận đã giao">
                    <i class="fa-solid fa-check-double"></i> Đã giao
                </button>
            `;
        }
        
        const tr = document.createElement("tr");
        // Lưu ý: Hiển thị 8 ký tự đầu của ID
        tr.innerHTML = `
            <td><span class="order-id">#${order.orderId.substring(0, 8)}</span></td>
            <td><div class="customer-info"><strong>${order.contactName || 'Khách lẻ'}</strong></div></td>
            <td>${renderMiniProducts(order.orderItemDTOList)}</td>
            <td class="total-price">${money.format(totalAmount)}</td>
            <td>${getStatusBadge(st)}</td>
            <td>${formatDate(order.createdAt)}</td>
            <td style="text-align: right;">
                <div class="action-group">
                    ${actionButtons}
                    <button class="view-btn" onclick="viewDetail('${order.orderId}')"><i class="fa-solid fa-eye"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderMiniProducts(items) {
    if (!items) return "";
    let html = items.slice(0, 2).map(item => `
        <div class="mini-product">
            <img src="${item.imageUrl || 'https://via.placeholder.com/40'}" alt="img">
            <div>
                <div class="p-name">${item.productName}</div>
                <div class="p-variant">${item.attributeValues ? item.attributeValues.join(' - ') : ''} (x${item.quantity})</div>
            </div>
        </div>
    `).join('');
    if (items.length > 2) html += `<div class="more-items" style="color:#059669; font-size:11px;">+ ${items.length - 2} sản phẩm khác</div>`;
    return html;
}

// ============================================================
// 3. LOGIC TÌM KIẾM (EXACT MATCH)
// ============================================================
window.searchOrder = () => {
    const inputEl = document.getElementById("searchInput");
    if (!inputEl) return;

    let keyword = inputEl.value.trim();

    if (!keyword) {
        alert("Vui lòng nhập mã đơn hàng!");
        return;
    }

    // Xóa dấu # nếu người dùng nhập vào (để so sánh với ID gốc)
    if (keyword.startsWith("#")) {
        keyword = keyword.substring(1);
    }

    // Lọc chính xác 100%
    // Logic: ID trong DB có thể dài (UUID), nhưng hiển thị chỉ 8 ký tự.
    // Nếu keyword khớp hoàn toàn UUID HOẶC khớp hoàn toàn 8 ký tự đầu -> OK
    const foundOrders = allOrders.filter(order => {
        const fullId = order.orderId; // ID gốc
        const shortId = fullId.substring(0, 8); // ID hiển thị
        
        // So sánh tuyệt đối (===)
        return fullId === keyword || shortId === keyword;
    });

    if (foundOrders.length === 0) {
        alert(`Không tìm thấy đơn hàng nào có mã chính xác là: #${keyword}`);
        // Không render lại để giữ nguyên list cũ hoặc có thể render rỗng tùy ý bạn
    } else {
        currentFilteredOrders = foundOrders; // Cập nhật list hiện tại để sort hoạt động đúng trên kết quả tìm kiếm
        renderOrders(foundOrders);
    }
};

window.resetSearch = () => {
    document.getElementById("searchInput").value = "";
    currentFilteredOrders = [...allOrders]; // Khôi phục lại toàn bộ danh sách
    renderOrders(allOrders);
};

// ============================================================
// 4. CÁC HÀM XỬ LÝ KHÁC (UPDATE, HELPER...)
// ============================================================
window.updateStatus = async (orderId, statusToSend, message) => {
    if (!confirm(message || "Bạn có chắc chắn?")) return;

    try {
        const endpoint = `/admin/orders/${orderId}`;
        const body = statusToSend; 

        console.log(`Sending to ${endpoint}: ${body}`);
        const res = await callAPI(endpoint, 'PATCH', body);

        if (res.success) {
            alert("Thành công!");
            
            // Reload lại đúng tab đang đứng
            const activeBtn = document.querySelector('.tab-btn.active');
            let currentFilter = 'PENDING';
            if (activeBtn) {
                const text = activeBtn.innerText.trim();
                if(text === 'Chờ xác nhận') currentFilter = 'PENDING';
                else if(text === 'Đang giao') currentFilter = 'DELIVERING';
                else if(text === 'Hoàn thành') currentFilter = 'DELIVERED';
                else if(text === 'Đã hủy') currentFilter = 'CANCELED';
            }
            loadOrders(currentFilter);
            closeModal();
        } else {
            alert(res.message || "Lỗi cập nhật từ Server");
        }
    } catch (e) {
        console.error(e);
        alert("Lỗi hệ thống: " + e.message);
    }
};

window.filterStatus = (status) => {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if(event && event.target) event.target.classList.add('active');
    loadOrders(status);
};

function getStatusBadge(status) {
    const s = status || "UNKNOWN";
    let cls = 'bg-gray-100 text-gray-800'; 
    let lbl = s;

    switch (s) {
        case 'PENDING': cls = 'badge-yellow'; lbl = 'Chờ xác nhận'; break;
        case 'DELIVERING': cls = 'badge-blue'; lbl = 'Đang giao'; break;
        case 'DELIVERED': cls = 'badge-green'; lbl = 'Hoàn thành'; break;
        case 'CANCELED': case 'REJECTED': cls = 'badge-red'; lbl = 'Đã hủy'; break;
        case 'CONFIRMED': cls = 'badge-blue'; lbl = 'Đã duyệt'; break;
    }
    return `<span class="status-badge ${cls}">${lbl}</span>`;
}

window.viewDetail = (orderId) => {
    const order = allOrders.find(o => o.orderId === orderId);
    if (!order) return;
    document.getElementById("modalOrderId").innerText = "#" + order.orderId;
    document.getElementById("modalCustomerName").innerText = order.contactName || "Khách lẻ";
    document.getElementById("modalPhone").innerText = order.phone || "---";
    document.getElementById("modalAddress").innerText = order.address || "---";
    document.getElementById("modalDate").innerText = formatDate(order.createdAt);
    document.getElementById("modalStatus").innerHTML = getStatusBadge(order.orderStatus);

    const listHtml = order.orderItemDTOList.map(item => `
        <tr>
            <td>
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${item.imageUrl || 'https://via.placeholder.com/40'}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;">
                    <div><div style="font-weight:600;">${item.productName}</div><div style="font-size:12px; color:#666;">${item.attributeValues ? item.attributeValues.join(' - ') : ''}</div></div>
                </div>
            </td>
            <td>${money.format(item.price)}</td>
            <td style="font-weight:bold; text-align:center;">${item.quantity}</td>
            <td style="text-align:right;">${money.format(item.price * item.quantity)}</td>
        </tr>
    `).join('');
    
    document.getElementById("modalProductList").innerHTML = listHtml;
    const total = order.orderItemDTOList.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    document.getElementById("modalTotalMoney").innerText = money.format(total);
    document.getElementById("detailModal").style.display = "flex";
};
window.closeModal = () => document.getElementById("detailModal").style.display = "none";
function formatDate(iso) { if(!iso) return ''; return new Date(iso).toLocaleString('vi-VN'); }

let isAscending = false; 

window.toggleSortDate = () => {
    isAscending = !isAscending;
    
    // Sắp xếp trên danh sách ĐANG HIỂN THỊ (có thể là list đã lọc hoặc list gốc)
    currentFilteredOrders.sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return isAscending ? timeA - timeB : timeB - timeA;
    });

    renderOrders(currentFilteredOrders);
    updateSortIcon();
};

function updateSortIcon() {
    const icon = document.getElementById("sortIcon");
    if (!icon) return;

    if (isAscending) {
        icon.className = "fa-solid fa-arrow-up-long";
        icon.style.color = "#3B82F6"; 
    } else {
        icon.className = "fa-solid fa-arrow-down-long";
        icon.style.color = ""; 
    }
}