// ===== الإعدادات =====
const STORAGE_KEY = 'championsStoreData';
const PASSWORD_KEY = 'championsStorePassword';
const DEFAULT_PASSWORD = btoa('admin123');

let storeData = null;
let editingProductId = null;

// ===== التحقق من كلمة المرور =====
function checkPassword() {
    console.log('🔵 محاولة تسجيل الدخول...');
    
    const input = document.getElementById('passwordInput').value;
    const savedPassword = localStorage.getItem(PASSWORD_KEY) || DEFAULT_PASSWORD;
    const inputEncoded = btoa(input);
    
    console.log('Input:', input);
    console.log('Saved:', savedPassword);
    console.log('Input Encoded:', inputEncoded);
    
    if (inputEncoded === savedPassword) {
        console.log('✅ كلمة المرور صحيحة');
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        loadData();
        showToast('تم تسجيل الدخول بنجاح ✓');
    } else {
        console.log(' كلمة المرور خاطئة');
        document.getElementById('errorMsg').textContent = 'كلمة المرور غير صحيحة';
        document.getElementById('passwordInput').value = '';
    }
}

// Event listener لزر الدخول
document.addEventListener('DOMContentLoaded', function() {
    console.log(' تم تحميل الصفحة');
    
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.addEventListener('click', checkPassword);
        console.log('✅ تم ربط زر تسجيل الدخول');
    } else {
        console.error('❌ لم يتم العثور على زر تسجيل الدخول');
    }
    
    const passwordInput = document.getElementById('passwordInput');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                checkPassword();
            }
        });
    }
});

// ===== تسجيل الخروج =====
function logout() {
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('passwordInput').value = '';
    document.getElementById('errorMsg').textContent = '';
}

// ===== تحميل البيانات =====
async function loadData() {
    console.log('📥 جاري تحميل البيانات...');
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            console.log('📂 تحميل من localStorage');
            storeData = JSON.parse(saved);
        } else {
            console.log(' تحميل من products.json');
            const response = await fetch('products.json');
            if (!response.ok) throw new Error('فشل في تحميل products.json');
            storeData = await response.json();
            saveToLocalStorage();
        }
        
        console.log('✅ تم تحميل البيانات:', storeData.products ? storeData.products.length : 0, 'منتج');
        renderAll();
    } catch (error) {
        console.error('❌ خطأ في تحميل البيانات:', error);
        showToast('خطأ في تحميل البيانات: ' + error.message, 'error');
        
        // بيانات افتراضية للطوارئ
        storeData = {
            storeInfo: { name: 'Champions Store', tagline: '', whatsapp: '963900000000', instagram: '', location: '' },
            categories: [
                { id: 'all', name: 'كل المنتجات', icon: '🏋️' },
                { id: 'creatine', name: 'كرياتين', icon: '💪' },
                { id: 'whey', name: 'واي بروتين', icon: '🥛' }
            ],
            products: []
        };
        renderAll();
    }
}

function saveToLocalStorage() {
    if (storeData) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(storeData));
    }
}

// ===== عرض كل شيء =====
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
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            const tabId = this.dataset.tab + 'Tab';
            const tabElement = document.getElementById(tabId);
            if (tabElement) {
                tabElement.classList.add('active');
            }
        });
    });
});

// ===== عرض المنتجات =====
function renderProducts() {
    const container = document.getElementById('productsTable');
    if (!container || !storeData || !storeData.products) {
        console.error('❌ لا يمكن عرض المنتجات');
        return;
    }
    
    const categories = storeData.categories.filter(c => c.id !== 'all');
    
    let html = '<div class="product-row header"><div>صورة</div><div>الاسم</div><div>السعر</div><div>الفئة</div><div>إجراءات</div></div>';
    
    storeData.products.forEach(product => {
        const cat = categories.find(c => c.id === product.category);
        html += '<div class="product-row">' +
            '<img src="' + product.image + '" alt="' + product.name + '" onerror="this.src=\'https://via.placeholder.com/60x60/1a1a1a/d4af37?text=No+Image\'">' +
            '<div><strong>' + product.name + '</strong>' +
            (product.badge ? '<br><small style="color:var(--gold-dark)">' + product.badge + '</small>' : '') +
            '</div>' +
            '<div>' + product.price + ' $</div>' +
            '<div>' + (cat ? cat.name : product.category) + '</div>' +
            '<div class="product-actions">' +
            '<button class="btn-edit" onclick="editProduct(' + product.id + ')">✏️</button>' +
            '<button class="btn-delete" onclick="deleteProduct(' + product.id + ')">️</button>' +
            '</div></div>';
    });
    
    container.innerHTML = html;
}

