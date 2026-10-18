// ===== الإعدادات =====
const STORAGE_KEY = 'championsStoreData';
const PASSWORD_KEY = 'championsStorePassword';
const DEFAULT_PASSWORD = btoa('admin123');
const GITHUB_STORAGE_KEY = 'championsGitHubConfig';

let storeData = null;
let editingProductId = null;

// ===== بيانات افتراضية للطوارئ =====
const FALLBACK_DATA = {
    storeInfo: {
        name: 'Champions Store',
        tagline: 'مكملات غذائية أصلية',
        whatsapp: '963900000000',
        instagram: 'champions_store',
        location: 'دمشق'
    },
    categories: [
        { id: 'all', name: 'كل المنتجات', icon: '🏋️' },
        { id: 'creatine', name: 'كرياتين', icon: '💪' },
        { id: 'whey', name: 'واي بروتين', icon: '🥛' },
        { id: 'mass-gainer', name: 'ماس جينر', icon: '⚡' }
    ],
    products: [
        {
            id: 1,
            name: 'منتج تجريبي',
            category: 'whey',
            price: 35,
            oldPrice: null,
            image: 'https://via.placeholder.com/400x400/1a1a1a/d4af37?text=Sample+Product',
            description: 'هذا منتج تجريبي',
            badge: 'جديد'
        }
    ]
};

// ===== التحقق من كلمة المرور =====
function checkPassword() {
    const input = document.getElementById('passwordInput').value;
    const savedPassword = localStorage.getItem(PASSWORD_KEY) || DEFAULT_PASSWORD;
    if (btoa(input) === savedPassword) {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        loadData();
        showToast('تم تسجيل الدخول بنجاح ✓');
    } else {
        document.getElementById('errorMsg').textContent = 'كلمة المرور غير صحيحة';
        document.getElementById('passwordInput').value = '';
    }
}
document.getElementById('passwordInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') checkPassword(); });

function logout() {
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('passwordInput').value = '';
    document.getElementById('errorMsg').textContent = '';
}

// ===== تحميل البيانات مع معالجة أخطاء شاملة =====
async function loadData() {
    console.log('🔄 بدء تحميل البيانات...');
    
    try {
        // 1. محاولة تحميل من localStorage أولاً
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            console.log(' تحميل من localStorage');
            storeData = JSON.parse(saved);
            console.log('✅ تم التحميل من localStorage:', storeData.products.length, 'منتج');
            renderAll();
            return;
        }
        
        // 2. محاولة تحميل من products.json
        console.log('🌐 محاولة تحميل من products.json...');
        const response = await fetch('products.json?v=' + Date.now());
        
        if (!response.ok) {
            throw new Error('HTTP ' + response.status + ' - ' + response.statusText);
        }
        
        const text = await response.text();
        console.log('📄 محتوى الملف:', text.substring(0, 200) + '...');
        
        storeData = JSON.parse(text);
        console.log('✅ تم التحميل من products.json:', storeData.products.length, 'منتج');
        
        // حفظ في localStorage
        saveToLocalStorage();
        renderAll();
        
    } catch (error) {
        console.error('❌ خطأ في تحميل البيانات:', error);
        console.error('التفاصيل:', error.message);
        
        // 3. استخدام البيانات الافتراضية
        console.log('⚠️ استخدام البيانات الافتراضية');
        storeData = FALLBACK_DATA;
        
        showToast('️ فشل تحميل products.json: ' + error.message + '. تم استخدام بيانات افتراضية.', 'error');
        renderAll();
    }
}

function saveToLocalStorage() {
    if (storeData) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storeData));
        console.log('💾 تم الحفظ في localStorage');
    }
}

function renderAll() {
    if (!storeData) {
        console.error('❌ storeData غير محمّل');
        return;
    }
    renderProducts();
    renderStoreInfo();
    renderCategories();
}

// ===== التبويبات =====
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const tabElement = document.getElementById(btn.dataset.tab + 'Tab');
        if (tabElement) tabElement.classList.add('active');
    });
});

