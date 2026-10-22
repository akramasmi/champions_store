const STORAGE_KEY = 'championsStoreData';
let storeData = null;
let allProducts = [];
let filteredProducts = [];
let currentCategory = 'all';
let currentSort = 'default';
let searchQuery = '';
let cart = JSON.parse(localStorage.getItem('championsCart')) || [];

const CHUNK_SIZE = 12;
let currentChunk = 0;
let isRendering = false;
let scrollObserver = null;
let sentinelElement = null;

// ✅ صورة احتياطية مدمجة (Base64 SVG) - لا تسبب خطأ 404 أبداً
const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjUwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCBmaWxsPSIjMWMxYzFlIiB3aWR0aD0iNDAwIiBoZWlnaHQ9IjUwMCIvPjx0ZXh0IGZpbGw9IiNjOGEyNWQiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgeD0iNTAlIiB5PSI1MCUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';

function getImageUrl(imagePath) {
    if (!imagePath) return PLACEHOLDER_IMAGE;
    if (imagePath.startsWith('data:')) return imagePath;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return `images/${imagePath.split('/').pop().split('?')[0]}`;
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

async function init() {
    try {
        const grid = document.getElementById('productGrid');
        grid.innerHTML = `<div id="initial-loader" style="grid-column: 1 / -1; display: flex; justify-content: center; align-items: center; padding: 60px 0;"><div class="loading-spinner"></div></div>`;
        
        const response = await fetch('products.json?t=' + Date.now());
        if (!response.ok) throw new Error('فشل في تحميل المنتجات');
        
        const data = await response.json();
        if (!data || !data.products || !Array.isArray(data.products)) throw new Error('بيانات غير صحيحة');
        
        storeData = data;
        allProducts = data.products || [];
        filteredProducts = [...allProducts];
        
        updateSiteContent();
        renderContactSection();
        renderFooter();
        renderCategories();
        
        const initialLoader = document.getElementById('initial-loader');
        if (initialLoader) initialLoader.remove();
        
        currentChunk = 0;
        createSentinel();
        renderNextChunk();
        setupInfiniteScroll();
        updateCartUI();
        setupEventListeners();
        setupSortButtons();
        
    } catch (error) {
        console.error('❌ خطأ:', error);
        document.getElementById('productGrid').innerHTML = `
            <div style="text-align:center;padding:40px;color:var(--danger);">
                <h3>❌ خطأ في تحميل المنتجات</h3>
                <p style="margin-top:10px;color:var(--text-secondary);">${error.message}</p>
                <button onclick="location.reload()" style="margin-top:20px;padding:10px 20px;background:var(--gold);color:var(--primary);border:none;border-radius:8px;cursor:pointer;font-weight:600;">🔄 إعادة المحاولة</button>
            </div>`;
    }
}

function createSentinel() {
    const grid = document.getElementById('productGrid');
    const old = document.getElementById('scroll-sentinel');
    if (old) old.remove();
    sentinelElement = document.createElement('div');
    sentinelElement.id = 'scroll-sentinel';
    sentinelElement.style.cssText = 'height:60px;width:100%;display:flex;justify-content:center;align-items:center;margin-top:20px;';
    grid.appendChild(sentinelElement);
}

function applySorting() {
    if (currentSort === 'default') return;
    filteredProducts.sort((a, b) => {
        switch (currentSort) {
            case 'name-asc': return a.name.localeCompare(b.name, 'ar');
            case 'name-desc': return b.name.localeCompare(a.name, 'ar');
            case 'price-asc': return a.price - b.price;
            case 'price-desc': return b.price - a.price;
            case 'brand': return (a.brand || '').localeCompare(b.brand || '', 'ar');
            default: return 0;
        }
    });
}

function buildProductCard(product) {
    const category = storeData.categories.find(c => c.id === product.category);
    const badgeClass = product.badge === 'خصم' ? 'sale' : '';
    const imageSrc = getImageUrl(product.image);
    
    let metaHtml = '';
    const metaItems = [];
    if (product.brand) metaItems.push(`<span class="meta-item"><span class="meta-icon">🏢</span><span class="meta-value">${product.brand}</span></span>`);
    if (product.weight) metaItems.push(`<span class="meta-item"><span class="meta-icon">⚖️</span><span class="meta-value">${product.weight}</span></span>`);
    if (product.servings) metaItems.push(`<span class="meta-item"><span class="meta-icon">🥄</span><span class="meta-value">${product.servings} حصة</span></span>`);
    if (metaItems.length > 0) metaHtml = `<div class="product-meta">${metaItems.join('')}</div>`;
    
    return `<div class="product-card">
        ${product.badge ? `<span class="product-badge ${badgeClass}">${product.badge}</span>` : ''}
        <div class="product-image-wrapper">
            <img src="${imageSrc}" alt="${product.name}" class="product-image" loading="lazy" decoding="async"
                 onerror="handleImageError(this)" onclick="showProductDetails(${product.id})">
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
            ${metaHtml}
            <div class="product-actions">
                <button class="add-to-cart-btn" onclick="addToCart(${product.id}, this)">🛒 أضف</button>
                <button class="view-btn" onclick="showProductDetails(${product.id})">📋 تفاصيل</button>
            </div>
        </div>
    </div>`;
}

function renderNextChunk() {
    if (isRendering) return;
    isRendering = true;
    const grid = document.getElementById('productGrid');
    const noResults = document.getElementById('noResults');
    const start = currentChunk * CHUNK_SIZE;
    const end = start + CHUNK_SIZE;
    const chunkProducts = filteredProducts.slice(start, end);
    
    if (filteredProducts.length === 0) {
        grid.innerHTML = '';
        if (noResults) noResults.style.display = 'block';
        if (sentinelElement) sentinelElement.style.display = 'none';
        isRendering = false; return;
    }
    if (noResults) noResults.style.display = 'none';
    if (chunkProducts.length === 0) {
        if (sentinelElement) sentinelElement.style.display = 'none';
        isRendering = false; return;
    }
    if (sentinelElement) {
        sentinelElement.style.display = 'flex';
        sentinelElement.innerHTML = '<div class="loading-spinner"></div>';
    }
    
    const html = chunkProducts.map(p => buildProductCard(p)).join('');
    if (sentinelElement) sentinelElement.insertAdjacentHTML('beforebegin', html);
    else grid.insertAdjacentHTML('beforeend', html);
    
    currentChunk++;
    isRendering = false;
    if (end >= filteredProducts.length && sentinelElement) sentinelElement.style.display = 'none';
}

function resetAndRender() {
    currentChunk = 0;
    const grid = document.getElementById('productGrid');
    grid.querySelectorAll('.product-card').forEach(c => c.remove());
    createSentinel();
    renderNextChunk();
    setupInfiniteScroll();
}

function setupInfiniteScroll() {
    if (scrollObserver) scrollObserver.disconnect();
    if (!sentinelElement) return;
    scrollObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !isRendering) {
            if (currentChunk * CHUNK_SIZE < filteredProducts.length) {
                if ('requestIdleCallback' in window) requestIdleCallback(() => renderNextChunk());
                else setTimeout(() => renderNextChunk(), 100);
            } else {
                scrollObserver.disconnect();
            }
        }
    }, { rootMargin: '300px' });
    scrollObserver.observe(sentinelElement);
}

