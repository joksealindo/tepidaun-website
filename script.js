const toggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".main-nav");
if (toggle && nav) {
  toggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
  nav.querySelectorAll("a").forEach(link => link.addEventListener("click", () => {
    nav.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  }));
}
document.getElementById("year").textContent = new Date().getFullYear();

// Keep the compact header visible and soften its background after scrolling.
const siteHeader = document.querySelector(".site-header");
if (siteHeader) {
  const updateHeaderOnScroll = () => {
    siteHeader.classList.toggle("is-scrolled", window.scrollY > 8);
  };
  updateHeaderOnScroll();
  window.addEventListener("scroll", updateHeaderOnScroll, { passive: true });
}
