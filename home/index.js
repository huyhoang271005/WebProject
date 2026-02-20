import { loadNavbar } from "/navbar/navbar.js";
import { callAPI } from "/lib/api.js";
import { toggleLoading } from "/lib/loader.js";
import { showDialog } from "/dialog/index.js";

// Biến toàn cục lưu danh sách danh mục và thương hiệu
let apiCategories = [];
let apiBrands = [];

// Hàm chạy khi trang load
document.addEventListener("DOMContentLoaded", async () => {
  const params = new URLSearchParams(window.location.search);
  const login = params.get("login");
  if (login) {
    localStorage.setItem("rememberMe", true);
  }
  toggleLoading(true);
  // 1. Khởi tạo Navbar trước
  await loadNavbar({
    centerHTML: `
        <div class="nav-cat-btn" id="catBtn">
            <i class="fa-solid fa-bars"></i> <span>Danh mục</span>
            <div class="cat-dropdown" id="catDropdown"></div>
        </div>
        <div class="nav-cat-btn" id="brandBtn">
            <i class="fa-solid fa-tag"></i> <span>Thương hiệu</span>
            <div class="cat-dropdown" id="brandDropdown"></div>
        </div>
        <div class="home-search-box">
            <input type="text" class="nav-search-input" id="homeSearch" placeholder="Tìm sản phẩm ...">
            <i class="fa-solid fa-magnifying-glass" id="homeSearchBtn"></i>
        </div>`,
  });

  // 2. Lấy dữ liệu theo thứ tự

  await fetchCategories(); // Lấy danh mục trước
  await fetchBrands(); // Lấy thương hiệu

  await renderHomeSections(); // Sau đó mới lấy sản phẩm gợi ý

  // 3. Render dữ liệu lên màn hình và gán sự kiện
  renderNavCategories();
  renderNavBrands();
  setupNavbarEvents();
  setTimeout(() => toggleLoading(false), 300);

});

/**
 * Gọi API lấy danh sách thương hiệu
 */
async function fetchBrands() {
  const res = await callAPI("/brands", "GET");
  if (res && res.success) {
    if (Array.isArray(res.data)) apiBrands = res.data;
    else if (res.data && Array.isArray(res.data.listData))
      apiBrands = res.data.listData;
  } else {
    console.error("Lỗi lấy thương hiệu:", res.message);
  }
}

/**
 * Gọi API lấy danh sách danh mục sản phẩm
 */
async function fetchCategories() {
  const res = await callAPI("/categories", "GET");
  if (res && res.success) {
    if (Array.isArray(res.data)) apiCategories = res.data;
    else if (res.data && Array.isArray(res.data.listData))
      apiCategories = res.data.listData;
  }
  else {
    await showDialog("error", res.message);
  }
}

/**
 * Hiển thị danh sách danh mục lên menu dropdown
 */
function renderNavCategories() {
  const el = document.getElementById("catDropdown");
  if (!el) return;
  if (apiCategories.length === 0) {
    el.innerHTML = '<div style="padding:15px; text-align:center;">Trống</div>';
    return;
  }

  // Tạo link sạch
  el.innerHTML = apiCategories
    .map(
      (c) =>
        `<a href="/products/?cat=${c.categoryId || c.id
        }"><i class="fa-solid fa-caret-right"></i> ${c.categoryName || c.name
        }</a>`,
    )
    .join("");
}

/**
 * Hiển thị danh sách thương hiệu lên menu dropdown
 */
function renderNavBrands() {
  const el = document.getElementById("brandDropdown");
  if (!el) return;
  if (apiBrands.length === 0) {
    el.innerHTML = '<div style="padding:15px; text-align:center;">Trống</div>';
    return;
  }

  el.innerHTML = apiBrands
    .map(
      (b) =>
        `<a href="/products/?brand=${b.brandId || b.id
        }"><i class="fa-solid fa-tag"></i> ${b.brandName || b.name
        }</a>`,
    )
    .join("");
}

/**
 * Gán sự kiện cho các nút trên Navbar (Tìm kiếm, Dropdown)
 */
