import { callAPI } from '../lib/api.js';
import { toggleLoading } from '../lib/loader.js';
import { loadNavbar } from '../navbar/navbar.js';

// Constants
const formatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

const STATUS_MAP = {
    0: 'WAITING',
    1: 'PAYING',
    2: 'PENDING',
    3: 'CONFIRMED',
    4: 'CANCELED',
    5: 'DELIVERING',
    6: 'DELIVERED',
    7: 'COMPLETED',
    'WAITING': 'WAITING',
    'PAYING': 'PAYING',
    'PENDING': 'PENDING',
    'CONFIRMED': 'CONFIRMED',
    'CANCELED': 'CANCELED',
    'DELIVERING': 'DELIVERING',
    'DELIVERED': 'DELIVERED',
    'COMPLETED': 'COMPLETED'
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
        actions: ['detail']
    },
    PENDING: {
        label: 'Đang xử lý',
        icon: 'fa-hourglass-half',
        color: '#3b82f6',
        actions: ['detail']
    },
    CONFIRMED: {
        label: 'Đã xác nhận',
        icon: 'fa-clipboard-check',
        color: '#10b981',
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
    CANCELED: {
        label: 'Đã hủy',
        icon: 'fa-times-circle',
        color: '#6b7280',
        actions: ['detail', 'reorder']
    }
};

// State
let allOrders = [];
let filteredOrders = [];
let currentStatus = 'ALL';
let currentPage = 0;
const pageSize = 10;
let totalPages = 0;
let hasMore = true;

// Initialize
document.addEventListener("DOMContentLoaded", async () => {
    try {
        if (typeof toggleLoading === 'function') toggleLoading(true);

        // Load navbar
        if (typeof loadNavbar === 'function') {
            await loadNavbar();
        }

        // Load orders
        await loadOrders();

        // Setup search
        setupSearch();

        // Setup infinite scroll
        setupInfiniteScroll();

        // Hide loading
        document.getElementById('loadPage').style.display = 'none';
        document.getElementById('info').style.display = 'block';

    } catch (error) {
        console.error('Lỗi khởi tạo trang:', error);
        showNotification('Có lỗi xảy ra khi tải trang', 'error');
    } finally {
        if (typeof toggleLoading === 'function') toggleLoading(false);
    }
});

/**
 * Load orders from API with pagination
 */
async function loadOrders(append = false) {
    try {
        const response = await callAPI(`/orders?page=${currentPage}&size=${pageSize}`, 'GET');

        if (response.success && response.data) {
            const newOrders = response.data.listData || [];
            hasMore = response.data.hasMore || false;
            totalPages = response.data.totalPages || 0;

            if (append) {
                // Thêm vào danh sách hiện tại (infinite scroll)
                allOrders = [...allOrders, ...newOrders.map(o => ({
                    ...o,
                    orderStatus: STATUS_MAP[o.orderStatus] || o.orderStatus
                }))];
            } else {
                // Reset danh sách (load mới)
                allOrders = newOrders.map(o => ({
                    ...o,
                    orderStatus: STATUS_MAP[o.orderStatus] || o.orderStatus
                }));
            }

            filterByStatus(currentStatus);
            updatePagination();
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

/**
 * Setup infinite scroll
 */
function setupInfiniteScroll() {
    let isLoading = false;

    window.addEventListener('scroll', async () => {
        if (isLoading || !hasMore) return;

        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = document.documentElement.clientHeight;

        // Khi scroll gần đến đáy (còn 300px)
        if (scrollTop + clientHeight >= scrollHeight - 300) {
            isLoading = true;
            currentPage++;
            await loadOrders(true); // append = true
            isLoading = false;
        }
    });
}

/**
 * Filter orders by status
 */
window.filterByStatus = (status) => {
    currentStatus = status;

    // Update active tab
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.status === status) {
            btn.classList.add('active');
        }
    });

    // Filter orders
    if (status === 'ALL') {
        filteredOrders = [...allOrders];
    } else if (status === 'WAITING') {
        // Tab WAITING bao gồm cả WAITING (#0) và PAYING (#1)
        filteredOrders = allOrders.filter(order => order.orderStatus === 'WAITING' || order.orderStatus === 'PAYING');
    } else {
        filteredOrders = allOrders.filter(order => order.orderStatus === status);
    }

    // Apply search filter if exists
    const searchTerm = document.getElementById('searchInput').value.trim();
    if (searchTerm) {
        applySearchFilter(searchTerm);
    }

    renderOrders();
};

