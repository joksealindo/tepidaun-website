const menuToggle=document.querySelector(".menu-toggle");
const mainNav=document.querySelector(".main-nav");
if(menuToggle&&mainNav){
  menuToggle.addEventListener("click",()=>{
    const open=mainNav.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded",String(open));
  });
  mainNav.querySelectorAll("a").forEach(link=>link.addEventListener("click",()=>{
    mainNav.classList.remove("open");
    menuToggle.setAttribute("aria-expanded","false");
  }));
}
const year=document.getElementById("year");
if(year) year.textContent=new Date().getFullYear();
const track=document.getElementById("activity-track");
const prev=document.querySelector(".carousel-arrow.prev");
const next=document.querySelector(".carousel-arrow.next");
if(track&&prev&&next){
  const distance=()=>Math.max(240,Math.round(track.clientWidth*.72));
  prev.addEventListener("click",()=>track.scrollBy({left:-distance(),behavior:"smooth"}));
  next.addEventListener("click",()=>track.scrollBy({left:distance(),behavior:"smooth"}));
}

const adventureHeader=document.querySelector(".adventure-header");
if(adventureHeader){
  const updateAdventureHeader=()=>adventureHeader.classList.toggle("is-scrolled",window.scrollY>8);
  updateAdventureHeader();
  window.addEventListener("scroll",updateAdventureHeader,{passive:true});
}
