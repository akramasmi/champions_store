const STORAGE_KEY = 'championsStoreData';
const PASSWORD_KEY = 'championsStorePassword';
const GITHUB_STORAGE_KEY = 'championsGitHubConfig';
const DEFAULT_PASSWORD = btoa('admin123');

let storeData = null;
let editingProductId = null;

// ===== تسجيل الدخول =====
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

// ===== تحميل البيانات =====
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
    if (!confirm('⚠️ سيتم تجاهل كل التعديلات المحلية وإعادة تحميل البيانات من GitHub. هل أنت متأكد؟')) return;
    
    try {
        localStorage.removeItem(STORAGE_KEY);
        const res = await fetch('products.json?v=' + Date.now());
        storeData = await res.json();
        saveToLocalStorage();
        renderAll();
        showToast('✅ تم إعادة التحميل من GitHub');
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
    renderAboutInfo();
    renderLogoPreview();
}

// ===== التبويبات =====
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab + 'Tab').classList.add('active');
    });
});

// ✅ الحل الجذري: استخدام data-id بدلاً من onclick مع Base64
function renderProducts() {
    const container = document.getElementById('productsTable');
    if (!container || !storeData || !storeData.products) return;
    const categories = storeData.categories.filter(c => c.id !== 'all');
    
    let html = '<div class="product-row header"><div>صورة</div><div>الاسم</div><div>السعر</div><div>الفئة</div><div>إجراءات</div></div>';
    
    storeData.products.forEach(p => {
        const cat = categories.find(c => c.id === p.category);
        // استخدام صورة placeholder بدلاً من Base64 في الجدول
        const displayImage = p.image && p.image.startsWith('data:') 
            ? 'https://via.placeholder.com/60x60/1c1c1e/c8a25d?text=IMG' 
            : p.image;
        
        html += `<div class="product-row" data-product-id="${p.id}">
            <img src="${displayImage}" alt="${p.name}" style="width:60px;height:60px;object-fit:cover;border-radius:8px;">
            <div><strong>${p.name}</strong>${p.badge ? '<br><small style="color:var(--gold-dark)">' + p.badge + '</small>' : ''}</div>
            <div>${p.price} $</div>
            <div>${cat ? cat.name : p.category}</div>
            <div class="product-actions">
                <button class="btn-edit" data-action="edit" data-id="${p.id}">✏️</button>
                <button class="btn-delete" data-action="delete" data-id="${p.id}">🗑️</button>
            </div>
        </div>`;
    });
    
    container.innerHTML = html;
    
    // إضافة event listeners للأزرار
    container.querySelectorAll('[data-action="edit"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.currentTarget.dataset.id);
            editProduct(id);
        });
    });
    
    container.querySelectorAll('[data-action="delete"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.currentTarget.dataset.id);
            deleteProduct(id);
        });
    });
}

function openProductModal() {
    editingProductId = null;
    document.getElementById('modalTitle').textContent = 'إضافة منتج';
    document.getElementById('productId').value = '';
    document.getElementById('productName').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('productOldPrice').value = '';
    document.getElementById('productDescription').value = '';
    document.getElementById('productBadge').value = '';
    document.getElementById('productImageUrl').value = '';
    document.getElementById('productImageUpload').value = '';
    document.getElementById('imagePreview').style.display = 'none';
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
    if (!p) {
        showToast('المنتج غير موجود', 'error');
        return;
    }
    
    editingProductId = id;
    document.getElementById('modalTitle').textContent = 'تعديل منتج';
    
    // ملء الحقول
    document.getElementById('productName').value = p.name;
    document.getElementById('productPrice').value = p.price;
    document.getElementById('productOldPrice').value = p.oldPrice || '';
    document.getElementById('productDescription').value = p.description || '';
    document.getElementById('productBadge').value = p.badge || '';
    
    // إنشاء قائمة الفئات
    renderCategorySelect();
    
    // تعيين الفئة المحددة
    document.getElementById('productCategory').value = p.category;
    
    // معالجة الصورة
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
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;
    storeData.products = storeData.products.filter(p => p.id !== id);
    saveToLocalStorage();
    renderProducts();
    showToast('تم الحذف ✓ (اضغط "نشر فوري" لتطبيقه)');
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
    
    if (!name || !category || isNaN(price)) {
        showToast('يرجى ملء الحقول المطلوبة', 'error');
        return;
    }
    
    let image = imageUrl;
    if (preview.style.display !== 'none' && preview.src && !preview.src.includes(window.location.href)) {
        image = preview.src;
    }
    if (!image) image = 'https://via.placeholder.com/400x400/1c1c1e/c8a25d?text=No+Image';
    
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
        }
    } else {
        const newId = storeData.products.length > 0 ? Math.max(...storeData.products.map(p => p.id)) + 1 : 1;
        storeData.products.push({
            id: newId,
            name,
            category,
            price,
            oldPrice,
            description,
            badge,
            image
        });
    }
    
    saveToLocalStorage();
    renderProducts();
    closeProductModal();
    showToast(editingProductId ? 'تم التحديث ✓' : 'تمت الإضافة ✓');
}

