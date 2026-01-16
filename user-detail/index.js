import {
  loadPage,
  convertToVNTime,
  getLoader,
  noImage,
} from "../lib/public.js";
import { showDialog } from "../dialog/index.js";
import { callAPI } from "../lib/api.js";
import { initEmailList } from "./email-list.js";
import { loadNavbar } from "../navbar/navbar.js";
import { toggleLoading } from "../lib/loader.js";

// Khởi chạy trang
document.addEventListener("DOMContentLoaded", async () => {
  toggleLoading(true);
  try {
    await loadNavbar();
    const param = new URLSearchParams(window.location.search);
    const uid = param.get("uid");
    if (!uid) {
      await showDialog("error", "Không tìm thấy User ID");
      return;
    }

    const user = await callAPI(`/users/${uid}`);
    if (!user.success) {
      await showDialog("error", user.message);
      return;
    }
    await render(user.data);
  } catch (e) {
    console.error(e);
  } finally {
    setTimeout(() => toggleLoading(false), 300);
  }
});

async function render(user) {
  // Fill Info
  document.getElementById("avatarPreview").src = user.imageUrl
    ? user.imageUrl
    : noImage;
  document.getElementById("username").textContent =
    user.username || "Chưa đặt tên";
  document.getElementById("fullName").textContent = user.fullName || "---";
  document.getElementById("birthday").textContent = user.birthday || "---";
  document.getElementById("gender").textContent =
    user.gender === "MALE" ? "Nam" : user.gender == "FEMALE" ? "Nữ" : "Khác";
  document.getElementById("createdAt").textContent = convertToVNTime(
    user.createdAt
  );

  // Xử lý Admin Permissions
  if (user.extendUserResponse) {
    const resultRoles = await callAPI("/roles");
    const resultStatus = await callAPI("/user-status");
    const roles = resultRoles.data;
    const status = resultStatus.data;

    document.getElementById("adminFields").style.display = "block";
    const rolesSelect = document.getElementById("roleSelect");
    const statusSelect = document.getElementById("statusSelect");
    const emailsSection = document.getElementById("emailsSection");

    // Load Email List Template
    const html = await fetch("/user-detail/email-list.html");
    const text = await html.text();
    emailsSection.innerHTML = text;

    initEmailList(user.userId, user.extendUserResponse.emails);

    // Fill Select Options
    roles.forEach((role) => {
      const html = `<option value="${role.roleId}">${role.roleName}</option>`;
      rolesSelect.insertAdjacentHTML("beforeend", html);
    });
    rolesSelect.value = user.extendUserResponse.roleId;

    status.forEach((st) => {
      const html = `<option value="${st}">${st}</option>`;
      statusSelect.insertAdjacentHTML("beforeend", html);
    });
    statusSelect.value = user.extendUserResponse.userStatus;

    setupAdminButtons(user, rolesSelect, statusSelect);
    setupActionButtons(user);
  } else {
    document.getElementById("adminFields").style.display = "none";
  }
}

function setupAdminButtons(user, rolesSelect, statusSelect) {
  const btnUpdate = document.getElementById("btnUpdate");
  const btnLogout = document.getElementById("btnLogout");

  btnUpdate.addEventListener("click", async () => {
    const data = {
      userId: user.userId,
      userStatus: statusSelect.value,
      roleId: rolesSelect.value,
    };
    await getLoader("btnUpdate", async () => {
      const result = await callAPI("/users", "PATCH", data);
      await showDialog(result.success ? "success" : "error", result.message);
    });
  });

  btnLogout.addEventListener("click", async () => {
    await showDialog(
      "question",
      "Bạn có chắc muốn đăng xuất user này khỏi mọi thiết bị?",
      async () => {
        await getLoader("btnLogout", async () => {
          const result = await callAPI(`/logout-all/${user.userId}`);
          await showDialog(
            result.success ? "success" : "error",
            result.message
          );
        });
      }
    );
  });
}

function setupActionButtons(user) {
  const btnSendMessage = document.getElementById("btnSendMessage");
  const btnSendNotification = document.getElementById("btnSendNotification");

  // 1. Nhắn tin
  btnSendMessage.addEventListener("click", async () => {
    const data = { userIds: [user.userId] };
    const result = await callAPI("/room-chat", "POST", data);
    if (result.success) {
      window.location.href = "/message/?roomId=" + result.data.roomChatId;
    } else {
      await showDialog("error", result.message);
    }
  });

  // 2. Mở Modal Gửi thông báo
  btnSendNotification.addEventListener("click", () => {
    document.getElementById("notiModal").style.display = "flex";
  });

  // 3. Xử lý Gửi thông báo [ĐÃ FIX LỖI GỬI ALL]
  document.getElementById("confirmSendNoti").onclick = async () => {
    const title = document.getElementById("notiTitle").value.trim();
    const content = document.getElementById("notiContent").value.trim();

    if (!title || !content) {
      alert("Vui lòng nhập đủ tiêu đề và nội dung!");
      return;
    }

    const btn = document.getElementById("confirmSendNoti");
    const originalText = btn.innerText;
    btn.innerText = "Đang gửi...";
    btn.disabled = true;

    // [QUAN TRỌNG] Sửa lại cấu trúc Body theo Swagger
    const body = {
      title: title,
      message: content, // Swagger dùng key 'message', không phải 'content'
      isRead: false, // Mặc định là chưa đọc
      linkUrl: "", // Link (nếu có), để trống nếu không cần
    };

    // Gọi đúng API gửi riêng cho 1 người: /notifications/{userId}
    // user.userId lấy từ thông tin user đang xem
    const res = await callAPI(`/notifications/${user.userId}`, "POST", body);

    btn.innerText = originalText;
    btn.disabled = false;

    if (res.success) {
      document.getElementById("notiModal").style.display = "none";
      await showDialog(
        "success",
        `Đã gửi thông báo cho ${user.username} thành công!`
      );
      // Reset input
      document.getElementById("notiTitle").value = "";
      document.getElementById("notiContent").value = "";
    } else {
      await showDialog("error", res.message || "Gửi thất bại");
    }
  };
}
