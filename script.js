// ===== تحميل البيانات من localStorage إذا وجدت =====
const STORAGE_KEY = 'championsStoreData';
const savedData = localStorage.getItem(STORAGE_KEY);
if (savedData) {
    try {
        const parsed = JSON.parse(savedData);
        if (parsed.storeInfo) {
            document.addEventListener('DOMContentLoaded', () => {
                const whatsapp = parsed.storeInfo.whatsapp || '963900000000';
                document.querySelectorAll('a[href*="wa.me"]').forEach(a => {
                    a.href = `https://wa.me/${whatsapp}`;
                });
                
                if (parsed.storeInfo.logo && parsed.storeInfo.logo.startsWith('data:')) {
                    document.querySelectorAll('img[src="logo.png"]').forEach(img => {
                        img.src = parsed.storeInfo.logo;
                    });
                }
            });
        }
    } catch (e) {
        console.error('خطأ في قراءة البيانات المحفوظة', e);
    }
}
// ===== الإعدادات العامة =====
let storeData = null;
let allProducts = [];
let currentCategory = 'all';
let searchQuery = '';
let cart = JSON.parse(localStorage.getItem('championsCart')) || [];

// ===== تحميل البيانات =====
async function init() {
    try {
        const response = await fetch('products.json');
        storeData = await response.json();
        allProducts = storeData.products;
        
        renderCategories();
        renderProducts();
        updateCartUI();
        setupEventListeners();
    } catch (error) {
        console.error('خطأ في تحميل البيانات:', error);
        document.getElementById('productGrid').innerHTML = 
            '<p style="text-align:center;padding:40px;">حدث خطأ في تحميل المنتجات. يرجى تحديث الصفحة.</p>';
    }
}

// ===== عرض الفئات =====
function renderCategories() {
    const container = document.getElementById('categoryFilters');
    container.innerHTML = storeData.categories.map(cat => `
        <button class="filter-btn ${cat.id === 'all' ? 'active' : ''}" 
                data-category="${cat.id}">
            ${cat.icon} ${cat.name}
        </button>
    `).join('');
}

