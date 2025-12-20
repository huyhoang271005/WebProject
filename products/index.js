import { loadNavbar } from "../navbar/navbar.js";
import { callAPI } from "../public/api.js";
import { toggleLoading } from "../public/loader.js";

// Biến toàn cục
let categoriesData = [];
// Cấu hình filter: page bắt đầu từ 0, size 20 (để chia hết cho 5 cột đẹp)
let currentFilter = {
  keyword: null,
  categoryId: null,
  page: 0,
  size: 20,
  totalPages: 1,
};

document.addEventListener("DOMContentLoaded", async () => {
  toggleLoading(true);

  // 1. Load Navbar (Có thanh tìm kiếm ở giữa)
  await loadNavbar({
    centerHTML: `
      <div style="position:relative; width: 100%; max-width: 500px;">
          <input type="text" class="nav-search-input" id="navbarSearchInput" style="width:100%; padding-left: 20px;" placeholder="Tìm kiếm sản phẩm...">
          <i class="fa-solid fa-magnifying-glass" id="navbarSearchBtn" style="position:absolute; right:15px; top:50%; transform:translateY(-50%); color:#10B981; cursor:pointer;"></i>
      </div>`,
  });

  // 2. Lấy tham số từ URL (nếu có)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("cat")) currentFilter.categoryId = urlParams.get("cat");
  if (urlParams.get("search")) currentFilter.keyword = urlParams.get("search");
  if (urlParams.get("page"))
    currentFilter.page = parseInt(urlParams.get("page"));

  // 3. Chạy các luồng dữ liệu
  await fetchCategories(); // Lấy danh mục
  renderSidebarCategories(); // Vẽ sidebar
  setupEvents(); // Gắn sự kiện tìm kiếm
  await fetchProducts(); // Lấy sản phẩm

  toggleLoading(false);
});

// --- API: LẤY DANH MỤC (SỐ NHIỀU) ---
async function fetchCategories() {
  try {
    const res = await callAPI("/auth/categories", "GET", null);
    if (res && res.success && Array.isArray(res.data)) {
      categoriesData = res.data;
    } else {
      // Dữ liệu giả nếu API tạch
      categoriesData = [
        { id: "an-vat", name: "Đồ ăn vặt" },
        { id: "nuoc-ngot", name: "Nước giải khát" },
      ];
    }
  } catch (e) {
    console.error("Lỗi danh mục:", e);
  }
}

// --- API: LẤY SẢN PHẨM ---
async function fetchProducts() {
  const grid = document.getElementById("productGrid");
  const pagination = document.getElementById("pagination");
  if (!grid) return;

  // Hiển thị loading trong grid
  grid.innerHTML =
    '<div style="grid-column:1/-1; text-align:center; padding:40px; color:#666;"><i class="fa-solid fa-circle-notch fa-spin"></i> Đang tải sản phẩm...</div>';

  try {
    let endpoint = "/auth/products";
    const params = [];
    params.push(`page=${currentFilter.page}`);
    params.push(`size=${currentFilter.size}`);

    if (currentFilter.keyword)
      params.push(`keyword=${encodeURIComponent(currentFilter.keyword)}`);

    // Lọc theo danh mục (loại bỏ 'all' và 'other' nếu logic frontend tự quy định)
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

      // Tính toán tổng số trang
      if (res.data?.totalPages !== undefined) {
        currentFilter.totalPages = res.data.totalPages;
      } else {
        // Fallback tính tay
        currentFilter.totalPages =
          list.length < currentFilter.size
            ? currentFilter.page + 1
            : currentFilter.page + 2;
      }

      if (list.length > 0) {
        grid.innerHTML = list.map((p) => createProductHTML(p)).join("");
        renderPagination();
      } else {
        grid.innerHTML =
          '<div style="grid-column:1/-1; text-align:center; padding:50px; color:#888; font-style:italic;">Không tìm thấy sản phẩm nào</div>';
        pagination.innerHTML = "";
      }
    } else {
      grid.innerHTML = `<div style="text-align:center; color:red;">${
        res?.message || "Lỗi tải dữ liệu"
      }</div>`;
    }
  } catch (e) {
    grid.innerHTML =
      '<div style="text-align:center; color:red;">Lỗi kết nối Server!</div>';
  }
}

