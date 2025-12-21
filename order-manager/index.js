import { callAPI } from '../public/api.js'; 
import { showDialog } from '../dialog/index.js';

// Cấu hình định dạng tiền tệ và ngày tháng
const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
let allOrders = []; // Biến lưu trữ toàn bộ dữ liệu đơn hàng

// Khởi chạy khi trang web tải xong
document.addEventListener("DOMContentLoaded", async () => {
    await loadOrders();

    // Xử lý đóng modal khi click ra ngoài
    window.onclick = (event) => {
        const modal = document.getElementById("detailModal");
        if (event.target == modal) closeModal();
    };
});

// ==============================================
// 1. HÀM TẢI DỮ LIỆU TỪ SERVER
// ==============================================
async function loadOrders() {
    const spinner = document.getElementById("loading-spinner");
    const tbody = document.getElementById("orderList");
    
    // Hiện spinner loading
    if(spinner) spinner.style.display = "block";
    tbody.innerHTML = ""; // Xóa dữ liệu cũ

    try {
        // Gọi API lấy danh sách đơn hàng
        const res = await callAPI('/auth/admin/orders/WAITING', 'GET'); 
        
        if (res.success) {
            allOrders = res.data.listData || [];
            
            // Sắp xếp đơn mới nhất lên đầu (dựa vào createdAt)
            allOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            // Render toàn bộ đơn hàng lần đầu
            renderOrders(allOrders);
        } else {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center p-5">${res.message || "Không tải được dữ liệu"}</td></tr>`;
        }
    } catch (e) {
        console.error("Lỗi load orders:", e);
        tbody.innerHTML = `<tr><td colspan="7" class="text-center p-5" style="color:red">Lỗi kết nối Server</td></tr>`;
    } finally {
        if(spinner) spinner.style.display = "none";
    }
}

