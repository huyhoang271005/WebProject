import { callAPI } from "../public/api.js";
import { showDialog } from "../dialog/index.js";
import { connectSse, subscribeTopic } from "../public/Sse.js";

const noImage = "https://cdn-icons-png.flaticon.com/512/847/847969.png";

// Biến quản lý Notification Lazy Load
let notiState = {
  page: 0,
  size: 10, // Load 10 cái một thôi cho nhẹ
  hasMore: true,
  isLoading: false,
  isLoadedFirstTime: false, // Kiểm tra xem đã bấm vào chuông lần nào chưa
};

const navbarHTML = `
    <style>
        /* CSS giữ nguyên như cũ cho đẹp */
        .navbar-component {
            background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px);
            height: 70px; width: 100%; position: fixed; top: 0; left: 0; z-index: 1000;
            display: flex; align-items: center; justify-content: space-between;
            padding: 0 30px; box-shadow: 0 4px 20px rgba(0,0,0,0.05);
            box-sizing: border-box; font-family: 'Segoe UI', sans-serif;
        }
        .nb-brand { font-size: 1.6rem; font-weight: 800; color: #10B981; text-decoration: none; display: flex; align-items: center; gap: 10px; min-width: 180px; }
        #nbCenterSlot { flex: 1; display: flex; align-items: center; justify-content: center; margin: 0 20px; gap: 15px; }
        #nbRightSlot { display: flex; align-items: center; gap: 20px; } 

        .nb-icon-btn { position: relative; cursor: pointer; font-size: 1.2rem; color: #555; transition: 0.2s; display: flex; align-items: center; justify-content: center; text-decoration: none; }
        .nb-icon-btn:hover { color: #10B981; transform: translateY(-2px); }
        
        .nb-badge { 
            position: absolute; top: -8px; right: -8px; 
            background: #EF4444; color: white; 
            font-size: 0.7rem; padding: 2px 5px; min-width: 18px; text-align: center;
            border-radius: 10px; font-weight: bold; border: 2px solid white;
        }

        .nb-user-menu { position: relative; cursor: pointer; padding-left: 15px; border-left: 1px solid #eee; display: flex; align-items: center; gap: 10px; margin-left: 15px; }
        .nb-avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #E5E7EB; transition: 0.2s; }
        
        .nb-dropdown { 
            position: absolute; right: 0; top: 60px; background: white; 
            width: 270px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); 
            display: none; flex-direction: column; overflow: hidden; border: 1px solid #eee; 
            animation: slideDown 0.2s ease; z-index: 1100; 
        }
        .nb-noti-dropdown { width: 380px; right: -80px; }
        
        @keyframes slideDown { from{opacity:0; transform:translateY(10px)} to{opacity:1; transform:translateY(0)} }
        .nb-dropdown.show { display: flex; }
        
        .nb-dropdown a, .nb-dropdown button { 
            padding: 12px 20px; text-decoration: none; color: #333; text-align: left; 
            background: none; border: none; cursor: pointer; border-bottom: 1px solid #f9f9f9; 
            display:flex; align-items:center; gap:12px; font-size:0.95rem; transition: 0.2s; 
        }
        .nb-dropdown a:hover, .nb-dropdown button:hover { background: #ECFDF5; color: #10B981; padding-left: 25px; }
        .nb-dropdown i { width: 22px; text-align: center; color: #555; }

        .noti-header { padding: 15px; font-weight: bold; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center; background: #fff; }
        .btn-clear-all { font-size: 0.8rem; color: #EF4444; cursor: pointer; text-decoration: underline; }
        .noti-list { max-height: 400px; overflow-y: auto; }
        .noti-item { padding: 15px; border-bottom: 1px solid #f0f0f0; transition: 0.2s; display: flex; gap: 10px; position: relative; background: white; }
        .noti-item:hover { background: #f9fafb; }
        .noti-item.unread { background: #ECFDF5; }
        .noti-content { flex: 1; }
        .noti-title { font-weight: bold; font-size: 0.9rem; color: #333; margin-bottom: 4px; }
        .noti-msg { font-size: 0.85rem; color: #666; line-height: 1.3; }
        .noti-time { font-size: 0.75rem; color: #999; margin-top: 5px; }
        .btn-del-noti { color: #ccc; cursor: pointer; font-size: 0.9rem; padding: 5px; transition: 0.2s; align-self: flex-start; }
        .btn-del-noti:hover { color: #EF4444; }
        .empty-noti { padding: 30px; text-align: center; color: #999; font-style: italic; }
        
        .nb-admin-only { display: none !important; }
        /* Loading spinner cho lazy load */
        .noti-loading { text-align: center; padding: 10px; color: #10B981; font-size: 0.8rem; display: none; }
    </style>

    <nav class="navbar-component">
        <a href="../home/index.html" class="nb-brand"><i class="fa-solid fa-leaf"></i> Tạp Hóa Xanh</a>
        <div id="nbCenterSlot"></div>
        <div style="display:flex; align-items:center;">
            <div id="nbRightSlot">
                <a href="../cart/index.html" class="nb-icon-btn" title="Giỏ hàng">
                    <i class="fa-solid fa-cart-shopping"></i>
                    <span class="nb-badge" id="cartBadge" style="display:none">0</span>
                </a>

                <div class="nb-icon-btn" id="nbNotiBtn">
                    <i class="fa-regular fa-bell"></i>
                    <span class="nb-badge" id="nbBadge" style="display:none">0</span>
                    
                    <div class="nb-dropdown nb-noti-dropdown" id="nbNotiDropdown">
                        <div class="noti-header"><span>Thông báo</span><span class="btn-clear-all" id="btnClearAllNoti">Xóa tất cả</span></div>
                        <div class="noti-list" id="nbNotiList">
                            </div>
                        <div class="noti-loading" id="notiLoading"><i class="fa-solid fa-circle-notch fa-spin"></i> Đang tải thêm...</div>
                    </div>
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
                    <a href="../contact"><i class="fa-solid fa-map-location-dot"></i> Địa chỉ</a>
                    
                    <div class="nb-admin-only" style="border-top: 1px solid #eee; margin-top:5px; padding-top:5px;"></div>
                    <a href="../products-manager" class="nb-admin-only"><i class="fa-solid fa-box-open"></i> Quản lí sản phẩm</a>
                    <a href="../categories-manager" class="nb-admin-only"><i class="fa-solid fa-layer-group"></i> Quản lí danh mục</a>
                    <a href="../users-manager" class="nb-admin-only"><i class="fa-solid fa-users"></i> Quản lí người dùng</a>
                    <a href="../admin" class="nb-admin-only"><i class="fa-solid fa-user-shield"></i> Trang quản trị</a>
                    
                    <button id="nbLogout" style="color:#EF4444; border-top: 1px solid #eee; margin-top:5px;">
                        <i class="fa-solid fa-right-from-bracket"></i> Đăng xuất
                    </button>
                </div>
            </div>
        </div>
    </nav>
    <div style="height: 70px; width: 100%; clear: both;"></div>
`;

