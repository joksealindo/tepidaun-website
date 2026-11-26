const SUPABASE_URL="https://woiwusrwbrsrabswjxal.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_5d5lPQEGEYr4475By_3kFw_1z0VTuS";
const client=supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const $=s=>document.querySelector(s);
const state={user:null,categories:[],products:[],imagePath:null};
const money=n=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n||0));
const slugify=s=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
function notify(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2600)}
function showLogin(message=""){$("#login-screen").hidden=false;$("#app-screen").hidden=true;$("#login-message").textContent=message}
function showApp(){ $("#login-screen").hidden=true;$("#app-screen").hidden=false;$("#signed-in-email").textContent=state.user.email||""; }
async function verifyAdmin(session){
 if(!session?.user) return false;
 const {data:{user},error}=await client.auth.getUser();
 if(error||!user||user.app_metadata?.role!=="admin")return false;
 state.user=user;return true;
}
async function boot(){
 const {data:{session}}=await client.auth.getSession();
 if(session&&await verifyAdmin(session)){showApp();await loadCatalog()}else showLogin(session?"Akun ini belum memiliki akses administrator.":"");
}
$("#login-form").addEventListener("submit",async e=>{
 e.preventDefault();$("#login-message").textContent="Memeriksa akun…";
 const {data,error}=await client.auth.signInWithPassword({email:$("#email").value.trim(),password:$("#password").value});
 if(error){$("#login-message").textContent="Login belum berhasil. Periksa email dan password, lalu coba lagi.";return}
 if(!await verifyAdmin(data.session)){await client.auth.signOut();showLogin("Akun ini belum memiliki hak administrator. Hubungi pengelola.");return}
 showApp();await loadCatalog();
});
$("#logout-button").addEventListener("click",async()=>{await client.auth.signOut();state.user=null;showLogin("Anda sudah keluar.")});
client.auth.onAuthStateChange(async(event,session)=>{if(event==="SIGNED_OUT"){state.user=null;showLogin()}});
function openView(name){
 document.querySelectorAll(".view").forEach(v=>v.hidden=true);
 $("#view-"+name).hidden=false;
 document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===name));
 $("#page-title").textContent=name==="overview"?"Ringkasan":"Tepinatura";
 if(name==="tepinatura")renderProducts();
}
document.querySelectorAll("[data-view]").forEach(b=>b.addEventListener("click",()=>openView(b.dataset.view)));
document.querySelectorAll("[data-open]").forEach(b=>b.addEventListener("click",()=>openView(b.dataset.open)));
async function loadCatalog(){
 const [cats,prods]=await Promise.all([
  client.from("product_categories").select("*").order("sort_order"),
  client.from("products").select("*,product_categories(name)").order("sort_order").order("created_at",{ascending:false})
 ]);
 if(cats.error||prods.error){notify("Tidak dapat memuat katalog. Periksa koneksi.");return}
 state.categories=cats.data||[];state.products=prods.data||[];
 const filter=$("#category-filter");filter.innerHTML='<option value="">Semua kategori</option>'+state.categories.map(c=>'<option value="'+c.id+'">'+escapeHtml(c.name)+'</option>').join("");
 $("#product-category").innerHTML=state.categories.map(c=>'<option value="'+c.id+'">'+escapeHtml(c.name)+'</option>').join("");
 $("#stat-total").textContent=state.products.length;
 $("#stat-published").textContent=state.products.filter(p=>p.is_published).length;
 $("#stat-draft").textContent=state.products.filter(p=>!p.is_published).length;
 renderProducts();
}
function escapeHtml(s=""){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function renderProducts(){
 const q=$("#product-search").value.toLowerCase(),cat=$("#category-filter").value,status=$("#status-filter").value;
 const rows=state.products.filter(p=>(!q||p.name.toLowerCase().includes(q))&&(!cat||p.category_id===cat)&&(!status||(status==="published" ? p.is_published:!p.is_published)));
 $("#product-list").innerHTML=rows.length?rows.map(p=>{
  const image=p.image_path?client.storage.from("product-images").getPublicUrl(p.image_path).data.publicUrl:"";
  return '<article class="product-row"><img class="product-thumb" src="'+(image||"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='100%25' height='100%25' fill='%23eeede8'/%3E%3C/svg%3E")+'" alt=""><div><div class="product-name">'+escapeHtml(p.name)+'</div><div class="product-meta">'+escapeHtml(p.product_categories?.name||"Kategori")+' · Stok '+p.stock+'</div></div><div class="product-price">'+money(p.price)+'</div><span class="status '+(p.is_published?"live":"")+'">'+(p.is_published?"Ditampilkan":"Draft")+'</span><div class="row-actions"><button class="small-button" data-edit="'+p.id+'">Edit</button><button class="small-button delete" data-delete="'+p.id+'">Hapus</button></div></article>'
 }).join(""):'<div class="empty-list">Belum ada produk. Klik “Tambah produk” untuk mulai mengisi katalog.</div>';
 document.querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>editProduct(b.dataset.edit)));
 document.querySelectorAll("[data-delete]").forEach(b=>b.addEventListener("click",()=>deleteProduct(b.dataset.delete)));
}
$("#product-search").addEventListener("input",renderProducts);$("#category-filter").addEventListener("change",renderProducts);$("#status-filter").addEventListener("change",renderProducts);
function resetForm(){
 $("#product-form").reset();$("#product-id").value="";$("#product-price").value="0";$("#product-stock").value="0";$("#product-order").value="0";$("#image-preview").hidden=true;$("#image-preview").innerHTML="";$("#form-message").textContent="";state.imagePath=null;$("#dialog-title").textContent="Tambah produk";
}
function openProductDialog(){resetForm();$("#product-dialog").showModal()}
$("#add-product").addEventListener("click",openProductDialog);
$("#close-dialog").addEventListener("click",()=>$("#product-dialog").close());
$("#cancel-dialog").addEventListener("click",()=>$("#product-dialog").close());
function editProduct(id){
 const p=state.products.find(x=>x.id===id);if(!p)return;resetForm();
 $("#dialog-title").textContent="Edit produk";$("#product-id").value=p.id;$("#product-name").value=p.name;$("#product-category").value=p.category_id;$("#product-sku").value=p.sku||"";$("#product-price").value=p.price;$("#product-compare").value=p.compare_at_price??"";$("#product-stock").value=p.stock;$("#product-order").value=p.sort_order;$("#product-short").value=p.short_description||"";$("#product-description").value=p.description||"";$("#product-published").checked=p.is_published;state.imagePath=p.image_path;
 if(p.image_path){const url=client.storage.from("product-images").getPublicUrl(p.image_path).data.publicUrl;$("#image-preview").innerHTML='<img src="'+url+'" alt="Foto produk saat ini">';$("#image-preview").hidden=false}
 $("#product-dialog").showModal();
}
$("#product-image").addEventListener("change",e=>{
 const file=e.target.files[0];if(!file)return;
 if(file.size>5*1024*1024){$("#form-message").textContent="Ukuran foto maksimal 5 MB.";e.target.value="";return}
 const url=URL.createObjectURL(file);$("#image-preview").innerHTML='<img src="'+url+'" alt="Pratinjau foto produk">';$("#image-preview").hidden=false;
});
async function deleteProduct(id){
 const p=state.products.find(x=>x.id===id);if(!p||!confirm('Hapus produk "'+p.name+'"? Tindakan ini tidak dapat dibatalkan.'))return;
 const {error}=await client.from("products").delete().eq("id",id);
 if(error){notify("Produk belum dapat dihapus.");return}
 if(p.image_path)await client.storage.from("product-images").remove([p.image_path]);
 notify("Produk berhasil dihapus.");await loadCatalog();
}
$("#product-form").addEventListener("submit",async e=>{
 e.preventDefault();const save=$("#save-product");save.disabled=true;save.textContent="Menyimpan…";$("#form-message").textContent="";
 try{
  const name=$("#product-name").value.trim(),category_id=$("#product-category").value,id=$("#product-id").value||null;
  let imagePath=state.imagePath;
  const file=$("#product-image").files[0];
  if(file){
   const ext=file.name.split(".").pop().toLowerCase(),path=Date.now()+"-"+slugify(name)+"."+ext;
   const {error:uploadError}=await client.storage.from("product-images").upload(path,file,{upsert:false,contentType:file.type});
   if(uploadError)throw uploadError;imagePath=path;
  }
  const record={category_id,name,slug:slugify(name)+(id?"-"+id.slice(0,6):""),sku:$("#product-sku").value.trim()||null,short_description:$("#product-short").value.trim()||null,description:$("#product-description").value.trim()||null,price:Number($("#product-price").value),compare_at_price:$("#product-compare").value?Number($("#product-compare").value):null,stock:Number($("#product-stock").value),image_path:imagePath,is_published:$("#product-published").checked,sort_order:Number($("#product-order").value)};
  const result=id?await client.from("products").update(record).eq("id",id):await client.from("products").insert(record);
  if(result.error)throw result.error;
  $("#product-dialog").close();notify("Produk berhasil disimpan.");await loadCatalog();
 }catch(err){$("#form-message").textContent="Belum berhasil disimpan. Periksa data dan koneksi, lalu coba lagi."}
 finally{save.disabled=false;save.textContent="Simpan produk"}
});
boot();
