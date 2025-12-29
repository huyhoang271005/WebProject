import { callAPI } from "../public/api.js";
import { showDialog } from "../dialog/index.js";
import { connectSse, subscribeTopic } from "../public/Sse.js";

const noImage = "https://cdn-icons-png.flaticon.com/512/847/847969.png";

let notiState = {
  page: 0,
  size: 10,
  hasMore: true,
  isLoading: false,
  isLoadedFirstTime: false,
};

// CSS Navbar + [FIX CSS BODY]
const navbarHTML = `
    <style>
        /* [FIX] Reset Body để Spacer hoạt động đúng */
        body {
            display: block !important; 
            margin: 0 !important;
            padding: 0 !important;
            min-height: 100vh;
        }

        .navbar-component {
            background: #fff; height: 80px; width: 100%; position: fixed; top: 0; left: 0; z-index: 1000;
            display: flex; align-items: center; justify-content: space-between; padding: 0 40px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.05); box-sizing: border-box; font-family: 'Segoe UI', sans-serif;
        }
        .nb-brand { font-size: 1.8rem; font-weight: 800; color: #10B981; text-decoration: none; display: flex; align-items: center; gap: 8px; min-width: 180px; }
        #nbCenterSlot { flex: 1; display: flex; align-items: center; justify-content: center; margin: 0 40px; gap: 10px; max-width: 800px; }
        .nb-right-wrapper { display: flex; align-items: center; gap: 15px; }
        .nb-icon-btn { position: relative; cursor: pointer; font-size: 1.3rem; color: #555; width: 45px; height: 45px; display: flex; align-items: center; justify-content: center; border-radius: 50%; text-decoration: none; transition: 0.2s; }
        .nb-icon-btn:hover { background: #f3f4f6; color: #10B981; }
        
        .nb-badge { 
            position: absolute; top: 5px; right: 5px; background: #ee4d2d; color: white; 
            font-size: 0.7rem; padding: 0 5px; height: 16px; min-width: 16px; border-radius: 10px; 
            font-weight: bold; border: 2px solid white; display: none;
            align-items: center; justify-content: center;
        }
        
        .nb-user-menu { cursor: pointer; display: flex; align-items: center; gap: 10px; margin-left: 10px; }
        .nb-avatar { width: 42px; height: 42px; border-radius: 50%; object-fit: cover; border: 1px solid #ddd; }
        
        .nb-dropdown { position: absolute; right: 0; top: 70px; background: white; width: 260px; border-radius: 8px; box-shadow: 0 5px 20px rgba(0,0,0,0.15); display: none; flex-direction: column; overflow: hidden; border: 1px solid #eee; z-index: 1100; }
        .nb-noti-dropdown { width: 360px; right: -80px; }
        .nb-dropdown.show { display: flex; }
        .nb-dropdown a, .nb-dropdown button { padding: 12px 20px; text-decoration: none; color: #333; text-align: left; background: none; border: none; cursor: pointer; border-bottom: 1px solid #f9f9f9; display:flex; align-items:center; gap:12px; font-size:0.95rem; }
        .nb-dropdown a:hover, .nb-dropdown button:hover { background: #f9fafb; color: #10B981; }
        .nb-admin-only { display: none !important; }

        .noti-item { padding: 12px 15px; border-bottom: 1px solid #f0f0f0; display: flex; gap: 10px; position: relative; }
        .noti-item.unread { background: #f0fdf4; }
        .noti-content { flex: 1; }
        .btn-del-noti { cursor: pointer; color: #ccc; }
        .btn-clear-all { font-size: 0.8rem; color: #EF4444; cursor: pointer; text-decoration: underline; }

        @media (max-width: 992px) {
            .navbar-component { padding: 10px 15px; height: auto; flex-wrap: wrap; }
            .nb-brand { order: 1; flex: 1; font-size: 1.4rem; min-width: auto; }
            .nb-right-wrapper { order: 2; gap: 5px; }
            .nb-icon-btn { width: 38px; height: 38px; font-size: 1.2rem; }
            .nb-user-menu { margin-left: 5px; }
            .nb-avatar { width: 35px; height: 35px; }
            .nb-username, #nbRole { display: none; } 
            #nbCenterSlot { order: 3; width: 100%; margin: 10px 0 0 0; padding: 0; max-width: none; }
            .nb-noti-dropdown { position: fixed; top: 60px; left: 50%; transform: translateX(-50%); width: 92vw; height: 80vh; max-width: 400px; right: auto; }
        }
    </style>

    <nav class="navbar-component">
        <a href="../home/index.html" class="nb-brand"><i class="fa-solid fa-leaf"></i> Tạp Hóa Xanh</a>
        <div id="nbCenterSlot"></div>
        <div class="nb-right-wrapper">
            <a href="../cart/index.html" class="nb-icon-btn" title="Giỏ hàng">
                <i class="fa-solid fa-cart-shopping"></i>
                <span class="nb-badge" id="cartBadge">0</span>
            </a>
            <div class="nb-icon-btn" id="nbNotiBtn">
                <i class="fa-regular fa-bell"></i>
                <span class="nb-badge" id="nbBadge" style="display:none">0</span>
                <div class="nb-dropdown nb-noti-dropdown" id="nbNotiDropdown">
                    <div style="padding:15px; font-weight:bold; border-bottom:1px solid #eee; display:flex; justify-content:space-between;"><span>Thông báo</span><span class="btn-clear-all" id="btnClearAllNoti">Xóa tất cả</span></div>
                    <div class="noti-list" id="nbNotiList" style="max-height:400px; overflow-y:auto;"></div>
                    <div style="text-align:center; padding:10px; display:none; color:#10B981" id="notiLoading"><i class="fa-solid fa-circle-notch fa-spin"></i></div>
                </div>
            </div>
            <div class="nb-user-menu" id="nbUserMenu">
                <img src="${noImage}" class="nb-avatar" id="nbAvatar">
                <div style="margin-left:5px">
                    <div style="font-weight:600; font-size:0.9rem;" id="nbUsername">Khách</div>
                    <div style="font-size:0.75rem; color:#888;" id="nbRole">GUEST</div>
                </div>
                <div class="nb-dropdown" id="nbUserDropdown">
                    <a href="../profile"><i class="fa-regular fa-id-card"></i> Hồ sơ</a>
                    <a href="../session"><i class="fa-solid fa-laptop-medical"></i> Phiên đăng nhập</a>
                    <a href="../contact"><i class="fa-solid fa-map-location-dot"></i> Địa chỉ</a>
                    <a href="../orders"></i> Đơn hàng của tôi</a>
                    <div class="nb-admin-only" style="border-top:1px solid #eee; margin:5px 0"></div>
                    <a href="../products-manager" class="nb-admin-only"><i class="fa-solid fa-box-open"></i> QL Sản phẩm</a>
                    <a href="../catalog-management" class="nb-admin-only"><i class="fa-solid fa-layer-group"></i> QL Danh mục</a>
                    <a href="../users" class="nb-admin-only"><i class="fa-solid fa-users"></i> QL Người dùng</a>
                    <a href="../role-permission" class="nb-admin-only"><i class="fa-solid fa-user-shield"></i> Phân quyền</a>
                    <a href="../order-manager" class="nb-admin-only"></i> Quản lí đơn hàng</a>
                    <a href="../notification" class="nb-admin-only"></i> Gửi thông báo</a>
                    
                    <button id="nbLogout" style="color:#e11d48; border-top:1px solid #eee; margin-top:5px"><i class="fa-solid fa-right-from-bracket"></i> Đăng xuất</button>
                </div>
            </div>
        </div>
    </nav>
    <div style="height: 80px; width: 100%; clear: both;" class="nav-spacer"></div>
    <style>@media(max-width:992px){ .nav-spacer { height: 110px !important; } }</style>
`;

