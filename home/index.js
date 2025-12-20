import { loadNavbar } from "../navbar/navbar.js";
import { callAPI } from "../public/api.js";
import { toggleLoading } from "../public/loader.js";

// [QUAN TRỌNG] Tên biến ở trang Home là apiCategories
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
        <div style="position:relative; width:100%; max-width:450px;">
            <input type="text" class="nav-search-input" id="homeSearch" placeholder="Tìm sản phẩm...">
            <i class="fa-solid fa-magnifying-glass" style="position:absolute; right:15px; top:50%; transform:translateY(-50%); color:#10B981; cursor:pointer;" id="homeSearchBtn"></i>
        </div>`,
    });

    // 2. Gọi các API cần thiết
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

// [API] Danh mục (Public)
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
    console.error("Lỗi lấy danh mục:", e);
  }
}

// [RENDER] Trang chủ
async function renderHomeSections() {
  const container = document.getElementById("homeContainer");
  if (!container) return;
  container.innerHTML = "";

  // [API] Lấy sản phẩm.
  // [FIX 500 ERROR] Đổi thành /products (hoặc public endpoint) nếu /auth/products bị chặn khách
  // Nếu server bro vẫn bắt auth thì giữ nguyên dòng này, nhưng nhớ phải login mới thấy data
  const res = await callAPI("/products?page=0&size=15", "GET", null);

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
                  <a href="../products/index.html" class="btn-see-more">Xem tất cả ></a>
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
    // Fallback nếu API /products lỗi, thử lại /auth/products
    console.log("Thử lại với Auth...");
    const resAuth = await callAPI("/auth/products?page=0&size=15", "GET", null);
    if (resAuth && resAuth.success) {
      // Render lại (code lặp lại chút để fallback)
      const list = resAuth.data?.listData || [];
      container.insertAdjacentHTML(
        "beforeend",
        `
            <div class="category-section">
                <div class="section-header"><div class="section-title">GỢI Ý HÔM NAY</div><a href="../products/index.html">Xem tất cả ></a></div>
                <div class="product-grid-5">${list
                  .map((p) => createProductHTML(p))
                  .join("")}</div>
            </div>`
      );
    } else {
      container.innerHTML = `<div style="text-align:center; color:red;">Lỗi tải: ${
        res?.message || "Server Error"
      }</div>`;
    }
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
            <div style="position:absolute; top:0; right:0; background-color: rgba(255,212,36,.9); width:36px; height:32px; text-align:center; padding-top:4px; font-weight:700; font-size:0.7rem; z-index:2;">
                <span style="color:#ee4d2d;">${percent}%</span>
                <div style="color:white; text-transform:uppercase; font-size:0.6rem;">GIẢM</div>
                <div style="position:absolute; bottom:-4px; left:0; border-width:0 18px 4px; border-style:solid; border-color:transparent rgba(255,212,36,.9); width:0;"></div>
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
                <div class="p-meta" style="display:flex; align-items:center; justify-content:space-between; margin-top:5px; font-size:0.75rem; color:#777;">
                    <div class="p-rating" style="color:#ffce3d;">${starsHTML}</div>
                    <div class="p-sold">Đã bán 99+</div>
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
  if (apiCategories.length === 0) {
    el.innerHTML =
      '<div style="padding:15px; text-align:center;">Đang tải...</div>';
    return;
  }
  el.innerHTML = apiCategories
    .map(
      (c) =>
        `<a href="../products/index.html?cat=${c.id}"><i class="fa-solid fa-caret-right"></i> ${c.name}</a>`
    )
    .join("");
}
