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

// Product catalog: public products are loaded from Supabase.
const SUPABASE_URL = 'https://woiwusrwbrsrabswjxal.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvaXd1c3J3YnJzcmFic3dqeGFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU2ODQwNjUsImV4cCI6MjExMTI2MDA2NX0.NIRo5YW2EeHYv5JvWRn8jhjsDIKrjcXKFSOqdqi04yE';
const catalogClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const products = [];
const cart = [];
const productSelect = $('#order-product');
const formatPrice = value => new Intl.NumberFormat('id-ID', {style:'currency', currency:'IDR', maximumFractionDigits:0}).format(Number(value || 0));

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
      card.innerHTML = '<div class="product-photo"><img alt=""></div><div class="product-info"><h3></h3><strong class="product-price"></strong><div class="product-actions"><button class="buy-now">Beli</button><button class="add-cart" aria-label="Tambah ke keranjang"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="20" r="1"></circle><circle cx="18" cy="20" r="1"></circle><path d="M2 3h2l2.4 11.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6L22 7H5"></path></svg></button></div></div>';
      const img = card.querySelector('img');
      if (product.image) img.src = product.image;
      img.alt = product.name;
      card.querySelector('h3').textContent = product.name;
      card.querySelector('.product-price').textContent = formatPrice(product.price);
      card.querySelector('.buy-now').addEventListener('click', () => selectProduct(product.id));
      card.querySelector('.add-cart').addEventListener('click', () => addToCart(product.id));
      rail.append(card);
    });
  });
  productSelect.innerHTML = '<option value="">Pilih produk</option>';
  list.forEach(p => {
    const option = document.createElement('option');
    option.value = p.id; option.textContent = p.name; productSelect.append(option);
  });
}