// ===== عرض المنتجات =====
function renderProducts() {
    const grid = document.getElementById('productGrid');
    const noResults = document.getElementById('noResults');
    
    let filtered = allProducts;
    
    // فلترة حسب الفئة
    if (currentCategory !== 'all') {
        filtered = filtered.filter(p => p.category === currentCategory);
    }
    
    // فلترة حسب البحث
    if (searchQuery) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.description.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }
    
    if (filtered.length === 0) {
        grid.innerHTML = '';
        noResults.style.display = 'block';
        return;
    }
    
    noResults.style.display = 'none';
    grid.innerHTML = filtered.map(product => {
        const category = storeData.categories.find(c => c.id === product.category);
        const badgeClass = product.badge === 'خصم' ? 'sale' : '';
        
        return `
            <div class="product-card">
                ${product.badge ? `<span class="product-badge ${badgeClass}">${product.badge}</span>` : ''}
                <img src="${product.image}" alt="${product.name}" 
                     class="product-image" 
                     onclick="showProductDetails(${product.id})"
                     onerror="this.src='https://via.placeholder.com/400x400/1a1a1a/d4af37?text=No+Image'">
                <div class="product-info">
                    <div class="product-category">${category ? category.icon + ' ' + category.name : ''}</div>
                    <h3 class="product-name" onclick="showProductDetails(${product.id})">${product.name}</h3>
                    <div class="product-price">
                        <span class="current-price">${product.price} $</span>
                        ${product.oldPrice ? `<span class="old-price">${product.oldPrice} $</span>` : ''}
                    </div>
                    <div class="product-actions">
                        <button class="add-to-cart-btn" onclick="addToCart(${product.id})">
                            🛒 أضف للسلة
                        </button>
                        <button class="view-btn" onclick="showProductDetails(${product.id})">
                            ️
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ===== عرض تفاصيل المنتج =====
function showProductDetails(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    const category = storeData.categories.find(c => c.id === product.category);
    const modal = document.getElementById('productModal');
    const details = document.getElementById('productDetails');
    
    details.innerHTML = `
        <img src="${product.image}" alt="${product.name}" class="product-detail-image"
             onerror="this.src='https://via.placeholder.com/400x400/1a1a1a/d4af37?text=No+Image'">
        <div class="product-detail-info">
            <div class="product-category">${category ? category.icon + ' ' + category.name : ''}</div>
            <h2>${product.name}</h2>
            <div class="price">
                ${product.price} $
                ${product.oldPrice ? `<span class="old-price" style="font-size:1.2rem;margin-right:10px;">${product.oldPrice} $</span>` : ''}
            </div>
            <p class="description">${product.description}</p>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
                <button class="btn btn-primary" onclick="addToCart(${product.id});closeProductModal();" style="flex:1;">
                    🛒 أضف للسلة
                </button>
                <button class="btn btn-outline" onclick="orderViaWhatsApp(${product.id})" style="flex:1;background:var(--success);color:white;border-color:var(--success);">
                    💬 اطلب عبر واتساب
                </button>
            </div>
        </div>
    `;
    
    modal.classList.add('active');
}

function closeProductModal() {
    document.getElementById('productModal').classList.remove('active');
}

// ===== إدارة السلة =====
function addToCart(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: 1
        });
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
    document.getElementById('cartCount').textContent = count;
}

function renderCartItems() {
    const container = document.getElementById('cartItems');
    const footer = document.getElementById('cartFooter');
    
    if (cart.length === 0) {
        container.innerHTML = '<div class="empty-cart">🛒 السلة فارغة</div>';
        footer.style.display = 'none';
        return;
    }
    
    container.innerHTML = cart.map(item => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.name}"
                 onerror="this.src='https://via.placeholder.com/60x60/1a1a1a/d4af37?text=No+Image'">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">${item.price} $</div>
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
    document.getElementById('totalPrice').textContent = total.toFixed(2) + ' $';
    footer.style.display = 'block';
}

function openCartModal() {
    renderCartItems();
    document.getElementById('cartModal').classList.add('active');
}

function closeCartModal() {
    document.getElementById('cartModal').classList.remove('active');
}

// ===== الطلب عبر واتساب =====
function orderViaWhatsApp(productId) {
    const product = allProducts.find(p => p.id === productId);
    if (!product) return;
    
    const message = `مرحباً Champions Store 👋\n\nأريد طلب المنتج:\n📦 ${product.name}\n السعر: ${product.price}$\n\nشكراً لكم!`;
    const url = `https://wa.me/${storeData.storeInfo.whatsapp}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

function checkoutViaWhatsApp() {
    if (cart.length === 0) return;
    
    let message = `مرحباً Champions Store 👋\n\nأريد طلب المنتجات التالية:\n\n`;
    let total = 0;
    
    cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        message += `${index + 1}. 📦 ${item.name}\n`;
        message += `   الكمية: ${item.quantity} | السعر: ${itemTotal}$\n\n`;
    });
    
    message += `━━━━━━━━━━━━━━\n`;
    message += `💰 المجموع الكلي: ${total.toFixed(2)} $\n\n`;
    message += `📍 العنوان: \n`;
    message += `📱 رقم الهاتف: \n\n`;
    message += `شكراً لكم!`;
    
    const url = `https://wa.me/${storeData.storeInfo.whatsapp}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
}

// ===== الإشعارات =====
function showNotification(message) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: var(--success);
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 3000;
        font-weight: bold;
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// ===== مستمعي الأحداث =====
function setupEventListeners() {
    // فلاتر الفئات
    document.getElementById('categoryFilters').addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            e.target.classList.add('active');
            currentCategory = e.target.dataset.category;
            renderProducts();
        }
    });
    
    // البحث
    document.getElementById('searchInput').addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderProducts();
    });
    
    // السلة
    document.getElementById('cartBtn').addEventListener('click', openCartModal);
    document.getElementById('closeCart').addEventListener('click', closeCartModal);
    document.getElementById('checkoutBtn').addEventListener('click', checkoutViaWhatsApp);
    
    // مودال المنتج
    document.getElementById('closeProduct').addEventListener('click', closeProductModal);
    
    // إغلاق المودال عند النقر خارجه
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    });
    
    // قائمة الجوال
    document.getElementById('menuToggle').addEventListener('click', () => {
        document.querySelector('.nav-links').classList.toggle('active');
    });
    
    // إغلاق القائمة عند النقر على رابط
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            document.querySelector('.nav-links').classList.remove('active');
        });
    });
}

// ===== أنماط الإشعار =====
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// ===== بدء التطبيق =====
document.addEventListener('DOMContentLoaded', init);