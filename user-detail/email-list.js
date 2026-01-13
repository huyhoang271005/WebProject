import { showDialog } from "../dialog/index.js";
import { callAPI } from "../lib/api.js";
export function initEmailList(userId, initialEmails = []) {
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
                    ${email.validated === true || email.validated === false? "readonly" : ""} 
                    placeholder = "Email"/>

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
            </div>
            `;
            list.insertAdjacentHTML("beforeend", innerHTML);
        });


        document.querySelectorAll(".verify-icon").forEach(icon => {
            icon.onclick = async() => {
                const idx = icon.dataset.index;
                const email = emails[idx];
                await showDialog('question', `Gửi email xác thực đến ${email.email}`, async () => {
                    if(email.email === '' || !email?.email) return;
                    const addEmail = await callAPI(`/emails/${userId}`, 'POST', {email: email.email});
                    if (addEmail.success){
                        const result = await callAPI('/auth/send-verify-email', 'POST', {email: email.email});
                        if(result.success){
                            email.emailId = result.data.emailId;
                            email.validated = result.data.validated;
                            render();
                        }
                        await showDialog(result.success ? 'success' : 'error', result.message);
                    }
                    else {
                        await showDialog('error', addEmail.data[0].error);
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
        emails.push({email: '', validated: null});
        render();
    };

    render();
}
