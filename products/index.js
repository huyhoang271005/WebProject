import { loadNavbar } from "../navbar/navbar.js";
import { callAPI } from "../lib/api.js";
import { toggleLoading } from "../lib/loader.js";

// Trạng thái trang
let state = {
  page: 0,
  size: 12,
  productName: "",
  categoryId: null,
  sort: "productId,desc",
  isLoading: false,
};

document.addEventListener("DOMContentLoaded", async () => {
  toggleLoading(true);

  // 1. Lấy tham số URL
  const params = new URLSearchParams(window.location.search);
  if (params.get("search")) state.productName = params.get("search");
  if (params.get("cat")) state.categoryId = params.get("cat");

  try {
    await loadNavbar({
      centerHTML: `
        <div style="position:relative; width:100%; max-width:500px; display:flex; align-items:center;">
            <input type="text" class="nav-search-input" id="navSearch" placeholder="Tìm kiếm sản phẩm..." 
                style="width:100%; padding:10px 15px 10px 20px; border-radius:20px; border:1px solid #e5e7eb; outline:none; background:#f9fafb;">
            <i class="fa-solid fa-magnifying-glass" id="navSearchBtn" 
               style="position:absolute; right:15px; color:#10B981; cursor:pointer;"></i>
        </div>`,
    });

    // 3. [FIX CHÍNH XÁC] Chạy tuần tự các API dữ liệu.
    // KHÔNG DÙNG Promise.all để tránh đua refresh token nếu navbar cache.

    await fetchCategories(); // Chạy trước

    await fetchProducts(); // Chạy sau khi cái trên đã xong (token an toàn)

    // 4. Sync dữ liệu vào ô tìm kiếm (Lúc này HTML Navbar đã có)
    if (state.productName) {
      const searchInput = document.getElementById("navSearch");
      if (searchInput) searchInput.value = state.productName;
      const title = document.getElementById("pageTitle");
      if (title) title.innerHTML = `Kết quả tìm: "${state.productName}"`;
    }

    setupEvents();
  } catch (e) {
    console.error("Lỗi tải trang sản phẩm:", e);
  } finally {
    toggleLoading(false);
  }
});

// --- API ---
async function fetchProducts() {
  if (state.isLoading) return;
  state.isLoading = true;
  const grid = document.getElementById("productGrid");

  if (grid && state.page === 0)
    grid.innerHTML =
      '<div style="grid-column:1/-1;text-align:center;padding:40px;"><i class="fa-solid fa-spinner fa-spin fa-2x" style="color:#10B981"></i></div>';

  try {
    let url = `/products?page=${state.page}&size=${state.size}`;

    if (state.productName)
      url += `&productName=${encodeURIComponent(state.productName)}`;
    if (state.categoryId && state.categoryId !== "all")
      url += `&categoryId=${state.categoryId}`;
    if (state.sort) url += `&sort=${state.sort}`;

    const res = await callAPI(url, "GET");
    if (res && res.success) {
      const data = res.data;
      const list = data.listData || (Array.isArray(data) ? data : []) || [];
      const totalPages = data.totalPage || 1;

      if (state.page > 0) {
        const content = document.querySelector(".product-content");
        if (content) content.scrollIntoView({ behavior: "smooth" });
      }

      renderGrid(list);
      renderPagination(totalPages);
    } else {
      if (grid)
        grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:red;">${
          res.message || "Lỗi tải dữ liệu"
        }</div>`;
    }
  } catch (e) {
    if (grid)
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;">Lỗi kết nối Server</div>`;
  } finally {
    state.isLoading = false;
  }
}

// ... (Các hàm renderGrid, renderStars, fetchCategories, setupEvents... GIỮ NGUYÊN NHƯ CŨ) ...
// (Bro chỉ cần copy phần setupEvents, renderGrid... từ code cũ vào dưới đây là được)

function renderGrid(products) {
  const grid = document.getElementById("productGrid");
  if (!grid) return;
  if (products.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:50px;color:#666;"><i class="fa-solid fa-box-open" style="font-size:3rem; color:#e5e7eb; margin-bottom:10px;"></i><br>Không tìm thấy sản phẩm nào</div>`;
    return;
  }

  grid.innerHTML = products
    .map((p) => {
      const img =
        p.imageUrl || "https://cdn-icons-png.flaticon.com/512/2748/2748558.png";
      const price = new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
      }).format(p.price);

      let badge = "";
      let originalPriceHTML = "";
      if (p.originalPrice && p.originalPrice > p.price) {
        const percent = Math.round(
          ((p.originalPrice - p.price) / p.originalPrice) * 100
        );
        badge = `<div class="discount-badge"><span>${percent}%</span><span class="discount-text">GIẢM</span></div>`;
        const origin = new Intl.NumberFormat("vi-VN", {
          style: "currency",
          currency: "VND",
        }).format(p.originalPrice);
        originalPriceHTML = `<div class="p-origin-price">${origin}</div>`;
      }

      const starsHTML = renderStars(p.ratingAvg || 0);
      const salesText = p.totalSales > 0 ? `Đã bán ${p.totalSales}` : "";

      // [CLEAN URL] Đã bỏ index.html
      return `
      <div class="product-card" onclick="window.location.href='../product-detail/?id=${p.productId}'">
        ${badge}
        <div class="p-img"><img src="${img}" loading="lazy" alt="${p.productName}"></div>
        <div class="p-info">
          <div class="p-name" title="${p.productName}">${p.productName}</div>
          <div class="p-meta-price"><div class="p-price">${price}</div>${originalPriceHTML}</div>
          <div class="p-meta-bottom"><div class="p-rating">${starsHTML}</div><div class="p-sold">${salesText}</div></div>
        </div>
      </div>`;
    })
    .join("");
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

