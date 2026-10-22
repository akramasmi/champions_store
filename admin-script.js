const STORAGE_KEY = 'championsStoreData';
const PASSWORD_KEY = 'championsStorePassword';
const GITHUB_STORAGE_KEY = 'championsGitHubConfig';
const DEFAULT_PASSWORD = btoa('admin123');

let storeData = null;
let editingProductId = null;

// ✅ صورة احتياطية مدمجة (لا تسبب خطأ 404)
const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjUwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCBmaWxsPSIjMWMxYzFlIiB3aWR0aD0iNDAwIiBoZWlnaHQ9IjUwMCIvPjx0ZXh0IGZpbGw9IiNjOGEyNWQiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgeD0iNTAlIiB5PSI1MCUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';

function sanitizeFileName(name) {
    if (!name) return '';
    return name.toLowerCase().trim()
        .replace(/[أإآ]/g, 'a').replace(/[ة]/g, 'h').replace(/[ى]/g, 'a')
        .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').substring(0, 40);
}

function generateImageFileName(product) {
    let sanitizedName = sanitizeFileName(product.name);
    if (!sanitizedName || sanitizedName.trim() === '') sanitizedName = `product-${product.id}`;
    return `${sanitizedName}-${product.id}.webp`;
}

function extractFileName(imagePath) {
    if (!imagePath) return null;
    return imagePath.split('/').pop().split('?')[0];
}

function getImageUrl(imagePath) {
    if (!imagePath) return PLACEHOLDER_IMAGE;
    if (imagePath.startsWith('data:')) return imagePath;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return `images/${imagePath.split('/').pop().split('?')[0]}`;
    if (imagePath.startsWith('./')) return imagePath.substring(2);
    if (imagePath.startsWith('/')) return imagePath.substring(1);
    return imagePath;
}

function handleImageError(img) {
    if (img.dataset.fallbackTried) { img.src = PLACEHOLDER_IMAGE; return; }
    img.dataset.fallbackTried = '1';
    const c = img.src;
    if (c.includes('/images/')) { img.src = c.replace('/images/', '/imgs/'); return; }
    if (c.includes('/imgs/')) { img.src = c.replace('/imgs/', '/images/'); return; }
    if (c.includes('images/') && !c.includes('/images/')) { img.src = c.replace('images/', 'imgs/'); return; }
    if (c.endsWith('.webp')) { img.src = c.replace('.webp', '.png'); return; }
    img.src = PLACEHOLDER_IMAGE;
}

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
document.getElementById('passwordInput').addEventListener('keypress', (e) => { if (e.key === 'Enter') checkPassword(); });
function logout() { document.getElementById('adminPanel').style.display = 'none'; document.getElementById('loginScreen').style.display = 'flex'; }

async function loadData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) storeData = JSON.parse(saved);
        else {
            const res = await fetch('products.json?v=' + Date.now());
            storeData = await res.json();
            saveToLocalStorage();
        }
        renderAll();
    } catch (e) { showToast('خطأ في التحميل: ' + e.message, 'error'); }
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
    } catch (e) { showToast('❌ خطأ: ' + e.message, 'error'); }
}

function saveToLocalStorage() { if (storeData) localStorage.setItem(STORAGE_KEY, JSON.stringify(storeData)); }
function renderAll() {
    if (!storeData) return;
    renderProducts(); renderCategoriesAdmin(); renderStoreInfo(); renderFooterInfo(); renderAboutInfo(); renderLogoPreview(); populateAdminCategoryFilter();
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
    storeData.categories.forEach(cat => { if (cat.id !== 'all') select.innerHTML += `<option value="${cat.id}">${cat.icon} ${cat.name}</option>`; });
}