function renderProducts() {
    const container = document.getElementById('productsTable');
    if (!container) {
        console.error('❌ productsTable غير موجود');
        return;
    }
    if (!storeData || !storeData.products) {
        console.error('❌ لا توجد منتجات');
        container.innerHTML = '<p style="text-align:center;padding:20px;">لا توجد منتجات</p>';
        return;
    }
    
    const categories = storeData.categories.filter(c => c.id !== 'all');
    let html = '<div class="product-row header"><div>صورة</div><div>الاسم</div><div>السعر</div><div>الفئة</div><div>إجراءات</div></div>';
    
    storeData.products.forEach(product => {
        const cat = categories.find(c => c.id === product.category);
        html += '<div class="product-row">' +
            '<img src="' + product.image + '" alt="' + product.name + '" onerror="this.src=\'https://via.placeholder.com/60x60/1a1a1a/d4af37?text=No+Image\'">' +
            '<div><strong>' + product.name + '</strong>' + (product.badge ? '<br><small style="color:var(--gold-dark)">' + product.badge + '</small>' : '') + '</div>' +
            '<div>' + product.price + ' $</div>' +
            '<div>' + (cat ? cat.name : product.category) + '</div>' +
            '<div class="product-actions">' +
            '<button class="btn-edit" onclick="editProduct(' + product.id + ')">✏️</button>' +
            '<button class="btn-delete" onclick="deleteProduct(' + product.id + ')">🗑️</button>' +
            '</div></div>';
    });
    
    container.innerHTML = html;
    console.log('✅ تم عرض', storeData.products.length, 'منتج');
}

function renderStoreInfo() {
    if (!storeData || !storeData.storeInfo) return;
    const fields = ['storeName', 'storeTagline', 'storeWhatsapp', 'storeInstagram', 'storeLocation'];
    const keys = ['name', 'tagline', 'whatsapp', 'instagram', 'location'];
    fields.forEach((field, index) => {
        const el = document.getElementById(field);
        if (el) el.value = storeData.storeInfo[keys[index]] || '';
    });
}

function renderCategories() {
    const select = document.getElementById('productCategory');
    if (!select || !storeData || !storeData.categories) return;
    const categories = storeData.categories.filter(c => c.id !== 'all');
    select.innerHTML = categories.map(c => '<option value="' + c.id + '">' + c.icon + ' ' + c.name + '</option>').join('');
}

function openProductModal() {
    if (!storeData) { showToast('البيانات غير محمّلة', 'error'); return; }
    editingProductId = null;
    document.getElementById('modalTitle').textContent = 'إضافة منتج جديد';
    document.getElementById('productId').value = '';
    document.getElementById('productName').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productOldPrice').value = '';
    document.getElementById('productDescription').value = '';
    document.getElementById('productBadge').value = '';
    document.getElementById('productImageUrl').value = '';
    document.getElementById('productImageUpload').value = '';
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('imagePreview').src = '';
    renderCategories();
    document.getElementById('productModal').classList.add('active');
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
    editingProductId = null;
}

function editProduct(id) {
    if (!storeData || !storeData.products) { showToast('البيانات غير محمّلة', 'error'); return; }
    const product = storeData.products.find(p => p.id === id);
    if (!product) { showToast('المنتج غير موجود', 'error'); return; }
    editingProductId = id;
    document.getElementById('modalTitle').textContent = 'تعديل منتج';
    document.getElementById('productId').value = product.id;
    document.getElementById('productName').value = product.name;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productOldPrice').value = product.oldPrice || '';
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('productBadge').value = product.badge || '';
    document.getElementById('productImageUrl').value = product.image.startsWith('data:') ? '' : product.image;
    renderCategories();
    document.getElementById('productCategory').value = product.category;
    if (product.image.startsWith('data:')) {
        const preview = document.getElementById('imagePreview');
        preview.src = product.image;
        preview.style.display = 'block';
    }
    document.getElementById('productModal').classList.add('active');
}

function deleteProduct(id) {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    storeData.products = storeData.products.filter(p => p.id !== id);
    saveToLocalStorage();
    renderProducts();
    showToast('تم حذف المنتج ✓');
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const preview = document.getElementById('imagePreview');
        preview.src = e.target.result;
        preview.style.display = 'block';
        document.getElementById('productImageUrl').value = '';
    };
    reader.readAsDataURL(file);
}

