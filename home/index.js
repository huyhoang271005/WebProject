import { loadNavbar } from "../navbar/navbar.js";
import { callAPI, connectSse } from "../public/api.js";
import { getLoader } from "../public/public.js";

const CATEGORIES = [
  { id: "an-vat", name: "Đồ ăn vặt", icon: "fa-cookie-bite" },
  { id: "nuoc-ngot", name: "Nước giải khát", icon: "fa-bottle-water" },
  { id: "dong-lanh", name: "Đồ đông lạnh", icon: "fa-snowflake" },
  { id: "mi-tom", name: "Mì ăn liền", icon: "fa-bowl-rice" },
  { id: "gia-dung", name: "Gia dụng", icon: "fa-pump-soap" },
];

document.addEventListener("DOMContentLoaded", async () => {
  // 1. GỌI NAVBAR CUSTOM CHO HOME
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
    rightHTML: `
            <a href="#" class="nav-icon-link" title="Thông báo">
                <i class="fa-regular fa-bell"></i><span class="badge">2</span>
            </a>
            <a href="../cart" class="nav-icon-link" title="Giỏ hàng">
                <i class="fa-solid fa-cart-shopping"></i><span class="badge">3</span>
            </a>
        `,
  });

  // 2. LOGIC SAU KHI NAVBAR ĐÃ LOAD
  renderNavCategories();
  setupNavbarEvents();
  checkAdminDisplay();

  // 3. Render nội dung chính
  renderHomeSections();

  // 4. SSE
  try {
    connectSse("/sse", (data) => {
      if (data.success) showToast("Thông báo", data.message);
    });
  } catch (e) {}
});

// --- HELPER FUNCTIONS ---

async function checkAdminDisplay() {
  if (sessionStorage.getItem("roleName") === "ADMIN") {
    // Hiện thanh Admin Toolbar ở body
    document
      .querySelectorAll(".admin-only")
      .forEach((el) => (el.style.display = "flex"));
  }
}

function setupNavbarEvents() {
  // Dropdown Danh mục
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

  // Search
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
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") doSearch();
    });
}

function renderNavCategories() {
  const el = document.getElementById("catDropdown");
  if (el)
    el.innerHTML = CATEGORIES.map(
      (c) =>
        `<a href="../products/index.html?cat=${c.id}"><i class="fa-solid ${c.icon}"></i> ${c.name}</a>`
    ).join("");
}

function renderHomeSections() {
  const container = document.getElementById("homeContainer");
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
                        <div class="product-card" onclick="alert('Chi tiết: ${
                          p.name
                        }')">
                            <div class="p-img">${p.name.charAt(0)}</div>
                            <div class="p-info">
                                <div class="p-name" title="${p.name}">${
                          p.name
                        }</div>
                                <div class="p-price">${p.price}</div>
                            </div>
                        </div>
                    `
                      )
                      .join("")}
                </div>
            </div>`
      );
    }
  });
}

function generateMockProducts() {
  let arr = [];
  CATEGORIES.forEach((c) => {
    for (let i = 1; i <= 10; i++)
      arr.push({
        catId: c.id,
        name: `${c.name} - Món số ${i}`,
        price: Math.floor(Math.random() * 200) + 10 + ".000đ",
      });
  });
  return arr;
}

// Logic Gửi thông báo
const sendAllBtn = document.getElementById("sendAll");
if (sendAllBtn) {
  sendAllBtn.onclick = async () => {
    const msg = document.getElementById("message").value.trim();
    if (!msg) return;
    await getLoader("sendAll", async () => {
      const res = await callAPI("/sse/broadcast", "POST", {
        success: true,
        message: msg,
        data: null,
      });
      if (res.success) {
        document.getElementById("message").value = "";
        showToast("Thành công", "Đã gửi!");
      } else showToast("Lỗi", res.message);
    });
  };
}

function showToast(title, msg) {
  const div = document.createElement("div");
  div.className = "toast";
  div.innerHTML = `<i class="fa-solid fa-bell" style="color:#10B981; font-size:1.2rem;"></i> <div><b>${title}</b><div>${msg}</div></div>`;
  document.getElementById("toast-container").appendChild(div);
  setTimeout(() => div.remove(), 5000);
}
