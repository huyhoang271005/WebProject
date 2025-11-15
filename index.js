const rememberUser = localStorage.getItem('rememberUser');

if(rememberUser === 'true'){
    window.location.replace("./auth/login");
}
else {
    window.location.replace("./auth/register");
}