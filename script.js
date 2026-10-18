// ===== الإعدادات =====
const STORAGE_KEY = 'championsStoreData';
let storeData = null;
let allProducts = [];
let currentCategory = 'all';
let searchQuery = '';
let cart = JSON.parse(localStorage.getItem('championsCart')) || [];

// ===== تحميل البيانات =====
async function init() {
    try {
        console.log('🔄 جاري تحميل البيانات...');
        const response = await fetch('products.json?v=' + Date.now());
        if (!response.ok) throw new Error('HTTP ' + response.status);
        
        const raw = await response.json();
        console.log('📄 البيانات الخام:', raw);
        
        // ذكي: يتعامل مع جميع صيغ JSON
        if (Array.isArray(raw)) {
            // حالة 1: الملف مصفوفة منتجات مباشرة
            console.log('️ الملف بصيغة مصفوفة، يتم تحويله...');
            storeData = {
                storeInfo: { name: 'Champions Store', whatsapp: '963900000000', instagram: '', location: '', tagline: '' },
                categories: [
                    { id: 'all', name: 'كل المنتجات', icon: '🏋️' },
                    { id: 'creatine', name: 'كرياتين', icon: '💪' },
                    { id: 'whey', name: 'واي بروتين', icon: '🥛' },
                    { id: 'mass-gainer', name: 'ماس جينر', icon: '⚡' },
                    { id: 'amino', name: 'أحماض أمينية', icon: '' },
                    { id: 'pre-workout', name: 'بري وورك أوت', icon: '🔥' },
                    { id: 'vitamins', name: 'فيتامينات', icon: '💊' },
                    { id: 'fat-burner', name: 'حارق دهون', icon: '🔥' }
                ],
                products: raw
            };
        } else if (raw.products && Array.isArray(raw.products)) {
            // حالة 2: الصيغة الصحيحة
            storeData = raw;
        } else if (raw.data && raw.data.products) {
            // حالة 3: بعض الصيغ الأخرى
            storeData = raw.data;
        } else {
            throw new Error('صيغة JSON غير معروفة. المفتاح الموجود: ' + Object.keys(raw).join(', '));
        }
        
        // ضمان وجود categories
        if (!storeData.categories || storeData.categories.length === 0) {
            storeData.categories = [
                { id: 'all', name: 'كل المنتجات', icon: '️' },
                { id: 'creatine', name: 'كرياتين', icon: '💪' },
                { id: 'whey', name: 'واي بروتين', icon: '🥛' },
                { id: 'mass-gainer', name: 'ماس جينر', icon: '⚡' }
            ];
        }
        
        allProducts = storeData.products || [];
        console.log('✅ تم تحميل البيانات:', allProducts.length, 'منتج');
        
        // تحديث معلومات الاتصال
        if (storeData.storeInfo && storeData.storeInfo.whatsapp) {
            const wa = storeData.storeInfo.whatsapp;
            document.querySelectorAll('a[href*="wa.me"]').forEach(a => {
                a.href = 'https://wa.me/' + wa;
            });
        }
        
        // تحديث اللوغو
        if (storeData.storeInfo && storeData.storeInfo.logo) {
            document.querySelectorAll('.nav-logo, .about-image img').forEach(img => {
                img.src = storeData.storeInfo.logo;
            });
        }
        
        // تحديث اسم المتجر
        if (storeData.storeInfo && storeData.storeInfo.name) {
            document.title = storeData.storeInfo.name + ' | مكملات غذائية';
            const brandName = document.querySelector('.brand-name');
            if (brandName) brandName.textContent = storeData.storeInfo.name;
        }
        
        renderCategories();
        renderProducts();
        updateCartUI();
        setupEventListeners();
        
    } catch (error) {
        console.error('❌ خطأ في التحميل:', error);
        document.getElementById('productGrid').innerHTML =
            '<div style="text-align:center;padding:40px;color:red;"><h3>حدث خطأ في تحميل المنتجات</h3><p>' + error.message + '</p><p>افتح Console (F12) لرؤية التفاصيل</p></div>';
    }
}

function renderCategories() {
    const container = document.getElementById('categoryFilters');
    if (!container || !storeData.categories) return;
    container.innerHTML = storeData.categories.map(cat =>
        '<button class="filter-btn ' + (cat.id === 'all' ? 'active' : '') + '" data-category="' + cat.id + '">' + cat.icon + ' ' + cat.name + '</button>'
    ).join('');
}

