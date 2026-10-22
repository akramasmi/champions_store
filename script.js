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

const PLACEHOLDER_IMAGE = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjUwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCBmaWxsPSIjMWMxYzFlIiB3aWR0aD0iNDAwIiBoZWlnaHQ9IjUwMCIvPjx0ZXh0IGZpbGw9IiNjOGEyNWQiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgeD0iNTAlIiB5PSI1MCUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==';

// ✅ أيقونات SVG الرسمية
const ICONS = {
    whatsapp: `<svg viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>`,
    
    instagram: `<svg viewBox="0 0 24 24"><defs><linearGradient id="igGrad" x1="0%" y1="100%" x2="100%" y2="0%"><stop offset="0%" stop-color="#FD5"/><stop offset="50%" stop-color="#FF543E"/><stop offset="100%" stop-color="#C837AB"/></linearGradient></defs><path fill="url(#igGrad)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>`,
    
    location: `<svg viewBox="0 0 24 24" fill="#c8a25d"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 010-5 2.5 2.5 0 010 5z"/></svg>`,
    
    email: `<svg viewBox="0 0 24 24" fill="#0a84ff"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>`
};

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
    const c = img.src;
    if (c.includes('/images/')) { img.src = c.replace('/images/', '/imgs/'); return; }
    if (c.includes('/imgs/')) { img.src = c.replace('/imgs/', '/images/'); return; }
    if (c.includes('images/') && !c.includes('/images/')) { img.src = c.replace('images/', 'imgs/'); return; }
    if (c.endsWith('.webp')) { img.src = c.replace('.webp', '.png'); return; }
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

