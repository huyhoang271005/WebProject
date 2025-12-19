import { loadNavbar } from "../navbar/navbar.js";
import { callAPI } from "../public/api.js";
import { toggleLoading } from "../public/loader.js";

let categoriesData = [];
let currentFilter = { keyword: null, categoryId: null };

document.addEventListener("DOMContentLoaded", async () => {
  toggleLoading(true);

  await loadNavbar({
    centerHTML: `
      <div style="position:relative; width: 100%; max-width: 500px;">
          <input type="text" class="nav-search-input" id="navbarSearchInput" style="width:100%; padding-left: 20px;" placeholder="Tìm kiếm...">
          <i class="fa-solid fa-magnifying-glass" id="navbarSearchBtn" style="position:absolute; right:15px; top:50%; transform:translateY(-50%); color:#10B981; cursor:pointer;"></i>
      </div>`,
  });

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("cat")) currentFilter.categoryId = urlParams.get("cat");
  if (urlParams.get("search")) currentFilter.keyword = urlParams.get("search");

  await fetchCategories();
  renderSidebarCategories();
  setupEvents();
  await fetchProducts();
  toggleLoading(false);
});

async function fetchCategories() {
  try {
    const res = await callAPI("/auth/category", "GET", null);
    if (res && res.success && Array.isArray(res.data)) {
      categoriesData = res.data;
    } else {
      categoriesData = [
        { id: "an-vat", name: "Đồ ăn vặt" },
        { id: "nuoc-ngot", name: "Nước giải khát" },
      ];
    }
  } catch (e) {
    console.error("Lỗi danh mục:", e);
  }
}

async function fetchProducts() {
  const grid = document.getElementById("productGrid");
  if (!grid) return;
  grid.innerHTML =
    '<div style="grid-column:1/-1; text-align:center; padding:40px; color:#666;">Đang tải...</div>';

  try {
    let endpoint = "/auth/products";
    const params = ["page=0", "size=50"];

    if (currentFilter.keyword)
      params.push(`keyword=${encodeURIComponent(currentFilter.keyword)}`);
    if (
      currentFilter.categoryId &&
      currentFilter.categoryId !== "all" &&
      currentFilter.categoryId !== "other"
    ) {
      params.push(`categoryId=${encodeURIComponent(currentFilter.categoryId)}`);
    }

    if (params.length > 0) endpoint += "?" + params.join("&");

    const res = await callAPI(endpoint, "GET", null);
    grid.innerHTML = "";

    if (res && res.success) {
      const list = res.data?.listData || [];
      if (list.length > 0) {
        grid.innerHTML = list.map((p) => createProductHTML(p)).join("");
      } else {
        grid.innerHTML =
          '<div style="grid-column:1/-1; text-align:center; padding:50px;">Không tìm thấy sản phẩm</div>';
      }
    } else {
      grid.innerHTML = `<div style="text-align:center; color:red;">${res?.message}</div>`;
    }
  } catch (e) {
    grid.innerHTML =
      '<div style="text-align:center; color:red;">Lỗi kết nối!</div>';
  }
}

// --- THẺ SẢN PHẨM: KHÔNG NÚT GIỎ HÀNG, GIÁ GỐC NHỎ ---
function createProductHTML(p) {
  const imgUrl =
    p.imageUrl || "https://cdn-icons-png.flaticon.com/512/2748/2748558.png";
  const priceFormatted = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(p.price || 0);

  let discountBadge = "";
  let originalPriceHTML = "";

  if (p.originalPrice && p.originalPrice > p.price) {
    const percent = Math.round(
      ((p.originalPrice - p.price) / p.originalPrice) * 100
    );
    const originalFormatted = new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(p.originalPrice);

    discountBadge = `<div style="position:absolute; top:0; right:0; background:#FFD424; color:#d0021b; padding:3px 6px; font-weight:800; font-size:0.7rem; border-bottom-left-radius:8px; z-index:2;">-${percent}%</div>`;
    originalPriceHTML = `<span style="text-decoration:line-through; color:#9ca3af; font-size:0.75rem; margin-right:6px;">${originalFormatted}</span>`;
  }

  const rating = p.ratingAvg || 5;
  const starsHTML = renderStars(rating);

  return `
        <div class="product-card" onclick="window.location.href='../product-detail/index.html?id=${p.productId}'" 
             style="position:relative; border-radius:8px; border:1px solid #f3f4f6; overflow:hidden; background:white; transition:all 0.2s; cursor:pointer; box-shadow:0 1px 2px rgba(0,0,0,0.05);">
            ${discountBadge}
            <div class="p-img" style="height:160px; display:flex; align-items:center; justify-content:center; background:#fff; border-bottom:1px solid #f9f9f9;">
                <img src="${imgUrl}" style="width:100%; height:100%; object-fit:contain; padding:10px;">
            </div>
            <div class="p-info" style="padding:10px;">
                <div class="p-name" title="${p.productName}" style="font-size:0.9rem; font-weight:500; color:#333; margin-bottom:4px; height:36px; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; line-height:1.3;">
                    ${p.productName}
                </div>
                <div style="margin-bottom:6px; font-size:0.7rem; color:#fbbf24; display:flex; align-items:center;">
                    ${starsHTML} <span style="color:#9ca3af; margin-left:4px;">(99+)</span>
                </div>
                <div style="display:flex; align-items:baseline;">
                    ${originalPriceHTML}
                    <span style="color:#ef4444; font-weight:700; font-size:1rem;">${priceFormatted}</span>
                </div>
            </div>
        </div>
    `;
}

function renderStars(rating) {
  let html = "";
  for (let i = 1; i <= 5; i++) {
    if (i <= rating) html += '<i class="fa-solid fa-star"></i>';
    else if (i - 0.5 <= rating)
      html += '<i class="fa-solid fa-star-half-stroke"></i>';
    else html += '<i class="fa-regular fa-star" style="color:#e5e7eb"></i>';
  }
  return html;
}

function renderSidebarCategories() {
  const list = document.getElementById("catFilterList");
  if (!list) return;
  let html = `<li class="cat-item ${
    !currentFilter.categoryId ? "active" : ""
  }" onclick="changeCategory(null, this)"><i class="fa-solid fa-border-all"></i> Tất cả</li>`;
  html += categoriesData
    .map(
      (c) =>
        `<li class="cat-item ${
          currentFilter.categoryId === c.id ? "active" : ""
        }" onclick="changeCategory('${
          c.id
        }', this)"><i class="fa-solid fa-caret-right"></i> ${c.name}</li>`
    )
    .join("");
  html += `<li class="cat-item ${
    currentFilter.categoryId === "other" ? "active" : ""
  }" onclick="changeCategory('other', this)"><i class="fa-solid fa-ellipsis"></i> Khác</li>`;
  list.innerHTML = html;
}

function setupEvents() {
  const navSearch = document.getElementById("navbarSearchInput");
  const sidebarSearch = document.getElementById("sidebarSearch");
  const doSearch = (val) => {
    currentFilter.keyword = val.trim();
    fetchProducts();
  };

  if (navSearch)
    navSearch.onkeypress = (e) => {
      if (e.key === "Enter") doSearch(navSearch.value);
    };
  if (sidebarSearch)
    sidebarSearch.oninput = (e) => {
      clearTimeout(window.searchTimeout);
      window.searchTimeout = setTimeout(() => doSearch(e.target.value), 500);
    };
}

window.changeCategory = (catId, element) => {
  document
    .querySelectorAll(".cat-item")
    .forEach((el) => el.classList.remove("active"));
  element.classList.add("active");
  currentFilter.categoryId = catId;
  fetchProducts();
};
