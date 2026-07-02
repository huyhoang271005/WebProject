import { callAPI } from '../lib/api.js';
import { showDialog } from "/dialog/index.js";
import {convertToVNTime, noImage} from "../lib/public.js";

const money = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

// === STATE MANAGEMENT ===
const PAGE_SIZE = 20;
let currentPage = 0;
let isLoading = false;
let hasMore = true;
let isSearchMode = false;
let currentStatus = 'PENDING';
let currentKeyword = '';

let allOrders = [];
let currentFilteredOrders = []; // Support sorting on client side for currently loaded items
let isAscending = false;

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Initial Load
    await switchTab('PENDING');
    await loadAdminOrderCounts();

    // 2. Tab Handling
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(t => {
        t.onclick = (e) => {
            let targetBtn = e.target;
            if (!targetBtn.classList.contains('tab-btn')) {
                targetBtn = targetBtn.closest('.tab-btn');
            }
            if (!targetBtn) return;

            // UI Update
            tabs.forEach(btn => btn.classList.remove('active'));
            targetBtn.classList.add('active');

            // Logic Update
            const status = targetBtn.getAttribute('data-status') || 'PENDING';
            switchTab(status);
        };
    });

    // 3. Modal Click Outside
    window.onclick = (event) => {
        const modal = document.getElementById("detailModal");
        if (event.target == modal) closeModal();
    };

    // 4. Search Enter Key
    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("keypress", function (event) {
            if (event.key === "Enter") {
                searchOrder();
            }
        });
    }

    // 5. Infinite Scroll (Window)
    window.addEventListener('scroll', () => {
        if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 100) {
            if (!isLoading && hasMore) {
                fetchOrders();
            }
        }
    });
});

// ============================================================
// 1. CORE DATA FETCHING
// ============================================================

async function loadAdminOrderCounts() {
    try {
        const response = await callAPI('/admin/orders/count', 'GET');
        if (response.success && response.data) {
            // Xoá badge cũ nếu có
            document.querySelectorAll('.tab-btn .count-badge').forEach(el => el.remove());

            response.data.forEach(item => {
                const statusStr = item.orderStatus;
                
                if (item.orderCount > 0) {
                    const btn = document.querySelector(`.tab-btn[data-status="${statusStr}"]`);
                    if (btn) {
                        btn.innerHTML += ` <span class="count-badge">${item.orderCount}</span>`;
                    }
                }
            });
        }
    } catch (error) {
        console.error('Lỗi lấy số lượng đơn hàng:', error);
    }
}

// Switch Tab (Reset & Load)
async function switchTab(status) {
    if (status) currentStatus = status;

    // Reset State
    isSearchMode = false;
    currentKeyword = '';
    currentPage = 0;
    allOrders = [];
    hasMore = true;
    isLoading = false;

    // Reset UI
    if (document.getElementById("searchInput")) document.getElementById("searchInput").value = "";
    document.getElementById("orderList").innerHTML = "";

    await fetchOrders();
}

// Search Trigger (Reset & Load)
window.searchOrder = async () => {
    const inputEl = document.getElementById("searchInput");
    const keyword = inputEl ? inputEl.value.trim() : "";

    if (!keyword) {
        await showDialog("error", "Vui lòng nhập mã đơn hàng!");
        return;
    }

    // Setup Search State
    isSearchMode = true;
    currentKeyword = keyword.startsWith("#") ? keyword.substring(1) : keyword;
    currentPage = 0;
    allOrders = [];
    hasMore = true;
    isLoading = false;

    document.getElementById("orderList").innerHTML = "";

    await fetchOrders();
};

