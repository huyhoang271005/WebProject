import { callAPI } from '../public/api.js'; 
// Nếu bạn có file utils hoặc dialog thì import thêm, không thì thôi
// import { showDialog } from '../dialog/index.js';

const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
let allOrders = []; // Biến lưu toàn bộ đơn hàng để lọc local

document.addEventListener("DOMContentLoaded", async () => {
    await loadOrders();
});

// === 1. HÀM LOAD DỮ LIỆU TỪ SERVER ===
async function loadOrders() {
    const spinner = document.getElementById("loading-spinner");
    const tbody = document.getElementById("orderList");
    
    // Hiện quay quay, ẩn bảng cũ
    if(spinner) spinner.style.display = "block";
    tbody.innerHTML = "";

    try {
        // Gọi API lấy danh sách đơn hàng (Bạn sửa lại URL cho đúng API của bạn)
        const res = await callAPI('/auth/orders', 'GET'); 
        
        // --- GIẢ LẬP DỮ LIỆU ĐỂ TEST (Nếu chưa có API thì dùng cái này) ---
        // Nếu API chưa chạy, bạn có thể comment dòng callAPI ở trên và uncomment dòng dưới để test giao diện
        // const res = { success: true, data: { listData: [ ...copy cái JSON bạn gửi vào đây... ] } }; 

        if (res.success) {
            allOrders = res.data.listData || [];
            // Mặc định render tất cả
            renderOrders(allOrders);
        } else {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center p-5">${res.message || "Lỗi tải dữ liệu"}</td></tr>`;
        }
    } catch (e) {
        console.error(e);
        tbody.innerHTML = `<tr><td colspan="7" class="text-center p-5" style="color:red">Lỗi kết nối Server</td></tr>`;
    } finally {
        if(spinner) spinner.style.display = "none";
    }
}

// === 2. HÀM RENDER RA BẢNG HTML ===
function renderOrders(listData) {
    const tbody = document.getElementById("orderList");
    tbody.innerHTML = "";

    if (!listData || listData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center p-5">Không có đơn hàng nào</td></tr>`;
        return;
    }

    listData.forEach(order => {
        // A. Tự tính tổng tiền (Cộng dồn các món)
        const totalAmount = order.orderItemDTOList.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
        }, 0);

        // B. Xử lý hiển thị danh sách sản phẩm (Chỉ hiện 2 món đầu, còn lại ẩn)
        let productsHtml = "";
        const itemsToShow = order.orderItemDTOList.slice(0, 2); // Lấy 2 món đầu
        
        itemsToShow.forEach(item => {
            // Lấy tên phân loại (nếu có)
            const variantName = item.attributeValues ? item.attributeValues.join(' - ') : '';
            
            productsHtml += `
                <div class="mini-product">
                    <img src="${item.imageUrl || 'https://via.placeholder.com/40'}" alt="img">
                    <div>
                        <div class="p-name">${item.productName}</div>
                        <div class="p-variant">${variantName}</div>
                        <div class="p-qty">x${item.quantity}</div>
                    </div>
                </div>
            `;
        });

        // Nếu còn nhiều hơn 2 món thì hiện dòng "+... khác"
        if (order.orderItemDTOList.length > 2) {
            productsHtml += `<div class="more-items">+ ${order.orderItemDTOList.length - 2} sản phẩm khác</div>`;
        }

        // C. Render dòng tr
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><span class="order-id" title="${order.orderId}">#${order.orderId.substring(0, 8)}...</span></td>
            <td>
                <div class="customer-info">
                    <strong>${order.contactName || 'Khách lẻ'}</strong><br>
                    <span class="phone">${order.phone || ''}</span>
                    <div style="font-size:11px; color:#888; max-width:150px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${order.address}">${order.address}</div>
                </div>
            </td>
            <td>${productsHtml}</td>
            <td class="total-price">${money.format(totalAmount)}</td>
            <td>${getStatusBadge(order.orderStatus)}</td>
            <td>${formatDate(order.createdAt)}</td>
            <td>
                <button class="action-btn view-btn" onclick="viewDetail('${order.orderId}')">
                    <i class="fa-solid fa-eye"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// === 3. CÁC HÀM HELPER (Định dạng) ===

// Hàm lấy HTML Badge trạng thái
function getStatusBadge(status) {
    const s = status || "UNKNOWN";
    let colorClass = 'bg-gray-100 text-gray-800'; 
    let label = s;

    switch (s) {
        case 'WAITING':
            colorClass = 'badge-yellow'; 
            label = 'Chờ xác nhận';
            break;
        case 'PENDING':
            colorClass = 'badge-orange'; 
            label = 'Đang chuẩn bị';
            break;
        case 'SHIPPING':
            colorClass = 'badge-blue';
            label = 'Đang giao';
            break;
        case 'COMPLETED':
        case 'SUCCESS':
            colorClass = 'badge-green';
            label = 'Hoàn thành';
            break;
        case 'CANCELLED':
            colorClass = 'badge-red';
            label = 'Đã hủy';
            break;
    }
    return `<span class="status-badge ${colorClass}">${label}</span>`;
}

// Hàm format ngày giờ
function formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleString('vi-VN', { 
        hour: '2-digit', minute: '2-digit', 
        day: '2-digit', month: '2-digit', year: 'numeric' 
    });
}

// === 4. CHỨC NĂNG LỌC (TABS) ===
// Gán vào window để HTML gọi được onclick="filterStatus(...)"
window.filterStatus = (status) => {
    // 1. Cập nhật giao diện nút Active
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        // Logic so sánh text nút với status hơi thủ công, bạn có thể truyền `this` vào hàm để dễ xử lý hơn
        // Ở đây mình làm đơn giản: reset hết, nút nào được bấm sẽ active (xử lý sau bên dưới)
    });
    // Tìm nút vừa bấm để add active (Cách đơn giản nhất là truyền event vào, nhưng ở đây ta xử lý logic lọc trước)
    event.target.classList.add('active');

    // 2. Lọc dữ liệu
    if (status === 'ALL') {
        renderOrders(allOrders);
    } else {
        const filtered = allOrders.filter(o => o.orderStatus === status);
        renderOrders(filtered);
    }
};

// Hàm xem chi tiết (Placeholder)
window.viewDetail = (id) => {
    alert("Xem chi tiết đơn: " + id);
    // Sau này bạn chuyển trang hoặc mở Dialog tại đây
    // window.location.href = `order-detail.html?id=${id}`;
};