import { showDialog } from "../dialog/index.js";
import { callAPI } from "../public/api.js";
export function initEmailList(initialEmails = []) {
    let emails = [...initialEmails];

    const list = document.getElementById("emailList");
    const addBtn = document.getElementById("addEmailBtn");
    function render() {
        list.innerHTML = "";
        emails.forEach((email, index) => {
            const innerHTML = `
            <div class="email-row">
                <input type="email"
                    value="${email.email}"
                    class="email-input"
                    data-index="${index}"
                    ${email.validated ? "readonly" : ""} />

                <i class="status-icon fa-solid 
                    ${email.validated === true ? 'fa-circle-check' : 
                    email.validated === false ? 'fa-circle-xmark' : 
                    'fa-paper-plane'}
                    ${email.validated === null ? 'verify-icon' : ''}"
                    data-index = "${index}"
                    style="color:${
                        email.validated === true ? '#10B981' : 
                        email.validated === false ? '#EF4444' : 
                        '#3B82F6'
                    };">
                </i>


                <button class="removeEmailBtn" data-index="${index}">
                    X
                </button>
            </div>

            `;
            list.insertAdjacentHTML("beforeend", innerHTML);
        });

        // Xoá email
        document.querySelectorAll(".removeEmailBtn").forEach(btn => {
            btn.onclick = async() => {
                if(emails.length < 2) return;
                const idx = btn.dataset.index;
                const email = emails[idx];
                if(email.validated){
                    showDialog('question', 'Bạn có chắc muốn xoá email đã được xác thực rồi không?', async()=>{
                        const result = await callAPI(`/email?emailId=${email.emailId}`, 'DELETE')
                        if(result.success){
                            emails.splice(idx, 1);
                            render();
                        }
                        else {
                            showDialog('error', result.message);
                        }
                    });
                }
                else {
                    emails.splice(idx, 1);
                    render();
                }
            };
        });

        document.querySelectorAll(".verify-icon").forEach(icon => {
            icon.onclick = async() => {
                const idx = icon.dataset.index;
                const email = emails[idx];
                showDialog('question', `Gửi email xác thực đến ${email.email}`, async () => {
                    const addEmail = await callAPI('/email', 'POST', {email: email.email});
                    if (addEmail.success){
                        const result = await callAPI('/auth/send-verify-email', 'POST', {email: email.email});
                        if(result.success){
                            email.validated = false;
                            render();
                        }
                        else {
                            showDialog('error', result.message);
                        }
                    }
                    else {
                        showDialog('error', addEmail.message);
                    }
                });
            };
        });

        // Cập nhật giá trị email
        document.querySelectorAll(".email-input").forEach(input => {
            input.oninput = () => {
                const idx = input.dataset.index;
                emails[idx].email = input.value;
            };
        });
    }

    addBtn.onclick = () => {
        emails.push({email: 'abc@gmail.com', validated: null});
        render();
    };

    render();
}