const userData = {
  imageUrl: sessionStorage.getItem("imageUrl"),
  username: sessionStorage.getItem("username"),
  roleName: sessionStorage.getItem("roleName"),
};

export async function loadNavbar(options = {}) {
  const div = document.createElement("div");
  div.innerHTML = navbarHTML;
  document.body.prepend(div);
  if (options.centerHTML)
    document.getElementById("nbCenterSlot").innerHTML = options.centerHTML;

  try {
    // 1. Chỉ gọi Profile để lấy thông tin user (Bắt buộc)
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
      } else {
        userData.username = "Khách";
        userData.roleName = "GUEST";
      }
    }

    // Render UI User
    if (userData.imageUrl)
      document.getElementById("nbAvatar").src = userData.imageUrl;
    if (userData.username)
      document.getElementById("nbUsername").textContent = userData.username;
    if (userData.roleName)
      document.getElementById("nbRole").textContent = userData.roleName;
    if (userData.roleName === "ADMIN") {
      document
        .querySelectorAll(".nb-admin-only")
        .forEach((el) => el.style.setProperty("display", "flex", "important"));
    }

    // 2. Nếu đã đăng nhập -> Kết nối SSE (Nhưng KHÔNG gọi API noti/cart ngay)
    if (userData.username && userData.username !== "Khách") {
      await connectSse("/sse");
      setupSSERealtime();

      // Chỉ gọi hàm lấy số giỏ hàng lần đầu để hiển thị (nhẹ)
      // Nếu backend cực gắt thì bỏ dòng này, chờ SSE báo mới hiện
      getInitialCartCount();
    } else {
      document.getElementById("nbNotiList").innerHTML =
        '<div class="empty-noti">Đăng nhập để xem thông báo</div>';
    }
  } catch (e) {
    console.error("Navbar Error:", e);
  }
  setupEvents();
}

