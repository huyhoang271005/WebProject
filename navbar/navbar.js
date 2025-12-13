import { callAPI } from "../public/api.js";
import { showDialog } from "../dialog/index.js";
// Nếu bro chưa có file public.js chứa noImage thì thay dòng dưới bằng link ảnh mặc định
// import { noImage } from "../public/public.js";
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
        #nbRightSlot { display: flex; align-items: center; gap: 15px; }

        .nb-user-menu { position: relative; cursor: pointer; padding-left: 15px; border-left: 1px solid #eee; margin-left: 10px; }
        .nb-avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #E5E7EB; transition: 0.2s; }
        .nb-avatar:hover { border-color: #10B981; }

        /* Dropdown Menu xịn */
        .nb-dropdown { 
            position: absolute; right: 0; top: 60px; background: white; width: 280px; border-radius: 12px; 
            box-shadow: 0 10px 30px rgba(0,0,0,0.15); display: none; flex-direction: column; overflow: hidden; border: 1px solid #eee; 
            animation: slideDown 0.2s ease;
        }
        @keyframes slideDown { from{opacity:0; transform:translateY(10px)} to{opacity:1; transform:translateY(0)} }
        
        .nb-dropdown.show { display: flex; }
        .nb-dropdown a, .nb-dropdown button { 
            padding: 12px 20px; text-decoration: none; color: #333; text-align: left; 
            background: none; border: none; cursor: pointer; border-bottom: 1px solid #f9f9f9; 
            display:flex; align-items:center; gap:10px; font-size:0.9rem; transition: 0.2s;
        }
        .nb-dropdown a:hover, .nb-dropdown button:hover { background: #ECFDF5; color: #10B981; padding-left: 25px; }
        
        .nb-admin-only { display: none !important; }
    </style>

    <nav class="navbar-component">
        <a href="../home/index.html" class="nb-brand"><i class="fa-solid fa-leaf"></i> Tạp Hóa Xanh</a>

        <div id="nbCenterSlot"></div>

        <div class="nb-actions" style="display:flex; align-items:center;">
            <div id="nbRightSlot"></div>

            <div class="nb-user-menu" id="nbUserMenu">
                <img src="${noImage}" class="nb-avatar" id="nbAvatar">
                
                <div class="nb-dropdown" id="nbDropdown">
                    <div style="padding:15px 20px; background:#f9f9f9; border-bottom:1px solid #eee;">
                        <div style="font-weight:bold; color:#111;" id="nbUsername">Khách</div>
                        <div style="font-size:0.8rem; color:#666;" id="nbRole">Member</div>
                    </div>
                    
                    <a href="../profile"><i class="fa-regular fa-id-card"></i> Trang cá nhân</a>
                    <a href="../session"><i class="fa-solid fa-laptop-medical"></i> Quản lý phiên đăng nhập</a>
                    
                    <div class="nb-admin-only" style="border-top: 1px solid #eee; margin-top:5px;"></div>
                    <div class="nb-admin-only" style="padding:5px 20px; font-size:0.7rem; color:#999; font-weight:bold;">QUẢN TRỊ VIÊN</div>
                    
                    <a href="../role-permission" class="nb-admin-only"><i class="fa-solid fa-user-shield"></i> Quản lý quyền hạn</a>
                    <a href="../users" class="nb-admin-only"><i class="fa-solid fa-users-gear"></i> Danh sách người dùng</a>
                    <a href="../catalog-management" class="nb-admin-only"><i class="fa-solid fa-list-check"></i> Quản lý danh mục</a>
                    <a href="../Thanh/Category/index.html" class="nb-admin-only"><i class="fa-solid fa-folder-tree"></i> Quản lý Category</a>
                    
                    <button id="nbLogout" style="color:red; border-top: 1px solid #eee; margin-top:5px;">
                        <i class="fa-solid fa-right-from-bracket"></i> Đăng xuất
                    </button>
                </div>
            </div>
        </div>
    </nav>
`;

// Biến lưu tạm dữ liệu user
const userData = {
  imageUrl: sessionStorage.getItem("imageUrl"),
  username: sessionStorage.getItem("username"),
  roleName: sessionStorage.getItem("roleName"),
};

export async function loadNavbar(options = {}) {
  // 1. Render khung
  const div = document.createElement("div");
  div.innerHTML = navbarHTML;
  document.body.prepend(div);

  // 2. Nhét Custom Slot
  if (options.centerHTML)
    document.getElementById("nbCenterSlot").innerHTML = options.centerHTML;
  if (options.rightHTML)
    document.getElementById("nbRightSlot").innerHTML = options.rightHTML;

  try {
    // 3. TỐI ƯU: Kiểm tra Cache trước
    if (!userData.username || !userData.roleName) {
      // Không có trong cache -> Gọi API
      const profile = await callAPI("/profile");
      if (profile && profile.success) {
        const user = profile.data;
        // Lưu vào Cache
        sessionStorage.setItem("imageUrl", user.imageUrl || noImage);
        sessionStorage.setItem("username", user.username);
        sessionStorage.setItem("roleName", user.roleName);

        // Cập nhật biến tạm
        userData.imageUrl = user.imageUrl || noImage;
        userData.username = user.username;
        userData.roleName = user.roleName;
      } else {
        // Lỗi profile -> Đá về login
        window.location.replace("../auth/login");
        return;
      }
    }

    // 4. Cập nhật giao diện từ dữ liệu (Cache hoặc API mới)
    if (userData.imageUrl)
      document.getElementById("nbAvatar").src = userData.userData; // Fix lỗi cũ src=user.imageUrl
    if (userData.imageUrl)
      document.getElementById("nbAvatar").src = userData.imageUrl;
    if (userData.username)
      document.getElementById("nbUsername").textContent = userData.username;
    if (userData.roleName)
      document.getElementById("nbRole").textContent = userData.roleName;

    // 5. Check quyền Admin (Dùng setProperty để đè !important)
    if (userData.roleName === "ADMIN") {
      document.querySelectorAll(".nb-admin-only").forEach((el) => {
        el.style.setProperty("display", "flex", "important");
      });
    }
  } catch (e) {
    console.log("Lỗi Navbar:", e);
  }

  // 6. Sự kiện Click
  const menuBtn = document.getElementById("nbUserMenu");
  const dropdown = document.getElementById("nbDropdown");

  if (menuBtn) {
    menuBtn.onclick = (e) => {
      e.stopPropagation();
      dropdown.classList.toggle("show");
    };
  }
  document.addEventListener("click", () => {
    if (dropdown) dropdown.classList.remove("show");
  });

  const logoutBtn = document.getElementById("nbLogout");
  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await showDialog(
        "question",
        "Bạn có chắc chắn muốn đăng xuất?",
        async () => {
          await callAPI("/logout");
          sessionStorage.clear(); // Xóa sạch Cache
          localStorage.setItem("rememberUser", "false");
          window.location.replace("../auth/login");
        }
      );
    };
  }
}
