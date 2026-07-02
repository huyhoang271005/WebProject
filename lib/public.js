/*Ảnh hiển thị khi người dùng không có ảnh*/
import {toggleLoading} from "./loader.js";

export const noImage = "https://cdn-icons-png.flaticon.com/512/847/847969.png";
/*Loader icon for button, yêu cầu truyền id của button vào hàm*/
/*Buộc có thẻ này đặt ở header <script src="https://kit.fontawesome.com/e9c281dd3f.js" crossorigin="anonymous"></script> */
export async function getLoader(idLayout, callback) {
    if(callback && typeof callback === 'function'){
        const loader = document.getElementById(idLayout);
        await (async () => {
            if (loader.querySelector('.icon-loader')) return;

            const response = await fetch("/lib/icon-loader.html");
            const html = await response.text();
            loader.insertAdjacentHTML("beforeend", html);
        })();
        const iconLoader = loader.querySelector('.icon-loader');
        iconLoader.style.display = 'inline-block';
        loader.classList.add('loading');
        await callback();
        loader.classList.remove('loading');
        iconLoader.style.display = 'none';
    }
}

/*Load page lần đầu yêu cầu thẻ load page có id là loadPage và thẻ bao hàm thông tin có id là info*/
export async function loadPage(callback) {
    window.addEventListener('DOMContentLoaded', async()=>{
        const loadPage = document.getElementById('loadPage');
        const response = await fetch("/lib/load-page.html");
        const html = await response.text();
        await (async () => {
            loadPage.insertAdjacentHTML('beforeend', html)
        })();
        toggleLoading(true);
        await callback();
        toggleLoading(false);
        loadPage.style.display = 'none';
        document.getElementById('info').style.display = 'block';
    });
}

/**
 * Load toggle password, yêu cầu thẻ cha phải có class 'password-layout' và bên trong thẻ cha này có thẻ input
 */
export async function getEye() {
    const layoutPassword = document.getElementsByClassName('password-layout');
    const response = await fetch("/lib/icon-eye.html");
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

export function timeAgo(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    const timeStr = date.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' });

    if (date >= startOfToday) {
        if (diffMins < 1) return "Vừa xong";
        if (diffMins < 60) return `${diffMins} phút trước`;
        return `${diffHours} giờ trước`;
    } else if (date >= startOfYesterday) {
        return `${timeStr} hôm qua`;
    } else {
        const dateStr = date.toLocaleDateString("vi-VN", { day: '2-digit', month: '2-digit' });
        return `${timeStr} ${dateStr}`;
    }
}