// --- XỬ LÝ SSE REALTIME (QUAN TRỌNG) ---
function setupSSERealtime() {
  // 1. Lắng nghe Notification
  subscribeTopic("notification", (data) => {
    // data chính là object thông báo mới
    const newNoti = data;
    prependNotification(newNoti);

    // Hiện chấm đỏ
    const badge = document.getElementById("nbBadge");
    badge.style.display = "block";
    // Logic đếm số chưa đọc ở đây (nếu cần)
  });

  // 2. Lắng nghe Cart (Update: +1 hoặc -1)
  subscribeTopic("cart", (data) => {
    // Backend trả về: 1 (thêm) hoặc -1 (bớt)
    const change = parseInt(data);
    const badge = document.getElementById("cartBadge");

    // Lấy số hiện tại
    let currentCount = parseInt(badge.innerText) || 0;
    let newCount = currentCount + change;

    if (newCount < 0) newCount = 0;

    badge.innerText = newCount > 99 ? "99+" : newCount;
    badge.style.display = newCount > 0 ? "block" : "none";
  });
}

// --- XỬ LÝ SỰ KIỆN (LAZY LOAD Ở ĐÂY) ---
function setupEvents() {
  const notiBtn = document.getElementById("nbNotiBtn");
  const notiDropdown = document.getElementById("nbNotiDropdown");
  const notiList = document.getElementById("nbNotiList");

  // Click Chuông -> Mới gọi API (Lazy Load)
  if (notiBtn) {
    notiBtn.onclick = async (e) => {
      e.stopPropagation();
      notiDropdown.classList.toggle("show");
      document.getElementById("nbUserDropdown").classList.remove("show");

      // Tắt chấm đỏ khi mở
      if (notiDropdown.classList.contains("show")) {
        document.getElementById("nbBadge").style.display = "none";

        // Nếu chưa load lần nào thì mới gọi API
        if (!notiState.isLoadedFirstTime) {
          await fetchNotifications();
          notiState.isLoadedFirstTime = true;
        }
      }
    };
  }

  // Scroll cuối danh sách -> Load tiếp (Lazy Scroll)
  if (notiList) {
    notiList.addEventListener("scroll", () => {
      if (
        notiList.scrollTop + notiList.clientHeight >=
        notiList.scrollHeight - 10
      ) {
        // Đã cuộn xuống đáy
        fetchNotifications();
      }
    });
  }

  // Các sự kiện khác (User, Logout...)
  const userBtn = document.getElementById("nbUserMenu");
  const userDropdown = document.getElementById("nbUserDropdown");
  if (userBtn)
    userBtn.onclick = (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle("show");
      notiDropdown.classList.remove("show");
    };
  document.addEventListener("click", () => {
    if (userDropdown) userDropdown.classList.remove("show");
    if (notiDropdown) notiDropdown.classList.remove("show");
  });
  const logoutBtn = document.getElementById("nbLogout");
  if (logoutBtn)
    logoutBtn.onclick = async () => {
      await showDialog("question", "Đăng xuất?", async () => {
        await callAPI("/logout");
        sessionStorage.clear();
        window.location.replace("../auth/login");
      });
    };

  // Nút xóa tất cả
  const clearAllBtn = document.getElementById("btnClearAllNoti");
  if (clearAllBtn) {
    clearAllBtn.onclick = async (e) => {
      e.stopPropagation();
      if (!confirm("Xóa tất cả thông báo?")) return;
      const res = await callAPI("/auth/notifications/delete-all", "POST"); // Check lại API delete all
      if (res && res.success) {
        document.getElementById("nbNotiList").innerHTML =
          '<div class="empty-noti">Không có thông báo nào</div>';
      }
    };
  }
}

