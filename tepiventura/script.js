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

const adventureHeader=document.querySelector(".adventure-header");
if(adventureHeader){
  const updateAdventureHeader=()=>adventureHeader.classList.toggle("is-scrolled",window.scrollY>8);
  updateAdventureHeader();
  window.addEventListener("scroll",updateAdventureHeader,{passive:true});
}

/* Desktop carousel: frame-synced drag and glide. Mobile remains native touch scroll. */
const track=document.getElementById("activity-track");
if(track){
  let pointerId=null;
  let startX=0;
  let startScroll=0;
  let targetScroll=0;
  let velocity=0;
  let dragging=false;
  let didMove=false;
  let frame=0;
  let glideFrame=0;
  let suppressClickUntil=0;
  const samples=[];

  const clampScroll=value=>Math.max(0,Math.min(value,track.scrollWidth-track.clientWidth));
  const stopFrames=()=>{
    if(frame) cancelAnimationFrame(frame);
    if(glideFrame) cancelAnimationFrame(glideFrame);
    frame=0;
    glideFrame=0;
  };
  const renderDrag=()=>{
    frame=0;
    if(!dragging) return;
    const difference=targetScroll-track.scrollLeft;
    if(Math.abs(difference)>.15){
      track.scrollLeft+=difference*.88;
      frame=requestAnimationFrame(renderDrag);
    }else{
      track.scrollLeft=targetScroll;
    }
  };
  const glide=()=>{
    let previous=performance.now();
    const friction=.0036;
    const step=now=>{
      const dt=Math.min(32,now-previous);
      previous=now;
      const next=clampScroll(track.scrollLeft+velocity*dt);
      track.scrollLeft=next;
      velocity*=Math.exp(-friction*dt);
      if(Math.abs(velocity)>.018&&next>0&&next<track.scrollWidth-track.clientWidth){
        glideFrame=requestAnimationFrame(step);
      }else{
        glideFrame=0;
        track.classList.remove("is-gliding");
      }
    };
    track.classList.add("is-gliding");
    glideFrame=requestAnimationFrame(step);
  };

  track.addEventListener("pointerdown",event=>{
    if(event.pointerType!=="mouse"||event.button!==0) return;
    stopFrames();
    pointerId=event.pointerId;
    dragging=true;
    didMove=false;
    startX=event.clientX;
    startScroll=track.scrollLeft;
    targetScroll=startScroll;
    velocity=0;
    samples.length=0;
    samples.push({x:event.clientX,t:performance.now()});
    track.classList.add("is-dragging");
    track.style.scrollSnapType="none";
    track.setPointerCapture(pointerId);
  });

  track.addEventListener("pointermove",event=>{
    if(!dragging||event.pointerId!==pointerId) return;
    const delta=event.clientX-startX;
    if(Math.abs(delta)>3) didMove=true;
    if(!didMove) return;
    event.preventDefault();
    targetScroll=clampScroll(startScroll-delta);
    if(!frame) frame=requestAnimationFrame(renderDrag);

    const now=performance.now();
    samples.push({x:event.clientX,t:now});
    while(samples.length>2&&now-samples[0].t>90) samples.shift();
    if(samples.length>=2){
      const first=samples[0],last=samples[samples.length-1];
      const elapsed=last.t-first.t;
      if(elapsed>0) velocity=-(last.x-first.x)/elapsed;
    }
  });

  const endDrag=event=>{
    if(!dragging||event.pointerId!==pointerId) return;
    dragging=false;
    track.classList.remove("is-dragging");
    if(frame){cancelAnimationFrame(frame);frame=0;}
    track.scrollLeft=targetScroll;
    if(didMove){
      suppressClickUntil=performance.now()+250;
      if(Math.abs(velocity)>.025) glide();
    }
    pointerId=null;
  };
  track.addEventListener("pointerup",endDrag);
  track.addEventListener("pointercancel",endDrag);
  track.addEventListener("lostpointercapture",event=>{
    if(dragging) endDrag(event);
  });
  track.addEventListener("click",event=>{
    if(performance.now()<suppressClickUntil){
      event.preventDefault();
      event.stopPropagation();
    }
  },true);
  track.addEventListener("dragstart",event=>event.preventDefault());
}