function renderProducts() {
    const grid = document.getElementById('productGrid');
    const noResults = document.getElementById('noResults');
    if (!grid) return;

    let filtered = allProducts;
    if (currentCategory !== 'all') {
        filtered = filtered.filter(p => p.category === currentCategory);
    }
    if (searchQuery) {
        filtered = filtered.filter(p =>
            (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
        );
    }

    if (filtered.length === 0) {
        grid.innerHTML = '';
        if (noResults) noResults.style.display = 'block';
        return;
    }
    if (noResults) noResults.style.display = 'none';

    grid.innerHTML = filtered.map(product => {
        const category = storeData.categories.find(c => c.id === product.category);
        const badgeClass = product.badge === 'خصم' ? 'sale' : '';
        return '<div class="product-card">' +
            (product.badge ? '<span class="product-badge ' + badgeClass + '">' + product.badge + '</span>' : '') +
            '<img src="' + (product.image || '') + '" alt="' + (product.name || '') + '" class="product-image" onclick="showProductDetails(' + product.id + ')" onerror="this.src=\'https://via.placeholder.com/400x400/1a1a1a/d4af37?text=No+Image\'">' +
            '<div class="product-info">' +
            '<div class="product-category">' + (category ? category.icon + ' ' + category.name : '') + '</div>' +
            '<h3 class="product-name" onclick="showProductDetails(' + product.id + ')">' + (product.name || 'بدون اسم') + '</h3>' +
            '<div class="product-price">' +
            '<span class="current-price">' + (product.price || 0) + ' $</span>' +
            (product.oldPrice ? '<span class="old-price">' + product.oldPrice + ' $</span>' : '') +
            '</div>' +
            '<div class="product-actions">' +
            '<button class="add-to-cart-btn" onclick="addToCart(' + product.id + ')">🛒 أضف للسلة</button>' +
            '<button class="view-btn" onclick="showProductDetails(' + product.id + ')">👁️</button>' +
            '</div></div></div>';
    }).join('');
}

function showProductDetails(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    const category = storeData.categories.find(c => c.id === product.category);
    const modal = document.getElementById('productModal');
    const details = document.getElementById('productDetails');
    if (!modal || !details) return;

    details.innerHTML = '<img src="' + (product.image || '') + '" alt="' + (product.name || '') + '" class="product-detail-image" onerror="this.src=\'https://via.placeholder.com/400x400/1a1a1a/d4af37?text=No+Image\'">' +
        '<div class="product-detail-info">' +
        '<div class="product-category">' + (category ? category.icon + ' ' + category.name : '') + '</div>' +
        '<h2>' + (product.name || '') + '</h2>' +
        '<div class="price">' + (product.price || 0) + ' $' +
        (product.oldPrice ? '<span class="old-price" style="font-size:1.2rem;margin-right:10px;">' + product.oldPrice + ' $</span>' : '') +
        '</div>' +
        '<p class="description">' + (product.description || '') + '</p>' +
        '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
        '<button class="btn btn-primary" onclick="addToCart(' + product.id + ');closeProductModal();" style="flex:1;">🛒 أضف للسلة</button>' +
        '<button class="btn btn-outline" onclick="orderViaWhatsApp(' + product.id + ')" style="flex:1;background:var(--success);color:white;border-color:var(--success);">💬 اطلب عبر واتساب</button>' +
        '</div></div>';
    modal.classList.add('active');
}

function closeProductModal() {
    const modal = document.getElementById('productModal');
    if (modal) modal.classList.remove('active');
}

function addToCart(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({ id: product.id, name: product.name, price: product.price, image: product.image, quantity: 1 });
    }
    saveCart();
    updateCartUI();
    showNotification('تمت إضافة المنتج للسلة ✓');
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartUI();
    renderCartItems();
}

function updateQuantity(productId, change) {
    const item = cart.find(i => i.id === productId);
    if (!item) return;
    item.quantity += change;
    if (item.quantity <= 0) {
        removeFromCart(productId);
    } else {
        saveCart();
        updateCartUI();
        renderCartItems();
    }
}

function saveCart() {
    localStorage.setItem('championsCart', JSON.stringify(cart));
}

function updateCartUI() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    const el = document.getElementById('cartCount');
    if (el) el.textContent = count;
}