// --- HÀM GỌI API THÔNG BÁO (PHÂN TRANG) ---
async function fetchNotifications() {
  if (notiState.isLoading || !notiState.hasMore) return;

  notiState.isLoading = true;
  document.getElementById("notiLoading").style.display = "block";

  try {
    // Gọi API với page và size động
    const res = await callAPI(
      `/auth/notifications?page=${notiState.page}&size=${notiState.size}`,
      "GET"
    );

    if (res && res.success && res.data && Array.isArray(res.data.listData)) {
      const list = res.data.listData;

      // Render danh sách
      if (list.length > 0) {
        const html = list.map((item) => createNotiItemHTML(item)).join("");

        // Nếu là trang 0 thì ghi đè, trang sau thì nối thêm
        const container = document.getElementById("nbNotiList");
        if (notiState.page === 0) container.innerHTML = html;
        else container.insertAdjacentHTML("beforeend", html);

        notiState.page++; // Tăng page cho lần sau
      } else {
        if (notiState.page === 0)
          document.getElementById("nbNotiList").innerHTML =
            '<div class="empty-noti">Không có thông báo nào</div>';
        notiState.hasMore = false; // Hết dữ liệu
      }

      // Check nếu backend trả về ít hơn size -> Hết dữ liệu
      if (list.length < notiState.size) notiState.hasMore = false;
    } else {
      notiState.hasMore = false;
    }
  } catch (e) {
    console.error("Lỗi tải thông báo:", e);
  } finally {
    notiState.isLoading = false;
    document.getElementById("notiLoading").style.display = "none";
  }
}

// --- HÀM LẤY SỐ GIỎ HÀNG (CHỈ GỌI 1 LẦN KHI LOAD) ---
async function getInitialCartCount() {
  try {
    const res = await callAPI("/auth/carts", "GET");
    const badge = document.getElementById("cartBadge");
    if (res && res.success && Array.isArray(res.data) && res.data.length > 0) {
      badge.innerText = res.data.length > 99 ? "99+" : res.data.length;
      badge.style.display = "block";
    }
  } catch (e) {
    console.error("Cart init error", e);
  }
}

// --- UI HELPERS ---
function prependNotification(item) {
  const notiList = document.getElementById("nbNotiList");
  if (notiList.querySelector(".empty-noti")) notiList.innerHTML = "";
  const html = createNotiItemHTML(item, true);
  notiList.insertAdjacentHTML("afterbegin", html);
}

function createNotiItemHTML(item, isNew = false) {
  const title = item.title || "Thông báo";
  const msg = item.message || item.content || "";
  const time = item.createdTime
    ? new Date(item.createdTime).toLocaleString("vi-VN")
    : "";
  const id = item.id || item.notificationId;
  return `
        <div class="noti-item ${isNew ? "unread" : ""}" id="noti-${id}">
            <div class="noti-content">
                <div class="noti-title">${title}</div>
                <div class="noti-msg">${msg}</div>
                <div class="noti-time">${time}</div>
            </div>
            <i class="fa-solid fa-xmark btn-del-noti" onclick="deleteNoti('${id}', event)"></i>
        </div>
    `;
}

window.deleteNoti = async (id, e) => {
  e.stopPropagation();
  const item = document.getElementById(`noti-${id}`);
  if (item) item.remove();
  // Gọi API xóa 1 cái (theo mảng ID)
  await callAPI("/auth/notifications/delete", "POST", [id]);
};
