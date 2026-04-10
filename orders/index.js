import { callAPI } from '../lib/api.js';
import { toggleLoading } from '../lib/loader.js';
import { loadNavbar } from '../navbar/navbar.js';
import { showDialog } from "/dialog/index.js";
import {convertToVNTime, noImage} from "../lib/public.js";

const formatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
const PAYMENT_METHOD = {
    VNPAY: 'VN_PAY',
    COD: 'COD'
};
const PAGE_SIZE = 10;

const STATUS_MAP = {
    0: 'WAITING',
    1: 'PAYING',
    2: 'PENDING',
    3: 'CANCELED',
    4: 'DELIVERING',
    5: 'DELIVERED',
    6: 'COMPLETED',
    7: 'HAS_FEEDBACK',
    'WAITING': 'WAITING',
    'PAYING': 'PAYING',
    'PENDING': 'PENDING',
    'CANCELED': 'CANCELED',
    'DELIVERING': 'DELIVERING',
    'DELIVERED': 'DELIVERED',
    'COMPLETED': 'COMPLETED',
    'HAS_FEEDBACK': 'HAS_FEEDBACK'
};

const STATUS_CONFIG = {
    WAITING: {
        label: 'Chờ thanh toán',
        icon: 'fa-clock',
        color: '#f59e0b',
        actions: ['detail', 'cancel', 'pay']
    },
    PAYING: {
        label: 'Đang thanh toán',
        icon: 'fa-spinner fa-spin',
        color: '#f59e0b',
        actions: ['detail', 'cancel'] // PAYING cũng có thể hủy (VN_PAY chưa thanh toán)
    },
    PENDING: {
        label: 'Đang xử lý',
        icon: 'fa-hourglass-half',
        color: '#3b82f6',
        actions: ['detail']
    },
    DELIVERING: {
        label: 'Đang giao',
        icon: 'fa-shipping-fast',
        color: '#06b6d4',
        actions: ['detail']
    },
    DELIVERED: {
        label: 'Đã giao hàng',
        icon: 'fa-box-open',
        color: '#10b981',
        actions: ['detail', 'confirm']
    },
    COMPLETED: {
        label: 'Đã hoàn thành',
        icon: 'fa-check-circle',
        color: '#10b981',
        actions: ['detail', 'feedback', 'reorder']
    },
    HAS_FEEDBACK: {
        label: 'Đã hoàn thành',
        icon: 'fa-check-circle',
        color: '#10b981',
        actions: ['detail', 'has_feedback', 'reorder']
    },
    CANCELED: {
        label: 'Đã hủy',
        icon: 'fa-times-circle',
        color: '#6b7280',
        actions: ['detail', 'reorder']
    }
};

let allOrders = [];
let filteredOrders = [];
let currentStatus = 'ALL';
let currentPage = 0;
const pageSize = PAGE_SIZE;
let totalPages = 0;
let hasMore = true;
let searchTerm = '';

document.addEventListener("DOMContentLoaded", async () => {
    try {
        if (typeof toggleLoading === 'function') toggleLoading(true);

        if (typeof loadNavbar === 'function') {
            await loadNavbar();
        }

        await loadOrders();
        setupSearch();
        setupInfiniteScroll();

        document.getElementById('loadPage').style.display = 'none';
        document.getElementById('info').style.display = 'block';

        // Tự động mở chi tiết đơn hàng nếu có orderId trên URL
        const orderIdUrl = new URLSearchParams(window.location.search).get("orderId");
        if (orderIdUrl) {
            try {
                if (typeof toggleLoading === 'function') toggleLoading(true);
                const response = await callAPI(`/orders/${orderIdUrl}`, 'GET');
                if (response.success && response.data) {
                    showOrderDetailModal(response.data, 0); 
                }
            } catch (err) {
                console.error("Lỗi tự động tải đơn hàng:", err);
            } finally {
                if (typeof toggleLoading === 'function') toggleLoading(false);
            }
        }

    } catch (error) {
        console.error(error);
        showNotification('Có lỗi xảy ra khi tải trang', 'error');
    } finally {
        if (typeof toggleLoading === 'function') toggleLoading(false);
    }
});

