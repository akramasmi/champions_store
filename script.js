const STORAGE_KEY = 'championsStoreData';
let storeData = null;
let allProducts = [];
let filteredProducts = []; // مصفوفة مفلترة للتعامل معها
let currentCategory = 'all';
let searchQuery = '';
let cart = JSON.parse(localStorage.getItem('championsCart')) || [];

// إعدادات التحميل التدريجي
const PRODUCTS_PER_PAGE = 12; // عدد المنتجات في كل دفعة
let currentPage = 1;
let isLoading = false;
let scrollObserver = null;

async function init() {
    try {
        const response = await fetch('products.json?v=' + Date.now());
        if (!response.ok) throw new Error('فشل في تحميل المنتجات');
        storeData = await response.json();
        allProducts = storeData.products || [];
        filteredProducts = [...allProducts]; // نسخ أولي
        
        updateSiteContent();
        renderCategories();
        resetAndRender(); // بدء العرض بالتجزئة
        updateCartUI();
        setupEventListeners();
        setupInfiniteScroll(); // تفعيل المراقب
    } catch (error) {
        console.error('خطأ:', error);
        document.getElementById('productGrid').innerHTML = 
            '<div style="text-align:center;padding:40px;color:red;"><h3>خطأ في تحميل المنتجات</h3></div>';
    }
}

// ===== دوال العرض المحسنة =====

function resetAndRender() {
    currentPage = 1;
    const grid = document.getElementById('productGrid');
    grid.innerHTML = ''; // مسح الشبكة
    renderBatch(true); // عرض الدفعة الأولى
}

function renderBatch(isReset = false) {
    if (isLoading) return;
    isLoading = true;

    const grid = document.getElementById('productGrid');
    const noResults = document.getElementById('noResults');
    const sentinel = document.getElementById('scroll-sentinel');

    // إزالة مؤشر التحميل القديم إن وجد
    if (sentinel) sentinel.innerHTML = '<div class="loading-spinner"></div>';

    const start = (currentPage - 1) * PRODUCTS_PER_PAGE;
    const end = start + PRODUCTS_PER_PAGE;
    const batch = filteredProducts.slice(start, end);

    if (isReset) {
        grid.innerHTML = '';
    }

    if (batch.length === 0) {
        if (filteredProducts.length === 0) {
            noResults.style.display = 'block';
        }
        if (sentinel) sentinel.style.display = 'none';
        isLoading = false;
        return;
    }

    noResults.style.display = 'none';

    // بناء HTML للدفعة الجديدة فقط (أسرع بكثير من بناء الكل)
    const html = batch.map(product => {
        const category = storeData.categories.find(c => c.id === product.category);
        const badgeClass = product.badge === 'خصم' ? 'sale' : '';
        return `<div class="product-card">
            ${product.badge ? `<span class="product-badge ${badgeClass}">${product.badge}</span>` : ''}
            <div class="product-image-wrapper">
<img src="${product.image}" alt="${product.name}" class="product-image" 
     loading="lazy" decoding="async" fetchpriority="low"
     sizes="(max-width: 768px) 50vw, 33vw"
     onclick="showProductDetails(${product.id})">
            </div>
            <div class="product-info">
                <div class="product-category">${category ? category.icon + ' ' + category.name : ''}</div>
                <div class="product-name-price">
                    <h3 class="product-name" onclick="showProductDetails(${product.id})">${product.name}</h3>
                    <div class="product-price">
                        <span class="current-price">${product.price}$</span>
                        ${product.oldPrice ? `<span class="old-price">${product.oldPrice}$</span>` : ''}
                    </div>
                </div>
                <div class="product-actions">
                    <button class="add-to-cart-btn" onclick="addToCart(${product.id}, this)">🛒 أضف</button>
                    <button class="view-btn" onclick="showProductDetails(${product.id})">👁️</button>
                </div>
            </div>
        </div>`;
    }).join('');

    // إضافة الدفعة الجديدة للشبكة
    grid.insertAdjacentHTML('beforeend', html);

    currentPage++;
    isLoading = false;

    // إذا انتهت جميع المنتجات، أخفِ مؤشر التحميل وأوقف المراقب
    if (end >= filteredProducts.length) {
        if (sentinel) {
            sentinel.innerHTML = '<p style="color:var(--text-secondary); font-size:0.9rem;">تم عرض جميع المنتجات</p>';
        }
        if (scrollObserver) scrollObserver.disconnect();
    } else {
        if (sentinel) sentinel.style.display = 'flex';
    }
}