// --- HTML: THẺ SẢN PHẨM (STYLE SHOPEE) ---
function createProductHTML(p) {
  const imgUrl =
    p.imageUrl || "https://cdn-icons-png.flaticon.com/512/2748/2748558.png";
  const priceFormatted = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(p.price || 0);

  // 1. Badge Giảm giá (Vàng cam)
  let discountBadge = "";
  if (p.originalPrice && p.originalPrice > p.price) {
    const percent = Math.round(
      ((p.originalPrice - p.price) / p.originalPrice) * 100
    );
    discountBadge = `
            <div style="position:absolute; top:0; right:0; background-color: rgba(255,212,36,.95); width:40px; height:36px; text-align:center; padding-top:4px; font-weight:700; font-size:0.75rem; z-index:2;">
                <span style="color:#ee4d2d;">${percent}%</span>
                <div style="color:white; text-transform:uppercase; font-size:0.6rem;">GIẢM</div>
                <div style="position:absolute; bottom:-4px; left:0; border-width:0 20px 4px; border-style:solid; border-color:transparent rgba(255,212,36,.95); width:0;"></div>
            </div>`;
  }

  // 2. Rating & Sold
  const rating = p.ratingAvg || 0;
  const starsHTML = renderStars(rating);
  const soldCount = "88"; // Fake số liệu cho đẹp (chờ API soldCount)

  // 3. Render Card
  return `
        <div class="product-card" onclick="window.location.href='../product-detail/index.html?id=${p.productId}'">
            ${discountBadge}
            
            <div class="p-img">
                <img src="${imgUrl}" alt="${p.productName}" loading="lazy">
            </div>
            
            <div class="p-info">
                <div class="p-name" title="${p.productName}">${p.productName}</div>
                
                <div style="margin-top:auto;">
                    <span style="color:#ee4d2d; font-size:1.1rem; font-weight:600;">${priceFormatted}</span>
                </div>
                
                <div class="p-meta">
                    <div class="p-rating">${starsHTML}</div>
                    <div class="p-sold">Đã bán ${soldCount}</div>
                </div>
            </div>
        </div>
    `;
}

// --- HELPER: VẼ NGÔI SAO ---
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

// --- HELPER: PHÂN TRANG ---
function renderPagination() {
  const el = document.getElementById("pagination");
  if (!el) return;

  // Ẩn nếu chỉ có 1 trang
  if (currentFilter.totalPages <= 1) {
    el.innerHTML = "";
    return;
  }

  let html = "";
  const curr = currentFilter.page;
  const total = currentFilter.totalPages;

  // Nút Prev
  html += `<div class="page-btn ${
    curr === 0 ? "disabled" : ""
  }" onclick="gotoPage(${
    curr - 1
  })"><i class="fa-solid fa-chevron-left"></i></div>`;

  // Logic hiển thị số trang rút gọn
  let start = Math.max(0, curr - 2);
  let end = Math.min(total - 1, curr + 2);

  if (start > 0) {
    html += `<div class="page-btn" onclick="gotoPage(0)">1</div>`;
    if (start > 1) html += `<div class="page-dots">...</div>`;
  }

  for (let i = start; i <= end; i++) {
    html += `<div class="page-btn ${
      i === curr ? "active" : ""
    }" onclick="gotoPage(${i})">${i + 1}</div>`;
  }

  if (end < total - 1) {
    if (end < total - 2) html += `<div class="page-dots">...</div>`;
    html += `<div class="page-btn" onclick="gotoPage(${
      total - 1
    })">${total}</div>`;
  }

  // Nút Next
  html += `<div class="page-btn ${
    curr >= total - 1 ? "disabled" : ""
  }" onclick="gotoPage(${
    curr + 1
  })"><i class="fa-solid fa-chevron-right"></i></div>`;

  el.innerHTML = html;
}

window.gotoPage = (page) => {
  if (
    page < 0 ||
    page >= currentFilter.totalPages ||
    page === currentFilter.page
  )
    return;
  currentFilter.page = page;
  window.scrollTo({ top: 0, behavior: "smooth" }); // Cuộn lên đầu mượt mà
  fetchProducts();
};

// --- HELPER: RENDER DANH MỤC SIDEBAR ---
function renderSidebarCategories() {
  const list = document.getElementById("catFilterList");
  if (!list) return;

  let html = `<li class="cat-item ${
    !currentFilter.categoryId ? "active" : ""
  }" onclick="changeCategory(null, this)"><i class="fa-solid fa-border-all"></i> Tất cả</li>`;

  html += categoriesData
    .map(
      (c) => `
        <li class="cat-item ${
          currentFilter.categoryId === c.id ? "active" : ""
        }" onclick="changeCategory('${c.id}', this)">
            <i class="fa-solid fa-caret-right"></i> ${c.name}
        </li>
    `
    )
    .join("");

  html += `<li class="cat-item ${
    currentFilter.categoryId === "other" ? "active" : ""
  }" onclick="changeCategory('other', this)"><i class="fa-solid fa-ellipsis"></i> Khác</li>`;

  list.innerHTML = html;
}

// --- HELPER: SỰ KIỆN ---
function setupEvents() {
  const navSearch = document.getElementById("navbarSearchInput");
  const sidebarSearch = document.getElementById("sidebarSearch");

  const doSearch = (val) => {
    currentFilter.keyword = val.trim();
    currentFilter.page = 0; // Reset về trang đầu
    fetchProducts();
  };

  // Tìm kiếm trên Navbar
  if (navSearch)
    navSearch.onkeypress = (e) => {
      if (e.key === "Enter") doSearch(navSearch.value);
    };

  // Tìm kiếm trên Sidebar (Debounce)
  if (sidebarSearch)
    sidebarSearch.oninput = (e) => {
      clearTimeout(window.searchTimeout);
      window.searchTimeout = setTimeout(() => doSearch(e.target.value), 500);
    };
}

// Hàm đổi danh mục (gắn vào window để gọi từ HTML)
window.changeCategory = (catId, element) => {
  document
    .querySelectorAll(".cat-item")
    .forEach((el) => el.classList.remove("active"));
  element.classList.add("active");

  currentFilter.categoryId = catId;
  currentFilter.page = 0; // Reset về trang đầu
  fetchProducts();
};
