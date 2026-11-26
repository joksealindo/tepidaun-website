const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
$('#year').textContent = new Date().getFullYear();

// Menu
const menuToggle = $('#menu-toggle'), menuPanel = $('#menu-panel');
menuToggle.addEventListener('click', () => {
  const open = menuPanel.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(open));
});
$$('#menu-panel a').forEach(a => a.addEventListener('click', () => {
  menuPanel.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
}));

// Hero carousel: autoplay every 5s; manual swipe/drag takes control and stops autoplay.
const slides = $$('.hero-slide'), dots = $$('#hero-dots button');
const heroTrack = $('#hero-track');
let activeSlide = 0;
let autoplayTimer = null;
let pointerId = null;
let pointerStartX = 0;
let dragDelta = 0;
let dragging = false;
let didDrag = false;

function paintHero(index, animate = true) {
  activeSlide = (index + slides.length) % slides.length;
  if (!animate) heroTrack.style.transition = 'none';
  heroTrack.style.transform = `translate3d(${-activeSlide * 100}%,0,0)`;
  dots.forEach((dot, i) => dot.classList.toggle('active', i === activeSlide));
  if (!animate) requestAnimationFrame(() => { heroTrack.style.transition = ''; });
}
function stopHeroAutoplay() {
  if (autoplayTimer !== null) {
    clearInterval(autoplayTimer);
    autoplayTimer = null;
  }
}
function showSlide(index) {
  stopHeroAutoplay();
  paintHero(index);
}
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  autoplayTimer = setInterval(() => paintHero(activeSlide + 1), 5000);
}
dots.forEach((dot, i) => dot.addEventListener('click', () => showSlide(i)));

heroTrack.addEventListener('pointerdown', event => {
  if (event.pointerType === 'mouse' && event.button !== 0) return;
  stopHeroAutoplay();
  pointerId = event.pointerId;
  pointerStartX = event.clientX;
  dragDelta = 0;
  dragging = true;
  didDrag = false;
  heroTrack.classList.add('is-dragging');
  heroTrack.setPointerCapture(pointerId);
});
heroTrack.addEventListener('pointermove', event => {
  if (!dragging || event.pointerId !== pointerId) return;
  dragDelta = event.clientX - pointerStartX;
  if (Math.abs(dragDelta) > 4) didDrag = true;
  if (!didDrag) return;
  event.preventDefault();
  heroTrack.style.transform = `translate3d(calc(${-activeSlide * 100}% + ${dragDelta}px),0,0)`;
});
function finishHeroDrag(event) {
  if (!dragging || event.pointerId !== pointerId) return;
  dragging = false;
  heroTrack.classList.remove('is-dragging');
  const threshold = Math.max(45, heroTrack.clientWidth * 0.12);
  if (didDrag && Math.abs(dragDelta) > threshold) {
    paintHero(activeSlide + (dragDelta < 0 ? 1 : -1));
  } else {
    paintHero(activeSlide);
  }
  pointerId = null;
}
heroTrack.addEventListener('pointerup', finishHeroDrag);
heroTrack.addEventListener('pointercancel', finishHeroDrag);
heroTrack.addEventListener('lostpointercapture', event => {
  if (dragging) finishHeroDrag(event);
});
heroTrack.addEventListener('dragstart', event => event.preventDefault());