// ===== إعداد المراقب للتمرير اللانهائي =====
function setupInfiniteScroll() {
    if (scrollObserver) scrollObserver.disconnect();

    const grid = document.getElementById('productGrid');
    let sentinel = document.getElementById('scroll-sentinel');
    
    if (!sentinel) {
        sentinel = document.createElement('div');
        sentinel.id = 'scroll-sentinel';
        sentinel.style.display = 'none';
        grid.appendChild(sentinel);
    }

    const options = {
        root: null,
        rootMargin: '200px', // بدء التحميل قبل الوصول للنهاية بـ 200 بكسل لتجربة سلسة
        threshold: 0.1
    };

    scrollObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !isLoading) {
            renderBatch(false);
        }
    }, options);

    scrollObserver.observe(sentinel);
}

// ===== تحديث المحتوى (نفس السابق) =====
function updateSiteContent() {
    if (!storeData || !storeData.storeInfo) return;
    const info = storeData.storeInfo;

    if (info.name) {
        document.title = info.name + ' | مكملات غذائية';
        document.querySelectorAll('.brand-name, .footer-brand h3').forEach(el => {
            el.innerHTML = el.innerHTML.replace(/Champions\s*<span.*?>Store<\/span>/i, `${info.name} <span class="gold">Store</span>`);
        });
    }
    if (info.tagline) {
        const heroSub = document.querySelector('.hero-subtitle');
        if (heroSub) heroSub.textContent = info.tagline;
    }
    if (info.location) {
        const heroDesc = document.querySelector('.hero-desc');
        if (heroDesc) heroDesc.textContent = info.location;
    }
    if (info.whatsapp) {
        const waUrl = `https://wa.me/${info.whatsapp}`;
        document.querySelectorAll('a[href*="wa.me"]').forEach(a => { a.href = waUrl; });
    }
    if (info.logo) {
        document.querySelectorAll('.nav-logo, .about-image img, .footer-logo').forEach(img => {
            img.src = info.logo;
        });
    }
    if (storeData.about) {
        const aboutTitle = document.querySelector('.about-text h3');
        if (aboutTitle && storeData.about.title) aboutTitle.textContent = storeData.about.title;
        const aboutDesc = document.querySelector('.about-text > p');
        if (aboutDesc && storeData.about.description) aboutDesc.textContent = storeData.about.description;
        if (storeData.about.features) {
            const featuresList = document.querySelector('.about-list');
            if (featuresList) {
                const features = storeData.about.features.split('\n').filter(f => f.trim());
                featuresList.innerHTML = features.map(f => `<li>${f}</li>`).join('');
            }
        }
    }
}

function renderCategories() {
    const container = document.getElementById('categoryFilters');
    if (!container || !storeData.categories) return;
    container.innerHTML = storeData.categories.map(cat => 
        `<button class="filter-btn ${cat.id === 'all' ? 'active' : ''}" data-category="${cat.id}">${cat.icon} ${cat.name}</button>`
    ).join('');
}

// ===== دوال السلة والمنتج (نفس السابقة مع تحسينات طفيفة) =====
function showProductDetails(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    const category = storeData.categories.find(c => c.id === product.category);
    const modal = document.getElementById('productModal');
    const details = document.getElementById('productDetails');

    details.innerHTML = `
        <img src="${product.image}" alt="${product.name}" class="product-detail-image">
        <div class="product-detail-info">
            <div class="product-category">${category ? category.icon + ' ' + category.name : ''}</div>
            <h2>${product.name}</h2>
            <div class="price">${product.price}$ ${product.oldPrice ? `<span class="old-price" style="font-size:1.2rem;margin-right:10px;">${product.oldPrice}$</span>` : ''}</div>
            <p class="description">${product.description || ''}</p>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
                <button class="btn btn-primary" onclick="addToCart(${product.id}, this);closeProductModal();" style="flex:1;">🛒 أضف للسلة</button>
                <button class="btn btn-outline" onclick="orderViaWhatsApp(${product.id})" style="flex:1;">💬 اطلب عبر واتساب</button>
            </div>
        </div>
    `;
    modal.classList.add('active');
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
}

