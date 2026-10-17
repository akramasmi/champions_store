// ===== الإعدادات =====
const STORAGE_KEY = 'championsStoreData';
const PASSWORD_KEY = 'championsStorePassword';
const DEFAULT_PASSWORD = btoa('admin123');
const GITHUB_STORAGE_KEY = 'championsGitHubConfig';

let storeData = null;
let editingProductId = null;

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

async function loadData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            storeData = JSON.parse(saved);
        } else {
            const response = await fetch('products.json?v=' + Date.now());
            if (!response.ok) throw new Error('فشل في تحميل products.json');
            storeData = await response.json();
            saveToLocalStorage();
        }
        console.log('✅ تم تحميل البيانات:', storeData.products ? storeData.products.length : 0, 'منتج');
        renderAll();
    } catch (error) {
        console.error('❌ خطأ:', error);
        showToast('خطأ في تحميل البيانات: ' + error.message, 'error');
    }
}

function saveToLocalStorage() {
    if (storeData) localStorage.setItem(STORAGE_KEY, JSON.stringify(storeData));
}

function renderAll() {
    if (!storeData) return;
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
    if (!container || !storeData || !storeData.products) return;
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
        console.log('💾 تم حفظ اللوغو كرابط:', url);
    } else if (preview.src && preview.src.startsWith('data:') && preview.src !== window.location.href) {
        storeData.storeInfo.logo = preview.src;
        console.log('💾 تم حفظ اللوغو كـ Base64');
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

// ===== GitHub Sync =====
function loadGitHubConfig() {
    const saved = localStorage.getItem(GITHUB_STORAGE_KEY);
    if (saved) {
        try {
            const config = JSON.parse(saved);
            const u = document.getElementById('githubUsername'); if (u) u.value = config.username || '';
            const r = document.getElementById('githubRepo'); if (r) r.value = config.repo || '';
            const t = document.getElementById('githubToken'); if (t) t.value = config.token || '';
            const b = document.getElementById('githubBranch'); if (b) b.value = config.branch || 'admin-update';
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
    statusDiv.className = 'pr-status';
    statusDiv.style.display = 'none';

    const config = saveGitHubConfig();
    if (!config.username || !config.repo || !config.token) {
        statusDiv.className = 'pr-status error';
        statusDiv.textContent = 'يرجى ملء جميع الحقول';
        statusDiv.style.display = 'block';
        return;
    }

    sendBtn.disabled = true;
    sendBtn.textContent = '⏳ جاري الإرسال...';

    try {
        const baseUrl = 'https://api.github.com/repos/' + config.username + '/' + config.repo;
        const headers = {
            'Authorization': 'token ' + config.token,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        };

        statusDiv.className = 'pr-status';
        statusDiv.style.background = '#e3f2fd';
        statusDiv.style.borderRight = '4px solid #2196F3';
        statusDiv.style.color = '#0d47a1';
        statusDiv.style.display = 'block';
        statusDiv.textContent = '🔍 التحقق من المستودع...';

        const repoCheck = await fetch(baseUrl, { headers });
        if (!repoCheck.ok) {
            const err = await repoCheck.json();
            throw new Error('فشل في الوصول إلى المستودع: ' + (err.message || 'تأكد من صحة البيانات'));
        }

        statusDiv.textContent = '📥 قراءة الملف الحالي...';
        let defaultBranch = 'main';
        try {
            const repoInfo = await repoCheck.json();
            defaultBranch = repoInfo.default_branch || 'main';
        } catch (e) {}

        const fileResponse = await fetch(baseUrl + '/contents/products.json?ref=' + defaultBranch, { headers });
        if (!fileResponse.ok) {
            const err = await fileResponse.json();
            throw new Error('فشل في قراءة products.json: ' + (err.message || 'تأكد من وجود الملف'));
        }
        const fileData = await fileResponse.json();

        statusDiv.textContent = '🌿 إنشاء branch جديد...';
        const branchName = 'admin-update-' + Date.now();
        const refResponse = await fetch(baseUrl + '/git/refs/heads/' + defaultBranch, { headers });
        if (!refResponse.ok) throw new Error('فشل في قراءة معلومات الـ branch');
        const refData = await refResponse.json();

        const createBranchResponse = await fetch(baseUrl + '/git/refs', {
            method: 'POST',
            headers,
            body: JSON.stringify({ ref: 'refs/heads/' + branchName, sha: refData.object.sha })
        });
        if (!createBranchResponse.ok) {
            const err = await createBranchResponse.json();
            throw new Error('فشل في إنشاء branch: ' + (err.message || 'تأكد من صلاحيات الـ Token'));
        }

        statusDiv.textContent = '📝 تحديث المنتجات...';
        const newContent = JSON.stringify(storeData, null, 2);
        const encodedContent = btoa(unescape(encodeURIComponent(newContent)));

        const updateResponse = await fetch(baseUrl + '/contents/products.json', {
            method: 'PUT',
            headers,
            body: JSON.stringify({
                message: '🤖 تحديث تلقائي من لوحة الإدارة',
                content: encodedContent,
                sha: fileData.sha,
                branch: branchName
            })
        });
        if (!updateResponse.ok) {
            const err = await updateResponse.json();
            throw new Error('فشل في تحديث الملف: ' + (err.message || ''));
        }

        statusDiv.textContent = '🚀 إنشاء Pull Request...';
        const prResponse = await fetch(baseUrl + '/pulls', {
            method: 'POST',
            headers,
            body: JSON.stringify({
                title: '🔄 تحديث المنتجات من لوحة الإدارة',
                body: 'تم إنشاؤه تلقائياً من لوحة إدارة Champions Store.\n\n**التغييرات:**\n- تحديث ملف products.json\n- التاريخ: ' + new Date().toLocaleString('ar-SY'),
                head: branchName,
                base: defaultBranch
            })
        });
        if (!prResponse.ok) {
            const err = await prResponse.json();
            throw new Error('فشل في إنشاء PR: ' + (err.message || 'تأكد من صلاحيات الـ Token'));
        }
        const prData = await prResponse.json();

        statusDiv.className = 'pr-status success';
        statusDiv.innerHTML = '<strong>✅ تم بنجاح!</strong><br><br><a href="' + prData.html_url + '" target="_blank">👉 اضغط هنا للموافقة على PR #' + prData.number + '</a>';
        showToast('تم إرسال Pull Request ✓');

    } catch (error) {
        console.error('GitHub Sync Error:', error);
        statusDiv.className = 'pr-status error';
        statusDiv.textContent = '❌ خطأ: ' + error.message;
        statusDiv.style.display = 'block';
    } finally {
        sendBtn.disabled = false;
        sendBtn.textContent = ' إرسال Pull Request';
    }
}