function filterAdminProducts() {
    const search = document.getElementById('adminProductSearch').value.toLowerCase();
    const categoryFilter = document.getElementById('adminCategoryFilter').value;
    const sortBy = document.getElementById('adminSortBy').value;
    let products = [...storeData.products];
    if (search) products = products.filter(p => p.name.toLowerCase().includes(search) || (p.brand && p.brand.toLowerCase().includes(search)));
    if (categoryFilter !== 'all') products = products.filter(p => p.category === categoryFilter);
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
        html += `<div class="product-row" data-product-id="${p.id}">
            <img src="${getImageUrl(p.image)}" alt="${p.name}" onerror="handleImageError(this)">
            <div><strong>${p.name}</strong>${p.brand ? `<br><small style="color:var(--text-secondary);">🏢 ${p.brand}</small>` : ''}${p.badge ? `<br><small style="color:var(--gold-dark);">${p.badge}</small>` : ''}<br><small style="color:var(--text-tertiary);font-size:0.7rem;">📁 ${extractFileName(p.image) || 'لا توجد'}</small></div>
            <div>${p.price} $</div><div>${cat ? cat.name : p.category}</div>
            <div class="product-actions">
                <button class="btn-edit" data-action="edit" data-id="${p.id}">✏️</button>
                <button class="btn-delete" data-action="delete" data-id="${p.id}">🗑️</button>
            </div>
        </div>`;
    });
    container.innerHTML = html;
    container.querySelectorAll('[data-action="edit"]').forEach(btn => btn.addEventListener('click', (e) => editProduct(parseInt(e.currentTarget.dataset.id))));
    container.querySelectorAll('[data-action="delete"]').forEach(btn => btn.addEventListener('click', (e) => deleteProduct(parseInt(e.currentTarget.dataset.id))));
}

function openProductModal() {
    editingProductId = null;
    document.getElementById('modalTitle').textContent = '➕ إضافة منتج';
    ['productId','productName','productPrice','productOldPrice','productDescription','productImageUrl','productBrand','productWeight','productServings'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('productBadge').value = '';
    document.getElementById('productImageUpload').value = '';
    document.getElementById('imagePreview').style.display = 'none';
    renderCategorySelect();
    document.getElementById('productModal').classList.add('active');
}
function closeProductModal() { document.getElementById('productModal').classList.remove('active'); }
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
    
    if (!name || !category || isNaN(price)) { showToast('يرجى ملء الحقول المطلوبة (*)', 'error'); return; }
    
    let image = imageUrl;
    if (preview.style.display !== 'none' && preview.src && !preview.src.includes(window.location.href)) image = preview.src;
    if (!image) image = 'images/placeholder.webp';
    
    if (editingProductId) {
        const p = storeData.products.find(x => x.id === editingProductId);
        if (p) {
            if (p.name !== name && !image.startsWith('data:')) { p._needsImageRename = true; p._oldImageFileName = extractFileName(image); }
            Object.assign(p, { name, category, price, oldPrice, description, badge, image, brand, weight, servings });
        }
    } else {
        const newId = storeData.products.length > 0 ? Math.max(...storeData.products.map(p => p.id)) + 1 : 1;
        storeData.products.push({ id: newId, name, category, price, oldPrice, description, badge, image, brand, weight, servings });
    }
    saveToLocalStorage();
    filterAdminProducts();
    closeProductModal();
    showToast(editingProductId ? 'تم التحديث ✓' : 'تمت الإضافة ✓');
}

function renderCategoriesAdmin() {
    const list = document.getElementById('categoriesList');
    if (!list || !storeData || !storeData.categories) return;
    let html = '<ul style="list-style:none;padding:0;">';
    storeData.categories.forEach(cat => {
        if (cat.id === 'all') return;
        html += `<li style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:rgba(200, 162, 93, 0.05);margin-bottom:8px;border-radius:8px;border:1px solid rgba(200, 162, 93, 0.1);">
            <div><strong>${cat.icon} ${cat.name}</strong><small style="color:var(--text-secondary);display:block;">ID: ${cat.id}</small>${cat.description ? `<small style="color:var(--text-secondary);">📝 ${cat.description.substring(0, 50)}${cat.description.length > 50 ? '...' : ''}</small>` : '<small style="color:var(--text-tertiary);">⚠️ لا يوجد وصف</small>'}</div>
            <div style="display:flex;gap:6px;">
                <button class="btn-edit" onclick="editCategory('${cat.id}')" style="padding:6px 10px;background:var(--info);color:white;border:none;border-radius:6px;cursor:pointer;">✏️</button>
                <button class="btn-delete" onclick="deleteCategory('${cat.id}')" style="padding:6px 10px;background:var(--danger);color:white;border:none;border-radius:6px;cursor:pointer;">🗑️</button>
            </div>
        </li>`;
    });
    list.innerHTML = html;
}

