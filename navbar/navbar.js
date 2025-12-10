import { callAPI } from "../public/api.js";
import { showDialog } from "../dialog/index.js";

// HTML & CSS CỦA NAVBAR
const navbarHTML = `
    <style>
        /* CSS NAVBAR */
        .navbar-component {
            background: white; height: 70px; width: 100%;
            position: fixed; top: 0; left: 0; z-index: 1000;
            display: flex; align-items: center; justify-content: space-between;
            padding: 0 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            box-sizing: border-box; font-family: 'Segoe UI', sans-serif;
        }
        .nb-brand { font-size: 1.5rem; font-weight: bold; color: #10B981; text-decoration: none; display: flex; align-items: center; gap: 10px; min-width: 180px; }
        
        /* Slot Center & Right */
        #nbCenterSlot { flex: 1; display: flex; align-items: center; justify-content: center; margin: 0 20px; gap: 15px; }
        #nbRightSlot { display: flex; align-items: center; gap: 15px; }

        /* User Menu */
        .nb-user-menu { position: relative; cursor: pointer; padding-left: 15px; border-left: 1px solid #eee; margin-left: 10px; }
        .nb-avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 2px solid #E5E7EB; }
        
        .nb-dropdown { 
            position: absolute; right: 0; top: 60px; background: white; width: 240px; border-radius: 12px; 
            box-shadow: 0 10px 25px rgba(0,0,0,0.1); display: none; flex-direction: column; overflow: hidden; border: 1px solid #E5E7EB; 
        }
        .nb-dropdown.show { display: flex; }
        .nb-dropdown a, .nb-dropdown button { padding: 12px 20px; text-decoration: none; color: #333; text-align: left; background: none; border: none; cursor: pointer; border-bottom: 1px solid #f9f9f9; display:flex; align-items:center; gap:10px; font-size:0.95rem; }
        .nb-dropdown a:hover, .nb-dropdown button:hover { background: #F9FAFB; color: #10B981; }
        
        .nb-admin-only { display: none !important; }

        /* Chế độ quản lý (Ẩn bớt search/link shop) */
        body.management-page .nb-link-shop { display: none !important; }
    </style>

    <nav class="navbar-component">
        <a href="/WebProject/home/index.html" class="nb-brand"><i class="fa-solid fa-leaf"></i> Tạp Hóa Xanh</a>

        <div id="nbCenterSlot"></div>

        <div class="nb-actions" style="display:flex; align-items:center;">
            <div id="nbRightSlot"></div>

            <div class="nb-user-menu" id="nbUserMenu">
                <img src="https://cdn-icons-png.flaticon.com/512/847/847969.png" class="nb-avatar" id="nbAvatar">
                
                <div class="nb-dropdown" id="nbDropdown">
                    <div style="padding:15px 20px; background:#f9f9f9; border-bottom:1px solid #eee;">
                        <div style="font-weight:bold; color:#111;" id="nbUsername">User</div>
                        <div style="font-size:0.8rem; color:#666;" id="nbRole">Member</div>
                    </div>
                    
                    <a href="/WebProject/profile"><i class="fa-regular fa-id-card"></i> Hồ sơ cá nhân</a>
                    <a href="/WebProject/session"><i class="fa-solid fa-laptop-medical"></i> Quản lý thiết bị</a>
                    
                    <div class="nb-admin-only" style="border-top: 1px solid #eee; margin-top:5px;"></div>
                    <div class="nb-admin-only" style="padding:5px 20px; font-size:0.7rem; color:#999; font-weight:bold;">QUẢN TRỊ</div>
                    <a href="/WebProject/role-permission" class="nb-admin-only"><i class="fa-solid fa-user-shield"></i> Phân quyền</a>
                    <a href="/WebProject/users" class="nb-admin-only"><i class="fa-solid fa-users-gear"></i> Quản lý Users</a>
                    <a href="/WebProject/catalog-management" class="nb-admin-only"><i class="fa-solid fa-list-check"></i> QL Danh mục</a>
                    <a href="/WebProject/Thanh/Category/index.html" class="nb-admin-only"><i class="fa-solid fa-folder-tree"></i> Category (Thành)</a>
                    
                    <button id="nbLogout" style="color:red; border-top: 1px solid #eee; margin-top:5px;"><i class="fa-solid fa-right-from-bracket"></i> Đăng xuất</button>
                </div>
            </div>
        </div>
    </nav>
`;

export async function loadNavbar(options = {}) {
  // 1. Chèn HTML
  const div = document.createElement("div");
  div.innerHTML = navbarHTML;
  document.body.prepend(div);

  // 2. Chèn Custom Slot (Nếu có)
  if (options.centerHTML)
    document.getElementById("nbCenterSlot").innerHTML = options.centerHTML;
  if (options.rightHTML)
    document.getElementById("nbRightSlot").innerHTML = options.rightHTML;

  // 3. Logic User & Admin
  try {
    const profile = await callAPI("/profile");
    if (profile && profile.success) {
      const user = profile.data;
      if (user.imageUrl)
        document.getElementById("nbAvatar").src = user.imageUrl;
      if (user.username)
        document.getElementById("nbUsername").textContent = user.username;
      if (user.roleName)
        document.getElementById("nbRole").textContent = user.roleName;

      if (user.roleName === "ADMIN" || user.role === "ADMIN") {
        document
          .querySelectorAll(".nb-admin-only")
          .forEach((el) => (el.style.display = "flex"));
      }
    }
  } catch (e) {}

  // 4. Sự kiện Dropdown
  const menuBtn = document.getElementById("nbUserMenu");
  const dropdown = document.getElementById("nbDropdown");
  menuBtn.onclick = (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("show");
  };
  document.onclick = () => dropdown.classList.remove("show");

  // 5. Logout
  document.getElementById("nbLogout").onclick = async () => {
    await showDialog("question", "Đăng xuất?", async () => {
      await callAPI("/logout");
      localStorage.setItem("rememberUser", "false");
      window.location.replace("/WebProject/auth/login");
    });
  };
}