function saveProduct() {
    const name = document.getElementById('productName').value.trim();
    const category = document.getElementById('productCategory').value;
    const price = parseFloat(document.getElementById('productPrice').value);
    const oldPrice = parseFloat(document.getElementById('productOldPrice').value) || null;
    const description = document.getElementById('productDescription').value.trim();
    const badge = document.getElementById('productBadge').value || null;
    const imageUrl = document.getElementById('productImageUrl').value.trim();
    const imagePreview = document.getElementById('imagePreview');

    if (!name || !category || isNaN(price)) {
        showToast('يرجى ملء الحقول المطلوبة (الاسم، الفئة، السعر)', 'error');
        return;
    }

    let image = imageUrl;
    if (imagePreview.style.display !== 'none' && imagePreview.src && imagePreview.src !== window.location.href) {
        image = imagePreview.src;
    }
    if (!image) image = 'https://via.placeholder.com/400x400/1a1a1a/d4af37?text=No+Image';

    if (editingProductId) {
        const product = storeData.products.find(p => p.id === editingProductId);
        if (product) {
            product.name = name; product.category = category; product.price = price;
            product.oldPrice = oldPrice; product.description = description;
            product.badge = badge; product.image = image;
        }
    } else {
        const newId = storeData.products.length > 0 ? Math.max(...storeData.products.map(p => p.id)) + 1 : 1;
        storeData.products.push({ id: newId, name, category, price, oldPrice, description, badge, image });
    }
    saveToLocalStorage();
    renderProducts();
    closeProductModal();
    showToast(editingProductId ? 'تم تحديث المنتج ✓' : 'تمت إضافة المنتج ✓');
}

function saveStoreInfo() {
    if (!storeData.storeInfo) storeData.storeInfo = {};
    storeData.storeInfo.name = document.getElementById('storeName').value.trim();
    storeData.storeInfo.tagline = document.getElementById('storeTagline').value.trim();
    storeData.storeInfo.whatsapp = document.getElementById('storeWhatsapp').value.trim();
    storeData.storeInfo.instagram = document.getElementById('storeInstagram').value.trim();
    storeData.storeInfo.location = document.getElementById('storeLocation').value.trim();
    saveToLocalStorage();
    showToast('تم حفظ معلومات المتجر ✓');
}

function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('logoPreview').src = e.target.result;
        document.getElementById('logoUrl').value = '';
    };
    reader.readAsDataURL(file);
}

function saveLogo() {
    if (!storeData.storeInfo) storeData.storeInfo = {};
    const url = document.getElementById('logoUrl').value.trim();
    const preview = document.getElementById('logoPreview');

    if (url) {
        preview.src = url;
        storeData.storeInfo.logo = url;
    } else if (preview.src && preview.src.startsWith('data:') && preview.src !== window.location.href) {
        storeData.storeInfo.logo = preview.src;
    } else {
        showToast('يرجى رفع صورة أو إدخال رابط', 'error');
        return;
    }

    saveToLocalStorage();
    showToast('تم حفظ اللوغو ✓');
}