// ===== الفئات =====
function renderCategoriesAdmin() {
    const list = document.getElementById('categoriesList');
    if (!list || !storeData || !storeData.categories) return;
    
    let html = '<ul style="list-style:none;padding:0;">';
    storeData.categories.forEach(cat => {
        if (cat.id === 'all') return;
        html += `<li style="display:flex;justify-content:space-between;padding:10px;background:#f4f4f4;margin-bottom:5px;border-radius:5px;">
            <span>${cat.icon} ${cat.name} (ID: ${cat.id})</span>
            <button class="btn-delete" data-action="delete-cat" data-id="${cat.id}" style="padding:5px 10px;">حذف</button>
        </li>`;
    });
    html += '</ul>';
    list.innerHTML = html;
    
    // إضافة event listeners
    list.querySelectorAll('[data-action="delete-cat"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            deleteCategory(id);
        });
    });
}

function addCategory() {
    const name = document.getElementById('newCatName').value.trim();
    const icon = document.getElementById('newCatIcon').value.trim() || '📦';
    if (!name) return showToast('أدخل اسم الفئة', 'error');
    
    const id = name.toLowerCase().replace(/\s+/g, '-');
    if (storeData.categories.find(c => c.id === id)) {
        return showToast('هذه الفئة موجودة بالفعل', 'error');
    }
    
    storeData.categories.push({ id, name, icon });
    saveToLocalStorage();
    document.getElementById('newCatName').value = '';
    document.getElementById('newCatIcon').value = '';
    renderCategoriesAdmin();
    showToast('تمت إضافة الفئة ✓');
}

function deleteCategory(id) {
    if (!confirm('حذف هذه الفئة؟')) return;
    storeData.categories = storeData.categories.filter(c => c.id !== id);
    saveToLocalStorage();
    renderCategoriesAdmin();
}

// ===== معلومات المتجر =====
function renderStoreInfo() {
    if (!storeData || !storeData.storeInfo) return;
    const info = storeData.storeInfo;
    document.getElementById('storeName').value = info.name || '';
    document.getElementById('storeTagline').value = info.tagline || '';
    document.getElementById('storeWhatsapp').value = info.whatsapp || '';
    document.getElementById('storeInstagram').value = info.instagram || '';
    document.getElementById('storeLocation').value = info.location || '';
}

function saveStoreInfo() {
    if (!storeData.storeInfo) storeData.storeInfo = {};
    storeData.storeInfo.name = document.getElementById('storeName').value.trim();
    storeData.storeInfo.tagline = document.getElementById('storeTagline').value.trim();
    storeData.storeInfo.whatsapp = document.getElementById('storeWhatsapp').value.trim();
    storeData.storeInfo.instagram = document.getElementById('storeInstagram').value.trim();
    storeData.storeInfo.location = document.getElementById('storeLocation').value.trim();
    saveToLocalStorage();
    showToast('تم الحفظ ✓ (لا تنسَ الضغط على "نشر فوري")');
}

