const btn = document.getElementById('test');
btn.style.position = 'absolute';
btn.addEventListener('mouseover', ()=>{
    btn.style.left = Math.random()*90+1 + 'vw';
    btn.style.top = Math.random()*90+1 + 'vh';
});