import { callAPI } from "/lib/api.js";
import { showDialog } from "/dialog/index.js";
import { connectSse, subscribeTopic } from "/lib/sse.js";
import { noImage } from "/lib/public.js";

let homeData = {
  imageUrl: noImage,
  username: "Khách",
  roleName: "GUEST",
  readNotifications: 0,
  cartsCount: 0,
};

let notiState = {
  page: 0,
  size: 10,
  hasMore: true,
  isLoading: false,
  isLoadedFirstTime: false,
};

const navbarHTML = `
    <link rel="stylesheet" href="/dialog/index.css">
    <style>
        body { padding-top: 80px; }
        .navbar-component {
            background: #fff; height: 80px; width: 100%; position: fixed; top: 0; left: 0; z-index: 999;
            display: flex; align-items: center; justify-content: space-between; padding: 0 40px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.05); box-sizing: border-box; font-family: 'Segoe UI', sans-serif;
            transition: all 0.3s;
        }
        .nb-brand { font-size: 1.8rem; font-weight: 800; color: #10B981; text-decoration: none; display: flex; align-items: center; gap: 8px; min-width: 180px; }
        #nbCenterSlot { flex: 1; display: flex; align-items: center; justify-content: center; margin: 0 40px; gap: 10px; max-width: 800px; }
        .nb-right-wrapper { display: flex; align-items: center; gap: 15px; }
        
        .nb-icon-btn { position: relative; cursor: pointer; font-size: 1.3rem; color: #555; width: 45px; height: 45px; display: flex; align-items: center; justify-content: center; border-radius: 50%; text-decoration: none; transition: 0.2s; }
        
        .nb-badge { 
            position: absolute; top: 2px; right: 2px; background: #ee4d2d; color: white; 
            font-size: 0.7rem; padding: 0 5px; height: 18px; min-width: 18px; border-radius: 10px; 
            font-weight: bold; border: 2px solid white; display: none;
            align-items: center; justify-content: center;
        }
        
        .nb-user-menu { cursor: pointer; display: flex; align-items: center; gap: 10px; margin-left: 10px; }
        .nb-avatar { width: 42px; height: 42px; border-radius: 50%; object-fit: cover; border: 1px solid #ddd; }
        
        .nb-dropdown { position: absolute; right: 0; top: 70px; background: white; width: 280px; border-radius: 12px; box-shadow: 0 5px 25px rgba(0,0,0,0.15); display: none; flex-direction: column; overflow-x: hidden; border: 1px solid #eee; z-index: 1100; padding: 5px 0; overflow-y: auto; height: 600px;}
        .nb-noti-dropdown { width: 360px; right: -80px; padding: 0;}
        .nb-dropdown.show { display: flex; }
        .nb-dropdown a, .nb-dropdown button { padding: 12px 20px; text-decoration: none; color: #333; text-align: left; background: none; border: none; cursor: pointer; border-bottom: 1px solid #f9f9f9; display:flex; align-items:center; gap:12px; font-size:0.95rem; transition: 0.2s; }
        .nb-dropdown a:hover, .nb-dropdown button:hover { background: #f9fafb; color: #10B981; padding-left: 25px; }
        .nb-admin-only { display: none !important; }

        .noti-item { 
            padding: 12px 15px; border-bottom: 1px solid #f0f0f0; display: flex; gap: 10px; position: relative; cursor: pointer; 
            transition: all 0.2s ease-in-out; align-items: flex-start;
        }
        .noti-item:hover { 
            background: #f8fafc; 
            transform: translateX(4px);
            border-left: 3px solid #10B981;
        }
        .noti-item.unread { 
            background: #ecfdf5; 
        } 
        .noti-item.unread .noti-title { 
            color: #059669; 
            font-weight: 700 !important;
        }
        /* Indicator dot for unread */
        .noti-indicator {
            width: 8px; height: 8px; background: #10B981; border-radius: 50%; margin-top: 6px; flex-shrink: 0;
            display: none;
        }
        .noti-item.unread .noti-indicator { display: block; }

        .noti-content { flex: 1; }
        
        .noti-actions {
            display: flex; flex-direction: column; gap: 4px; align-items: center; justify-content: center;
        }
        .btn-icon-noti { 
            cursor: pointer; color: #9ca3af; padding: 4px; border-radius: 4px; transition: 0.2s; font-size: 0.9rem;
            width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
        }
        .btn-icon-noti:hover { background: #e5e7eb; color: #4b5563; }
        
        .btn-mark-read:hover { color: #10B981; background: #d1fae5; }
        .btn-del-noti:hover { color: #EF4444; background: #fee2e2; }

        .btn-clear-all { font-size: 0.8rem; color: #EF4444; cursor: pointer; text-decoration: underline; }

        /* TOAST: Góc dưới phải */
        #nbToastContainer { 
            position: fixed; bottom: 20px; right: 20px; z-index: 99999; 
            display: flex; flex-direction: column; gap: 10px; 
        }
        .nb-toast { 
            background: white; padding: 15px 20px; border-left: 5px solid #10B981; 
            box-shadow: 0 5px 25px rgba(0,0,0,0.15); border-radius: 8px; 
            display: flex; align-items: center; gap: 12px; min-width: 300px; max-width: 380px;
            animation: nbSlideIn 0.3s ease-out; cursor: pointer;
        }
        @keyframes nbSlideIn { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        @media (max-width: 992px) {
            .navbar-component { padding: 10px 15px; height: auto; flex-wrap: wrap; gap: 10px; background: rgba(255,255,255,0.98); backdrop-filter: blur(10px); }
            .nb-brand { order: 1; font-size: 1.5rem; flex: 1; }
            .nb-right-wrapper { order: 2; gap: 2px; }
            #nbCenterSlot { order: 3; width: 100%; margin: 0; padding: 0; max-width: none; }
            .nb-dropdown { height: 400px }
            .nb-noti-dropdown { position: fixed; top: 60px; left: 50%; transform: translateX(-50%); width: 95vw; height: 70vh; max-width: 400px; right: auto; border-radius: 12px; box-shadow: 0 0 0 100vh rgba(0,0,0,0.5); }
        }
    </style>

    <nav class="navbar-component">
        <a href="/home" class="nb-brand"><i class="fa-solid fa-leaf"></i> Tạp Hóa Xanh</a>
        <div id="nbCenterSlot"></div>
        <div class="nb-right-wrapper">
            <a href="/cart" class="nb-icon-btn" title="Giỏ hàng">
                <i class="fa-solid fa-cart-shopping"></i>
                <span class="nb-badge" id="cartBadge">0</span>
            </a>
            <div class="nb-icon-btn" id="nbNotiBtn">
                <i class="fa-regular fa-bell"></i>
                <span class="nb-badge" id="nbBadge" style="display:none">0</span>
                <div class="nb-dropdown nb-noti-dropdown" id="nbNotiDropdown">
                    <div style="padding:15px; font-weight:bold; border-bottom:1px solid #eee; display:flex; justify-content:space-between; background:#fff; border-radius:12px 12px 0 0;">
                        <span>Thông báo</span><span class="btn-clear-all" id="btnClearAllNoti">Xóa tất cả</span>
                    </div>
                    <div class="noti-list" id="nbNotiList" style="max-height: calc(70vh - 50px); overflow-y:auto; overflow-x: hidden; background:#fff; border-radius:0 0 12px 12px;"></div>
                    <div style="text-align:center; padding:10px; display:none; color:#10B981; background:#fff;" id="notiLoading"><i class="fa-solid fa-circle-notch fa-spin"></i></div>
                </div>
            </div>
            <div class="nb-user-menu" id="nbUserMenu">
                <img src="${noImage}" class="nb-avatar" id="nbAvatar">
                <div style="margin-left:5px">
                    <div style="font-weight:600; font-size:0.9rem;" id="nbUsername">Khách</div>
                    <div style="font-size:0.75rem; color:#888;" id="nbRole">GUEST</div>
                </div>
                <div class="nb-dropdown" id="nbUserDropdown">
                    <a href="/home"><i class="fa-solid fa-house" style="color: #10B981 ; width:20px; text-align:center;"></i> Trang chủ</a>
                    <a href="/products"><i class="fa-solid fa-compass" style="color: #F59E0B ; width:20px; text-align:center;"></i> Khám phá sản phẩm</a>
                    <a href="/profile"><i class="fa-regular fa-user" style="color: #3B82F6; width:20px; text-align:center;"></i> Hồ sơ</a>
                    <a href="/session"><i class="fa-solid fa-shield-halved" style="color: #8B5CF6; width:20px; text-align:center;"></i> Phiên đăng nhập</a>
                    <a href="/contact"><i class="fa-solid fa-map-location-dot" style="color: #F59E0B; width:20px; text-align:center;"></i> Sổ địa chỉ</a>
                    <a href="/orders"><i class="fa-solid fa-clipboard-list" style="color: #10B981; width:20px; text-align:center;"></i> Đơn hàng của tôi</a>
                    
                    <div class="nb-admin-only" style="border-top:1px solid #eee; margin:5px 0"></div>
                    <a href="/products-manager" class="nb-admin-only"><i class="fa-solid fa-boxes-stacked" style="color: #EC4899; width:20px; text-align:center;"></i> QL Sản phẩm</a>
                    <a href="/catalog-management" class="nb-admin-only"><i class="fa-solid fa-layer-group" style="color: #6366F1; width:20px; text-align:center;"></i> QL Danh mục</a>
                    <a href="/users" class="nb-admin-only"><i class="fa-solid fa-users-gear" style="color: #0EA5E9; width:20px; text-align:center;"></i> QL Người dùng</a>
                    <a href="/role-permission" class="nb-admin-only"><i class="fa-solid fa-user-lock" style="color: #EF4444; width:20px; text-align:center;"></i> Phân quyền</a>
                    <a href="/order-manager" class="nb-admin-only"><i class="fa-solid fa-file-invoice-dollar" style="color: #14B8A6; width:20px; text-align:center;"></i> Quản lí đơn hàng</a>
                    <a href="/notification" class="nb-admin-only"><i class="fa-solid fa-bullhorn" style="color: #F97316; width:20px; text-align:center;"></i> Gửi thông báo</a>
                    <a href="/server-health" class="nb-admin-only"><i class="fa-solid fa-server" style="color: #10B981; width:20px; text-align:center;"></i> Sức khoẻ Server</a>
                    
                    <button id="nbLogout" style="color:#e11d48; border-top:1px solid #eee; margin-top:5px">
                        <i class="fa-solid fa-right-from-bracket" style="width:20px; text-align:center;"></i> Đăng xuất
                    </button>
                </div>
            </div>
        </div>
    </nav>
    <div id="nbToastContainer"></div>
`;

