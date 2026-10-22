const STORAGE_KEY = 'championsStoreData';
const PASSWORD_KEY = 'championsStorePassword';
const GITHUB_STORAGE_KEY = 'championsGitHubConfig';
const DEFAULT_PASSWORD = btoa('admin123');

let storeData = null;
let editingProductId = null;

// ✅ placeholder مدمج (لا يحتاج ملف خارجي)
const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjUwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCBmaWxsPSIjMWMxYzFlIiB3aWR0aD0iNDAwIiBoZWlnaHQ9IjUwMCIvPjx0ZXh0IGZpbGw9IiNjOGEyNWQiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgeD0iNTAlIiB5PSI1MCUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';

function sanitizeFileName(name) {
    return name
        .toLowerCase()
        .trim()
        .replace(/[\u0600-\u06FF]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50);
}

// ✅ دالة توليد اسم الصورة - نسخة محسّنة
function generateImageFileName(product) {
    let sanitizedName = sanitizeFileName(product.name);
    
    // إذا كان الاسم فارغاً بعد التنظيف (عربي فقط)، استخدم ID
    if (!sanitizedName || sanitizedName.trim() === '') {
        sanitizedName = `product-${product.id}`;
    }
    
    return `${sanitizedName}-${product.id}.webp`;
}

// ✅ دالة تنظيف اسم الملف - نسخة محسّنة
function sanitizeFileName(name) {
    if (!name) return '';
    
    return name
        .toLowerCase()
        .trim()
        // تحويل الأحرف العربية إلى近似 أصوات (اختياري)
        .replace(/[أإآ]/g, 'a')
        .replace(/[ة]/g, 'h')
        .replace(/[ى]/g, 'a')
        .replace(/[ؤ]/g, 'o')
        .replace(/[ئ]/g, 'e')
        // حذف الأحرف الخاصة
        .replace(/[^a-z0-9\s-]/g, '')
        // المسافات إلى شرطات
        .replace(/\s+/g, '-')
        // شرطات متعددة إلى واحدة
        .replace(/-+/g, '-')
        // حذف الشرطات من الأطراف
        .replace(/^-|-$/g, '')
        // تحديد الطول الأقصى
        .substring(0, 40);
}
function extractFileName(imagePath) {
    if (!imagePath) return null;
    return imagePath.split('/').pop().split('?')[0];
}

function getImageUrl(imagePath) {
    if (!imagePath) return PLACEHOLDER_IMAGE;
    if (imagePath.startsWith('data:')) return imagePath;
    
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        const fileName = imagePath.split('/').pop().split('?')[0];
        return `images/${fileName}`;
    }
    
    if (imagePath.startsWith('./')) return imagePath.substring(2);
    if (imagePath.startsWith('/')) return imagePath.substring(1);
    
    // ✅ استبدال أي إشارة لـ imgs/ بـ images/
    if (imagePath.includes('imgs/')) {
        return imagePath.replace('imgs/', 'images/');
    }
    
    return imagePath;
}

// ✅ نظام fallback بسيط وآمن (بدون imgs/)
function handleImageError(img) {
    if (img.dataset.fallbackTried) { 
        img.src = PLACEHOLDER_IMAGE; 
        return; 
    }
    img.dataset.fallbackTried = '1';
    const currentSrc = img.src;
    
    // جرب 1: .webp -> .png
    if (currentSrc.endsWith('.webp')) { 
        img.src = currentSrc.replace('.webp', '.png'); 
        return; 
    }
    // جرب 2: .webp -> .jpg
    if (currentSrc.endsWith('.webp')) { 
        img.src = currentSrc.replace('.webp', '.jpg'); 
        return; 
    }
    
    // إذا فشل كل شيء، استخدم الـ placeholder المدمج
    img.src = PLACEHOLDER_IMAGE;
}

// Login
function checkPassword() {
    const input = document.getElementById('passwordInput').value;
    const saved = localStorage.getItem(PASSWORD_KEY) || DEFAULT_PASSWORD;
    if (btoa(input) === saved) {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        loadData();
    } else {
        document.getElementById('errorMsg').textContent = 'كلمة المرور غير صحيحة';
    }
}

document.getElementById('passwordInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') checkPassword();
});

function logout() {
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
}

async function loadData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            storeData = JSON.parse(saved);
        } else {
            const res = await fetch('products.json?v=' + Date.now());
            storeData = await res.json();
            saveToLocalStorage();
        }
        renderAll();
    } catch (e) {
        showToast('خطأ في التحميل: ' + e.message, 'error');
    }
}

async function reloadFromServer() {
    if (!confirm('⚠️ إعادة تحميل من GitHub؟')) return;
    try {
        localStorage.removeItem(STORAGE_KEY);
        const res = await fetch('products.json?v=' + Date.now());
        storeData = await res.json();
        saveToLocalStorage();
        renderAll();
        showToast('✅ تم إعادة التحميل');
    } catch (e) {
        showToast('❌ خطأ: ' + e.message, 'error');
    }
}

function saveToLocalStorage() {
    if (storeData) localStorage.setItem(STORAGE_KEY, JSON.stringify(storeData));
}

function renderAll() {
    if (!storeData) return;
    renderProducts();
    renderCategoriesAdmin();
    renderStoreInfo();
    renderFooterInfo();
    renderAboutInfo();
    renderLogoPreview();
    populateAdminCategoryFilter();
}

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab + 'Tab').classList.add('active');
    });
});

function populateAdminCategoryFilter() {
    const select = document.getElementById('adminCategoryFilter');
    if (!select || !storeData || !storeData.categories) return;
    select.innerHTML = '<option value="all">🏷️ جميع الفئات</option>';
    storeData.categories.forEach(cat => {
        if (cat.id !== 'all') {
            select.innerHTML += `<option value="${cat.id}">${cat.icon} ${cat.name}</option>`;
        }
    });
}

function filterAdminProducts() {
    const search = document.getElementById('adminProductSearch').value.toLowerCase();
    const categoryFilter = document.getElementById('adminCategoryFilter').value;
    const sortBy = document.getElementById('adminSortBy').value;
    
    let products = [...storeData.products];
    
    if (search) {
        products = products.filter(p => 
            p.name.toLowerCase().includes(search) ||
            (p.brand && p.brand.toLowerCase().includes(search)) ||
            (p.description && p.description.toLowerCase().includes(search))
        );
    }
    
    if (categoryFilter !== 'all') {
        products = products.filter(p => p.category === categoryFilter);
    }
    
    switch (sortBy) {
        case 'name-asc': products.sort((a, b) => a.name.localeCompare(b.name, 'ar')); break;
        case 'name-desc': products.sort((a, b) => b.name.localeCompare(a.name, 'ar')); break;
        case 'price-asc': products.sort((a, b) => a.price - b.price); break;
        case 'price-desc': products.sort((a, b) => b.price - a.price); break;
        case 'brand': products.sort((a, b) => (a.brand || '').localeCompare(b.brand || '', 'ar')); break;
        case 'category': products.sort((a, b) => (a.category || '').localeCompare(b.category || '', 'ar')); break;
    }
    
    renderProductsList(products);
}