/**
 * Setup search functionality
 */
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    let searchTimeout;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            applySearchFilter(e.target.value.trim());
        }, 300);
    });
}

/**
 * Apply search filter
 */
function applySearchFilter(searchTerm) {
    if (!searchTerm) {
        filterByStatus(currentStatus);
        return;
    }

    const term = searchTerm.toLowerCase();
    filteredOrders = filteredOrders.filter(order => {
        // Search in order ID (nếu có)
        if (order.orderId && order.orderId.toLowerCase().includes(term)) return true;

        // Search in contact name
        if (order.contactName && order.contactName.toLowerCase().includes(term)) return true;

        // Search in product names
        if (order.orderItemDTOList) {
            return order.orderItemDTOList.some(item =>
                item.productName?.toLowerCase().includes(term)
            );
        }

        return false;
    });

    renderOrders();
}

/**
 * Render orders list
 */
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
                    <div class="order-id">
                        <i class="fas fa-hashtag"></i>
                        ${escapeHtml(displayOrderId)}
                        <span style="font-size: 12px; color: #6b7280; margin-left: 10px;">
                            ${formatDate(order.createdAt)}
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

    // 1. Detail (Always first)
    if (actions.includes('detail')) {
        html += `
            <button class="btn-action btn-detail" onclick="viewOrderDetail(${orderIndex})">
                <i class="fas fa-eye"></i> Chi tiết
            </button>
        `;
    }

    // 2. Pay (VNPay WAITING)
    // Note: defined in STATUS_CONFIG for WAITING, but we double check payment method if needed?
    // Actually, let's trust STATUS_CONFIG. But for VNPay, we might want to ensure it's actually PAYABLE.
    // User instruction: "WAITING thì được phép hủy".
    // "PAYING" logic is tricky. Let's assume if it is WAITING/PAYING and is VN_PAY, we show Pay button.
    const isVNPay = String(order.paymentMethod).toUpperCase() === 'VN_PAY';
    if ((order.orderStatus === 'WAITING' || order.orderStatus === 'PAYING') && isVNPay) {
        // Only show if not already showing via STATUS_CONFIG?
        // Let's add it explicitly if it matches conditions, to be safe.
        html += `
            <button class="btn-action btn-pay" onclick="payOrder(${orderIndex})" style="background-color: #ee4d2d; color: white; border: none;">
                <i class="fas fa-credit-card"></i> Thanh toán
            </button>
        `;
    }

    // 3. Cancel (Strictly WAITING)
    if (actions.includes('cancel')) {
        html += `
            <button class="btn-action btn-cancel" onclick="cancelOrder(${orderIndex})">
                <i class="fas fa-times"></i> Hủy đơn
            </button>
        `;
    }

    // 4. Confirm Received (DELIVERED)
    if (actions.includes('confirm')) {
        html += `
            <button class="btn-action btn-confirm" onclick="confirmOrderReceived(${orderIndex})" style="background-color: #10b981; color: white; border: none;">
                <i class="fas fa-check"></i> Đã nhận hàng
            </button>
        `;
    }

    // 5. Feedback (CONFIRMED)
    if (actions.includes('feedback')) {
        html += `
            <button class="btn-action btn-feedback" onclick="giveFeedback(${orderIndex})" style="background-color: #f59e0b; color: white; border: none;">
                <i class="fas fa-star"></i> Đánh giá
            </button>
        `;
    }

    // 6. Reorder
    if (actions.includes('reorder')) {
        html += `
            <button class="btn-action btn-reorder" onclick="reorder(${orderIndex})">
                <i class="fas fa-redo"></i> Mua lại
            </button>
        `;
    }

    return html;
}

