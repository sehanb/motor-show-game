/* A small local-image carousel. Native scrolling supports touch swipes. */
(() => {
  const slider=document.querySelector('.mobile-banner-slider');
  if(!slider)return;
  const track=slider.querySelector('.mobile-banner-track');
  const dots=[...slider.querySelectorAll('.mobile-banner-dots button')];
  const mobile=matchMedia('(max-width:767px)');
  const reduced=matchMedia('(prefers-reduced-motion:reduce)');
  let active=0,timer=null,lastInteraction=0;
  const mark=index=>{active=index;dots.forEach((dot,i)=>dot.setAttribute('aria-pressed',String(i===index)));};
  function go(index,manual=false){if(!mobile.matches)return;if(manual)lastInteraction=Date.now();mark(index);track.scrollTo({left:index*track.clientWidth,behavior:reduced.matches?'instant':'smooth'});}
  dots.forEach((dot,i)=>dot.addEventListener('click',()=>go(i,true)));
  track.addEventListener('scroll',()=>{if(track.clientWidth)mark(Math.min(dots.length-1,Math.max(0,Math.round(track.scrollLeft/track.clientWidth))));},{passive:true});
  slider.addEventListener('pointerdown',()=>{lastInteraction=Date.now();},{passive:true});
  slider.addEventListener('keydown',event=>{lastInteraction=Date.now();if(event.target.closest('.mobile-banner-dots')&&(event.key==='ArrowRight'||event.key==='ArrowLeft')){event.preventDefault();const next=(active+(event.key==='ArrowRight'?1:-1)+dots.length)%dots.length;go(next,true);dots[next].focus();}});
  function schedule(){clearInterval(timer);timer=null;if(!mobile.matches||reduced.matches)return;timer=setInterval(()=>{if(document.hidden||slider.contains(document.activeElement)||slider.matches(':hover')||Date.now()-lastInteraction<8000)return;go((active+1)%dots.length);},5000);}
  mobile.addEventListener('change',schedule);reduced.addEventListener('change',schedule);
  new ResizeObserver(()=>{if(mobile.matches&&track.clientWidth)track.scrollTo({left:active*track.clientWidth,behavior:'instant'});}).observe(track);
  schedule();
})();
