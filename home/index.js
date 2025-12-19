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
    renderNavCategories();
    setupNavbarEvents();
    await renderHomeSections();
  } catch (e) {
    console.error(e);
  } finally {
    setTimeout(() => toggleLoading(false), 500);
  }
});

async function renderHomeSections() {
  const container = document.getElementById("homeContainer");
  if (!container) return;
  container.innerHTML = "";

  const res = await callAPI("/auth/products?page=0&size=20", "GET", null);

  if (res && res.success) {
    const listData = res.data?.listData || [];
    if (listData.length > 0) {
      const list = listData.slice(0, 10);
      container.insertAdjacentHTML(
        "beforeend",
        `
              <div class="category-section">
                  <div class="section-header">
                      <div class="section-title"><i class="fa-solid fa-fire" style="color:#10B981"></i> Sản phẩm mới nhất</div>
                      <a href="../products/index.html" class="btn-see-more">Xem tất cả <i class="fa-solid fa-arrow-right"></i></a>
                  </div>
                  <div class="product-grid-5">
                      ${list.map((p) => createProductHTML(p)).join("")}
                  </div>
              </div>
          `
      );
    } else {
      container.innerHTML = `<div style="text-align:center; padding: 20px; color: #666;">Chưa có sản phẩm nào</div>`;
    }
  }
}

// Hàm này giống hệt bên products/index.js
function createProductHTML(p) {
  const imgUrl =
    p.imageUrl || "https://cdn-icons-png.flaticon.com/512/2748/2748558.png";
  const priceFormatted = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(p.price || 0);

  let discountBadge = "";
  let originalPriceHTML = `<div style="height: 16px;"></div>`;

  if (p.originalPrice && p.originalPrice > p.price) {
    const percent = Math.round(
      ((p.originalPrice - p.price) / p.originalPrice) * 100
    );
    const originalFormatted = new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(p.originalPrice);

    discountBadge = `
            <div style="position: absolute; top: 0; right: 0; background: rgba(255, 212, 36, 0.95); color: #b42b2b; 
                        padding: 3px 6px; font-weight: 700; font-size: 0.75rem; border-bottom-left-radius: 8px; z-index: 2;">
                -${percent}%
            </div>
        `;
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
  if (el)
    el.innerHTML = CATEGORIES.map(
      (c) =>
        `<a href="../products/index.html?cat=${c.id}"><i class="fa-solid ${c.icon}"></i> ${c.name}</a>`
    ).join("");
}
