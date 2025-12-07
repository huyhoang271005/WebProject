import { showDialog } from "../dialog/index.js";
import { callAPI, connectSse } from "../public/api.js";
import { getLoader } from "../public/public.js";

// --- CẤU HÌNH ---
const IS_TEST_MODE = false; // Server thật

const CATEGORIES = [
  { id: "an-vat", name: "Đồ ăn vặt", icon: "fa-cookie-bite" },
  { id: "nuoc-ngot", name: "Nước giải khát", icon: "fa-bottle-water" },
  { id: "dong-lanh", name: "Đồ đông lạnh", icon: "fa-snowflake" },
  { id: "mi-tom", name: "Mì ăn liền", icon: "fa-bowl-rice" },
  { id: "gia-dung", name: "Gia dụng", icon: "fa-pump-soap" },
];

let allProducts = [];

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Kiểm tra User
  try {
    const profile = await callAPI("/profile");
    if (profile && profile.success) {
      const user = profile.data;
      if (user.imageUrl)
        document.getElementById("navAvatar").src = user.imageUrl;
      if (user.username)
        document.getElementById("welcomeName").textContent = user.username;

      // Check Admin
      if (user.roleName === "ADMIN" || user.role === "ADMIN") {
        document
          .querySelectorAll(".admin-only")
          .forEach((el) => (el.style.display = "flex"));
      }
    } else {
      // Chưa đăng nhập
      window.location.replace("../auth/login");
      return;
    }
  } catch (e) {
    console.error(e);
  }

  // 2. Tạo dữ liệu & Render
  allProducts = generateMockProducts();
  renderNavCategories();
  renderHomeSections();

  // 3. SSE
  try {
    connectSse("/connect", (data) => {
      if (data && data.success) showToast("Thông báo", data.message);
    });
  } catch (e) {}
});

// --- RENDER HOME SECTIONS (Tempest Style) ---
function renderHomeSections() {
  const container = document.getElementById("homeContainer");
  container.innerHTML = "";

  CATEGORIES.forEach((cat) => {
    // Lấy 5 món đầu tiên
    const list = allProducts.filter((p) => p.catId === cat.id).slice(0, 5);

    if (list.length > 0) {
      const html = `
            <div class="category-section">
                <div class="section-header">
                    <div class="section-title">
                        <i class="fa-solid ${
                          cat.icon
                        }" style="color:#10B981; margin-right:10px;"></i> ${
        cat.name
      }
                    </div>
                    <a href="../products/index.html?cat=${
                      cat.id
                    }" class="btn-see-more">
                        Xem thêm <i class="fa-solid fa-arrow-right"></i>
                    </a>
                </div>
                <div class="product-grid-5">
                    ${list.map((p) => createCardHTML(p)).join("")}
                </div>
            </div>`;
      container.insertAdjacentHTML("beforeend", html);
    }
  });
}

function createCardHTML(p) {
  return `
    <div class="product-card" onclick="alert('Xem chi tiết: ${p.name}')">
        <div class="p-img">
            ${p.name.charAt(0)} </div>
        <div class="p-info">
            <div class="p-name" title="${p.name}">${p.name}</div>
            <div class="p-price">${p.price}</div>
            <div class="p-sold">Đã bán ${Math.floor(Math.random() * 1000)}</div>
        </div>
    </div>`;
}

function renderNavCategories() {
  document.getElementById("catDropdown").innerHTML = CATEGORIES.map(
    (cat) =>
      `<a href="../products/index.html?cat=${cat.id}">
            <i class="fa-solid ${cat.icon}"></i> ${cat.name}
        </a>`
  ).join("");
}

// --- MOCK DATA CHUẨN ---
function generateMockProducts() {
  let arr = [];
  CATEGORIES.forEach((c) => {
    for (let i = 1; i <= 10; i++) {
      arr.push({
        catId: c.id,
        name: `${c.name} - Loại đặc biệt số ${i}`,
        price: Math.floor(Math.random() * 200) + 10 + ".000đ",
      });
    }
  });
  return arr;
}

// --- LOGIC KHÁC ---
const sendAllBtn = document.getElementById("sendAll");
if (sendAllBtn) {
  sendAllBtn.onclick = async () => {
    const msg = document.getElementById("message").value.trim();
    if (!msg) return;
    await getLoader("sendAll", async () => {
      const res = await callAPI("/push", "POST", {
        success: true,
        message: msg,
        data: null,
      });
      if (res.success) showToast("Thành công", "Đã gửi!");
      else showToast("Lỗi", res.message);
    });
  };
}

document.getElementById("logout").onclick = async () => {
  await showDialog("question", "Đăng xuất?", async () => {
    await callAPI("/logout");
    localStorage.setItem("rememberUser", "false");
    window.location.replace("../auth/login");
  });
};

function showToast(title, msg) {
  const div = document.createElement("div");
  div.className = "toast";
  div.innerHTML = `<i class="fa-solid fa-bell" style="color:#10B981"></i> <div><b>${title}</b><div>${msg}</div></div>`;
  document.getElementById("toast-container").appendChild(div);
  setTimeout(() => div.remove(), 5000);
}

// Search
document.getElementById("btnSearch").onclick = () => {
  const q = document.getElementById("mainSearch").value.trim();
  if (q)
    window.location.href = `../products/index.html?search=${encodeURIComponent(
      q
    )}`;
};

// Dropdown
document.getElementById("catBtn").onclick = (e) => {
  e.stopPropagation();
  document.getElementById("catDropdown").classList.toggle("show");
};
document.getElementById("userMenuBtn").onclick = (e) => {
  e.stopPropagation();
  document.getElementById("userDropdown").classList.toggle("show");
};
document.onclick = () =>
  document
    .querySelectorAll(".show")
    .forEach((el) => el.classList.remove("show"));