// Main Fetch Function
async function fetchOrders() {
    if (isLoading || !hasMore) return;

    const spinner = document.getElementById("loading-spinner");
    if (spinner) spinner.style.display = "block";
    isLoading = true;

    try {
        let endpoint;
        if (isSearchMode) {
            // SEARCH MODE: Only orderId, dynamic page/size
            endpoint = `/admin/orders?orderId=${currentKeyword}&page=${currentPage}&size=${PAGE_SIZE}`;
        } else {
            // TAB MODE: orderStatus, dynamic page/size
            endpoint = `/admin/orders?orderStatus=${currentStatus}&page=${currentPage}&size=${PAGE_SIZE}`;
        }
        const res = await callAPI(endpoint, 'GET');

        if (res.success) {
            const newData = res.data.listData || [];

            if (newData.length < PAGE_SIZE) {
                hasMore = false;
            }

            // Append data
            allOrders = [...allOrders, ...newData];

            // Client-side sort maintenance (default descending date)
            if (!isSearchMode || currentPage === 0) {
                // Sort entire list if it's the first load or simpler logic
                // Ideally server returns sorted, but we ensure consistency here
                allOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            }

            currentFilteredOrders = [...allOrders];
            isAscending = false;
            updateSortIcon();

            renderOrders(currentFilteredOrders);
            currentPage++; // Next page
        } else {
            // Only show empty message if it's the first page
            if (currentPage === 0) {
                const tbody = document.getElementById("orderList");
                tbody.innerHTML = `<tr><td colspan="7" class="text-center p-5">${res.message || "Không tìm thấy dữ liệu"}</td></tr>`;
                hasMore = false;
            }
        }
    } catch (e) {
        console.error("Fetch error:", e);
        if (currentPage === 0) {
            document.getElementById("orderList").innerHTML = `<tr><td colspan="7" class="text-center p-5">Lỗi kết nối</td></tr>`;
        }
    } finally {
        isLoading = false;
        if (spinner) spinner.style.display = "none";
    }
}

window.resetSearch = () => {
    switchTab(currentStatus);
};

// global exposure for html calls (if any old ones exist)
window.loadOrders = switchTab;

