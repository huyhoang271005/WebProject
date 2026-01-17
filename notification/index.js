import { loadNavbar } from "/navbar/navbar.js";
import { callAPI } from "/lib/api.js";
import { loadPage, getLoader } from "/lib/public.js";

// [IMPORT LOADER] Lấy hàm từ file bro vừa gửi
import { toggleLoading } from "/lib/loader.js";

let currentMode = "all";

// 1. Khởi tạo trang
await loadPage(async () => {
  // [BẬT LOADER] Ngay khi vào hàm
  toggleLoading(true);

  try {
    // A. Load Navbar
    try {
      await loadNavbar();
    } catch (e) {
      console.error("Navbar Err:", e);
    }

    // C. Tải dữ liệu Roles
    await fetchRoles();
  } catch (e) {
    console.warn("Lỗi khởi tạo trang:", e);
    // Nếu lỗi fetchRoles, ẩn tab role đi chứ ko crash
    const tabRole = document.getElementById("tabRole");
    if (tabRole) {
      tabRole.style.opacity = "0.5";
      tabRole.style.pointerEvents = "none";
    }
  } finally {
    // [TẮT LOADER] Quan trọng nhất: Dù thành công hay thất bại cũng phải tắt
    // setTimeout nhỏ để hiệu ứng mờ dần đẹp hơn
    setTimeout(() => toggleLoading(false), 300);
  }
});

// ... (Các hàm switchTab, sendNotification giữ nguyên như cũ) ...

// 3. Tải danh sách Role (Đã bỏ try-catch ở đây để catch ở trên lo)
async function fetchRoles() {
  const res = await callAPI("/roles", "GET");
  if (res.success) {
    const select = document.getElementById("roleSelect");
    select.innerHTML = res.data
      .map((r) => `<option value="${r.roleId}">${r.roleName}</option>`)
      .join("");
  } else {
    throw new Error(res.message || "API Roles Failed");
  }
}
