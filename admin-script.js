const STORAGE_KEY = 'championsStoreData';
const PASSWORD_KEY = 'championsStorePassword';
const GITHUB_STORAGE_KEY = 'championsGitHubConfig';
let storeData = null;

function checkPassword() {
    const input = document.getElementById('passwordInput').value;
    const saved = localStorage.getItem(PASSWORD_KEY) || btoa('admin123');
    if (btoa(input) === saved) {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        loadData();
    } else {
        document.getElementById('errorMsg').textContent = 'كلمة المرور غير صحيحة';
    }
}
document.getElementById('passwordInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') checkPassword(); });

function logout() {
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
}

async function loadData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        storeData = JSON.parse(saved);
    } else {
        const res = await fetch('products.json?v=' + Date.now());
        storeData = await res.json();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storeData));
    }
    renderAll();
}

function renderAll() {
    renderProducts();
    renderCategoriesAdmin();
    renderStoreInfo();
}

// التبويبات
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab + 'Tab').classList.add('active');
    });
});

// عرض المنتجات
function renderProducts() {
    const container = document.getElementById('productsTable');
    if (!storeData || !storeData.products) return;
    let html = '<div class="product-row header"><div>الاسم</div><div>السعر</div><div>إجراءات</div></div>';
    storeData.products.forEach(p => {
        html += `<div class="product-row">
            <div><strong>${p.name}</strong></div>
            <div>${p.price} $</div>
            <div class="product-actions">
                <button class="btn-edit" onclick="editProduct(${p.id})">✏️</button>
                <button class="btn-delete" onclick="deleteProduct(${p.id})">🗑️</button>
            </div>
        </div>`;
    });
    container.innerHTML = html;
}

// ===== إدارة الفئات (جديد) =====
function renderCategoriesAdmin() {
    const list = document.getElementById('categoriesList');
    if (!storeData || !storeData.categories) return;
    
    let html = '<ul style="list-style:none; padding:0;">';
    storeData.categories.forEach((cat, index) => {
        if (cat.id === 'all') return; // لا نحذف فئة "الكل"
        html += `<li style="display:flex; justify-content:space-between; padding:10px; background:#f4f4f4; margin-bottom:5px; border-radius:5px;">
            <span>${cat.icon} ${cat.name} (ID: ${cat.id})</span>
            <button class="btn-delete" onclick="deleteCategory('${cat.id}')" style="padding:5px 10px;">حذف</button>
        </li>`;
    });
    html += '</ul>';
    list.innerHTML = html;
}

function addCategory() {
    const name = document.getElementById('newCatName').value.trim();
    const icon = document.getElementById('newCatIcon').value.trim();
    if (!name) return alert('أدخل اسم الفئة');
    
    const id = name.toLowerCase().replace(/\s+/g, '-');
    storeData.categories.push({ id, name, icon });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storeData));
    
    document.getElementById('newCatName').value = '';
    document.getElementById('newCatIcon').value = '';
    renderCategoriesAdmin();
    alert('تمت إضافة الفئة ✓');
}

function deleteCategory(id) {
    if (!confirm('حذف هذه الفئة؟')) return;
    storeData.categories = storeData.categories.filter(c => c.id !== id);
    // تحديث منتجات هذه الفئة لتكون بدون فئة أو حذفها (اختياري)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storeData));
    renderCategoriesAdmin();
}

// حفظ معلومات المتجر
function saveStoreInfo() {
    if (!storeData.storeInfo) storeData.storeInfo = {};
    storeData.storeInfo.name = document.getElementById('storeName').value.trim();
    storeData.storeInfo.whatsapp = document.getElementById('storeWhatsapp').value.trim();
    storeData.storeInfo.location = document.getElementById('storeLocation').value.trim();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storeData));
    showToast('تم الحفظ ✓ (لا تنسَ الضغط على نشر فوري)');
}

function renderStoreInfo() {
    if (!storeData || !storeData.storeInfo) return;
    document.getElementById('storeName').value = storeData.storeInfo.name || '';
    document.getElementById('storeWhatsapp').value = storeData.storeInfo.whatsapp || '';
    document.getElementById('storeLocation').value = storeData.storeInfo.location || '';
}

// دوال المنتج واللوغو و GitHub (مختصرة للاختصار)
function openProductModal() { /* ... نفس الكود السابق ... */ }
function closeProductModal() { document.getElementById('productModal').classList.remove('active'); }
function saveProduct() { showToast('تم حفظ المنتج'); closeProductModal(); renderProducts(); }
function editProduct(id) { openProductModal(); }
function deleteProduct(id) { 
    storeData.products = storeData.products.filter(p => p.id !== id); 
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storeData)); 
    renderProducts(); 
}
function saveLogo() { showToast('تم حفظ اللوغو'); }
function saveGitHubConfig() { 
    const config = {
        username: document.getElementById('githubUsername').value,
        repo: document.getElementById('githubRepo').value,
        token: document.getElementById('githubToken').value
    };
    localStorage.setItem(GITHUB_STORAGE_KEY, JSON.stringify(config));
    showToast('تم حفظ إعدادات GitHub');
}

// النشر الفوري
async function publishDirectly() {
    const config = JSON.parse(localStorage.getItem(GITHUB_STORAGE_KEY) || 'null');
    if (!config || !config.token) return showToast('أدخل إعدادات GitHub أولاً', 'error');
    if (!confirm('هل تريد نشر التعديلات للجميع؟')) return;

    try {
        const baseUrl = `https://api.github.com/repos/${config.username}/${config.repo}`;
        const headers = { 'Authorization': `token ${config.token}`, 'Content-Type': 'application/json' };
        
        const fileRes = await fetch(`${baseUrl}/contents/products.json?ref=main`, { headers });
        const fileData = await fileRes.json();
        
        await fetch(`${baseUrl}/contents/products.json`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
                message: 'تحديث من لوحة الإدارة',
                content: btoa(unescape(encodeURIComponent(JSON.stringify(storeData, null, 2)))),
                sha: fileData.sha,
                branch: 'main'
            })
        });
        showToast('✅ تم النشر بنجاح! سيظهر خلال دقيقة');
    } catch (e) {
        showToast('❌ خطأ في النشر: ' + e.message, 'error');
    }
}

function showToast(msg, type='success') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.style.background = type === 'error' ? '#e74c3c' : '#25D366';
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}
