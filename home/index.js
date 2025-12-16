import { loadNavbar } from "../navbar/navbar.js";
import { callAPI } from "../public/api.js";
import { getLoader } from "../public/public.js";

const CATEGORIES = [
  { id: "an-vat", name: "Đồ ăn vặt", icon: "fa-cookie-bite" },
  { id: "nuoc-ngot", name: "Nước giải khát", icon: "fa-bottle-water" },
  { id: "dong-lanh", name: "Đồ đông lạnh", icon: "fa-snowflake" },
  { id: "mi-tom", name: "Mì ăn liền", icon: "fa-bowl-rice" },
  { id: "gia-dung", name: "Gia dụng", icon: "fa-pump-soap" },
];

const toggleLoading = (show) => {
  const el = document.getElementById("loadingOverlay");
  if (el) el.style.display = show ? "flex" : "none";
};

document.addEventListener("DOMContentLoaded", async () => {
  toggleLoading(true);

  // 1. Load Navbar
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
        </div>
      `,
      rightHTML: `<a href="../cart" class="nav-icon-link" title="Giỏ hàng"><i class="fa-solid fa-cart-shopping"></i><span class="badge">0</span></a>`,
    });

    renderNavCategories();
    setupNavbarEvents();
  } catch (e) {
    console.error("Lỗi Navbar:", e);
  }

  // 2. Render Home (Không đợi Navbar)
  try {
    renderHomeSections();
  } catch (e) {
    console.error("Lỗi Home:", e);
  }

  setTimeout(() => toggleLoading(false), 500);
});

// --- HELPERS ---
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
}

function renderNavCategories() {
  const el = document.getElementById("catDropdown");
  if (el) {
    el.innerHTML = CATEGORIES.map(
      (c) =>
        `<a href="../products/index.html?cat=${c.id}"><i class="fa-solid ${c.icon}"></i> ${c.name}</a>`
    ).join("");
  }
}

function renderHomeSections() {
  const container = document.getElementById("homeContainer");
  if (!container) return;
  const products = generateMockProducts();
  container.innerHTML = "";

  CATEGORIES.forEach((cat) => {
    const list = products.filter((p) => p.catId === cat.id).slice(0, 5);
    if (list.length > 0) {
      container.insertAdjacentHTML(
        "beforeend",
        `
        <div class="category-section">
            <div class="section-header">
                <div class="section-title"><i class="fa-solid ${
                  cat.icon
                }" style="color:#10B981"></i> ${cat.name}</div>
                <a href="../products/index.html?cat=${
                  cat.id
                }" class="btn-see-more">Xem thêm <i class="fa-solid fa-arrow-right"></i></a>
            </div>
            <div class="product-grid-5">
                ${list
                  .map(
                    (p) => `
                    <div class="product-card" onclick="alert('Xem: ${p.name}')">
                        <div class="p-img">${p.name.charAt(0)}</div>
                        <div class="p-info">
                            <div class="p-name">${p.name}</div>
                            <div class="p-price">${p.price}</div>
                        </div>
                    </div>
                `
                  )
                  .join("")}
            </div>
        </div>
      `
      );
    }
  });
}

function generateMockProducts() {
  let arr = [];
  CATEGORIES.forEach((c) => {
    for (let i = 1; i <= 10; i++) {
      arr.push({
        catId: c.id,
        name: `${c.name} - Món số ${i}`,
        price: Math.floor(Math.random() * 200) + 10 + ".000đ",
      });
    }
  });
  return arr;
}