function renderProducts() { renderProductsList(storeData.products); }

function renderProductsList(products) {
    const container = document.getElementById('productsTable');
    if (!container || !storeData) return;
    const categories = storeData.categories.filter(c => c.id !== 'all');
    
    let html = '<div class="product-row header"><div>صورة</div><div>الاسم</div><div>السعر</div><div>الفئة</div><div>إجراءات</div></div>';
    
    products.forEach(p => {
        const cat = categories.find(c => c.id === p.category);
        const displayImage = getImageUrl(p.image);
        
        html += `<div class="product-row" data-product-id="${p.id}">
            <img src="${displayImage}" alt="${p.name}" onerror="handleImageError(this)">
            <div>
                <strong>${p.name}</strong>
                ${p.brand ? `<br><small style="color:var(--text-secondary);">🏢 ${p.brand}</small>` : ''}
                ${p.badge ? `<br><small style="color:var(--gold-dark);">${p.badge}</small>` : ''}
                <br><small style="color:var(--text-tertiary);font-size:0.7rem;">📁 ${extractFileName(p.image) || 'لا توجد صورة'}</small>
            </div>
            <div>${p.price} $</div>
            <div>${cat ? cat.name : p.category}</div>
            <div class="product-actions">
                <button class="btn-edit" data-action="edit" data-id="${p.id}">✏️</button>
                <button class="btn-delete" data-action="delete" data-id="${p.id}">🗑️</button>
            </div>
        </div>`;
    });
    
    container.innerHTML = html;
    
    container.querySelectorAll('[data-action="edit"]').forEach(btn => {
        btn.addEventListener('click', (e) => editProduct(parseInt(e.currentTarget.dataset.id)));
    });
    
    container.querySelectorAll('[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', (e) => deleteProduct(parseInt(e.currentTarget.dataset.id)));
    });
}

function openProductModal() {
    editingProductId = null;
    document.getElementById('modalTitle').textContent = '➕ إضافة منتج';
    document.getElementById('productId').value = '';
    document.getElementById('productName').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productOldPrice').value = '';
    document.getElementById('productDescription').value = '';
    document.getElementById('productBadge').value = '';
    document.getElementById('productImageUrl').value = '';
    document.getElementById('productImageUpload').value = '';
    document.getElementById('imagePreview').style.display = 'none';
    document.getElementById('productBrand').value = '';
    document.getElementById('productWeight').value = '';
    document.getElementById('productServings').value = '';
    renderCategorySelect();
    document.getElementById('productModal').classList.add('active');
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
}

function renderCategorySelect() {
    const select = document.getElementById('productCategory');
    const categories = storeData.categories.filter(c => c.id !== 'all');
    select.innerHTML = categories.map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
}

function editProduct(id) {
    const p = storeData.products.find(x => x.id === id);
    if (!p) { showToast('المنتج غير موجود', 'error'); return; }
    
    editingProductId = id;
    document.getElementById('modalTitle').textContent = '✏️ تعديل منتج';
    
    document.getElementById('productName').value = p.name;
    document.getElementById('productPrice').value = p.price;
    document.getElementById('productOldPrice').value = p.oldPrice || '';
    document.getElementById('productDescription').value = p.description || '';
    document.getElementById('productBadge').value = p.badge || '';
    document.getElementById('productBrand').value = p.brand || '';
    document.getElementById('productWeight').value = p.weight || '';
    document.getElementById('productServings').value = p.servings || '';
    
    renderCategorySelect();
    document.getElementById('productCategory').value = p.category;
    
    if (p.image && p.image.startsWith('data:')) {
        document.getElementById('imagePreview').src = p.image;
        document.getElementById('imagePreview').style.display = 'block';
        document.getElementById('productImageUrl').value = '';
    } else {
        document.getElementById('productImageUrl').value = p.image || '';
        document.getElementById('imagePreview').style.display = 'none';
    }
    
    document.getElementById('productModal').classList.add('active');
}

function deleteProduct(id) {
    if (!confirm('حذف هذا المنتج؟')) return;
    storeData.products = storeData.products.filter(p => p.id !== id);
    saveToLocalStorage();
    filterAdminProducts();
    showToast('تم الحذف ✓');
}

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('imagePreview').src = e.target.result;
        document.getElementById('imagePreview').style.display = 'block';
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
    const preview = document.getElementById('imagePreview');
    const brand = document.getElementById('productBrand').value.trim();
    const weight = document.getElementById('productWeight').value.trim();
    const servings = parseInt(document.getElementById('productServings').value) || null;
    
    if (!name || !category || isNaN(price)) {
        showToast('يرجى ملء الحقول المطلوبة (*)', 'error');
        return;
    }
    
    let image = imageUrl;
    if (preview.style.display !== 'none' && preview.src && !preview.src.includes(window.location.href)) {
        image = preview.src;
    }
    if (!image) image = 'images/placeholder.webp';
    
    if (editingProductId) {
        const p = storeData.products.find(x => x.id === editingProductId);
        if (p) {
            p.name = name;
            p.category = category;
            p.price = price;
            p.oldPrice = oldPrice;
            p.description = description;
            p.badge = badge;
            p.image = image;
            p.brand = brand;
            p.weight = weight;
            p.servings = servings;
        }
    } else {
        const newId = storeData.products.length > 0 ? Math.max(...storeData.products.map(p => p.id)) + 1 : 1;
        storeData.products.push({
            id: newId, name, category, price, oldPrice, description, badge, image, brand, weight, servings
        });
    }
    
    saveToLocalStorage();
    filterAdminProducts();
    closeProductModal();
    showToast(editingProductId ? 'تم التحديث ✓' : 'تمت الإضافة ✓');
}

// Categories
function renderCategoriesAdmin() {
    const list = document.getElementById('categoriesList');
    if (!list || !storeData || !storeData.categories) return;
    
    let html = '<ul style="list-style:none;padding:0;">';
    storeData.categories.forEach(cat => {
        if (cat.id === 'all') return;
        html += `<li style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:rgba(200, 162, 93, 0.05);margin-bottom:8px;border-radius:8px;border:1px solid rgba(200, 162, 93, 0.1);">
            <div>
                <strong>${cat.icon} ${cat.name}</strong>
                <small style="color:var(--text-secondary);display:block;">ID: ${cat.id}</small>
                ${cat.description ? `<small style="color:var(--text-secondary);">📝 ${cat.description.substring(0, 50)}${cat.description.length > 50 ? '...' : ''}</small>` : '<small style="color:var(--text-tertiary);">⚠️ لا يوجد وصف</small>'}
            </div>
            <div style="display:flex;gap:6px;">
                <button class="btn-edit" onclick="editCategory('${cat.id}')" style="padding:6px 10px;background:var(--info);color:white;border:none;border-radius:6px;cursor:pointer;">✏️</button>
                <button class="btn-delete" onclick="deleteCategory('${cat.id}')" style="padding:6px 10px;background:var(--danger);color:white;border:none;border-radius:6px;cursor:pointer;">🗑️</button>
            </div>
        </li>`;
    });
    html += '</ul>';
    list.innerHTML = html;
}

