import { loadNavbar } from "../navbar/navbar.js";
import { callAPI } from "../public/api.js";
import { toggleLoading } from "../public/loader.js";

const CATEGORIES = [
  { id: "an-vat", name: "Đồ ăn vặt", icon: "fa-cookie-bite" },
  { id: "nuoc-ngot", name: "Nước giải khát", icon: "fa-bottle-water" },
  { id: "dong-lanh", name: "Đồ đông lạnh", icon: "fa-snowflake" },
  { id: "mi-tom", name: "Mì ăn liền", icon: "fa-bowl-rice" },
  { id: "gia-dung", name: "Gia dụng", icon: "fa-pump-soap" },
];

let currentFilter = { keyword: null, categoryId: null };

document.addEventListener("DOMContentLoaded", async () => {
  toggleLoading(true);

  // 1. Load Navbar và chèn ô Search vào giữa
  await loadNavbar({
    centerHTML: `
      <div style="position:relative; width: 100%; max-width: 500px;">
          <input type="text" class="nav-search-input" id="navbarSearchInput" style="width:100%; padding-left: 20px;" placeholder="Tìm kiếm (ví dụ: sữa, snack)...">
          <i class="fa-solid fa-magnifying-glass" id="navbarSearchBtn" style="position:absolute; right:15px; top:50%; transform:translateY(-50%); color:#10B981; cursor:pointer;"></i>
      </div>`,
  });

  // 2. Lấy params từ URL (nếu từ Home nhảy sang)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("cat")) currentFilter.categoryId = urlParams.get("cat");
  if (urlParams.get("search")) currentFilter.keyword = urlParams.get("search");

  renderSidebarCategories();
  setupEvents();

  await fetchProducts();
  toggleLoading(false);
});

async function fetchProducts() {
  const grid = document.getElementById("productGrid");
  if (!grid) return;
  grid.innerHTML =
    '<div style="grid-column: 1/-1; text-align: center;">Đang tải...</div>';

  try {
    let endpoint = "/auth/products";
    const params = [];

    // Mặc định page 0, size 50
    params.push("page=0");
    params.push("size=50");

    if (currentFilter.keyword)
      params.push(`keyword=${encodeURIComponent(currentFilter.keyword)}`);
    if (currentFilter.categoryId && currentFilter.categoryId !== "all") {
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
          '<div style="grid-column: 1/-1; text-align: center; font-size:1.2rem; color:#666; margin-top:50px;">Không tìm thấy sản phẩm nào</div>';
      }
    } else {
      grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color:red;">${
        res?.message || "Lỗi tải dữ liệu"
      }</div>`;
    }
  } catch (e) {
    console.error(e);
    grid.innerHTML =
      '<div style="grid-column: 1/-1; text-align: center; color:red;">Lỗi kết nối Server!</div>';
  }
}

// --- HÀM TẠO HTML SẢN PHẨM (CÓ NHÃN GIẢM GIÁ) ---
function createProductHTML(p) {
  const imgUrl =
    p.imageUrl || "https://cdn-icons-png.flaticon.com/512/2748/2748558.png";
  const priceFormatted = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(p.price || 0);

  // Logic tính % giảm giá
  let discountBadge = "";
  let originalPriceHTML = "";

  // Chỉ hiện nếu có giá gốc và giá gốc > giá bán
  if (p.originalPrice && p.originalPrice > p.price) {
    const percent = Math.round(
      ((p.originalPrice - p.price) / p.originalPrice) * 100
    );
    const originalFormatted = new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(p.originalPrice);

    // Nhãn giảm giá (Badge)
    discountBadge = `
            <div style="position: absolute; top: 10px; right: 10px; background: #EF4444; color: white; 
                        padding: 4px 8px; border-radius: 8px; font-weight: bold; font-size: 0.8rem; 
                        box-shadow: 0 2px 5px rgba(0,0,0,0.2); z-index: 2;">
                -${percent}%
            </div>
        `;

    // Giá gốc bị gạch ngang
    originalPriceHTML = `<span style="text-decoration: line-through; color: #9ca3af; font-size: 0.9rem; margin-right: 5px;">${originalFormatted}</span>`;
  }

  return `
        <div class="product-card" onclick="window.location.href='../product-detail/index.html?id=${p.productId}'" style="position: relative;">
            ${discountBadge}
            <div class="p-img"><img src="${imgUrl}" style="width:100%; height:100%; object-fit:contain;"></div>
            <div class="p-info">
                <div class="p-name" title="${p.productName}">${p.productName}</div>
                <div class="p-price-box" style="margin-top: auto; margin-bottom: 10px;">
                    ${originalPriceHTML}
                    <span style="color: #ef4444; font-weight: 700; font-size: 1.1rem;">${priceFormatted}</span>
                </div>
                <button class="btn-add-cart" onclick="event.stopPropagation(); alert('Đã thêm vào giỏ')">
                    <i class="fa-solid fa-cart-plus"></i> Thêm
                </button>
            </div>
        </div>
    `;
}

// --- HELPER FUNCTIONS ---
function setupEvents() {
  // 1. Bắt sự kiện thanh Search trên Navbar
  const navSearch = document.getElementById("navbarSearchInput");
  const navBtn = document.getElementById("navbarSearchBtn");

  const doSearch = () => {
    // Lấy từ khóa, backend sẽ lo việc có dấu hay không dấu
    currentFilter.keyword = navSearch.value.trim();
    fetchProducts();
  };

  if (navSearch) {
    // Nếu đã có từ khóa (từ url) thì điền vào ô input
    if (currentFilter.keyword) navSearch.value = currentFilter.keyword;

    navSearch.onkeypress = (e) => {
      if (e.key === "Enter") doSearch();
    };
  }
  if (navBtn) navBtn.onclick = doSearch;

  // 2. Ô Tìm nhanh ở Sidebar (nếu bro dùng code sidebar cũ)
  const sidebarSearch = document.getElementById("sidebarSearch");
  if (sidebarSearch) {
    sidebarSearch.oninput = (e) => {
      currentFilter.keyword = e.target.value.trim();
      if (navSearch) navSearch.value = currentFilter.keyword; // Đồng bộ lên trên
      // Debounce đơn giản (chờ 0.5s mới search để đỡ lag)
      clearTimeout(window.searchTimeout);
      window.searchTimeout = setTimeout(() => fetchProducts(), 500);
    };
  }
}

function renderSidebarCategories() {
  const list = document.getElementById("catFilterList");
  if (!list) return;
  let html = `<li class="cat-item ${
    !currentFilter.categoryId ? "active" : ""
  }" onclick="changeCategory(null, this)">Tất cả sản phẩm</li>`;
  html += CATEGORIES.map(
    (c) => `
        <li class="cat-item ${
          currentFilter.categoryId === c.id ? "active" : ""
        }" onclick="changeCategory('${c.id}', this)">
            <i class="fa-solid ${c.icon}" style="width:20px"></i> ${c.name}
        </li>
    `
  ).join("");
  list.innerHTML = html;
}

window.changeCategory = (catId, element) => {
  document
    .querySelectorAll(".cat-item")
    .forEach((el) => el.classList.remove("active"));
  element.classList.add("active");
  currentFilter.categoryId = catId;

  // Đổi tên tiêu đề trang
  const catName = catId
    ? CATEGORIES.find((c) => c.id === catId)?.name
    : "Tất cả sản phẩm";
  const pageTitle = document.getElementById("pageTitle");
  if (pageTitle) pageTitle.textContent = catName;

  fetchProducts();
};
