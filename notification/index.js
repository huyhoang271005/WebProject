import { loadNavbar } from "/navbar/navbar.js";
import { callAPI } from "/lib/api.js";
import { showDialog } from "/dialog/index.js";
import { toggleLoading } from "/lib/loader.js";
import { loadPage, getLoader } from "/lib/public.js";

let currentMode = "all";

// 1. Khởi tạo trang
await loadPage(async () => {
  await loadNavbar();
  await fetchRoles(); // Tải danh sách role để dùng cho tab Role
});

// 2. Chuyển Tab
window.switchTab = (mode) => {
  currentMode = mode;

  // Update UI Tab
  document
    .querySelectorAll(".tab-item")
    .forEach((el) => el.classList.remove("active"));

  if (mode === "all") document.getElementById("tabAll").classList.add("active");
  else document.getElementById("tabRole").classList.add("active");

  // Ẩn hiện Select Role
  const roleGroup = document.getElementById("roleSelectGroup");
  if (mode === "role") {
    roleGroup.style.display = "block";
  } else {
    roleGroup.style.display = "none";
  }
};

// 3. Tải danh sách Role
async function fetchRoles() {
  const res = await callAPI("/roles", "GET");
  if (res.success) {
    const select = document.getElementById("roleSelect");
    select.innerHTML = res.data
      .map((r) => `<option value="${r.roleId}">${r.roleName}</option>`)
      .join("");
  }
}

// 4. Gửi thông báo
window.sendNotification = async () => {
  const title = document.getElementById("title").value.trim();
  const message = document.getElementById("message").value.trim();
  const linkUrl = document.getElementById("linkUrl").value.trim();
  const roleId = document.getElementById("roleSelect").value;

  // Validate
  if (!title || !message) {
    await showDialog("error", "Vui lòng nhập tiêu đề và nội dung!");
    return;
  }

  const payload = {
    title: title,
    message: message,
    type: "SYSTEM",
    linkUrl: linkUrl,
  };

  let endpoint = "";
  let confirmMsg = "";

  // Xác định API cần gọi
  if (currentMode === "all") {
    // Gửi toàn bộ: POST /notifications
    endpoint = "/notifications";
    confirmMsg = "Gửi thông báo cho TOÀN BỘ hệ thống?";
  } else {
    // Gửi theo Role: POST /notifications/roles/{roleId}
    endpoint = `/notifications/roles/${roleId}`;
    const roleSelect = document.getElementById("roleSelect");
    const roleName = roleSelect.options[roleSelect.selectedIndex].text;
    confirmMsg = `Gửi thông báo cho nhóm ${roleName}?`;
  }

  await showDialog("question", confirmMsg, async () => {
    await getLoader("btnSend", async () => {
      const res = await callAPI(endpoint, "POST", payload);

      if (res.success) {
        await showDialog("success", "Đã gửi thông báo thành công!");
        // Reset form
        document.getElementById("title").value = "";
        document.getElementById("message").value = "";
        document.getElementById("linkUrl").value = "";
      } else {
        await showDialog("error", res.message || "Gửi thất bại");
      }
    });
  });
};
