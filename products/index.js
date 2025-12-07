import { callAPI } from "../public/api.js";

// --- CẤU HÌNH ---
const IS_TEST_MODE = true;
const TEST_ROLE = "ADMIN";

const CATEGORIES = [
  { id: "all", name: "Tất cả sản phẩm", icon: "fa-globe" },
  { id: "an-vat", name: "Đồ ăn vặt", icon: "fa-cookie-bite" },
  { id: "nuoc-ngot", name: "Nước giải khát", icon: "fa-bottle-water" },
  { id: "dong-lanh", name: "Đồ đông lạnh", icon: "fa-snowflake" },
  { id: "mi-tom", name: "Mì ăn liền", icon: "fa-bowl-rice" },
  { id: "gia-dung", name: "Đồ gia dụng", icon: "fa-pump-soap" },
  { id: "van-phong", name: "Văn phòng phẩm", icon: "fa-pen-ruler" },
];

let allProducts = [];
let currentFilter = {
  catId: "all",
  searchMain: "",
  searchSidebar: "",
  priceFrom: 0,
  priceTo: 999999999,
};

(async () => {
  // 1. Setup User
  let user;
  if (IS_TEST_MODE) {
    user = { username: "Admin", roleName: TEST_ROLE, imageUrl: "" };
  } else {
    const profile = await callAPI("/profile");
    if (profile.success) user = profile.data;
  }
  if (user) {
    if (user.imageUrl) document.getElementById("navAvatar").src = user.imageUrl;
    if (user.roleName === "ADMIN" || user.role === "ADMIN") {
      document
        .querySelectorAll(".admin-only")
        .forEach((el) => (el.style.display = "flex"));
    }
  }

  // 2. Data & UI
  allProducts = generateMockProducts();
  renderSidebarCats();
  renderNavbarCats();

  // 3. URL Params
  const params = new URLSearchParams(window.location.search);
  currentFilter.catId = params.get("cat") || "all";
  currentFilter.searchMain = params.get("search") || "";

  if (currentFilter.searchMain) {
    document.getElementById("mainSearch").value = currentFilter.searchMain;
  }

  applyFilters();
})();

// --- LOGIC LỌC KẾT HỢP ---
function applyFilters() {
  let filtered = allProducts;

  // 1. Lọc Danh mục
  if (currentFilter.catId !== "all") {
    filtered = filtered.filter((p) => p.catId === currentFilter.catId);
  }

  // 2. Lọc Search Chính
  if (currentFilter.searchMain) {
    filtered = filtered.filter((p) =>
      p.name.toLowerCase().includes(currentFilter.searchMain.toLowerCase())
    );
    document.getElementById("sidebarSearch").value = "";
  }
  // 3. Lọc Search Sidebar
  else if (currentFilter.searchSidebar) {
    filtered = filtered.filter((p) =>
      p.name.toLowerCase().includes(currentFilter.searchSidebar.toLowerCase())
    );
  }

  // 4. Lọc Giá
  filtered = filtered.filter(
    (p) =>
      p.rawPrice >= currentFilter.priceFrom &&
      p.rawPrice <= currentFilter.priceTo
  );

  updateTitle();
  renderGrid(filtered);
  updateSidebarActive();
}

function updateTitle() {
  if (currentFilter.searchMain) {
    document.getElementById(
      "pageTitle"
    ).textContent = `Tìm kiếm: "${currentFilter.searchMain}"`;
    return;
  }
  const catName =
    CATEGORIES.find((c) => c.id === currentFilter.catId)?.name || "Sản phẩm";
  document.getElementById("pageTitle").textContent = catName;
}

