import { callAPI } from "../lib/api.js";
import { loadPage, noImage } from '../lib/public.js';
import { loadNavbar } from "../navbar/navbar.js";
import { toggleLoading } from "../lib/loader.js";

const NOTIFICATION_DURATION = 3500;
const NOTIFICATION_HIDE_DELAY = 400;
const REDIRECT_DELAY = 2000;
const INFO_NOTIFICATION_DELAY = 1000;
const MAX_STARS = 5;
const DEFAULT_AVATAR = noImage;

let productDetail = null;
let variants = [];
let selectedAttributes = {};
let currentVariant = null;
let lightbox = null;
let galleryImages = [];

function showNotification(message, type = 'success') {
    const noti = document.getElementById('notification');

    const icons = {
        success: '<i class="fa-solid fa-check-circle"></i>',
        error: '<i class="fa-solid fa-circle-exclamation"></i>',
        warning: '<i class="fa-solid fa-triangle-exclamation"></i>',
        info: '<i class="fa-solid fa-circle-info"></i>'
    };

    noti.innerHTML = `${icons[type] || ''} <span>${message}</span>`;
    noti.className = `${type} show`;
    noti.classList.remove("hidden");

    setTimeout(() => {
        noti.classList.remove("show");
        setTimeout(() => noti.classList.add("hidden"), NOTIFICATION_HIDE_DELAY);
    }, NOTIFICATION_DURATION);
}

await loadPage(async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        showNotification("Không tìm thấy ID sản phẩm!", 'error');
        setTimeout(() => window.location.href = '/', REDIRECT_DELAY);
        return;
    }

    await getProductDetail(productId);
    await getFeedbacks(productId);
});

async function getProductDetail(id) {
    const endpoint = `/products/${id}`;

    try {
        const res = await callAPI(endpoint, "GET");

        if (res.success && res.data) {
            productDetail = res.data.productDetailDTO;
            variants = res.data.productVariantsDTO || [];

            renderBasicInfo();
            renderAttributes(res.data.attributeDTOList);

            // Extract all unique images
            const allImages = [productDetail.imageUrl];
            if (variants && variants.length > 0) {
                variants.forEach(v => {
                    if (v.imageUrl && !allImages.includes(v.imageUrl)) {
                        allImages.push(v.imageUrl);
                    }
                });
            }
            renderGallery(allImages);

            setupEventListeners();

        } else {
            showNotification(res.message || "Lỗi tải dữ liệu sản phẩm", 'error');
        }
    } catch (error) {
        showNotification("Không thể kết nối đến server. Vui lòng thử lại!", 'error');
    }
}

async function getFeedbacks(productId) {
    const endpoint = `/feedbacks/${productId}`;
    try {
        const res = await callAPI(endpoint, "GET");

        const container = document.getElementById('feedbackList');
        if (res.success && res.data && res.data.listData) {
            const list = res.data.listData;
            if (list.length === 0) {
                container.innerHTML = `<p style="color: #888; text-align:center; padding: 20px;">Chưa có đánh giá nào.</p>`;
                return;
            }

            // Check Admin Role
            let isUser = false;
            try {
                const cached = sessionStorage.getItem("homeData");
                if (cached) {
                    const userData = JSON.parse(cached);
                    isUser = userData.roleName === 'USER';
                }
            } catch (e) { }

            container.innerHTML = list.map(item => renderFeedbackItem(item, isUser)).join('');

            // Attach events for reply buttons
            if (!isUser) {
                document.querySelectorAll('.btn-reply').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const id = e.target.dataset.id;
                        document.getElementById(`reply-box-${id}`).classList.toggle('show');
                    });
                });
            }

        } else {
            container.innerHTML = `<p style="color: #888; text-align:center; padding: 20px;">Chưa có đánh giá nào.</p>`;
        }
    } catch (error) {
        console.error("Error loading feedbacks:", error);
        document.getElementById('feedbackList').innerHTML = `<p style="color: red; text-align:center;">Lỗi tải đánh giá.</p>`;
    }
}

