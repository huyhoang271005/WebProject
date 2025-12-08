import { showDialog } from "../dialog/index.js";
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
  // 1. Check User
  try {
    const profile = await callAPI("/profile");
    if (profile && profile.success) {
      const user = profile.data;
      if (user.imageUrl)
        document.getElementById("navAvatar").src = user.imageUrl;
      if (user.username)
        document.getElementById("welcomeName").textContent = user.username;
      if (user.roleName === "ADMIN" || user.role === "ADMIN") {
        document
          .querySelectorAll(".admin-only")
          .forEach((el) => (el.style.display = "block")); // Hiện menu admin
      }
    } else {
      window.location.replace("../auth/login"); // Chưa login -> về login
      return;
    }
  } catch (e) {
    console.error(e);
  }

  // 2. Render UI
  renderNavCategories();
  renderHomeSections();

  // 3. SSE
  try {
    connectSse("/connect", (data) => {
      if (data.success) showToast("Thông báo", data.message);
    });
  } catch (e) {}
});

function renderHomeSections() {
  const container = document.getElementById("homeContainer");
  const products = generateMockProducts(); // Tạo sản phẩm giả

  container.innerHTML = "";
  CATEGORIES.forEach((cat) => {
    const list = products.filter((p) => p.catId === cat.id).slice(0, 5); // Lấy 5 món đầu mỗi loại

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
                                  Math.random() * 2000
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
        name: `${c.name} - Món ngon ${i}`,
        price: Math.floor(Math.random() * 200) + 10 + ".000đ",
      });
    }
  });
  return arr;
}

// Logic khác
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
      if (res.success) {
        document.getElementById("message").value = "";
        showToast("Thành công", "Đã gửi!");
      } else showToast("Lỗi", res.message);
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
  div.innerHTML = `<i class="fa-solid fa-bell" style="color:#10B981; font-size:1.2rem;"></i> <div><b>${title}</b><div>${msg}</div></div>`;
  document.getElementById("toast-container").appendChild(div);
  setTimeout(() => div.remove(), 5000);
}

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

// Search
document.getElementById("btnSearch").onclick = () => {
  const q = document.getElementById("mainSearch").value.trim();
  if (q)
    window.location.href = `../products/index.html?search=${encodeURIComponent(
      q
    )}`;
};
