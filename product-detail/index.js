import { callAPI } from "../public/api.js";
import { loadPage, noImage } from '../public/public.js';

// --- Global Variables ---
let productDetail = null;     // Dữ liệu sản phẩm gốc
let variants = [];            // Danh sách variants
let selectedAttributes = {};  // Lưu lựa chọn: { "attrId": "valueId" }
let currentVariant = null;    // Variant đang match hiện tại

// --- Main Execution ---
loadPage(async () => {
    // 1. Lấy Product ID từ URL
    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');

    if (!productId) {
        alert("Không tìm thấy ID sản phẩm!");
        return;
    }

    // 2. Gọi API lấy dữ liệu
    await getProductDetail(productId);
});

// --- API Functions ---
async function getProductDetail(id) {
    const endpoint = `auth/product-detail?id=${id}`;
    const res = await callAPI(endpoint, "GET");

    if (res.success && res.data) {
        productDetail = res.data.productDetailDTO;
        variants = res.data.productVariantsDTO || [];

        // Render giao diện
        renderBasicInfo();
        renderAttributes(res.data.attributeDTOList);
        setupEventListeners();
    } else {
        alert(res.message || "Lỗi tải dữ liệu sản phẩm");
    }
}

// --- Render Logic ---
function renderBasicInfo() {
    // Ảnh
    const imgEl = document.getElementById('mainImage');
    imgEl.src = productDetail.imageUrl ? productDetail.imageUrl : noImage;

    // Tên & Giá gốc
    document.getElementById('productName').innerText = productDetail.productName;
    updatePriceDisplay(productDetail.price, productDetail.priceOriginal);

    // Rating & Sales
    document.getElementById('ratingScore').innerText = productDetail.ratingAvg.toFixed(1);
    document.getElementById('totalSales').innerText = productDetail.totalSales;
    renderStars(productDetail.ratingAvg);

    // Mô tả
    document.getElementById('descriptionContent').innerText = productDetail.description;

    // Kho (mặc định ban đầu)
    updateStockDisplay(null);
}

function renderStars(rating) {
    const container = document.getElementById('stars');
    let html = '';
    for (let i = 1; i <= 5; i++) {
        if (rating >= i) html += '<i class="fa-solid fa-star"></i>';
        else if (rating >= i - 0.5) html += '<i class="fa-solid fa-star-half-stroke"></i>';
        else html += '<i class="fa-regular fa-star"></i>';
    }
    container.innerHTML = html;
}

function renderAttributes(attributeList) {
    const container = document.getElementById('attributesArea');
    if (!attributeList || attributeList.length === 0) return;

    attributeList.forEach(attr => {
        // Tạo hàng
        const row = document.createElement('div');
        row.className = 'attribute-row';

        // Tên thuộc tính
        const nameDiv = document.createElement('div');
        nameDiv.className = 'attr-name';
        nameDiv.innerText = attr.attributeName;
        row.appendChild(nameDiv);

        // Danh sách giá trị
        const listDiv = document.createElement('div');
        listDiv.className = 'attr-list';

        attr.attributeValues.forEach(val => {
            const btn = document.createElement('div');
            btn.className = 'attr-item'; // Class CSS style chip
            btn.innerText = val.attributeValueName;

            // Gán data attribute để truy xuất
            btn.dataset.attrId = attr.attributeId;
            btn.dataset.valId = val.attributeValueId;

            // Sự kiện click
            btn.addEventListener('click', () => handleAttributeSelect(attr.attributeId, val.attributeValueId, btn));

            listDiv.appendChild(btn);
        });

        row.appendChild(listDiv);
        container.appendChild(row);
    });
}

// --- Attribute Selection Logic ---
function handleAttributeSelect(attrId, valId, btnElement) {
    // 1. UI: Active class handling
    // Tìm tất cả nút trong cùng nhóm thuộc tính để bỏ active
    const siblings = btnElement.parentElement.children;
    for (let sib of siblings) {
        sib.classList.remove('active');
    }
    // Active nút vừa bấm
    btnElement.classList.add('active');

    // 2. Logic: Lưu state
    selectedAttributes[attrId] = valId;

    // 3. Logic: Tìm variant phù hợp
    findMatchingVariant();
}