function renderFeedbackItem(item, isUser) {
    const avatar = item.imageUrl || DEFAULT_AVATAR;
    const date = new Date(item.createdAt).toLocaleString('vi-VN');

    const starsHtml = createStarRating(item.rating);

    let replyHtml = '';
    if (item.reply) {
        const replyDate = new Date(item.reply.createdAt).toLocaleString('vi-VN');
        const adminAvatar = item.reply.imageUrl || DEFAULT_AVATAR;
        replyHtml = `
            <div class="fb-reply-box">
                <div class="fb-header">
                    <div class="fb-user-info">
                        <img src="${adminAvatar}" class="fb-avatar">
                        <div class="fb-meta">
                            <span class="fb-username">${item.reply.username} <span class="admin-badge">${item.reply.roleName}</span></span>
                            <span class="fb-date">${replyDate}</span>
                        </div>
                    </div>
                </div>
                <div style="margin-left: 52px; color: #444; font-size: 0.95rem;">${item.reply.message}</div>
            </div>
        `;
    } else if (!isUser) {
        replyHtml = `
            <button class="btn-reply" data-id="${item.feedbackId}">Trả lời</button>
            <div class="reply-input-area" id="reply-box-${item.feedbackId}">
                <textarea class="reply-input" id="input-${item.feedbackId}" rows="3" placeholder="Nhập phản hồi..."></textarea>
                <button class="btn btn-filled" style="height: 36px; padding: 0 20px; font-size: 0.9rem;" 
                    onclick="submitReply('${item.feedbackId}')">Gửi</button>
            </div>
        `;
    }

    return `
        <div class="feedback-item">
            <div class="fb-header">
                <div class="fb-user-info">
                    <img src="${avatar}" class="fb-avatar">
                    <div class="fb-meta">
                        <span class="fb-username">${item.username}</span>
                        <span class="fb-rating">${starsHtml}</span>
                        <span class="fb-date">${date}</span>
                    </div>
                </div>
            </div>
            <div class="fb-content">${item.comment}</div>
            ${replyHtml}
        </div>
    `;
}

// Function to reply to feedback - Admin only
window.submitReply = async function (feedbackId) {
    const input = document.getElementById(`input-${feedbackId}`);
    const content = {
        message: input.value.trim()
    };

    if (!content) {
        showNotification("Vui lòng nhập nội dung!", "warning");
        return;
    }

    const btn = input.nextElementSibling;
    btn.innerText = "Đang gửi...";
    btn.disabled = true;

    try {
        const res = await callAPI(`/feedbacks/reply/${feedbackId}`, "POST", content);
        console.log("Reply Response:", res);

        if (res.success) {
            showNotification("Đã trả lời đánh giá!", "success");
            // Reload feedbacks
            const urlParams = new URLSearchParams(window.location.search);
            getFeedbacks(urlParams.get('id'));
        } else {
            showNotification(res.message || "Lỗi khi trả lời", "error");
            btn.disabled = false;
            btn.innerText = "Gửi";
        }
    } catch (error) {
        console.error("Error replying to feedback:", error);
        showNotification("Lỗi kết nối", "error");
        btn.disabled = false;
        btn.innerText = "Gửi";
    }
}

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

    // Check Admin Role for Edit Button
    try {
        const cached = sessionStorage.getItem("homeData");
        if (cached) {
            const userData = JSON.parse(cached);
            if (userData.roleName !== 'USER') {
                const titleEl = document.getElementById('productName');
                // Avoid adding multiple buttons if re-render
                if (!titleEl.querySelector('.edit-product-btn')) {
                    const editBtn = document.createElement('a');
                    editBtn.className = 'edit-product-btn';
                    editBtn.href = `/products-manager/edit.html?id=${productDetail.productId}`;
                    editBtn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';
                    editBtn.style.fontSize = '1rem';
                    editBtn.style.color = '#6b7280';
                    editBtn.style.marginLeft = '10px';
                    editBtn.style.textDecoration = 'none';
                    editBtn.title = 'Chỉnh sửa sản phẩm';

                    editBtn.onmouseover = () => editBtn.style.color = '#10B981';
                    editBtn.onmouseout = () => editBtn.style.color = '#6b7280';

                    titleEl.appendChild(editBtn);
                }
            }
        }
    } catch (e) {
        console.error("Error checking admin role:", e);
    }
}

function renderStars(rating) {
    const container = document.getElementById('stars');
    container.innerHTML = createStarRating(rating);
}

