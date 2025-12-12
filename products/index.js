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

// CẤU HÌNH PHÂN TRANG
const ITEMS_PER_PAGE = 50;
let currentPage = 1;

document.addEventListener("DOMContentLoaded", async () => {
  await loadNavbar({
    centerHTML: `
            <div class="nav-cat-btn" onclick="window.location.href='../home/index.html'">
                <i class="fa-solid fa-bars"></i> <span>Home</span>
            </div>
            <div style="position:relative;">
                <input type="text" class="nav-search-input" id="prodSearch" placeholder="Tìm sản phẩm toàn hệ thống...">
                <i class="fa-solid fa-magnifying-glass" style="position:absolute; right:15px; top:50%; transform:translateY(-50%); color:#10B981; cursor:pointer;" id="prodSearchBtn"></i>
            </div>
        `,
    rightHTML: `
            <a href="#" class="nav-icon-link" title="Thông báo"><i class="fa-regular fa-bell"></i><span class="badge">2</span></a>
            <a href="../cart" class="nav-icon-link" title="Giỏ hàng"><i class="fa-solid fa-cart-shopping"></i><span class="badge">3</span></a>
        `,
  });

  // Tạo dữ liệu giả nhiều (300 món) để test phân trang
  allProducts = generateMockProducts(300);
  renderSidebarCats();

  const params = new URLSearchParams(window.location.search);
  currentFilter.catId = params.get("cat") || "all";
  currentFilter.searchMain = params.get("search") || "";
  if (currentFilter.searchMain) {
    const input = document.getElementById("prodSearch");
    if (input) input.value = currentFilter.searchMain;
  }

  applyFilters();
  setupNavbarEvents();
});

function setupNavbarEvents() {
  const searchInput = document.getElementById("prodSearch");
  const searchBtn = document.getElementById("prodSearchBtn");
  const doSearch = () => {
    currentFilter.searchMain = searchInput.value.trim();
    currentFilter.catId = "all";
    currentPage = 1; // Reset về trang 1 khi tìm kiếm
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

  // Render Title
  const catName =
    CATEGORIES.find((c) => c.id === currentFilter.catId)?.name || "Sản phẩm";
  document.getElementById("pageTitle").textContent = currentFilter.searchMain
    ? `Tìm kiếm: "${currentFilter.searchMain}"`
    : catName;

  // --- PHÂN TRANG LOGIC ---
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

  // Đảm bảo trang hiện tại hợp lệ
  if (currentPage > totalPages) currentPage = 1;
  if (totalPages > 0 && currentPage < 1) currentPage = 1;

  // Cắt mảng sản phẩm
  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const itemsToShow = filtered.slice(start, end);

  renderGrid(itemsToShow);
  renderPagination(totalPages); // Vẽ nút phân trang
  updateSidebarActive();
}

function renderPagination(totalPages) {
  // Nếu <= 1 trang thì không cần hiện nút
  if (totalPages <= 1) {
    document.getElementById("paginationTop").innerHTML = "";
    document.getElementById("paginationBottom").innerHTML = "";
    return;
  }

  const createBtn = (page, text, isActive = false, isDisabled = false) => {
    return `<div class="page-btn ${isActive ? "active" : ""} ${
      isDisabled ? "disabled" : ""
    }" onclick="goToPage(${page})">${text}</div>`;
  };

  let html = "";
  // Nút Prev
  html += createBtn(
    currentPage - 1,
    '<i class="fa-solid fa-chevron-left"></i>',
    false,
    currentPage === 1
  );

  // Các nút số trang
  for (let i = 1; i <= totalPages; i++) {
    html += createBtn(i, i, i === currentPage);
  }

  // Nút Next
  html += createBtn(
    currentPage + 1,
    '<i class="fa-solid fa-chevron-right"></i>',
    false,
    currentPage === totalPages
  );

  // Render ra 2 vị trí
  document.getElementById("paginationTop").innerHTML = html;
  document.getElementById("paginationBottom").innerHTML = html;
}

// Hàm chuyển trang (Gán vào window để HTML gọi được)
window.goToPage = (page) => {
  currentPage = page;
  applyFilters();
  // Cuộn lên đầu vùng content
  document.querySelector(".content-area").scrollTop = 0;
};

function renderGrid(products) {
  const grid = document.getElementById("productGrid");
  if (products.length === 0) {
    grid.innerHTML =
      '<div style="grid-column:1/-1; text-align:center; padding:50px;">Không tìm thấy sản phẩm nào!</div>';
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

function generateMockProducts(count = 100) {
  let arr = [];
  const cats = CATEGORIES.filter((c) => c.id !== "all");
  cats.forEach((c) => {
    // Tạo nhiều sản phẩm để test phân trang
    for (let i = 1; i <= count / cats.length + 10; i++) {
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
  currentPage = 1; // Reset trang khi đổi danh mục
  applyFilters();
};

document.getElementById("sidebarSearch").oninput = (e) => {
  currentFilter.searchSidebar = e.target.value.trim();
  currentPage = 1;
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