async function loadProducts() {
  const {data, error} = await catalogClient
    .from('products')
    .select('id,name,short_description,description,price,weight_grams,image_path,sort_order,product_categories!inner(name,is_active)')
    .eq('is_published', true)
    .eq('product_categories.is_active', true)
    .order('sort_order', {ascending:true});
  if (error) {
    console.error('Tepinatura catalog:', error.message);
    $$('.product-rail').forEach(rail => {
      rail.innerHTML = '<div class="empty-state"><span class="empty-symbol">!</span><p>Katalog belum dapat dimuat. Silakan coba lagi nanti.</p></div>';
    });
    return;
  }
  products.splice(0, products.length, ...(data || []).map(row => ({
    id: row.id,
    name: row.name,
    category: row.product_categories.name,
    description: row.short_description || row.description || '',
    price: row.price,
    weightGrams: row.weight_grams || 0,
    image: row.image_path ? catalogClient.storage.from('product-images').getPublicUrl(row.image_path).data.publicUrl : ''
  })));
  renderProducts();
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

// Close the expanded mobile search when tapping anywhere outside it.
document.addEventListener('pointerdown', event => {
  const searchForm = $('#search-form');
  if (searchForm.classList.contains('is-mobile-open') && !searchForm.contains(event.target)) {
    searchForm.classList.remove('is-mobile-open');
    $('#search-input').blur();
  }
});

// Search filters product records when catalog has been populated.
$('#search-form').addEventListener('submit', event => {
  if (window.matchMedia('(max-width: 720px)').matches && !$('#search-form').classList.contains('is-mobile-open')) {
    event.preventDefault();
    $('#search-form').classList.add('is-mobile-open');
    $('#search-input').focus();
    return;
  }
  event.preventDefault();
  $('#search-form').classList.remove('is-mobile-open');
  const q = $('#search-input').value.trim().toLowerCase();
  const filtered = q ? products.filter(p => (p.name + ' ' + (p.description || '')).toLowerCase().includes(q)) : products;
  renderProducts(filtered);
  document.querySelector('.category')?.scrollIntoView({behavior:'smooth'});
});

// Indonesian administrative areas: province -> regency/city -> district.
// Village data is not yet imported, so the village field remains a manual text input.
const provinceSelect = $('#province');
const citySelect = $('#city');
const districtSelect = $('#district');

function resetRegionSelect(select, placeholder) {
  select.innerHTML = '';
  const option = document.createElement('option');
  option.value = '';
  option.textContent = placeholder;
  select.append(option);
  select.value = '';
}
function fillRegionSelect(select, rows, placeholder) {
  resetRegionSelect(select, placeholder);
  rows.forEach(row => {
    const option = document.createElement('option');
    option.value = row.id;
    option.textContent = row.name;
    select.append(option);
  });
  select.disabled = rows.length === 0;
}
async function loadProvinces() {
  resetRegionSelect(provinceSelect, 'Memuat provinsi...');
  provinceSelect.disabled = true;
  const {data, error} = await catalogClient
    .from('regions_provinces')
    .select('id,name')
    .order('name', {ascending:true});
  if (error) {
    resetRegionSelect(provinceSelect, 'Provinsi gagal dimuat');
    console.error('Tepinatura regions (provinces):', error.message);
    $('#form-feedback').textContent = 'Data wilayah belum dapat dimuat. Silakan muat ulang halaman.';
    return;
  }
  fillRegionSelect(provinceSelect, data || [], 'Pilih provinsi');
}
provinceSelect.addEventListener('change', async () => {
  resetRegionSelect(citySelect, 'Memuat kabupaten/kota...');
  resetRegionSelect(districtSelect, 'Pilih kecamatan');
  citySelect.disabled = true;
  districtSelect.disabled = true;
  if (!provinceSelect.value) {
    resetRegionSelect(citySelect, 'Pilih kabupaten/kota');
    return;
  }
  const {data, error} = await catalogClient
    .from('regions_regencies')
    .select('id,name')
    .eq('province_id', provinceSelect.value)
    .order('name', {ascending:true});
  if (error) {
    resetRegionSelect(citySelect, 'Kabupaten/kota gagal dimuat');
    console.error('Tepinatura regions (regencies):', error.message);
    return;
  }
  fillRegionSelect(citySelect, data || [], 'Pilih kabupaten/kota');
});
citySelect.addEventListener('change', async () => {
  resetRegionSelect(districtSelect, 'Memuat kecamatan...');
  districtSelect.disabled = true;
  if (!citySelect.value) {
    resetRegionSelect(districtSelect, 'Pilih kecamatan');
    return;
  }
  const {data, error} = await catalogClient
    .from('regions_districts')
    .select('id,name')
    .eq('regency_id', citySelect.value)
    .order('name', {ascending:true});
  if (error) {
    resetRegionSelect(districtSelect, 'Kecamatan gagal dimuat');
    console.error('Tepinatura regions (districts):', error.message);
    return;
  }
  fillRegionSelect(districtSelect, data || [], 'Pilih kecamatan');
});
loadProvinces();


// Live SPX Regular shipping quote through the protected Supabase Edge Function.
const quantityInput = $('#order-form [name="quantity"]');
const shippingSelect = $('#order-form [name="shipping"]');
const postalInput = $('#order-form [name="postal"]');
const locationCache = new Map();
let currentShippingRate = null;
let shippingQuoteLoading = false;
let quoteTimer = null;
let quoteRequestId = 0;

function selectedProductAndQuantity() {
  const product = products.find(p => p.id === productSelect.value);
  const quantity = Math.max(1, Number(quantityInput.value) || 1);
  return { product, quantity };
}
function updateOrderSummary() {
  const {product, quantity} = selectedProductAndQuantity();
  const productTotal = product ? Number(product.price) * quantity : null;
  const shippingCost = currentShippingRate
    ? Number(currentShippingRate.discounted_cost ?? currentShippingRate.cost)
    : null;
  $('#summary-product-price').textContent = productTotal === null ? '—' : formatPrice(productTotal);
  $('#summary-shipping').textContent = shippingCost === null
    ? (shippingQuoteLoading ? 'Mengambil tarif…' : 'Belum tersedia')
    : formatPrice(shippingCost);
  $('#summary-total').textContent = productTotal === null || shippingCost === null
    ? (productTotal === null ? '—' : 'Menunggu ongkir')
    : formatPrice(productTotal + shippingCost);
}
function resetShippingQuote(message = 'Pilih provinsi, kabupaten/kota, kecamatan, dan produk untuk menghitung ongkir.') {
  currentShippingRate = null;
  shippingQuoteLoading = false;
  shippingSelect.innerHTML = '<option value="">SPX Reguler — menunggu tarif</option>';
  shippingSelect.disabled = true;
  $('#form-feedback').textContent = message;
  updateOrderSummary();
}
async function getDestinationSubdistrict() {
  const provinceName = provinceSelect.selectedOptions[0]?.textContent?.trim() || '';
  const cityName = citySelect.selectedOptions[0]?.textContent?.trim() || '';
  const districtName = districtSelect.selectedOptions[0]?.textContent?.trim() || '';
  if (!provinceSelect.value || !citySelect.value || !districtSelect.value) {
    throw new Error('Pilih provinsi, kabupaten/kota, dan kecamatan terlebih dahulu.');
  }
  const cacheKey = [provinceName, cityName, districtName].join('|').toLocaleLowerCase('id-ID');
  if (locationCache.has(cacheKey)) return locationCache.get(cacheKey);

  const response = await fetch(SUPABASE_URL + '/functions/v1/shipping-rates', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_PUBLISHABLE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_PUBLISHABLE_KEY
    },
    body: JSON.stringify({ action: 'location_search', query: districtName })
  });
  const result = await response.json();
  if (!response.ok || !result.success) throw new Error(result.error || 'Pencarian kecamatan ke layanan ongkir gagal.');

  const normalize = value => String(value || '').trim().toLocaleLowerCase('id-ID')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/^(kabupaten|kab\.?|kota administrasi|kota)\s+/i, '')
    .replace(/\s+/g, ' ');
  const locations = result.locations || [];
  const byDistrict = locations.filter(location =>
    normalize(location.subdistrict_name) === normalize(districtName)
  );
  const matches = byDistrict.filter(location =>
    normalize(location.city_name) === normalize(cityName) &&
    normalize(location.province_name) === normalize(provinceName)
  );
  if (matches.length !== 1) {
    const candidates = byDistrict.slice(0, 5).map(location =>
      location.label || [location.subdistrict_name, location.city_name, location.province_name].filter(Boolean).join(', ')
    );
    const detail = candidates.length ? ' Hasil yang ditemukan: ' + candidates.join(' | ') : ' Kata kunci: ' + districtName;
    throw new Error(matches.length
      ? 'Kecamatan tujuan ditemukan lebih dari satu. Mohon periksa pilihan kabupaten/kota.' + detail
      : 'Nama kecamatan belum cocok dengan data layanan ongkir.' + detail);
  }
  const selected = matches[0];
  if (!selected.subdistrict_id) throw new Error('ID kecamatan tujuan tidak tersedia dari layanan ongkir.');
  locationCache.set(cacheKey, selected);
  return selected;
}
async function fetchShippingQuote() {
  const {product, quantity} = selectedProductAndQuantity();
  const requestId = ++quoteRequestId;
  if (!product) {
    resetShippingQuote();
    return;
  }
  if (!Number.isFinite(Number(product.weightGrams)) || Number(product.weightGrams) < 1) {
    resetShippingQuote('Berat produk belum diatur. Silakan hubungi admin.');
    return;
  }
  if (!provinceSelect.value || !citySelect.value || !districtSelect.value) {
    resetShippingQuote();
    return;
  }

  currentShippingRate = null;
  shippingQuoteLoading = true;
  shippingSelect.disabled = true;
  shippingSelect.innerHTML = '<option value="">Menghitung ongkir SPX Reguler…</option>';
  $('#form-feedback').textContent = 'Mencari kecamatan dan menghitung ongkir SPX Reguler…';
  updateOrderSummary();

  try {
    const destination = await getDestinationSubdistrict();
    if (requestId !== quoteRequestId) return;
    const response = await fetch(SUPABASE_URL + '/functions/v1/shipping-rates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_PUBLISHABLE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_PUBLISHABLE_KEY
      },
      body: JSON.stringify({
        action: 'rate',
        destination_subdistrict_id: destination.subdistrict_id,
        destination_subdistrict_name: destination.subdistrict_name,
        weight: Math.ceil(Number(product.weightGrams) * quantity)
      })
    });
    const result = await response.json();
    if (requestId !== quoteRequestId) return;
    if (!response.ok || !result.success) throw new Error(result.error || 'Tarif SPX belum dapat dihitung.');
    const rate = (result.rates || []).find(item => item.courier_code === 'spx');
    if (!rate) {
      resetShippingQuote('SPX Reguler belum tersedia untuk rute kecamatan ini.');
      return;
    }
    currentShippingRate = rate;
    shippingQuoteLoading = false;
    const amount = Number(rate.discounted_cost ?? rate.cost);
    const serviceLabel = rate.service_name || 'SPX Reguler';
    const etd = rate.etd_text ? ' · ' + rate.etd_text : '';
    shippingSelect.innerHTML = '';
    const option = document.createElement('option');
    option.value = rate.service_code || 'spx_regular';
    option.textContent = serviceLabel + etd + ' — ' + formatPrice(amount);
    shippingSelect.append(option);
    shippingSelect.disabled = false;
    shippingSelect.value = option.value;
    $('#form-feedback').textContent = rate.source === 'cache'
      ? 'Tarif SPX berhasil dimuat (data cache).'
      : 'Tarif SPX berhasil dihitung.';
    updateOrderSummary();
  } catch (error) {
    if (requestId !== quoteRequestId) return;
    resetShippingQuote(error.message || 'Gagal mengambil tarif SPX. Coba lagi.');
  }
}
function scheduleShippingQuote() {
  clearTimeout(quoteTimer);
  quoteTimer = setTimeout(fetchShippingQuote, 450);
}
productSelect.addEventListener('change', scheduleShippingQuote);
quantityInput.addEventListener('input', () => {
  updateOrderSummary();
  scheduleShippingQuote();
});
provinceSelect.addEventListener('change', () => { locationCache.clear(); scheduleShippingQuote(); });
citySelect.addEventListener('change', () => { locationCache.clear(); scheduleShippingQuote(); });
districtSelect.addEventListener('change', scheduleShippingQuote);
postalInput.addEventListener('change', scheduleShippingQuote);
shippingSelect.addEventListener('change', updateOrderSummary);

// Validate the live quote before accepting the order details.
$('#order-form').addEventListener('submit', event => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  if (!data.get('product')) {
    $('#form-feedback').textContent = 'Silakan pilih produk terlebih dahulu.';
    return;
  }
  if (!currentShippingRate) {
    $('#form-feedback').textContent = 'Tarif SPX belum tersedia. Pastikan pilihan kecamatan tujuan benar dan tunggu perhitungan selesai.';
    return;
  }
  const {product, quantity} = selectedProductAndQuantity();
  const productTotal = Number(product.price) * quantity;
  const shippingCost = Number(currentShippingRate.discounted_cost ?? currentShippingRate.cost);
  $('#form-feedback').textContent = 'Rincian sementara: ' + product.name + ' × ' + quantity +
    ' · Produk ' + formatPrice(productTotal) + ' · Ongkir SPX ' + formatPrice(shippingCost) +
    ' · Total ' + formatPrice(productTotal + shippingCost) +
    '. Tahap pengiriman pesanan melalui WhatsApp akan disambungkan berikutnya.';
});
renderProducts();
renderCart();
loadProducts();