let homeData = {
  imageUrl: noImage,
  username: "Khách",
  roleName: "GUEST",
  readNotifications: 0,
  cartsCount: 0,
};

export async function loadNavbar(options = {}) {
  const div = document.createElement("div");
  div.innerHTML = navbarHTML;
  document.body.prepend(div);
  if (options.centerHTML)
    document.getElementById("nbCenterSlot").innerHTML = options.centerHTML;

  // 1. Kiểm tra sessionCache (Giữ SessionStorage như bro muốn)
  const cached = sessionStorage.getItem("homeData");
  if (!sessionStorage.getItem("hasCache")) {
    sessionStorage.setItem("hasCache", "false");
  }
  let hasCache = sessionStorage.getItem("hasCache");
  if (cached) {
    try {
      homeData = JSON.parse(cached);
      updateNavbarUI(homeData); // Render ngay lập tức từ Session
      sessionStorage.setItem("hasCache", "true");

      // Vẫn nối SSE để update realtime
      if (homeData.username !== "Khách") {
        await connectSse("/sse");
        setupSSERealtime();
      }
    } catch (e) {
      console.error("Lỗi parse homeData", e);
    }
  }

  // 2. Chỉ gọi API khi KHÔNG có cache (Lần đầu mở Tab hoặc F5 nếu session mất)
  if (hasCache == "false") {
    try {
      const res = await callAPI("/home", "GET");
      if (res && res.success && res.data) {
        homeData = res.data;
        sessionStorage.setItem("homeData", JSON.stringify(homeData));
        updateNavbarUI(homeData);

        if (homeData.username !== "Khách") {
          await connectSse("/sse");
          setupSSERealtime();
        }
      }
    } catch (err) {
      console.error("Lỗi tải thông tin Home:", err);
    }
  }

  setupEvents();
}