// Product catalog: add real product records here when product photos and details are ready.
const products = [];
const cart = [];
const productSelect = $('#order-product');
function renderProducts(list = products) {
  $$('.product-rail').forEach(rail => {
    const category = rail.dataset.rail;
    const items = list.filter(p => p.category === category);
    rail.innerHTML = '';
    if (!items.length) {
      rail.innerHTML = '<div class="empty-state"><span class="empty-symbol">✳</span><p>Produk pada kategori ini akan ditampilkan di sini.</p></div>';
      return;
    }
    items.forEach(product => {
      const card = document.createElement('article');
      card.className = 'product-card';
      card.innerHTML = '<div class="product-photo"><img alt=""></div><div class="product-info"><h3></h3><p></p><div class="product-actions"><button class="buy-now">Beli Sekarang</button><button class="add-cart" aria-label="Tambah ke keranjang">+</button></div></div>';
      card.querySelector('img').src = product.image;
      card.querySelector('img').alt = product.name;
      card.querySelector('h3').textContent = product.name;
      card.querySelector('p').textContent = product.description || '';
      card.querySelector('.buy-now').addEventListener('click', () => selectProduct(product.id));
      card.querySelector('.add-cart').addEventListener('click', () => addToCart(product.id));
      rail.append(card);
    });
  });
  productSelect.innerHTML = '<option value="">Pilih produk</option>';
  products.forEach(p => {
    const option = document.createElement('option');
    option.value = p.id; option.textContent = p.name; productSelect.append(option);
  });
}
function selectProduct(id) {
  productSelect.value = id;
  $('#pemesanan').scrollIntoView({behavior:'smooth'});
}
function addToCart(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;
  const existing = cart.find(item => item.id === id);
  if (existing) existing.quantity += 1; else cart.push({id, name:product.name, quantity:1});
  renderCart();
}
function renderCart() {
  $('#cart-count').textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
  const wrap = $('#cart-items');
  wrap.innerHTML = '';
  if (!cart.length) wrap.innerHTML = '<p class="cart-empty">Keranjangmu masih kosong.</p>';
  cart.forEach(item => {
    const line = document.createElement('div');
    line.className = 'cart-line';
    const name = document.createElement('span'); name.textContent = item.name + ' × ' + item.quantity;
    const remove = document.createElement('button'); remove.textContent = 'Hapus'; remove.addEventListener('click', () => { cart.splice(cart.indexOf(item),1); renderCart(); });
    line.append(name, remove); wrap.append(line);
  });
  $('#cart-checkout').disabled = cart.length === 0;
}
function openCart(open) {
  $('#cart-drawer').classList.toggle('open', open);
  $('#cart-backdrop').classList.toggle('open', open);
  $('#cart-drawer').setAttribute('aria-hidden', String(!open));
}
$('#cart-open').addEventListener('click', () => openCart(true));
$('#cart-close').addEventListener('click', () => openCart(false));
$('#cart-backdrop').addEventListener('click', () => openCart(false));
$('#cart-checkout').addEventListener('click', () => {
  if (!cart.length) return;
  const first = cart[0];
  selectProduct(first.id);
  openCart(false);
});

// Search filters product records when catalog has been populated.
$('#search-form').addEventListener('submit', event => {
  event.preventDefault();
  const q = $('#search-input').value.trim().toLowerCase();
  const filtered = q ? products.filter(p => (p.name + ' ' + (p.description || '')).toLowerCase().includes(q)) : products;
  renderProducts(filtered);
  $('#kategori').scrollIntoView({behavior:'smooth'});
});

// Address dataset is intentionally not fabricated. Populate from a maintained Indonesian administrative-area dataset.
const addressSelects = ['province','city','district','village'].map(id => $('#'+id));
addressSelects[0].innerHTML = '<option value="">Data provinsi belum dipasang</option>';
addressSelects.slice(1).forEach((select, i) => {
  select.innerHTML = '<option value="">Menunggu pilihan sebelumnya</option>';
  select.disabled = true;
});

// Order submission prepares a WhatsApp-ready summary; replace the number with Tepidaun's official contact before launch.
$('#order-form').addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  if (!data.get('product')) {
    $('#form-feedback').textContent = 'Silakan pilih produk terlebih dahulu.';
    return;
  }
  $('#form-feedback').textContent = 'Detail pesanan sudah terisi. Hubungkan nomor WhatsApp resmi Tepidaun untuk mengaktifkan pengiriman pesanan.';
});
renderProducts();
renderCart();