function findMatchingVariant() {
    // Lấy danh sách value ID đang được chọn
    const currentSelectedValues = Object.values(selectedAttributes);

    // Đếm xem user đã chọn đủ số lượng thuộc tính chưa (dựa trên số dòng attribute đã render)
    const totalAttributes = document.getElementsByClassName('attribute-row').length;

    if (currentSelectedValues.length < totalAttributes) {
        // Chưa chọn đủ
        currentVariant = null;
        return;
    }

    // Tìm variant có chứa TẤT CẢ các valueId đã chọn
    const found = variants.find(v => {
        // v.attributeValueIdList là mảng ID của variant đó
        // Kiểm tra xem mọi ID user chọn có nằm trong list của variant ko
        return currentSelectedValues.every(selectedId => v.attributeValueIdList.includes(selectedId));
    });

    if (found) {
        currentVariant = found;
        // Cập nhật giao diện theo variant tìm thấy
        updateUIForVariant(found);
    } else {
        // Chọn đủ nhưng không khớp variant nào (trường hợp hiếm nếu data chuẩn)
        currentVariant = null;
        document.getElementById('stockCount').innerText = "Hết hàng biến thể này";
        document.getElementById('btnBuyNow').disabled = true;
        document.getElementById('btnAddToCart').disabled = true;
    }
}

function updateUIForVariant(variant) {
    // 1. Giá
    updatePriceDisplay(variant.price, null); // Variant thường không có giá gốc riêng, hoặc backend ko trả về

    // 2. Ảnh (Nếu variant có ảnh riêng thì đổi)
    if (variant.imageUrl) {
        document.getElementById('mainImage').src = variant.imageUrl;
    }

    // 3. Kho & Button state
    updateStockDisplay(variant.stock);

    // 4. Reset số lượng về 1
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
        // Chưa chọn variant
        stockEl.innerText = "";
        return;
    }

    stockEl.innerText = `${stock} sản phẩm có sẵn`;

    if (stock > 0) {
        btnBuy.disabled = false;
        btnBuy.classList.remove('disabled');
        btnCart.disabled = false;
        btnCart.classList.remove('disabled');
    } else {
        stockEl.innerText = "Hết hàng";
        stockEl.style.color = "red";
        btnBuy.disabled = true;
        btnCart.disabled = true;
    }
}

// --- Event Listeners (Quantity & Buttons) ---
function setupEventListeners() {
    const input = document.getElementById('inputQuantity');

    document.getElementById('btnIncrease').addEventListener('click', () => {
        let max = currentVariant ? currentVariant.stock : 999;
        let val = parseInt(input.value) || 1;
        if (val < max) input.value = val + 1;
    });

    document.getElementById('btnDecrease').addEventListener('click', () => {
        let val = parseInt(input.value) || 1;
        if (val > 1) input.value = val - 1;
    });

    input.addEventListener('change', () => {
        let max = currentVariant ? currentVariant.stock : 999;
        let val = parseInt(input.value) || 1;
        if (val < 1) input.value = 1;
        if (val > max) input.value = max;
    });

    document.getElementById('btnAddToCart').addEventListener('click', () => {
        if (!validateSelection()) return;
        // Gọi API thêm vào giỏ hàng tại đây
        alert(`Đã thêm vào giỏ: ${currentVariant.variantId} - SL: ${input.value}`);
    });

    document.getElementById('btnBuyNow').addEventListener('click', () => {
        if (!validateSelection()) return;
        // Chuyển trang thanh toán
        alert("Chuyển đến trang thanh toán...");
    });
}

function validateSelection() {
    // Check xem có thuộc tính nào chưa chọn không
    const totalRows = document.getElementsByClassName('attribute-row').length;
    // Nếu có attribute mà chưa có variant -> chưa chọn đủ
    if (totalRows > 0 && !currentVariant) {
        alert("Vui lòng chọn phân loại hàng (Màu sắc, Kích thước...)");
        return false;
    }
    return true;
}