function setupSortButtons() {
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentSort = btn.dataset.sort;
            applyFiltersAndSort();
            resetAndRender();
        });
    });
}

function applyFiltersAndSort() {
    filteredProducts = currentCategory === 'all' ? [...allProducts] : allProducts.filter(p => p.category === currentCategory);
    if (searchQuery) {
        filteredProducts = filteredProducts.filter(p => 
            p.name.toLowerCase().includes(searchQuery) ||
            (p.description && p.description.toLowerCase().includes(searchQuery)) ||
            (p.brand && p.brand.toLowerCase().includes(searchQuery))
        );
    }
    applySorting();
}

function updateSiteContent() {
    if (!storeData || !storeData.storeInfo) return;
    const info = storeData.storeInfo;
    if (info.name) {
        document.title = info.name + ' | مكملات غذائية';
        document.querySelectorAll('.brand-name, .footer-brand h3').forEach(el => {
            el.innerHTML = el.innerHTML.replace(/Champions\s*<span.*?>Store<\/span>/i, `${info.name} <span class="gold">Store</span>`);
        });
    }
    if (info.tagline) { const h = document.querySelector('.hero-subtitle'); if (h) h.textContent = info.tagline; }
    if (info.location) { const h = document.querySelector('.hero-desc'); if (h) h.textContent = info.location; }
    if (info.whatsapp) {
        const url = `https://wa.me/${info.whatsapp}`;
        document.querySelectorAll('a[href*="wa.me"]').forEach(a => a.href = url);
    }
    if (info.logo) {
        const url = getImageUrl(info.logo);
        document.querySelectorAll('.nav-logo, .about-image img, .footer-logo').forEach(img => {
            img.src = url;
            img.onerror = function() { this.style.display = 'none'; };
        });
    }
    if (storeData.about) {
        const t = document.querySelector('.about-text h3');
        if (t && storeData.about.title) t.textContent = storeData.about.title;
        const d = document.querySelector('.about-text > p');
        if (d && storeData.about.description) d.textContent = storeData.about.description;
        if (storeData.about.features) {
            const list = document.querySelector('.about-list');
            if (list) list.innerHTML = storeData.about.features.split('\n').filter(f => f.trim()).map(f => `<li>${f}</li>`).join('');
        }
    }
}