/**
 * Handle VNPay payment redirect
 */
window.payOrder = async (orderIndex) => {
    const order = filteredOrders[orderIndex];
    if (!order || !order.orderId) {
        showNotification('Không tìm thấy mã đơn hàng', 'error');
        return;
    }

    try {
        if (typeof toggleLoading === 'function') toggleLoading(true);
        const response = await callAPI(`/payment/vn-pay/${order.orderId}`, 'GET');
        
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
function showOrderDetailModal(order, orderIndex) {
    const modal = document.getElementById('orderDetailModal');
    const modalBody = document.getElementById('modalBody');

    const statusConfig = STATUS_CONFIG[order.orderStatus] || STATUS_CONFIG.WAITING;
    const totalAmount = calculateOrderTotal(order);
    const displayOrderId = order.orderId || `#${String(orderIndex + 1).padStart(6, '0')}`;

    modalBody.innerHTML = `
        <div class="detail-section">
            <h3><i class="fas fa-info-circle"></i> Thông tin đơn hàng</h3>
            <div class="detail-info">
                <div class="info-item">
                    <span class="info-label">Mã đơn hàng</span>
                    <span class="info-value">${escapeHtml(displayOrderId)}</span>
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
                    <span class="info-value">${formatDate(order.createdAt)}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Ngày thanh toán</span>
                    <span class="info-value">${formatDate(order.paymentAt)}</span>
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
    `;

    // Updated logic: Only WAITING can be canceled
    // Updated logic: Only WAITING can be canceled
    const canCancel = order.orderStatus === 'WAITING';
    const canPay = (order.orderStatus === 'WAITING' || order.orderStatus === 'PAYING') && String(order.paymentMethod).toUpperCase() === 'VN_PAY';
    const canConfirm = order.orderStatus === 'DELIVERED';
    const canFeedback = order.orderStatus === 'COMPLETED';
    const canReorder = ['COMPLETED', 'CANCELED', 'DELIVERED'].includes(order.orderStatus);

    if (canCancel || canPay || canConfirm || canFeedback || canReorder) {
        modalBody.innerHTML += `<div class="modal-actions" style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap;"></div>`;
        const actionContainer = modalBody.querySelector('.modal-actions');

        if (canCancel) {
            actionContainer.innerHTML += `
                <button class="btn-action btn-cancel" onclick="cancelOrder(${orderIndex})" style="padding: 12px 24px; border-radius: 4px; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-times"></i> HỦY ĐƠN HÀNG
                </button>
            `;
        }

        if (canPay) {
            actionContainer.innerHTML += `
                <button class="btn-action btn-pay" onclick="payOrder(${orderIndex})" style="background-color: #ee4d2d; color: white; border: none; padding: 12px 24px; border-radius: 4px; cursor: pointer; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <i class="fas fa-credit-card"></i> THANH TOÁN QUA VNPAY
                </button>
            `;
        }
        
         if (canConfirm) {
            actionContainer.innerHTML += `
                <button class="btn-action btn-confirm" onclick="confirmOrderReceived(${orderIndex})" style="background-color: #10b981; color: white; border: none; padding: 12px 24px; border-radius: 4px; cursor: pointer; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <i class="fas fa-check"></i> ĐÃ NHẬN HÀNG
                </button>
            `;
        }
        
        if (canFeedback) {
            actionContainer.innerHTML += `
                <button class="btn-action btn-feedback" onclick="giveFeedback(${orderIndex})" style="background-color: #f59e0b; color: white; border: none; padding: 12px 24px; border-radius: 4px; cursor: pointer; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <i class="fas fa-star"></i> ĐÁNH GIÁ
                </button>
            `;
        }
        
        if (canReorder) {
             actionContainer.innerHTML += `
                <button class="btn-action btn-reorder" onclick="reorder(${orderIndex})" style="background-color: white; color: #10b981; border: 1px solid #10b981; padding: 12px 24px; border-radius: 4px; cursor: pointer; font-weight: 600;">
                    <i class="fas fa-redo"></i> MUA LẠI
                </button>
            `;
        }
    }

    modal.style.display = 'flex';
}

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
window.cancelOrder = async (orderIndex) => {
    const order = filteredOrders[orderIndex];
    if (!order || !order.orderId) {
        showNotification('Không tìm thấy đơn hàng', 'error');
        return;
    }

    if (!confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) {
        return;
    }

    try {
        if (typeof toggleLoading === 'function') toggleLoading(true);

        // Sử dụng PATCH /orders/{orderId} theo yêu cầu mới
        const response = await callAPI(`/orders/${order.orderId}`, 'PATCH', 'CANCELED');

        if (response.success) {
            showNotification('Hủy đơn hàng thành công', 'success');
            // Reload lại từ đầu
            currentPage = 0;
            await loadOrders();
        } else {
            showNotification(response.message || 'Không thể hủy đơn hàng', 'error');
        }
    } catch (error) {
        console.error('Lỗi hủy đơn:', error);
        showNotification('Có lỗi xảy ra', 'error');
    } finally {
        if (typeof toggleLoading === 'function') toggleLoading(false);
    }
};

/**
 * Reorder - Add items back to cart
 */
window.reorder = async (orderIndex) => {
    const order = filteredOrders[orderIndex];
    if (!order || !order.orderItemDTOList) {
        showNotification('Không tìm thấy thông tin đơn hàng', 'error');
        return;
    }

    if (!confirm(`Thêm ${order.orderItemDTOList.length} sản phẩm vào giỏ hàng?`)) {
        return;
    }

    try {
        if (typeof toggleLoading === 'function') toggleLoading(true);

        let successCount = 0;
        for (const item of order.orderItemDTOList) {
            // Vì API response không có variantId, cần cách khác để thêm vào giỏ
            // Có thể cần tìm variant dựa vào productName + attributeValues
            // Hoặc backend cần cung cấp variantId trong response

            // TẠM THỜI: Thông báo không thể thực hiện
            console.warn('Không có variantId để thêm vào giỏ hàng:', item);
        }

        // Vì không có variantId, tạm thời thông báo
        showNotification('Tính năng mua lại đang được phát triển. Vui lòng thêm sản phẩm từ trang chủ.', 'error');

    } catch (error) {
        console.error('Lỗi reorder:', error);
        showNotification('Có lỗi xảy ra', 'error');
    } finally {
        if (typeof toggleLoading === 'function') toggleLoading(false);
    }
};

/**
 * Pagination - Deprecated (sử dụng infinite scroll)
 */
window.changePage = async (delta) => {
    // Không dùng nữa vì đã chuyển sang infinite scroll
    return;
};

function updatePagination() {
    const pagination = document.getElementById('pagination');
    // Ẩn pagination vì dùng infinite scroll
    pagination.style.display = 'none';
}

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
 * Format date
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dateString;
    }
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
window.confirmOrderReceived = async (orderIndex) => {
    const order = filteredOrders[orderIndex];
    if (!order || !order.orderId) return;

    if (!confirm('Bạn xác nhận đã nhận được hàng và hài lòng với sản phẩm?')) return;

    try {
        if (typeof toggleLoading === 'function') toggleLoading(true);
        const response = await callAPI(`/orders/${order.orderId}`, 'PATCH', 'COMPLETED');

        if (response.success) {
            showNotification('Đã xác nhận nhận hàng thành công!', 'success');
            await loadOrders(); 
        } else {
            showNotification(response.message || 'Lỗi khi xác nhận', 'error');
        }
    } catch (e) {
        console.error("Lỗi confirm:", e);
        showNotification("Lỗi kết nối", 'error');
    } finally {
        if (typeof toggleLoading === 'function') toggleLoading(false);
    }
};

/**
 * Give Feedback
 */
window.giveFeedback = (orderIndex) => {
    const order = filteredOrders[orderIndex];
    if (!order) return;
    window.location.href = `../feedback/index.html?orderId=${order.orderId}`;
};