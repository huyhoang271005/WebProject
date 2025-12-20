import { loadNavbar } from "../navbar/navbar.js";
import { callAPI } from "../public/api.js";
import { toggleLoading } from "../public/loader.js";

let apiCategories = [];

document.addEventListener("DOMContentLoaded", async () => {
  toggleLoading(true);
  try {
    // 1. Load Navbar
    await loadNavbar({
      centerHTML: `
        <div class="nav-cat-btn" id="catBtn">
            <i class="fa-solid fa-bars"></i> <span>Danh mục</span>
            <div class="cat-dropdown" id="catDropdown"></div>
        </div>
        <div style="position:relative; width: 100%; max-width: 500px;">
            <input type="text" class="nav-search-input" id="homeSearch" placeholder="Tìm sản phẩm..." style="width:100%; padding-left:15px; border-radius:20px; border:1px solid #ddd; height:40px;">
            <i class="fa-solid fa-magnifying-glass" style="position:absolute; right:15px; top:50%; transform:translateY(-50%); color:#10B981; cursor:pointer;" id="homeSearchBtn"></i>
        </div>`,
    });

    // 2. Gọi API
    await fetchCategories();
    renderNavCategories();
    setupNavbarEvents();
    await renderHomeSections();
  } catch (e) {
    console.error(e);
  } finally {
    setTimeout(() => toggleLoading(false), 500);
  }
});

// API Danh mục
async function fetchCategories() {
  try {
    const res = await callAPI("/categories", "GET", null);
    if (res && res.success && Array.isArray(res.data)) {
      apiCategories = res.data;
    } else {
      apiCategories = [
        { id: "an-vat", name: "Đồ ăn vặt" },
        { id: "nuoc-ngot", name: "Nước giải khát" },
      ];
    }
  } catch (e) {
    console.error("Lỗi danh mục:", e);
  }
}

// Render Sản phẩm
async function renderHomeSections() {
  const container = document.getElementById("homeContainer");
  if (!container) return;
  container.innerHTML = "";

  // [QUAN TRỌNG] Trả lại đúng đường dẫn cũ của ông: /auth/products
  const res = await callAPI("/auth/products?page=0&size=15", "GET", null);

  if (res && res.success) {
    const listData = res.data?.listData || [];
    if (listData.length > 0) {
      container.insertAdjacentHTML(
        "beforeend",
        `
              <div class="category-section">
                  <div class="section-header">
                      <div class="section-title">
                        <i class="fa-solid fa-fire" style="color:#ee4d2d;"></i> GỢI Ý HÔM NAY
                      </div>
                      <a href="../products/index.html" style="color:#10b981; text-decoration:none;">Xem tất cả ></a>
                  </div>
                  <div class="product-grid-5">
                      ${listData.map((p) => createProductHTML(p)).join("")}
                  </div>
              </div>
          `
      );
    } else {
      container.innerHTML = `<div style="text-align:center; padding: 20px; color: #666;">Chưa có sản phẩm nào</div>`;
    }
  } else {
    // In lỗi ra màn hình cho dễ nhìn
    container.innerHTML = `<div style="text-align:center; color:red; padding:20px;">
        <h3>⚠️ Lỗi kết nối Server!</h3>
        <p>Vui lòng kiểm tra lại đường dẫn API trong file <b>public/api.js</b></p>
        <small>Chi tiết lỗi: ${
          res?.message || "Không thể kết nối đến máy chủ"
        }</small>
      </div>`;
  }
}

function createProductHTML(p) {
  const imgUrl =
    p.imageUrl || "https://cdn-icons-png.flaticon.com/512/2748/2748558.png";
  const priceFormatted = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(p.price || 0);

  let discountBadge = "";
  if (p.originalPrice && p.originalPrice > p.price) {
    const percent = Math.round(
      ((p.originalPrice - p.price) / p.originalPrice) * 100
    );
    discountBadge = `
            <div style="position:absolute; top:0; right:0; background-color: rgba(255,212,36,.9); width:40px; height:36px; text-align:center; padding-top:4px; font-weight:700; font-size:0.75rem; z-index:2;">
                <span style="color:#ee4d2d;">${percent}%</span>
                <div style="color:white; text-transform:uppercase; font-size:0.6rem;">GIẢM</div>
            </div>`;
  }

  const rating = p.ratingAvg || 0;
  const starsHTML = renderStars(rating);

  return `
        <div class="product-card" onclick="window.location.href='../product-detail/index.html?id=${p.productId}'">
            ${discountBadge}
            <div class="p-img">
                <img src="${imgUrl}" alt="${p.productName}" loading="lazy">
            </div>
            <div class="p-info">
                <div class="p-name" title="${p.productName}">${p.productName}</div>
                <div style="margin-top:auto;">
                    <span class="p-price">${priceFormatted}</span>
                </div>
                <div style="display:flex; align-items:center; justify-content:space-between; margin-top:8px;">
                    <div style="font-size:0.7rem; color:#ffce3d;">${starsHTML}</div>
                    <div style="font-size:0.75rem; color:#9ca3af;">Đã bán 99+</div>
                </div>
            </div>
        </div>
    `;
}

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

function setupNavbarEvents() {
  const catBtn = document.getElementById("catBtn");
  const catDropdown = document.getElementById("catDropdown");
  if (catBtn) {
    catBtn.onclick = (e) => {
      e.stopPropagation();
      catDropdown.classList.toggle("show");
    };
    document.addEventListener("click", () => {
      if (catDropdown) catDropdown.classList.remove("show");
    });
  }
  const searchInput = document.getElementById("homeSearch");
  const searchBtn = document.getElementById("homeSearchBtn");
  const doSearch = () => {
    const q = searchInput.value.trim();
    if (q)
      window.location.href = `../products/index.html?search=${encodeURIComponent(
        q
      )}`;
  };
  if (searchBtn) searchBtn.onclick = doSearch;
  if (searchInput)
    searchInput.onkeypress = (e) => {
      if (e.key === "Enter") doSearch();
    };
}

function renderNavCategories() {
  const el = document.getElementById("catDropdown");
  if (!el) return;
  el.innerHTML = apiCategories
    .map(
      (c) => `
        <a href="../products/index.html?cat=${c.id}" style="display:block; padding:10px; color:#333; text-decoration:none;"><i class="fa-solid fa-caret-right"></i> ${c.name}</a>
    `
    )
    .join("");
}
