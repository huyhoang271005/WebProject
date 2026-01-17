import { callAPI } from "../lib/api.js";
import { showDialog } from "../dialog/index.js";
import { convertToVNTime, getLoader, noImage } from "../lib/public.js";
import { loadNavbar } from "../navbar/navbar.js";
import { toggleLoading } from "../lib/loader.js";

/* ================= DOM ================= */
const loadMore = document.getElementById("loadMore");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const reloadBtn = document.getElementById("reloadBtn");

/* ================= STATE ================= */
let page = 0;
let size = 7;
let searchText = "";
let isLoading = false; // 🔴 CHỐNG LOAD TRÙNG

/* ================= API ================= */
async function loadUsers() {
  if (isLoading) return [];
  isLoading = true;

  try {
    const query = `/users?page=${page}&size=${size}${
        searchText ? `&email=${encodeURIComponent(searchText)}` : ""
    }`;

    const result = await callAPI(query);

    if (!result.success) {
      await showDialog("error", result.message);
      return [];
    }

    const list = result.data.listData || [];

    // ✅ chỉ tăng page khi có data
    if (list.length > 0) page += 1;

    // Hiển thị / ẩn Load more
    loadMore.style.display = result.data.hasMore ? "inline-flex" : "none";

    return list;
  } finally {
    isLoading = false;
  }
}

/* ================= INIT ================= */
document.addEventListener("DOMContentLoaded", async () => {
  toggleLoading(true);
  try {
    await loadNavbar();
    page = 0;
    const data = await loadUsers();
    renderUsers(data, false);
    setupActions();
  } catch (e) {
    console.error("Lỗi tải Users:", e);
  } finally {
    setTimeout(() => toggleLoading(false), 300);
  }
});

/* ================= LOAD MORE ================= */
if (loadMore) {
  loadMore.onclick = async () => {
    if (isLoading) return;

    await getLoader("loadMore", async () => {
      const moreUsers = await loadUsers();
      if (moreUsers.length > 0) {
        renderUsers(moreUsers, true);
      }
    });
  };
}

/* ================= ACTIONS ================= */
function setupActions() {
  const doSearch = async () => {
    const val = searchInput.value.trim();
    if (val === searchText && page > 0) return;

    searchText = val;
    page = 0;

    toggleLoading(true);
    const data = await loadUsers();
    renderUsers(data, false);
    setTimeout(() => toggleLoading(false), 300);
  };

  searchBtn.onclick = doSearch;
  searchInput.onkeydown = (e) => {
    if (e.key === "Enter") doSearch();
  };

  if (reloadBtn) {
    reloadBtn.onclick = async () => {
      searchInput.value = "";
      searchText = "";
      page = 0;

      const icon = reloadBtn.querySelector("i");
      if (icon) {
        icon.style.transition = "transform 0.5s";
        icon.style.transform = "rotate(360deg)";
        setTimeout(() => (icon.style.transform = "none"), 500);
      }

      toggleLoading(true);
      const data = await loadUsers();
      renderUsers(data, false);
      setTimeout(() => toggleLoading(false), 300);
    };
  }
}

/* ================= RENDER ================= */
function renderUsers(users, append = false) {
  const listContainer = document.getElementById("userList");

  if (!append) {
    listContainer.innerHTML = "";

    if (!users || users.length === 0) {
      listContainer.innerHTML = `
        <div style="text-align:center; padding:50px 20px; color:#9ca3af;">
          <i class="fa-solid fa-user-slash" style="font-size:3rem; opacity:.5;"></i><br>
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
        <img src="${user.imageUrl || noImage}" class="avatar" />
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