// --- HÀM RENDER GRID ---
function renderGrid(products) {
  const grid = document.getElementById("productGrid");

  if (products.length === 0) {
    grid.innerHTML =
      '<div style="grid-column:1/-1; text-align:center; padding:50px; color:#888;">Không tìm thấy sản phẩm nào!</div>';
    return;
  }

  grid.innerHTML = products
    .map(
      (p) => `
        <div class="product-card" onclick="alert('Chuyển sang trang chi tiết: ${
          p.name
        }')">
            <div class="p-img">
                ${p.name.charAt(0)}
            </div>
            <div class="p-body">
                <div class="p-cat">${p.catName}</div>
                <div class="p-name" title="${p.name}">${p.name}</div>
                
                <div class="p-price">${p.price}</div>
                <div class="p-sold">Đã bán ${formatSold(p.sold)}</div>

                <div class="p-actions">
                    <button class="btn-buy-now" onclick="event.stopPropagation(); alert('Chuyển đến trang Thanh Toán ngay!')">
                        Mua ngay
                    </button>
                    <button class="btn-cart-add" onclick="event.stopPropagation(); alert('Đã thêm ${
                      p.name
                    } vào giỏ!')">
                        <i class="fa-solid fa-cart-plus"></i>
                    </button>
                </div>
            </div>
        </div>
    `
    )
    .join("");
}

// Hàm format số lượng bán
function formatSold(num) {
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "k";
  }
  return num;
}

// --- MOCK DATA ---
function generateMockProducts() {
  const products = [];
  const catsOnly = CATEGORIES.filter((c) => c.id !== "all");
  catsOnly.forEach((cat) => {
    for (let i = 1; i <= 15; i++) {
      const rawPrice = (Math.floor(Math.random() * 200) + 10) * 1000;
      const extraName =
        cat.id === "van-phong" && i % 3 === 0 ? "(Miku Edition)" : "";

      products.push({
        id: `${cat.id}-${i}`,
        catId: cat.id,
        catName: cat.name,
        name: `${cat.name} - Món đặc biệt ${i} ${extraName}`,
        rawPrice: rawPrice,
        price: rawPrice.toLocaleString("vi-VN") + "đ",
        sold: Math.floor(Math.random() * 5000),
      });
    }
  });
  return products.sort(() => Math.random() - 0.5);
}

// --- SỰ KIỆN ---
window.changeCategory = (id) => {
  currentFilter.catId = id;
  currentFilter.searchMain = "";
  document.getElementById("mainSearch").value = "";
  applyFilters();
};

document.getElementById("sidebarSearch").addEventListener("input", (e) => {
  currentFilter.searchSidebar = e.target.value.trim();
  currentFilter.searchMain = "";
  applyFilters();
});

document.getElementById("mainSearchBtn").onclick = () => {
  currentFilter.searchMain = document.getElementById("mainSearch").value.trim();
  currentFilter.catId = "all";
  applyFilters();
};

document.getElementById("btnFilterPrice").onclick = () => {
  const from = document.getElementById("priceFrom").value;
  const to = document.getElementById("priceTo").value;
  currentFilter.priceFrom = from ? parseInt(from) : 0;
  currentFilter.priceTo = to ? parseInt(to) : 999999999;
  applyFilters();
};

function renderSidebarCats() {
  document.getElementById("catFilterList").innerHTML = CATEGORIES.map(
    (cat) => `
        <li class="cat-item" data-id="${cat.id}" onclick="changeCategory('${cat.id}')">
            ${cat.name}
        </li>
    `
  ).join("");
}
function updateSidebarActive() {
  document
    .querySelectorAll(".cat-item")
    .forEach((el) => el.classList.remove("active"));
  document
    .querySelector(`.cat-item[data-id="${currentFilter.catId}"]`)
    ?.classList.add("active");
}
function renderNavbarCats() {
  document.getElementById("catDropdown").innerHTML = CATEGORIES.filter(
    (c) => c.id !== "all"
  )
    .map(
      (cat) =>
        `<a href="#" onclick="changeCategory('${cat.id}')"><i class="fa-solid ${cat.icon}"></i> ${cat.name}</a>`
    )
    .join("");
}

document.getElementById("catBtn").onclick = (e) => {
  e.stopPropagation();
  document.getElementById("catDropdown").classList.toggle("show");
};
document.getElementById("userMenuBtn").onclick = (e) => {
  e.stopPropagation();
  document.getElementById("userDropdown").classList.toggle("show");
};
document.onclick = () => {
  document
    .querySelectorAll(".show")
    .forEach((el) => el.classList.remove("show"));
};