function renderContactSection() {
    const grid = document.getElementById('contactGrid');
    if (!grid || !storeData || !storeData.storeInfo) return;
    const info = storeData.storeInfo;
    const wa = info.whatsapp || '963900000000';
    const insta = info.instagram || 'champions_store';
    const loc = info.location || 'دمشق - سوريا';
    const email = info.email || '';
    
    let html = `
        <a href="https://wa.me/${wa}" target="_blank" class="contact-card">
            <div class="contact-icon">💬</div><h3>واتساب</h3><p>للطلب والاستفسار</p>
        </a>
        <a href="https://instagram.com/${insta}" target="_blank" class="contact-card">
            <div class="contact-icon">📸</div><h3>إنستغرام</h3><p>تابعنا للعروض</p>
        </a>
        <div class="contact-card">
            <div class="contact-icon">📍</div><h3>موقعنا</h3><p>${loc}</p>
        </div>`;
    if (email) html += `<a href="mailto:${email}" class="contact-card"><div class="contact-icon">📧</div><h3>البريد</h3><p>${email}</p></a>`;
    grid.innerHTML = html;
}

function renderFooter() {
    if (!storeData || !storeData.storeInfo) return;
    const info = storeData.storeInfo;
    const fd = document.getElementById('footerDescription');
    if (fd && info.footerDescription) fd.textContent = info.footerDescription;
    
    const fc = document.getElementById('footerContact');
    if (fc) {
        let html = '<h4>تواصل</h4>';
        if (info.whatsapp) html += `<p>📱 واتساب: +${info.whatsapp}</p>`;
        if (info.location) html += `<p>📍 ${info.location}</p>`;
        if (info.email) html += `<p>📧 ${info.email}</p>`;
        if (info.instagram) html += `<p>📸 @${info.instagram}</p>`;
        fc.innerHTML = html;
    }
    const cp = document.getElementById('footerCopyright');
    if (cp && info.copyright) cp.textContent = info.copyright;
}

function renderCategories() {
    const c = document.getElementById('categoryFilters');
    if (!c || !storeData.categories) return;
    c.innerHTML = storeData.categories.map(cat => 
        `<button class="filter-btn ${cat.id === 'all' ? 'active' : ''}" data-category="${cat.id}">${cat.icon} ${cat.name}</button>`
    ).join('');
}

function showCategoryDescription(categoryId) {
    const box = document.getElementById('categoryDescription');
    const title = document.getElementById('categoryDescTitle');
    const text = document.getElementById('categoryDescText');
    if (categoryId === 'all') { box.style.display = 'none'; return; }
    const cat = storeData.categories.find(c => c.id === categoryId);
    if (!cat || !cat.description || cat.description.trim() === '') { box.style.display = 'none'; return; }
    title.textContent = `${cat.icon} ${cat.name}`;
    text.textContent = cat.description;
    box.style.display = 'block';
}

function closeCategoryDescription() { document.getElementById('categoryDescription').style.display = 'none'; }

function showProductDetails(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    const category = storeData.categories.find(c => c.id === product.category);
    const modal = document.getElementById('productModal');
    const details = document.getElementById('productDetails');
    const imageSrc = getImageUrl(product.image);
    
    let metaHtml = '';
    const metaItems = [];
    if (product.brand) metaItems.push(`<span class="meta-item"><span class="meta-icon">🏢</span><span class="meta-value">${product.brand}</span></span>`);
    if (product.weight) metaItems.push(`<span class="meta-item"><span class="meta-icon">⚖️</span><span class="meta-value">${product.weight}</span></span>`);
    if (product.servings) metaItems.push(`<span class="meta-item"><span class="meta-icon">🥄</span><span class="meta-value">${product.servings} حصة</span></span>`);
    if (metaItems.length > 0) metaHtml = `<div class="product-detail-meta">${metaItems.join('')}</div>`;

    details.innerHTML = `
        <img src="${imageSrc}" alt="${product.name}" class="product-detail-image" onerror="handleImageError(this)">
        <div class="product-detail-info">
            <div class="product-category">${category ? category.icon + ' ' + category.name : ''}</div>
            <h2>${product.name}</h2>
            <div class="price">${product.price}$ ${product.oldPrice ? `<span class="old-price" style="font-size:1.2rem;margin-right:10px;">${product.oldPrice}$</span>` : ''}</div>
            ${metaHtml}
            <p class="description">${product.description || ''}</p>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
                <button class="btn btn-primary" onclick="addToCart(${product.id}, this);closeProductModal();" style="flex:1;">🛒 أضف للسلة</button>
                <button class="btn btn-outline" onclick="orderViaWhatsApp(${product.id})" style="flex:1;">💬 اطلب عبر واتساب</button>
            </div>
        </div>`;
    modal.classList.add('active');
}