function updateNavbarUI(data) {
  if (!data) return;

  document.getElementById("nbAvatar").src = data.imageUrl || noImage;
  if (data.username && data.username !== "Khách") {
    document.getElementById("nbUsername").textContent = data.username;
    document.getElementById("nbRole").textContent = data.roleName;

    if (data.roleName === "ADMIN") {
      document
        .querySelectorAll(".nb-admin-only")
        .forEach((el) => el.style.setProperty("display", "flex", "important"));
    }
  }

  const cartBadge = document.getElementById("cartBadge");
  if (data.cartsCount > 0) {
    cartBadge.innerText = data.cartsCount > 99 ? "99+" : data.cartsCount;
    cartBadge.style.display = "flex";
  } else {
    cartBadge.style.display = "none";
  }

  const notiBadge = document.getElementById("nbBadge");
  if (data.readNotifications > 0) {
    notiBadge.innerText =
      data.readNotifications > 99 ? "99+" : data.readNotifications;
    notiBadge.style.display = "flex";
  } else {
    notiBadge.style.display = "none";
  }
}

function setupSSERealtime() {
  subscribeTopic("notification", (data) => {
    homeData.readNotifications = (homeData.readNotifications || 0) + 1;
    updateNavbarUI(homeData);
    sessionStorage.setItem("homeData", JSON.stringify(homeData)); // Cập nhật Session

    const notiList = document.getElementById("nbNotiList");
    if (document.getElementById("nbNotiDropdown").classList.contains("show")) {
      prependNotification(data);
    }
  });

  subscribeTopic("cart", (data) => {
    const change = parseInt(data);
    if (!isNaN(change)) {
      let newCount = (homeData.cartsCount || 0) + change;
      if (newCount < 0) newCount = 0;

      homeData.cartsCount = newCount;
      updateNavbarUI(homeData);
      sessionStorage.setItem("homeData", JSON.stringify(homeData)); // Cập nhật Session
    }
  });
}