async function fetchCategories() {
  const listEl = document.getElementById("catFilterList");
  if (!listEl) return;
  try {
    const res = await callAPI("/categories", "GET");
    let cats = [];
    if (res && res.success)
      cats = Array.isArray(res.data) ? res.data : res.data.listData || [];

    if (cats.length === 0) listEl.innerHTML = `<li class="cat-item">Trống</li>`;
    else {
      let html = `<li class="cat-item ${
        !state.categoryId ? "active" : ""
      }" onclick="filterByCat(null, this)"><i class="fa-solid fa-circle-notch"></i> Tất cả</li>`;
      html += cats
        .map(
          (c) =>
            `<li class="cat-item ${
              state.categoryId == (c.categoryId || c.id) ? "active" : ""
            }" onclick="filterByCat('${
              c.categoryId || c.id
            }', this)"><i class="fa-solid fa-caret-right"></i> ${
              c.categoryName || c.name
            }</li>`
        )
        .join("");
      listEl.innerHTML = html;
    }
  } catch (e) {
    listEl.innerHTML = "<li>Lỗi tải</li>";
  }
}

function setupEvents() {
  const navSearch = document.getElementById("navSearch");
  const navSearchBtn = document.getElementById("navSearchBtn");
  const doSearch = () => {
    if (!navSearch) return;
    state.productName = navSearch.value.trim();
    state.page = 0;
    const title = document.getElementById("pageTitle");
    if (title)
      title.innerText = state.productName
        ? `Tìm: "${state.productName}"`
        : "Tất cả sản phẩm";
    fetchProducts();
  };
  if (navSearch) {
    navSearch.addEventListener("keyup", (e) => {
      if (e.key === "Enter") doSearch();
    });
  }
  if (navSearchBtn) {
    navSearchBtn.onclick = doSearch;
  }
  const sortSelect = document.querySelector(".ph-sort select");
  if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
      const val = e.target.value;
      if (val === "Mới nhất") state.sort = "productId,desc";
      else if (val === "Giá tăng dần") state.sort = "price,asc";
      else if (val === "Giá giảm dần") state.sort = "price,desc";
      state.page = 0;
      fetchProducts();
    });
  }
}

window.filterByCat = (catId, el) => {
  document
    .querySelectorAll(".cat-item")
    .forEach((i) => i.classList.remove("active"));
  el.classList.add("active");
  state.categoryId = catId;
  state.page = 0;
  state.productName = "";
  const navSearch = document.getElementById("navSearch");
  if (navSearch) navSearch.value = "";
  document.getElementById("pageTitle").innerText = el.innerText.trim();
  fetchProducts();
  if (window.innerWidth < 992) toggleSidebar();
};

window.changePage = (page) => {
  if (page < 0) return;
  state.page = page;
  fetchProducts();
};

window.toggleSidebar = () => {
  const sidebar = document.getElementById("mainSidebar");
  const overlay = document.getElementById("sidebarOverlay");
  if (sidebar) sidebar.classList.toggle("active");
  if (overlay) overlay.classList.toggle("active");
  if (sidebar && sidebar.classList.contains("active"))
    document.body.style.overflow = "hidden";
  else document.body.style.overflow = "";
};

function renderPagination(totalPages) {
  const container = document.getElementById("pagination");
  if (!container) return;
  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }
  let html = "";
  html += `<div class="page-btn ${
    state.page === 0 ? "disabled" : ""
  }" onclick="changePage(${
    state.page - 1
  })"><i class="fa-solid fa-chevron-left"></i></div>`;
  for (let i = 0; i < totalPages; i++) {
    if (
      i === 0 ||
      i === totalPages - 1 ||
      (i >= state.page - 1 && i <= state.page + 1)
    ) {
      html += `<div class="page-btn ${
        i === state.page ? "active" : ""
      }" onclick="changePage(${i})">${i + 1}</div>`;
    } else if (i === state.page - 2 || i === state.page + 2) {
      html += `<div class="page-dots">...</div>`;
    }
  }
  html += `<div class="page-btn ${
    state.page === totalPages - 1 ? "disabled" : ""
  }" onclick="changePage(${
    state.page + 1
  })"><i class="fa-solid fa-chevron-right"></i></div>`;
  container.innerHTML = html;
}
