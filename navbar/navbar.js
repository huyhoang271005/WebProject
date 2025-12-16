import { callAPI } from "../public/api.js";
import { showDialog } from "../dialog/index.js";

// ❌ XÓA DÒNG NÀY ĐI (Thủ phạm gây sập web nếu thiếu file)
// import { connectSse, subscribeTopic } from "../public/sse.js";

const noImage = "https://cdn-icons-png.flaticon.com/512/847/847969.png";

const navbarHTML = `
    <style>
        .navbar-component {
            background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px);
            height: 70px; width: 100%; position: fixed; top: 0; left: 0; z-index: 1000;
            display: flex; align-items: center; justify-content: space-between;
            padding: 0 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.05);
            box-sizing: border-box; font-family: 'Segoe UI', sans-serif;
        }
        .nb-brand { font-size: 1.6rem; font-weight: 800; color: #10B981; text-decoration: none; display: flex; align-items: center; gap: 10px; min-width: 180px; }
        #nbCenterSlot { flex: 1; display: flex; align-items: center; justify-content: center; margin: 0 20px; gap: 15px; }
        #nbRightSlot { display: flex; align-items: center; gap: 20px; }
        .nb-user-menu { position: relative; cursor: pointer; padding-left: 15px; border-left: 1px solid #eee; display: flex; align-items: center; gap: 10px; }
        .nb-avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #E5E7EB; transition: 0.2s; }
        .nb-noti-wrapper { position: relative; cursor: pointer; font-size: 1.2rem; color: #555; transition: 0.2s; }
        .nb-noti-wrapper:hover { color: #10B981; }
        .nb-badge { position: absolute; top: -5px; right: -8px; background: #EF4444; color: white; font-size: 0.7rem; padding: 2px 5px; border-radius: 10px; font-weight: bold; display: none; }
        .nb-dropdown { position: absolute; right: 0; top: 60px; background: white; width: 260px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); display: none; flex-direction: column; overflow: hidden; border: 1px solid #eee; animation: slideDown 0.2s ease; }
        .nb-noti-dropdown { width: 350px; right: -60px; }
        @keyframes slideDown { from{opacity:0; transform:translateY(10px)} to{opacity:1; transform:translateY(0)} }
        .nb-dropdown.show { display: flex; }
        .nb-dropdown a, .nb-dropdown button { padding: 12px 20px; text-decoration: none; color: #333; text-align: left; background: none; border: none; cursor: pointer; border-bottom: 1px solid #f9f9f9; display:flex; align-items:center; gap:10px; font-size:0.95rem; transition: 0.2s; }
        .nb-dropdown a:hover, .nb-dropdown button:hover { background: #ECFDF5; color: #10B981; padding-left: 25px; }
        .noti-header { padding: 15px; font-weight: bold; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; }
        .noti-list { max-height: 400px; overflow-y: auto; }
        .noti-item { padding: 15px; border-bottom: 1px solid #eee; transition: 0.2s; display: flex; flex-direction: column; gap: 5px; }
        .noti-item:hover { background: #f9f9f9; }
        .noti-item.unread { background: #ECFDF5; }
        .empty-noti { padding: 20px; text-align: center; color: #999; font-style: italic; }
        .nb-admin-only { display: none !important; }
    </style>

    <nav class="navbar-component">
        <a href="../home/index.html" class="nb-brand"><i class="fa-solid fa-leaf"></i> Tạp Hóa Xanh</a>
        <div id="nbCenterSlot"></div>
        <div style="display:flex; align-items:center;">
            <div id="nbRightSlot"></div>

            <div class="nb-noti-wrapper" id="nbNotiBtn" style="margin-left: 20px;">
                <i class="fa-regular fa-bell"></i>
                <span class="nb-badge" id="nbBadge">0</span>
                <div class="nb-dropdown nb-noti-dropdown" id="nbNotiDropdown">
                    <div class="noti-header"><span>Thông báo</span></div>
                    <div class="noti-list" id="nbNotiList"><div class="empty-noti">Đang tải...</div></div>
                </div>
            </div>

            <div class="nb-user-menu" id="nbUserMenu">
                <img src="${noImage}" class="nb-avatar" id="nbAvatar">
                <div class="nb-dropdown" id="nbUserDropdown">
                    <div style="padding:15px 20px; background:#f9f9f9; border-bottom:1px solid #eee;">
                        <div style="font-weight:bold; color:#111;" id="nbUsername">Khách</div>
                        <div style="font-size:0.8rem; color:#666;" id="nbRole">...</div>
                    </div>
                    <a href="../profile"><i class="fa-regular fa-id-card"></i> Trang cá nhân</a>
                    <a href="../session"><i class="fa-solid fa-laptop-medical"></i> Quản lý phiên</a>
                    
                    <div class="nb-admin-only" style="border-top: 1px solid #eee; margin-top:5px;"></div>
                    <div class="nb-admin-only" style="padding:5px 20px; font-size:0.7rem; color:#999; font-weight:bold;">QUẢN TRỊ</div>
                    <a href="../role-permission" class="nb-admin-only"><i class="fa-solid fa-user-shield"></i> Phân quyền</a>
                    <a href="../users" class="nb-admin-only"><i class="fa-solid fa-users-gear"></i> Users</a>
                    <a href="../catalog-management" class="nb-admin-only"><i class="fa-solid fa-list-check"></i> Danh mục</a>

                    <button id="nbLogout" style="color:red; border-top: 1px solid #eee; margin-top:5px;">
                        <i class="fa-solid fa-right-from-bracket"></i> Đăng xuất
                    </button>
                </div>
            </div>
        </div>
    </nav>
`;

