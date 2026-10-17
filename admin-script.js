// ===== الإعدادات =====
const STORAGE_KEY = 'championsStoreData';
const PASSWORD_KEY = 'championsStorePassword';
const DEFAULT_PASSWORD = btoa('admin123');

let storeData = null;
let editingProductId = null;

// ===== التحقق من كلمة المرور =====
function checkPassword() {
    const input = document.getElementById('passwordInput').value;
    const savedPassword = localStorage.getItem(PASSWORD_KEY) || DEFAULT_PASSWORD;
    const inputEncoded = btoa(input);
    
    if (inputEncoded === savedPassword) {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'block';
        loadData();
        showToast('تم تسجيل الدخول بنجاح ✓');
    } else {
        document.getElementById('errorMsg').textContent = 'كلمة المرور غير صحيحة';
        document.getElementById('passwordInput').value = '';
    }
}

document.getElementById('passwordInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') checkPassword();
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
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            storeData = JSON.parse(saved);
        } else {
            const response = await fetch('products.json');
            storeData = await response.json();
            saveToLocalStorage();
        }
        console.log('✅ تم تحميل البيانات:', storeData);
        renderAll();
    } catch (error) {
        console.error('❌ خطأ في تحميل البيانات:', error);
        showToast('خطأ في تحميل البيانات: ' + error.message, 'error');
    }
}

function saveToLocalStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storeData));
}

// ===== عرض كل شيء =====
function renderAll() {
    if (!storeData) {
        console.error(' storeData غير محمّل');
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
        const tabId = btn.dataset.tab + 'Tab';
        const tabElement = document.getElementById(tabId);
        if (tabElement) {
            tabElement.classList.add('active');
        }
    });
});

// ===== عرض المنتجات =====
function renderProducts() {
    if (!storeData || !storeData.products) {
        console.error('❌ لا توجد منتجات');
        return;
    }
    
    const container = document.getElementById('productsTable');
    const categories = storeData.categories.filter(c => c.id !== 'all');
    
    let html = `<div class="product-row header">
        <div>صورة</div>
        <div>الاسم</div>
        <div>السعر</div>
        <div>الفئة</div>
        <div>إجراءات</div>
    </div>`;
    
    storeData.products.forEach(product => {
        const cat = categories.find(c => c.id === product.category);
        html += `<div class="product-row">
            <img src="${product.image}" alt="${product.name}" 
                 onerror="this.src='https://via.placeholder.com/60x60/1a1a1a/d4af37?text=No+Image'">
            <div>
                <strong>${product.name}</strong>
                ${product.badge ? `<br><small style="color:var(--gold-dark)">${product.badge}</small>` : ''}
            </div>
            <div>${product.price} $</div>
            <div>${cat ? cat.name : product.category}</div>
            <div class="product-actions">
                <button class="btn-edit" onclick="editProduct(${product.id})">✏️</button>
                <button class="btn-delete" onclick="deleteProduct(${product.id})">🗑️</button>
            </div>
        </div>`;
    });
    
    container.innerHTML = html;
}

// ===== عرض معلومات المتجر =====
function renderStoreInfo() {
    if (!storeData || !storeData.storeInfo) return;
    document.getElementById('storeName').value = storeData.storeInfo.name || '';
    document.getElementById('storeTagline').value = storeData.storeInfo.tagline || '';
    document.getElementById('storeWhatsapp').value = storeData.storeInfo.whatsapp || '';
    document.getElementById('storeInstagram').value = storeData.storeInfo.instagram || '';
    document.getElementById('storeLocation').value = storeData.storeInfo.location || '';
}

// ===== عرض الفئات في القائمة =====
function renderCategories() {
    if (!storeData || !storeData.categories) return;
    const select = document.getElementById('productCategory');
    const categories = storeData.categories.filter(c => c.id !== 'all');
    select.innerHTML = categories.map(c => 
        `<option value="${c.id}">${c.icon} ${c.name}</option>`
    ).join('');
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
    modal.classList.add('active');
    console.log('✅ تم فتح المودال');
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
    editingProductId = null;
}

function editProduct(id) {
    console.log(' تعديل منتج:', id);
    
    if (!storeData) {
        showToast('البيانات غير محمّلة', 'error');
        return;
    }
    
    const product = storeData.products.find(p => p.id === id);
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
    
    storeData.products = storeData.products.filter(p => p.id !== id);
    saveToLocalStorage();
    renderProducts();
    showToast('تم حذف المنتج ✓');
}

// ===== معالجة رفع الصورة =====
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

// ===== حفظ المنتج =====
function saveProduct() {
    console.log(' حفظ منتج');
    
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
        const product = storeData.products.find(p => p.id === editingProductId);
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
            ? Math.max(...storeData.products.map(p => p.id)) + 1 
            : 1;
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
    showToast(editingProductId ? 'تم تحديث المنتج ✓' : 'تمت إضافة المنتج ✓');
}

// ===== حفظ معلومات المتجر =====
function saveStoreInfo() {
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
    reader.onload = (e) => {
        document.getElementById('logoPreview').src = e.target.result;
        document.getElementById('logoUrl').value = '';
    };
    reader.readAsDataURL(file);
}

function saveLogo() {
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

// ===== الإشعارات =====
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.style.background = type === 'error' ? 'var(--danger)' : 'var(--success)';
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// إغلاق المودال عند النقر خارجه
document.getElementById('productModal').addEventListener('click', (e) => {
    if (e.target.id === 'productModal') closeProductModal();
});

// ===== تشخيص عند التحميل =====
window.addEventListener('load', () => {
    console.log('🚀 تم تحميل الصفحة');
    console.log(' عناصر DOM:');
    console.log('  - loginScreen:', document.getElementById('loginScreen') ? 'موجود' : 'مفقود');
    console.log('  - adminPanel:', document.getElementById('adminPanel') ? 'موجود' : 'مفقود');
    console.log('  - productModal:', document.getElementById('productModal') ? 'موجود' : 'مفقود');
    console.log('  - productsTable:', document.getElementById('productsTable') ? 'موجود' : 'مفقود');
});