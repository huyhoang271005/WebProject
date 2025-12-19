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

// --- HÀM TẠO HTML SẢN PHẨM COMPACT ---
function createProductHTML(p) {
  const imgUrl =
    p.imageUrl || "https://cdn-icons-png.flaticon.com/512/2748/2748558.png";
  const priceFormatted = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(p.price || 0);

  let discountBadge = "";
  let originalPriceHTML = `<div style="height: 16px;"></div>`; // Giữ chỗ nếu ko giảm giá

  if (p.originalPrice && p.originalPrice > p.price) {
    const percent = Math.round(
      ((p.originalPrice - p.price) / p.originalPrice) * 100
    );
    const originalFormatted = new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(p.originalPrice);

    // Nhãn giảm giá góc phải
    discountBadge = `
            <div style="position: absolute; top: 0; right: 0; background: rgba(255, 212, 36, 0.95); color: #b42b2b; 
                        padding: 3px 6px; font-weight: 700; font-size: 0.75rem; border-bottom-left-radius: 8px; z-index: 2;">
                -${percent}%
            </div>
        `;

    // Giá gốc gạch ngang nằm trên
    originalPriceHTML = `
            <div style="text-decoration: line-through; color: #9ca3af; font-size: 0.8rem; line-height: 1;">
                ${originalFormatted}
            </div>`;
  }

  return `
        <div class="product-card" onclick="window.location.href='../product-detail/index.html?id=${p.productId}'" 
             style="position: relative; border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden; background: white; transition: transform 0.2s; cursor: pointer;">
            
            ${discountBadge}
            
            <div class="p-img" style="height: 160px; width: 100%; display: flex; align-items: center; justify-content: center; background: #f9fafb;">
                <img src="${imgUrl}" style="width: 100%; height: 100%; object-fit: contain;">
            </div>
            
            <div class="p-info" style="padding: 8px 10px 12px 10px;">
                <div class="p-name" title="${p.productName}" 
                     style="font-size: 0.9rem; font-weight: 500; color: #333; margin-bottom: 6px; height: 36px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.3;">
                    ${p.productName}
                </div>

                ${originalPriceHTML}

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
                    <span style="color: #ef4444; font-weight: 700; font-size: 1rem;">${priceFormatted}</span>
                    
                    <button onclick="event.stopPropagation(); alert('Đã thêm vào giỏ')" 
                            style="width: 28px; height: 28px; border-radius: 50%; border: 1px solid #10B981; background: #ecfdf5; color: #10B981; 
                                   display: flex; align-items: center; justify-content: center; cursor: pointer; transition: 0.2s;">
                        <i class="fa-solid fa-cart-plus" style="font-size: 0.85rem;"></i>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function setupEvents() {
  const navSearch = document.getElementById("navbarSearchInput");
  const navBtn = document.getElementById("navbarSearchBtn");

  const doSearch = () => {
    currentFilter.keyword = navSearch.value.trim();
    fetchProducts();
  };

  if (navSearch) {
    if (currentFilter.keyword) navSearch.value = currentFilter.keyword;
    navSearch.onkeypress = (e) => {
      if (e.key === "Enter") doSearch();
    };
  }
  if (navBtn) navBtn.onclick = doSearch;

  const sidebarSearch = document.getElementById("sidebarSearch");
  if (sidebarSearch) {
    sidebarSearch.oninput = (e) => {
      currentFilter.keyword = e.target.value.trim();
      if (navSearch) navSearch.value = currentFilter.keyword;
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
  const catName = catId
    ? CATEGORIES.find((c) => c.id === catId)?.name
    : "Tất cả sản phẩm";
  const pageTitle = document.getElementById("pageTitle");
  if (pageTitle) pageTitle.textContent = catName;
  fetchProducts();
};