const userData = {
  imageUrl: sessionStorage.getItem("imageUrl"),
  username: sessionStorage.getItem("username"),
  roleName: sessionStorage.getItem("roleName"),
};

export async function loadNavbar(options = {}) {
  // 1. Render khung HTML ngay lập tức (Để dù JS có lỗi cũng hiện Navbar)
  const div = document.createElement("div");
  div.innerHTML = navbarHTML;
  document.body.prepend(div);

  if (options.centerHTML)
    document.getElementById("nbCenterSlot").innerHTML = options.centerHTML;
  if (options.rightHTML)
    document.getElementById("nbRightSlot").innerHTML = options.rightHTML;

  try {
    // 2. Lấy thông tin User
    // Nếu bro đã login thì callAPI("/profile") sẽ trả về data ngon
    if (!userData.username) {
      const profile = await callAPI("/profile");
      if (profile && profile.success) {
        const user = profile.data;
        sessionStorage.setItem("imageUrl", user.imageUrl || noImage);
        sessionStorage.setItem("username", user.username);
        sessionStorage.setItem("roleName", user.roleName);
        Object.assign(userData, {
          imageUrl: user.imageUrl || noImage,
          username: user.username,
          roleName: user.roleName,
        });
      }
      // Nếu không success thì cứ để im, api.js sẽ tự xử lý (redirect) nếu cần
    }

    // 3. Update UI
    if (userData.imageUrl)
      document.getElementById("nbAvatar").src = userData.imageUrl;
    if (userData.username)
      document.getElementById("nbUsername").textContent = userData.username;
    if (userData.roleName)
      document.getElementById("nbRole").textContent = userData.roleName;

    // Hiện menu Admin
    if (userData.roleName === "ADMIN") {
      document
        .querySelectorAll(".nb-admin-only")
        .forEach((el) => el.style.setProperty("display", "flex", "important"));
    }

    // 4. Kích hoạt Notification & SSE (Dùng Dynamic Import để chống crash 404)
    if (userData.username && userData.username !== "Khách") {
      await initNotificationSystem();
    }
  } catch (e) {
    console.error("Navbar Logic Error:", e);
  }

  // 5. Setup Events Click
  setupEvents();
}

async function initNotificationSystem() {
  try {
    const notiList = document.getElementById("nbNotiList");

    // Gọi API lấy list cũ
    const res = await callAPI("/notification", "GET");
    if (res && res.success && res.data && res.data.listData) {
      renderNotiList(res.data.listData);
    } else {
      notiList.innerHTML =
        '<div class="empty-noti">Không có thông báo nào</div>';
    }

    // [QUAN TRỌNG] Dynamic Import: Chống lỗi 404 làm sập web
    // Nó sẽ cố load file sse.js, nếu không thấy thì bỏ qua chứ không crash
    try {
      const sseModule = await import("../public/sse.js");

      await sseModule.connectSse("/sse");
      sseModule.subscribeTopic("notification", (data) => {
        const newNoti = data.data || data;
        prependNotification(newNoti);

        // Update badge
        const badge = document.getElementById("nbBadge");
        let count = parseInt(badge.textContent) || 0;
        updateBadge(count + 1);
      });
    } catch (importErr) {
      console.warn(
        "⚠️ Không tìm thấy file sse.js hoặc lỗi kết nối SSE. Bỏ qua tính năng realtime."
      );
    }
  } catch (err) {
    console.warn("Lỗi Notification System:", err);
  }
}

function setupEvents() {
  const userBtn = document.getElementById("nbUserMenu");
  const notiBtn = document.getElementById("nbNotiBtn");
  const userDropdown = document.getElementById("nbUserDropdown");
  const notiDropdown = document.getElementById("nbNotiDropdown");

  if (userBtn)
    userBtn.onclick = (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle("show");
      notiDropdown.classList.remove("show");
    };
  if (notiBtn)
    notiBtn.onclick = (e) => {
      e.stopPropagation();
      notiDropdown.classList.toggle("show");
      userDropdown.classList.remove("show");
    };

  document.addEventListener("click", () => {
    if (userDropdown) userDropdown.classList.remove("show");
    if (notiDropdown) notiDropdown.classList.remove("show");
  });

  const logoutBtn = document.getElementById("nbLogout");
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await showDialog("question", "Bạn có chắc muốn đăng xuất?", async () => {
        await callAPI("/logout");
        sessionStorage.clear();
        window.location.replace("../auth/login");
      });
    };
  }
}

// Các hàm render phụ trợ
function renderNotiList(list) {
  const notiList = document.getElementById("nbNotiList");
  if (!list.length) return;
  notiList.innerHTML = list
    .map(
      (item) => `
        <div class="noti-item ${item.isRead ? "" : "unread"}">
            <div style="font-weight:bold; font-size:0.9rem;">${
              item.title || "Thông báo"
            }</div>
            <div style="font-size:0.85rem; color:#666;">${
              item.message || ""
            }</div>
        </div>
    `
    )
    .join("");
  const unread = list.filter((i) => !i.isRead).length;
  updateBadge(unread);
}

function prependNotification(item) {
  const notiList = document.getElementById("nbNotiList");
  if (notiList.querySelector(".empty-noti")) notiList.innerHTML = "";
  notiList.insertAdjacentHTML(
    "afterbegin",
    `
        <div class="noti-item unread">
            <div style="font-weight:bold; font-size:0.9rem;">${item.title}</div>
            <div style="font-size:0.85rem; color:#666;">${item.message}</div>
        </div>
    `
  );
}

function updateBadge(count) {
  const badge = document.getElementById("nbBadge");
  badge.textContent = count;
  badge.style.display = count > 0 ? "block" : "none";
}