function renderCartItems() {
    const container = document.getElementById('cartItems');
    const footer = document.getElementById('cartFooter');
    if (!container) return;
    if (cart.length === 0) {
        container.innerHTML = '<div class="empty-cart">🛒 السلة فارغة</div>';
        if (footer) footer.style.display = 'none';
        return;
    }
    container.innerHTML = cart.map(item =>
        '<div class="cart-item">' +
        '<img src="' + (item.image || '') + '" alt="' + (item.name || '') + '" onerror="this.src=\'https://via.placeholder.com/60x60/1a1a1a/d4af37?text=No+Image\'">' +
        '<div class="cart-item-info"><div class="cart-item-name">' + item.name + '</div><div class="cart-item-price">' + item.price + ' $</div></div>' +
        '<div class="cart-item-qty">' +
        '<button class="qty-btn" onclick="updateQuantity(' + item.id + ', -1)">-</button>' +
        '<span>' + item.quantity + '</span>' +
        '<button class="qty-btn" onclick="updateQuantity(' + item.id + ', 1)">+</button>' +
        '</div>' +
        '<button class="remove-btn" onclick="removeFromCart(' + item.id + ')">حذف</button>' +
        '</div>'
    ).join('');
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalEl = document.getElementById('totalPrice');
    if (totalEl) totalEl.textContent = total.toFixed(2) + ' $';
    if (footer) footer.style.display = 'block';
}

function openCartModal() {
    renderCartItems();
    const modal = document.getElementById('cartModal');
    if (modal) modal.classList.add('active');
}

function closeCartModal() {
    const modal = document.getElementById('cartModal');
    if (modal) modal.classList.remove('active');
}

function orderViaWhatsApp(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    const wa = storeData.storeInfo ? storeData.storeInfo.whatsapp : '963900000000';
    const storeName = storeData.storeInfo ? storeData.storeInfo.name : 'Champions Store';
    const message = 'مرحباً ' + storeName + ' 👋\n\nأريد طلب المنتج:\n📦 ' + product.name + '\n السعر: ' + product.price + '$\n\nشكراً لكم!';
    window.open('https://wa.me/' + wa + '?text=' + encodeURIComponent(message), '_blank');
}

function checkoutViaWhatsApp() {
    if (cart.length === 0) return;
    const wa = storeData.storeInfo ? storeData.storeInfo.whatsapp : '963900000000';
    const storeName = storeData.storeInfo ? storeData.storeInfo.name : 'Champions Store';
    let message = 'مرحباً ' + storeName + ' 👋\n\nأريد طلب المنتجات التالية:\n\n';
    let total = 0;
    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        message += (index + 1) + '. 📦 ' + item.name + '\n   الكمية: ' + item.quantity + ' | السعر: ' + itemTotal + '$\n\n';
    });
    message += '━━━━━━━━━━━━━━\n💰 المجموع الكلي: ' + total.toFixed(2) + ' $\n\n📍 العنوان: \n📱 رقم الهاتف: \n\nشكراً لكم!';
    window.open('https://wa.me/' + wa + '?text=' + encodeURIComponent(message), '_blank');
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = 'position:fixed;top:100px;right:20px;background:var(--success);color:white;padding:15px 25px;border-radius:10px;box-shadow:0 4px 15px rgba(0,0,0,0.2);z-index:3000;font-weight:bold;';
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
}

function setupEventListeners() {
    const filtersContainer = document.getElementById('categoryFilters');
    if (filtersContainer) {
        filtersContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn')) {
                document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                currentCategory = e.target.dataset.category;
                renderProducts();
            }
        });
    }
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            renderProducts();
        });
    }
    const cartBtn = document.getElementById('cartBtn');
    if (cartBtn) cartBtn.addEventListener('click', openCartModal);
    const closeCart = document.getElementById('closeCart');
    if (closeCart) closeCart.addEventListener('click', closeCartModal);
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) checkoutBtn.addEventListener('click', checkoutViaWhatsApp);
    const closeProduct = document.getElementById('closeProduct');
    if (closeProduct) closeProduct.addEventListener('click', closeProductModal);
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.remove('active');
        });
    });
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            const navLinks = document.querySelector('.nav-links');
            if (navLinks) navLinks.classList.toggle('active');
        });
    }
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            const navLinks = document.querySelector('.nav-links');
            if (navLinks) navLinks.classList.remove('active');
        });
    });
}

document.addEventListener('DOMContentLoaded', init);