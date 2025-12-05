import { callAPI } from "../public/api.js";
import { showDialog } from "../dialog/index.js";
import { loadPage, convertToVNTime } from "../public/public.js";

// --- CẤU HÌNH API ---
const API_GET_SESSION = "/sessions?page=0&size=20";

// 1. Xoá phiên từng thiết bị (Method DELETE như bro bảo)
const API_REVOKE_ONE = "/sessions"; // -> DELETE /sessions/{id}

// 2. Đăng xuất các thiết bị KHÁC (Method GET)
const API_LOGOUT_OTHERS = "/logout-all";

const currentListEl = document.getElementById("currentDeviceList");
const otherListEl = document.getElementById("otherDeviceList");
const contentDiv = document.getElementById("info");

// Hàm lấy icon
function getDeviceIcon(type) {
  if (type === "MOBILE") return "fa-mobile-screen";
  if (type === "TABLET") return "fa-tablet-screen-button";
  return "fa-desktop";
}

// Hàm format địa chỉ
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
      '<div style="padding:20px; color:#9CA3AF; text-align:center; font-style:italic;">Không có thiết bị khác đang đăng nhập</div>';
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

  // Gán sự kiện click cho các nút X (Xoá phiên)
  document.querySelectorAll(".close-btn").forEach((btn) => {
    btn.onclick = async () => {
      await handleRevokeOne(btn.dataset.id);
    };
  });
}

function createDeviceHTML(session, isCurrent) {
  const icon = getDeviceIcon(session.deviceType);
  const location = formatLocation(session.address);
  const time = convertToVNTime(session.lastLogin);

  const actionBtn = isCurrent
    ? ""
    : `<button class="close-btn" data-id="${session.sessionId}" title="Xóa phiên đăng nhập này">
             <i class="fa-solid fa-xmark"></i>
           </button>`;

  const nameBadge = isCurrent
    ? '<span class="current-badge">Hiện tại</span>'
    : "";

  return `
    <div class="device-card">
        <div class="device-icon-wrapper">
            <i class="fa-solid ${icon}"></i>
        </div>
        <div class="device-details">
            <div class="device-name">
                ${session.deviceName} ${nameBadge}
            </div>
            <div class="device-meta">
                ${location} • ${time}
            </div>
        </div>
        ${actionBtn}
    </div>
    `;
}

// 1. Xoá phiên 1 thiết bị (DELETE)
async function handleRevokeOne(sessionId) {
  await showDialog(
    "question",
    "Bạn có chắc muốn xóa phiên đăng nhập này? Thiết bị sẽ buộc phải đăng nhập lại.",
    async () => {
      // DELETE /sessions/{id}
      const result = await callAPI(`${API_REVOKE_ONE}/${sessionId}`, "DELETE");

      if (result.success) {
        await showDialog("success", "Đã xóa phiên thành công.");
        await loadSessions();
      } else {
        await showDialog("error", result.message);
      }
    }
  );
}

// 2. Đăng xuất các thiết bị KHÁC (GET /logout-all)
document
  .getElementById("revokeOthersBtn")
  .addEventListener("click", async () => {
    await showDialog(
      "question",
      "Đăng xuất tất cả các thiết bị khác ra khỏi tài khoản?",
      async () => {
        // GET /logout-all
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