// ===== عرض معلومات المتجر =====
function renderStoreInfo() {
    if (!storeData || !storeData.storeInfo) return;
    const fields = ['storeName', 'storeTagline', 'storeWhatsapp', 'storeInstagram', 'storeLocation'];
    const keys = ['name', 'tagline', 'whatsapp', 'instagram', 'location'];
    
    fields.forEach(function(field, index) {
        const el = document.getElementById(field);
        if (el) el.value = storeData.storeInfo[keys[index]] || '';
    });
}

// ===== عرض الفئات في القائمة =====
function renderCategories() {
    const select = document.getElementById('productCategory');
    if (!select || !storeData || !storeData.categories) return;
    
    const categories = storeData.categories.filter(c => c.id !== 'all');
    select.innerHTML = categories.map(function(c) {
        return '<option value="' + c.id + '">' + c.icon + ' ' + c.name + '</option>';
    }).join('');
}

// ===== مودال المنتج =====
function openProductModal() {
    console.log('🔵 فتح مودال إضافة منتج');
    
    if (!storeData) {
        showToast('البيانات غير محمّلة. يرجى إعادة تحميل الصفحة', 'error');
        return;
    }
    
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
    
    const modal = document.getElementById('productModal');
    if (modal) {
        modal.classList.add('active');
        console.log('✅ تم فتح المودال');
    }
}

function closeProductModal() {
    const modal = document.getElementById('productModal');
    if (modal) modal.classList.remove('active');
    editingProductId = null;
}

function editProduct(id) {
    console.log('️ تعديل منتج:', id);
    
    if (!storeData || !storeData.products) {
        showToast('البيانات غير محمّلة', 'error');
        return;
    }
    
    const product = storeData.products.find(function(p) { return p.id === id; });
    if (!product) {
        showToast('المنتج غير موجود', 'error');
        return;
    }
    
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
    
    storeData.products = storeData.products.filter(function(p) { return p.id !== id; });
    saveToLocalStorage();
    renderProducts();
    showToast('تم حذف المنتج ✓');
}

// ===== معالجة رفع الصورة =====
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('imagePreview');
        preview.src = e.target.result;
        preview.style.display = 'block';
        document.getElementById('productImageUrl').value = '';
    };
    reader.readAsDataURL(file);
}

// ===== حفظ المنتج =====
function saveProduct() {
    console.log('💾 حفظ منتج');
    
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
    
    if (!image) {
        image = 'https://via.placeholder.com/400x400/1a1a1a/d4af37?text=No+Image';
    }
    
    if (editingProductId) {
        const product = storeData.products.find(function(p) { return p.id === editingProductId; });
        if (product) {
            product.name = name;
            product.category = category;
            product.price = price;
            product.oldPrice = oldPrice;
            product.description = description;
            product.badge = badge;
            product.image = image;
        }
    } else {
        const newId = storeData.products.length > 0 
            ? Math.max.apply(null, storeData.products.map(function(p) { return p.id; })) + 1 
            : 1;
        storeData.products.push({
            id: newId,
            name: name,
            category: category,
            price: price,
            oldPrice: oldPrice,
            description: description,
            badge: badge,
            image: image
        });
    }
    
    saveToLocalStorage();
    renderProducts();
    closeProductModal();
    showToast(editingProductId ? 'تم تحديث المنتج ✓' : 'تمت إضافة المنتج ✓');
}

// ===== حفظ معلومات المتجر =====
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

// ===== معالجة اللوغو =====
function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
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
    } else if (preview.src && preview.src.startsWith('data:')) {
        storeData.storeInfo.logo = preview.src;
    }
    
    saveToLocalStorage();
    showToast('تم حفظ اللوغو ✓');
}