// ✅ بناء بطاقة المنتج مع دعم Sold Out
function buildProductCard(product) {
    const category = storeData.categories.find(c => c.id === product.category);
    const badgeClass = product.badge === 'خصم' ? 'sale' : '';
    const imageSrc = getImageUrl(product.image);
    const isSoldOut = product.soldOut === true;
    
    let metaHtml = '';
    const metaItems = [];
    if (product.brand) metaItems.push(`<span class="meta-item"><span class="meta-icon">🏢</span><span class="meta-value">${product.brand}</span></span>`);
    if (product.weight) metaItems.push(`<span class="meta-item"><span class="meta-icon">⚖️</span><span class="meta-value">${product.weight}</span></span>`);
    if (product.servings) metaItems.push(`<span class="meta-item"><span class="meta-icon">🥄</span><span class="meta-value">${product.servings} حصة</span></span>`);
    if (metaItems.length > 0) metaHtml = `<div class="product-meta">${metaItems.join('')}</div>`;
    
    // شارة Sold Out المائلة
    const soldOutBadge = isSoldOut ? `<div class="sold-out-badge">Sold Out</div>` : '';
    
    // كلاس Sold Out للبطاقة
    const soldOutClass = isSoldOut ? 'sold-out' : '';
    
    // زر الإضافة
    const addToCartBtn = isSoldOut 
        ? `<button class="add-to-cart-btn" disabled>🛒 أضف</button>`
        : `<button class="add-to-cart-btn" onclick="addToCart(${product.id}, this)">🛒 أضف</button>`;
    
    return `<div class="product-card ${soldOutClass}">
        ${product.badge ? `<span class="product-badge ${badgeClass}">${product.badge}</span>` : ''}
        <div class="product-image-wrapper">
            ${soldOutBadge}
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
                ${addToCartBtn}
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

// ✅ إصلاح مشكلة اللوغو - fallback ذكي
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
    
    // ✅ إصلاح اللوغو: إذا كان يشير إلى logo.png بأي شكل، استخدم الرابط المحلي
    if (info.logo) {
        let logoUrl = info.logo;
        const logoFileName = logoUrl.split('/').pop().split('?')[0].toLowerCase();
        
        // إذا كان اسم الملف هو logo.png/webp/jpg، استخدم الرابط المحلي
        if (logoFileName === 'logo.png' || logoFileName === 'logo.webp' || logoFileName === 'logo.jpg' || logoFileName === 'logo') {
            logoUrl = 'logo.png';
        } else {
            logoUrl = getImageUrl(logoUrl);
        }
        
        document.querySelectorAll('.nav-logo, .about-image img, .footer-logo').forEach(img => {
            img.src = logoUrl;
            // ✅ إذا فشل التحميل، أعد إلى logo.png المحلي (لا تُخفِ الصورة أبداً)
            img.onerror = function() {
                if (!this.dataset.fallback) {
                    this.dataset.fallback = '1';
                    this.src = 'logo.png';
                }
            };
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

// ✅ قسم التواصل بأيقونات SVG رسمية
function renderContactSection() {
    const grid = document.getElementById('contactGrid');
    if (!grid || !storeData || !storeData.storeInfo) return;
    const info = storeData.storeInfo;
    const wa = info.whatsapp || '963900000000';
    const insta = info.instagram || 'champions_store';
    const loc = info.location || 'دمشق - سوريا';
    const email = info.email || '';
    
    grid.innerHTML = `
        <a href="https://wa.me/${wa}" target="_blank" class="contact-card">
            <div class="contact-icon whatsapp">${ICONS.whatsapp}</div>
            <h3>واتساب</h3>
            <p>للطلب والاستفسار</p>
        </a>
        <a href="https://instagram.com/${insta}" target="_blank" class="contact-card">
            <div class="contact-icon instagram">${ICONS.instagram}</div>
            <h3>إنستغرام</h3>
            <p>تابعنا للعروض</p>
        </a>
        <div class="contact-card">
            <div class="contact-icon location">${ICONS.location}</div>
            <h3>موقعنا</h3>
            <p>${loc}</p>
        </div>
        ${email ? `
        <a href="mailto:${email}" class="contact-card">
            <div class="contact-icon email">${ICONS.email}</div>
            <h3>البريد</h3>
            <p>${email}</p>
        </a>` : ''}
    `;
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

// ✅ عرض تفاصيل المنتج مع دعم Sold Out
function showProductDetails(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    const category = storeData.categories.find(c => c.id === product.category);
    const modal = document.getElementById('productModal');
    const details = document.getElementById('productDetails');
    const imageSrc = getImageUrl(product.image);
    const isSoldOut = product.soldOut === true;
    
    let metaHtml = '';
    const metaItems = [];
    if (product.brand) metaItems.push(`<span class="meta-item"><span class="meta-icon">🏢</span><span class="meta-value">${product.brand}</span></span>`);
    if (product.weight) metaItems.push(`<span class="meta-item"><span class="meta-icon">⚖️</span><span class="meta-value">${product.weight}</span></span>`);
    if (product.servings) metaItems.push(`<span class="meta-item"><span class="meta-icon">🥄</span><span class="meta-value">${product.servings} حصة</span></span>`);
    if (metaItems.length > 0) metaHtml = `<div class="product-detail-meta">${metaItems.join('')}</div>`;

    // ✅ شارة Sold Out في المودال
    const soldOutBadge = isSoldOut ? `<div class="product-detail-sold-out">⛔ نفذت الكمية - Sold Out</div>` : '';
    
    // ✅ زر الإضافة معطل إذا نفذت الكمية
    const addToCartBtn = isSoldOut
        ? `<button class="btn btn-primary btn-disabled" disabled>⛔ نفذت الكمية</button>`
        : `<button class="btn btn-primary" onclick="addToCart(${product.id}, this);closeProductModal();" style="flex:1;">🛒 أضف للسلة</button>`;

    details.innerHTML = `
        <img src="${imageSrc}" alt="${product.name}" class="product-detail-image" onerror="handleImageError(this)">
        <div class="product-detail-info">
            <div class="product-category">${category ? category.icon + ' ' + category.name : ''}</div>
            <h2>${product.name}</h2>
            ${soldOutBadge}
            <div class="price">${product.price}$ ${product.oldPrice ? `<span class="old-price" style="font-size:1.2rem;margin-right:10px;">${product.oldPrice}$</span>` : ''}</div>
            ${metaHtml}
            <p class="description">${product.description || ''}</p>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
                ${addToCartBtn}
                <button class="btn btn-outline" onclick="orderViaWhatsApp(${product.id})" style="flex:1;">💬 اطلب عبر واتساب</button>
            </div>
        </div>`;
    modal.classList.add('active');
}

function closeProductModal() { document.getElementById('productModal').classList.remove('active'); }

function addToCart(productId, btnElement) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    // ✅ منع الإضافة إذا نفذت الكمية
    if (product.soldOut) {
        showNotification('⛔ هذا المنتج نفذت كميته', 'error');
        return;
    }
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

function showNotification(message, type = 'success') {
    const n = document.createElement('div');
    n.textContent = message;
    const bgColor = type === 'error' ? 'var(--danger)' : 'var(--success)';
    n.style.cssText = `position:fixed;top:80px;right:20px;background:${bgColor};color:white;padding:12px 20px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.3);z-index:3000;font-weight:600;`;
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