function addCategory() {
    const name = document.getElementById('newCatName').value.trim();
    const icon = document.getElementById('newCatIcon').value.trim() || '📦';
    const description = document.getElementById('newCatDescription').value.trim();
    if (!name) return showToast('أدخل اسم الفئة', 'error');
    const id = name.toLowerCase().replace(/\s+/g, '-');
    if (storeData.categories.find(c => c.id === id)) return showToast('هذه الفئة موجودة', 'error');
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
    const newName = prompt('اسم الفئة:', cat.name); if (newName === null) return;
    const newIcon = prompt('الأيقونة:', cat.icon); if (newIcon === null) return;
    const newDescription = prompt('الوصف:', cat.description || ''); if (newDescription === null) return;
    cat.name = newName.trim(); cat.icon = newIcon.trim(); cat.description = newDescription.trim();
    saveToLocalStorage(); renderCategoriesAdmin(); populateAdminCategoryFilter();
    showToast('تم تحديث الفئة ✓');
}

function deleteCategory(id) {
    if (!confirm('حذف هذه الفئة؟')) return;
    storeData.categories = storeData.categories.filter(c => c.id !== id);
    saveToLocalStorage(); renderCategoriesAdmin(); populateAdminCategoryFilter();
}

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
    const info = storeData.storeInfo;
    info.name = document.getElementById('storeName').value.trim();
    info.tagline = document.getElementById('storeTagline').value.trim();
    info.whatsapp = document.getElementById('storeWhatsapp').value.trim();
    info.instagram = document.getElementById('storeInstagram').value.trim();
    info.email = document.getElementById('storeEmail').value.trim();
    info.location = document.getElementById('storeLocation').value.trim();
    saveToLocalStorage(); showToast('تم الحفظ ✓');
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
    const info = storeData.storeInfo;
    info.footerDescription = document.getElementById('footerDescription').value.trim();
    info.copyright = document.getElementById('footerCopyright').value.trim();
    info.whatsapp = document.getElementById('footerWhatsapp').value.trim();
    info.instagram = document.getElementById('footerInstagram').value.trim();
    info.location = document.getElementById('footerLocation').value.trim();
    info.email = document.getElementById('footerEmail').value.trim();
    saveToLocalStorage(); showToast('تم حفظ إعدادات الفوتر ✓');
}

function renderAboutInfo() {
    if (!storeData) return;
    if (!storeData.about) storeData.about = { title: 'Champions Store Supplements', description: 'متجر متخصص.', features: '🏆 منتجات أوريجنال\n📍 مقرنا في دمشق' };
    document.getElementById('aboutTitle').value = storeData.about.title || '';
    document.getElementById('aboutDescription').value = storeData.about.description || '';
    document.getElementById('aboutFeatures').value = storeData.about.features || '';
}
function saveAboutInfo() {
    if (!storeData.about) storeData.about = {};
    storeData.about.title = document.getElementById('aboutTitle').value.trim();
    storeData.about.description = document.getElementById('aboutDescription').value.trim();
    storeData.about.features = document.getElementById('aboutFeatures').value.trim();
    saveToLocalStorage(); showToast('تم الحفظ ✓');
}

