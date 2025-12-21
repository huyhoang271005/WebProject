import { callAPI } from '../public/api.js'; 

const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
let allOrders = []; 

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Mặc định load tab "Chờ xác nhận" (WAITING)
    await loadOrders('WAITING');
    
    // 2. Đảm bảo UI active đúng tab đầu tiên
    const tabs = document.querySelectorAll('.tab-btn');
    if(tabs.length > 0) {
        tabs.forEach(t => t.classList.remove('active'));
        if(tabs[0]) tabs[0].classList.add('active'); 
    }

    // Xử lý đóng modal
    window.onclick = (event) => {
        const modal = document.getElementById("detailModal");
        if (event.target == modal) closeModal();
    };
});

// ============================================================
// 1. TẢI DỮ LIỆU
// ============================================================
async function loadOrders(status) {
    const spinner = document.getElementById("loading-spinner");
    const tbody = document.getElementById("orderList");
    
    if(spinner) spinner.style.display = "block";
    tbody.innerHTML = "";

    try {
        // Endpoint chuẩn: /auth/admin/orders/{STATUS}
        const endpoint = `/auth/admin/orders/${status}`;
        const res = await callAPI(endpoint, 'GET'); 
        
        if (res.success) {
            allOrders = res.data.listData || [];
            allOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            renderOrders(allOrders);
        } else {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center p-5">${res.message || "Không có đơn hàng"}</td></tr>`;
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
        tbody.innerHTML = `<tr><td colspan="7" class="text-center p-5">Không có đơn hàng nào</td></tr>`;
        return;
    }

    listData.forEach(order => {
        const totalAmount = order.orderItemDTOList.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const st = order.orderStatus; 
        
        // --- LOGIC HIỂN THỊ NÚT BẤM (Dựa theo Enum Backend) ---
        let actionButtons = '';

        // Case 1: Đơn mới (WAITING hoặc PENDING)
        if (st === 'WAITING' || st === 'PENDING') {
            actionButtons = `
                <button class="btn-approve" onclick="updateStatus('${order.orderId}', 'CONFIRMED')" title="Duyệt đơn này">
                    <i class="fa-solid fa-truck-fast"></i> Duyệt đơn
                </button>
                <button class="btn-reject" onclick="updateStatus('${order.orderId}', 'CANCELED')" title="Hủy đơn này">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            `;
        } 
        // Case 2: Đang giao (DELIVERING)
        else if (st === 'DELIVERING') {
            actionButtons = `
                <button class="btn-approve" style="background-color:#3B82F6;" onclick="updateStatus('${order.orderId}', 'DELIVERED')" title="Xác nhận khách đã nhận">
                    <i class="fa-solid fa-check-double"></i> Đã giao
                </button>
            `;
        }
        
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><span class="order-id">#${order.orderId.substring(0, 8)}</span></td>
            <td>
                <div class="customer-info"><strong>${order.contactName || 'Khách lẻ'}</strong></div>
            </td>
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
// 3. CẬP NHẬT TRẠNG THÁI (FIX THEO LOGIC CỦA NHÓM TRƯỞNG)
// ============================================================
window.updateStatus = async (orderId, newStatus) => {
    let msg = "Bạn có chắc chắn chuyển trạng thái đơn này?";
    if (newStatus === 'CANCELED') msg = "CẢNH BÁO: Bạn sắp HỦY đơn hàng này?";

    if (!confirm(msg)) return;
        const endpoint = `/auth/admin/orders/${orderId}`;
        // Vẫn gửi biến trần (callAPI tự đóng gói JSON)
        const body = newStatus; 

        console.log(`Đang gửi PATCH: ${endpoint} -> Gửi: ${body} (Mong muốn: ${newStatus})`);

        const res = await callAPI(endpoint, 'PATCH', body);

        if (res.success) {
            alert("Thành công!");
            
            // Logic reload giữ nguyên tab
            const activeBtn = document.querySelector('.tab-btn.active');
            let currentFilter = 'WAITING';
            if (activeBtn) {
                const text = activeBtn.innerText.trim();
                if(text === 'Chờ xác nhận') currentFilter = 'WAITING';
                else if(text === 'Đang giao') currentFilter = 'DELIVERING';
                else if(text === 'Hoàn thành') currentFilter = 'DELIVERED';
                else if(text === 'Đã hủy') currentFilter = 'CANCELED';
            }
            loadOrders(currentFilter);
            closeModal();
        } else {
            alert(res.message || "Lỗi cập nhật từ Server");
        }
};
// ============================================================
// 4. BỘ LỌC VÀ HELPER
// ============================================================
window.filterStatus = (status) => {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if(event && event.target) event.target.classList.add('active');
    loadOrders(status);
};

function getStatusBadge(status) {
    const s = status || "UNKNOWN";
    let cls = 'bg-gray-100 text-gray-800'; 
    let lbl = s;

    // Mapping đúng với Enum Backend
    switch (s) {
        case 'WAITING': case 'PENDING': cls = 'badge-yellow'; lbl = 'Chờ xác nhận'; break;
        case 'DELIVERING': cls = 'badge-blue'; lbl = 'Đang giao'; break;
        case 'DELIVERED': cls = 'badge-green'; lbl = 'Hoàn thành'; break;
        case 'CANCELED': case 'REJECTED': cls = 'badge-red'; lbl = 'Đã hủy'; break;
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