// ============================================================
// 2. RENDER
// ============================================================
function renderOrders(listData) {
    const tbody = document.getElementById("orderList");
    // Don't clear innerHTML if appending (handled by re-rendering full list for now to keep sort simple)
    // Optimization: In a real infinite scroll, we might appendchild. 
    // But here we re-render `currentFilteredOrders` which contains all loaded items.

    tbody.innerHTML = "";

    if (!listData || listData.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center p-5"> Không có dữ liệu</td></tr>`;
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
        } else if (st === 'DELIVERING') {
            actionButtons = `
                <button class="btn-approve" onclick="updateStatus('${order.orderId}', 'CONFIRMED', 'Xác nhận đơn hàng đã giao thành công?')" title="Xác nhận đã giao">
                    <i class="fa-solid fa-check"></i> Đã giao
                </button>
            `;
        }

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><span class="order-id" onclick="copyToClipboard('${order.orderId}', this)" title="Click to copy">#${order.orderId.substring(0, 8)}</span></td>
            <td><div class="customer-info"><strong>${order.contactName || 'Khách lẻ'}</strong></div></td>
            <td>${renderMiniProducts(order.orderItemDTOList)}</td>
            <td>
                <div class="total-price">${money.format(totalAmount)}</div>
                <div style="font-size: 11px; color: #6B7280; margin-top: 4px; font-weight: 500;">
                    <i class="fa-regular fa-credit-card"></i> ${order.paymentMethod || 'COD'}
                </div>
            </td>
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
            <img src="${item.imageUrl}" alt="img">
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
// 3. UTILS & ACTIONS
// ============================================================
window.updateStatus = async (orderId, statusToSend, message) => {
    await showDialog("question", message || "Bạn có chắc chắn?", async () => {
        const endpoint = `/admin/orders/${orderId}`;
        const body = statusToSend;
        const res = await callAPI(endpoint, 'PATCH', body);

        if (res.success) {
            await showDialog("success", res.message);

            // Client-side update
            const orderIndex = allOrders.findIndex(o => o.orderId === orderId);
            if (orderIndex !== -1) {
                allOrders[orderIndex].orderStatus = body;

                if (isSearchMode) {
                    currentFilteredOrders = [...allOrders];
                } else {
                    if (currentStatus !== 'ALL' && currentStatus !== body) {
                        allOrders = allOrders.filter(o => o.orderId !== orderId);
                    }
                    currentFilteredOrders = allOrders.filter(o => {
                        return currentStatus === 'ALL' || o.orderStatus === currentStatus;
                    });
                }

                if (isAscending) {
                    currentFilteredOrders.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                } else {
                    currentFilteredOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                }

                renderOrders(currentFilteredOrders);
            }

            closeModal();
        } else {
            await showDialog("error", res.message);
        }
    });
};

function getStatusBadge(status) {
    const s = status || "UNKNOWN";
    let cls = 'bg-gray-100 text-gray-800';
    let lbl = s;
    switch (s) {
        case 'PENDING': cls = 'badge-yellow'; lbl = 'Chờ xác nhận'; break;
        case 'DELIVERING': cls = 'badge-blue'; lbl = 'Đang giao'; break;
        case 'DELIVERED': cls = 'badge-green'; lbl = 'Hoàn thành'; break;
        case 'COMPLETED': cls = 'badge-green'; lbl = 'Hoàn thành'; break;
        case 'HAS_FEEDBACK': cls = 'badge-green'; lbl = 'Đã đánh giá'; break;
        case 'CANCELED': case 'REJECTED': cls = 'badge-red'; lbl = 'Đã hủy'; break;
        case 'CONFIRMED': cls = 'badge-blue'; lbl = 'Đã duyệt'; break;
    }
    return `<span class="status-badge ${cls}">${lbl}</span>`;
}

window.copyToClipboard = async (text, element) => {
    try {
        await navigator.clipboard.writeText(text);
        if (element) {
            element.classList.add("copied");
            setTimeout(() => element.classList.remove("copied"), 1000);
        }
    } catch (err) {
        console.error('Failed to copy: ', err);
    }
    if (window.event) window.event.stopPropagation();
};

window.viewDetail = (orderId) => {
    const order = allOrders.find(o => o.orderId === orderId);
    if (!order) return;

    const idEl = document.getElementById("modalOrderId");
    idEl.innerText = "#" + order.orderId;
    idEl.onclick = () => copyToClipboard(order.orderId, idEl);
    idEl.classList.add("order-id");
    idEl.title = "Click to copy";

    document.getElementById("modalCustomerName").innerText = order.contactName || "Khách lẻ";
    document.getElementById("modalPhone").innerText = order.phone || "---";
    document.getElementById("modalAddress").innerText = order.address || "---";
    document.getElementById("modalDate").innerText = formatDate(order.createdAt);
    document.getElementById("modalStatus").innerHTML = getStatusBadge(order.orderStatus);
    document.getElementById("modalPaymentMethod").innerText = order.paymentMethod || "---";
    document.getElementById("modalPaymentAt").innerText = order.paymentAt ? formatDate(order.paymentAt) : "Chưa thanh toán";

    const listHtml = order.orderItemDTOList.map(item => `
        <tr>
            <td>
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${item.imageUrl}" style="width:40px; height:40px; object-fit:cover; border-radius:4px;">
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
    
    const modalMessageBtn = document.getElementById("modalMessageBtn");
    if (modalMessageBtn) {
        modalMessageBtn.onclick = () => messageUser(order.userId);
    }
    
    const orderReviewSection = document.getElementById("orderReviewSection");
    const btnViewReview = document.getElementById("btnViewReview");
    const modalReviewList = document.getElementById("modalReviewList");

    const btnUserDetail = document.getElementById("btnUserDetail");

    if(btnUserDetail) {
        btnUserDetail.onclick = () => userDetail(order.userId);
    }
    if (orderReviewSection && btnViewReview && modalReviewList) {
        modalReviewList.style.display = 'none';
        modalReviewList.innerHTML = '<p style="color: #888; text-align:center; padding: 20px;">Đang tải đánh giá...</p>';
        btnViewReview.style.display = 'block';

        if (order.orderStatus === 'HAS_FEEDBACK') {
            orderReviewSection.style.display = 'block';
            btnViewReview.onclick = () => {
                btnViewReview.style.display = 'none';
                modalReviewList.style.display = 'block';
                fetchOrderReviewsAdmin(orderId);
            };
        } else {
            orderReviewSection.style.display = 'none';
        }
    } else {
        fetchOrderReviewsAdmin(orderId);
    }
    
    document.getElementById("detailModal").style.display = "flex";
};

async function fetchOrderReviewsAdmin(orderId) {
    const listContainer = document.getElementById("modalReviewList");
    if (!listContainer) return;
    
    listContainer.innerHTML = '<p style="color: #888; text-align:center; padding: 20px;">Đang tải đánh giá...</p>';
    
    try {
        const res = await callAPI(`/feedbacks/orders/${orderId}`, "GET");
        if (res.success && res.data && res.data.length > 0) {
            renderOrderReviewsAdmin(res.data);
        } else {
            listContainer.innerHTML = '<p style="color: #888; text-align:center; padding: 20px;">Chưa có đánh giá nào cho đơn hàng này.</p>';
        }
    } catch (e) {
        listContainer.innerHTML = '<p style="color: red; text-align:center; padding: 20px;">Lỗi tải đánh giá.</p>';
    }
}

function renderOrderReviewsAdmin(reviews) {
    const container = document.getElementById("modalReviewList");
    let html = "";
    
    reviews.forEach(review => {
        const avatar = review.imageUrl || noImage;
        const date = convertToVNTime(review.createdAt);
        
        let starsHtml = '';
        for (let i = 1; i <= 5; i++) {
            if (review.rating >= i) {
                starsHtml += '<i class="fa-solid fa-star"></i>';
            } else if (review.rating >= i - 0.5) {
                starsHtml += '<i class="fa-solid fa-star-half-stroke"></i>';
            } else {
                starsHtml += '<i class="fa-regular fa-star"></i>';
            }
        }

        let replyHtml = '';
        if (review.reply) {
            const replyDate = convertToVNTime(review.reply.createdAt);
            const replyAvatar = review.reply.imageUrl || noImage;
            replyHtml = `
                <div class="review-reply-box">
                    <div class="review-reply-header">
                        <img src="${replyAvatar}" style="width:20px;height:20px;border-radius:50%">
                        <span>${escapeHtml(review.reply.username)} <span class="admin-badge">QTV</span></span>
                        <span style="font-size:11px;color:#888;font-weight:normal">${replyDate}</span>
                    </div>
                    <div class="review-reply-content">${escapeHtml(review.reply.message)}</div>
                </div>
            `;
        }
        
        html += `
            <div class="review-item">
                <div class="review-header">
                    <div class="review-user-info">
                        <img src="${avatar}" class="review-avatar">
                        <div class="review-meta">
                            <span class="review-username">${escapeHtml(review.username)}</span>
                            <span class="review-date">${date}</span>
                        </div>
                    </div>
                </div>
                <div class="review-stars">${starsHtml}</div>
                <div class="review-content">${escapeHtml(review.comment || '')}</div>
                ${replyHtml}
            </div>
        `;
    });
    container.innerHTML = html;
}

// Function to escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

window.closeModal = () => document.getElementById("detailModal").style.display = "none";
function formatDate(iso) { if (!iso) return ''; return new Date(iso).toLocaleString('vi-VN'); }

window.toggleSortDate = () => {
    isAscending = !isAscending;
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

window.messageUser = async (userId) => {
    if (!userId || userId === 'null' || userId === 'undefined') {
        await showDialog("warning", "Đơn hàng này không gắn với tài khoản nào (Khách lẻ). Không thể nhắn tin.");
        return;
    }
    const data = { userIds: [userId] };
    const result = await callAPI("/room-chat", "POST", data);
    if (result.success) {
      window.location.href = "/message/?roomId=" + result.data.roomChatId;
    } else {
      await showDialog("error", result.message || "Không thể tạo phòng chat.");
    }
};

window.userDetail = async (userId) => {
    window.location.href = "/user-detail?uid=" + userId;
}