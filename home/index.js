import { loadNavbar } from "../navbar/navbar.js";
import { callAPI } from "../public/api.js"; // Đã xóa connectSse vì không dùng ở đây nữa
import { getLoader } from "../public/public.js";

const CATEGORIES = [
  { id: "an-vat", name: "Đồ ăn vặt", icon: "fa-cookie-bite" },
  { id: "nuoc-ngot", name: "Nước giải khát", icon: "fa-bottle-water" },
  { id: "dong-lanh", name: "Đồ đông lạnh", icon: "fa-snowflake" },
  { id: "mi-tom", name: "Mì ăn liền", icon: "fa-bowl-rice" },
  { id: "gia-dung", name: "Gia dụng", icon: "fa-pump-soap" },
];

// Hàm bật tắt Loading
const toggleLoading = (show) => {
  const el = document.getElementById("loadingOverlay");
  if (el) el.style.display = show ? "flex" : "none";
};

document.addEventListener("DOMContentLoaded", async () => {
  toggleLoading(true); // Bật loading ngay khi vào trang

  try {
    // 1. GỌI NAVBAR CUSTOM CHO HOME
    // (Lưu ý: Navbar mới sẽ tự lo phần SSE và hiển thị thông báo)
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
      // Không cần rightHTML vì Navbar mặc định đã có Giỏ hàng & Chuông thông báo rồi
    });

    // 2. LOGIC UI
    renderNavCategories();
    setupNavbarEvents();

    // 3. Render nội dung
    renderHomeSections();
  } catch (e) {
    console.error(e);
  } finally {
    // Tắt loading sau khi mọi thứ đã xong
    setTimeout(() => toggleLoading(false), 500);
  }
});

// --- HELPER FUNCTIONS ---

function setupNavbarEvents() {
  const catBtn = document.getElementById("catBtn");
  const catDropdown = document.getElementById("catDropdown");

  // Toggle danh mục
  if (catBtn) {
    catBtn.onclick = (e) => {
      e.stopPropagation();
      catDropdown.classList.toggle("show");
    };
    document.addEventListener("click", () => {
      if (catDropdown) catDropdown.classList.remove("show");
    });
  }

  // Xử lý tìm kiếm
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
  // Nếu chưa có thẻ homeContainer trong HTML thì dừng
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
                        <div class="section-title">
                            <i class="fa-solid ${
                              cat.icon
                            }" style="color:#10B981"></i> ${cat.name}
                        </div>
                        <a href="../products/index.html?cat=${
                          cat.id
                        }" class="btn-see-more">
                            Xem thêm <i class="fa-solid fa-arrow-right"></i>
                        </a>
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

// --- TEST CHỨC NĂNG GỬI THÔNG BÁO (ADMIN TOOL) ---
const sendAllBtn = document.getElementById("sendAll");
if (sendAllBtn) {
  sendAllBtn.onclick = async () => {
    const msg = document.getElementById("message").value.trim();
    if (!msg) return;

    await getLoader("sendAll", async () => {
      // Sửa đường dẫn theo mô tả của bro: POST /notification gửi cho all
      // callAPI sẽ tự thêm Auth header vì đường dẫn không bắt đầu bằng /auth
      const res = await callAPI("/notification", "POST", {
        title: "Thông báo từ Admin",
        message: msg,
      });

      if (res && res.success) {
        document.getElementById("message").value = "";
        showToast("Thành công", "Đã gửi thông báo!");
      } else {
        showToast("Lỗi", res?.message || "Không gửi được");
      }
    });
  };
}

function showToast(title, msg) {
  // Tạo container nếu chưa có
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    container.style.position = "fixed";
    container.style.top = "20px";
    container.style.right = "20px";
    container.style.zIndex = "9999";
    document.body.appendChild(container);
  }

  const div = document.createElement("div");
  div.className = "toast";
  // Style cứng cho toast nếu chưa có CSS
  div.style.background = "white";
  div.style.padding = "15px";
  div.style.marginBottom = "10px";
  div.style.borderRadius = "8px";
  div.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
  div.style.display = "flex";
  div.style.gap = "10px";
  div.style.alignItems = "center";
  div.style.minWidth = "250px";
  div.style.animation = "fadeIn 0.3s ease";

  div.innerHTML = `
        <i class="fa-solid fa-bell" style="color:#10B981; font-size:1.5rem;"></i>
        <div>
            <div style="font-weight:bold; color:#333;">${title}</div>
            <div style="color:#666; font-size:0.9rem;">${msg}</div>
        </div>
    `;

  container.appendChild(div);
  setTimeout(() => {
    div.style.opacity = "0";
    setTimeout(() => div.remove(), 300);
  }, 5000);
}