function addToCart(productId, btnElement) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) existingItem.quantity++;
    else cart.push({ id: product.id, name: product.name, price: product.price, image: product.image, quantity: 1 });
    saveCart();
    updateCartUI();
    
    if (btnElement) {
        const originalText = btnElement.innerHTML;
        btnElement.innerHTML = '✓ تمت';
        btnElement.classList.add('added');
        setTimeout(() => {
            btnElement.innerHTML = originalText;
            btnElement.classList.remove('added');
        }, 1500);
    }
    
    const cartBtn = document.getElementById('cartBtn');
    cartBtn.classList.add('pulse');
    setTimeout(() => cartBtn.classList.remove('pulse'), 400);
    
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
    if (item.quantity <= 0) removeFromCart(productId);
    else { saveCart(); updateCartUI(); renderCartItems(); }
}

function saveCart() { localStorage.setItem('championsCart', JSON.stringify(cart)); }

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
    container.innerHTML = cart.map(item => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.name}" loading="lazy">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">${item.price}$</div>
            </div>
            <div class="cart-item-qty">
                <button class="qty-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                <span>${item.quantity}</span>
                <button class="qty-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
            </div>
            <button class="remove-btn" onclick="removeFromCart(${item.id})">حذف</button>
        </div>
    `).join('');
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalEl = document.getElementById('totalPrice');
    if (totalEl) totalEl.textContent = total.toFixed(2) + '$';
    if (footer) footer.style.display = 'block';
}

function openCartModal() {
    renderCartItems();
    document.getElementById('cartModal').classList.add('active');
}

function closeCartModal() {
    document.getElementById('cartModal').classList.remove('active');
}

function orderViaWhatsApp(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    const wa = storeData.storeInfo ? storeData.storeInfo.whatsapp : '963900000000';
    const storeName = storeData.storeInfo ? storeData.storeInfo.name : 'Champions Store';
    const message = `مرحباً ${storeName} 👋\n\nأريد طلب المنتج:\n📦 ${product.name}\n💰 السعر: ${product.price}$\n\nشكراً لكم!`;
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(message)}`, '_blank');
}

function checkoutViaWhatsApp() {
    if (cart.length === 0) return;
    const wa = storeData.storeInfo ? storeData.storeInfo.whatsapp : '963900000000';
    const storeName = storeData.storeInfo ? storeData.storeInfo.name : 'Champions Store';
    let message = `مرحباً ${storeName} 👋\n\nأريد طلب المنتجات التالية:\n\n`;
    let total = 0;
    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        message += `${index + 1}. 📦 ${item.name}\n   الكمية: ${item.quantity} | السعر: ${itemTotal}$\n\n`;
    });
    message += `━━━━━━━━━━━━━━\n💰 المجموع الكلي: ${total.toFixed(2)}$\n\n📍 العنوان: \n📱 رقم الهاتف: \n\nشكراً لكم!`;
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(message)}`, '_blank');
}

function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = 'position:fixed;top:80px;right:20px;background:var(--success);color:white;padding:12px 20px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.3);z-index:3000;font-weight:600;';
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
}

// ===== مستمعي الأحداث (محدّث لإعادة التعيين عند البحث/التصفية) =====
function setupEventListeners() {
    const filtersContainer = document.getElementById('categoryFilters');
    if (filtersContainer) {
        filtersContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn')) {
                document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
                e.target.classList.add('active');
                currentCategory = e.target.dataset.category;
                
                // تصفية المنتجات وإعادة تعيين العرض
                if (currentCategory === 'all') {
                    filteredProducts = [...allProducts];
                } else {
                    filteredProducts = allProducts.filter(p => p.category === currentCategory);
                }
                resetAndRender();
                setupInfiniteScroll(); // إعادة تفعيل المراقب
            }
        });
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase();
            
            // تصفية المنتجات وإعادة تعيين العرض
            filteredProducts = allProducts.filter(p => 
                p.name.toLowerCase().includes(searchQuery) ||
                (p.description && p.description.toLowerCase().includes(searchQuery))
            );
            resetAndRender();
            setupInfiniteScroll(); // إعادة تفعيل المراقب
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
        modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });
    });
    
    const menuToggle = document.getElementById('menuToggle');
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            document.querySelector('.nav-links').classList.toggle('active');
        });
    }
    
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            document.querySelector('.nav-links').classList.remove('active');
        });
    });
}

// ===== بدء التطبيق =====
document.addEventListener('DOMContentLoaded', () => {
    init();
    
    const navbar = document.getElementById('navbar');
    let ticking = false;
    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                if (window.scrollY > 50) navbar.classList.add('scrolled');
                else navbar.classList.remove('scrolled');
                ticking = false;
            });
            ticking = true;
        }
    });
    
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
});
