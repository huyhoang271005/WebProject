import { showDialog } from "../dialog/index.js";
import { callAPI } from "../public/api.js";

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
  priceFrom: 0,
  priceTo: 999999999,
};

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Check User & Quyền (Logic giống Home)
  try {
    const profile = await callAPI("/profile");
    if (profile && profile.success) {
      const user = profile.data;
      if (user.imageUrl)
        document.getElementById("navAvatar").src = user.imageUrl;
      if (user.username)
        document.getElementById("welcomeName").textContent = user.username;

      // Hiển thị chức năng Admin
      if (user.roleName === "ADMIN" || user.role === "ADMIN") {
        document
          .querySelectorAll(".admin-only")
          .forEach((el) => (el.style.display = "flex")); // flex cho link navbar
      }
    } else {
      window.location.replace("../auth/login");
      return;
    }
  } catch (e) {
    console.error(e);
  }

  // 2. Data & UI
  allProducts = generateMockProducts();
  renderSidebarCats();
  renderNavbarCats();

  // 3. URL Params
  const params = new URLSearchParams(window.location.search);
  currentFilter.catId = params.get("cat") || "all";
  currentFilter.searchMain = params.get("search") || "";
  if (currentFilter.searchMain)
    document.getElementById("mainSearch").value = currentFilter.searchMain;

  applyFilters();
});

// --- LOGIC LỌC ---
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
  filtered = filtered.filter(
    (p) =>
      p.rawPrice >= currentFilter.priceFrom &&
      p.rawPrice <= currentFilter.priceTo
  );

  const catName =
    CATEGORIES.find((c) => c.id === currentFilter.catId)?.name || "Sản phẩm";
  document.getElementById("pageTitle").textContent = currentFilter.searchMain
    ? `Tìm kiếm: "${currentFilter.searchMain}"`
    : catName;

  renderGrid(filtered);
  updateSidebarActive();
}

// --- RENDER ---
function renderGrid(products) {
  const grid = document.getElementById("productGrid");
  if (products.length === 0) {
    grid.innerHTML =
      '<div style="grid-column:1/-1; text-align:center; padding:50px;">Không có sản phẩm</div>';
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
                    <button class="btn-cart-add" onclick="event.stopPropagation(); alert('Thêm giỏ')"><i class="fa-solid fa-cart-plus"></i></button>
                </div>
            </div>
        </div>
    `
    )
    .join("");
}

// --- MOCK DATA ---
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
        rawPrice: rawPrice,
        price: rawPrice.toLocaleString("vi-VN") + "đ",
        sold: Math.floor(Math.random() * 2000),
      });
    }
  });
  return arr.sort(() => Math.random() - 0.5);
}

// --- EVENTS ---
// Navbar Search
document.getElementById("mainSearchBtn").onclick = () => {
  currentFilter.searchMain = document.getElementById("mainSearch").value.trim();
  currentFilter.catId = "all";
  applyFilters();
};

// Sidebar Search
document.getElementById("sidebarSearch").oninput = (e) => {
  currentFilter.searchSidebar = e.target.value.trim();
  applyFilters();
};

// Logout
document.getElementById("logout").onclick = async () => {
  await showDialog("question", "Đăng xuất?", async () => {
    await callAPI("/logout");
    localStorage.setItem("rememberUser", "false");
    window.location.replace("../auth/login");
  });
};

// Dropdowns
document.getElementById("catBtn").onclick = (e) => {
  e.stopPropagation();
  document.getElementById("catDropdown").classList.toggle("show");
  document.getElementById("userDropdown").classList.remove("show");
};
document.getElementById("userMenuBtn").onclick = (e) => {
  e.stopPropagation();
  document.getElementById("userDropdown").classList.toggle("show");
  document.getElementById("catDropdown").classList.remove("show");
};
document.onclick = () =>
  document
    .querySelectorAll(".show")
    .forEach((el) => el.classList.remove("show"));

// Render Helpers
function renderSidebarCats() {
  document.getElementById("catFilterList").innerHTML = CATEGORIES.map(
    (c) =>
      `<li class="cat-item" data-id="${c.id}" onclick="changeCat('${c.id}')">${c.name}</li>`
  ).join("");
}
function renderNavbarCats() {
  document.getElementById("catDropdown").innerHTML = CATEGORIES.filter(
    (c) => c.id !== "all"
  )
    .map(
      (c) =>
        `<a href="?cat=${c.id}"><i class="fa-solid ${c.icon}"></i> ${c.name}</a>`
    )
    .join("");
}
window.changeCat = (id) => {
  currentFilter.catId = id;
  currentFilter.searchMain = "";
  document.getElementById("mainSearch").value = "";
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