// ===== تغيير كلمة المرور =====
function changePassword() {
    const current = document.getElementById('currentPassword').value;
    const newPass = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;
    
    const savedPassword = localStorage.getItem(PASSWORD_KEY) || DEFAULT_PASSWORD;
    const currentEncoded = btoa(current);
    
    if (currentEncoded !== savedPassword) {
        showToast('كلمة المرور الحالية غير صحيحة', 'error');
        return;
    }
    
    if (newPass.length < 6) {
        showToast('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
        return;
    }
    
    if (newPass !== confirm) {
        showToast('كلمتا المرور غير متطابقتين', 'error');
        return;
    }
    
    localStorage.setItem(PASSWORD_KEY, btoa(newPass));
    
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
    
    showToast('تم تغيير كلمة المرور بنجاح ✓');
}

// ===== تصدير البيانات =====
function exportData() {
    if (!storeData) {
        showToast('لا توجد بيانات للتصدير', 'error');
        return;
    }
    
    const dataStr = JSON.stringify(storeData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('تم تصدير البيانات ✓');
}

// ===== استيراد البيانات =====
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
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

// ===== الإشعارات =====
function showToast(message, type) {
    type = type || 'success';
    const toast = document.getElementById('toast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.style.background = type === 'error' ? 'var(--danger)' : 'var(--success)';
    toast.classList.add('show');
    setTimeout(function() { toast.classList.remove('show'); }, 3000);
}

// إغلاق المودال عند النقر خارجه
document.addEventListener('DOMContentLoaded', function() {
    const productModal = document.getElementById('productModal');
    if (productModal) {
        productModal.addEventListener('click', function(e) {
            if (e.target.id === 'productModal') closeProductModal();
        });
    }
});
// ===== GitHub Sync Injection & Logic =====
window.addEventListener('DOMContentLoaded', () => {
    const nav = document.querySelector('.admin-tabs');
    const main = document.querySelector('.admin-content');
    
    if (nav && !document.getElementById('githubTabBtn')) {
        // إضافة الزر
        const btn = document.createElement('button');
        btn.className = 'tab-btn';
        btn.id = 'githubTabBtn';
        btn.dataset.tab = 'github';
        btn.textContent = ' GitHub Sync';
        nav.appendChild(btn);

        // إضافة المحتوى
        if (main && !document.getElementById('githubTab')) {
            const section = document.createElement('section');
            section.className = 'tab-content';
            section.id = 'githubTab';
            section.innerHTML = \
                <h2>مزامنة مع GitHub</h2>
                <div class="github-form">
                    <div class="info-box">
                        <strong> كيف يعمل؟</strong><br>
                        يرسل التعديلات إلى GitHub كـ Pull Request. أنت توافق عليه، وCloudflare ينشره تلقائياً.
                        <br><br>
                        <strong>🔑 إنشاء Token:</strong>
                        <a href="https://github.com/settings/tokens/new?scopes=repo&description=Champions%20Store%20Admin" target="_blank">اضغط هنا لإنشاء Token</a>
                    </div>
                    <div class="form-group"><label>GitHub Username</label><input type="text" id="githubUsername" placeholder="your-username"></div>
                    <div class="form-group"><label>Repository Name</label><input type="text" id="githubRepo" placeholder="champions-store"></div>
                    <div class="form-group"><label>Personal Access Token (PAT)</label><input type="password" id="githubToken" placeholder="ghp_xxxxxxxxxxxx"></div>
                    <div class="form-group"><label>اسم الـ Branch</label><input type="text" id="githubBranch" value="admin-update"></div>
                    <button class="btn-github" id="sendPrBtn" onclick="sendPullRequest()">🚀 إرسال Pull Request</button>
                    <div class="pr-status" id="prStatus"></div>
                    <div class="token-warning">⚠️ <strong>تنبيه:</strong> الـ Token يُحفظ في متصفحك فقط (localStorage).</div>
                </div>
            \;
            main.appendChild(section);
        }
    }
});

const GITHUB_STORAGE_KEY = 'championsGitHubConfig';

function loadGitHubConfig() {
    const saved = localStorage.getItem(GITHUB_STORAGE_KEY);
    if (saved) {
        try {
            const config = JSON.parse(saved);
            const u = document.getElementById('githubUsername'); if(u) u.value = config.username || '';
            const r = document.getElementById('githubRepo'); if(r) r.value = config.repo || '';
            const t = document.getElementById('githubToken'); if(t) t.value = config.token || '';
            const b = document.getElementById('githubBranch'); if(b) b.value = config.branch || 'admin-update';
        } catch (e) {}
    }
}

function saveGitHubConfig() {
    const config = {
        username: document.getElementById('githubUsername').value.trim(),
        repo: document.getElementById('githubRepo').value.trim(),
        token: document.getElementById('githubToken').value.trim(),
        branch: document.getElementById('githubBranch').value.trim() || 'admin-update'
    };
    localStorage.setItem(GITHUB_STORAGE_KEY, JSON.stringify(config));
    return config;
}

async function sendPullRequest() {
    const statusDiv = document.getElementById('prStatus');
    const sendBtn = document.getElementById('sendPrBtn');
    statusDiv.className = 'pr-status'; statusDiv.style.display = 'none';
    
    const config = saveGitHubConfig();
    if (!config.username || !config.repo || !config.token) {
        statusDiv.className = 'pr-status error'; statusDiv.textContent = 'يرجى ملء جميع الحقول'; statusDiv.style.display = 'block'; return;
    }
    
    sendBtn.disabled = true; sendBtn.textContent = '⏳ جاري الإرسال...';
    
    try {
        const baseUrl = \https://api.github.com/repos/\/\\;
        const headers = { 'Authorization': \	oken \\, 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json' };
        
        statusDiv.className = 'pr-status'; statusDiv.style.background = '#e3f2fd'; statusDiv.style.borderRight = '4px solid #2196F3'; statusDiv.style.color = '#0d47a1'; statusDiv.style.display = 'block'; statusDiv.textContent = '📥 قراءة الملف الحالي...';
        
        let defaultBranch = 'main';
        try { const repoInfo = await fetch(baseUrl, { headers }); const repoData = await repoInfo.json(); defaultBranch = repoData.default_branch || 'main'; } catch (e) {}
        
        const fileResponse = await fetch(\\/contents/products.json?ref=\\, { headers });
        if (!fileResponse.ok) throw new Error('فشل في قراءة products.json. تأكد من البيانات.');
        const fileData = await fileResponse.json();
        
        statusDiv.textContent = '🌿 إنشاء branch جديد...';
        const branchName = \dmin-update-\\;
        const refResponse = await fetch(\\/git/refs/heads/\\, { headers });
        const refData = await refResponse.json();
        
        await fetch(\\/git/refs\, { method: 'POST', headers, body: JSON.stringify({ ref: \efs/heads/\\, sha: refData.object.sha }) });
        
        statusDiv.textContent = '📝 تحديث المنتجات...';
        const newContent = JSON.stringify(storeData, null, 2);
        const encodedContent = btoa(unescape(encodeURIComponent(newContent)));
        
        await fetch(\\/contents/products.json\, { method: 'PUT', headers, body: JSON.stringify({ message: '🤖 تحديث تلقائي من لوحة الإدارة', content: encodedContent, sha: fileData.sha, branch: branchName }) });
        
        statusDiv.textContent = '🚀 إنشاء Pull Request...';
        const prResponse = await fetch(\\/pulls\, { method: 'POST', headers, body: JSON.stringify({ title: '🔄 تحديث المنتجات من لوحة الإدارة', body: 'تم إنشاؤه تلقائياً من لوحة إدارة Champions Store.', head: branchName, base: defaultBranch }) });
        
        if (!prResponse.ok) throw new Error('فشل في إنشاء PR.');
        const prData = await prResponse.json();
        
        statusDiv.className = 'pr-status success';
        statusDiv.innerHTML = \<strong>✅ تم بنجاح!</strong><br><br><a href="\" target="_blank">👉 اضغط هنا للموافقة على PR #\</a>\;
        showToast('تم إرسال Pull Request ✓');
        
    } catch (error) {
        statusDiv.className = 'pr-status error'; statusDiv.textContent = \❌ خطأ: \\;
    } finally {
        sendBtn.disabled = false; sendBtn.textContent = '🚀 إرسال Pull Request';
    }
}

// تحميل الإعدادات عند فتح التبويب
document.addEventListener('click', (e) => {
    if (e.target.dataset.tab === 'github') loadGitHubConfig();
});