// ==============================================
// 2. HÀM RENDER BẢNG ĐƠN HÀNG CHÍNH
// ==============================================
function renderOrders(listData) {
    const tbody = document.getElementById("orderList");
    tbody.innerHTML = "";

    if (!listData || listData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center p-5">Không tìm thấy đơn hàng nào</td></tr>`;
        return;
    }

    listData.forEach(order => {
        // A. Tính tổng tiền (Do API không trả về tổng)
        const totalAmount = order.orderItemDTOList.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0);

        // B. Xác định các nút thao tác dựa trên trạng thái
        let actionButtons = '';
        
        // -- Trạng thái CHỜ XÁC NHẬN: Hiện nút DUYỆT và HỦY --
        if (order.orderStatus === 'WAITING') {
            actionButtons = `
                <button class="btn-approve" onclick="updateStatus('${order.orderId}', 'SHIPPING')" title="Duyệt đơn này">
                    <i class="fa-solid fa-check"></i> Duyệt
                </button>
                <button class="btn-reject" onclick="updateStatus('${order.orderId}', 'CANCELLED')" title="Hủy đơn này">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            `;
        } 
        // -- Trạng thái ĐANG GIAO: Hiện nút ĐÃ GIAO --
        else if (order.orderStatus === 'SHIPPING') {
            actionButtons = `
                <button class="btn-approve" onclick="updateStatus('${order.orderId}', 'COMPLETED')" style="background-color: #3B82F6;" title="Xác nhận đã giao hàng">
                    <i class="fa-solid fa-box-open"></i> Đã giao
                </button>
            `;
        }
        // Các trạng thái khác (Hoàn thành/Đã hủy) không hiện nút thao tác, chỉ hiện nút xem

        // C. Render dòng HTML
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><span class="order-id" title="${order.orderId}">#${order.orderId.substring(0, 8)}...</span></td>
            <td>
                <div class="customer-info">
                    <strong>${order.contactName || 'Khách lẻ'}</strong><br>
                    <span class="phone">${order.phone || '---'}</span>
                </div>
            </td>
            <td>${renderMiniProducts(order.orderItemDTOList)}</td>
            <td class="total-price">${money.format(totalAmount)}</td>
            <td>${getStatusBadge(order.orderStatus)}</td>
            <td>${formatDate(order.createdAt)}</td>
            <td>
                <div class="action-group">
                    ${actionButtons}
                    <button class="view-btn" onclick="viewDetail('${order.orderId}')" title="Xem chi tiết">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Helper: Render danh sách sản phẩm thu gọn (chỉ hiện 2 món)
function renderMiniProducts(items) {
    if (!items) return "";
    
    // Chỉ lấy 2 sản phẩm đầu tiên để hiển thị
    let html = items.slice(0, 2).map(item => `
        <div class="mini-product">
            <img src="${item.imageUrl || 'https://via.placeholder.com/40'}" alt="img">
            <div>
                <div class="p-name">${item.productName}</div>
                <div class="p-variant">
                    ${item.attributeValues ? item.attributeValues.join(' - ') : ''} 
                    <span class="p-qty">(x${item.quantity})</span>
                </div>
            </div>
        </div>
    `).join('');

    // Nếu còn nhiều hơn 2 món
    if (items.length > 2) {
        html += `<div class="more-items">+ ${items.length - 2} sản phẩm khác</div>`;
    }
    return html;
}

// ==============================================
// 3. XỬ LÝ CẬP NHẬT TRẠNG THÁI (API)
// ==============================================
// Gắn vào window để gọi được từ HTML onclick
window.updateStatus = async (orderId, newStatus) => {
    // Xác nhận trước khi làm
    let confirmMsg = "Bạn có chắc chắn muốn duyệt đơn hàng này?";
    if (newStatus === 'CANCELLED') confirmMsg = "CẢNH BÁO: Bạn có chắc chắn muốn HỦY đơn hàng này không?";
    if (newStatus === 'COMPLETED') confirmMsg = "Xác nhận đơn hàng đã giao thành công?";

    if (!confirm(confirmMsg)) return;

    try {
        // Gọi API cập nhật (PUT)
        // Lưu ý: Cấu trúc body này phụ thuộc vào Backend quy định. 
        const res = await callAPI(`/auth/admin/orders/WAITING`, 'PUT', {
            orderId: orderId,
            orderStatus: newStatus
        });

        if (res.success) {
            alert("Cập nhật trạng thái thành công!");
            
            // Cập nhật dữ liệu local để đỡ phải load lại API
            const orderIndex = allOrders.findIndex(o => o.orderId === orderId);
            if (orderIndex !== -1) {
                allOrders[orderIndex].orderStatus = newStatus;
            }

            // Render lại bảng theo tab hiện tại (đang filter hay xem tất cả)
            // Để đơn giản ta lấy lại tab đang active
            const activeTab = document.querySelector('.tab-btn.active');
            if(activeTab) {
                // Trigger lại sự kiện click hoặc gọi hàm filter trực tiếp
                // Ở đây ta gọi render lại danh sách hiện tại cho nhanh
                const currentFilter = activeTab.innerText === 'Tất cả' ? 'ALL' : 
                                      activeTab.innerText === 'Chờ xác nhận' ? 'WAITING' :
                                      activeTab.innerText === 'Đang giao' ? 'SHIPPING' : 
                                      activeTab.innerText === 'Hoàn thành' ? 'COMPLETED' : 'CANCELLED';
                window.filterStatus(currentFilter);
            } else {
                renderOrders(allOrders);
            }
        } else {
            alert(res.message || "Có lỗi xảy ra khi cập nhật");
        }
    } catch (e) {
        console.error(e);
        alert("Lỗi kết nối Server khi cập nhật");
    }
};

// ==============================================
// 4. XỬ LÝ MODAL CHI TIẾT
// ==============================================
window.viewDetail = (orderId) => {
    // Tìm đơn hàng trong mảng đã tải
    const order = allOrders.find(o => o.orderId === orderId);
    if (!order) return;

    // 1. Điền thông tin chung
    document.getElementById("modalOrderId").innerText = "#" + order.orderId;
    document.getElementById("modalCustomerName").innerText = order.contactName || "Khách lẻ";
    document.getElementById("modalPhone").innerText = order.phone || "Không có SĐT";
    document.getElementById("modalAddress").innerText = order.address || "Không có địa chỉ";
    document.getElementById("modalDate").innerText = formatDate(order.createdAt);
    document.getElementById("modalStatus").innerHTML = getStatusBadge(order.orderStatus);

    // 2. Điền bảng sản phẩm (FULL LIST)
    const listHtml = order.orderItemDTOList.map(item => `
        <tr>
            <td>
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${item.imageUrl || 'https://via.placeholder.com/40'}" style="width:40px; height:40px; object-fit:cover; border-radius:4px; border:1px solid #eee;">
                    <div>
                        <div style="font-weight:600; font-size:14px;">${item.productName}</div>
                        <div style="font-size:12px; color:#666;">${item.attributeValues ? item.attributeValues.join(' - ') : ''}</div>
                    </div>
                </div>
            </td>
            <td>${money.format(item.price)}</td>
            <td style="font-weight:bold; text-align:center;">${item.quantity}</td>
            <td style="font-weight:bold; color:#333; text-align:right;">${money.format(item.price * item.quantity)}</td>
        </tr>
    `).join('');
    
    document.getElementById("modalProductList").innerHTML = listHtml;

    // 3. Tính tổng tiền thanh toán cuối cùng
    const grandTotal = order.orderItemDTOList.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    document.getElementById("modalTotalMoney").innerText = money.format(grandTotal);

    // 4. Hiển thị modal
    document.getElementById("detailModal").style.display = "flex";
};

window.closeModal = () => {
    document.getElementById("detailModal").style.display = "none";
};

// ==============================================
// 5. BỘ LỌC TRẠNG THÁI (TABS)
// ==============================================
window.filterStatus = (status) => {
    // 1. Xử lý UI nút active
    // (Tìm nút bấm tương ứng trong HTML để add class active - Cách đơn giản nhất là reset hết)
    const buttons = document.querySelectorAll('.tab-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    
    // Highlight nút vừa bấm (dựa vào event onclick truyền từ HTML)
    if(event && event.target) {
        event.target.classList.add('active');
    }

    // 2. Lọc dữ liệu
    if (status === 'ALL') {
        renderOrders(allOrders);
    } else {
        const filteredList = allOrders.filter(o => o.orderStatus === status);
        renderOrders(filteredList);
    }
};

// ==============================================
// 6. CÁC HÀM HELPER KHÁC
// ==============================================
function getStatusBadge(status) {
    const s = status || "UNKNOWN";
    let colorClass = 'bg-gray-100 text-gray-800'; 
    let label = s;

    switch (s) {
        case 'WAITING':
            colorClass = 'badge-yellow'; label = 'Chờ xác nhận'; break;
        case 'PENDING':
            colorClass = 'badge-orange'; label = 'Đang chuẩn bị'; break;
        case 'SHIPPING':
            colorClass = 'badge-blue'; label = 'Đang giao'; break;
        case 'COMPLETED':
        case 'SUCCESS':
            colorClass = 'badge-green'; label = 'Hoàn thành'; break;
        case 'CANCELLED':
            colorClass = 'badge-red'; label = 'Đã hủy'; break;
    }
    return `<span class="status-badge ${colorClass}">${label}</span>`;
}

function formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString('vi-VN', { 
        hour: '2-digit', minute: '2-digit', 
        day: '2-digit', month: '2-digit', year: 'numeric' 
    });
}