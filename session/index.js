import { callAPI } from "../public/api.js";
import { showDialog } from "../dialog/index.js";
import { loadPage, convertToVNTime } from "../public/public.js";

// --- CẤU HÌNH API (Đã bỏ /auth theo lời backend) ---
const API_GET_SESSION = "/sessions?page=0&size=20";
const API_REVOKE_ONE = "/sessions"; // DELETE /sessions/{id}

// ⚠️ Bro hỏi lại backend xem 2 link này có đúng là /sessions/... không nhé
// Nếu backend bảo chỉ bỏ /auth thì khả năng cao là như này:
const API_REVOKE_OTHERS = "/sessions/revoke-others";
const API_REVOKE_ALL = "/sessions/revoke-all";

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
  // Ví dụ: Hanoi, VN
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
      '<div style="padding:15px; color:#888; text-align:center;">Không có thiết bị khác</div>';
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
  document.querySelectorAll(".close-btn").forEach((btn) => {
    btn.onclick = async () => {
      await handleRevokeOne(btn.dataset.id);
    };
  });
}

// Hàm tạo HTML
function createDeviceHTML(session, isCurrent) {
  const icon = getDeviceIcon(session.deviceType);
  const location = formatLocation(session.address);
  const time = convertToVNTime(session.lastLogin);

  const actionBtn = isCurrent
    ? ""
    : `<button class="close-btn" data-id="${session.sessionId}" title="Đăng xuất thiết bị này"><i class="fa-solid fa-xmark"></i></button>`;

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

// 1. Xoá 1 thiết bị
async function handleRevokeOne(sessionId) {
  await showDialog("question", "Đăng xuất thiết bị này?", async () => {
    const result = await callAPI(`${API_REVOKE_ONE}/${sessionId}`, "DELETE");
    if (result.success) await loadSessions();
    else await showDialog("error", result.message);
  });
}

// 2. Xoá TẤT CẢ
document.getElementById("revokeAllBtn").addEventListener("click", async () => {
  await showDialog(
    "question",
    "Bạn sẽ bị đăng xuất khỏi TẤT CẢ thiết bị. Tiếp tục?",
    async () => {
      const result = await callAPI(API_REVOKE_ALL, "DELETE");
      if (result.success) {
        window.location.replace("../auth/login");
      } else {
        await showDialog("error", result.message);
      }
    }
  );
});

// 3. Xoá KHÁC
document
  .getElementById("revokeOthersBtn")
  .addEventListener("click", async () => {
    await showDialog(
      "question",
      "Đăng xuất tất cả các thiết bị khác?",
      async () => {
        const result = await callAPI(API_REVOKE_OTHERS, "DELETE");
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