function addCategory() {
    const name = document.getElementById('newCatName').value.trim();
    const icon = document.getElementById('newCatIcon').value.trim() || '📦';
    const description = document.getElementById('newCatDescription').value.trim();
    
    if (!name) return showToast('أدخل اسم الفئة', 'error');
    
    const id = name.toLowerCase().replace(/\s+/g, '-');
    if (storeData.categories.find(c => c.id === id)) {
        return showToast('هذه الفئة موجودة', 'error');
    }
    
    storeData.categories.push({ id, name, icon, description });
    saveToLocalStorage();
    document.getElementById('newCatName').value = '';
    document.getElementById('newCatIcon').value = '';
    document.getElementById('newCatDescription').value = '';
    renderCategoriesAdmin();
    populateAdminCategoryFilter();
    showToast('تمت إضافة الفئة ✓');
}

function editCategory(id) {
    const cat = storeData.categories.find(c => c.id === id);
    if (!cat) return;
    
    const newName = prompt('اسم الفئة:', cat.name);
    if (newName === null) return;
    
    const newIcon = prompt('الأيقونة:', cat.icon);
    if (newIcon === null) return;
    
    const newDescription = prompt('الوصف:', cat.description || '');
    if (newDescription === null) return;
    
    cat.name = newName.trim();
    cat.icon = newIcon.trim();
    cat.description = newDescription.trim();
    
    saveToLocalStorage();
    renderCategoriesAdmin();
    populateAdminCategoryFilter();
    showToast('تم تحديث الفئة ✓');
}

function deleteCategory(id) {
    if (!confirm('حذف هذه الفئة؟')) return;
    storeData.categories = storeData.categories.filter(c => c.id !== id);
    saveToLocalStorage();
    renderCategoriesAdmin();
    populateAdminCategoryFilter();
}

// Store Info
function renderStoreInfo() {
    if (!storeData || !storeData.storeInfo) return;
    const info = storeData.storeInfo;
    document.getElementById('storeName').value = info.name || '';
    document.getElementById('storeTagline').value = info.tagline || '';
    document.getElementById('storeWhatsapp').value = info.whatsapp || '';
    document.getElementById('storeInstagram').value = info.instagram || '';
    document.getElementById('storeEmail').value = info.email || '';
    document.getElementById('storeLocation').value = info.location || '';
}

function saveStoreInfo() {
    if (!storeData.storeInfo) storeData.storeInfo = {};
    storeData.storeInfo.name = document.getElementById('storeName').value.trim();
    storeData.storeInfo.tagline = document.getElementById('storeTagline').value.trim();
    storeData.storeInfo.whatsapp = document.getElementById('storeWhatsapp').value.trim();
    storeData.storeInfo.instagram = document.getElementById('storeInstagram').value.trim();
    storeData.storeInfo.email = document.getElementById('storeEmail').value.trim();
    storeData.storeInfo.location = document.getElementById('storeLocation').value.trim();
    saveToLocalStorage();
    showToast('تم الحفظ ✓');
}

function renderFooterInfo() {
    if (!storeData || !storeData.storeInfo) return;
    const info = storeData.storeInfo;
    document.getElementById('footerDescription').value = info.footerDescription || '';
    document.getElementById('footerCopyright').value = info.copyright || '';
    document.getElementById('footerWhatsapp').value = info.whatsapp || '';
    document.getElementById('footerInstagram').value = info.instagram || '';
    document.getElementById('footerLocation').value = info.location || '';
    document.getElementById('footerEmail').value = info.email || '';
}

function saveFooterInfo() {
    if (!storeData.storeInfo) storeData.storeInfo = {};
    storeData.storeInfo.footerDescription = document.getElementById('footerDescription').value.trim();
    storeData.storeInfo.copyright = document.getElementById('footerCopyright').value.trim();
    storeData.storeInfo.whatsapp = document.getElementById('footerWhatsapp').value.trim();
    storeData.storeInfo.instagram = document.getElementById('footerInstagram').value.trim();
    storeData.storeInfo.location = document.getElementById('footerLocation').value.trim();
    storeData.storeInfo.email = document.getElementById('footerEmail').value.trim();
    saveToLocalStorage();
    showToast('تم حفظ إعدادات الفوتر ✓');
}

function renderAboutInfo() {
    if (!storeData) return;
    if (!storeData.about) {
        storeData.about = {
            title: 'Champions Store Supplements',
            description: 'متجر متخصص بجميع المكملات الغذائية للرياضيين.',
            features: '🏆 منتجات أوريجنال مكفولة\n📍 مقرنا في دمشق\n🚚 شحن لجميع المحافظات\n💬 دعم عبر واتساب'
        };
    }
    document.getElementById('aboutTitle').value = storeData.about.title || '';
    document.getElementById('aboutDescription').value = storeData.about.description || '';
    document.getElementById('aboutFeatures').value = storeData.about.features || '';
}

function saveAboutInfo() {
    if (!storeData.about) storeData.about = {};
    storeData.about.title = document.getElementById('aboutTitle').value.trim();
    storeData.about.description = document.getElementById('aboutDescription').value.trim();
    storeData.about.features = document.getElementById('aboutFeatures').value.trim();
    saveToLocalStorage();
    showToast('تم الحفظ ✓');
}

function renderLogoPreview() {
    const preview = document.getElementById('logoPreview');
    if (storeData && storeData.storeInfo && storeData.storeInfo.logo) {
        preview.src = storeData.storeInfo.logo;
    } else {
        preview.src = 'logo.png';
    }
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
        storeData.storeInfo.logo = url;
    } else if (preview.src && preview.src.startsWith('data:')) {
        storeData.storeInfo.logo = preview.src;
    } else {
        return showToast('يرجى رفع صورة أو إدخال رابط', 'error');
    }
    saveToLocalStorage();
    showToast('تم حفظ اللوغو ✓');
}

function changePassword() {
    const current = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;
    const saved = localStorage.getItem(PASSWORD_KEY) || DEFAULT_PASSWORD;
    
    if (btoa(current) !== saved) return showToast('كلمة المرور الحالية غير صحيحة', 'error');
    if (newPass.length < 6) return showToast('6 أحرف على الأقل', 'error');
    if (newPass !== confirm) return showToast('غير متطابقتين', 'error');
    
    localStorage.setItem(PASSWORD_KEY, btoa(newPass));
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    showToast('تم تغيير كلمة المرور ✓');
}

function exportData() {
    if (!storeData) return showToast('لا توجد بيانات', 'error');
    const dataStr = JSON.stringify(storeData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم التصدير ✓');
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
                showToast('تم الاستيراد ✓');
            } else {
                showToast('ملف JSON غير صالح', 'error');
            }
        } catch (err) {
            showToast('خطأ: ' + err.message, 'error');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}

// ✅ إعادة تهيئة IDs بأمان (بدون محاولة إعادة تسمية الملفات على GitHub)
async function reorganizeIds() {
    if (!storeData || !storeData.products) return showToast('لا توجد منتجات', 'error');
    if (!confirm('⚠️ سيتم إعادة ترقيم المنتجات من 1.\nملاحظة: بعد ذلك، اضغط على "تصحيح روابط الصور" لمطابقة الصور الجديدة.')) return;
    
    storeData.products.forEach((product, index) => {
        product.id = index + 1;
    });
    
    saveToLocalStorage();
    filterAdminProducts();
    showToast(`✅ تم إعادة ترقيم ${storeData.products.length} منتج`);
    
    // تشغيل تصحيح الروابط تلقائياً بعد ثانية
    setTimeout(() => {
        fixAllImageUrls();
    }, 1000);
}

