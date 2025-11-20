/**
 * Loader icon for button, yêu cầu truyền id của button vào hàm
 */
export async function getLoader(idLayout, callback) {
    const loader = document.getElementById(idLayout);
    if (!loader) return;

    if (loader.querySelector('.icon-loader')) return;

    const response = await fetch("/WebProject/public/icon-loader.html");
    const html = await response.text();
    loader.insertAdjacentHTML("beforeend", html);
    const iconLoader = loader.querySelector('.icon-loader');
    iconLoader.style.display = 'none';
    if(callback && typeof callback === 'function'){
        iconLoader.style.display = 'inline-block';
        loader.classList.add('loading');
        await callback();
        loader.classList.remove('loading');
        iconLoader.style.display = 'none';
    }
}

/**
 * Load toggle password, yêu cầu thẻ cha phải có class 'password-layout' và bên trong thẻ cha này có thẻ input
 */
export async function getEye() {
    const layoutPassword = document.getElementsByClassName('password-layout');
    const response = await fetch("/WebProject/public/icon-eye.html");
    const html = await response.text();
    for (let l of layoutPassword){
        if(l.querySelector('.icon-eye')) continue;
        l.insertAdjacentHTML('beforeend', html);
    }
    const iconEye = document.getElementsByClassName('icon-eye');
    for(let i of iconEye){
        i.addEventListener('click', ()=>{
            const input = i.closest('.password-layout').querySelector('.password');
            if(input.type === 'password'){
                input.type = 'text';
                i.classList.remove('fa-eye');
                i.classList.add('fa-eye-slash');
            }
            else {
                input.type = 'password';
                i.classList.remove('fa-eye-slash');
                i.classList.add('fa-eye');
            }
            //Focus input
            input.focus();
            const val = input.value;
            input.value = '';
            input.value = val;
        })
    }
}
export function convertToVNTime(utcString) {
    const date = new Date(utcString);
    return date.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
}