export async function loadNavbar(options = {}) {
  const div = document.createElement("div");
  div.innerHTML = navbarHTML;
  document.body.prepend(div);
  if (options.centerHTML)
    document.getElementById("nbCenterSlot").innerHTML = options.centerHTML;

  // [LOGIC AN TOÀN TRÁNH 2 LẦN REFRESH]
  const cached = sessionStorage.getItem("homeData");
  if (cached) {
    // 1. Có cache -> Dùng luôn, KHÔNG gọi API /home
    homeData = JSON.parse(cached);
    updateNavbarUI(homeData);
  } else {
    // 2. Không cache -> Gọi API và ĐỢI (await) nó xong
    await fetchHomeData();
  }

  // 3. Sau đó mới kết nối SSE (Tránh xung đột token)
  await connectSse("/sse");
  setupSSERealtime();
  setupEvents();

  document.addEventListener("update-noti-badge", (e) => {
    const delta = parseInt(e.detail);
    if (!isNaN(delta)) updateBadgeCount(delta);
  });
}

async function fetchHomeData() {
  const res = await callAPI("/home", "GET");
  if (res && res.success && res.data) {
    homeData = res.data;
    sessionStorage.setItem("homeData", JSON.stringify(homeData));
    updateNavbarUI(homeData);
  }
  else {
    await showDialog("error", res.message);
  }
}

