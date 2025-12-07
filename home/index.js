import { showDialog } from "../dialog/index.js";
import { callAPI, connectSse } from "../public/api.js";
import { getLoader } from "../public/public.js";

// --- Dữ liệu giả cho sản phẩm (Vì API sản phẩm chưa có) ---
const CATEGORIES = [
  { id: "an-vat", name: "Đồ ăn vặt", icon: "fa-cookie-bite" },
  { id: "nuoc-ngot", name: "Nước giải khát", icon: "fa-bottle-water" },
  { id: "dong-lanh", name: "Đồ đông lạnh", icon: "fa-snowflake" },
  { id: "mi-tom", name: "Mì ăn liền", icon: "fa-bowl-rice" },
  { id: "gia-dung", name: "Gia dụng", icon: "fa-pump-soap" },
];

(async () => {
  // 1. Lấy thông tin User
  const profile = await callAPI("/profile");

  if (profile.success) {
    const user = profile.data;
    // Cập nhật Avatar Navbar
    if (user.imageUrl) document.getElementById("navAvatar").src = user.imageUrl;

    // Cập nhật thông tin trong Dropdown
    document.getElementById("dropUsername").textContent =
      user.username || "User";
    document.getElementById("dropRole").textContent = user.roleName || "Member";

    // CHECK QUYỀN ADMIN -> Hiện các mục ẩn
    if (user.roleName === "ADMIN" || user.role === "ADMIN") {
      document
        .querySelectorAll(".admin-only")
        .forEach((el) => (el.style.display = "flex"));
    }
  } else {
    // Chưa đăng nhập -> Về login
    window.location.replace("../auth/login");
    return;
  }

  // 2. Render giao diện bán hàng
  renderNavCategories();
  renderHomeSections();

  // 3. Kết nối SSE (Nhận thông báo)
  connectSse("/connect", (data) => {
    if (data.success) {
      showToast("Thông báo mới", data.message);
    }
  });
})();

// --- LOGIC GỬI THÔNG BÁO (Admin) ---
const sendAllBtn = document.getElementById("sendAll");
if (sendAllBtn) {
  sendAllBtn.addEventListener("click", async () => {
    const input = document.getElementById("message");
    const msg = input.value.trim();
    if (!msg) return;

    const data = { success: true, message: msg, data: null };
    await getLoader("sendAll", async () => {
      const result = await callAPI("/push", "POST", data);
      if (result.success) {
        input.value = "";
        showToast("Thành công", "Đã gửi thông báo!");
      } else {
        showToast("Lỗi", result.message);
      }
    });
  });
}

// --- LOGIC ĐĂNG XUẤT ---
document.getElementById("logout").addEventListener("click", async () => {
  await showDialog("question", "Bạn có muốn đăng xuất?", async () => {
    await callAPI("/logout");
    localStorage.setItem("rememberUser", "false");
    window.location.replace("../auth/login");
  });
});

// --- RENDER UI ---
function renderHomeSections() {
  const container = document.getElementById("homeContainer");
  container.innerHTML = "";
  const products = generateMockProducts();

  CATEGORIES.forEach((cat) => {
    const list = products.filter((p) => p.catId === cat.id).slice(0, 5); // Lấy 5 món
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
                                <div class="p-sold">Đã bán ${Math.floor(
                                  Math.random() * 1000
                                )}</div>
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

function renderNavCategories() {
  document.getElementById("catDropdown").innerHTML = CATEGORIES.map(
    (cat) =>
      `<a href="../products/index.html?cat=${cat.id}"><i class="fa-solid ${cat.icon}"></i> ${cat.name}</a>`
  ).join("");
}

function generateMockProducts() {
  let arr = [];
  CATEGORIES.forEach((c) => {
    for (let i = 1; i <= 10; i++) {
      arr.push({
        catId: c.id,
        name: `${c.name} - Sản phẩm số ${i}`,
        price: Math.floor(Math.random() * 200) + 10 + ".000đ",
      });
    }
  });
  return arr;
}

function showToast(title, msg) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<i class="fa-solid fa-bell" style="color:#10B981; font-size:1.2rem;"></i> <div><div style="font-weight:bold; margin-bottom:2px;">${title}</div><div style="font-size:0.9rem; color:#555;">${msg}</div></div>`;
  document.getElementById("toast-container").appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

// Search
const searchInput = document.getElementById("searchInput");
const handleSearch = () => {
  const q = searchInput.value.trim();
  if (q)
    window.location.href = `../products/index.html?search=${encodeURIComponent(
      q
    )}`;
};
document.getElementById("btnSearch").onclick = handleSearch;
searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") handleSearch();
});

// Dropdown Toggle
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
document.onclick = () => {
  document
    .querySelectorAll(".show")
    .forEach((el) => el.classList.remove("show"));
};
