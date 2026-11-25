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

/* Desktop-only draggable carousel with momentum. Touch devices keep native scrolling. */
if(track){
  let dragging=false;
  let moved=false;
  let startX=0;
  let startScroll=0;
  let lastX=0;
  let lastTime=0;
  let velocity=0;
  let animationFrame=0;
  let suppressClickTimer=0;

  const restoreSnap=()=>{track.style.scrollSnapType="";};
  const stopMomentum=()=>{
    if(animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame=0;
    track.classList.remove("is-inertia");
    restoreSnap();
  };

  const runMomentum=()=>{
    let previousTime=performance.now();
    const friction=0.0042;
    const tick=now=>{
      const elapsed=Math.min(32,now-previousTime);
      previousTime=now;
      track.scrollLeft+=velocity*elapsed;
      velocity*=Math.exp(-friction*elapsed);
      if(Math.abs(velocity)>.025){
        animationFrame=requestAnimationFrame(tick);
      }else{
        animationFrame=0;
        track.classList.remove("is-inertia");
        restoreSnap();
      }
    };
    track.classList.add("is-inertia");
    animationFrame=requestAnimationFrame(tick);
  };

  track.addEventListener("pointerdown",event=>{
    if(event.pointerType!=="mouse"||event.button!==0) return;
    stopMomentum();
    dragging=true;
    moved=false;
    startX=event.clientX;
    startScroll=track.scrollLeft;
    lastX=event.clientX;
    lastTime=performance.now();
    velocity=0;
    track.style.scrollSnapType="none";
    track.classList.add("is-dragging");
    track.setPointerCapture(event.pointerId);
  });

  track.addEventListener("pointermove",event=>{
    if(!dragging||event.pointerType!=="mouse") return;
    const delta=event.clientX-startX;
    if(Math.abs(delta)>4) moved=true;
    if(moved){
      event.preventDefault();
      track.scrollLeft=startScroll-delta;
      const now=performance.now();
      const elapsed=now-lastTime;
      if(elapsed>0){
        const instantVelocity=-(event.clientX-lastX)/elapsed;
        velocity=velocity*.35+instantVelocity*.65;
      }
      lastX=event.clientX;
      lastTime=now;
    }
  });

  const finishDrag=event=>{
    if(!dragging) return;
    dragging=false;
    track.classList.remove("is-dragging");
    if(moved){
      track.dataset.dragged="true";
      clearTimeout(suppressClickTimer);
      suppressClickTimer=setTimeout(()=>delete track.dataset.dragged,180);
      if(Math.abs(velocity)>.025) runMomentum();
      else restoreSnap();
    }else{
      restoreSnap();
    }
    if(event&&track.hasPointerCapture(event.pointerId)){
      track.releasePointerCapture(event.pointerId);
    }
  };

  track.addEventListener("pointerup",finishDrag);
  track.addEventListener("pointercancel",finishDrag);
  track.addEventListener("click",event=>{
    if(track.dataset.dragged==="true"){
      event.preventDefault();
      event.stopPropagation();
    }
  },true);
}
