import { showDialog } from "/dialog/index.js";
import { loadNavbar } from "/navbar/navbar.js";
import { getFeedbackCandidates, submitFeedback } from "/feedback/services.js";

let currentProducts = [];
let selectedProduct = null;
let selectedOrderItemIds = null;
let currentRating = 5; // Default 5 stars

// Initialize
async function init() {
    console.log("feedback/index.js: init() called");

    // Load navbar
    await loadNavbar({ centerHTML: "" });

    // Check URL params for orderId
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId');
    if (orderId) {
        document.getElementById('orderIdInput').value = orderId;
        // Auto search
        setTimeout(() => handleSearch(), 500);
    }

    // Setup event listeners
    setupEvents();

    // Initialize star rating
    initStarRating();
}

function setupEvents() {
    document.getElementById('btnSearch').onclick = handleSearch;
    document.getElementById('btnSubmit').onclick = handleSubmit;
    document.getElementById('btnClear').onclick = handleClear;
}

// Initialize star rating interaction
function initStarRating() {
    const stars = document.querySelectorAll('.star-rating i');

    stars.forEach(star => {
        star.addEventListener('click', () => {
            const rating = parseInt(star.dataset.rating);
            setRating(rating);
        });

        star.addEventListener('mouseenter', () => {
            const rating = parseInt(star.dataset.rating);
            highlightStars(rating);
        });
    });

    // Reset on mouse leave
    document.querySelector('.star-rating').addEventListener('mouseleave', () => {
        highlightStars(currentRating);
    });

    // Set default rating
    setRating(5);
}

function highlightStars(rating) {
    const stars = document.querySelectorAll('.star-rating i');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.remove('fa-regular');
            star.classList.add('fa-solid');
            star.classList.add('active');
        } else {
            star.classList.remove('fa-solid');
            star.classList.add('fa-regular');
            star.classList.remove('active');
        }
    });
}

function setRating(rating) {
    currentRating = rating;
    highlightStars(rating);

    const ratingTexts = [
        '',
        'Rất tệ',
        'Tệ',
        'Bình thường',
        'Tốt',
        'Tuyệt vời'
    ];

    document.getElementById('ratingText').textContent = ratingTexts[rating] || 'Chọn số sao để đánh giá';
}

// Handle search order products
async function handleSearch() {
    const orderIdInput = document.getElementById('orderIdInput');
    const orderId = orderIdInput.value.trim();

    if (!orderId) {
        showDialog('error', 'Vui lòng nhập Order ID!');
        orderIdInput.focus();
        return;
    }

    // Validate UUID format (basic)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
        showDialog('error', 'Order ID không hợp lệ! Định dạng phải là UUID.');
        return;
    }

    // Disable form
    setFormEnabled(false);
    showSearchResult('Đang tìm kiếm...', 'info');

    try {
        const res = await getFeedbackCandidates(orderId);

        if (res.success && res.data) {
            currentProducts = res.data;
            displayProducts(currentProducts);
            showSearchResult(`Tìm thấy ${currentProducts.length} sản phẩm có thể đánh giá!`, 'success');
        } else {
            currentProducts = [];
            displayProducts([]);

            // Check for specific error messages
            if (res.message && res.message.includes('COMPLETED')) {
                showDialog('error',
                    'Không thể đánh giá!\n\n' +
                    'Lý do: Đơn hàng chưa ở trạng thái COMPLETED (Hoàn thành).\n\n' +
                    'Bạn chỉ có thể đánh giá sản phẩm sau khi đơn hàng đã được hoàn thành.\n' +
                    'Vui lòng kiểm tra lại trạng thái đơn hàng của bạn.'
                );
            } else {
                showSearchResult(res.message || 'Không tìm thấy sản phẩm', 'error');
            }
        }
    } catch (error) {
        console.error('Search error:', error);
        showDialog('error', 'Lỗi kết nối server. Vui lòng thử lại sau.');
        currentProducts = [];
        displayProducts([]);
    } finally {
        setFormEnabled(true);
    }
}

function showSearchResult(message, type = 'info') {
    const resultDiv = document.getElementById('searchResult');
    const resultText = document.getElementById('searchResultText');

    resultText.textContent = message;
    resultDiv.style.display = 'flex';

    // Style based on type
    if (type === 'error') {
        resultDiv.style.background = '#fee2e2';
        resultDiv.style.color = '#991b1b';
    } else if (type === 'success') {
        resultDiv.style.background = '#d1fae5';
        resultDiv.style.color = '#065f46';
    } else {
        resultDiv.style.background = '#f9fafb';
        resultDiv.style.color = '#6b7280';
    }
}