function setupEvents() {
  const userDropdown = document.getElementById("nbUserDropdown");
  const notiDropdown = document.getElementById("nbNotiDropdown");
  const notiList = document.getElementById("nbNotiList");

  document.getElementById("nbUserMenu").onclick = (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle("show");
    notiDropdown.classList.remove("show");
  };

  document.getElementById("nbNotiBtn").onclick = async (e) => {
    e.stopPropagation();
    notiDropdown.classList.toggle("show");
    userDropdown.classList.remove("show");

    if (notiDropdown.classList.contains("show")) {
      if (!notiState.isLoadedFirstTime) {
        await fetchNotifications();
        notiState.isLoadedFirstTime = true;
      }
    }
  };

  if (notiList) {
    notiList.addEventListener("scroll", () => {
      if (
        notiList.scrollTop + notiList.clientHeight >=
        notiList.scrollHeight - 10
      )
        fetchNotifications();
    });
  }

  const logoutBtn = document.getElementById("nbLogout");
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await showDialog(
        "question",
        "Bạn có chắc chắn muốn đăng xuất không?",
        async () => {
          await callAPI("/logout");
          sessionStorage.clear(); // Xóa sạch session
          window.location.replace("../auth/login");
        },
        "Đăng xuất",
        true
      );
    };
  }

  document.addEventListener("click", () => {
    userDropdown.classList.remove("show");
    notiDropdown.classList.remove("show");
  });

  const clearAllBtn = document.getElementById("btnClearAllNoti");
  if (clearAllBtn) {
    clearAllBtn.onclick = async (e) => {
      e.stopPropagation();
      if (!confirm("Xóa tất cả thông báo?")) return;
      document.getElementById("nbNotiList").innerHTML =
        '<div class="empty-noti" style="padding:20px;text-align:center;color:#999">Không có thông báo nào</div>';
    };
  }
}

async function fetchNotifications() {
  if (notiState.isLoading || !notiState.hasMore) return;
  notiState.isLoading = true;
  document.getElementById("notiLoading").style.display = "block";

  try {
    const res = await callAPI(
      `/auth/notifications?page=${notiState.page}&size=${notiState.size}`,
      "GET"
    );
    if (res && res.success && res.data && Array.isArray(res.data.listData)) {
      const list = res.data.listData;
      if (list.length > 0) {
        const html = list.map((item) => createNotiItemHTML(item)).join("");
        const container = document.getElementById("nbNotiList");
        if (notiState.page === 0) container.innerHTML = html;
        else container.insertAdjacentHTML("beforeend", html);
        notiState.page++;
      } else {
        if (notiState.page === 0)
          document.getElementById("nbNotiList").innerHTML =
            '<div class="empty-noti" style="padding:20px;text-align:center;color:#999">Không có thông báo nào</div>';
        notiState.hasMore = false;
      }
      if (list.length < notiState.size) notiState.hasMore = false;
    } else {
      notiState.hasMore = false;
    }
  } catch (e) {
    console.error(e);
  } finally {
    notiState.isLoading = false;
    document.getElementById("notiLoading").style.display = "none";
  }
}

function prependNotification(item) {
  const notiList = document.getElementById("nbNotiList");
  const emptyMsg = notiList.querySelector(".empty-noti");
  if (emptyMsg) emptyMsg.remove();

  const html = createNotiItemHTML(item, true);
  notiList.insertAdjacentHTML("afterbegin", html);
}

function createNotiItemHTML(item, isNew = false) {
  const title = item.title || "Thông báo";
  const msg = item.message || item.content || "";
  const time = item.createdTime
    ? new Date(item.createdTime).toLocaleString("vi-VN")
    : "";
  const id = item.userNotificationId || item.id || item.notificationId;

  return `
        <div class="noti-item ${isNew ? "unread" : ""}" id="noti-${id}">
            <div class="noti-content">
                <div class="noti-title" style="font-weight:600;font-size:0.95rem">${title}</div>
                <div class="noti-msg" style="font-size:0.9rem;color:#555">${msg}</div>
                <div class="noti-time" style="font-size:0.75rem;color:#999;margin-top:4px">${time}</div>
            </div>
            <i class="fa-solid fa-xmark btn-del-noti" onclick="deleteNoti('${id}', event)"></i>
        </div>
    `;
}

window.deleteNoti = async (id, e) => {
  e.stopPropagation();
  if (!id || id === "undefined") return;
  const item = document.getElementById(`noti-${id}`);
  if (item) item.remove();
  await callAPI("/auth/notifications/delete", "POST", [id]);
};
