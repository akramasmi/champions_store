const STORAGE_KEY = 'championsStoreData';
const PASSWORD_KEY = 'championsStorePassword';
const GITHUB_STORAGE_KEY = 'championsGitHubConfig';
const DEFAULT_PASSWORD = btoa('admin123');

let storeData = null;
let editingProductId = null;

const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjUwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCBmaWxsPSIjMWMxYzFlIiB3aWR0aD0iNDAwIiBoZWlnaHQ9IjUwMCIvPjx0ZXh0IGZpbGw9IiNjOGEyNWQiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgeD0iNTAlIiB5PSI1MCUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';

// ✅ دالة تنظيف اسم الملف من الأحرف الخاصة
function sanitizeFileName(name) {
    return name
        .toLowerCase()
        .trim()
        .replace(/[\u0600-\u06FF]/g, '') // حذف الأحرف العربية
        .replace(/[^a-z0-9\s-]/g, '') // حذف الأحرف الخاصة
        .replace(/\s+/g, '-') // المسافات إلى شرطات
        .replace(/-+/g, '-') // شرطات متعددة إلى واحدة
        .replace(/^-|-$/g, '') // حذف الشرطات من الأطراف
        .substring(0, 50); // تحديد الطول الأقصى
}

// ✅ دالة توليد اسم الصورة من المنتج
function generateImageFileName(product) {
    const sanitizedName = sanitizeFileName(product.name);
    return `${sanitizedName}-${product.id}.webp`;
}

// ✅ دالة استخراج اسم الملف من الرابط
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
    return imagePath;
}