function closeProductModal() { document.getElementById('productModal').classList.remove('active'); }

function addToCart(productId, btnElement) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    const existing = cart.find(item => item.id === productId);
    if (existing) existing.quantity++;
    else cart.push({ id: product.id, name: product.name, price: product.price, image: product.image, quantity: 1 });
    saveCart(); updateCartUI();
    if (btnElement) {
        const orig = btnElement.innerHTML;
        btnElement.innerHTML = '✓ تمت';
        btnElement.classList.add('added');
        setTimeout(() => { btnElement.innerHTML = orig; btnElement.classList.remove('added'); }, 1500);
    }
    const cartBtn = document.getElementById('cartBtn');
    cartBtn.classList.add('pulse');
    setTimeout(() => cartBtn.classList.remove('pulse'), 400);
    showNotification('تمت إضافة المنتج للسلة ✓');
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart(); updateCartUI(); renderCartItems();
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
            <img src="${getImageUrl(item.image)}" alt="${item.name}" loading="lazy" onerror="handleImageError(this)">
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
        </div>`).join('');
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalEl = document.getElementById('totalPrice');
    if (totalEl) totalEl.textContent = total.toFixed(2) + '$';
    if (footer) footer.style.display = 'block';
}

function openCartModal() { renderCartItems(); document.getElementById('cartModal').classList.add('active'); }
function closeCartModal() { document.getElementById('cartModal').classList.remove('active'); }

function orderViaWhatsApp(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    const wa = storeData.storeInfo ? storeData.storeInfo.whatsapp : '963900000000';
    const name = storeData.storeInfo ? storeData.storeInfo.name : 'Champions Store';
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(`مرحباً ${name} 👋\n\nأريد طلب المنتج:\n📦 ${product.name}\n💰 السعر: ${product.price}$\n\nشكراً لكم!`)}`, '_blank');
}

function checkoutViaWhatsApp() {
    if (cart.length === 0) return;
    const wa = storeData.storeInfo ? storeData.storeInfo.whatsapp : '963900000000';
    const name = storeData.storeInfo ? storeData.storeInfo.name : 'Champions Store';
    let msg = `مرحباً ${name} 👋\n\nأريد طلب المنتجات التالية:\n\n`;
    let total = 0;
    cart.forEach((item, i) => {
        const t = item.price * item.quantity;
        total += t;
        msg += `${i + 1}. 📦 ${item.name}\n   الكمية: ${item.quantity} | السعر: ${t}$\n\n`;
    });
    msg += `━━━━━━━━━━━━━━\n💰 المجموع الكلي: ${total.toFixed(2)}$\n\n📍 العنوان: \n📱 رقم الهاتف: \n\nشكراً لكم!`;
    window.open(`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`, '_blank');
}

function showNotification(message) {
    const n = document.createElement('div');
    n.textContent = message;
    n.style.cssText = 'position:fixed;top:80px;right:20px;background:var(--success);color:white;padding:12px 20px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.3);z-index:3000;font-weight:600;';
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 2000);
}

function setupEventListeners() {
    const fc = document.getElementById('categoryFilters');
    if (fc) {
        fc.addEventListener('click', (e) => {
            const btn = e.target.closest('.filter-btn');
            if (btn) {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentCategory = btn.dataset.category;
                applyFiltersAndSort();
                resetAndRender();
                showCategoryDescription(currentCategory);
            }
        });
    }
    const si = document.getElementById('searchInput');
    if (si) {
        let to;
        si.addEventListener('input', (e) => {
            clearTimeout(to);
            to = setTimeout(() => {
                searchQuery = e.target.value.toLowerCase();
                applyFiltersAndSort();
                resetAndRender();
            }, 300);
        });
    }
    const cb = document.getElementById('cartBtn');
    if (cb) cb.addEventListener('click', openCartModal);
    const cc = document.getElementById('closeCart');
    if (cc) cc.addEventListener('click', closeCartModal);
    const chb = document.getElementById('checkoutBtn');
    if (chb) chb.addEventListener('click', checkoutViaWhatsApp);
    const cp = document.getElementById('closeProduct');
    if (cp) cp.addEventListener('click', closeProductModal);
    document.querySelectorAll('.modal').forEach(m => {
        m.addEventListener('click', (e) => { if (e.target === m) m.classList.remove('active'); });
    });
    const mt = document.getElementById('menuToggle');
    if (mt) mt.addEventListener('click', () => document.querySelector('.nav-links').classList.toggle('active'));
    document.querySelectorAll('.nav-links a').forEach(l => {
        l.addEventListener('click', () => document.querySelector('.nav-links').classList.remove('active'));
    });
}

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
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', function (e) {
            e.preventDefault();
            const t = document.querySelector(this.getAttribute('href'));
            if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });
});
