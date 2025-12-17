import { loadNavbar } from "../navbar/navbar.js";
import { toggleLoading } from "../public/loader.js";

// Mock Data Danh mục (Giống bên Home)
const CATEGORIES = [
  { id: "an-vat", name: "Đồ ăn vặt", icon: "fa-cookie-bite" },
  { id: "nuoc-ngot", name: "Nước giải khát", icon: "fa-bottle-water" },
  { id: "dong-lanh", name: "Đồ đông lạnh", icon: "fa-snowflake" },
  { id: "mi-tom", name: "Mì ăn liền", icon: "fa-bowl-rice" },
  { id: "gia-dung", name: "Gia dụng", icon: "fa-pump-soap" },
];

document.addEventListener("DOMContentLoaded", async () => {
  toggleLoading(true);

  // 1. Load Navbar (Tự động có Giỏ hàng)
  await loadNavbar({
    // Chỉ cần truyền ô tìm kiếm, không cần truyền giỏ hàng nữa
    centerHTML: `
      <div style="position:relative; width: 100%; max-width: 500px;">
          <input type="text" class="nav-search-input" style="width:100%; padding-left: 20px;" placeholder="Tìm kiếm trong cửa hàng...">
          <i class="fa-solid fa-magnifying-glass" style="position:absolute; right:15px; top:50%; transform:translateY(-50%); color:#10B981;"></i>
      </div>
    `,
  });

  // 2. Render Danh mục bên Sidebar
  renderSidebarCategories();

  // 3. Render Sản phẩm giả
  renderProducts("all");

  toggleLoading(false);
});

// --- LOGIC RENDER ---

function renderSidebarCategories() {
  const list = document.getElementById("catFilterList");
  if (!list) return;

  // Lấy cat từ URL nếu có (ví dụ: products/index.html?cat=an-vat)
  const urlParams = new URLSearchParams(window.location.search);
  const activeCat = urlParams.get("cat") || "all";

  // Render list
  const itemsHTML = CATEGORIES.map(
    (c) => `
        <li class="cat-item ${
          activeCat === c.id ? "active" : ""
        }" onclick="window.location.href='?cat=${c.id}'">
            <i class="fa-solid ${c.icon}" style="width:20px"></i> ${c.name}
        </li>
    `
  ).join("");

  list.insertAdjacentHTML("beforeend", itemsHTML);

  // Update Title trang
  if (activeCat !== "all") {
    const catName = CATEGORIES.find((c) => c.id === activeCat)?.name;
    if (catName) document.getElementById("pageTitle").textContent = catName;
  }
}

function renderProducts(catId) {
  const grid = document.getElementById("productGrid");
  if (!grid) return;

  grid.innerHTML = "";

  // Tạo 12 sản phẩm giả
  for (let i = 1; i <= 12; i++) {
    const price = Math.floor(Math.random() * 200) + 10 + ".000đ";
    grid.insertAdjacentHTML(
      "beforeend",
      `
            <div class="product-card" onclick="alert('Xem chi tiết SP ${i}')">
                <div class="p-img">P-${i}</div>
                <div class="p-info">
                    <div class="p-name">Sản phẩm mẫu số ${i} - Chất lượng cao</div>
                    <div class="p-price">${price}</div>
                    <button class="btn-add-cart" onclick="event.stopPropagation(); alert('Đã thêm vào giỏ!')">
                        <i class="fa-solid fa-cart-plus"></i> Thêm vào giỏ
                    </button>
                </div>
            </div>
        `
    );
  }
}
