import {callAPI} from "../public/api.js";
import {loadPage, noImage} from '../public/public.js';
import {loadNavbar} from "../navbar/navbar.js";
import {toggleLoading} from "../public/loader.js";

// --- Global Variables ---
let productDetail = null;
let variants = [];
let selectedAttributes = {};
let currentVariant = null;

// --- Enhanced Notification System ---
function showNotification(message, type = 'success') {
    const noti = document.getElementById('notification');

    noti.innerText = message;
    noti.className = `${type} show`;
    noti.classList.remove("hidden");

    // Auto hide after 3.5 seconds
    setTimeout(() => {
        noti.classList.remove("show");
        setTimeout(() => noti.classList.add("hidden"), 400);
    }, 3500);
}

// --- Main Execution ---
loadPage(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        showNotification("Không tìm thấy ID sản phẩm!", 'error');
        setTimeout(() => {
            window.location.href = '/';
        }, 2000);
        return;
    }

    await getProductDetail(productId);
});

// --- API Functions ---
async function getProductDetail(id) {
    const endpoint = `/products/${id}`;

    try {
        const res = await callAPI(endpoint, "GET");

        if (res.success && res.data) {
            productDetail = res.data.productDetailDTO;
            variants = res.data.productVariantsDTO || [];

            renderBasicInfo();
            renderAttributes(res.data.attributeDTOList);
            setupEventListeners();

            // Hiển thị hướng dẫn nếu có variants
            if (variants.length > 0) {
                setTimeout(() => {
                    showNotification("Vui lòng chọn phân loại sản phẩm trước khi mua", 'info');
                }, 1000);
            }
        } else {
            showNotification(res.message || "Lỗi tải dữ liệu sản phẩm", 'error');
            setTimeout(() => {
                window.history.back();
            }, 2000);
        }
    } catch (error) {
        console.error("Error loading product:", error);
        showNotification("Không thể kết nối đến server. Vui lòng thử lại!", 'error');
    }
}

// --- Render Logic ---
function renderBasicInfo() {
    const imgEl = document.getElementById('mainImage');
    imgEl.src = productDetail.imageUrl ? productDetail.imageUrl : noImage;
    imgEl.onerror = () => { imgEl.src = noImage; };

    document.getElementById('productName').innerText = productDetail.productName;
    updatePriceDisplay(productDetail.price, productDetail.originalPrice);

    const ratingScore = productDetail.ratingAvg || 0;
    document.getElementById('ratingScore').innerText = ratingScore.toFixed(1);
    document.getElementById('totalSales').innerText = productDetail.totalSales || 0;
    renderStars(ratingScore);

    document.getElementById('descriptionContent').innerText =
        productDetail.description || "Chưa có mô tả cho sản phẩm này.";

    updateStockDisplay(null);
}

function renderStars(rating) {
    const container = document.getElementById('stars');
    let html = '';
    for (let i = 1; i <= 5; i++) {
        if (rating >= i) {
            html += '<i class="fa-solid fa-star"></i>';
        } else if (rating >= i - 0.5) {
            html += '<i class="fa-solid fa-star-half-stroke"></i>';
        } else {
            html += '<i class="fa-regular fa-star"></i>';
        }
    }
    container.innerHTML = html;
}

function renderAttributes(attributeList) {
    const container = document.getElementById('attributesArea');
    if (!attributeList || attributeList.length === 0) return;

    attributeList.forEach(attr => {
        const row = document.createElement('div');
        row.className = 'attribute-row';

        const nameDiv = document.createElement('div');
        nameDiv.className = 'attr-name';
        nameDiv.innerText = attr.attributeName;
        row.appendChild(nameDiv);

        const listDiv = document.createElement('div');
        listDiv.className = 'attr-list';

        attr.attributeValues.forEach(val => {
            const btn = document.createElement('div');
            btn.className = 'attr-item';
            btn.innerText = val.attributeValueName;
            btn.dataset.attrId = attr.attributeId;
            btn.dataset.valId = val.attributeValueId;

            btn.addEventListener('click', () =>
                handleAttributeSelect(attr.attributeId, val.attributeValueId, btn, attr.attributeName)
            );

            listDiv.appendChild(btn);
        });

        row.appendChild(listDiv);
        container.appendChild(row);
    });
}

