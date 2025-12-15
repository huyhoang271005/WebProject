import { callAPI } from "../public/api.js";
import { connectSse, subscribeTopic } from "../public/sse.js"; // Nhớ check đúng đường dẫn file sse.js
import { showDialog } from "../dialog/index.js";

// Ảnh mặc định
const noImage = "https://cdn-icons-png.flaticon.com/512/847/847969.png";

const navbarHTML = `
    <style>
        .navbar-component {
            background: white; height: 70px; width: 100%;
            position: fixed; top: 0; left: 0; z-index: 1000;
            display: flex; align-items: center; justify-content: space-between;
            padding: 0 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            box-sizing: border-box; font-family: 'Segoe UI', sans-serif;
        }
        .nb-brand { font-size: 1.5rem; font-weight: bold; color: #10B981; text-decoration: none; display: flex; align-items: center; gap: 10px; min-width: 180px; }
        
        #nbCenterSlot { flex: 1; display: flex; align-items: center; justify-content: center; margin: 0 20px; gap: 15px; }
        #nbRightSlot { display: flex; align-items: center; gap: 20px; }

        /* --- USER MENU --- */
        .nb-user-menu { position: relative; cursor: pointer; padding-left: 15px; border-left: 1px solid #eee; display: flex; align-items: center; gap: 10px; }
        .nb-avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #E5E7EB; transition: 0.2s; }
        .nb-avatar:hover { border-color: #10B981; }

        /* --- NOTIFICATION STYLE --- */
        .nb-noti-wrapper { position: relative; cursor: pointer; font-size: 1.2rem; color: #555; }
        .nb-noti-wrapper:hover { color: #10B981; }
        .nb-badge { 
            position: absolute; top: -5px; right: -8px; 
            background: #EF4444; color: white; 
            font-size: 0.7rem; padding: 2px 5px; 
            border-radius: 10px; font-weight: bold;
            display: none; /* Ẩn nếu không có tin mới */
        }
        
        /* Dropdown Chung */
        .nb-dropdown { 
            position: absolute; right: 0; top: 60px; background: white; width: 280px; border-radius: 12px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.15); display: none; flex-direction: column; overflow: hidden; border: 1px solid #eee; 
            animation: slideDown 0.2s ease;
        }
        .nb-noti-dropdown { width: 350px; right: -50px; } /* Dropdown thông báo rộng hơn tí */
        
        @keyframes slideDown { from{opacity:0; transform:translateY(10px)} to{opacity:1; transform:translateY(0)} }
        
        .nb-dropdown.show { display: flex; }

        /* Item trong User Menu */
        .nb-dropdown a, .nb-dropdown button { 
            padding: 12px 20px; text-decoration: none; color: #333; text-align: left; 
            background: none; border: none; cursor: pointer; border-bottom: 1px solid #f9f9f9; 
            display:flex; align-items:center; gap:10px; font-size:0.9rem; transition: 0.2s;
        }
        .nb-dropdown a:hover, .nb-dropdown button:hover { background: #ECFDF5; color: #10B981; padding-left: 25px; }

        /* Item trong Notification */
        .noti-header { padding: 15px; font-weight: bold; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; }
        .noti-list { max-height: 400px; overflow-y: auto; }
        .noti-item { padding: 15px; border-bottom: 1px solid #eee; transition: 0.2s; display: flex; flex-direction: column; gap: 5px; }
        .noti-item:hover { background: #f9f9f9; }
        .noti-item.unread { background: #ECFDF5; } /* Tin chưa đọc màu xanh nhẹ */
        .noti-title { font-weight: bold; font-size: 0.95rem; color: #333; }
        .noti-msg { font-size: 0.85rem; color: #666; }
        .noti-time { font-size: 0.75rem; color: #999; text-align: right; }
        .empty-noti { padding: 20px; text-align: center; color: #999; font-style: italic; }

        .nb-admin-only { display: none !important; }
    </style>

    <nav class="navbar-component">
        <a href="../home/index.html" class="nb-brand"><i class="fa-solid fa-leaf"></i> Tạp Hóa Xanh</a>

        <div id="nbCenterSlot"></div>

        <div style="display:flex; align-items:center;">
            <div id="nbRightSlot"></div> <div class="nb-noti-wrapper" id="nbNotiBtn" style="margin-left: 20px;">
                <i class="fa-regular fa-bell"></i>
                <span class="nb-badge" id="nbBadge">0</span>
                
                <div class="nb-dropdown nb-noti-dropdown" id="nbNotiDropdown">
                    <div class="noti-header">
                        <span>Thông báo</span>
                        <small style="color:#10B981; cursor:pointer;">Đánh dấu đã đọc</small>
                    </div>
                    <div class="noti-list" id="nbNotiList">
                        <div class="empty-noti">Đang tải...</div>
                    </div>
                </div>
            </div>

            <div class="nb-user-menu" id="nbUserMenu">
                <img src="${noImage}" class="nb-avatar" id="nbAvatar">
                
                <div class="nb-dropdown" id="nbUserDropdown">
                    <div style="padding:15px 20px; background:#f9f9f9; border-bottom:1px solid #eee;">
                        <div style="font-weight:bold; color:#111;" id="nbUsername">Khách</div>
                        <div style="font-size:0.8rem; color:#666;" id="nbRole">Member</div>
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

// Cache user info để đỡ gọi API nhiều lần
const userData = {
  imageUrl: sessionStorage.getItem("imageUrl"),
  username: sessionStorage.getItem("username"),
  roleName: sessionStorage.getItem("roleName"),
};

export async function loadNavbar(options = {}) {
  // 1. Render khung HTML
  const div = document.createElement("div");
  div.innerHTML = navbarHTML;
  document.body.prepend(div);

  // 2. Nhét HTML từ bên ngoài vào (Ví dụ thanh search ở trang Home)
  if (options.centerHTML)
    document.getElementById("nbCenterSlot").innerHTML = options.centerHTML;
  if (options.rightHTML)
    document.getElementById("nbRightSlot").innerHTML = options.rightHTML;

  try {
    // 3. Xử lý Profile & Cache
    if (!userData.username || !userData.roleName) {
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
      } else {
        // Token lỗi -> đá về login
        window.location.replace("../auth/login");
        return;
      }
    }

    // 4. Update UI User
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

    // ===============================================
    // 5. XỬ LÝ NOTIFICATION (SSE + GET)
    // ===============================================
    await initNotificationSystem();
  } catch (e) {
    console.log("Navbar Error:", e);
  }

  // 6. Sự kiện Click Dropdown
  setupDropdownEvents();
}

async function initNotificationSystem() {
  const badge = document.getElementById("nbBadge");
  const notiList = document.getElementById("nbNotiList");

  // A. Lấy danh sách cũ từ API (GET)
  // Lưu ý: Bro bảo method GET trả về all, nhớ check lại endpoint chính xác trong document của backend nhé
  const res = await callAPI("/notification", "GET");

  if (res && res.success && res.data && res.data.listData) {
    renderNotificationList(res.data.listData);
  } else {
    notiList.innerHTML = '<div class="empty-noti">Không có thông báo nào</div>';
  }

  // B. Kết nối SSE để lắng nghe thông báo mới (Realtime)
  try {
    // Kết nối đến endpoint SSE (thường là /sse hoặc /notification/sse)
    await connectSse("/sse");

    // Đăng ký lắng nghe topic 'notification'
    subscribeTopic("notification", (data) => {
      console.log("SSE Received:", data);

      // data trả về thường bọc trong data.data hoặc data trực tiếp tùy backend
      // Ở đây giả sử data là object thông báo luôn hoặc bọc trong data.data
      const newNoti = data.data || data;

      // 1. Thêm vào đầu danh sách
      prependNotification(newNoti);

      // 2. Tăng số trên badge
      let count = parseInt(badge.textContent) || 0;
      updateBadge(count + 1);

      // 3. (Tuỳ chọn) Hiện Toast góc màn hình cho ngầu
      // showToast(newNoti.title, newNoti.message);
    });
  } catch (err) {
    console.error("Lỗi SSE:", err);
  }
}

// Hàm render toàn bộ list ban đầu
function renderNotificationList(list) {
  const notiList = document.getElementById("nbNotiList");
  if (!list || list.length === 0) {
    notiList.innerHTML = '<div class="empty-noti">Không có thông báo nào</div>';
    return;
  }

  notiList.innerHTML = list.map((item) => createNotiItemHTML(item)).join("");

  // Đếm số lượng chưa đọc (isRead = false)
  const unreadCount = list.filter((i) => !i.isRead).length;
  updateBadge(unreadCount);
}

// Hàm thêm 1 thông báo mới vào đầu (SSE gọi cái này)
function prependNotification(item) {
  const notiList = document.getElementById("nbNotiList");
  // Xóa dòng "Không có thông báo" nếu có
  if (notiList.querySelector(".empty-noti")) notiList.innerHTML = "";

  const html = createNotiItemHTML(item);
  notiList.insertAdjacentHTML("afterbegin", html);
}

// Tạo HTML cho 1 item
function createNotiItemHTML(item) {
  // Check null
  if (!item) return "";
  return `
        <div class="noti-item ${item.isRead ? "" : "unread"}">
            <div class="noti-title">${item.title || "Thông báo"}</div>
            <div class="noti-msg">${item.message || ""}</div>
            ${
              item.createdTime
                ? `<div class="noti-time">${new Date(
                    item.createdTime
                  ).toLocaleString()}</div>`
                : ""
            }
        </div>
    `;
}

function updateBadge(count) {
  const badge = document.getElementById("nbBadge");
  badge.textContent = count;
  badge.style.display = count > 0 ? "block" : "none";
}

function setupDropdownEvents() {
  // User Menu
  const userBtn = document.getElementById("nbUserMenu");
  const userDropdown = document.getElementById("nbUserDropdown");

  // Noti Menu
  const notiBtn = document.getElementById("nbNotiBtn");
  const notiDropdown = document.getElementById("nbNotiDropdown");

  // Click User -> Toggle User, Ẩn Noti
  userBtn.onclick = (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle("show");
    notiDropdown.classList.remove("show");
  };

  // Click Noti -> Toggle Noti, Ẩn User
  notiBtn.onclick = (e) => {
    e.stopPropagation();
    notiDropdown.classList.toggle("show");
    userDropdown.classList.remove("show");

    // Logic phụ: Khi mở ra có thể reset badge về 0 (tuỳ yêu cầu)
    // updateBadge(0);
  };

  // Click ra ngoài -> Ẩn hết
  document.addEventListener("click", () => {
    if (userDropdown) userDropdown.classList.remove("show");
    if (notiDropdown) notiDropdown.classList.remove("show");
  });

  // Logout Logic
  const logoutBtn = document.getElementById("nbLogout");
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await showDialog(
        "question",
        "Bạn có chắc chắn muốn đăng xuất?",
        async () => {
          await callAPI("/logout");
          sessionStorage.clear();
          localStorage.setItem("rememberUser", "false");
          window.location.replace("../auth/login");
        }
      );
    };
  }
}