function setupNavbarEvents() {
  const catBtn = document.getElementById("catBtn");
  const catDropdown = document.getElementById("catDropdown");

  // Toggle menu danh mục
  if (catBtn) {
    catBtn.onclick = (e) => {
      e.stopPropagation();
      catDropdown.classList.toggle("show");
      if (brandDropdown) brandDropdown.classList.remove("show"); // Close brand dropdown
    };
  }

  // Toggle menu thương hiệu
  const brandBtn = document.getElementById("brandBtn");
  const brandDropdown = document.getElementById("brandDropdown");

  if (brandBtn) {
    brandBtn.onclick = (e) => {
      e.stopPropagation();
      brandDropdown.classList.toggle("show");
      if (catDropdown) catDropdown.classList.remove("show"); // Close cat dropdown
    };
  }

  document.addEventListener("click", () => {
    if (catDropdown) catDropdown.classList.remove("show");
    if (brandDropdown) brandDropdown.classList.remove("show");
  });

  // Xử lý tìm kiếm
  const searchInput = document.getElementById("homeSearch");
  const searchBtn = document.getElementById("homeSearchBtn");
  const doSearch = () => {
    const productName = searchInput.value.trim();
    if (productName) {
      window.location.href = `/products/?search=${encodeURIComponent(
        productName,
      )}`;
    } else {
      searchInput.focus();
    }
  };

  if (searchBtn) searchBtn.onclick = doSearch;
  if (searchInput) {
    searchInput.onkeypress = (e) => {
      if (e.key === "Enter") doSearch();
    };
  }
}

/**
 * Gọi API lấy sản phẩm và hiển thị phần "Gợi ý hôm nay"
 */
async function renderHomeSections() {
  const container = document.getElementById("homeContainer");
  if (!container) return;
  container.innerHTML = "";

  // Giới hạn lấy 10 sản phẩm (size=10)
  const res = await callAPI("/products?page=0&size=10", "GET");

  if (res && res.success) {
    const listData = res.data?.listData || [];
    if (listData.length > 0) {
      container.insertAdjacentHTML(
        "beforeend",
        `
        <div class="category-section">
            <div class="section-header">
                <div class="section-title">
                    <i class="fa-solid fa-fire" style="color:#ee4d2d; margin-right:5px;"></i> GỢI Ý HÔM NAY
                </div>
                <a href="/products/" class="btn-see-more">Xem tất cả </a>
            </div>
            <div class="product-grid-5">
                ${listData.map((p) => createProductHTML(p)).join("")}
            </div>
        </div>
      `,
      );
    } else {
      container.innerHTML = `<div style="text-align:center; padding: 40px; color: #666;">Chưa có sản phẩm nào</div>`;
    }
  }
  else {
    await showDialog("error", res.message);
  }
}

/**
 * Tạo HTML cho từng thẻ sản phẩm
 */
function createProductHTML(p) {
  const imgUrl =
    p.imageUrl || "https://cdn-icons-png.flaticon.com/512/2748/2748558.png";
  const priceFormatted = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(p.price || 0);

  let discountBadge = "";
  let originalPriceHTML = "";

  // Tính toán giảm giá
  if (p.originalPrice && p.originalPrice > p.price) {
    const percent = Math.round(
      ((p.originalPrice - p.price) / p.originalPrice) * 100,
    );
    discountBadge = `
        <div style="position:absolute; top:0; right:0; background-color: rgba(255,212,36,.95); width:36px; height:32px; text-align:center; padding-top:4px; font-weight:700; font-size:0.7rem; z-index:2;">
            <span style="color:#ee4d2d;">${percent}%</span>
            <div style="color:white; text-transform:uppercase; font-size:0.6rem;">GIẢM</div>
            <div style="position:absolute; bottom:-4px; left:0; border-width:0 18px 4px; border-style:solid; border-color:transparent rgba(255,212,36,.95); width:0;"></div>
        </div>`;
    const originFormatted = new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(p.originalPrice);
    originalPriceHTML = `<span class="p-origin-price">${originFormatted}</span>`;
  }

  const starsHTML = renderStars(p.ratingAvg || 0);
  const salesText = p.totalSales > 0 ? `Đã bán ${p.totalSales}` : "";

  return `
    <div class="product-card" onclick="window.location.href='/product-detail/?id=${p.productId}'">
        ${discountBadge}
        <div class="p-img">
            <img src="${imgUrl}" alt="${p.productName}" loading="lazy">
        </div>
        <div class="p-info">
            <div class="p-name" title="${p.productName}">${p.productName}</div>
            <div style="margin-top:auto;">
                <div class="p-price">
                    ${priceFormatted}
                    ${originalPriceHTML}
                </div>
            </div>
            <div class="p-meta">
                <div class="p-rating" style="color:#ffce3d;">${starsHTML}</div>
                <div class="p-sold">${salesText}</div>
            </div>
        </div>
    </div>
  `;
}

/**
 * Render số sao đánh giá
 */
function renderStars(rating) {
  if (!rating) rating = 0;
  let html = "";
  for (let i = 1; i <= 5; i++) {
    if (i <= rating) html += '<i class="fa-solid fa-star"></i>';
    else if (i - 0.5 <= rating)
      html += '<i class="fa-solid fa-star-half-stroke"></i>';
    else html += '<i class="fa-regular fa-star" style="color:#d5d5d5"></i>';
  }
  return html;
}