function changePassword() {
    const current = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;
    const savedPassword = localStorage.getItem(PASSWORD_KEY) || DEFAULT_PASSWORD;

    if (btoa(current) !== savedPassword) { showToast('كلمة المرور الحالية غير صحيحة', 'error'); return; }
    if (newPass.length < 6) { showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error'); return; }
    if (newPass !== confirm) { showToast('كلمتا المرور غير متطابقتين', 'error'); return; }

    localStorage.setItem(PASSWORD_KEY, btoa(newPass));
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    showToast('تم تغيير كلمة المرور بنجاح ✓');
}

function exportData() {
    if (!storeData) { showToast('لا توجد بيانات للتصدير', 'error'); return; }
    const dataStr = JSON.stringify(storeData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'products.json'; a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير البيانات ✓');
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            if (imported.products && imported.storeInfo && imported.categories) {
                storeData = imported;
                saveToLocalStorage();
                renderAll();
                showToast('تم استيراد البيانات بنجاح ✓');
            } else {
                showToast('ملف JSON غير صالح', 'error');
            }
        } catch (error) {
            showToast('خطأ في قراءة الملف: ' + error.message, 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.style.background = type === 'error' ? 'var(--danger)' : 'var(--success)';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

document.getElementById('productModal').addEventListener('click', (e) => {
    if (e.target.id === 'productModal') closeProductModal();
});

// ===== GitHub Config =====
function loadGitHubConfig() {
    const saved = localStorage.getItem(GITHUB_STORAGE_KEY);
    if (saved) {
        try {
            const config = JSON.parse(saved);
            const u = document.getElementById('githubUsername'); if (u) u.value = config.username || '';
            const r = document.getElementById('githubRepo'); if (r) r.value = config.repo || '';
            const t = document.getElementById('githubToken'); if (t) t.value = config.token || '';
        } catch (e) {}
    }
}

function saveGitHubConfig() {
    const config = {
        username: document.getElementById('githubUsername').value.trim(),
        repo: document.getElementById('githubRepo').value.trim(),
        token: document.getElementById('githubToken').value.trim()
    };
    
    if (!config.username || !config.repo || !config.token) {
        showToast('يرجى ملء جميع الحقول', 'error');
        return;
    }
    
    localStorage.setItem(GITHUB_STORAGE_KEY, JSON.stringify(config));
    showToast('تم حفظ إعدادات GitHub ✓');
}

// ===== النشر الفوري =====
async function publishDirectly() {
    const config = JSON.parse(localStorage.getItem(GITHUB_STORAGE_KEY) || 'null');
    
    if (!config || !config.username || !config.repo || !config.token) {
        showToast('يرجى إعداد GitHub أولاً من تبويب GitHub Sync', 'error');
        return;
    }
    
    if (!confirm('⚠️ سيتم نشر التعديلات مباشرة على الموقع. هل أنت متأكد؟')) {
        return;
    }
    
    const publishBtn = document.querySelector('.btn-publish');
    const originalText = publishBtn.textContent;
    publishBtn.disabled = true;
    publishBtn.textContent = '⏳ جاري النشر...';
    
    try {
        const baseUrl = 'https://api.github.com/repos/' + config.username + '/' + config.repo;
        const headers = {
            'Authorization': 'token ' + config.token,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };
        
        const repoResponse = await fetch(baseUrl, { headers });
        if (!repoResponse.ok) throw new Error('فشل في الوصول إلى المستودع');
        const repoData = await repoResponse.json();
        const defaultBranch = repoData.default_branch || 'main';
        
        const fileResponse = await fetch(baseUrl + '/contents/products.json?ref=' + defaultBranch, { headers });
        if (!fileResponse.ok) throw new Error('فشل في قراءة products.json');
        const fileData = await fileResponse.json();
        
        const newContent = JSON.stringify(storeData, null, 2);
        const encodedContent = btoa(unescape(encodeURIComponent(newContent)));
        
        const updateResponse = await fetch(baseUrl + '/contents/products.json', {
            method: 'PUT',
            headers,
            body: JSON.stringify({
                message: ' نشر فوري من لوحة الإدارة - ' + new Date().toLocaleString('ar-SY'),
                content: encodedContent,
                sha: fileData.sha,
                branch: defaultBranch
            })
        });
        
        if (!updateResponse.ok) {
            const err = await updateResponse.json();
            throw new Error('فشل في التحديث: ' + (err.message || ''));
        }
        
        showToast('✅ تم النشر بنجاح! سيظهر التحديث خلال دقيقة.');
        
    } catch (error) {
        console.error('Publish Error:', error);
        showToast('❌ خطأ: ' + error.message, 'error');
    } finally {
        publishBtn.disabled = false;
        publishBtn.textContent = originalText;
    }
}

document.addEventListener('click', (e) => {
    if (e.target.dataset && e.target.dataset.tab === 'github') {
        setTimeout(loadGitHubConfig, 100);
    }
});