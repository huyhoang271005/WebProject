import { showDialog } from "../dialog/index.js";
import { callAPI } from "../lib/api.js";

// CSS inject
const emailStyles = `
<style>
    .email-row {
        display: flex; align-items: center; margin-bottom: 10px;
        padding: 8px 12px; border-radius: 8px; background: #f9fafb;
        border: 1px solid #f3f4f6; transition: 0.2s;
    }
    .email-row:focus-within { background: white; border-color: #3B82F6; box-shadow: 0 0 0 2px rgba(59,130,246,0.1); }
    .email-input { flex: 1; border: none; background: transparent; outline: none; font-size: 0.95rem; color: #374151; }
    .email-status { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; cursor: default; }
    .email-status.clickable { cursor: pointer; }
    .email-status.clickable:hover { background: #eff6ff; }
</style>
`;
document.head.insertAdjacentHTML("beforeend", emailStyles);

export function initEmailList(userId, initialEmails = []) {
  let emails = [...initialEmails];
  const list = document.getElementById("emailList");
  const addBtn = document.getElementById("addEmailBtn");

  function render() {
    list.innerHTML = "";

    if (emails.length === 0) {
      list.innerHTML = `<div style="text-align:center; color:#9ca3af; padding:10px;">Chưa có email nào.</div>`;
    }

    emails.forEach((email, index) => {
      let iconClass = "fa-paper-plane";
      let iconColor = "#3B82F6";
      let isClickable = true;

      if (email.validated === true) {
        iconClass = "fa-circle-check";
        iconColor = "#10B981";
        isClickable = false;
      } else if (email.validated === false) {
        iconClass = "fa-circle-xmark";
        iconColor = "#EF4444";
        isClickable = false;
      }

      const innerHTML = `
            <div class="email-row">
                <i class="fa-regular fa-envelope" style="color:#9ca3af"></i>
                <input type="email"
                    value="${email.email || ""}"
                    class="email-input"
                    data-index="${index}"
                    ${
                      email.validated === true || email.validated === false
                        ? "readonly"
                        : ""
                    } 
                    placeholder="Email..."/>

                <div class="email-status ${
                  isClickable ? "clickable verify-icon" : ""
                }" 
                     data-index="${index}" title="Gửi xác thực">
                    <i class="fa-solid ${iconClass}" style="color:${iconColor}"></i>
                </div>
            </div>
            `;
      list.insertAdjacentHTML("beforeend", innerHTML);
    });

    // Event Gửi Verify
    document.querySelectorAll(".verify-icon").forEach((icon) => {
      icon.onclick = async () => {
        const idx = icon.dataset.index;
        const email = emails[idx];
        await showDialog(
          "question",
          `Gửi email xác thực đến ${email.email}?`,
          async () => {
            if (!email.email) return;
            // Logic cũ: Gọi API thêm email cho User ID cụ thể
            const addEmail = await callAPI(`/emails/${userId}`, "POST", {
              email: email.email,
            });
            if (addEmail.success) {
              const result = await callAPI("/auth/send-verify-email", "POST", {
                email: email.email,
              });
              if (result.success) {
                email.emailId = result.data.emailId;
                email.validated = result.data.validated;
                render();
              }
              await showDialog(
                result.success ? "success" : "error",
                result.message
              );
            } else {
              await showDialog("error", addEmail.data?.[0]?.error || "Lỗi");
            }
          }
        );
      };
    });

    // Input Change
    document.querySelectorAll(".email-input").forEach((input) => {
      input.oninput = () => {
        const idx = input.dataset.index;
        emails[idx].email = input.value;
      };
    });
  }

  addBtn.onclick = () => {
    emails.push({ email: "", validated: null });
    render();
  };

  render();
}
