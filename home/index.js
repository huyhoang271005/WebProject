import { loadNavbar } from "../navbar/navbar.js";
import { callAPI } from "../public/api.js";
import { toggleLoading } from "../public/loader.js";

let apiCategories = [];

document.addEventListener("DOMContentLoaded", async () => {
  toggleLoading(true);
  try {
    // 1. Load Navbar (Giữ nguyên cấu trúc cũ)
    await loadNavbar({
      centerHTML: `
        <div class="nav-cat-btn" id="catBtn">
            <i class="fa-solid fa-bars"></i> <span>Danh mục</span>
            <div class="cat-dropdown" id="catDropdown"></div>
        </div>
        <div style="flex:1; height:40px; background:#f5f5f5; border-radius:8px; padding:0 15px; display:flex; align-items:center; position:relative;">
            <input type="text" class="nav-search-input" id="homeSearch" placeholder="Tìm sản phẩm...">
            <i class="fa-solid fa-magnifying-glass" style="color:#10B981; cursor:pointer;" id="homeSearchBtn"></i>
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

// --- API DANH MỤC ---
async function fetchCategories() {
  try {
    const res = await callAPI("/categories", "GET", null);
    if (res && res.success && Array.isArray(res.data)) {
      apiCategories = res.data;
    } else {
      apiCategories = [{ id: "an-vat", name: "Đồ ăn vặt" }];
    }
  } catch (e) {
    console.error(e);
  }
}

// --- RENDER SẢN PHẨM ---
async function renderHomeSections() {
  const container = document.getElementById("homeContainer");
  if (!container) return;
  container.innerHTML = "";

  // Inject CSS Grid (PC 6 cột, Mobile 2 cột) - Giữ cái này để mobile không bị lỗi
  const style = document.createElement("style");
  style.innerHTML = `
      .home-product-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; }
      @media (max-width: 1200px) { .home-product-grid { grid-template-columns: repeat(4, 1fr); } }
      @media (max-width: 768px) { .home-product-grid { grid-template-columns: repeat(2, 1fr); } }
  `;
  document.head.appendChild(style);

  // Gọi API lấy sản phẩm
  const res = await callAPI("/auth/products?page=0&size=18", "GET", null);

  if (res && res.success) {
    const list = res.data?.listData || [];
    if (list.length > 0) {
      container.insertAdjacentHTML(
        "beforeend",
        `
              <div class="category-section" style="background:white; padding:20px; border-radius:8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                  <div class="section-header" style="border-bottom:1px solid #eee; margin-bottom:15px; padding-bottom:10px; display:flex; justify-content:space-between; align-items:center;">
                      <div class="section-title" style="color:#ee4d2d; font-weight:700; text-transform:uppercase; font-size:1.1rem;">
                        <i class="fa-solid fa-fire" style="color:#ee4d2d;"></i> GỢI Ý HÔM NAY
                      </div>
                      <a href="../products/index.html" style="color:#ee4d2d; text-decoration:none; font-size:0.9rem;">Xem tất cả ></a>
                  </div>
                  <div class="home-product-grid">
                      ${list.map((p) => createProductHTML(p)).join("")}
                  </div>
              </div>
          `
      );
    } else {
      container.innerHTML = `<div style="text-align:center; padding:20px;">Chưa có sản phẩm nào</div>`;
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
            <div style="position:absolute; top:0; right:0; background:rgba(255,212,36,.95); width:36px; height:32px; text-align:center; padding-top:2px; font-weight:700; font-size:0.7rem; z-index:2;">
                <span style="color:#ee4d2d;">${percent}%</span>
                <div style="color:white; font-size:0.6rem;">GIẢM</div>
            </div>`;
  }

  return `
        <div class="product-card" onclick="window.location.href='../product-detail/index.html?id=${p.productId}'" 
             style="background:white; cursor:pointer; position:relative; display:flex; flex-direction:column; border:1px solid transparent; transition:0.2s;">
            ${discountBadge}
            <div class="p-img" style="width:100%; padding-top:100%; position:relative;">
                <img src="${imgUrl}" style="position:absolute; top:0; left:0; width:100%; height:100%; object-fit:contain;">
            </div>
            <div class="p-info" style="padding:8px;">
                <div class="p-name" style="font-size:0.9rem; color:#333; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; height:2.4rem;">${p.productName}</div>
                <div style="margin-top:5px; color:#ee4d2d; font-weight:600;">${priceFormatted}</div>
                <div style="font-size:0.7rem; color:#888; margin-top:5px;">Đã bán 99+</div>
            </div>
            <style>.product-card:hover { border:1px solid #ee4d2d; box-shadow:0 2px 10px rgba(0,0,0,0.1); transform:translateY(-2px); }</style>
        </div>
    `;
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
        <a href="../products/index.html?cat=${c.id}"><i class="fa-solid fa-caret-right"></i> ${c.name}</a>
    `
    )
    .join("");
}