// ===== من نحن =====
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
    showToast('تم حفظ "من نحن" ✓');
}

// ===== اللوغو =====
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

// ===== كلمة المرور =====
function changePassword() {
    const current = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;
    const saved = localStorage.getItem(PASSWORD_KEY) || DEFAULT_PASSWORD;
    
    if (btoa(current) !== saved) return showToast('كلمة المرور الحالية غير صحيحة', 'error');
    if (newPass.length < 6) return showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
    if (newPass !== confirm) return showToast('كلمتا المرور غير متطابقتين', 'error');
    
    localStorage.setItem(PASSWORD_KEY, btoa(newPass));
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    showToast('تم تغيير كلمة المرور ✓');
}

// ===== تصدير واستيراد =====
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

// ===== GitHub =====
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
    showToast('تم حفظ إعدادات GitHub ✓');
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

// ===== النشر الفوري =====
async function publishDirectly() {
    const config = JSON.parse(localStorage.getItem(GITHUB_STORAGE_KEY) || 'null');
    if (!config || !config.token) {
        return showToast('أدخل إعدادات GitHub أولاً', 'error');
    }
    if (!confirm('⚠️ سيتم نشر التعديلات مباشرة على الموقع. هل أنت متأكد؟')) return;
    
    const publishBtn = document.querySelector('.btn-publish');
    const originalText = publishBtn.textContent;
    publishBtn.disabled = true;
    publishBtn.textContent = '⏳ جاري النشر...';
    
    try {
        const baseUrl = `https://api.github.com/repos/${config.username}/${config.repo}`;
        const headers = {
            'Authorization': `token ${config.token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };
        
        const repoRes = await fetch(baseUrl, { headers });
        if (!repoRes.ok) throw new Error('فشل الوصول للمستودع');
        const repoData = await repoRes.json();
        const defaultBranch = repoData.default_branch || 'main';
        
        const fileRes = await fetch(`${baseUrl}/contents/products.json?ref=${defaultBranch}`, { headers });
        if (!fileRes.ok) throw new Error('فشل قراءة products.json');
        const fileData = await fileRes.json();
        
        const newContent = JSON.stringify(storeData, null, 2);
        const encodedContent = btoa(unescape(encodeURIComponent(newContent)));
        
        const updateRes = await fetch(`${baseUrl}/contents/products.json`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
                message: '🤖 تحديث من لوحة الإدارة - ' + new Date().toLocaleString('ar-SY'),
                content: encodedContent,
                sha: fileData.sha,
                branch: defaultBranch
            })
        });
        
        if (!updateRes.ok) throw new Error('فشل التحديث');
        showToast('✅ تم النشر! سيظهر خلال دقيقة');
    } catch (e) {
        showToast('❌ خطأ: ' + e.message, 'error');
    } finally {
        publishBtn.disabled = false;
        publishBtn.textContent = originalText;
    }
}

// ===== تحويل الصور =====
function showConvertModal() {
    const config = JSON.parse(localStorage.getItem(GITHUB_STORAGE_KEY) || 'null');
    if (!config || !config.token) {
        showToast('يرجى إعداد GitHub أولاً', 'error');
        return;
    }
    
    if (!storeData || !storeData.products) {
        showToast('لا توجد منتجات', 'error');
        return;
    }
    
    const categorySelect = document.getElementById('convertCategory');
    categorySelect.innerHTML = '<option value="all">جميع الفئات</option>';
    storeData.categories.forEach(cat => {
        if (cat.id !== 'all') {
            categorySelect.innerHTML += `<option value="${cat.id}">${cat.icon} ${cat.name}</option>`;
        }
    });
    
    const base64Count = storeData.products.filter(p => p.image && p.image.startsWith('data:image')).length;
    const externalCount = storeData.products.length - base64Count;
    
    document.getElementById('base64Count').textContent = `صور Base64: ${base64Count}`;
    document.getElementById('externalCount').textContent = `صور خارجية: ${externalCount}`;
    
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
    
    if (base64Products.length === 0) {
        showToast('لا توجد صور Base64 للتحويل في هذه الفئة', 'error');
        return;
    }
    
    if (!confirm(`⚠️ سيتم تحويل ${base64Products.length} صورة إلى WebP.\n\nهل أنت متأكد؟`)) {
        return;
    }
    
    closeConvertModal();
    
    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress-container active';
    progressContainer.innerHTML = `
        <div class="progress-title">🖼️ جاري تحويل الصور إلى WebP</div>
        <div class="progress-bar">
            <div class="progress-fill" id="progressFill"></div>
        </div>
        <div class="progress-text" id="progressText">بدء العملية...</div>
        <div class="progress-stats">
            <span id="progressCount">0 / ${base64Products.length}</span>
            <span id="progressSize">0 MB توفير</span>
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
                
                const options = {
                    maxSizeMB: maxSizeKB / 1024,
                    maxWidthOrHeight: 800,
                    useWebWorker: true,
                    fileType: 'image/webp'
                };
                
                const compressedFile = await imageCompression(blob, options);
                const compressedSize = compressedFile.size;
                
                const fileName = `product-${product.id}-${Date.now()}.webp`;
                
                const reader = new FileReader();
                const webpBase64 = await new Promise((resolve, reject) => {
                    reader.onload = () => resolve(reader.result.split(',')[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(compressedFile);
                });
                
                const uploadResponse = await fetch(`${baseUrl}/contents/imgs/${fileName}`, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify({
                        message: `🖼️ رفع صورة ${product.name}`,
                        content: webpBase64,
                        branch: 'main'
                    })
                });
                
                if (!uploadResponse.ok) {
                    throw new Error('فشل رفع الصورة');
                }
                
                const imageUrl = `https://raw.githubusercontent.com/${config.username}/${config.repo}/main/imgs/${fileName}`;
                product.image = imageUrl;
                
                totalSizeSaved += (originalSize - compressedSize);
                convertedCount++;
                
                progressSize.textContent = `${(totalSizeSaved / 1024 / 1024).toFixed(2)} MB توفير`;
                
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                console.error(`خطأ في تحويل ${product.name}:`, error);
                progressText.textContent = `خطأ في: ${product.name} - المتابعة...`;
            }
        }
        
        if (deleteOld) {
            progressText.textContent = 'حذف الصور القديمة من JSON...';
            storeData.products.forEach(p => {
                if (p.image && p.image.startsWith('data:image')) {
                    p.image = 'https://via.placeholder.com/400x400/1c1c1e/c8a25d?text=No+Image';
                }
            });
        }
        
        saveToLocalStorage();
        
        progressText.textContent = 'جاري نشر التحديثات...';
        await publishDirectly();
        
        progressContainer.innerHTML = `
            <div class="progress-title">✅ تم بنجاح!</div>
            <div class="progress-text">
                تم تحويل ${convertedCount} صورة بنجاح<br>
                <strong style="color: var(--success);">توفير: ${(totalSizeSaved / 1024 / 1024).toFixed(2)} MB</strong>
            </div>
            <button class="btn-save" onclick="this.parentElement.remove()" style="margin-top: 20px; width: 100%;">حسناً</button>
        `;
        
        showToast(`✅ تم تحويل ${convertedCount} صورة بنجاح!`);
        
    } catch (error) {
        console.error('خطأ في التحويل:', error);
        progressContainer.innerHTML = `
            <div class="progress-title">❌ حدث خطأ</div>
            <div class="progress-text" style="color: var(--danger);">${error.message}</div>
            <button class="btn-save" onclick="this.parentElement.remove()" style="margin-top: 20px; width: 100%;">حسناً</button>
        `;
        showToast('❌ خطأ: ' + error.message, 'error');
    }
}

async function base64ToBlob(base64String) {
    const response = await fetch(base64String);
    return await response.blob();
}

// ===== الإشعارات =====
function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.style.background = type === 'error' ? 'var(--danger)' : 'var(--success)';
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

// ===== مستمعي الأحداث =====
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