async function loadOrders(append = false) {
    try {
        let apiUrl = `/orders?page=${currentPage}&size=${pageSize}`;
        if (searchTerm) {
            apiUrl += `&searchInput=${encodeURIComponent(searchTerm)}`;
        }

        const response = await callAPI(apiUrl);

        if (response.success && response.data) {
            const newOrders = response.data.listData || [];
            hasMore = response.data.hasMore || false;
            totalPages = response.data.totalPages || 0;

            if (append) {
                allOrders = [...allOrders, ...newOrders.map(o => ({
                    ...o,
                    orderStatus: STATUS_MAP[o.orderStatus] || o.orderStatus
                }))];
            } else {
                allOrders = newOrders.map(o => ({
                    ...o,
                    orderStatus: STATUS_MAP[o.orderStatus] || o.orderStatus
                }));
            }

            applyStatusFilter();
            renderOrders();
        } else {
            if (!append) {
                showNotification(response.message || 'Không thể tải danh sách đơn hàng', 'error');
                showEmptyState();
            }
        }
    } catch (error) {
        console.error('Lỗi load orders:', error);
        if (!append) {
            showNotification('Có lỗi xảy ra khi tải đơn hàng', 'error');
            showEmptyState();
        }
    }
}

function setupInfiniteScroll() {
    window.addEventListener('scroll', async () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = document.documentElement.clientHeight;

        if (scrollTop + clientHeight >= scrollHeight - 200 && hasMore) {
            currentPage++;
            await loadOrders(true);
        }
    });
}

function applyStatusFilter() {
    if (!currentStatus || currentStatus === 'ALL') {
        filteredOrders = [...allOrders];
        return;
    }

    if (currentStatus === 'WAITING') {
        filteredOrders = allOrders.filter(order =>
            order.orderStatus === 'WAITING' || order.orderStatus === 'PAYING'
        );
    } else {
        filteredOrders = allOrders.filter(order =>
            order.orderStatus === currentStatus
        );
    }
}

window.filterByStatus = async (status) => {
    currentStatus = status;
    currentPage = 0;
    allOrders = [];
    hasMore = true;

    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.status === status);
    });

    await loadOrders(false);
};



function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');

    if (searchBtn && searchInput) {
        searchBtn.addEventListener('click', async () => {
            const val = searchInput.value.trim();
            if (searchTerm !== val) {
                searchTerm = val;
                currentPage = 0;
                allOrders = [];
                hasMore = true;
                await loadOrders(false);
            }
        });
    }
}

