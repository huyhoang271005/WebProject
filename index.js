const rememberUser = localStorage.getItem('rememberUser');

if(rememberUser === 'true'){
    window.location.replace("/WebProject/auth/login");
}
else {
    window.location.replace("/WebProject/auth/register");
}