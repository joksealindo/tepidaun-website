const SUPABASE_URL="https://woiwusrwbrsrabswjxal.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvaXd1c3J3YnJzcmFic3dqeGFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTU2ODQwNjUsImV4cCI6MjExMTI2MDA2NX0.NIRo5YW2EeHYv5JvWRn8jhjsDIKrjcXKFSOqdqi04yE";
const client=supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const $=s=>document.querySelector(s);
const state={user:null,categories:[],products:[],imagePath:null};
const money=n=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n||0));
const slugify=s=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
function notify(msg){const t=$("#toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2600)}
function showLogin(message=""){$("#login-screen").hidden=false;$("#app-screen").hidden=true;$("#login-message").textContent=message}
function showApp(){ $("#login-screen").hidden=true;$("#app-screen").hidden=false;$("#signed-in-email").textContent="Mode sementara · tanpa login";$("#logout-button").hidden=true; }
async function verifyAdmin(session){
 if(!session?.user) return false;
 const {data:{user},error}=await client.auth.getUser();
 if(error||!user||user.app_metadata?.role!=="admin")return false;
 state.user=user;return true;
}
function showRecovery(message=""){
 $("#recovery-screen").hidden=false;
 $("#login-screen").hidden=true;
 $("#app-screen").hidden=true;
 if(message) $("#recovery-message").textContent=message;
}
async function boot(){
 const hashParams=new URLSearchParams(window.location.hash.replace(/^#/,""));
 const recoveryFromLink=hashParams.get("type")==="recovery";
 if(recoveryFromLink) showRecovery("Tautan pemulihan terdeteksi. Silakan buat password baru.");
 const {error}=await client.auth.getSession();
 if(recoveryFromLink){
  if(error) $("#recovery-message").textContent="Sesi pemulihan tidak dapat dibaca. Minta tautan reset password yang baru.";
  return;
 }
 showApp();
 await loadCatalog();
}
$("#recovery-form").addEventListener("submit",async e=>{
 e.preventDefault();
 const password=$("#new-password").value;
 if(password.length<8){$("#recovery-message").textContent="Password minimal 8 karakter.";return}
 if(password!==$("#confirm-password").value){$("#recovery-message").textContent="Konfirmasi password belum sama.";return}
 const button=e.submitter;
 if(button){button.disabled=true;button.textContent="Menyimpan…"}
 $("#recovery-message").textContent="Menyimpan password baru…";
 const {error}=await client.auth.updateUser({password});
 if(error){
  $("#recovery-message").textContent="Belum berhasil: "+error.message;
  if(button){button.disabled=false;button.textContent="Simpan password baru"}
  return;
 }
 history.replaceState(null,document.title,window.location.pathname+window.location.search);
 $("#recovery-screen").hidden=true;
 showApp();
 await loadCatalog();
 notify("Password baru berhasil disimpan.");
});
$("#login-form").addEventListener("submit",async e=>{
 e.preventDefault();$("#login-message").textContent="Memeriksa akun…";
 const {data,error}=await client.auth.signInWithPassword({email:$("#email").value.trim(),password:$("#password").value});
 if(error){$("#login-message").textContent="Login belum berhasil. Periksa email dan password, lalu coba lagi.";return}
 if(!await verifyAdmin(data.session)){await client.auth.signOut();showLogin("Akun ini belum memiliki hak administrator. Hubungi pengelola.");return}
 showApp();await loadCatalog();
});
$("#logout-button").addEventListener("click",async()=>{await client.auth.signOut();state.user=null;showLogin("Anda sudah keluar.")});
client.auth.onAuthStateChange((event,session)=>{
 if(event==="PASSWORD_RECOVERY") showRecovery("Tautan valid. Silakan buat password baru.");
 if(event==="SIGNED_OUT"){state.user=null;showLogin()}
});
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
 const categorySelect=$("#product-category");
 const filter=$("#category-filter");
 categorySelect.innerHTML='<option value="">Memuat kategori…</option>';
 filter.innerHTML='<option value="">Semua kategori</option>';
 const cats=await client.from("product_categories")
  .select("id,name,sort_order,is_active")
  .eq("is_active",true)
  .order("sort_order");
 const fallbackCategories=[
  {id:"aae1b87a-916d-498a-b454-42578424cefc",name:"Hasil Alam",sort_order:1},
  {id:"72cbb5d2-7a15-41f8-80a0-35b8384bb2f7",name:"Kebutuhan Tanam",sort_order:2},
  {id:"b4093078-00e7-45e9-85b4-f0fefc1afab8",name:"Tanaman",sort_order:3},
  {id:"ccee38b8-8e99-4f04-a8b9-00bc7e731822",name:"Produk Pilihan",sort_order:4}
 ];
 if(cats.error || !cats.data?.length){
  state.categories=fallbackCategories;
  categorySelect.innerHTML='<option value="">Pilih kategori</option>'+state.categories.map(c=>'<option value="'+c.id+'">'+escapeHtml(c.name)+'</option>').join("");
  filter.innerHTML='<option value="">Semua kategori</option>'+state.categories.map(c=>'<option value="'+c.id+'">'+escapeHtml(c.name)+'</option>').join("");
  notify("Daftar kategori memakai data cadangan. "+(cats.error?.message||""));
 }else{
  state.categories=cats.data;
 }
 categorySelect.innerHTML='<option value="">Pilih kategori</option>'+state.categories.map(c=>'<option value="'+c.id+'">'+escapeHtml(c.name)+'</option>').join("");
 filter.innerHTML='<option value="">Semua kategori</option>'+state.categories.map(c=>'<option value="'+c.id+'">'+escapeHtml(c.name)+'</option>').join("");
 const prods=await client.from("products")
  .select("*,product_categories(name)")
  .order("sort_order")
  .order("created_at",{ascending:false});
 if(prods.error){
  state.products=[];
  notify("Kategori sudah dimuat, tetapi daftar produk gagal dimuat: "+prods.error.message);
 }else{
  state.products=prods.data||[];
 }
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
 $("#product-form").reset();$("#product-id").value="";$("#image-preview").hidden=true;$("#image-preview").innerHTML="";$("#form-message").textContent="";state.imagePath=null;$("#dialog-title").textContent="Tambah produk";
}
function openProductDialog(){resetForm();$("#product-dialog").showModal()}
$("#add-product").addEventListener("click",openProductDialog);
$("#close-dialog").addEventListener("click",()=>$("#product-dialog").close());
$("#cancel-dialog").addEventListener("click",()=>$("#product-dialog").close());
function editProduct(id){
 const p=state.products.find(x=>x.id===id);if(!p)return;resetForm();
 $("#dialog-title").textContent="Edit produk";$("#product-id").value=p.id;$("#product-name").value=p.name;$("#product-category").value=p.category_id;$("#product-sku").value=p.sku||"";$("#product-price").value=p.price;$("#product-compare").value=p.compare_at_price??"";$("#product-stock").value=p.stock;$("#product-order").value=p.sort_order??"";$("#product-weight").value=p.weight_grams||"";$("#product-description").value=p.description||"";$("#product-published").checked=p.is_published;state.imagePath=p.image_path;
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
  const weightGrams=Number($("#product-weight").value);
  if(!Number.isInteger(weightGrams)||weightGrams<1)throw new Error("Masukkan berat produk dalam gram (minimal 1 gram).");
  if(!category_id){throw new Error("Pilih kategori produk terlebih dahulu.");}
  let imagePath=state.imagePath;
  const file=$("#product-image").files[0];
  if(file){
   const ext=file.name.split(".").pop().toLowerCase(),path=Date.now()+"-"+slugify(name)+"."+ext;
   const {error:uploadError}=await client.storage.from("product-images").upload(path,file,{upsert:false,contentType:file.type});
   if(uploadError)throw uploadError;imagePath=path;
  }
  const record={category_id,name,slug:slugify(name)+(id?"-"+id.slice(0,6):""),sku:$("#product-sku").value.trim()||null,description:$("#product-description").value.trim()||null,price:Number($("#product-price").value),compare_at_price:$("#product-compare").value?Number($("#product-compare").value):null,stock:Number($("#product-stock").value),weight_grams:weightGrams,image_path:imagePath,is_published:$("#product-published").checked,sort_order:Number($("#product-order").value)};
  const result=id?await client.from("products").update(record).eq("id",id):await client.from("products").insert(record);
  if(result.error)throw result.error;
  $("#product-dialog").close();notify("Produk berhasil disimpan.");await loadCatalog();
 }catch(err){$("#form-message").textContent=err?.message||"Belum berhasil disimpan. Periksa data dan koneksi, lalu coba lagi."}
 finally{save.disabled=false;save.textContent="Simpan produk"}
});
boot();

$("#forgot-password").addEventListener("click",async()=>{
 const email=$("#email").value.trim();
 if(!email){$("#login-message").textContent="Masukkan alamat email akun admin terlebih dahulu.";$("#email").focus();return;}
 const button=$("#forgot-password");button.disabled=true;button.textContent="Mengirim tautan…";
 const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:"https://joksealindo.github.io/tepidaun-website/admin/"});
 button.disabled=false;button.textContent="Lupa password?";
 $("#login-message").textContent=error?"Tautan belum terkirim: "+error.message:"Tautan reset password dikirim. Buka email dan klik tautannya tanpa mengubah URL.";
});
