const iconEye = document.getElementsByClassName('icon-eye');
const password = document.getElementsByClassName('password');
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
    })
}