// --- Attribute Selection Logic ---
function handleAttributeSelect(attrId, valId, btnElement, attrName) {
    // UI: Remove active from siblings
    const siblings = btnElement.parentElement.children;
    for (let sib of siblings) {
        sib.classList.remove('active');
    }
    btnElement.classList.add('active');

    // Logic: Save state
    selectedAttributes[attrId] = valId;

    // Hide error message if visible
    const errorEl = document.getElementById('attributeError');
    if (errorEl) errorEl.style.display = 'none';

    // Show feedback
    const selectedValue = btnElement.innerText;
    showNotification(`Đã chọn ${attrName}: ${selectedValue}`, 'success');

    // Find matching variant
    findMatchingVariant();
}

function findMatchingVariant() {
    const currentSelectedValues = Object.values(selectedAttributes);
    const totalAttributes = document.getElementsByClassName('attribute-row').length;

    if (currentSelectedValues.length < totalAttributes) {
        currentVariant = null;
        updateStockDisplay(null);
        return;
    }

    const found = variants.find(v => {
        return currentSelectedValues.every(selectedId =>
            v.attributeValueIdList.includes(selectedId)
        );
    });

    if (found) {
        currentVariant = found;
        updateUIForVariant(found);
    } else {
        currentVariant = null;
        updateStockDisplay(0);
    }
}

function updateUIForVariant(variant) {
    updatePriceDisplay(variant.price, variant.originalPrice);

    if (variant.imageUrl) {
        const imgEl = document.getElementById('mainImage');
        imgEl.src = variant.imageUrl;
        imgEl.onerror = () => {
            imgEl.src = productDetail.imageUrl || noImage;
        };
    }

    updateStockDisplay(variant.stock);
    document.getElementById('inputQuantity').value = 1;
}

function updatePriceDisplay(current, original) {
    const format = (n) => n.toLocaleString('vi-VN') + '₫';

    document.getElementById('currentPrice').innerText = format(current);

    const delEl = document.getElementById('originalPrice');
    const tagEl = document.getElementById('discountTag');

    if (original && original > current) {
        delEl.innerText = format(original);
        delEl.style.display = 'inline';

        const percent = Math.round(((original - current) / original) * 100);
        tagEl.innerText = `GIẢM ${percent}%`;
        tagEl.style.display = 'inline-block';
    } else {
        delEl.style.display = 'none';
        tagEl.style.display = 'none';
    }
}

function updateStockDisplay(stock) {
    const stockEl = document.getElementById('stockCount');
    const btnBuy = document.getElementById('btnBuyNow');
    const btnCart = document.getElementById('btnAddToCart');

    if (stock === null) {
        stockEl.innerText = "";
        btnBuy.disabled = true;
        btnBuy.classList.add('disabled');
        btnCart.disabled = true;
        btnCart.classList.add('disabled');
        return;
    }

    if (stock > 0) {
        stockEl.innerText = `${stock} sản phẩm có sẵn`;
        stockEl.style.color = "#16A34A";
        btnBuy.disabled = false;
        btnBuy.classList.remove('disabled');
        btnCart.disabled = false;
        btnCart.classList.remove('disabled');
    } else {
        stockEl.innerText = "Hết hàng";
        stockEl.style.color = "#DC2626";
        btnBuy.disabled = true;
        btnBuy.classList.add('disabled');
        btnCart.disabled = true;
        btnCart.classList.add('disabled');
    }
}

