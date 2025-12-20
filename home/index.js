import { loadNavbar } from "../navbar/navbar.js";
import { callAPI } from "../public/api.js";
import { toggleLoading } from "../public/loader.js";

let apiCategories = [];

document.addEventListener("DOMContentLoaded", async () => {
  toggleLoading(true);
  try {
    await loadNavbar({
      centerHTML: `
        <div class="nav-cat-btn" id="catBtn">
            <i class="fa-solid fa-bars"></i> <span>Danh mục</span>
            <div class="cat-dropdown" id="catDropdown"></div>
        </div>
        <div style="position:relative;">
            <input type="text" class="nav-search-input" id="homeSearch" placeholder="Tìm sản phẩm...">
            <i class="fa-solid fa-magnifying-glass" style="position:absolute; right:15px; top:50%; transform:translateY(-50%); color:#10B981; cursor:pointer;" id="homeSearchBtn"></i>
        </div>`,
    });

    // [CHỐT API] Dùng /auth/categories (số nhiều)
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

async function fetchCategories() {
  try {
    const res = await callAPI("/auth/categories", "GET", null);
    if (res && res.success && Array.isArray(res.data)) {
      apiCategories = res.data;
    } else {
      apiCategories = [
        { id: "an-vat", name: "Đồ ăn vặt" },
        { id: "nuoc-ngot", name: "Nước giải khát" },
      ];
    }
  } catch (e) {
    console.error(e);
  }
}

async function renderHomeSections() {
  const container = document.getElementById("homeContainer");
  if (!container) return;
  container.innerHTML = "";
  const res = await callAPI("/auth/products?page=0&size=20", "GET", null);

  if (res && res.success) {
    const listData = res.data?.listData || [];
    if (listData.length > 0) {
      const list = listData.slice(0, 12);
      container.insertAdjacentHTML(
        "beforeend",
        `
              <div class="category-section" style="width:100%; background:white; padding:20px; border-radius:4px; margin-bottom:20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                  <div class="section-header" style="border-bottom:1px solid #eee; margin-bottom:15px; padding-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                      <div class="section-title" style="color:#ee4d2d; font-weight:700; text-transform:uppercase; font-size:1.1rem;">
                        <i class="fa-solid fa-fire" style="color:#ee4d2d; margin-right:5px;"></i> GỢI Ý HÔM NAY
                      </div>
                      <a href="../products/index.html" style="color:#ee4d2d; text-decoration:none; font-size:0.9rem;">Xem tất cả ></a>
                  </div>
                  <div class="product-grid" style="display:grid; grid-template-columns: repeat(6, 1fr); gap:10px;">
                      ${list.map((p) => createProductHTML(p)).join("")}
                  </div>
              </div>
          `
      );
    } else {
      container.innerHTML = `<div style="text-align:center; padding: 20px; color: #666;">Chưa có sản phẩm nào</div>`;
    }
  } else {
    container.innerHTML = `<div style="text-align:center; color:red;">Lỗi tải: ${res?.message}</div>`;
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
        <div class="product-card" onclick="window.location.href='../product-detail/index.html?id=${p.productId}'" 
             style="background:white; border:1px solid transparent; border-radius:2px; overflow:hidden; cursor:pointer; position:relative; display:flex; flex-direction:column; transition:transform 0.1s, border-color 0.1s; box-shadow:0 1px 2px rgba(0,0,0,0.1);">
            ${discountBadge}
            <div class="p-img" style="width:100%; padding-top:100%; position:relative; background:#f9f9f9;">
                <img src="${imgUrl}" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:cover;">
            </div>
            <div class="p-info" style="padding:8px; flex:1; display:flex; flex-direction:column; justify-content:space-between;">
                <div class="p-name" title="${p.productName}" style="font-size:0.85rem; color:#333; line-height:1.1rem; margin-bottom:5px; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; min-height:2.2rem;">
                    ${p.productName}
                </div>
                <div style="margin-top:auto;">
                    <span style="color:#ee4d2d; font-size:1rem; font-weight:600;">${priceFormatted}</span>
                </div>
                <div class="p-meta" style="display:flex; align-items:center; justify-content:space-between; margin-top:5px;">
                    <div class="p-rating" style="font-size:0.6rem; color:#ffce3d;">${starsHTML}</div>
                    <div class="p-sold" style="font-size:0.7rem; color:#757575;">Đã bán 99+</div>
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
