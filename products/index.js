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
let currentFilter = {
  catId: "all",
  searchMain: "",
  searchSidebar: "",
  sort: "newest",
};

// CẤU HÌNH PHÂN TRANG (50 món/trang)
const ITEMS_PER_PAGE = 50;
let currentPage = 1;

document.addEventListener("DOMContentLoaded", async () => {
  // 1. GỌI NAVBAR (Y chang trang Home)
  await loadNavbar({
    centerHTML: `
            <div class="nav-cat-btn" id="catBtn">
                <i class="fa-solid fa-bars"></i> <span>Danh mục</span>
                <div class="cat-dropdown" id="catDropdown"></div>
            </div>
            <div style="position:relative;">
                <input type="text" class="nav-search-input" id="prodSearch" placeholder="Tìm sản phẩm...">
                <i class="fa-solid fa-magnifying-glass" style="position:absolute; right:15px; top:50%; transform:translateY(-50%); color:#10B981; cursor:pointer;" id="prodSearchBtn"></i>
            </div>
        `,
    rightHTML: `
            <a href="#" class="nav-icon-link"><i class="fa-regular fa-bell"></i><span class="badge">2</span></a>
            <a href="../cart" class="nav-icon-link"><i class="fa-solid fa-cart-shopping"></i><span class="badge">3</span></a>
        `,
  });

  // 2. TẠO DỮ LIỆU & RENDER
  allProducts = generateMockProducts(300); // 300 món để test phân trang
  renderNavCategories();
  renderSidebarCats();

  // 3. XỬ LÝ URL & LỌC
  const params = new URLSearchParams(window.location.search);
  currentFilter.catId = params.get("cat") || "all";
  currentFilter.searchMain = params.get("search") || "";
  if (currentFilter.searchMain && document.getElementById("prodSearch")) {
    document.getElementById("prodSearch").value = currentFilter.searchMain;
  }

  applyFilters();
  setupEvents();
});

function setupEvents() {
  // Dropdown Navbar
  const catBtn = document.getElementById("catBtn");
  const catDropdown = document.getElementById("catDropdown");
  if (catBtn) {
    catBtn.onclick = (e) => {
      e.stopPropagation();
      catDropdown.classList.toggle("show");
    };
    document.addEventListener("click", () =>
      catDropdown.classList.remove("show")
    );
  }

  // Search Navbar
  const searchInput = document.getElementById("prodSearch");
  const searchBtn = document.getElementById("prodSearchBtn");
  const doSearch = () => {
    currentFilter.searchMain = searchInput.value.trim();
    currentFilter.catId = "all";
    currentPage = 1;
    applyFilters();
  };
  if (searchBtn) searchBtn.onclick = doSearch;
  if (searchInput)
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") doSearch();
    });

  // Sort
  const sortSelect = document.getElementById("sortSelect");
  if (sortSelect) {
    sortSelect.onchange = (e) => {
      currentFilter.sort = e.target.value;
      applyFilters();
    };
  }
}

function applyFilters() {
  let filtered = [...allProducts];

  // Lọc
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

  // Sắp xếp
  if (currentFilter.sort === "price_asc")
    filtered.sort((a, b) => a.rawPrice - b.rawPrice);
  else if (currentFilter.sort === "price_desc")
    filtered.sort((a, b) => b.rawPrice - a.rawPrice);

  // Tiêu đề
  const catName =
    CATEGORIES.find((c) => c.id === currentFilter.catId)?.name || "Sản phẩm";
  document.getElementById("pageTitle").textContent = currentFilter.searchMain
    ? `Kết quả: "${currentFilter.searchMain}"`
    : catName;

  // Phân trang
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  if (currentPage > totalPages) currentPage = 1;
  if (totalPages > 0 && currentPage < 1) currentPage = 1;

  const start = (currentPage - 1) * ITEMS_PER_PAGE;
  const end = start + ITEMS_PER_PAGE;
  const itemsToShow = filtered.slice(start, end);

  renderGrid(itemsToShow);
  renderPagination(totalPages);
  updateSidebarActive();
}

function renderPagination(totalPages) {
  if (totalPages <= 1) {
    document.getElementById("paginationTop").innerHTML = "";
    document.getElementById("paginationBottom").innerHTML = "";
    return;
  }

  const createBtn = (page, text, isActive = false) =>
    `<div class="page-btn ${
      isActive ? "active" : ""
    }" onclick="goToPage(${page})">${text}</div>`;

  let html = "";
  // Prev
  if (currentPage > 1)
    html += createBtn(
      currentPage - 1,
      '<i class="fa-solid fa-chevron-left"></i>'
    );

  // Pages
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - 1 && i <= currentPage + 1)
    ) {
      html += createBtn(i, i, i === currentPage);
    } else if (i === currentPage - 2 || i === currentPage + 2) {
      html += `<div class="page-btn disabled" style="border:none;">...</div>`;
    }
  }

  // Next
  if (currentPage < totalPages)
    html += createBtn(
      currentPage + 1,
      '<i class="fa-solid fa-chevron-right"></i>'
    );

  document.getElementById("paginationTop").innerHTML = html;
  document.getElementById("paginationBottom").innerHTML = html;
}

window.goToPage = (page) => {
  currentPage = page;
  applyFilters();
  document.querySelector(".content-area").scrollTop = 0;
};

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
        <div class="product-card" onclick="alert('${p.name}')">
            <div class="p-img">${p.name.charAt(0)}</div>
            <div class="p-body">
                <div class="p-name">${p.name}</div>
                <div class="p-price">${p.price}</div>
                <div class="p-sold">Đã bán ${p.sold}</div>
                <button class="btn-buy-now">Mua ngay</button>
            </div>
        </div>
    `
    )
    .join("");
}

function renderNavCategories() {
  document.getElementById("catDropdown").innerHTML = CATEGORIES.map(
    (c) =>
      `<a href="?cat=${c.id}"><i class="fa-solid ${c.icon}"></i> ${c.name}</a>`
  ).join("");
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
  currentPage = 1;
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

function generateMockProducts(count) {
  let arr = [];
  const cats = CATEGORIES.filter((c) => c.id !== "all");
  cats.forEach((c) => {
    for (let i = 1; i <= count / cats.length + 10; i++) {
      const rawPrice = (Math.floor(Math.random() * 200) + 10) * 1000;
      arr.push({
        catId: c.id,
        catName: c.name,
        name: `${c.name} - Món số ${i}`,
        rawPrice: rawPrice,
        price: rawPrice.toLocaleString("vi-VN") + "đ",
        sold: Math.floor(Math.random() * 2000),
      });
    }
  });
  return arr.sort(() => Math.random() - 0.5);
}