function renderOrders() {
    const container = document.getElementById('orderList');
    const emptyState = document.getElementById('emptyState');

    if (filteredOrders.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    container.innerHTML = filteredOrders.map((order, index) => {
        const statusConfig = STATUS_CONFIG[order.orderStatus] || STATUS_CONFIG.WAITING;
        const totalAmount = calculateOrderTotal(order);
        // Tạo orderId giả nếu không có (dùng index)
        const displayOrderId = order.orderId || `#${String(index + 1).padStart(6, '0')}`;

        return `
            <div class="order-card" data-order-index="${index}">
                <div class="order-card-header">
                    <div class="order-id" onclick="copyToClipboard('${order.orderId}', this)" title="Click to copy" style="cursor: pointer;">
                        <i class="fas fa-hashtag"></i>
                        ${escapeHtml(displayOrderId)}
                        <span style="font-size: 12px; color: #6b7280; margin-left: 10px;">
                            ${convertToVNTime(order.createdAt)}
                        </span>
                    </div>
                    <div class="order-status status-${order.orderStatus}">
                        <i class="fas ${statusConfig.icon}"></i>
                        ${statusConfig.label}
                    </div>
                </div>
                <!-- Hiển thị phương thức thanh toán ngay trên card để dễ nhận biết -->
                <div style="padding: 0 20px; font-size: 13px; color: var(--text-gray); margin-bottom: 10px;">
                    <i class="fas ${order.paymentMethod === 'VN_PAY' ? 'fa-credit-card' : 'fa-money-bill-wave'}"></i>
                    ${order.paymentMethod === 'VN_PAY' ? 'VNPay' : 'Thanh toán khi nhận hàng (COD)'}
                </div>

                <div class="order-card-body">
                    <div class="order-items">
                        ${renderOrderItems(order.orderItemDTOList)}
                    </div>
                </div>

                <div class="order-card-footer">
                    <div class="order-total">
                        <div class="total-label">Tổng tiền</div>
                        <div class="total-amount">${formatter.format(totalAmount)}</div>
                    </div>
                    <div class="order-actions">
                        ${renderOrderActions(index, statusConfig, order)}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Render order items (max 3 items shown)
 */
function renderOrderItems(items) {
    if (!items || items.length === 0) return '<p>Không có sản phẩm</p>';

    const maxShow = 3;
    const itemsToShow = items.slice(0, maxShow);
    const remaining = items.length - maxShow;

    let html = itemsToShow.map(item => {
        // Ghép attributeValues thành chuỗi variant name
        const variantName = item.attributeValues && item.attributeValues.length > 0
            ? item.attributeValues.join(' - ')
            : 'Mặc định';

        return `
            <div class="order-item">
                <img src="${item.imageUrl}" 
                     alt="${escapeHtml(item.productName)}" 
                     class="item-image">
                <div class="item-info">
                    <div class="item-name">${escapeHtml(item.productName)}</div>
                    <div class="item-variant">Phân loại: ${escapeHtml(variantName)}</div>
                    <div class="item-price-qty">
                        <span class="item-price">${formatter.format(item.price)}</span>
                        ${item.originalPrice > item.price ? `
                            <span style="text-decoration: line-through; color: #9ca3af; font-size: 12px; margin-left: 8px;">
                                ${formatter.format(item.originalPrice)}
                            </span>
                        ` : ''}
                        <span class="item-qty">x${item.quantity}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    if (remaining > 0) {
        html += `<div style="text-align: center; color: var(--text-gray); font-size: 14px; padding: 10px;">
            <i class="fas fa-ellipsis-h"></i> và ${remaining} sản phẩm khác
        </div>`;
    }

    return html;
}

/**
 * Render action buttons based on order status
 */
function renderOrderActions(orderIndex, statusConfig, orderFromList) {
    const actions = statusConfig.actions || ['detail'];
    let html = '';

    const order = orderFromList || filteredOrders[orderIndex];
    if (!order) return html;

    // 1. Detail button
    if (actions.includes('detail')) {
        html += `
            <button class="btn-action btn-detail" onclick="viewOrderDetail(${orderIndex})">
                <i class="fas fa-eye"></i> Chi tiết
            </button>
        `;
    }

    // 2. Pay button - chỉ hiển thị cho VNPay ở WAITING/PAYING
    const isVNPay = order.paymentMethod === PAYMENT_METHOD.VNPAY;
    if ((order.orderStatus === 'WAITING' || order.orderStatus === 'PAYING') && isVNPay) {
        html += `
            <button class="btn-action btn-pay" onclick="payOrder('${order.orderId}')" style="background-color: #ee4d2d; color: white; border: none;">
                <i class="fas fa-credit-card"></i> Thanh toán
            </button>
        `;
    }

    // 3. Cancel button - chỉ WAITING và PAYING mới được hủy
    if (actions.includes('cancel')) {
        html += `
            <button class="btn-action btn-cancel" onclick="cancelOrder('${order.orderId}')">
                <i class="fas fa-times"></i> Hủy đơn
            </button>
        `;
    }

    // 4. Confirm Received button - DELIVERED → COMPLETED
    if (actions.includes('confirm')) {
        html += `
            <button class="btn-action btn-confirm" onclick="confirmOrderReceived('${order.orderId}')" 
            style="
            background-color: #10b981; 
            color: white; 
            border: none;">
                <i class="fas fa-check"></i> Đã nhận hàng
            </button>
        `;
    }

    // 5. Feedback button - COMPLETED
    if (actions.includes('feedback')) {
        html += `
            <button class="btn-action btn-feedback" onclick="giveFeedback('${order.orderId}')">
                <i class="fas fa-star"></i> Đánh giá
            </button>
        `;
    }

    // 6. Evaluated button - HAS_FEEDBACK
    if (actions.includes('has_feedback')) {
        html += `
            <button class="btn-action" onclick="viewOrderDetail(${orderIndex})" style="background:#8b5cf6; color:white; border:none;">
                <i class="fas fa-eye"></i> Xem đánh giá
            </button>
        `;
    }

    return html;
}

/**
 * Handle VNPay payment redirect
 */
window.payOrder = async (orderId) => {
    if (!orderId) {
        showNotification('Không tìm thấy mã đơn hàng', 'error');
        return;
    }

    try {
        if (typeof toggleLoading === 'function') toggleLoading(true);
        const response = await callAPI(`/payment/vn-pay/${orderId}`, 'GET');

        if (response.success && (response.data?.paymentUrl || response.data)) {
            window.location.href = response.data.paymentUrl || response.data;
        } else {
            showNotification(response.message || 'Không thể lấy liên kết thanh toán', 'error');
        }
    } catch (error) {
        console.error('Lỗi thanh toán VNPay:', error);
        showNotification('Có lỗi xảy ra khi kết nối thanh toán', 'error');
    } finally {
        if (typeof toggleLoading === 'function') toggleLoading(false);
    }
};

/**
 * Calculate order total
 */
function calculateOrderTotal(order) {
    if (!order.orderItemDTOList) return 0;
    return order.orderItemDTOList.reduce((sum, item) => {
        return sum + (item.price * item.quantity);
    }, 0);
}

/**
 * View order detail in modal
 */
window.viewOrderDetail = async (orderIndex) => {
    const order = filteredOrders[orderIndex];
    if (!order || !order.orderId) {
        showNotification('Không tìm thấy đơn hàng', 'error');
        return;
    }
    const newUrl = new URL(window.location);
    newUrl.searchParams.set('orderId',order.orderId);
    window.history.pushState({}, '', newUrl);

    // Lấy thông tin chi tiết của đơn (như địa chỉ, admin ghi chú, ...)
    try {
        if (typeof toggleLoading === 'function') toggleLoading(true);
        const response = await callAPI(`/orders/${order.orderId}`, 'GET');
        if (response.success && response.data) {
            const detailOrder = {
                ...order,
                ...response.data,
                orderStatus: STATUS_MAP[response.data.orderStatus] || response.data.orderStatus,
                orderId: order.orderId
            };
            showOrderDetailModal(detailOrder, orderIndex);
        } else {
            showOrderDetailModal(order, orderIndex);
        }
    } catch (error) {
        console.error('Lỗi load chi tiết đơn hàng:', error);
        showOrderDetailModal(order, orderIndex);
    } finally {
        if (typeof toggleLoading === 'function') toggleLoading(false);
    }
};

/**
 * Show order detail modal
 */
async function showOrderDetailModal(order, orderIndex) {
    const modal = document.getElementById('orderDetailModal');
    const modalBody = document.getElementById('modalBody');

    const statusConfig = STATUS_CONFIG[order.orderStatus] || STATUS_CONFIG.WAITING;
    const totalAmount = calculateOrderTotal(order);
    const displayOrderId = order.orderId || `#${String(orderIndex + 1).padStart(6, '0')}`;

    // WAITING và PAYING đều có thể hủy và thanh toán (VNPay)
    const canCancel = (order.orderStatus === 'WAITING');
    const canPay = (order.orderStatus === 'WAITING' || order.orderStatus === 'PAYING') && order.paymentMethod === PAYMENT_METHOD.VNPAY;
    const canConfirm = order.orderStatus === 'DELIVERED';
    const canFeedback = order.orderStatus === 'COMPLETED';
    const hasFeedback = order.orderStatus === 'HAS_FEEDBACK';
    const canReorder = false;

    modalBody.innerHTML = `
        <div class="detail-section">
            <h3><i class="fas fa-info-circle"></i> Thông tin đơn hàng</h3>
            <div class="detail-info">
                <div class="info-item">
                    <span class="info-label">Mã đơn hàng</span>
                    <span class="info-value order-id" onclick="copyToClipboard('${order.orderId}', this)" title="Click to copy" style="cursor: pointer;">
                        ${escapeHtml(displayOrderId)} <i class="fas fa-copy" style="font-size: 12px; margin-left: 5px; color: var(--primary-green);"></i>
                    </span>
                </div>
                <div class="info-item">
                    <span class="info-label">Trạng thái</span>
                    <span class="info-value">
                        <span class="order-status status-${order.orderStatus}">
                            <i class="fas ${statusConfig.icon}"></i>
                            ${statusConfig.label}
                        </span>
                    </span>
                </div>
                <div class="info-item">
                    <span class="info-label">Ngày đặt</span>
                    <span class="info-value">${convertToVNTime(order.createdAt)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Ngày thanh toán</span>
                    <span class="info-value">${convertToVNTime(order.paymentAt)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Phương thức thanh toán</span>
                    <span class="info-value">
                        ${order.paymentMethod === 'VN_PAY'
        ? '<i class="fas fa-credit-card"></i> VNPay'
        : '<i class="fas fa-money-bill-wave"></i> Thanh toán khi nhận hàng (COD)'}
                    </span>
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h3><i class="fas fa-map-marker-alt"></i> Địa chỉ nhận hàng</h3>
            <div class="detail-info">
                <div class="info-item">
                    <span class="info-label">Người nhận</span>
                    <span class="info-value">${escapeHtml(order.contactName || 'N/A')}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Số điện thoại</span>
                    <span class="info-value">${escapeHtml(order.phone || 'N/A')}</span>
                </div>
                <div class="info-item" style="grid-column: 1 / -1;">
                    <span class="info-label">Địa chỉ</span>
                    <span class="info-value">${escapeHtml(order.address || 'N/A')}</span>
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h3><i class="fas fa-box"></i> Sản phẩm (${order.orderItemDTOList?.length || 0} sản phẩm)</h3>
            <div class="order-items">
                ${renderAllOrderItems(order.orderItemDTOList)}
            </div>
        </div>

        <div class="detail-section">
            <h3><i class="fas fa-receipt"></i> Chi tiết thanh toán</h3>
            <div class="detail-info">
                <div class="info-item">
                    <span class="info-label">Tạm tính</span>
                    <span class="info-value">${formatter.format(totalAmount)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Phí vận chuyển</span>
                    <span class="info-value" style="color: var(--primary-green);">Miễn phí</span>
                </div>
                <div class="info-item" style="grid-column: 1 / -1; border-top: 2px solid var(--light-green); padding-top: 15px; margin-top: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span class="info-label" style="font-size: 16px; font-weight: 600;">Tổng cộng</span>
                        <span class="info-value" style="font-size: 24px; color: var(--primary-green); font-weight: 700;">
                            ${formatter.format(totalAmount)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
        
        ${hasFeedback ? 
        '<div class="detail-section" id="reviewSectionContainer" style="display: none;">\n' +
        '            <h3><i class="fas fa-star"></i> Đánh giá của khách hàng</h3>\n' +
        '            <div id="modalUserReviewList" class="order-items"\n' +
        '                 style="padding: 15px; background: #fff; border-radius: 8px; border: 1px solid #eee;">\n' +
        '                <p style="color: #666; text-align:center; padding: 10px;">Đang tải đánh giá...</p>\n' +
        '            </div>\n' +
        '        </div> '
        : ""}
    `;


    if (canCancel || canPay || canConfirm || canFeedback || canReorder || hasFeedback) {
        modalBody.innerHTML += `<div class="modal-actions" style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap;"></div>`;
        const actionContainer = modalBody.querySelector('.modal-actions');

        if (canCancel) {
            actionContainer.innerHTML += `
                <button class="btn-action btn-cancel" onclick="cancelOrder('${order.orderId}')" style="padding: 12px 24px; border-radius: 4px; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-times"></i> HỦY ĐƠN HÀNG
                </button>
            `;
        }

        if (canPay) {
            actionContainer.innerHTML += `
                <button class="btn-action btn-pay" onclick="payOrder('${order.orderId}')" style="background-color: #ee4d2d; color: white; border: none; padding: 12px 24px; border-radius: 4px; cursor: pointer; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <i class="fas fa-credit-card"></i> THANH TOÁN QUA VNPAY
                </button>
            `;
        }

        if (canConfirm) {
            actionContainer.innerHTML += `
                <button class="btn-action btn-confirm" onclick="confirmOrderReceived('${order.orderId}')" 
                style="
                background-color: #10b981; 
                color: white; border: none; 
                padding: 12px 24px; 
                border-radius: 4px; 
                cursor: pointer; 
                font-weight: 600; 
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                display: block;">
                    <i class="fas fa-check"></i> ĐÃ NHẬN HÀNG
                </button>
            `;
        }

        if (canFeedback) {
            actionContainer.innerHTML += `
                <button class="btn-action btn-feedback" onclick="giveFeedback('${order.orderId}')" style="padding: 12px 24px; border-radius: 4px; cursor: pointer; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <i class="fas fa-star"></i> ĐÁNH GIÁ
                </button>
            `;
        } else if (hasFeedback) {
            actionContainer.innerHTML += `
                <button class="btn-action" onclick="toggleOrderReview('${order.orderId}')" style="padding: 12px 24px; border-radius: 4px; cursor: pointer; font-weight: 600; background-color: #8b5cf6; color: white; border: none; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <i class="fas fa-eye"></i> XEM ĐÁNH GIÁ
                </button>
            `;
        }


    }

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Ngăn cuộn nền để giảm giật lag
}

window.toggleOrderReview = async (orderId) => {
    const container = document.getElementById('reviewSectionContainer');
    if (!container) return;
    
    if (container.style.display === 'none') {
        container.style.display = 'block';
        await fetchOrderReviewsUser(orderId);
    } else {
        container.style.display = 'none';
    }
};

let currentOrderReviews = [];

async function fetchOrderReviewsUser(orderId) {
    const listContainer = document.getElementById("modalUserReviewList");
    if (!listContainer) return;
    
    listContainer.innerHTML = '<p style="color: #666; text-align:center; padding: 10px;">Đang tải đánh giá...</p>';
    
    try {
        const res = await callAPI(`/feedbacks/orders/${orderId}`, "GET");
        if (res.success && res.data && res.data.length > 0) {
            currentOrderReviews = res.data;
            renderOrderReviewsUser(res.data, orderId);
        } else {
            currentOrderReviews = [];
            listContainer.innerHTML = '<p style="color: #888; text-align:center; padding: 10px;">Chưa có đánh giá nào cho đơn hàng này.</p>';
        }
    } catch (e) {
        currentOrderReviews = [];
        listContainer.innerHTML = '<p style="color: red; text-align:center; padding: 10px;">Lỗi tải đánh giá.</p>';
    }
}

function renderOrderReviewsUser(reviews, orderId) {
    const container = document.getElementById("modalUserReviewList");
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
                        <span>${escapeHtml(review.reply.username)} <span class="admin-badge">${review.reply.roleName}</span></span>
                        <span style="font-size:11px;color:#888;font-weight:normal">${replyDate}</span>
                    </div>
                    <div class="review-reply-content">${escapeHtml(review.reply.message)}</div>
                </div>
            `;
        }
        
        html += `
            <div class="review-item" id="review-item-${review.feedbackId}">
                <!-- display mode -->
                <div class="review-display" id="review-display-${review.feedbackId}">
                    <div class="review-header">
                        <div class="review-user-info">
                            <img src="${avatar}" class="review-avatar">
                            <div class="review-meta">
                                <span class="review-username">${escapeHtml(review.username)}</span>
                                <span class="review-date">${date}</span>
                            </div>
                        </div>
                        <button class="btn-edit-review" onclick="editUserReview('${review.feedbackId}', '${orderId}')" title="Sửa đánh giá">
                            <i class="fa-solid fa-pen"></i> Sửa
                        </button>
                    </div>
                    <div class="review-stars">${starsHtml}</div>
                    <div class="review-content">${escapeHtml(review.comment || '')}</div>
                    ${replyHtml}
                </div>
                
                <!-- edit mode -->
                <div class="review-edit" id="review-edit-${review.feedbackId}" style="display: none; padding-top: 10px;">
                    <div style="margin-bottom: 10px; display: flex; gap: 5px; color: #f59e0b; cursor: pointer;" id="edit-stars-${review.feedbackId}">
                    </div>
                    <textarea id="edit-comment-${review.feedbackId}" rows="3" style="width: 100%; border: 1px solid #ddd; border-radius: 4px; padding: 8px; font-family: inherit; font-size: 14px; resize: vertical;" placeholder="Nhập nhận xét của bạn..."></textarea>
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button type="button" onclick="cancelEditReview('${review.feedbackId}')" style="background: transparent; border: 1px solid #ccc; color: #666;">Hủy</button>
                        <button type="button" onclick="saveEditReview('${review.feedbackId}', '${orderId}')">Lưu</button>
                    </div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}
window.editUserReview = (feedbackId, orderId) => {
    const review = currentOrderReviews.find(r => r.feedbackId === feedbackId);
    if (!review) return;
    
    document.getElementById(`review-display-${feedbackId}`).style.display = 'none';
    const editForm = document.getElementById(`review-edit-${feedbackId}`);
    editForm.style.display = 'block';
    
    document.getElementById(`edit-comment-${feedbackId}`).value = review.comment || '';
    
    renderEditStars(feedbackId, review.rating);
    editForm.dataset.rating = review.rating;
};

window.cancelEditReview = (feedbackId) => {
    document.getElementById(`review-display-${feedbackId}`).style.display = 'block';
    document.getElementById(`review-edit-${feedbackId}`).style.display = 'none';
};

window.renderEditStars = (feedbackId, rating) => {
    const container = document.getElementById(`edit-stars-${feedbackId}`);
    let html = '';
    for (let i = 1; i <= 5; i++) {
        const starClass = i <= rating ? 'fa-solid' : 'fa-regular';
        html += `<i class="${starClass} fa-star" onclick="setEditStar('${feedbackId}', ${i})" style="font-size: 16px;"></i>`;
    }
    container.innerHTML = html;
};

window.setEditStar = (feedbackId, rating) => {
    const editForm = document.getElementById(`review-edit-${feedbackId}`);
    editForm.dataset.rating = rating;
    renderEditStars(feedbackId, rating);
};

window.saveEditReview = async (feedbackId, orderId) => {
    const editForm = document.getElementById(`review-edit-${feedbackId}`);
    const rating = parseInt(editForm.dataset.rating) || 5;
    const comment = document.getElementById(`edit-comment-${feedbackId}`).value.trim();
    
    try {
        if (typeof toggleLoading === 'function') toggleLoading(true);
        const res = await callAPI(`/feedbacks/${feedbackId}`, "PATCH", { rating, comment });
        if (res.success) {
            showNotification("Cập nhật đánh giá thành công", "success");
            await fetchOrderReviewsUser(orderId);
        } else {
            showNotification(res.message || "Không thể cập nhật đánh giá", "error");
        }
    } catch (e) {
        console.error(e);
        showNotification("Có lỗi xảy ra", "error");
    } finally {
        if (typeof toggleLoading === 'function') toggleLoading(false);
    }
};

window.copyToClipboard = async (text, element) => {
    try {
        await navigator.clipboard.writeText(text);
        
        // Visual feedback
        const icon = element.querySelector('i');
        if (icon) {
            const originalClass = icon.className;
            const originalColor = icon.style.color;
            
            icon.className = 'fas fa-check';
            icon.style.color = '#10b981'; // Success green
            
            setTimeout(() => {
                icon.className = originalClass;
                icon.style.color = originalColor;
            }, 1500);
        }
        
        showNotification('Đã copy mã đơn hàng', 'success');
    } catch (err) {
        showNotification('Lỗi khi copy mã đơn hàng', 'error');
    }
};

/**
 * Render all order items (for modal detail)
 */
function renderAllOrderItems(items) {
    if (!items || items.length === 0) return '<p>Không có sản phẩm</p>';

    return items.map(item => {
        const variantName = item.attributeValues && item.attributeValues.length > 0
            ? item.attributeValues.join(' - ')
            : 'Mặc định';

        return `
            <div class="order-item">
                <img src="${item.imageUrl}" 
                     alt="${escapeHtml(item.productName)}" 
                     class="item-image">
                <div class="item-info">
                    <div class="item-name">${escapeHtml(item.productName)}</div>
                    <div class="item-variant">Phân loại: ${escapeHtml(variantName)}</div>
                    <div class="item-price-qty">
                        <span class="item-price">${formatter.format(item.price)}</span>
                        ${item.originalPrice > item.price ? `
                            <span style="text-decoration: line-through; color: #9ca3af; font-size: 12px; margin-left: 8px;">
                                ${formatter.format(item.originalPrice)}
                            </span>
                        ` : ''}
                        <span class="item-qty">x${item.quantity}</span>
                    </div>
                </div>
                <div style="text-align: right; font-weight: 600; color: var(--primary-green);">
                    ${formatter.format(item.price * item.quantity)}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Close modal
 */
window.closeModal = () => {
    document.getElementById('orderDetailModal').style.display = 'none';
    document.body.style.overflow = ''; // Phục hồi cuộn nền
    const url = new URL(window.location);

    url.searchParams.delete('orderId');

    window.history.replaceState({}, '', url);
};

// Close modal when clicking outside
window.addEventListener('click', (e) => {
    const modal = document.getElementById('orderDetailModal');
    if (e.target === modal) {
        closeModal();
    }
});

/**
 * Cancel order
 */
window.cancelOrder = async (orderId) => {
    if (!orderId) {
        showNotification('Không tìm thấy đơn hàng', 'error');
        return;
    }

    await showDialog("question", "Bạn có chắc là muốn huỷ đơn hàng này?",
        async () => {
            try {
                if (typeof toggleLoading === 'function') toggleLoading(true);

                // Sử dụng PATCH /orders/{orderId} theo yêu cầu mới
                const response = await callAPI(`/orders/${orderId}`, 'PATCH', 'CANCELED');

                if (response.success) {
                    showNotification('Hủy đơn hàng thành công', 'success');
                    // Đóng modal nếu đang mở
                    closeModal();
                    // Reload từ page 0 để đảm bảo data consistency
                    currentPage = 0;
                    allOrders = [];
                    hasMore = true;
                    await loadOrders(false);
                } else {
                    showNotification(response.message || 'Không thể hủy đơn hàng', 'error');
                }
            } catch (error) {
                console.error('Lỗi hủy đơn:', error);
                showNotification('Có lỗi xảy ra', 'error');
            } finally {
                if (typeof toggleLoading === 'function') toggleLoading(false);
            }
        });

};

/**
 * Show empty state
 */
function showEmptyState() {
    document.getElementById('orderList').innerHTML = '';
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('pagination').style.display = 'none';
}

/**
 * Show notification
 */
function showNotification(message, type = 'success') {
    const noti = document.getElementById('notification');
    noti.textContent = message;
    noti.className = `notification ${type} show`;

    setTimeout(() => {
        noti.classList.remove('show');
        setTimeout(() => {
            noti.classList.add('hidden');
        }, 300);
    }, 3000);
}

/**
 * Escape HTML
 */
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Confirm Order Received
 */
/**
 * Confirm Order Received
 */
window.confirmOrderReceived = async (orderId) => {
    if (!orderId) return;

    await showDialog("question", "Xác nhận đã nhận được hàng?",
        async () => {
            try {
                if (typeof toggleLoading === 'function') toggleLoading(true);
                const response = await callAPI(`/orders/${orderId}`, 'PATCH', 'COMPLETED');

                if (response.success) {
                    showNotification('Đã xác nhận nhận hàng thành công!', 'success');
                    // Đóng modal
                    closeModal();
                    // Reload từ page 0 để đảm bảo data consistency
                    currentPage = 0;
                    allOrders = [];
                    hasMore = true;
                    await loadOrders(false);
                } else {
                    showNotification(response.message || 'Lỗi khi xác nhận', 'error');
                }
            } catch (e) {
                console.error("Lỗi confirm:", e);
                showNotification("Lỗi kết nối", 'error');
            } finally {
                if (typeof toggleLoading === 'function') toggleLoading(false);
            }
        });
};

/**
 * Give Feedback
 */
window.giveFeedback = (orderId) => {
    if (!orderId) return;
    window.location.href = `/feedback/?orderId=${orderId}`;
};