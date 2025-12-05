import { callAPI } from "../public/api.js";
import { showDialog } from "../dialog/index.js";
import { loadPage, convertToVNTime } from "../public/public.js";

// --- CẤU HÌNH API ---
const API_GET_SESSION = "/sessions?page=0&size=20";

// 1. Đăng xuất 1 thiết bị (GET)
const API_LOGOUT_ONE = "/logout";

// 2. Xoá phiên (DELETE) - Đã sửa thành số ít theo ý bro
const API_REVOKE_ONE = "/session";

// 3. Đăng xuất các thiết bị KHÁC (GET)
const API_LOGOUT_OTHERS = "/logout-all";

const currentListEl = document.getElementById("currentDeviceList");
const otherListEl = document.getElementById("otherDeviceList");
const contentDiv = document.getElementById("info");

// Hàm lấy icon xịn xò hơn (Phân biệt Windows, Android, iOS)
function getDeviceIcon(userAgent) {
  const ua = userAgent.toLowerCase();
  if (ua.includes("windows")) return "fa-windows";
  if (ua.includes("android")) return "fa-android";
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("mac"))
    return "fa-apple";
  if (ua.includes("linux")) return "fa-linux";
  return "fa-desktop"; // Mặc định
}

function formatLocation(addr) {
  if (!addr) return "Không xác định";
  return `${addr.city || addr.region || ""}, ${addr.country || ""}`.replace(
    /^, /,
    ""
  );
}

async function loadSessions() {
  const result = await callAPI(API_GET_SESSION);
  if (!result.success) {
    await showDialog("error", result.message);
    return;
  }
  const sessions = result.data.listData || [];
  renderSessions(sessions);
}

function renderSessions(sessions) {
  currentListEl.innerHTML = "";
  otherListEl.innerHTML = "";

  if (contentDiv) contentDiv.style.display = "block";

  const currentSession = sessions.find((s) => s.thisSession === true);
  const otherSessions = sessions.filter((s) => s.thisSession !== true);

  // 1. Render Thiết bị hiện tại
  if (currentSession) {
    currentListEl.innerHTML = createDeviceHTML(currentSession, true);
  }

  // 2. Render Các thiết bị khác
  if (otherSessions.length === 0) {
    otherListEl.innerHTML =
      '<div style="padding:20px; color:#9CA3AF; text-align:center; font-style:italic;">Không có thiết bị khác</div>';
    document.getElementById("revokeOthersBtn").style.display = "none";
  } else {
    document.getElementById("revokeOthersBtn").style.display = "block";
    otherSessions.forEach((session) => {
      otherListEl.insertAdjacentHTML(
        "beforeend",
        createDeviceHTML(session, false)
      );
    });
  }

  // Gán sự kiện click
  initButtonEvents();
}

function createDeviceHTML(session, isCurrent) {
  // Nếu api trả về userAgent thì dùng, không thì dùng deviceName để đoán icon
  const iconStr = session.userAgent || session.deviceName || "";
  const icon = getDeviceIcon(iconStr);
  const location = formatLocation(session.address);
  const time = convertToVNTime(session.lastLogin);

  let statusBadge = "";
  let actionBtns = "";
  let rowClass = "";

  if (isCurrent) {
    // --- THIẾT BỊ HIỆN TẠI ---
    statusBadge = '<span class="status-badge current">Đang truy cập</span>';
    // Không hiện nút gì cả
  } else {
    // --- THIẾT BỊ KHÁC ---
    if (session.revoked === true) {
      // A. ĐÃ ĐĂNG XUẤT (Logged Out)
      statusBadge = '<span class="status-badge inactive">Đã đăng xuất</span>';
      rowClass = "row-inactive"; // Làm mờ dòng này đi

      // Chỉ hiện nút Xóa (X) để dọn dẹp, Ẩn nút Logout
      actionBtns = `
                <div class="action-group">
                     <button class="icon-btn delete-btn" data-id="${session.sessionId}" title="Xóa lịch sử phiên này">
                        <i class="fa-solid fa-xmark"></i>
                     </button>
                </div>`;
    } else {
      // B. ĐANG HOẠT ĐỘNG (Active)
      statusBadge = '<span class="status-badge active">Đang hoạt động</span>';

      // Hiện cả 2 nút: Logout và Delete
      actionBtns = `
                <div class="action-group">
                     <button class="icon-btn logout-btn" data-id="${session.sessionId}" title="Đăng xuất thiết bị này">
                        <i class="fa-solid fa-right-from-bracket"></i>
                     </button>
                     <button class="icon-btn delete-btn" data-id="${session.sessionId}" title="Xóa phiên (Bắt buộc đăng nhập lại)">
                        <i class="fa-solid fa-xmark"></i>
                     </button>
                </div>`;
    }
  }

  return `
    <div class="device-card ${rowClass}">
        <div class="device-icon-wrapper">
            <i class="fa-brands ${icon} ${
    icon === "fa-desktop" ? "fa-solid" : ""
  }"></i>
        </div>
        <div class="device-details">
            <div class="device-name">
                ${session.deviceName}
            </div>
            <div class="device-meta">
                ${location} • ${time}
            </div>
            <div style="margin-top: 5px;">
                ${statusBadge}
            </div>
        </div>
        ${actionBtns}
    </div>
    `;
}

function initButtonEvents() {
  // 1. Nút Logout (Cửa)
  document.querySelectorAll(".logout-btn").forEach((btn) => {
    btn.onclick = async () => {
      await handleLogoutOne(btn.dataset.id);
    };
  });

  // 2. Nút Xóa (X)
  document.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.onclick = async () => {
      await handleRevokeOne(btn.dataset.id);
    };
  });
}

// --- CÁC HÀM XỬ LÝ ---

// A. Đăng xuất (GET /logout) -> Reload list để cập nhật trạng thái thành "Đã đăng xuất"
async function handleLogoutOne(sessionId) {
  await showDialog("question", "Đăng xuất thiết bị này?", async () => {
    const result = await callAPI(`${API_LOGOUT_ONE}/${sessionId}`);
    if (result.success) {
      await showDialog("success", "Đã đăng xuất thành công.");
      await loadSessions(); // Tải lại để thấy trạng thái chuyển sang màu xám
    } else {
      await showDialog("error", result.message);
    }
  });
}

// B. Xóa phiên (DELETE /session) -> Xóa hẳn khỏi danh sách
async function handleRevokeOne(sessionId) {
  await showDialog(
    "question",
    "Xóa phiên đăng nhập này khỏi danh sách?",
    async () => {
      const result = await callAPI(`${API_REVOKE_ONE}/${sessionId}`, "DELETE");
      if (result.success) {
        await showDialog("success", "Đã xóa phiên thành công.");
        await loadSessions(); // Mục đó sẽ biến mất
      } else {
        await showDialog("error", result.message);
      }
    }
  );
}

// C. Đăng xuất người khác
document
  .getElementById("revokeOthersBtn")
  .addEventListener("click", async () => {
    await showDialog(
      "question",
      "Đăng xuất tất cả các thiết bị khác?",
      async () => {
        const result = await callAPI(API_LOGOUT_OTHERS);
        if (result.success) {
          await showDialog("success", "Đã đăng xuất các thiết bị khác.");
          await loadSessions();
        } else {
          await showDialog("error", result.message);
        }
      }
    );
  });

await loadPage(async () => {
  await loadSessions();
});