function createStarRating(rating) {
    let html = '';
    for (let i = 1; i <= MAX_STARS; i++) {
        if (rating >= i) {
            html += '<i class="fa-solid fa-star"></i>';
        } else if (rating >= i - 0.5) {
            html += '<i class="fa-solid fa-star-half-stroke"></i>';
        } else {
            html += '<i class="fa-regular fa-star"></i>';
        }
    }
    return html;
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

// --- Gallery Functions ---
function renderGallery(images) {
    galleryImages = images;
    const container = document.getElementById('imageGallery');

    // Initialize lightbox
    if (lightbox) {
        lightbox.destroy();
    }

    lightbox = GLightbox({
        elements: images.map(img => ({
            'href': img,
            'type': 'image'
        })),
        selector: '.gallery',
        touchNavigation: true,
        draggable: true,
        loop: false,
        zoomable: true
    });

    // Attach click event to main image to open lightbox
    const mainImgBox = document.querySelector('.main-image-box');
    // Remove existing listener if any (to avoid duplicates on re-render)
    const newMainImgBox = mainImgBox.cloneNode(true);
    mainImgBox.parentNode.replaceChild(newMainImgBox, mainImgBox);

    newMainImgBox.addEventListener('click', () => {
        const currentSrc = document.getElementById('mainImage').getAttribute('src');
        const index = galleryImages.indexOf(currentSrc);
        if (index !== -1) {
            lightbox.openAt(index);
        } else {
            lightbox.open();
        }
    });

    if (!images || images.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.innerHTML = images.map((img, index) => `
        <div class="gallery-item ${index === 0 ? 'active' : ''}" onclick="selectGalleryImage(this, '${img}')">
            <img src="${img}" onerror="this.src='${noImage}'">
            <div class="gallery-overlay"></div>
        </div>
    `).join('');
}

window.selectGalleryImage = function (element, src) {
    // Update main image
    const mainImg = document.getElementById('mainImage');
    mainImg.src = src;

    // Update active class
    document.querySelectorAll('.gallery-item').forEach(item => item.classList.remove('active'));
    element.classList.add('active');
}

function handleAttributeSelect(attrId, valId, btnElement, attrName) {
    const siblings = btnElement.parentElement.children;
    for (let sib of siblings) {
        sib.classList.remove('active');
    }
    btnElement.classList.add('active');

    selectedAttributes[attrId] = valId;

    const errorEl = document.getElementById('attributeError');
    if (errorEl) errorEl.style.display = 'none';

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

        // Reset overlay if no variant matches (optional, or keep generic state)
        const overlay = document.getElementById('soldOutOverlay');
        const mainImg = document.getElementById('mainImage');
        if (overlay) overlay.style.display = 'none';
        if (mainImg) mainImg.style.opacity = '1';
    }
}

function updateUIForVariant(variant) {
    updatePriceDisplay(variant.price, variant.originalPrice);

    const imgEl = document.getElementById('mainImage');
    if (variant.imageUrl) {
        imgEl.src = variant.imageUrl;
        imgEl.onerror = () => {
            imgEl.src = noImage;
        };

        // Highlight corresponding thumbnail
        const galleryItems = document.querySelectorAll('.gallery-item img');
        galleryItems.forEach(img => {
            if (img.getAttribute('src') === variant.imageUrl) {
                // Remove active from all
                document.querySelectorAll('.gallery-item').forEach(item => item.classList.remove('active'));
                // Add active to parent div
                img.parentElement.classList.add('active');
            }
        });

    } else {
        // Fallback to noImage as requested
        imgEl.src = noImage;
    }

    updateStockDisplay(variant.stock);
    document.getElementById('inputQuantity').value = 1;

    // Handle Out of Stock Overlay
    const overlay = document.getElementById('soldOutOverlay');
    const mainImg = document.getElementById('mainImage');

    if (variant.stock <= 0) {
        if (overlay) overlay.style.display = 'block';
        if (mainImg) mainImg.style.opacity = '0.5';
    } else {
        if (overlay) overlay.style.display = 'none';
        if (mainImg) mainImg.style.opacity = '1';
    }
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
            // Minimum quantity is 1
        }
    });

    input.addEventListener('change', () => {
        let val = parseInt(input.value) || 1;

        if (val < 1) {
            input.value = 1;
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

    document.getElementById('btnAddToCart').addEventListener('click', async () => {
        if (!validateSelection()) return;

        const quantity = parseInt(input.value);
        const btnCart = document.getElementById('btnAddToCart');

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

    document.getElementById('btnBuyNow').addEventListener('click', () => {
        if (!validateSelection()) return;
        const quantity = parseInt(document.getElementById('inputQuantity').value);
        showNotification(`Đang chuyển đến trang thanh toán...`, 'info');

        const selectedAttrNames = [];
        const selectedAttrValues = [];

        document.querySelectorAll('.attribute-row').forEach(row => {
            const activeBtn = row.querySelector('.attr-item.active');
            if (activeBtn) {
                selectedAttrNames.push(activeBtn.innerText);
                selectedAttrValues.push(activeBtn.innerText);
            }
        });

        const buyNowData = {
            variantId: currentVariant.variantId,
            quantity: quantity,
            productName: productDetail.productName,
            price: currentVariant.price,
            originalPrice: currentVariant.originalPrice || currentVariant.price,
            thumbnail: currentVariant.imageUrl || productDetail.imageUrl,
            imageUrl: currentVariant.imageUrl || productDetail.imageUrl,
            variantName: selectedAttrNames.join(' - '),
            attributeValues: selectedAttrValues
        };

        // Clear checkoutItems to avoid conflict on checkout page
        sessionStorage.removeItem('checkoutItems');
        sessionStorage.removeItem('checkedCartIds');
        sessionStorage.setItem('buyNowData', JSON.stringify(buyNowData));

        window.location.href = '../checkout/index.html';
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

document.addEventListener("DOMContentLoaded", async () => {
    toggleLoading(true);

    try {
        await loadNavbar();
    } catch (error) {
        showNotification("Không thể tải thanh điều hướng", 'warning');
    } finally {
        toggleLoading(false);
    }
});