// Display products
function displayProducts(products) {
    const container = document.getElementById('productsContainer');
    const section = document.getElementById('productsSection');

    if (!products || products.length === 0) {
        section.style.display = 'none';
        container.innerHTML = '';
        return;
    }

    section.style.display = 'block';
    container.innerHTML = '';

    products.forEach(product => {
        const card = createProductCard(product);
        container.appendChild(card);
    });
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.productId = product.productId;

    // Build variant text
    let variantText = '';
    if (product.variants && product.variants.length > 0) {
        const variantParts = [];
        product.variants.forEach(variant => {
            Object.entries(variant).forEach(([key, value]) => {
                variantParts.push(`${key}: ${value}`);
            });
        });
        variantText = variantParts.join(', ');
    }

    // Image or placeholder
    const imageHTML = product.imageUrl
        ? `<img src="${product.imageUrl}" alt="${product.productName}" class="product-image" 
                onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
           <div class="product-image-placeholder" style="display: none;">
               <i class="fa-solid fa-image"></i>
           </div>`
        : `<div class="product-image-placeholder">
               <i class="fa-solid fa-image"></i>
           </div>`;

    card.innerHTML = `
        ${imageHTML}
        <h3 class="product-name">${product.productName}</h3>
        ${variantText ? `<p class="product-variants">Phân loại: ${variantText}</p>` : ''}
        <p class="product-info">${product.orderItemIds.length} mục trong đơn hàng</p>
    `;

    // Click to select
    card.onclick = () => selectProduct(product, card);

    return card;
}

function selectProduct(product, cardElement) {
    selectedProduct = product;
    selectedOrderItemIds = product.orderItemIds;

    // Highlight selected card
    document.querySelectorAll('.product-card').forEach(c => c.classList.remove('selected'));
    cardElement.classList.add('selected');

    // Show feedback form
    displayFeedbackForm(product);

    // Scroll to form
    document.getElementById('feedbackSection').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function displayFeedbackForm(product) {
    const section = document.getElementById('feedbackSection');
    const infoDiv = document.getElementById('selectedProductInfo');

    // Build variant text
    let variantText = '';
    if (product.variants && product.variants.length > 0) {
        const variantParts = [];
        product.variants.forEach(variant => {
            Object.entries(variant).forEach(([key, value]) => {
                variantParts.push(`${key}: ${value}`);
            });
        });
        variantText = variantParts.join(', ');
    }

    infoDiv.innerHTML = `
        ${product.imageUrl
            ? `<img src="${product.imageUrl}" alt="${product.productName}">`
            : '<div style="width: 80px; height: 80px; background: #f3f4f6; border-radius: 8px; display: flex; align-items: center; justify-content: center;"><i class="fa-solid fa-image" style="color: #9ca3af; font-size: 24px;"></i></div>'
        }
        <div class="selected-product-info">
            <h4>${product.productName}</h4>
            ${variantText ? `<p>Phân loại: ${variantText}</p>` : ''}
        </div>
    `;

    section.style.display = 'block';
}

// Handle submit feedback
async function handleSubmit() {
    // Validate product selected
    if (!selectedProduct || !selectedOrderItemIds || selectedOrderItemIds.length === 0) {
        showDialog('error', 'Vui lòng chọn sản phẩm để đánh giá!');
        return;
    }

    // Validate rating
    if (!currentRating || currentRating < 1 || currentRating > 5) {
        showDialog('error', 'Đánh giá phải từ 1 đến 5 sao!');
        return;
    }

    // Get comment
    const comment = document.getElementById('commentInput').value.trim();

    // Confirm if no comment
    if (!comment) {
        const confirmed = confirm('Bạn chưa nhập nhận xét. Bạn có muốn gửi đánh giá chỉ với số sao không?');
        if (!confirmed) return;
    }

    // Build request
    const request = {
        rating: currentRating,
        comment: comment || null,
        orderItemIds: selectedOrderItemIds
    };

    // Disable form
    setFormEnabled(false);

    try {
        const res = await submitFeedback(request);

        if (res.success) {
            showDialog('success', 'Gửi đánh giá thành công! Cảm ơn bạn đã chia sẻ.');
            handleClear();

            // Optionally reload products
            setTimeout(() => handleSearch(), 1000);
        } else {
            showDialog('error', `Lỗi gửi đánh giá: ${res.message || 'Unknown error'}`);
        }
    } catch (error) {
        console.error('Submit error:', error);
        showDialog('error', 'Lỗi kết nối server. Vui lòng thử lại sau.');
    } finally {
        setFormEnabled(true);
    }
}

// Handle clear form
function handleClear() {
    // Reset rating
    setRating(5);

    // Clear comment
    document.getElementById('commentInput').value = '';

    // Clear selection
    selectedProduct = null;
    selectedOrderItemIds = null;

    // Remove highlights
    document.querySelectorAll('.product-card').forEach(c => c.classList.remove('selected'));

    // Hide feedback form
    document.getElementById('feedbackSection').style.display = 'none';
}

function setFormEnabled(enabled) {
    document.getElementById('btnSearch').disabled = !enabled;
    document.getElementById('orderIdInput').disabled = !enabled;
    document.getElementById('commentInput').disabled = !enabled;
    document.getElementById('btnSubmit').disabled = !enabled;
    document.getElementById('btnClear').disabled = !enabled;

    // Disable star rating
    const stars = document.querySelectorAll('.star-rating i');
    stars.forEach(star => {
        star.style.pointerEvents = enabled ? 'auto' : 'none';
        star.style.opacity = enabled ? '1' : '0.6';
    });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
