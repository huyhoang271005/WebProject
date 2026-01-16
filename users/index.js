import { callAPI } from "../lib/api.js";
import { showDialog } from "../dialog/index.js";
import { convertToVNTime, getLoader, noImage } from "../lib/public.js";
import { loadNavbar } from "../navbar/navbar.js";
import { toggleLoading } from "../lib/loader.js";

const loadMore = document.getElementById("loadMore");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const reloadBtn = document.getElementById("reloadBtn");

let page = 0;
let size = 7;
let searchText = ""; // Biến lưu từ khóa tìm kiếm

// Hàm load User
async function loadUsers() {
  // [TODO FOR BACKEND]: Sửa param 'search' thành tên đúng trong API sau này
  const query = `/users?page=${page}&size=${size}${
    searchText ? `&email=${encodeURIComponent(searchText)}` : null
  }`;

  const result = await callAPI(query);
  if (!result.success) {
    await showDialog("error", result.message);
    return [];
  } else {
    page += 1;
    if (result.data.hasMore) {
      loadMore.style.display = "inline-flex";
    } else {
      loadMore.style.display = "none";
    }
    return result.data.listData;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  toggleLoading(true);
  try {
    await loadNavbar();
    const data = await loadUsers();
    renderUsers(data);
    setupActions(); // Cài đặt sự kiện tìm kiếm & reload
  } catch (e) {
    console.error("Lỗi tải trang Users:", e);
  } finally {
    setTimeout(() => toggleLoading(false), 300);
  }
});

if (loadMore) {
  loadMore.addEventListener("click", async () => {
    await getLoader("loadMore", async () => {
      const moreUsers = await loadUsers();
      if (moreUsers && moreUsers.length > 0) {
        renderUsers(moreUsers, true);
      }
    });
  });
}

// Cài đặt sự kiện cho Search & Reload
function setupActions() {
  // 1. Xử lý Tìm kiếm
  const doSearch = async () => {
    const val = searchInput.value.trim();
    // Nếu không có gì thay đổi thì thôi (tránh spam)
    if (val === searchText && page > 0) return;

    searchText = val;
    page = 0; // Reset về trang đầu

    toggleLoading(true); // Hiệu ứng load
    const data = await loadUsers();
    renderUsers(data, false); // Xóa cũ, render mới
    setTimeout(() => toggleLoading(false), 300);
  };

  searchBtn.onclick = doSearch;
  searchInput.onkeypress = (e) => {
    if (e.key === "Enter") doSearch();
  };

  // 2. Xử lý Reload (Tắt tìm kiếm)
  if (reloadBtn) {
    reloadBtn.onclick = async () => {
      searchInput.value = ""; // Xóa chữ trong ô
      searchText = ""; // Xóa từ khóa trong biến
      page = 0; // Reset trang

      // Xoay icon reload 1 vòng chơi cho vui mắt
      const icon = reloadBtn.querySelector("i");
      if (icon) icon.style.transition = "transform 0.5s";
      if (icon) icon.style.transform = "rotate(360deg)";
      setTimeout(() => {
        if (icon) icon.style.transform = "none";
      }, 500);

      toggleLoading(true);
      const data = await loadUsers();
      renderUsers(data, false);
      setTimeout(() => toggleLoading(false), 300);
    };
  }
}

/**
 * Render danh sách List
 */
function renderUsers(users, append = false) {
  const listContainer = document.getElementById("userList");

  if (!append) {
    listContainer.innerHTML = "";
    if (!users || users.length === 0) {
      listContainer.innerHTML = `
                <div style="text-align:center; padding: 50px 20px; color:#9ca3af;">
                    <i class="fa-solid fa-user-slash" style="font-size: 3rem; margin-bottom: 10px; opacity: 0.5;"></i><br>
                    Không tìm thấy thành viên nào.
                </div>`;
      return;
    }
  }

  users.forEach((user) => {
    const name = user.fullName || user.username || "Chưa đặt tên";
    const subText = user.fullName ? user.username : "Thành viên";
    const date = convertToVNTime(user.createdAt).split(" ")[1];

    const item = document.createElement("div");
    item.className = "user-item";
    item.innerHTML = `
            <div class="user-left">
                <img src="${
                  user.imageUrl ? user.imageUrl : noImage
                }" class="avatar" />
                <div class="user-info">
                    <div class="user-name">${name}</div>
                    <div class="user-role">${subText}</div>
                </div>
            </div>
            <div class="user-right">
                <div class="join-date">${date}</div>
                <i class="fa-solid fa-chevron-right arrow-icon"></i>
            </div>
        `;

    item.onclick = () => {
      window.location.href = `/user-detail/?uid=${user.userId}`;
    };

    listContainer.appendChild(item);
  });
}