// --- Event Listeners ---
function setupEventListeners() {
    const input = document.getElementById('inputQuantity');
    const btnIncrease = document.getElementById('btnIncrease');
    const btnDecrease = document.getElementById('btnDecrease');

    btnIncrease.addEventListener('click', () => {
        if (!currentVariant) {
            showNotification("Vui lòng chọn phân loại sản phẩm trước", 'warning');
            highlightAttributes();
            return;
        }

        let max = currentVariant.stock;
        let val = parseInt(input.value) || 1;

        if (val < max) {
            input.value = val + 1;
        } else {
            showNotification(`Chỉ còn ${max} sản phẩm trong kho`, 'warning');
        }
    });

    btnDecrease.addEventListener('click', () => {
        let val = parseInt(input.value) || 1;
        if (val > 1) {
            input.value = val - 1;
        } else {
            showNotification("Số lượng tối thiểu là 1", 'info');
        }
    });

    input.addEventListener('change', () => {
        let val = parseInt(input.value) || 1;

        if (val < 1) {
            input.value = 1;
            showNotification("Số lượng tối thiểu là 1", 'warning');
            return;
        }

        if (currentVariant) {
            let max = currentVariant.stock;
            if (val > max) {
                input.value = max;
                showNotification(`Chỉ còn ${max} sản phẩm trong kho`, 'warning');
            }
        }
    });

    input.addEventListener('blur', () => {
        if (!input.value || input.value === '0') {
            input.value = 1;
        }
    });

    // Add to Cart Button
    document.getElementById('btnAddToCart').addEventListener('click', async () => {
        if (!validateSelection()) return;

        const quantity = parseInt(input.value);
        const btnCart = document.getElementById('btnAddToCart');

        // Prevent double click
        if (btnCart.classList.contains('loading')) return;

        btnCart.classList.add('loading');

        try {
            const data = {
                variantId: currentVariant.variantId,
                quantity: quantity
            };

            const result = await callAPI('/carts', "POST", data);

            if (result.success) {
                showNotification(`Đã thêm ${quantity} sản phẩm vào giỏ hàng!`, 'success');
                // Optional: Update cart badge/count here
            } else {
                showNotification(result.message || "Không thể thêm vào giỏ hàng", 'error');
            }
        } catch (error) {
            console.error("Error adding to cart:", error);
            showNotification("Có lỗi xảy ra. Vui lòng thử lại!", 'error');
        } finally {
            btnCart.classList.remove('loading');
        }
    });

    // Buy Now Button
    document.getElementById('btnBuyNow').addEventListener('click', () => {
        if (!validateSelection()) return;
        const quantity = parseInt(document.getElementById('inputQuantity').value);
        // Confirm before proceeding
        showNotification(`Đang chuyển đến trang thanh toán...`, 'info');

        const selectedAttrNames = [];
        document.querySelectorAll('.attribute-row').forEach(row => {
            const activeBtn = row.querySelector('.attr-item.active');
            if (activeBtn) selectedAttrNames.push(activeBtn.innerText);
        });

        const buyNowData = {
            variantId: currentVariant.variantId,
            quantity: quantity,
            productName: productDetail.productName,
            price: currentVariant.price,
            thumbnail: currentVariant.imageUrl || productDetail.imageUrl,
            variantName: selectedAttrNames.join(' - ')
        };

        // 4. Quan trọng: Dọn dẹp dữ liệu cũ để tránh nhầm lẫn luồng
        localStorage.removeItem("checkoutItems"); // Xóa dữ liệu chờ từ giỏ hàng (nếu có)

        // 5. Lưu dữ liệu mua ngay vào sessionStorage (dữ liệu tạm thời phiên làm việc)
        sessionStorage.setItem('buyNowData', JSON.stringify(buyNowData));

        // 6. Redirect
        setTimeout(() => {
            window.location.href = '../checkout/index.html'; // Điều chỉnh đường dẫn đúng file của bạn
        }, 500);
    });
}

function validateSelection() {
    const totalRows = document.getElementsByClassName('attribute-row').length;
    const errorEl = document.getElementById('attributeError');

    if (totalRows > 0 && !currentVariant) {
        if (errorEl) {
            errorEl.style.display = 'flex';
            errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        showNotification("Vui lòng chọn đầy đủ phân loại sản phẩm!", 'error');
        highlightAttributes();
        return false;
    }

    const quantity = parseInt(document.getElementById('inputQuantity').value);
    if (quantity < 1) {
        showNotification("Số lượng phải lớn hơn 0", 'error');
        return false;
    }

    if (currentVariant && quantity > currentVariant.stock) {
        showNotification(`Chỉ còn ${currentVariant.stock} sản phẩm trong kho`, 'error');
        return false;
    }

    return true;
}

function highlightAttributes() {
    const attrRows = document.getElementsByClassName('attribute-row');
    for (let row of attrRows) {
        const attrId = row.querySelector('.attr-item')?.dataset.attrId;
        if (attrId && !selectedAttributes[attrId]) {
            row.classList.add('pulse');
            setTimeout(() => row.classList.remove('pulse'), 1500);
        }
    }
}

// --- DOMContentLoaded ---
document.addEventListener("DOMContentLoaded", async () => {
    toggleLoading(true);

    try {
        await loadNavbar();
    } catch (error) {
        console.error("Error loading navbar:", error);
        showNotification("Không thể tải thanh điều hướng", 'warning');
    } finally {
        toggleLoading(false);
    }
});