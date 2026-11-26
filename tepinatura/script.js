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

// Hero carousel
const slides = $$('.hero-slide'), dots = $$('#hero-dots button');
let activeSlide = 0;
function showSlide(index) {
  activeSlide = (index + slides.length) % slides.length;
  slides.forEach((slide, i) => slide.classList.toggle('active', i === activeSlide));
  dots.forEach((dot, i) => dot.classList.toggle('active', i === activeSlide));
}
$('#hero-prev').addEventListener('click', () => showSlide(activeSlide - 1));
$('#hero-next').addEventListener('click', () => showSlide(activeSlide + 1));
dots.forEach((dot, i) => dot.addEventListener('click', () => showSlide(i)));

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
