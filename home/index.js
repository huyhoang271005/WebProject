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

  // [FIX] Truyền page & size vào URL
  const res = await callAPI("/auth/products?page=0&size=20", "GET", null);

  if (res && res.success) {
    // [FIX] Lấy data từ listData
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

function createProductHTML(p) {
  // [FIX] Map đúng tên trường từ JSON: imageUrl, productName, productId
  const imgUrl =
    p.imageUrl || "https://cdn-icons-png.flaticon.com/512/2748/2748558.png";
  const priceFormatted = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(p.price || 0);

  return `
        <div class="product-card" onclick="window.location.href='../product-detail/index.html?id=${p.productId}'">
            <div class="p-img"><img src="${imgUrl}" style="width:100%; height:100%; object-fit:contain;"></div>
            <div class="p-info">
                <div class="p-name" title="${p.productName}">${p.productName}</div>
                <div class="p-price">${priceFormatted}</div>
            </div>
        </div>
    `;
}

// ... Helper functions giữ nguyên
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