// GitHub
function saveGitHubConfig() {
    const config = {
        username: document.getElementById('githubUsername').value.trim(),
        repo: document.getElementById('githubRepo').value.trim(),
        token: document.getElementById('githubToken').value.trim()
    };
    if (!config.username || !config.repo || !config.token) {
        return showToast('يرجى ملء جميع الحقول', 'error');
    }
    localStorage.setItem(GITHUB_STORAGE_KEY, JSON.stringify(config));
    showToast('تم حفظ الإعدادات ✓');
}

function loadGitHubConfig() {
    const saved = localStorage.getItem(GITHUB_STORAGE_KEY);
    if (saved) {
        try {
            const config = JSON.parse(saved);
            document.getElementById('githubUsername').value = config.username || '';
            document.getElementById('githubRepo').value = config.repo || '';
            document.getElementById('githubToken').value = config.token || '';
        } catch (e) {}
    }
}

async function publishDirectly() {
    const config = JSON.parse(localStorage.getItem(GITHUB_STORAGE_KEY) || 'null');
    if (!config || !config.token) return showToast('أدخل إعدادات GitHub أولاً', 'error');
    if (!confirm('⚠️ نشر التعديلات؟')) return;
    
    const publishBtn = document.querySelector('.btn-publish');
    const originalText = publishBtn.textContent;
    publishBtn.disabled = true;
    publishBtn.textContent = '⏳...';
    
    try {
        const baseUrl = `https://api.github.com/repos/${config.username}/${config.repo}`;
        const headers = {
            'Authorization': `token ${config.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };
        
        const repoRes = await fetch(baseUrl, { headers });
        if (!repoRes.ok) throw new Error('فشل الوصول');
        const repoData = await repoRes.json();
        const defaultBranch = repoData.default_branch || 'main';
        
        const fileRes = await fetch(`${baseUrl}/contents/products.json?ref=${defaultBranch}`, { headers });
        if (!fileRes.ok) throw new Error('فشل القراءة');
        const fileData = await fileRes.json();
        
        const newContent = JSON.stringify(storeData, null, 2);
        const encodedContent = btoa(unescape(encodeURIComponent(newContent)));
        
        const updateRes = await fetch(`${baseUrl}/contents/products.json`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
                message: '🤖 تحديث - ' + new Date().toLocaleString('ar-SY'),
                content: encodedContent,
                sha: fileData.sha,
                branch: defaultBranch
            })
        });
        
        if (!updateRes.ok) throw new Error('فشل التحديث');
        showToast('✅ تم النشر!');
    } catch (e) {
        showToast('❌ خطأ: ' + e.message, 'error');
    } finally {
        publishBtn.disabled = false;
        publishBtn.textContent = originalText;
    }
}

// ✅ إصلاح شامل وآمن للروابط (بدون إعادة تسمية على GitHub)
// ✅ أداة معالجة أسماء الصور القديمة - نسخة محسّنة
async function fixAllImageUrls() {
    if (!storeData || !storeData.products) {
        showToast('لا توجد منتجات', 'error');
        return;
    }
    
    const config = JSON.parse(localStorage.getItem(GITHUB_STORAGE_KEY) || 'null');
    if (!config || !config.token) {
        showToast('أعد إعداد GitHub أولاً', 'error');
        return;
    }
    
    if (!confirm('⚠️ سيتم:\n1. فحص جميع الصور على GitHub\n2. إعادة تسمية الصور القديمة لتطابق النظام الجديد\n3. تحديث الروابط في products.json\n\nهل أنت متأكد؟')) {
        return;
    }
    
    // ✅ إنشاء نافذة التقدم
    const progressBox = document.createElement('div');
    progressBox.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: rgba(18, 18, 26, 0.98); backdrop-filter: blur(20px);
        padding: 30px; border-radius: 16px; border: 2px solid var(--gold);
        box-shadow: 0 20px 60px rgba(0,0,0,0.5); z-index: 9999;
        min-width: 450px; max-width: 90vw; max-height: 80vh; overflow-y: auto;
        color: var(--text);
    `;
    progressBox.innerHTML = `
        <h3 style="color: var(--gold); margin-bottom: 16px; text-align: center;">🔍 جاري معالجة الصور</h3>
        <div style="background: rgba(255,255,255,0.1); height: 8px; border-radius: 10px; overflow: hidden; margin-bottom: 12px;">
            <div id="fixProgress" style="height: 100%; background: var(--gradient-gold); width: 0%; transition: width 0.3s;"></div>
        </div>
        <p id="fixStatus" style="text-align: center; margin-bottom: 16px;">جاري جلب قائمة الملفات من GitHub...</p>
        <div id="fixLog" style="font-size: 0.85rem; max-height: 300px; overflow-y: auto; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; font-family: monospace;"></div>
    `;
    document.body.appendChild(progressBox);
    
    const progress = document.getElementById('fixProgress');
    const status = document.getElementById('fixStatus');
    const log = document.getElementById('fixLog');
    
    function addLog(msg, type = 'info') {
        const colors = {
            info: 'var(--text-secondary)',
            success: 'var(--success)',
            error: 'var(--danger)',
            warning: 'var(--warning)',
            gold: 'var(--gold)'
        };
        const time = new Date().toLocaleTimeString('en-US', { hour12: false });
        log.innerHTML += `<div style="color: ${colors[type]}; margin-bottom: 4px;">[${time}] ${msg}</div>`;
        log.scrollTop = log.scrollHeight;
    }
    
    const baseUrl = `https://api.github.com/repos/${config.username}/${config.repo}`;
    const headers = {
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json'
    };
    
    try {
        // ✅ المرحلة 1: جلب جميع الملفات من GitHub
        addLog('📡 جاري جلب قائمة الملفات من GitHub...', 'gold');
        status.textContent = 'جاري جلب الملفات...';
        
        const allFiles = new Map(); // filename → { folder, path, sha, name }
        
        // فحص 3 مواقع: images/, imgs/, والجذر
        for (const folder of ['images', 'imgs', '']) {
            try {
                const url = folder ? `${baseUrl}/contents/${folder}` : `${baseUrl}/contents/`;
                const res = await fetch(url, { headers });
                
                if (res.ok) {
                    const data = await res.json();
                    const imageFiles = data.filter(f => 
                        f.type === 'file' && 
                        /\.(webp|png|jpg|jpeg)$/i.test(f.name)
                    );
                    
                    imageFiles.forEach(f => {
                        const actualFolder = folder || '';
                        allFiles.set(f.name, {
                            folder: actualFolder,
                            path: actualFolder ? `${actualFolder}/${f.name}` : f.name,
                            sha: f.sha,
                            name: f.name,
                            size: f.size
                        });
                    });
                    
                    addLog(`✅ ${actualFolder || 'الجذر'}: ${imageFiles.length} صورة`, 'success');
                } else if (res.status === 404) {
                    addLog(`⚠️ مجلد ${folder || 'الجذر'} غير موجود`, 'warning');
                }
            } catch (e) {
                addLog(`❌ خطأ في ${folder || 'الجذر'}: ${e.message}`, 'error');
            }
        }
        
        addLog(`📊 إجمالي الملفات: ${allFiles.size}`, 'gold');
        
        if (allFiles.size === 0) {
            addLog('❌ لا توجد أي صور على GitHub!', 'error');
            status.textContent = '❌ فشل: لا توجد صور';
            return;
        }
        
        // ✅ المرحلة 2: معالجة كل منتج
        status.textContent = 'جاري معالجة الصور...';
        const results = {
            renamed: 0,      // تم إعادة تسميته
            fixed: 0,        // تم تصحيح المسار فقط
            alreadyOk: 0,    // صحيح مسبقاً
            missing: 0,      // الصورة مفقودة
            failed: 0,       // فشل العملية
            base64: 0        // صورة Base64 (تُترك كما هي)
        };
        
        const detailedReport = [];
        const total = storeData.products.length;
        
        for (let i = 0; i < total; i++) {
            const product = storeData.products[i];
            const percent = ((i + 1) / total * 100).toFixed(0);
            progress.style.width = `${percent}%`;
            status.textContent = `معالجة ${i + 1} من ${total}: ${product.name}`;
            
            // تخطي Base64
            if (!product.image || product.image.startsWith('data:')) {
                results.base64++;
                addLog(`⏭️ ${product.name}: صورة Base64 (تُترك)`, 'info');
                continue;
            }
            
            // استخراج اسم الملف الحالي
            const currentFileName = product.image.split('/').pop().split('?')[0];
            const currentFolder = product.image.includes('/') 
                ? product.image.split('/')[0] 
                : '';
            
            // حساب الاسم المتوقع الجديد
            const expectedFileName = generateImageFileName(product);
            const expectedPath = `images/${expectedFileName}`;
            
            addLog(`🔎 ${product.name}:`, 'gold');
            addLog(`   الحالي: ${product.image}`, 'info');
            addLog(`   المتوقع: ${expectedPath}`, 'info');
            
            // ✅ الحالة 1: الاسم مطابق تماماً للتسمية الجديدة
            if (currentFileName === expectedFileName) {
                // تحقق من وجود الملف
                if (allFiles.has(expectedFileName)) {
                    const file = allFiles.get(expectedFileName);
                    const correctPath = `${file.folder}/${expectedFileName}`;
                    
                    if (product.image !== correctPath) {
                        product.image = correctPath;
                        results.fixed++;
                        addLog(`   ✅ تم تصحيح المجلد: ${correctPath}`, 'success');
                        detailedReport.push(`✅ ${product.name}: تصحيح مسار → ${correctPath}`);
                    } else {
                        results.alreadyOk++;
                        addLog(`   ✓ صحيح مسبقاً`, 'success');
                        detailedReport.push(`✓ ${product.name}: صحيح`);
                    }
                } else {
                    results.missing++;
                    addLog(`   ❌ الملف ${expectedFileName} غير موجود على GitHub`, 'error');
                    detailedReport.push(`❌ ${product.name}: الملف مفقود`);
                }
                continue;
            }
            
            // ✅ الحالة 2: الاسم قديم - ابحث عن الملف الفعلي
            let foundFile = null;
            
            // محاولة 1: البحث بالاسم الحالي
            if (allFiles.has(currentFileName)) {
                foundFile = allFiles.get(currentFileName);
                addLog(`   🔍 وُجد بالاسم الحالي: ${currentFileName}`, 'info');
            }
            
            // محاولة 2: البحث بالـ ID فقط
            if (!foundFile) {
                const idPatterns = [
                    `${product.id}.webp`,
                    `${product.id}.png`,
                    `${product.id}.jpg`,
                    `product-${product.id}.webp`,
                    `product-${product.id}.png`
                ];
                
                for (const pattern of idPatterns) {
                    if (allFiles.has(pattern)) {
                        foundFile = allFiles.get(pattern);
                        addLog(`   🔍 وُجد بالنمط: ${pattern}`, 'info');
                        break;
                    }
                }
            }
            
            // محاولة 3: البحث عن ملف يبدأ بـ ID (للـ timestamps)
            if (!foundFile) {
                for (const [filename, file] of allFiles.entries()) {
                    const baseName = filename.replace(/\.(webp|png|jpg|jpeg)$/i, '');
                    if (baseName === `${product.id}` ||
                        baseName === `product-${product.id}` ||
                        baseName.startsWith(`${product.id}-`) ||
                        baseName.startsWith(`product-${product.id}-`)) {
                        foundFile = file;
                        addLog(`   🔍 وُجد بالمطابقة الجزئية: ${filename}`, 'info');
                        break;
                    }
                }
            }
            
            // لم يُعثر على الملف
            if (!foundFile) {
                results.missing++;
                addLog(`   ❌ لم يُعثر على أي ملف للمنتج`, 'error');
                detailedReport.push(`❌ ${product.name}: الصورة مفقودة`);
                continue;
            }
            
            // ✅ الحالة 3: الملف موجود - أعد تسميته
            addLog(`   🔄 جاري إعادة التسمية: ${foundFile.name} → ${expectedFileName}`, 'gold');
            
            try {
                // تأخير لتجنب rate limit
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // التحقق من عدم وجود ملف بنفس الاسم الجديد
                if (allFiles.has(expectedFileName)) {
                    addLog(`   ⚠️ تحذير: يوجد ملف بنفس الاسم الجديد!`, 'warning');
                    // احذف الملف الجديد القديم أولاً
                    try {
                        const existingNew = allFiles.get(expectedFileName);
                        const delRes = await fetch(`${baseUrl}/contents/${existingNew.path}`, {
                            method: 'DELETE',
                            headers,
                            body: JSON.stringify({
                                message: `🗑️ حذف ملف قديم قبل إعادة التسمية`,
                                sha: existingNew.sha,
                                branch: 'main'
                            })
                        });
                        if (delRes.ok) {
                            addLog(`   ✓ تم حذف الملف القديم بنفس الاسم`, 'success');
                        }
                    } catch (e) {
                        addLog(`   ⚠️ فشل حذف الملف القديم: ${e.message}`, 'warning');
                    }
                }
                
                // جلب محتوى الملف القديم
                const fileRes = await fetch(`${baseUrl}/contents/${foundFile.path}`, { headers });
                if (!fileRes.ok) {
                    throw new Error(`فشل جلب المحتوى: ${fileRes.status}`);
                }
                const fileData = await fileRes.json();
                
                // رفع الملف بالاسم الجديد
                const newPath = `${foundFile.folder}/${expectedFileName}`;
                const uploadRes = await fetch(`${baseUrl}/contents/${newPath}`, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify({
                        message: `🔄 إعادة تسمية: ${foundFile.name} → ${expectedFileName}`,
                        content: fileData.content,
                        branch: 'main'
                    })
                });
                
                if (!uploadRes.ok) {
                    const errData = await uploadRes.json();
                    throw new Error(`فشل الرفع: ${errData.message || uploadRes.status}`);
                }
                
                const newFileData = await uploadRes.json();
                addLog(`   ✓ تم رفع الملف الجديد`, 'success');
                
                // التأكد من نجاح الرفع قبل حذف القديم
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // حذف الملف القديم
                const deleteRes = await fetch(`${baseUrl}/contents/${foundFile.path}`, {
                    method: 'DELETE',
                    headers,
                    body: JSON.stringify({
                        message: `🗑️ حذف بعد إعادة التسمية: ${foundFile.name}`,
                        sha: fileData.sha,
                        branch: 'main'
                    })
                });
                
                if (!deleteRes.ok) {
                    addLog(`   ⚠️ تحذير: تم رفع الجديد لكن فشل حذف القديم`, 'warning');
                } else {
                    addLog(`   ✓ تم حذف الملف القديم`, 'success');
                }
                
                // تحديث الرابط في المنتج
                product.image = newPath;
                
                // تحديث الخريطة المحلية
                allFiles.delete(foundFile.name);
                allFiles.set(expectedFileName, {
                    folder: foundFile.folder,
                    path: newPath,
                    sha: newFileData.content.sha,
                    name: expectedFileName
                });
                
                results.renamed++;
                detailedReport.push(`🔄 ${product.name}: ${foundFile.name} → ${expectedFileName}`);
                
            } catch (error) {
                results.failed++;
                addLog(`   ❌ فشل: ${error.message}`, 'error');
                detailedReport.push(`❌ ${product.name}: ${error.message}`);
            }
        }
        
        // ✅ المرحلة 3: حفظ التغييرات
        status.textContent = 'جاري حفظ التغييرات...';
        addLog('', 'info');
        addLog('💾 جاري حفظ التغييرات...', 'gold');
        saveToLocalStorage();
        
        // ✅ المرحلة 4: عرض التقرير النهائي
        const summary = `
📊 ═══════════════════════════════
   تقرير معالجة الصور
═══════════════════════════════ 📊

✅ تم إعادة تسمية: ${results.renamed}
🔧 تم تصحيح المسار: ${results.fixed}
✓ صحيح مسبقاً: ${results.alreadyOk}
⏭️ صور Base64: ${results.base64}
❌ صور مفقودة: ${results.missing}
⚠️ عمليات فاشلة: ${results.failed}

📁 إجمالي الملفات على GitHub: ${allFiles.size}
📦 إجمالي المنتجات: ${total}
═══════════════════════════════
        `.trim();
        
        progressBox.innerHTML = `
            <h3 style="color: var(--gold); margin-bottom: 16px; text-align: center;">✅ اكتملت المعالجة</h3>
            <pre style="background: rgba(0,0,0,0.3); padding: 16px; border-radius: 8px; font-size: 0.9rem; white-space: pre-wrap; color: var(--text); margin-bottom: 16px;">${summary}</pre>
            <details style="margin-bottom: 16px;">
                <summary style="cursor: pointer; color: var(--gold); font-weight: 600;">📋 عرض التفاصيل الكاملة (${detailedReport.length})</summary>
                <div style="max-height: 300px; overflow-y: auto; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; margin-top: 8px; font-size: 0.85rem;">
                    ${detailedReport.map(r => `<div style="margin-bottom: 4px;">${r}</div>`).join('')}
                </div>
            </details>
            <div style="display: flex; gap: 10px;">
                <button onclick="this.parentElement.parentElement.remove()" style="flex: 1; padding: 12px; background: var(--gradient-gold); color: var(--primary); border: none; border-radius: 8px; font-weight: 700; cursor: pointer;">حسناً</button>
                ${results.renamed > 0 || results.fixed > 0 ? 
                    `<button onclick="publishDirectly(); this.parentElement.parentElement.remove()" style="flex: 1; padding: 12px; background: var(--success); color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer;">🚀 نشر الآن</button>` 
                    : ''}
                ${results.missing > 0 ? 
                    `<button onclick="alert('المنتجات المفقودة:\\n${detailedReport.filter(r => r.startsWith('❌')).join('\\n')}')" style="flex: 1; padding: 12px; background: var(--warning); color: var(--primary); border: none; border-radius: 8px; font-weight: 700; cursor: pointer;">⚠️ عرض المفقود</button>` 
                    : ''}
            </div>
        `;
        
        console.log(summary);
        console.log('📋 التقرير التفصيلي:', detailedReport);
        
        showToast(`✅ تم: ${results.renamed} إعادة تسمية، ${results.fixed} تصحيح`);
        
    } catch (error) {
        console.error('❌ خطأ:', error);
        addLog(`❌ خطأ عام: ${error.message}`, 'error');
        status.textContent = '❌ حدث خطأ';
        showToast('❌ خطأ: ' + error.message, 'error');
    }
}
async function testAllImageUrls() {
    if (!storeData || !storeData.products) return showToast('لا توجد منتجات', 'error');
    showToast('🔍 جاري الفحص...');
    
    const results = { ok: 0, failed: 0, base64: 0 };
    const failedList = [];
    const productsToTest = storeData.products.slice(0, 20);
    
    function testImage(url) {
        return new Promise((resolve) => {
            const img = new Image();
            const timeout = setTimeout(() => resolve(false), 5000);
            img.onload = () => { clearTimeout(timeout); resolve(true); };
            img.onerror = () => { clearTimeout(timeout); resolve(false); };
            img.src = url;
        });
    }
    
    for (const product of productsToTest) {
        if (!product.image) continue;
        if (product.image.startsWith('data:')) { results.base64++; continue; }
        
        const ok = await testImage(product.image);
        if (ok) results.ok++;
        else {
            results.failed++;
            failedList.push(`${product.name}: ${product.image}`);
        }
    }
    
    let report = `📊 فحص ${productsToTest.length} منتج:\n\n`;
    report += `✅ ناجحة: ${results.ok}\n`;
    report += `❌ فاشلة: ${results.failed}\n`;
    report += `📦 Base64: ${results.base64}\n`;
    
    if (failedList.length > 0) {
        report += `\n❌ الفاشلة:\n${failedList.join('\n')}`;
    }
    
    console.log(report);
    alert(report);
}

// ✅ تحويل الصور - يستخدم التسمية الجديدة ويرفع إلى images/ فقط
function showConvertModal() {
    const config = JSON.parse(localStorage.getItem(GITHUB_STORAGE_KEY) || 'null');
    if (!config || !config.token) return showToast('أعد إعداد GitHub أولاً', 'error');
    
    const categorySelect = document.getElementById('convertCategory');
    categorySelect.innerHTML = '<option value="all">جميع الفئات</option>';
    storeData.categories.forEach(cat => {
        if (cat.id !== 'all') {
            categorySelect.innerHTML += `<option value="${cat.id}">${cat.icon} ${cat.name}</option>`;
        }
    });
    
    const base64Count = storeData.products.filter(p => p.image && p.image.startsWith('data:image')).length;
    document.getElementById('base64Count').textContent = `صور Base64: ${base64Count}`;
    document.getElementById('externalCount').textContent = `صور خارجية: ${storeData.products.length - base64Count}`;
    
    document.getElementById('convertModal').classList.add('active');
}

function closeConvertModal() {
    document.getElementById('convertModal').classList.remove('active');
}

// ✅ أداة تحويل الصور - نسخة محسّنة بالكامل
async function convertAllImagesToWebP() {
    const category = document.getElementById('convertCategory').value;
    const deleteOld = document.getElementById('deleteOldImages').checked;
    const maxSizeKB = parseInt(document.getElementById('maxImageSize').value) || 150;
    
    let productsToConvert = storeData.products;
    if (category !== 'all') {
        productsToConvert = productsToConvert.filter(p => p.category === category);
    }
    
    const base64Products = productsToConvert.filter(p => p.image && p.image.startsWith('data:image'));
    
    if (base64Products.length === 0) {
        showToast('لا توجد صور Base64 للتحويل', 'error');
        return;
    }
    
    const config = JSON.parse(localStorage.getItem(GITHUB_STORAGE_KEY) || 'null');
    if (!config || !config.token) {
        showToast('أعد إعداد GitHub أولاً', 'error');
        return;
    }
    
    if (!confirm(`⚠️ سيتم تحويل ${base64Products.length} صورة إلى WebP\n\nالتسمية: {اسم-المنتج}-{id}.webp\n\nهل أنت متأكد؟`)) {
        return;
    }
    
    closeConvertModal();
    
    // ✅ إنشاء نافذة التقدم
    const progressBox = document.createElement('div');
    progressBox.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: rgba(18, 18, 26, 0.98); backdrop-filter: blur(20px);
        padding: 30px; border-radius: 16px; border: 2px solid var(--gold);
        box-shadow: 0 20px 60px rgba(0,0,0,0.5); z-index: 9999;
        min-width: 500px; max-width: 90vw; max-height: 85vh; overflow-y: auto;
        color: var(--text);
    `;
    progressBox.innerHTML = `
        <h3 style="color: var(--gold); margin-bottom: 16px; text-align: center;">🖼️ جاري تحويل الصور</h3>
        <div style="background: rgba(255,255,255,0.1); height: 10px; border-radius: 10px; overflow: hidden; margin-bottom: 12px;">
            <div id="convProgress" style="height: 100%; background: var(--gradient-gold); width: 0%; transition: width 0.3s;"></div>
        </div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 0.9rem;">
            <span id="convCount">0 / ${base64Products.length}</span>
            <span id="convSize" style="color: var(--success);">0 MB توفير</span>
        </div>
        <p id="convStatus" style="text-align: center; margin-bottom: 16px; color: var(--text-secondary);">بدء العملية...</p>
        <div id="convLog" style="font-size: 0.8rem; max-height: 300px; overflow-y: auto; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; font-family: monospace;"></div>
    `;
    document.body.appendChild(progressBox);
    
    const progressBar = document.getElementById('convProgress');
    const countEl = document.getElementById('convCount');
    const sizeEl = document.getElementById('convSize');
    const statusEl = document.getElementById('convStatus');
    const logEl = document.getElementById('convLog');
    
    function addLog(msg, type = 'info') {
        const colors = {
            info: 'var(--text-secondary)',
            success: 'var(--success)',
            error: 'var(--danger)',
            warning: 'var(--warning)',
            gold: 'var(--gold)'
        };
        const time = new Date().toLocaleTimeString('en-US', { hour12: false });
        logEl.innerHTML += `<div style="color: ${colors[type]}; margin-bottom: 3px;">[${time}] ${msg}</div>`;
        logEl.scrollTop = logEl.scrollHeight;
    }
    
    // ✅ جلب قائمة الملفات الموجودة على GitHub
    addLog('📡 جاري جلب الملفات الموجودة...', 'gold');
    statusEl.textContent = 'جاري التحقق من الملفات الموجودة...';
    
    const baseUrl = `https://api.github.com/repos/${config.username}/${config.repo}`;
    const headers = {
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
    };
    
    const existingFiles = new Map(); // filename → { path, sha, folder }
    
    try {
        for (const folder of ['images', 'imgs']) {
            try {
                const res = await fetch(`${baseUrl}/contents/${folder}`, { headers });
                if (res.ok) {
                    const data = await res.json();
                    data.filter(f => f.type === 'file').forEach(f => {
                        existingFiles.set(f.name, { path: `${folder}/${f.name}`, sha: f.sha, folder });
                    });
                    addLog(`✅ ${folder}: ${data.filter(f => f.type === 'file').length} ملف`, 'success');
                }
            } catch (e) {}
        }
    } catch (e) {
        addLog(`⚠️ خطأ في جلب الملفات: ${e.message}`, 'warning');
    }
    
    addLog(`📊 إجمالي الملفات الموجودة: ${existingFiles.size}`, 'gold');
    
    // ✅ بدء التحويل
    let totalSizeSaved = 0;
    let convertedCount = 0;
    let failedCount = 0;
    const usedNames = new Set(); // لتجنب التعارض
    const detailedReport = [];
    
    // أضف الأسماء الموجودة مسبقاً
    existingFiles.forEach((_, name) => usedNames.add(name));
    
    for (let i = 0; i < base64Products.length; i++) {
        const product = base64Products[i];
        const progress = ((i + 1) / base64Products.length) * 100;
        
        progressBar.style.width = `${progress}%`;
        countEl.textContent = `${i + 1} / ${base64Products.length}`;
        statusEl.textContent = `تحويل: ${product.name}`;
        
        addLog(``, 'info');
        addLog(`🔄 [${i + 1}/${base64Products.length}] ${product.name} (ID: ${product.id})`, 'gold');
        
        try {
            // ✅ الخطوة 1: تحويل Base64 إلى Blob
            addLog(`   📥 تحويل Base64 إلى Blob...`, 'info');
            const blob = await base64ToBlob(product.image);
            const originalSize = blob.size;
            addLog(`   📊 الحجم الأصلي: ${(originalSize / 1024).toFixed(1)} KB`, 'info');
            
            // ✅ الخطوة 2: ضغط وتحويل إلى WebP
            addLog(`   🗜️ ضغط وتحويل إلى WebP...`, 'info');
            const options = {
                maxSizeMB: maxSizeKB / 1024,
                maxWidthOrHeight: 800,
                useWebWorker: true,
                fileType: 'image/webp'
            };
            
            let compressedFile;
            try {
                compressedFile = await imageCompression(blob, options);
            } catch (compError) {
                addLog(`   ⚠️ فشل الضغط، استخدام الصورة الأصلية...`, 'warning');
                // في حال فشل الضغط، استخدم الصورة الأصلية كـ WebP
                compressedFile = blob;
            }
            
            const compressedSize = compressedFile.size;
            addLog(`   📊 الحجم المضغوط: ${(compressedSize / 1024).toFixed(1)} KB`, 'success');
            
            // ✅ الخطوة 3: توليد اسم فريد
            let fileName = generateImageFileName(product);
            let baseName = fileName.replace(/\.webp$/i, '');
            
            // إذا كان الاسم فارغاً (منتج عربي فقط)، استخدم ID
            if (!baseName || baseName.trim() === '') {
                baseName = `product-${product.id}`;
                fileName = `${baseName}.webp`;
                addLog(`   ⚠️ اسم المنتج فارغ، استخدام: ${fileName}`, 'warning');
            }
            
            // تجنب التعارض: إذا كان الاسم مستخدماً، أضف رقم
            let counter = 1;
            let finalName = fileName;
            while (usedNames.has(finalName)) {
                finalName = `${baseName}-${counter}.webp`;
                counter++;
            }
            fileName = finalName;
            usedNames.add(fileName);
            
            addLog(`   📝 اسم الملف: ${fileName}`, 'info');
            
            // ✅ الخطوة 4: تحويل إلى Base64 للرفع
            addLog(`   📤 جاري التحويل للرفع...`, 'info');
            const reader = new FileReader();
            const webpBase64 = await new Promise((resolve, reject) => {
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = reject;
                reader.readAsDataURL(compressedFile);
            });
            
            // ✅ الخطوة 5: التحقق من وجود ملف بنفس الاسم
            const folder = 'images';
            const filePath = `${folder}/${fileName}`;
            
            if (existingFiles.has(fileName)) {
                addLog(`   ⚠️ يوجد ملف بنفس الاسم، جاري الاستبدال...`, 'warning');
                try {
                    // حذف الملف القديم
                    const existingFile = existingFiles.get(fileName);
                    const delRes = await fetch(`${baseUrl}/contents/${existingFile.path}`, {
                        method: 'DELETE',
                        headers,
                        body: JSON.stringify({
                            message: `🗑️ استبدال ملف قديم: ${fileName}`,
                            sha: existingFile.sha,
                            branch: 'main'
                        })
                    });
                    
                    if (delRes.ok) {
                        addLog(`   ✓ تم حذف الملف القديم`, 'success');
                    }
                } catch (e) {
                    addLog(`   ⚠️ فشل حذف القديم: ${e.message}`, 'warning');
                }
            }
            
            // ✅ الخطوة 6: رفع الصورة الجديدة
            addLog(`   🚀 جاري الرفع إلى GitHub...`, 'info');
            const uploadResponse = await fetch(`${baseUrl}/contents/${filePath}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({
                    message: `🖼️ رفع ${product.name} (${fileName})`,
                    content: webpBase64,
                    branch: 'main'
                })
            });
            
            if (!uploadResponse.ok) {
                const errData = await uploadResponse.json().catch(() => ({}));
                throw new Error(`فشل الرفع: ${errData.message || uploadResponse.status}`);
            }
            
            addLog(`   ✓ تم الرفع بنجاح`, 'success');
            
            // ✅ الخطوة 7: تحديث رابط الصورة في المنتج
            product.image = filePath;
            
            // حساب الحجم الموفّر
            const saved = originalSize - compressedSize;
            if (saved > 0) totalSizeSaved += saved;
            convertedCount++;
            
            sizeEl.textContent = `${(totalSizeSaved / 1024 / 1024).toFixed(2)} MB توفير`;
            
            addLog(`   ✅ تم بنجاح! توفير: ${(saved / 1024).toFixed(1)} KB`, 'success');
            detailedReport.push(`✅ ${product.name}: ${fileName} (${(compressedSize / 1024).toFixed(1)} KB)`);
            
            // تأخير لتجنب rate limit
            await new Promise(resolve => setTimeout(resolve, 1000));
            
        } catch (error) {
            failedCount++;
            addLog(`   ❌ خطأ: ${error.message}`, 'error');
            detailedReport.push(`❌ ${product.name}: ${error.message}`);
        }
    }
    
    // ✅ الخطوة 8: حذف الصور القديمة من JSON إذا تم تفعيل الخيار
    if (deleteOld) {
        addLog(``, 'info');
        addLog(`🗑️ جاري حذف الصور القديمة من JSON...`, 'gold');
        statusEl.textContent = 'حذف الصور القديمة...';
        
        let deletedCount = 0;
        storeData.products.forEach(p => {
            if (p.image && p.image.startsWith('data:image')) {
                p.image = ''; // فارغ بدلاً من placeholder
                deletedCount++;
            }
        });
        
        addLog(`   ✓ تم حذف ${deletedCount} صورة Base64 من JSON`, 'success');
    }
    
    // ✅ الخطوة 9: حفظ التغييرات
    saveToLocalStorage();
    
    // ✅ الخطوة 10: عرض التقرير النهائي
    const summary = `
📊 ═══════════════════════════════
   تقرير تحويل الصور
═══════════════════════════════

✅ تم تحويل: ${convertedCount}
❌ فشل: ${failedCount}
💾 الحجم الموفّر: ${(totalSizeSaved / 1024 / 1024).toFixed(2)} MB
📁 المجلد: images/
📝 التسمية: {اسم-المنتج}-{id}.webp
═══════════════════════════════
    `.trim();
    
    progressBox.innerHTML = `
        <h3 style="color: var(--gold); margin-bottom: 16px; text-align: center;">
            ${failedCount === 0 ? '✅' : '⚠️'} اكتملت العملية
        </h3>
        <pre style="background: rgba(0,0,0,0.3); padding: 16px; border-radius: 8px; font-size: 0.9rem; white-space: pre-wrap; color: var(--text); margin-bottom: 16px;">${summary}</pre>
        
        <details style="margin-bottom: 16px;">
            <summary style="cursor: pointer; color: var(--gold); font-weight: 600;">📋 التفاصيل الكاملة (${detailedReport.length})</summary>
            <div style="max-height: 300px; overflow-y: auto; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; margin-top: 8px; font-size: 0.85rem;">
                ${detailedReport.map(r => `<div style="margin-bottom: 4px;">${r}</div>`).join('')}
            </div>
        </details>
        
        <div style="display: flex; gap: 10px;">
            <button onclick="this.parentElement.parentElement.remove()" style="flex: 1; padding: 12px; background: rgba(255,255,255,0.1); color: var(--text); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; font-weight: 700; cursor: pointer;">إغلاق</button>
            ${convertedCount > 0 ? 
                `<button onclick="publishDirectly(); this.parentElement.parentElement.remove()" style="flex: 1; padding: 12px; background: var(--success); color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer;">🚀 نشر الآن</button>` 
                : ''}
        </div>
    `;
    
    console.log(summary);
    console.log('📋 التفاصيل:', detailedReport);
    
    showToast(`✅ تم تحويل ${convertedCount} صورة | توفير ${(totalSizeSaved / 1024 / 1024).toFixed(2)} MB`);
}

async function base64ToBlob(base64String) {
    const response = await fetch(base64String);
    return await response.blob();
}

function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.style.background = type === 'error' ? 'var(--danger)' : 'var(--success)';
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

document.addEventListener('click', (e) => {
    if (e.target.dataset && e.target.dataset.tab === 'github') {
        setTimeout(loadGitHubConfig, 100);
    }
});

document.getElementById('productModal').addEventListener('click', (e) => {
    if (e.target.id === 'productModal') closeProductModal();
});

document.getElementById('convertModal').addEventListener('click', (e) => {
    if (e.target.id === 'convertModal') closeConvertModal();
});
