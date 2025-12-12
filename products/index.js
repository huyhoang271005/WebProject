// Import từ navbar của bạn kia
import { loadNavbar } from "../navbar/navbar.js";

const CATEGORIES = [
  { id: "all", name: "Tất cả sản phẩm", icon: "fa-globe" },
  { id: "an-vat", name: "Đồ ăn vặt", icon: "fa-cookie-bite" },
  { id: "nuoc-ngot", name: "Nước giải khát", icon: "fa-bottle-water" },
  { id: "dong-lanh", name: "Đồ đông lạnh", icon: "fa-snowflake" },
  { id: "mi-tom", name: "Mì ăn liền", icon: "fa-bowl-rice" },
  { id: "gia-dung", name: "Gia dụng", icon: "fa-pump-soap" },
];

let allProducts = [];
let currentFilter = { catId: "all", searchMain: "", searchSidebar: "" };

document.addEventListener("DOMContentLoaded", async () => {
  // 1. GỌI NAVBAR VÀ TRUYỀN HTML RIÊNG CỦA TRANG NÀY VÀO
  await loadNavbar({
    // Nhét Tìm kiếm + Danh mục vào giữa
    centerHTML: `
            <div class="nav-cat-btn" onclick="window.location.href='../home/index.html'">
                <i class="fa-solid fa-bars"></i> <span>Home</span>
            </div>
            <div style="position:relative;">
                <input type="text" class="nav-search-input" id="prodSearch" placeholder="Tìm sản phẩm toàn hệ thống...">
                <i class="fa-solid fa-magnifying-glass" style="position:absolute; right:15px; top:50%; transform:translateY(-50%); color:#10B981; cursor:pointer;" id="prodSearchBtn"></i>
            </div>
        `,
    // Nhét Giỏ hàng + Chuông vào bên phải
    rightHTML: `
            <a href="#" class="nav-icon-link" title="Thông báo">
                <i class="fa-regular fa-bell"></i><span class="badge">2</span>
            </a>
            <a href="../cart" class="nav-icon-link" title="Giỏ hàng">
                <i class="fa-solid fa-cart-shopping"></i><span class="badge">3</span>
            </a>
        `,
  });

  // 2. Logic Data
  allProducts = generateMockProducts();
  renderSidebarCats();

  // 3. Xử lý URL (Lọc nếu có params)
  const params = new URLSearchParams(window.location.search);
  currentFilter.catId = params.get("cat") || "all";
  currentFilter.searchMain = params.get("search") || "";
  if (currentFilter.searchMain) {
    // Điền lại vào ô tìm kiếm vừa tạo trên navbar
    const input = document.getElementById("prodSearch");
    if (input) input.value = currentFilter.searchMain;
  }

  applyFilters();

  // 4. Gán sự kiện cho thanh Search trên Navbar (Vì giờ nó mới được tạo ra)
  setupNavbarEvents();
});

// --- CÁC HÀM LOGIC ---

function setupNavbarEvents() {
  const searchInput = document.getElementById("prodSearch");
  const searchBtn = document.getElementById("prodSearchBtn");

  const doSearch = () => {
    currentFilter.searchMain = searchInput.value.trim();
    currentFilter.catId = "all"; // Reset danh mục để tìm toàn bộ
    applyFilters();
  };

  if (searchBtn) searchBtn.onclick = doSearch;
  if (searchInput)
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") doSearch();
    });
}

function applyFilters() {
  let filtered = allProducts;
  if (currentFilter.catId !== "all")
    filtered = filtered.filter((p) => p.catId === currentFilter.catId);
  if (currentFilter.searchMain)
    filtered = filtered.filter((p) =>
      p.name.toLowerCase().includes(currentFilter.searchMain.toLowerCase())
    );
  if (currentFilter.searchSidebar)
    filtered = filtered.filter((p) =>
      p.name.toLowerCase().includes(currentFilter.searchSidebar.toLowerCase())
    );

  const catName =
    CATEGORIES.find((c) => c.id === currentFilter.catId)?.name || "Sản phẩm";
  document.getElementById("pageTitle").textContent = currentFilter.searchMain
    ? `Tìm kiếm: "${currentFilter.searchMain}"`
    : catName;

  renderGrid(filtered);
  updateSidebarActive();
}

function renderGrid(products) {
  const grid = document.getElementById("productGrid");
  if (products.length === 0) {
    grid.innerHTML =
      '<div style="grid-column:1/-1; text-align:center; padding:50px;">Không có sản phẩm nào!</div>';
    return;
  }

  grid.innerHTML = products
    .map(
      (p) => `
        <div class="product-card" onclick="alert('Chi tiết: ${p.name}')">
            <div class="p-img">${p.name.charAt(0)}</div>
            <div class="p-body">
                <div class="p-cat">${p.catName}</div>
                <div class="p-name" title="${p.name}">${p.name}</div>
                <div class="p-price">${p.price}</div>
                <div class="p-sold">Đã bán ${p.sold}</div>
                <div class="p-actions">
                    <button class="btn-buy-now" onclick="event.stopPropagation(); alert('Mua ngay')">Mua ngay</button>
                    <button class="btn-cart-add" onclick="event.stopPropagation(); alert('Đã thêm')"><i class="fa-solid fa-cart-plus"></i></button>
                </div>
            </div>
        </div>
    `
    )
    .join("");
}

function generateMockProducts() {
  let arr = [];
  const cats = CATEGORIES.filter((c) => c.id !== "all");
  cats.forEach((c) => {
    for (let i = 1; i <= 15; i++) {
      const rawPrice = (Math.floor(Math.random() * 200) + 10) * 1000;
      arr.push({
        catId: c.id,
        catName: c.name,
        name: `${c.name} - Món số ${i}`,
        price: rawPrice.toLocaleString("vi-VN") + "đ",
        sold: Math.floor(Math.random() * 2000),
      });
    }
  });
  return arr.sort(() => Math.random() - 0.5);
}

function renderSidebarCats() {
  document.getElementById("catFilterList").innerHTML = CATEGORIES.map(
    (c) =>
      `<li class="cat-item" data-id="${c.id}" onclick="changeCat('${c.id}')">${c.name}</li>`
  ).join("");
}

window.changeCat = (id) => {
  currentFilter.catId = id;
  currentFilter.searchMain = "";
  document.getElementById("prodSearch").value = "";
  applyFilters();
};
document.getElementById("sidebarSearch").oninput = (e) => {
  currentFilter.searchSidebar = e.target.value.trim();
  applyFilters();
};

function updateSidebarActive() {
  document
    .querySelectorAll(".cat-item")
    .forEach((el) => el.classList.remove("active"));
  document
    .querySelector(`.cat-item[data-id="${currentFilter.catId}"]`)
    ?.classList.add("active");
}
