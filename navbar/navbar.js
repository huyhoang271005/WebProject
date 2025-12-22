import { callAPI } from "../public/api.js";
// Import hàm showDialog từ file dialog CŨ của bro
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

// CSS Navbar (Giữ nguyên giao diện Mobile Shopee xịn xò)
const navbarHTML = `
    <style>
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
        
        /* Badge chỉnh lại flex để số căn giữa đẹp hơn */
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

        /* MOBILE RESPONSIVE */
        @media (max-width: 992px) {
            .navbar-component { padding: 10px 15px; height: auto; flex-wrap: wrap; }
            .nb-brand { order: 1; flex: 1; font-size: 1.4rem; min-width: auto; }
            .nb-right-wrapper { order: 2; gap: 5px; }
            .nb-icon-btn { width: 38px; height: 38px; font-size: 1.2rem; }
            .nb-user-menu { margin-left: 5px; }
            .nb-avatar { width: 35px; height: 35px; }
            .nb-username, #nbRole { display: none; } 
            #nbCenterSlot { order: 3; width: 100%; margin: 10px 0 0 0; padding: 0; max-width: none; }
            #navbarSearchInput, #homeSearch { height: 40px !important; background: #f5f5f5 !important; border: none !important; border-radius: 4px !important; }
            .nav-cat-btn { display: none; }
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
                <div class="nb-dropdown" id="nbUserDropdown">
                    <div style="padding:15px; border-bottom:1px solid #eee; background:#fcfcfc"><div style="font-weight:bold" id="nbUsername">Khách</div><div style="font-size:0.8rem; color:#666" id="nbRole">...</div></div>
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
    if (!userData.username) {
      const profile = await callAPI("/profile");
      if (profile && profile.success) {
        const user = profile.data;
        Object.assign(userData, {
          imageUrl: user.imageUrl || noImage,
          username: user.username,
          roleName: user.roleName,
        });
        sessionStorage.setItem("imageUrl", userData.imageUrl);
        sessionStorage.setItem("username", userData.username);
        sessionStorage.setItem("roleName", userData.roleName);
      } else {
        userData.username = "Khách";
        userData.roleName = "GUEST";
      }
    }

    if (userData.imageUrl)
      document.getElementById("nbAvatar").src = userData.imageUrl;
    if (userData.username !== "Khách") {
      document.getElementById("nbUsername").textContent = userData.username;
      document.getElementById("nbRole").textContent = userData.roleName;
      if (userData.roleName === "ADMIN")
        document
          .querySelectorAll(".nb-admin-only")
          .forEach((el) =>
            el.style.setProperty("display", "flex", "important")
          );

      await connectSse("/sse");
      setupSSERealtime();

      // [FIX MỚI] LOGIC ĐẾM GIỎ HÀNG CHUẨN
      try {
        const cartRes = await callAPI("/auth/carts", "GET");
        if (
          cartRes &&
          cartRes.success &&
          cartRes.data &&
          Array.isArray(cartRes.data.listData)
        ) {
          let totalItems = 0;
          // Duyệt từng sản phẩm để đếm item con
          cartRes.data.listData.forEach((product) => {
            if (
              product.cartItemDTOList &&
              Array.isArray(product.cartItemDTOList)
            ) {
              totalItems += product.cartItemDTOList.length;
            }
          });

          const b = document.getElementById("cartBadge");
          if (b) {
            if (totalItems > 0) {
              b.innerText = totalItems > 99 ? "99+" : totalItems;
              b.style.display = "flex"; // Hiện badge
            } else {
              b.style.display = "none";
            }
          }
        }
      } catch (err) {
        console.error("Cart Error:", err);
      }
    } else {
      document.getElementById("nbNotiList").innerHTML =
        '<div style="padding:20px; text-align:center; color:#999">Đăng nhập để xem thông báo</div>';
    }
  } catch (e) {
    console.error("Navbar Error:", e);
  }
  setupEvents();
}

function setupSSERealtime() {
  subscribeTopic("notification", (data) => {
    prependNotification(data);
    document.getElementById("nbBadge").style.display = "block";
  });
  subscribeTopic("cart", (data) => {
    // SSE báo thay đổi thì load lại API cho chắc, hoặc cộng trừ tùy logic
    // Ở đây đơn giản là load lại Navbar (nhưng sẽ hơi nặng), tốt nhất là cập nhật số hiển thị
    // Tạm thời giữ logic cộng dồn cũ, nhưng nên reload lại cart items thì chuẩn hơn
    const change = parseInt(data);
    const b = document.getElementById("cartBadge");
    if (b) {
      let newCount = (parseInt(b.innerText) || 0) + change;
      if (newCount < 0) newCount = 0;
      b.innerText = newCount > 99 ? "99+" : newCount;
      b.style.display = newCount > 0 ? "flex" : "none";
    }
  });
}

// === CÁC HÀM XỬ LÝ THÔNG BÁO ===
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
            '<div class="empty-noti">Không có thông báo nào</div>';
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
  const id = item.userNotificationId || item.id || item.notificationId;

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
  if (!id || id === "undefined") return;
  const item = document.getElementById(`noti-${id}`);
  if (item) item.remove();
  await callAPI("/auth/notifications/delete", "POST", [id]);
  if (document.getElementById("nbNotiList").children.length === 0)
    document.getElementById("nbNotiList").innerHTML =
      '<div class="empty-noti">Không có thông báo nào</div>';
};

// === SỰ KIỆN ===
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
      document.getElementById("nbBadge").style.display = "none";
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

  const clearAllBtn = document.getElementById("btnClearAllNoti");
  if (clearAllBtn) {
    clearAllBtn.onclick = async (e) => {
      e.stopPropagation();
      if (!confirm("Xóa tất cả?")) return; // Dùng confirm thường vì dialog chưa export hàm confirm riêng
      // Logic xóa tất cả...
      document.getElementById("nbNotiList").innerHTML =
        '<div class="empty-noti">Không có thông báo nào</div>';
    };
  }

  document.addEventListener("click", () => {
    userDropdown.classList.remove("show");
    notiDropdown.classList.remove("show");
  });

  // [QUAN TRỌNG] GỌI HÀM SHOWDIALOG THEO ĐÚNG CẤU TRÚC CỦA BRO
  const logoutBtn = document.getElementById("nbLogout");
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      // Hàm của bro: showDialog(status, message, callback, contentButton, dismiss)
      await showDialog(
        "question", // status
        "Bạn có chắc chắn muốn đăng xuất không?", // message
        async () => {
          // callback
          await callAPI("/logout");
          sessionStorage.clear();
          window.location.replace("../auth/login");
        },
        "Đăng xuất", // contentButton (chữ trên nút)
        true // dismiss
      );
    };
  }
}