function updateBadgeCount(delta) {
  let current = parseInt(homeData.readNotifications) || 0;
  homeData.readNotifications = Math.max(0, current + delta);
  updateNavbarUI(homeData);
  sessionStorage.setItem("homeData", JSON.stringify(homeData));
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
  const cartCount = parseInt(data.cartsCount) || 0;
  cartBadge.innerText = cartCount > 99 ? "99+" : cartCount;
  cartBadge.style.display = cartCount > 0 ? "flex" : "none";

  const notiBadge = document.getElementById("nbBadge");
  const notiCount = parseInt(data.readNotifications) || 0;
  notiBadge.innerText = notiCount > 99 ? "99+" : notiCount;
  notiBadge.style.display = notiCount > 0 ? "flex" : "none";
}

// Hàm hiển thị Toast (Plan B: Tự xóa cũ, thêm mới)
function showSmartToast(title, message, iconClass) {
  const container = document.getElementById("nbToastContainer");
  container.innerHTML = ""; // Xóa cái cũ ngay lập tức

  const toast = document.createElement("div");
  toast.className = "nb-toast";
  const displayMsg =
    message.length > 80 ? message.substring(0, 80) + "..." : message;

  toast.innerHTML = `
        <i class="fa-solid ${iconClass}" style="color:#10B981; font-size:1.4rem;"></i>
        <div style="flex:1">
            <div style="font-weight:bold; font-size:0.95rem; margin-bottom:2px;">${title}</div>
            <div style="font-size:0.85rem; color:#555; line-height:1.3;">${displayMsg}</div>
        </div>
        <i class="fa-solid fa-xmark" style="color:#999; cursor:pointer;" onclick="this.parentElement.remove()"></i>
    `;

  container.appendChild(toast);
  setTimeout(() => {
    if (toast.isConnected) toast.remove();
  }, 5000);
}

