import { callAPI } from "../public/api.js";

const CATEGORIES = [
  { id: "all", name: "Tất cả sản phẩm" },
  { id: "an-vat", name: "Đồ ăn vặt" },
  { id: "nuoc-ngot", name: "Nước giải khát" },
  { id: "dong-lanh", name: "Đồ đông lạnh" },
  { id: "mi-tom", name: "Mì ăn liền" },
  { id: "gia-dung", name: "Gia dụng" },
];

let allProducts = [];
let currentFilter = { catId: "all", searchMain: "", searchSidebar: "" };

(async () => {
  // 1. Check User (Để lấy avatar)
  try {
    const profile = await callAPI("/profile");
    if (!profile.success) {
      window.location.replace("../auth/login");
      return;
    }
  } catch (e) {}

  // 2. Data
  allProducts = generateMockProducts();
  renderSidebarCats();

  // 3. URL
  const params = new URLSearchParams(window.location.search);
  currentFilter.catId = params.get("cat") || "all";
  currentFilter.searchMain = params.get("search") || "";
  if (currentFilter.searchMain)
    document.getElementById("mainSearch").value = currentFilter.searchMain;

  applyFilters();
})();

function applyFilters() {
  let filtered = allProducts;

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

  // Render
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
      '<div style="grid-column:1/-1; text-align:center; padding:50px;">Không có sản phẩm</div>';
    return;
  }

  grid.innerHTML = products
    .map(
      (p) => `
        <div class="product-card" onclick="alert('${p.name}')">
            <div class="p-img">${p.name.charAt(0)}</div>
            <div class="p-body">
                <div class="p-cat">${p.catName}</div>
                <div class="p-name">${p.name}</div>
                <div class="p-price">${p.price}</div>
                <div class="p-sold">Đã bán ${p.sold}</div>
                <div class="p-actions">
                    <button class="btn-buy-now" onclick="event.stopPropagation(); alert('Mua')">Mua ngay</button>
                    <button class="btn-cart-add" onclick="event.stopPropagation(); alert('Add Cart')"><i class="fa-solid fa-cart-plus"></i></button>
                </div>
            </div>
        </div>
    `
    )
    .join("");
}

function generateMockProducts() {
  const products = [];
  const cats = CATEGORIES.filter((c) => c.id !== "all");
  cats.forEach((c) => {
    for (let i = 1; i <= 15; i++) {
      products.push({
        id: `${c.id}-${i}`,
        catId: c.id,
        catName: c.name,
        name: `${c.name} - Món số ${i}`,
        price: Math.floor(Math.random() * 200) + 10 + ".000đ",
        sold: Math.floor(Math.random() * 2000),
      });
    }
  });
  return products.sort(() => Math.random() - 0.5);
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
  document.getElementById("mainSearch").value = "";
  applyFilters();
};
document.getElementById("sidebarSearch").oninput = (e) => {
  currentFilter.searchSidebar = e.target.value.trim();
  applyFilters();
};
document.getElementById("mainSearchBtn").onclick = () => {
  currentFilter.searchMain = document.getElementById("mainSearch").value.trim();
  currentFilter.catId = "all";
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