function handleImageError(img) {
    if (img.dataset.fallbackTried) { img.src = PLACEHOLDER_IMAGE; return; }
    img.dataset.fallbackTried = '1';
    const currentSrc = img.src;
    if (currentSrc.includes('/images/')) { img.src = currentSrc.replace('/images/', '/imgs/'); return; }
    if (currentSrc.includes('/imgs/')) { img.src = currentSrc.replace('/imgs/', '/images/'); return; }
    if (currentSrc.includes('images/') && !currentSrc.includes('/images/')) { img.src = currentSrc.replace('images/', 'imgs/'); return; }
    if (currentSrc.endsWith('.webp')) { img.src = currentSrc.replace('.webp', '.png'); return; }
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
            const oldName = p.name;
            const oldId = p.id;
            
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
            
            // ✅ إذا تغير الاسم أو الصورة، حدّث اسم الملف
            if (oldName !== name && !image.startsWith('data:')) {
                p._needsImageRename = true;
                p._oldImageFileName = extractFileName(image);
            }
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
    showToast(editingProductId ? 'تم التحديث ✓ (انشر لتطبيق تغييرات الصورة)' : 'تمت الإضافة ✓');
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

// ✅ إعادة تهيئة IDs + إعادة تسمية الصور تلقائياً
async function reorganizeIds() {
    if (!storeData || !storeData.products) return showToast('لا توجد منتجات', 'error');
    
    const config = JSON.parse(localStorage.getItem(GITHUB_STORAGE_KEY) || 'null');
    if (!config || !config.token) {
        showToast('أعد إعداد GitHub أولاً', 'error');
        return;
    }
    
    if (!confirm('⚠️ سيتم:\n1. إعادة ترقيم المنتجات من 1\n2. إعادة تسمية جميع الصور على GitHub\n\nهل أنت متأكد؟')) return;
    
    showToast('🔄 جاري إعادة التهيئة...');
    
    // حساب التغييرات المطلوبة
    const changes = [];
    storeData.products.forEach((product, index) => {
        const newId = index + 1;
        if (product.id !== newId) {
            const oldFileName = extractFileName(product.image);
            const oldBaseName = oldFileName ? oldFileName.replace(/\.(webp|png|jpg|jpeg)$/i, '') : null;
            
            // احسب الاسم الجديد بناءً على الاسم والـ ID الجديد
            const newFileName = generateImageFileName({...product, id: newId});
            
            changes.push({
                product,
                oldId: product.id,
                newId,
                oldFileName,
                newFileName,
                needsRename: oldFileName && oldFileName !== newFileName && !product.image.startsWith('data:')
            });
        }
    });
    
    // تحديث IDs في JSON
    storeData.products.forEach((product, index) => {
        product.id = index + 1;
    });
    
    saveToLocalStorage();
    filterAdminProducts();
    
    // إعادة تسمية الصور على GitHub
    if (changes.some(c => c.needsRename)) {
        try {
            await renameImagesOnGitHub(changes.filter(c => c.needsRename), config);
            showToast(`✅ تم إعادة تهيئة ${changes.length} منتج وإعادة تسمية الصور`);
        } catch (e) {
            showToast(`⚠️ تم تحديث IDs لكن فشل تحديث بعض الصور: ${e.message}`, 'error');
        }
    } else {
        showToast(`✅ تم إعادة تهيئة ${changes.length} منتج`);
    }
}

// ✅ دالة إعادة تسمية الصور على GitHub
async function renameImagesOnGitHub(changes, config) {
    const baseUrl = `https://api.github.com/repos/${config.username}/${config.repo}`;
    const headers = {
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
    };
    
    let successCount = 0;
    let failCount = 0;
    
    for (const change of changes) {
        try {
            // جرب مجلد images/ ثم imgs/
            let oldFilePath = null;
            let folder = 'images';
            
            for (const f of ['images', 'imgs']) {
                try {
                    const res = await fetch(`${baseUrl}/contents/${f}/${change.oldFileName}`, { headers });
                    if (res.ok) {
                        oldFilePath = `${f}/${change.oldFileName}`;
                        folder = f;
                        break;
                    }
                } catch (e) {}
            }
            
            if (!oldFilePath) {
                console.warn(`⚠️ لم يُعثر على الملف القديم: ${change.oldFileName}`);
                failCount++;
                continue;
            }
            
            // جلب محتوى الملف القديم
            const fileRes = await fetch(`${baseUrl}/contents/${oldFilePath}`, { headers });
            if (!fileRes.ok) throw new Error('فشل جلب الملف');
            const fileData = await fileRes.json();
            
            // رفع الملف بالاسم الجديد
            const newFilePath = `${folder}/${change.newFileName}`;
            const uploadRes = await fetch(`${baseUrl}/contents/${newFilePath}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({
                    message: `🔄 إعادة تسمية: ${change.oldFileName} → ${change.newFileName}`,
                    content: fileData.content,
                    branch: 'main'
                })
            });
            
            if (!uploadRes.ok) throw new Error('فشل رفع الملف الجديد');
            
            // حذف الملف القديم
            const deleteRes = await fetch(`${baseUrl}/contents/${oldFilePath}`, {
                method: 'DELETE',
                headers,
                body: JSON.stringify({
                    message: `🗑️ حذف بعد إعادة التسمية: ${change.oldFileName}`,
                    sha: fileData.sha,
                    branch: 'main'
                })
            });
            
            if (!deleteRes.ok) {
                console.warn(`⚠️ تم رفع الجديد لكن فشل حذف القديم: ${change.oldFileName}`);
            }
            
            // تحديث الرابط في المنتج
            change.product.image = `${folder}/${change.newFileName}`;
            successCount++;
            
            // تأخير لتجنب rate limit
            await new Promise(resolve => setTimeout(resolve, 500));
            
        } catch (error) {
            console.error(`❌ خطأ في ${change.product.name}:`, error);
            failCount++;
        }
    }
    
    saveToLocalStorage();
    console.log(`✅ إعادة التسمية: ${successCount} نجح، ${failCount} فشل`);
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

// ✅ إصلاح شامل للروابط - يستخدم التسمية الجديدة
async function fixAllImageUrls() {
    if (!storeData || !storeData.products) return showToast('لا توجد منتجات', 'error');
    
    const config = JSON.parse(localStorage.getItem(GITHUB_STORAGE_KEY) || 'null');
    if (!config || !config.token) return showToast('أعد إعداد GitHub أولاً', 'error');
    
    showToast('🔍 جاري فحص وإصلاح جميع الصور...');
    
    const baseUrl = `https://api.github.com/repos/${config.username}/${config.repo}`;
    const headers = {
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json'
    };
    
    // جلب قائمة الملفات الفعلية
    let githubFiles = [];
    
    try {
        for (const folder of ['images', 'imgs']) {
            try {
                const res = await fetch(`${baseUrl}/contents/${folder}`, { headers });
                if (res.ok) {
                    const data = await res.json();
                    githubFiles = githubFiles.concat(
                        data.filter(f => f.type === 'file').map(f => ({ ...f, folder }))
                    );
                }
            } catch (e) {}
        }
    } catch (e) {
        console.error('خطأ في جلب الملفات:', e);
    }
    
    console.log(`📁 تم العثور على ${githubFiles.length} ملف صورة`);
    
    let fixedCount = 0;
    let renamedCount = 0;
    let failedCount = 0;
    const report = [];
    
    for (const product of storeData.products) {
        if (!product.image || product.image.startsWith('data:')) continue;
        
        const currentFileName = extractFileName(product.image);
        const expectedFileName = generateImageFileName(product);
        
        // ✅ إذا كان الاسم مطابقاً للتسمية الجديدة - تحقق فقط من المجلد
        if (currentFileName === expectedFileName) {
            const found = githubFiles.find(f => f.name === expectedFileName);
            if (found) {
                const correctPath = `${found.folder}/${expectedFileName}`;
                if (product.image !== correctPath) {
                    product.image = correctPath;
                    fixedCount++;
                    report.push(`✅ ${product.name}: تم تصحيح المجلد → ${correctPath}`);
                }
            } else {
                failedCount++;
                report.push(`❌ ${product.name}: الملف ${expectedFileName} غير موجود`);
            }
            continue;
        }
        
        // ✅ الاسم قديم - ابحث عن الملف الصحيح
        const currentBaseName = currentFileName.replace(/\.(webp|png|jpg|jpeg)$/i, '');
        
        // جرب 1: الملف بنفس الاسم القديم
        let found = githubFiles.find(f => f.name === currentFileName);
        
        // جرب 2: البحث بالـ ID
        if (!found) {
            found = githubFiles.find(f => 
                f.name === `${product.id}.webp` ||
                f.name === `product-${product.id}.webp` ||
                f.name.startsWith(`product-${product.id}-`) ||
                f.name.startsWith(`${product.id}-`)
            );
        }
        
        if (found) {
            // ✅ تم العثور على الملف - أعد تسميته للتوافق مع النظام الجديد
            const oldPath = `${found.folder}/${found.name}`;
            const newPath = `${found.folder}/${expectedFileName}`;
            
            try {
                await renameImageOnGitHub(found, expectedFileName, config);
                product.image = newPath;
                renamedCount++;
                report.push(`🔄 ${product.name}: ${found.name} → ${expectedFileName}`);
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (e) {
                // في حال فشل إعادة التسمية، استخدم المسار الحالي
                product.image = oldPath;
                fixedCount++;
                report.push(`⚠️ ${product.name}: تم استخدام المسار الحالي ${oldPath}`);
            }
        } else {
            failedCount++;
            report.push(`❌ ${product.name}: لم يُعثر على أي ملف (الاسم الحالي: ${currentFileName})`);
        }
    }
    
    saveToLocalStorage();
    renderProducts();
    
    const reportText = `📊 تقرير الإصلاح:\n\n` +
        `✅ تم تصحيح: ${fixedCount}\n` +
        `🔄 تم إعادة تسمية: ${renamedCount}\n` +
        `❌ فشل: ${failedCount}\n` +
        `📁 ملفات GitHub: ${githubFiles.length}\n\n` +
        `📝 التفاصيل:\n${report.slice(0, 30).join('\n')}${report.length > 30 ? '\n...' : ''}`;
    
    console.log(reportText);
    console.log('📋 التقرير الكامل:', report);
    
    alert(reportText + '\n\n💡 راجع Console (F12) للتقرير الكامل\n\n⚠️ اضغط "نشر فوري" لحفظ التغييرات');
    showToast(`✅ تم: ${fixedCount} تصحيح، ${renamedCount} إعادة تسمية`);
}

// ✅ دالة مساعدة لإعادة تسمية صورة واحدة على GitHub
async function renameImageOnGitHub(file, newFileName, config) {
    const baseUrl = `https://api.github.com/repos/${config.username}/${config.repo}`;
    const headers = {
        'Authorization': `token ${config.token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
    };
    
    const oldPath = `${file.folder}/${file.name}`;
    const newPath = `${file.folder}/${newFileName}`;
    
    // جلب المحتوى
    const fileRes = await fetch(`${baseUrl}/contents/${oldPath}`, { headers });
    if (!fileRes.ok) throw new Error('فشل جلب الملف');
    const fileData = await fileRes.json();
    
    // رفع بالاسم الجديد
    const uploadRes = await fetch(`${baseUrl}/contents/${newPath}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
            message: `🔄 إعادة تسمية: ${file.name} → ${newFileName}`,
            content: fileData.content,
            branch: 'main'
        })
    });
    
    if (!uploadRes.ok) throw new Error('فشل رفع الملف الجديد');
    
    // حذف القديم
    await fetch(`${baseUrl}/contents/${oldPath}`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({
            message: `🗑️ حذف بعد إعادة التسمية: ${file.name}`,
            sha: fileData.sha,
            branch: 'main'
        })
    });
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

// ✅ تحويل الصور - يستخدم التسمية الجديدة
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

async function convertAllImagesToWebP() {
    const category = document.getElementById('convertCategory').value;
    const deleteOld = document.getElementById('deleteOldImages').checked;
    const maxSizeKB = parseInt(document.getElementById('maxImageSize').value) || 150;
    
    let productsToConvert = storeData.products;
    if (category !== 'all') {
        productsToConvert = productsToConvert.filter(p => p.category === category);
    }
    
    const base64Products = productsToConvert.filter(p => p.image && p.image.startsWith('data:image'));
    if (base64Products.length === 0) return showToast('لا توجد صور Base64', 'error');
    if (!confirm(`تحويل ${base64Products.length} صورة؟\n\nسيتم تسميتها: {اسم-المنتج}-{id}.webp`)) return;
    
    closeConvertModal();
    
    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress-container active';
    progressContainer.innerHTML = `
        <div class="progress-title">🖼️ جاري التحويل</div>
        <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
        <div class="progress-text" id="progressText">بدء...</div>
        <div class="progress-stats">
            <span id="progressCount">0 / ${base64Products.length}</span>
            <span id="progressSize">0 MB</span>
        </div>
    `;
    document.body.appendChild(progressContainer);
    
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const progressCount = document.getElementById('progressCount');
    const progressSize = document.getElementById('progressSize');
    
    let totalSizeSaved = 0;
    let convertedCount = 0;
    
    try {
        const config = JSON.parse(localStorage.getItem(GITHUB_STORAGE_KEY));
        const baseUrl = `https://api.github.com/repos/${config.username}/${config.repo}`;
        const headers = {
            'Authorization': `token ${config.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };
        
        for (let i = 0; i < base64Products.length; i++) {
            const product = base64Products[i];
            const progress = ((i + 1) / base64Products.length) * 100;
            
            progressFill.style.width = `${progress}%`;
            progressText.textContent = `تحويل: ${product.name}`;
            progressCount.textContent = `${i + 1} / ${base64Products.length}`;
            
            try {
                const blob = await base64ToBlob(product.image);
                const originalSize = blob.size;
                
                const compressedFile = await imageCompression(blob, {
                    maxSizeMB: maxSizeKB / 1024,
                    maxWidthOrHeight: 800,
                    useWebWorker: true,
                    fileType: 'image/webp'
                });
                
                // ✅ التسمية الجديدة: {اسم-المنتج}-{id}.webp
                const fileName = generateImageFileName(product);
                
                const reader = new FileReader();
                const webpBase64 = await new Promise((resolve, reject) => {
                    reader.onload = () => resolve(reader.result.split(',')[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(compressedFile);
                });
                
                const uploadResponse = await fetch(`${baseUrl}/contents/images/${fileName}`, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify({
                        message: `🖼️ رفع ${product.name} (${fileName})`,
                        content: webpBase64,
                        branch: 'main'
                    })
                });
                
                if (!uploadResponse.ok) throw new Error('فشل الرفع');
                
                // ✅ حفظ الرابط بالصيغة الجديدة
                product.image = `images/${fileName}`;
                
                totalSizeSaved += (originalSize - compressedFile.size);
                convertedCount++;
                
                progressSize.textContent = `${(totalSizeSaved / 1024 / 1024).toFixed(2)} MB`;
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                console.error(`خطأ: ${product.name}`, error);
                progressText.textContent = `خطأ: ${product.name}`;
            }
        }
        
        if (deleteOld) {
            storeData.products.forEach(p => {
                if (p.image && p.image.startsWith('data:image')) {
                    p.image = PLACEHOLDER_IMAGE;
                }
            });
        }
        
        saveToLocalStorage();
        await publishDirectly();
        
        progressContainer.innerHTML = `
            <div class="progress-title">✅ تم!</div>
            <div class="progress-text">
                تم تحويل ${convertedCount} صورة<br>
                <strong style="color: var(--success);">توفير: ${(totalSizeSaved / 1024 / 1024).toFixed(2)} MB</strong><br>
                <small style="color: var(--text-secondary);">التسمية: {اسم-المنتج}-{id}.webp</small>
            </div>
            <button class="btn-save" onclick="this.parentElement.remove()" style="margin-top: 16px; width: 100%;">حسناً</button>
        `;
        
        showToast(`✅ تم تحويل ${convertedCount} صورة`);
        
    } catch (error) {
        progressContainer.innerHTML = `
            <div class="progress-title">❌ خطأ</div>
            <div class="progress-text" style="color: var(--danger);">${error.message}</div>
            <button class="btn-save" onclick="this.parentElement.remove()" style="margin-top: 16px; width: 100%;">حسناً</button>
        `;
        showToast('❌ خطأ: ' + error.message, 'error');
    }
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