// [XỬ LÝ REALTIME - PLAN B]
function setupSSERealtime() {
  // 1. Notification (Hệ thống) - VẪN GIỮ (Hiện chuông, cộng số)
  subscribeTopic("notification", (data) => {
    updateBadgeCount(1);
    showSmartToast(
      "Thông báo hệ thống",
      data.message || data.content,
      "fa-bell",
    );
    prependNotification(data);
  });

  // 2. Message (Tin nhắn) - CẮT BỎ LOẠI 1 (Chỉ hiện Toast, ko vào chuông)
  subscribeTopic("message", async (data) => {
    // Chỉ hiện Box nổi (Toast)
    showSmartToast(`Tin nhắn`, "Bạn có tin nhắn mới", "fa-comment-dots");
  });

  // 3. Cart
  subscribeTopic("cart", (data) => {
    const change = parseInt(data);
    if (!isNaN(change)) {
      let current = parseInt(homeData.cartsCount) || 0;
      homeData.cartsCount = Math.max(0, current + change);
      updateNavbarUI(homeData);
      sessionStorage.setItem("homeData", JSON.stringify(homeData));
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

  document.getElementById("nbLogout").onclick = async () => {
    await showDialog(
      "question",
      "Đăng xuất?",
      async () => {
        sessionStorage.clear();
        localStorage.clear();
        await callAPI("/logout");
        window.location.replace("/auth/login");
      },
      "Đăng xuất",
      true,
    );
  };

  document.addEventListener("click", () => {
    userDropdown.classList.remove("show");
    notiDropdown.classList.remove("show");
  });

  // [FIX] Xóa tất cả - Xóa sạch UI
  const clearBtn = document.getElementById("btnClearAllNoti");
  if (clearBtn) {
    clearBtn.onclick = async (e) => {
      e.stopPropagation();
      await showDialog("question", "Bạn có muốn xoá tất cả thông báo ?", async () => {
        // Gọi API xóa tất cả
        const res = await callAPI("/notifications", "DELETE");
        if (res && res.success) {
          // Xóa giao diện
          document.getElementById("nbNotiList").innerHTML =
            '<div class="empty-noti" style="padding:20px;text-align:center;color:#999">Không có thông báo nào</div>';

          // Reset số
          homeData.readNotifications = 0;
          updateNavbarUI(homeData);
          sessionStorage.setItem("homeData", JSON.stringify(homeData));
          await showDialog("success", "Đã xóa tất cả thông báo");
        } else {
          await showDialog("error", res.message);
        }
      });


    };
  }
}

async function fetchNotifications() {
  if (notiState.isLoading || !notiState.hasMore) return;
  notiState.isLoading = true;
  document.getElementById("notiLoading").style.display = "block";
  const res = await callAPI(
    `/notifications?page=${notiState.page}&size=${notiState.size}`,
    "GET",
  );
  if (res && res.success && res.data?.listData) {
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
    notiState.isLoading = false;
    document.getElementById("notiLoading").style.display = "none";
  } else {
    notiState.hasMore = false;
    await showDialog("error", res.message);
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
  const link = item.linkUrl || "#";
  const isUnread = isNew || !item.isRead;

  return `
    <div class="noti-item ${isUnread ? "unread" : ""
    }" id="noti-${id}" onclick="readNoti('${id}', '${link}', this)" title="${isUnread ? "Nhấn để xem" : "Đã đọc"}">
        <div class="noti-indicator"></div>
        <div class="noti-content">
            <div class="noti-title" style="font-weight:600;font-size:0.95rem;transition:color 0.2s">${title}</div>
            <div class="noti-msg" style="font-size:0.9rem;color:#555">${msg}</div>
            <div class="noti-time" style="font-size:0.75rem;color:#999;margin-top:4px">${time}</div>
        </div>
        <div class="noti-actions">
           ${isUnread ? `<i class="fa-solid fa-check btn-icon-noti btn-mark-read" onclick="markAsRead('${id}', event, this)" title="Đánh dấu đã đọc"></i>` : ''}
           <i class="fa-solid fa-xmark btn-icon-noti btn-del-noti" onclick="deleteNoti('${id}', event)" title="Xóa thông báo"></i>
        </div>
    </div>
  `;
}

window.deleteNoti = async (id, e) => {
  if (e) e.stopPropagation();
  await showDialog("question", "Bạn có muốn xoá thông báo này ?", async () => {
    // e.stopPropagation(); // Đã chuyển lên đầu
    const item = document.getElementById(`noti-${id}`);
    if (item) {
      if (item.classList.contains("unread")) updateBadgeCount(-1);
      item.remove();
    }
    const res = await callAPI("/notifications/delete", "POST", [id]);
    await showDialog(res.success ? "success" : "error", res.message);
  });

};

window.markAsRead = async (id, e, btnEl) => {
  e.stopPropagation();
  const item = document.getElementById(`noti-${id}`);
  if (item && item.classList.contains("unread")) {
    item.classList.remove("unread");
    updateBadgeCount(-1);
    if (btnEl) btnEl.remove(); // Xóa nút check sau khi đã đọc

    await callAPI("/notifications", "PATCH", [id]);
  }
}

window.readNoti = async (id, link, el) => {
  // Nếu chưa đọc -> đánh dấu đọc
  if (el.classList.contains("unread")) {
    el.classList.remove("unread");
    updateBadgeCount(-1);

    // Xóa nút check nếu có
    const checkBtn = el.querySelector('.btn-mark-read');
    if (checkBtn) checkBtn.remove();

    await callAPI("/notifications", "PATCH", [id]);
  }
  if (link && link !== "#" && link !== "null") window.location.href = link;
};