function renderLogoPreview() {
    const preview = document.getElementById('logoPreview');
    if (storeData && storeData.storeInfo && storeData.storeInfo.logo) preview.src = storeData.storeInfo.logo;
    else preview.src = 'logo.png';
}
function handleLogoUpload(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => { document.getElementById('logoPreview').src = e.target.result; document.getElementById('logoUrl').value = ''; };
    reader.readAsDataURL(file);
}
function saveLogo() {
    if (!storeData.storeInfo) storeData.storeInfo = {};
    const url = document.getElementById('logoUrl').value.trim();
    const preview = document.getElementById('logoPreview');
    if (url) storeData.storeInfo.logo = url;
    else if (preview.src && preview.src.startsWith('data:')) storeData.storeInfo.logo = preview.src;
    else return showToast('يرجى رفع صورة أو إدخال رابط', 'error');
    saveToLocalStorage(); showToast('تم حفظ اللوغو ✓');
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
    const blob = new Blob([JSON.stringify(storeData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'products.json'; a.click();
    URL.revokeObjectURL(url); showToast('تم التصدير ✓');
}

function importData(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const imported = JSON.parse(e.target.result);
            if (imported.products && imported.storeInfo && imported.categories) {
                storeData = imported; saveToLocalStorage(); renderAll(); showToast('تم الاستيراد ✓');
            } else showToast('ملف JSON غير صالح', 'error');
        } catch (err) { showToast('خطأ: ' + err.message, 'error'); }
    };
    reader.readAsText(file); event.target.value = '';
}

async function reorganizeIds() {
    if (!storeData || !storeData.products) return showToast('لا توجد منتجات', 'error');
    const config = JSON.parse(localStorage.getItem(GITHUB_STORAGE_KEY) || 'null');
    if (!config || !config.token) return showToast('أعد إعداد GitHub أولاً', 'error');
    if (!confirm('⚠️ سيتم إعادة ترقيم المنتجات من 1 وإعادة تسمية جميع الصور على GitHub. هل أنت متأكد؟')) return;
    
    showToast('🔄 جاري إعادة التهيئة...');
    const changes = [];
    storeData.products.forEach((product, index) => {
        const newId = index + 1;
        if (product.id !== newId) {
            const oldFileName = extractFileName(product.image);
            const newFileName = generateImageFileName({...product, id: newId});
            changes.push({ product, oldId: product.id, newId, oldFileName, newFileName, needsRename: oldFileName && oldFileName !== newFileName && !product.image.startsWith('data:') });
        }
    });
    storeData.products.forEach((product, index) => product.id = index + 1);
    saveToLocalStorage(); filterAdminProducts();
    
    if (changes.some(c => c.needsRename)) {
        try { await renameImagesOnGitHub(changes.filter(c => c.needsRename), config); showToast(`✅ تم إعادة تسمية الصور`); }
        catch (e) { showToast(`⚠️ تم تحديث IDs لكن فشل تحديث بعض الصور: ${e.message}`, 'error'); }
    } else showToast(`✅ تم إعادة تهيئة IDs`);
}

async function renameImagesOnGitHub(changes, config) {
    const baseUrl = `https://api.github.com/repos/${config.username}/${config.repo}`;
    const headers = { 'Authorization': `token ${config.token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' };
    for (const change of changes) {
        try {
            let oldFilePath = null, folder = 'images';
            for (const f of ['images', 'imgs']) {
                try {
                    const res = await fetch(`${baseUrl}/contents/${f}/${change.oldFileName}`, { headers });
                    if (res.ok) { oldFilePath = `${f}/${change.oldFileName}`; folder = f; break; }
                } catch (e) {}
            }
            if (!oldFilePath) continue;
            const fileRes = await fetch(`${baseUrl}/contents/${oldFilePath}`, { headers });
            if (!fileRes.ok) throw new Error('فشل جلب الملف');
            const fileData = await fileRes.json();
            const newFilePath = `${folder}/${change.newFileName}`;
            const uploadRes = await fetch(`${baseUrl}/contents/${newFilePath}`, {
                method: 'PUT', headers, body: JSON.stringify({ message: `🔄 إعادة تسمية: ${change.oldFileName} → ${change.newFileName}`, content: fileData.content, branch: 'main' })
            });
            if (!uploadRes.ok) throw new Error('فشل رفع الملف الجديد');
            await fetch(`${baseUrl}/contents/${oldFilePath}`, {
                method: 'DELETE', headers, body: JSON.stringify({ message: `🗑️ حذف بعد إعادة التسمية`, sha: fileData.sha, branch: 'main' })
            });
            change.product.image = newFilePath;
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) { console.error(`❌ خطأ في ${change.product.name}:`, error); }
    }
    saveToLocalStorage();
}

function saveGitHubConfig() {
    const config = { username: document.getElementById('githubUsername').value.trim(), repo: document.getElementById('githubRepo').value.trim(), token: document.getElementById('githubToken').value.trim() };
    if (!config.username || !config.repo || !config.token) return showToast('يرجى ملء جميع الحقول', 'error');
    localStorage.setItem(GITHUB_STORAGE_KEY, JSON.stringify(config)); showToast('تم حفظ الإعدادات ✓');
}
function loadGitHubConfig() {
    const saved = localStorage.getItem(GITHUB_STORAGE_KEY);
    if (saved) { try { const config = JSON.parse(saved); document.getElementById('githubUsername').value = config.username || ''; document.getElementById('githubRepo').value = config.repo || ''; document.getElementById('githubToken').value = config.token || ''; } catch (e) {} }
}

async function publishDirectly() {
    const config = JSON.parse(localStorage.getItem(GITHUB_STORAGE_KEY) || 'null');
    if (!config || !config.token) return showToast('أدخل إعدادات GitHub أولاً', 'error');
    if (!confirm('⚠️ نشر التعديلات؟')) return;
    const publishBtn = document.querySelector('.btn-publish');
    const originalText = publishBtn.textContent;
    publishBtn.disabled = true; publishBtn.textContent = '⏳...';
    try {
        const baseUrl = `https://api.github.com/repos/${config.username}/${config.repo}`;
        const headers = { 'Authorization': `token ${config.token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' };
        const repoRes = await fetch(baseUrl, { headers }); if (!repoRes.ok) throw new Error('فشل الوصول');
        const repoData = await repoRes.json(); const defaultBranch = repoData.default_branch || 'main';
        const fileRes = await fetch(`${baseUrl}/contents/products.json?ref=${defaultBranch}`, { headers }); if (!fileRes.ok) throw new Error('فشل القراءة');
        const fileData = await fileRes.json();
        const updateRes = await fetch(`${baseUrl}/contents/products.json`, {
            method: 'PUT', headers, body: JSON.stringify({ message: '🤖 تحديث', content: btoa(unescape(encodeURIComponent(JSON.stringify(storeData, null, 2)))), sha: fileData.sha, branch: defaultBranch })
        });
        if (!updateRes.ok) throw new Error('فشل التحديث');
        showToast('✅ تم النشر!');
    } catch (e) { showToast('❌ خطأ: ' + e.message, 'error'); }
    finally { publishBtn.disabled = false; publishBtn.textContent = originalText; }
}

// ✅ أداة تصحيح الروابط (محدثة لتجنب 422)
async function fixAllImageUrls() {
    if (!storeData || !storeData.products) return showToast('لا توجد منتجات', 'error');
    const config = JSON.parse(localStorage.getItem(GITHUB_STORAGE_KEY) || 'null');
    if (!config || !config.token) return showToast('أعد إعداد GitHub أولاً', 'error');
    if (!confirm('⚠️ سيتم فحص وإعادة تسمية الصور القديمة لتطابق النظام الجديد. هل أنت متأكد؟')) return;
    
    showToast('🔍 جاري فحص الصور...');
    const baseUrl = `https://api.github.com/repos/${config.username}/${config.repo}`;
    const headers = { 'Authorization': `token ${config.token}`, 'Accept': 'application/vnd.github.v3+json' };
    const allFiles = new Map();
    
    for (const folder of ['images', 'imgs', '']) {
        try {
            const url = folder ? `${baseUrl}/contents/${folder}` : `${baseUrl}/contents/`;
            const res = await fetch(url, { headers });
            if (res.ok) {
                const data = await res.json();
                data.filter(f => f.type === 'file' && /\.(webp|png|jpg|jpeg)$/i.test(f.name)).forEach(f => {
                    allFiles.set(f.name, { folder: folder || '', path: folder ? `${folder}/${f.name}` : f.name, sha: f.sha, name: f.name });
                });
            }
        } catch (e) {}
    }
    
    let fixedCount = 0, renamedCount = 0, failedCount = 0;
    for (const product of storeData.products) {
        if (!product.image || product.image.startsWith('data:')) continue;
        const currentFileName = extractFileName(product.image);
        const expectedFileName = generateImageFileName(product);
        if (currentFileName === expectedFileName) {
            const found = allFiles.get(expectedFileName);
            if (found) {
                const correctPath = `${found.folder}/${expectedFileName}`;
                if (product.image !== correctPath) { product.image = correctPath; fixedCount++; }
            } else failedCount++;
            continue;
        }
        let foundFile = allFiles.get(currentFileName);
        if (!foundFile) {
            for (const [filename, file] of allFiles.entries()) {
                const baseName = filename.replace(/\.(webp|png|jpg|jpeg)$/i, '');
                if (baseName === `${product.id}` || baseName === `product-${product.id}` || baseName.startsWith(`${product.id}-`) || baseName.startsWith(`product-${product.id}-`)) {
                    foundFile = file; break;
                }
            }
        }
        if (foundFile) {
            try {
                const fileRes = await fetch(`${baseUrl}/contents/${foundFile.path}`, { headers });
                if (!fileRes.ok) continue;
                const fileData = await fileRes.json();
                const newPath = `${foundFile.folder}/${expectedFileName}`;
                await fetch(`${baseUrl}/contents/${newPath}`, {
                    method: 'PUT', headers, body: JSON.stringify({ message: `🔄 إعادة تسمية`, content: fileData.content, branch: 'main' })
                });
                await fetch(`${baseUrl}/contents/${foundFile.path}`, {
                    method: 'DELETE', headers, body: JSON.stringify({ message: `🗑️ حذف`, sha: fileData.sha, branch: 'main' })
                });
                product.image = newPath;
                renamedCount++;
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (e) { failedCount++; }
        } else failedCount++;
    }
    saveToLocalStorage(); filterAdminProducts();
    showToast(`✅ تم: ${fixedCount} تصحيح، ${renamedCount} إعادة تسمية`);
}

// ✅ أداة تحويل الصور (محدثة لتجنب 422)
async function convertAllImagesToWebP() {
    const category = document.getElementById('convertCategory').value;
    const deleteOld = document.getElementById('deleteOldImages').checked;
    const maxSizeKB = parseInt(document.getElementById('maxImageSize').value) || 150;
    let productsToConvert = category === 'all' ? storeData.products : storeData.products.filter(p => p.category === category);
    const base64Products = productsToConvert.filter(p => p.image && p.image.startsWith('data:image'));
    if (base64Products.length === 0) return showToast('لا توجد صور Base64', 'error');
    const config = JSON.parse(localStorage.getItem(GITHUB_STORAGE_KEY) || 'null');
    if (!config || !config.token) return showToast('أعد إعداد GitHub أولاً', 'error');
    if (!confirm(`⚠️ سيتم تحويل ${base64Products.length} صورة. هل أنت متأكد؟`)) return;
    
    closeConvertModal();
    const progressBox = document.createElement('div');
    progressBox.style.cssText = `position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(18, 18, 26, 0.98); backdrop-filter: blur(20px); padding: 30px; border-radius: 16px; border: 2px solid var(--gold); box-shadow: 0 20px 60px rgba(0,0,0,0.5); z-index: 9999; min-width: 500px; max-width: 90vw; max-height: 85vh; overflow-y: auto; color: var(--text);`;
    progressBox.innerHTML = `
        <h3 style="color: var(--gold); margin-bottom: 16px; text-align: center;">🖼️ جاري تحويل الصور</h3>
        <div style="background: rgba(255,255,255,0.1); height: 10px; border-radius: 10px; overflow: hidden; margin-bottom: 12px;"><div id="convProgress" style="height: 100%; background: var(--gradient-gold); width: 0%; transition: width 0.3s;"></div></div>
        <div style="display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 0.9rem;"><span id="convCount">0 / ${base64Products.length}</span><span id="convSize" style="color: var(--success);">0 MB توفير</span></div>
        <p id="convStatus" style="text-align: center; margin-bottom: 16px; color: var(--text-secondary);">بدء العملية...</p>
        <div id="convLog" style="font-size: 0.8rem; max-height: 300px; overflow-y: auto; background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; font-family: monospace;"></div>`;
    document.body.appendChild(progressBox);
    
    const progressBar = document.getElementById('convProgress');
    const countEl = document.getElementById('convCount');
    const sizeEl = document.getElementById('convSize');
    const statusEl = document.getElementById('convStatus');
    const logEl = document.getElementById('convLog');
    function addLog(msg, type = 'info') {
        const colors = { info: 'var(--text-secondary)', success: 'var(--success)', error: 'var(--danger)', warning: 'var(--warning)', gold: 'var(--gold)' };
        logEl.innerHTML += `<div style="color: ${colors[type]}; margin-bottom: 3px;">[${new Date().toLocaleTimeString('en-US', { hour12: false })}] ${msg}</div>`;
        logEl.scrollTop = logEl.scrollHeight;
    }
    
    const baseUrl = `https://api.github.com/repos/${config.username}/${config.repo}`;
    const headers = { 'Authorization': `token ${config.token}`, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' };
    const existingFiles = new Map();
    try {
        for (const folder of ['images', 'imgs']) {
            const res = await fetch(`${baseUrl}/contents/${folder}`, { headers });
            if (res.ok) {
                const data = await res.json();
                data.filter(f => f.type === 'file').forEach(f => existingFiles.set(f.name, { path: `${folder}/${f.name}`, sha: f.sha, folder }));
            }
        }
    } catch (e) {}
    
    let totalSizeSaved = 0, convertedCount = 0, failedCount = 0;
    for (let i = 0; i < base64Products.length; i++) {
        const product = base64Products[i];
        progressBar.style.width = `${((i + 1) / base64Products.length) * 100}%`;
        countEl.textContent = `${i + 1} / ${base64Products.length}`;
        statusEl.textContent = `تحويل: ${product.name}`;
        addLog(`🔄 [${i + 1}/${base64Products.length}] ${product.name}`, 'gold');
        try {
            const blob = await base64ToBlob(product.image);
            const originalSize = blob.size;
            let compressedFile;
            try { compressedFile = await imageCompression(blob, { maxSizeMB: maxSizeKB / 1024, maxWidthOrHeight: 800, useWebWorker: true, fileType: 'image/webp' }); }
            catch (e) { compressedFile = blob; }
            
            let fileName = generateImageFileName(product);
            let baseName = fileName.replace(/\.webp$/i, '');
            if (!baseName || baseName.trim() === '') { baseName = `product-${product.id}`; fileName = `${baseName}.webp`; }
            
            let counter = 1, finalName = fileName;
            while (existingFiles.has(finalName)) { finalName = `${baseName}-${counter}.webp`; counter++; }
            fileName = finalName;
            existingFiles.set(fileName, { path: `images/${fileName}`, sha: '', folder: 'images' });
            
            const reader = new FileReader();
            const webpBase64 = await new Promise((resolve, reject) => { reader.onload = () => resolve(reader.result.split(',')[1]); reader.onerror = reject; reader.readAsDataURL(compressedFile); });
            
            const folder = 'images';
            const filePath = `${folder}/${fileName}`;
            let uploadBody = { message: `🖼️ رفع/تحديث ${product.name} (${fileName})`, content: webpBase64, branch: 'main' };
            
            if (existingFiles.has(fileName) && existingFiles.get(fileName).sha) {
                uploadBody.sha = existingFiles.get(fileName).sha; // ✅ الحل لخطأ 422
            }
            
            const uploadResponse = await fetch(`${baseUrl}/contents/${filePath}`, { method: 'PUT', headers, body: JSON.stringify(uploadBody) });
            if (!uploadResponse.ok) { const errData = await uploadResponse.json().catch(() => ({})); throw new Error(`فشل الرفع: ${errData.message || uploadResponse.status}`); }
            
            product.image = filePath;
            totalSizeSaved += (originalSize - compressedFile.size);
            convertedCount++;
            sizeEl.textContent = `${(totalSizeSaved / 1024 / 1024).toFixed(2)} MB توفير`;
            addLog(`   ✅ تم بنجاح!`, 'success');
            await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
            failedCount++;
            addLog(`   ❌ خطأ: ${error.message}`, 'error');
        }
    }
    
    if (deleteOld) {
        storeData.products.forEach(p => { if (p.image && p.image.startsWith('data:image')) p.image = ''; });
    }
    saveToLocalStorage();
    
    progressBox.innerHTML = `
        <h3 style="color: var(--gold); margin-bottom: 16px; text-align: center;">${failedCount === 0 ? '✅' : '⚠️'} اكتملت العملية</h3>
        <pre style="background: rgba(0,0,0,0.3); padding: 16px; border-radius: 8px; font-size: 0.9rem; white-space: pre-wrap; color: var(--text); margin-bottom: 16px;">📊 تم تحويل: ${convertedCount}\n❌ فشل: ${failedCount}\n💾 توفير: ${(totalSizeSaved / 1024 / 1024).toFixed(2)} MB</pre>
        <div style="display: flex; gap: 10px;">
            <button onclick="this.parentElement.parentElement.remove()" style="flex: 1; padding: 12px; background: rgba(255,255,255,0.1); color: var(--text); border: 1px solid rgba(255,255,255,0.2); border-radius: 8px; font-weight: 700; cursor: pointer;">إغلاق</button>
            ${convertedCount > 0 ? `<button onclick="publishDirectly(); this.parentElement.parentElement.remove()" style="flex: 1; padding: 12px; background: var(--success); color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer;">🚀 نشر الآن</button>` : ''}
        </div>`;
    showToast(`✅ تم تحويل ${convertedCount} صورة`);
}

async function base64ToBlob(base64String) { const response = await fetch(base64String); return await response.blob(); }

function testAllImageUrls() {
    if (!storeData || !storeData.products) return showToast('لا توجد منتجات', 'error');
    showToast('🔍 جاري الفحص...');
    let ok = 0, failed = 0, base64 = 0;
    const failedList = [];
    storeData.products.slice(0, 20).forEach(async product => {
        if (!product.image) return;
        if (product.image.startsWith('data:')) { base64++; return; }
        const img = new Image();
        img.onload = () => { ok++; };
        img.onerror = () => { failed++; failedList.push(`${product.name}: ${product.image}`); };
        img.src = product.image;
    });
    setTimeout(() => {
        let report = `📊 فحص 20 منتج:\n✅ ناجحة: ${ok}\n❌ فاشلة: ${failed}\n📦 Base64: ${base64}`;
        if (failedList.length > 0) report += `\n\n❌ الفاشلة:\n${failedList.join('\n')}`;
        console.log(report); alert(report);
    }, 3000);
}

function showToast(msg, type = 'success') {
    const t = document.getElementById('toast'); if (!t) return;
    t.textContent = msg; t.style.background = type === 'error' ? 'var(--danger)' : 'var(--success)';
    t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 3000);
}

document.addEventListener('click', (e) => { if (e.target.dataset && e.target.dataset.tab === 'github') setTimeout(loadGitHubConfig, 100); });
document.getElementById('productModal').addEventListener('click', (e) => { if (e.target.id === 'productModal') closeProductModal(); });
document.getElementById('convertModal').addEventListener('click', (e) => { if (e.target.id === 'convertModal') closeConvertModal(); });
