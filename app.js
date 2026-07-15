// App JavaScript - Azka Media with Firebase Integration

(function() {
  // --- FIREBASE INITIALIZATION ---
  const firebaseConfig = {
    apiKey: "AIzaSyAQ-liQwlYamt4auCTxFn5XI5LKw9oNLY4",
    authDomain: "azka-media.firebaseapp.com",
    projectId: "azka-media",
    storageBucket: "azka-media.firebasestorage.app",
    messagingSenderId: "968783289519",
    appId: "1:968783289519:web:a79f3f509e60dd908dc85a",
    measurementId: "G-TGZ5NCE88R"
  };

  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();

  // --- STATE MANAGEMENT ---
  let state = {
    settings: { shopName: "Azka Media", address: "", phone: "", currency: "Rp" },
    products: [],
    services: [],
    transactions: []
  };
  let currentCart = [];
  let tempSpareparts = [];
  let isListenersInitialized = false;
  let currentPreviewTrx = null;

  // Real-time synchronization from Firestore
  function initFirebaseListeners() {
    if (isListenersInitialized) return;
    isListenersInitialized = true;

    // 1. Settings Listener
    db.collection("settings").doc("shop").onSnapshot(doc => {
      if (doc.exists) {
        state.settings = doc.data();
        updateShopBranding();
      } else {
        // If settings doc doesn't exist, create it with default
        db.collection("settings").doc("shop").set(window.INITIAL_DATA.settings);
      }
    });

    // 2. Products Listener
    db.collection("products").onSnapshot(snapshot => {
      const prods = [];
      snapshot.forEach(doc => {
        prods.push({ id: doc.id, ...doc.data() });
      });

      if (prods.length > 0) {
        state.products = prods;
        // Trigger renders if views are active
        if (document.getElementById('view-pos').classList.contains('active')) renderPOSProducts();
        if (document.getElementById('view-settings').classList.contains('active')) renderSettingsProducts();
      } else {
        // Seed default products
        window.INITIAL_DATA.products.forEach(p => {
          const { id, ...data } = p;
          db.collection("products").doc(id).set(data);
        });
      }
    });

    // 3. Service Configurations Listener
    db.collection("services").onSnapshot(snapshot => {
      const svcs = [];
      snapshot.forEach(doc => {
        svcs.push({ id: doc.id, ...doc.data() });
      });

      if (svcs.length > 0) {
        state.services = svcs;
        if (document.getElementById('view-settings').classList.contains('active')) renderSettingsServiceConfigs();
      } else {
        // Seed default service config
        window.INITIAL_DATA.services.forEach(s => {
          const { id, ...data } = s;
          db.collection("services").doc(id).set(data);
        });
      }
    });

    // 4. Transactions (Sales, Services, Printing) Listener
    db.collection("transactions").onSnapshot(snapshot => {
      const trxs = [];
      snapshot.forEach(doc => {
        trxs.push({ id: doc.id, ...doc.data() });
      });

      // Sort newest first
      trxs.sort((a, b) => new Date(b.date) - new Date(a.date));
      state.transactions = trxs;

      if (trxs.length === 0) {
        // Seed default transactions history
        window.INITIAL_DATA.transactions.forEach(t => {
          db.collection("transactions").doc(t.id).set(t);
        });
        return;
      }

      // Re-render currently active view
      const activeView = document.querySelector('.module-view.active');
      if (activeView) {
        const id = activeView.id;
        if (id === 'view-dashboard') renderDashboard();
        else if (id === 'view-service') renderServiceList();
        else if (id === 'view-printing') renderPrintingList();
        else if (id === 'view-reports') renderReports();
      }
    });
  }

  // --- INITIALIZATION ---
  document.addEventListener('DOMContentLoaded', () => {
    initFirebaseListeners();
    initApp();
    setupEventListeners();
    renderActiveModule('dashboard');
  });

  function initApp() {
    updateShopBranding();
    populatePOSCategoryFilter();
  }

  function updateShopBranding() {
    document.getElementById('sidebar-shop-name').textContent = state.settings.shopName;
    document.getElementById('topbar-date').textContent = getFormattedDate(new Date());
  }

  // Helper date formatting
  function getFormattedDate(dateObj) {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    const dayName = days[dateObj.getDay()];
    const dateNum = dateObj.getDate();
    const monthName = months[dateObj.getMonth()];
    const year = dateObj.getFullYear();
    
    return `${dayName}, ${dateNum} ${monthName} ${year}`;
  }

  function formatCurrency(amount) {
    return state.settings.currency + " " + Math.round(amount).toLocaleString('id-ID');
  }

  // --- NAVIGATION & DOM EVENTS ---
  function setupEventListeners() {
    const navItems = document.querySelectorAll('.nav-list .nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        const moduleName = item.getAttribute('data-module');
        renderActiveModule(moduleName);
      });
    });

    // Dark/Light Theme toggle
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeText = document.getElementById('theme-text');
    
    if (localStorage.getItem('dark_theme') === 'true') {
      document.body.classList.add('dark-theme');
      themeText.textContent = "Tema Terang";
    }

    themeToggleBtn.addEventListener('click', () => {
      document.body.classList.toggle('dark-theme');
      const isDark = document.body.classList.contains('dark-theme');
      localStorage.setItem('dark_theme', isDark);
      themeText.textContent = isDark ? "Tema Terang" : "Tema Gelap";
    });

    // Generic Modal Close handler
    const closeButtons = document.querySelectorAll('[data-close-modal]');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        closeAllModals();
      });
    });

    // POS events
    document.getElementById('pos-search').addEventListener('input', renderPOSProducts);
    document.getElementById('pos-category-filter').addEventListener('change', renderPOSProducts);
    document.getElementById('pos-discount').addEventListener('input', calculateCartTotal);
    document.getElementById('pos-cash').addEventListener('input', calculateChange);
    document.getElementById('btn-pos-checkout').addEventListener('click', handlePOSCheckout);

    // Service events
    document.getElementById('btn-new-service').addEventListener('click', () => openServiceModal());
    document.getElementById('btn-add-sparepart').addEventListener('click', handleAddSparepart);
    document.getElementById('service-form').addEventListener('submit', handleSaveService);
    document.getElementById('svc-type').addEventListener('change', (e) => {
      const selectedId = e.target.value;
      const svc = state.services.find(s => s.id === selectedId);
      if (svc) {
        document.getElementById('svc-price').value = svc.price;
      }
    });

    // Printing calculator events
    const calcInputs = ['print-paper-type', 'print-paper-size', 'print-color-mode', 'print-binding', 'print-pages', 'print-copies'];
    calcInputs.forEach(id => {
      document.getElementById(id).addEventListener('change', calculatePrintCost);
      document.getElementById(id).addEventListener('input', calculatePrintCost);
    });
    document.getElementById('btn-save-print-order').addEventListener('click', handleSavePrintOrder);

    // Reports filter events
    document.getElementById('report-type-filter').addEventListener('change', renderReports);
    document.getElementById('report-start-date').addEventListener('change', renderReports);
    document.getElementById('report-end-date').addEventListener('change', renderReports);
    document.getElementById('btn-export-csv').addEventListener('click', handleExportCSV);
    document.getElementById('btn-reset-data').addEventListener('click', handleResetData);

    // Settings forms
    document.getElementById('settings-shop-form').addEventListener('submit', handleSaveShopSettings);
    document.getElementById('btn-add-product-modal').addEventListener('click', () => openProductModal());
    document.getElementById('product-form').addEventListener('submit', handleSaveProduct);
    
    document.getElementById('btn-add-service-config-modal').addEventListener('click', () => openServiceConfigModal());
    document.getElementById('service-config-form').addEventListener('submit', handleSaveServiceConfig);

    // Layout change event inside receipt modal
    document.getElementById('receipt-layout-option').addEventListener('change', (e) => {
      renderReceiptContent(e.target.value);
    });

    // Receipt print button
    document.getElementById('btn-print-receipt').addEventListener('click', triggerPhysicalPrint);
  }

  function closeAllModals() {
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.classList.remove('active');
    });
  }

  function renderActiveModule(moduleName) {
    document.querySelectorAll('.module-view').forEach(view => {
      view.classList.remove('active');
    });

    const activeView = document.getElementById(`view-${moduleName}`);
    if (activeView) activeView.classList.add('active');

    const titleEl = document.getElementById('module-title');
    const descEl = document.getElementById('module-desc');

    switch (moduleName) {
      case 'dashboard':
        titleEl.textContent = "Dashboard";
        descEl.textContent = "Ringkasan operasional harian Anda";
        renderDashboard();
        break;
      case 'pos':
        titleEl.textContent = "Kasir Toko (POS)";
        descEl.textContent = "Transaksi penjualan barang & ATK cepat";
        renderPOS();
        break;
      case 'service':
        titleEl.textContent = "Jasa Servis & Perbaikan";
        descEl.textContent = "Kelola antrean perbaikan unit laptop, printer, PC";
        renderServiceList();
        break;
      case 'printing':
        titleEl.textContent = "Order Percetakan";
        descEl.textContent = "Kalkulator cetak dokumen & kelola antrean cetak";
        renderPrintingPage();
        break;
      case 'reports':
        titleEl.textContent = "Laporan Transaksi";
        descEl.textContent = "Riwayat kasir, jasa servis, dan percetakan";
        renderReports();
        break;
      case 'settings':
        titleEl.textContent = "Pengaturan Sistem";
        descEl.textContent = "Konfigurasi detail toko, produk, dan tarif jasa";
        renderSettings();
        break;
    }
  }

  // --- DASHBOARD MODULE ---
  function renderDashboard() {
    const today = new Date().toISOString().split('T')[0];
    let revenueToday = 0;
    let activeServices = 0;
    let activePrints = 0;

    state.transactions.forEach(t => {
      const tDate = t.date.split('T')[0];
      
      if (tDate === today && t.status !== 'cancelled') {
        if (t.type === 'sales') {
          revenueToday += t.grandTotal;
        } else if (t.type === 'printing') {
          revenueToday += t.grandTotal;
        } else if (t.type === 'service' && (t.status === 'completed' || t.status === 'picked_up')) {
          revenueToday += t.grandTotal;
        }
      }

      if (t.type === 'service' && t.status !== 'picked_up' && t.status !== 'cancelled') {
        activeServices++;
      }
      if (t.type === 'printing' && t.status !== 'completed' && t.status !== 'cancelled') {
        activePrints++;
      }
    });

    let lowStockCount = state.products.filter(p => p.stock < 5).length;

    document.getElementById('stat-revenue').textContent = formatCurrency(revenueToday);
    document.getElementById('stat-active-services').textContent = activeServices;
    document.getElementById('stat-active-prints').textContent = activePrints;
    document.getElementById('stat-low-stock').textContent = lowStockCount;

    renderDashboardChart();
    renderRecentActivities();
    renderActiveJobsTable();
  }

  function renderDashboardChart() {
    const chartContainer = document.getElementById('revenue-bar-chart');
    chartContainer.innerHTML = '';

    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d.toISOString().split('T')[0]);
    }

    const revenuePerDay = dates.map(dateStr => {
      let dailyTotal = 0;
      state.transactions.forEach(t => {
        const tDate = t.date.split('T')[0];
        if (tDate === dateStr && t.status !== 'cancelled') {
          dailyTotal += t.grandTotal;
        }
      });
      return {
        dateLabel: formatDateShort(new Date(dateStr)),
        revenue: dailyTotal
      };
    });

    const maxRev = Math.max(...revenuePerDay.map(d => d.revenue), 100000);

    revenuePerDay.forEach(day => {
      const heightPercent = (day.revenue / maxRev) * 80 + 5;

      const barWrapper = document.createElement('div');
      barWrapper.className = 'chart-bar-wrapper';

      const bar = document.createElement('div');
      bar.className = 'chart-bar';
      bar.style.height = `${heightPercent}%`;

      const tooltip = document.createElement('span');
      tooltip.className = 'chart-tooltip';
      tooltip.textContent = formatCurrency(day.revenue);
      bar.appendChild(tooltip);

      const label = document.createElement('span');
      label.className = 'chart-label';
      label.textContent = day.dateLabel;

      barWrapper.appendChild(bar);
      barWrapper.appendChild(label);
      chartContainer.appendChild(barWrapper);
    });
  }

  function formatDateShort(dateObj) {
    const day = dateObj.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${day} ${months[dateObj.getMonth()]}`;
  }

  function renderRecentActivities() {
    const listEl = document.getElementById('dashboard-activity-list');
    listEl.innerHTML = '';

    const sortedTrx = [...state.transactions]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    if (sortedTrx.length === 0) {
      listEl.innerHTML = `<div class="cart-empty" style="padding:1rem;"><p>Belum ada transaksi</p></div>`;
      return;
    }

    sortedTrx.forEach(t => {
      const item = document.createElement('div');
      item.className = 'activity-item';

      let color = 'var(--primary)';
      let textType = 'Penjualan';
      let title = `Invoice ${t.id}`;

      if (t.type === 'service') {
        color = 'var(--warning)';
        textType = 'Servis';
        title = `${t.customerName} - ${t.device}`;
      } else if (t.type === 'printing') {
        color = 'var(--info)';
        textType = 'Cetak';
        title = `${t.customerName} - ${t.documentName}`;
      }

      item.innerHTML = `
        <div class="activity-badge" style="background-color: ${color};"></div>
        <div class="activity-info">
          <div class="activity-title">${title}</div>
          <div class="activity-time">${textType} • ${formatTime(new Date(t.date))}</div>
        </div>
        <div class="activity-amount">${formatCurrency(t.grandTotal)}</div>
      `;

      listEl.appendChild(item);
    });
  }

  function formatTime(dateObj) {
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const mins = String(dateObj.getMinutes()).padStart(2, '0');
    return `${hours}:${mins}`;
  }

  function renderActiveJobsTable() {
    const tbody = document.getElementById('dashboard-active-jobs');
    tbody.innerHTML = '';

    const activeJobs = state.transactions.filter(t => {
      if (t.type === 'service' && t.status !== 'picked_up' && t.status !== 'cancelled') return true;
      if (t.type === 'printing' && t.status !== 'completed' && t.status !== 'cancelled') return true;
      return false;
    });

    if (activeJobs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Tidak ada pekerjaan aktif saat ini.</td></tr>`;
      return;
    }

    activeJobs.forEach(job => {
      const tr = document.createElement('tr');
      
      let typeBadge = '';
      let detailsText = '';
      let statusBadge = '';
      let actionBtn = '';

      if (job.type === 'service') {
        typeBadge = `<span class="badge warning">Servis</span>`;
        detailsText = `${job.device} (${job.complaint})`;
        
        let statusText = 'Antrean';
        let badgeClass = 'secondary';
        if (job.status === 'diagnosing') { statusText = 'Diagnosa'; badgeClass = 'info'; }
        else if (job.status === 'processing') { statusText = 'Pengerjaan'; badgeClass = 'warning'; }
        else if (job.status === 'completed') { statusText = 'Selesai'; badgeClass = 'success'; }

        statusBadge = `<span class="badge ${badgeClass}">${statusText}</span>`;
        
        actionBtn = `
          <button class="btn btn-secondary" onclick="window.App.openEditService('${job.id}')" style="padding: 0.35rem 0.6rem; font-size: 0.75rem;">
            Update Status
          </button>
        `;
      } else {
        typeBadge = `<span class="badge info">Cetak</span>`;
        detailsText = `${job.documentName} (${job.pages} hal, ${job.copies} set)`;

        let statusText = 'Antrean';
        let badgeClass = 'secondary';
        if (job.status === 'printing') { statusText = 'Mencetak'; badgeClass = 'warning'; }

        statusBadge = `<span class="badge ${badgeClass}">${statusText}</span>`;

        actionBtn = `
          <button class="btn btn-success" onclick="window.App.completePrintOrder('${job.id}')" style="padding: 0.35rem 0.6rem; font-size: 0.75rem;">
            Selesai Cetak
          </button>
        `;
      }

      tr.innerHTML = `
        <td style="font-weight: 600;">${job.id}</td>
        <td>${typeBadge}</td>
        <td>${job.customerName || '-'}</td>
        <td style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${detailsText}</td>
        <td>${statusBadge}</td>
        <td style="font-weight: 600;">${formatCurrency(job.grandTotal)}</td>
        <td>${actionBtn}</td>
      `;

      tbody.appendChild(tr);
    });
  }

  // --- POS KASIR MODULE ---
  function renderPOS() {
    currentCart = [];
    document.getElementById('pos-discount').value = 0;
    document.getElementById('pos-cash').value = '';
    document.getElementById('pos-change').textContent = formatCurrency(0);
    
    renderPOSProducts();
    updatePOSCart();
  }

  function populatePOSCategoryFilter() {
    const select = document.getElementById('pos-category-filter');
    select.innerHTML = '<option value="">Semua Kategori</option>';
    
    const categories = [...new Set(state.products.map(p => p.category))];
    categories.forEach(cat => {
      const option = document.createElement('option');
      option.value = cat;
      option.textContent = cat;
      select.appendChild(option);
    });
  }

  function renderPOSProducts() {
    const grid = document.getElementById('pos-product-grid');
    grid.innerHTML = '';

    const searchQuery = document.getElementById('pos-search').value.toLowerCase();
    const categoryFilter = document.getElementById('pos-category-filter').value;

    const filtered = state.products.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery) || p.id.toLowerCase().includes(searchQuery);
      const matchesCategory = categoryFilter === "" || p.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `<div style="grid-column: span 10; text-align: center; color: var(--text-muted); padding: 2rem;">Produk tidak ditemukan.</div>`;
      return;
    }

    filtered.forEach(p => {
      const card = document.createElement('div');
      card.className = 'product-card';
      
      const stockText = p.stock > 0 ? `Stok: ${p.stock} ${p.unit}` : 'Habis';
      const stockClass = p.stock > 0 ? '' : 'out';

      card.innerHTML = `
        <div>
          <span class="product-cat">${p.category}</span>
          <h4 class="product-name" title="${p.name}">${p.name}</h4>
        </div>
        <div class="product-footer">
          <span class="product-price">${formatCurrency(p.price)}</span>
          <span class="product-stock ${stockClass}">${stockText}</span>
        </div>
      `;

      if (p.stock > 0) {
        card.addEventListener('click', () => addToCart(p));
      } else {
        card.style.opacity = '0.6';
        card.style.cursor = 'not-allowed';
      }

      grid.appendChild(card);
    });
  }

  function addToCart(product) {
    const existing = currentCart.find(item => item.product.id === product.id);
    
    if (existing) {
      if (existing.qty < product.stock) {
        existing.qty++;
      } else {
        alert("Stok barang tidak mencukupi!");
      }
    } else {
      currentCart.push({ product, qty: 1 });
    }

    updatePOSCart();
  }

  function removeFromCart(productId) {
    currentCart = currentCart.filter(item => item.product.id !== productId);
    updatePOSCart();
  }

  function updateQty(productId, delta) {
    const item = currentCart.find(item => item.product.id === productId);
    if (item) {
      const newQty = item.qty + delta;
      if (newQty <= 0) {
        removeFromCart(productId);
      } else if (newQty > item.product.stock) {
        alert("Stok barang tidak mencukupi!");
      } else {
        item.qty = newQty;
        updatePOSCart();
      }
    }
  }

  function updatePOSCart() {
    const listEl = document.getElementById('pos-cart-items');
    listEl.innerHTML = '';

    const countEl = document.getElementById('pos-cart-count');
    countEl.textContent = currentCart.reduce((acc, item) => acc + item.qty, 0);

    if (currentCart.length === 0) {
      listEl.innerHTML = `
        <div class="cart-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          <p>Keranjang kosong</p>
          <span style="font-size: 0.8rem;">Klik produk untuk menambahkan</span>
        </div>
      `;
      document.getElementById('pos-subtotal').textContent = formatCurrency(0);
      document.getElementById('pos-total').textContent = formatCurrency(0);
      return;
    }

    currentCart.forEach(item => {
      const cartItemDiv = document.createElement('div');
      cartItemDiv.className = 'cart-item';
      
      const itemSub = item.product.price * item.qty;

      cartItemDiv.innerHTML = `
        <div class="cart-item-info">
          <div class="cart-item-name" title="${item.product.name}">${item.product.name}</div>
          <div class="cart-item-price">${formatCurrency(item.product.price)} / ${item.product.unit}</div>
        </div>
        <div class="cart-qty-ctrl">
          <button class="qty-btn" onclick="window.App.updateCartQty('${item.product.id}', -1)">-</button>
          <span class="qty-val">${item.qty}</span>
          <button class="qty-btn" onclick="window.App.updateCartQty('${item.product.id}', 1)">+</button>
        </div>
        <div class="cart-item-total">${formatCurrency(itemSub)}</div>
      `;

      listEl.appendChild(cartItemDiv);
    });

    calculateCartTotal();
  }

  function calculateCartTotal() {
    const subtotal = currentCart.reduce((acc, item) => acc + (item.product.price * item.qty), 0);
    const discount = parseFloat(document.getElementById('pos-discount').value) || 0;
    const total = Math.max(0, subtotal - discount);

    document.getElementById('pos-subtotal').textContent = formatCurrency(subtotal);
    document.getElementById('pos-total').textContent = formatCurrency(total);
    
    calculateChange();
  }

  function calculateChange() {
    const total = currentCart.length === 0 ? 0 : (currentCart.reduce((acc, item) => acc + (item.product.price * item.qty), 0) - (parseFloat(document.getElementById('pos-discount').value) || 0));
    const cash = parseFloat(document.getElementById('pos-cash').value) || 0;
    const change = Math.max(0, cash - total);

    document.getElementById('pos-change').textContent = formatCurrency(change);
  }

  function handlePOSCheckout() {
    if (currentCart.length === 0) {
      alert("Keranjang masih kosong!");
      return;
    }

    const subtotal = currentCart.reduce((acc, item) => acc + (item.product.price * item.qty), 0);
    const discount = parseFloat(document.getElementById('pos-discount').value) || 0;
    const total = Math.max(0, subtotal - discount);
    const cash = parseFloat(document.getElementById('pos-cash').value) || 0;

    if (cash < total) {
      alert("Uang pembayaran kurang!");
      return;
    }

    // Deduct stock in Firestore
    currentCart.forEach(item => {
      const prod = state.products.find(p => p.id === item.product.id);
      if (prod) {
        db.collection("products").doc(prod.id).update({
          stock: Math.max(0, prod.stock - item.qty)
        });
      }
    });

    // Create new transaction in Firestore
    const newTrxId = "TRX-S-" + Date.now().toString().slice(-6);
    const newTrx = {
      date: new Date().toISOString(),
      type: "sales",
      items: currentCart.map(item => ({
        id: item.product.id,
        name: item.product.name,
        price: item.product.price,
        qty: item.qty,
        total: item.product.price * item.qty
      })),
      discount: discount,
      grandTotal: total,
      cash: cash,
      change: cash - total,
      status: "completed"
    };

    db.collection("transactions").doc(newTrxId).set(newTrx)
      .then(() => {
        openReceiptModal({ id: newTrxId, ...newTrx });
        renderPOS();
      })
      .catch(err => {
        console.error("Gagal menyimpan transaksi: ", err);
        alert("Gagal memproses checkout!");
      });
  }

  // --- SERVICE MODULE ---
  function renderServiceList() {
    const tbody = document.getElementById('service-list-tbody');
    tbody.innerHTML = '';

    const services = state.transactions.filter(t => t.type === 'service');

    if (services.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">Tidak ada transaksi servis.</td></tr>`;
      return;
    }

    services.forEach(svc => {
      const tr = document.createElement('tr');
      const dateStr = formatDateShort(new Date(svc.date)) + ' ' + formatTime(new Date(svc.date));
      
      let statusText = 'Antrean';
      let badgeClass = 'secondary';
      
      if (svc.status === 'diagnosing') { statusText = 'Diagnosa'; badgeClass = 'info'; }
      else if (svc.status === 'processing') { statusText = 'Pengerjaan'; badgeClass = 'warning'; }
      else if (svc.status === 'completed') { statusText = 'Selesai'; badgeClass = 'success'; }
      else if (svc.status === 'picked_up') { statusText = 'Sudah Diambil'; badgeClass = 'success'; }
      else if (svc.status === 'cancelled') { statusText = 'Dibatalkan'; badgeClass = 'danger'; }

      tr.innerHTML = `
        <td style="font-weight: 600;">${svc.id}</td>
        <td>${dateStr}</td>
        <td>
          <div style="font-weight: 500;">${svc.customerName}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${svc.customerPhone}</div>
        </td>
        <td>${svc.device}</td>
        <td style="max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${svc.complaint}">${svc.complaint}</td>
        <td><span class="badge ${badgeClass}">${statusText}</span></td>
        <td style="font-weight: 600;">${formatCurrency(svc.grandTotal)}</td>
        <td>
          <div style="display: flex; gap: 0.25rem;">
            <button class="btn btn-secondary" onclick="window.App.openEditService('${svc.id}')" style="padding: 0.35rem 0.5rem; font-size: 0.75rem;">
              Edit
            </button>
            <button class="btn btn-success" onclick="window.App.printServiceReceipt('${svc.id}')" style="padding: 0.35rem 0.5rem; font-size: 0.75rem;">
              Struk
            </button>
            <button class="btn btn-danger" onclick="window.App.deleteTransaction('${svc.id}')" style="padding: 0.35rem 0.5rem; font-size: 0.75rem; background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2);">
              Hapus
            </button>
          </div>
        </td>
      `;

      tbody.appendChild(tr);
    });
  }

  function openServiceModal(serviceId = null) {
    const modal = document.getElementById('modal-service');
    const form = document.getElementById('service-form');
    form.reset();
    
    const svcSelect = document.getElementById('svc-type');
    svcSelect.innerHTML = '<option value="">-- Pilih Jasa Servis --</option>';
    state.services.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.name} (${formatCurrency(s.price)})`;
      svcSelect.appendChild(opt);
    });

    tempSpareparts = [];
    renderTempSpareparts();

    if (serviceId) {
      document.getElementById('service-modal-title').textContent = "Update Servis " + serviceId;
      document.getElementById('service-edit-id').value = serviceId;
      
      const svc = state.transactions.find(t => t.id === serviceId);
      if (svc) {
        document.getElementById('svc-cust-name').value = svc.customerName;
        document.getElementById('svc-cust-phone').value = svc.customerPhone;
        document.getElementById('svc-device').value = svc.device;
        document.getElementById('svc-complaint').value = svc.complaint;
        document.getElementById('svc-price').value = svc.servicePrice;
        document.getElementById('svc-status').value = svc.status;
        document.getElementById('svc-notes').value = svc.notes || '';
        
        const matchConf = state.services.find(s => s.name === svc.serviceItem);
        if (matchConf) {
          svcSelect.value = matchConf.id;
        }

        tempSpareparts = [...svc.spareparts];
        renderTempSpareparts();
      }
    } else {
      document.getElementById('service-modal-title').textContent = "Tambah Servis Baru";
      document.getElementById('service-edit-id').value = "";
      document.getElementById('svc-status').value = "queued";
    }

    modal.classList.add('active');
  }

  function handleAddSparepart() {
    const nameEl = document.getElementById('svc-part-name');
    const priceEl = document.getElementById('svc-part-price');

    const name = nameEl.value.trim();
    const price = parseFloat(priceEl.value) || 0;

    if (!name) {
      alert("Nama sparepart tidak boleh kosong!");
      return;
    }

    tempSpareparts.push({ name, price });
    nameEl.value = '';
    priceEl.value = '';
    renderTempSpareparts();
  }

  function removeTempSparepart(index) {
    tempSpareparts.splice(index, 1);
    renderTempSpareparts();
  }

  function renderTempSpareparts() {
    const listEl = document.getElementById('svc-spareparts-list');
    listEl.innerHTML = '';

    if (tempSpareparts.length === 0) {
      listEl.innerHTML = `<span style="font-size:0.8rem; color:var(--text-muted); padding: 0.5rem; text-align:center;">Belum ada penggantian sparepart.</span>`;
      return;
    }

    tempSpareparts.forEach((part, index) => {
      const div = document.createElement('div');
      div.className = 'sparepart-item';
      div.innerHTML = `
        <span>${part.name} - <b>${formatCurrency(part.price)}</b></span>
        <span style="color:var(--danger); cursor:pointer; font-weight:600;" onclick="window.App.removeSparepart(${index})">Hapus</span>
      `;
      listEl.appendChild(div);
    });
  }

  function handleSaveService(e) {
    e.preventDefault();

    const editId = document.getElementById('service-edit-id').value;
    const name = document.getElementById('svc-cust-name').value.trim();
    const phone = document.getElementById('svc-cust-phone').value.trim();
    const device = document.getElementById('svc-device').value.trim();
    const complaint = document.getElementById('svc-complaint').value.trim();
    
    const svcSelect = document.getElementById('svc-type');
    let serviceItemName = "Servis Kustom";
    if (svcSelect.selectedIndex > 0) {
      serviceItemName = svcSelect.options[svcSelect.selectedIndex].text.split(' (')[0];
    }

    const servicePrice = parseFloat(document.getElementById('svc-price').value) || 0;
    const status = document.getElementById('svc-status').value;
    const notes = document.getElementById('svc-notes').value.trim();

    const sparepartsTotal = tempSpareparts.reduce((acc, p) => acc + p.price, 0);
    const grandTotal = servicePrice + sparepartsTotal;

    if (editId) {
      // Update in Firestore
      db.collection("transactions").doc(editId).update({
        customerName: name,
        customerPhone: phone,
        device: device,
        complaint: complaint,
        serviceItem: serviceItemName,
        servicePrice: servicePrice,
        spareparts: [...tempSpareparts],
        grandTotal: grandTotal,
        status: status,
        notes: notes
      }).then(() => {
        closeAllModals();
      });
    } else {
      // Create new in Firestore
      const newId = "TRX-SV-" + Date.now().toString().slice(-6);
      const newSvc = {
        date: new Date().toISOString(),
        type: "service",
        customerName: name,
        customerPhone: phone,
        device: device,
        complaint: complaint,
        serviceItem: serviceItemName,
        servicePrice: servicePrice,
        spareparts: [...tempSpareparts],
        grandTotal: grandTotal,
        status: status,
        notes: notes
      };
      db.collection("transactions").doc(newId).set(newSvc).then(() => {
        closeAllModals();
      });
    }
  }

  // --- PRINTING CALCULATOR MODULE ---
  function renderPrintingPage() {
    populatePrintingOptions();
    calculatePrintCost();
    renderPrintingList();
  }

  function populatePrintingOptions() {
    const paperType = document.getElementById('print-paper-type');
    const paperSize = document.getElementById('print-paper-size');
    const colorMode = document.getElementById('print-color-mode');
    const binding = document.getElementById('print-binding');

    paperType.innerHTML = '';
    state.printingConfig.paperTypes.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = `${t.name} (${formatCurrency(t.pricePerSheet)}/lembar)`;
      paperType.appendChild(opt);
    });

    paperSize.innerHTML = '';
    state.printingConfig.paperSizes.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.name} (Multiplier x${s.multiplier})`;
      paperSize.appendChild(opt);
    });

    colorMode.innerHTML = '';
    state.printingConfig.printColors.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = `${c.name} (${formatCurrency(c.pricePerPage)}/hal)`;
      colorMode.appendChild(opt);
    });

    binding.innerHTML = '';
    state.printingConfig.bindings.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.id;
      opt.textContent = `${b.name} (${formatCurrency(b.price)})`;
      binding.appendChild(opt);
    });
  }

  function calculatePrintCost() {
    const typeId = document.getElementById('print-paper-type').value;
    const sizeId = document.getElementById('print-paper-size').value;
    const colorId = document.getElementById('print-color-mode').value;
    const bindingId = document.getElementById('print-binding').value;
    const pages = parseFloat(document.getElementById('print-pages').value) || 0;
    const copies = parseFloat(document.getElementById('print-copies').value) || 0;

    const paper = state.printingConfig.paperTypes.find(t => t.id === typeId);
    const size = state.printingConfig.paperSizes.find(s => s.id === sizeId);
    const color = state.printingConfig.printColors.find(c => c.id === colorId);
    const bind = state.printingConfig.bindings.find(b => b.id === bindingId);

    if (!paper || !size || !color || !bind) return;

    const paperBase = paper.pricePerSheet;
    const multiplier = size.multiplier;
    const finalPaperCost = paperBase * multiplier;

    const printCostPerPage = color.pricePerPage;
    const bindingCost = bind.price;

    const costPerCopy = (finalPaperCost + printCostPerPage) * pages + bindingCost;
    const grandTotal = costPerCopy * copies;

    document.getElementById('summary-paper-cost').textContent = formatCurrency(paperBase);
    document.getElementById('summary-size-mult').textContent = `x ${multiplier}`;
    document.getElementById('summary-color-cost').textContent = formatCurrency(printCostPerPage);
    document.getElementById('summary-binding-cost').textContent = formatCurrency(bindingCost);
    document.getElementById('summary-per-copy').textContent = formatCurrency(costPerCopy);
    document.getElementById('summary-total-copies').textContent = `x ${copies}`;
    document.getElementById('summary-grand-total').textContent = formatCurrency(grandTotal);
  }

  function handleSavePrintOrder() {
    const custName = document.getElementById('print-cust-name').value.trim();
    const custPhone = document.getElementById('print-cust-phone').value.trim();
    const docName = document.getElementById('print-doc-name').value.trim();

    if (!custName || !custPhone || !docName) {
      alert("Harap lengkapi Nama Pelanggan, No Telepon, dan Nama Dokumen!");
      return;
    }

    const typeId = document.getElementById('print-paper-type').value;
    const sizeId = document.getElementById('print-paper-size').value;
    const colorId = document.getElementById('print-color-mode').value;
    const bindingId = document.getElementById('print-binding').value;
    
    const paper = state.printingConfig.paperTypes.find(t => t.id === typeId);
    const size = state.printingConfig.paperSizes.find(s => s.id === sizeId);
    const color = state.printingConfig.printColors.find(c => c.id === colorId);
    const bind = state.printingConfig.bindings.find(b => b.id === bindingId);
    
    const pages = parseInt(document.getElementById('print-pages').value) || 1;
    const copies = parseInt(document.getElementById('print-copies').value) || 1;

    const paperCost = paper.pricePerSheet * size.multiplier;
    const pricePerCopy = (paperCost + color.pricePerPage) * pages + bind.price;
    const grandTotal = pricePerCopy * copies;

    const newId = "TRX-PR-" + Date.now().toString().slice(-6);
    const newPrintOrder = {
      date: new Date().toISOString(),
      type: "printing",
      customerName: custName,
      customerPhone: custPhone,
      documentName: docName,
      paperType: paper.name,
      paperSize: size.name,
      printColor: color.name,
      binding: bind.name,
      pages: pages,
      copies: copies,
      pricePerCopy: pricePerCopy,
      grandTotal: grandTotal,
      status: "queued"
    };

    db.collection("transactions").doc(newId).set(newPrintOrder).then(() => {
      document.getElementById('print-cust-name').value = '';
      document.getElementById('print-cust-phone').value = '';
      document.getElementById('print-doc-name').value = '';
      document.getElementById('print-pages').value = '1';
      document.getElementById('print-copies').value = '1';

      calculatePrintCost();
      alert("Order Percetakan berhasil disimpan!");
    });
  }

  function renderPrintingList() {
    const tbody = document.getElementById('printing-list-tbody');
    tbody.innerHTML = '';

    const prints = state.transactions.filter(t => t.type === 'printing');

    if (prints.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted);">Tidak ada antrean cetak.</td></tr>`;
      return;
    }

    prints.forEach(p => {
      const tr = document.createElement('tr');
      const dateStr = formatDateShort(new Date(p.date)) + ' ' + formatTime(new Date(p.date));

      let statusText = 'Antrean';
      let badgeClass = 'secondary';
      
      if (p.status === 'printing') { statusText = 'Mencetak'; badgeClass = 'warning'; }
      else if (p.status === 'completed') { statusText = 'Selesai'; badgeClass = 'success'; }

      let actionBtn = '';
      if (p.status === 'queued') {
        actionBtn = `
          <div style="display: flex; gap: 0.25rem;">
            <button class="btn btn-secondary" onclick="window.App.updatePrintStatus('${p.id}', 'printing')" style="padding: 0.35rem 0.5rem; font-size: 0.75rem;">
              Cetak
            </button>
            <button class="btn btn-danger" onclick="window.App.deleteTransaction('${p.id}')" style="padding: 0.35rem 0.5rem; font-size: 0.75rem; background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2);">
              Hapus
            </button>
          </div>
        `;
      } else if (p.status === 'printing') {
        actionBtn = `
          <div style="display: flex; gap: 0.25rem;">
            <button class="btn btn-success" onclick="window.App.completePrintOrder('${p.id}')" style="padding: 0.35rem 0.5rem; font-size: 0.75rem;">
              Selesai
            </button>
            <button class="btn btn-danger" onclick="window.App.deleteTransaction('${p.id}')" style="padding: 0.35rem 0.5rem; font-size: 0.75rem; background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2);">
              Hapus
            </button>
          </div>
        `;
      } else {
        actionBtn = `
          <div style="display: flex; gap: 0.25rem;">
            <button class="btn btn-success" onclick="window.App.printPrintReceipt('${p.id}')" style="padding: 0.35rem 0.5rem; font-size: 0.75rem;">
              Invoice
            </button>
            <button class="btn btn-danger" onclick="window.App.deleteTransaction('${p.id}')" style="padding: 0.35rem 0.5rem; font-size: 0.75rem; background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2);">
              Hapus
            </button>
          </div>
        `;
      }

      tr.innerHTML = `
        <td style="font-weight:600;">${p.id}</td>
        <td>${dateStr}</td>
        <td>
          <div style="font-weight: 500;">${p.customerName}</div>
          <div style="font-size: 0.75rem; color: var(--text-muted);">${p.customerPhone}</div>
        </td>
        <td style="max-width: 150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${p.documentName}">${p.documentName}</td>
        <td>
          <div style="font-size: 0.85rem;">${p.paperType} (${p.paperSize})</div>
          <div style="font-size: 0.75rem; color:var(--text-muted);">${p.printColor} + ${p.binding}</div>
        </td>
        <td>${p.pages} hal / ${p.copies} set</td>
        <td><span class="badge ${badgeClass}">${statusText}</span></td>
        <td style="font-weight: 600;">${formatCurrency(p.grandTotal)}</td>
        <td>${actionBtn}</td>
      `;

      tbody.appendChild(tr);
    });
  }

  function updatePrintStatus(orderId, newStatus) {
    db.collection("transactions").doc(orderId).update({ status: newStatus });
  }

  function completePrintOrder(orderId) {
    db.collection("transactions").doc(orderId).update({ status: 'completed' })
      .then(() => {
        const p = state.transactions.find(t => t.id === orderId);
        if (p) openReceiptModal(p);
      });
  }

  // --- REPORTS & HISTORY MODULE ---
  function renderReports() {
    const tbody = document.getElementById('reports-list-tbody');
    tbody.innerHTML = '';

    const typeFilter = document.getElementById('report-type-filter').value;
    const startDateVal = document.getElementById('report-start-date').value;
    const endDateVal = document.getElementById('report-end-date').value;

    const filtered = state.transactions.filter(t => {
      const matchType = typeFilter === "" || t.type === typeFilter;
      
      const tDate = new Date(t.date);
      let matchStart = true;
      let matchEnd = true;

      if (startDateVal) {
        const start = new Date(startDateVal);
        start.setHours(0, 0, 0, 0);
        matchStart = tDate >= start;
      }
      if (endDateVal) {
        const end = new Date(endDateVal);
        end.setHours(23, 59, 59, 999);
        matchEnd = tDate <= end;
      }

      return matchType && matchStart && matchEnd;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-muted);">Tidak ada riwayat transaksi yang cocok.</td></tr>`;
      return;
    }

    filtered.forEach(t => {
      const tr = document.createElement('tr');
      const dateStr = formatDateShort(new Date(t.date)) + ' ' + formatTime(new Date(t.date));

      let typeBadge = '';
      let descText = '';

      if (t.type === 'sales') {
        typeBadge = `<span class="badge success">Penjualan</span>`;
        descText = t.items.map(item => `${item.name} (x${item.qty})`).join(', ');
      } else if (t.type === 'service') {
        typeBadge = `<span class="badge warning">Servis</span>`;
        descText = `${t.customerName} - ${t.device} (${t.serviceItem})`;
      } else if (t.type === 'printing') {
        typeBadge = `<span class="badge info">Cetak</span>`;
        descText = `${t.customerName} - ${t.documentName} (${t.copies} set)`;
      }

      tr.innerHTML = `
        <td style="font-weight: 600;">${t.id}</td>
        <td>${dateStr}</td>
        <td>${typeBadge}</td>
        <td style="max-width: 300px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${descText}">${descText}</td>
        <td>${formatCurrency(t.grandTotal + (t.discount || 0))}</td>
        <td>${formatCurrency(t.discount || 0)}</td>
        <td style="font-weight: 600;">${formatCurrency(t.grandTotal)}</td>
        <td>
          <div style="display: flex; gap: 0.25rem;">
            <button class="btn btn-secondary" onclick="window.App.viewReceipt('${t.id}')" style="padding: 0.35rem 0.5rem; font-size: 0.75rem;">
              Struk
            </button>
            <button class="btn btn-danger" onclick="window.App.deleteTransaction('${t.id}')" style="padding: 0.35rem 0.5rem; font-size: 0.75rem; background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2);">
              Hapus
            </button>
          </div>
        </td>
      `;

      tbody.appendChild(tr);
    });
  }

  function handleExportCSV() {
    if (state.transactions.length === 0) {
      alert("Belum ada data transaksi untuk diekspor!");
      return;
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ID Transaksi,Tanggal,Tipe,Nama Pelanggan,Detail Barang/Jasa,Subtotal,Diskon,Grand Total,Status\n";

    state.transactions.forEach(t => {
      const date = t.date.replace(/,/g, ' ');
      const customer = (t.customerName || 'Kasir POS').replace(/,/g, ' ');
      
      let details = "";
      if (t.type === 'sales') {
        details = t.items.map(i => `${i.name} (${i.qty})`).join('; ');
      } else if (t.type === 'service') {
        details = `${t.device} - ${t.complaint} (${t.serviceItem})`;
      } else if (t.type === 'printing') {
        details = `${t.documentName} (${t.pages} hal x ${t.copies} set)`;
      }
      details = details.replace(/,/g, ' ');

      const subtotal = t.grandTotal + (t.discount || 0);
      const discount = t.discount || 0;
      const total = t.grandTotal;
      const status = t.status || 'completed';

      csvContent += `${t.id},${date},${t.type},${customer},${details},${subtotal},${discount},${total},${status}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan_transaksi_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleResetData() {
    if (confirm("Apakah Anda yakin ingin mereset database online? Semua transaksi akan dihapus.")) {
      db.collection("transactions").get().then(snapshot => {
        snapshot.forEach(doc => doc.ref.delete());
      });
      db.collection("products").get().then(snapshot => {
        snapshot.forEach(doc => doc.ref.delete());
      });
      db.collection("services").get().then(snapshot => {
        snapshot.forEach(doc => doc.ref.delete());
      });
      db.collection("settings").doc("shop").delete().then(() => {
        alert("Database direset! Memuat ulang...");
        location.reload();
      });
    }
  }

  // --- SETTINGS MODULE ---
  function renderSettings() {
    document.getElementById('set-shop-name').value = state.settings.shopName;
    document.getElementById('set-shop-phone').value = state.settings.phone;
    document.getElementById('set-shop-address').value = state.settings.address;
    document.getElementById('set-shop-currency').value = state.settings.currency;

    renderSettingsProducts();
    renderSettingsServiceConfigs();
  }

  function handleSaveShopSettings(e) {
    e.preventDefault();

    const shopName = document.getElementById('set-shop-name').value.trim();
    const phone = document.getElementById('set-shop-phone').value.trim();
    const address = document.getElementById('set-shop-address').value.trim();
    const currency = document.getElementById('set-shop-currency').value.trim();

    db.collection("settings").doc("shop").set({
      shopName, phone, address, currency
    }).then(() => {
      alert("Profil Toko berhasil disimpan ke database!");
    });
  }

  function renderSettingsProducts() {
    const tbody = document.getElementById('settings-products-tbody');
    tbody.innerHTML = '';

    state.products.forEach(p => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 600;">${p.id}</td>
        <td>${p.name}</td>
        <td>${p.category}</td>
        <td>${formatCurrency(p.cost)}</td>
        <td>${formatCurrency(p.price)}</td>
        <td style="font-weight:600; color: ${p.stock < 5 ? 'var(--danger)' : 'inherit'};">${p.stock}</td>
        <td>${p.unit}</td>
        <td>
          <div style="display: flex; gap:0.25rem;">
            <button class="btn btn-secondary" onclick="window.App.openEditProduct('${p.id}')" style="padding: 0.3rem 0.5rem; font-size: 0.7rem;">Edit</button>
            <button class="btn btn-danger" onclick="window.App.deleteProduct('${p.id}')" style="padding: 0.3rem 0.5rem; font-size: 0.7rem; background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2);">Hapus</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function openProductModal(productId = null) {
    const modal = document.getElementById('modal-product');
    const form = document.getElementById('product-form');
    form.reset();

    if (productId) {
      document.getElementById('product-modal-title').textContent = "Edit Produk";
      document.getElementById('product-edit-id').value = productId;
      
      const prod = state.products.find(p => p.id === productId);
      if (prod) {
        document.getElementById('prod-name').value = prod.name;
        document.getElementById('prod-category').value = prod.category;
        document.getElementById('prod-unit').value = prod.unit;
        document.getElementById('prod-cost').value = prod.cost;
        document.getElementById('prod-price').value = prod.price;
        document.getElementById('prod-stock').value = prod.stock;
      }
    } else {
      document.getElementById('product-modal-title').textContent = "Tambah Produk Baru";
      document.getElementById('product-edit-id').value = "";
    }

    modal.classList.add('active');
  }

  function handleSaveProduct(e) {
    e.preventDefault();

    const editId = document.getElementById('product-edit-id').value;
    const name = document.getElementById('prod-name').value.trim();
    const category = document.getElementById('prod-category').value.trim();
    const unit = document.getElementById('prod-unit').value.trim();
    const cost = parseFloat(document.getElementById('prod-cost').value) || 0;
    const price = parseFloat(document.getElementById('prod-price').value) || 0;
    const stock = parseInt(document.getElementById('prod-stock').value) || 0;

    if (editId) {
      db.collection("products").doc(editId).set({ name, category, unit, cost, price, stock })
        .then(() => closeAllModals());
    } else {
      const newId = "P-" + Date.now().toString().slice(-4);
      db.collection("products").doc(newId).set({ name, category, unit, cost, price, stock })
        .then(() => closeAllModals());
    }
  }

  function deleteProduct(productId) {
    if (confirm("Apakah Anda yakin ingin menghapus produk ini dari database?")) {
      db.collection("products").doc(productId).delete();
    }
  }

  function renderSettingsServiceConfigs() {
    const tbody = document.getElementById('settings-service-tbody');
    tbody.innerHTML = '';

    state.services.forEach(s => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="font-weight: 600;">${s.id}</td>
        <td>${s.name}</td>
        <td>${formatCurrency(s.price)}</td>
        <td>
          <div style="display: flex; gap:0.25rem;">
            <button class="btn btn-secondary" onclick="window.App.openEditServiceConfig('${s.id}')" style="padding: 0.3rem 0.5rem; font-size: 0.7rem;">Edit</button>
            <button class="btn btn-danger" onclick="window.App.deleteServiceConfig('${s.id}')" style="padding: 0.3rem 0.5rem; font-size: 0.7rem; background-color: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2);">Hapus</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  function openServiceConfigModal(configId = null) {
    const modal = document.getElementById('modal-service-config');
    const form = document.getElementById('service-config-form');
    form.reset();

    if (configId) {
      document.getElementById('service-config-modal-title').textContent = "Edit Jasa Servis";
      document.getElementById('service-config-edit-id').value = configId;
      
      const config = state.services.find(s => s.id === configId);
      if (config) {
        document.getElementById('svccfg-name').value = config.name;
        document.getElementById('svccfg-price').value = config.price;
      }
    } else {
      document.getElementById('service-config-modal-title').textContent = "Tambah Jasa Servis";
      document.getElementById('service-config-edit-id').value = "";
    }

    modal.classList.add('active');
  }

  function handleSaveServiceConfig(e) {
    e.preventDefault();

    const editId = document.getElementById('service-config-edit-id').value;
    const name = document.getElementById('svccfg-name').value.trim();
    const price = parseFloat(document.getElementById('svccfg-price').value) || 0;

    if (editId) {
      db.collection("services").doc(editId).set({ name, price })
        .then(() => closeAllModals());
    } else {
      const newId = "S-" + Date.now().toString().slice(-4);
      db.collection("services").doc(newId).set({ name, price })
        .then(() => closeAllModals());
    }
  }
  function deleteServiceConfig(configId) {
    if (confirm("Apakah Anda yakin ingin menghapus tarif jasa ini dari database?")) {
      db.collection("services").doc(configId).delete();
    }
  }

  // --- RECEIPT & INVOICE GENERATION ---
  function openReceiptModal(trx) {
    currentPreviewTrx = trx;
    
    // Set layout selector default to 'invoice' (A4/A5)
    document.getElementById('receipt-layout-option').value = 'invoice';
    renderReceiptContent('invoice');
    
    document.getElementById('modal-receipt').classList.add('active');
  }

  function renderReceiptContent(layout) {
    const previewContent = document.getElementById('receipt-preview-content');
    const modalContent = document.querySelector('#modal-receipt .modal-content');
    
    // Dynamically scale modal preview box width
    if (layout === 'thermal') {
      modalContent.style.maxWidth = '420px';
      previewContent.innerHTML = generateThermalHTML(currentPreviewTrx);
    } else {
      modalContent.style.maxWidth = '750px';
      previewContent.innerHTML = generateInvoiceHTML(currentPreviewTrx);
    }
  }

  function generateInvoiceHTML(trx) {
    const dateStr = new Date(trx.date).toLocaleString('id-ID');
    let itemsMarkup = '';

    if (trx.type === 'sales') {
      trx.items.forEach((item, index) => {
        itemsMarkup += `
          <tr>
            <td style="text-align: center;">${index + 1}</td>
            <td>${item.name}</td>
            <td style="text-align: center;">${item.qty}</td>
            <td style="text-align: right;">${formatCurrency(item.price)}</td>
            <td style="text-align: right;">${formatCurrency(item.total)}</td>
          </tr>
        `;
      });
    } else if (trx.type === 'service') {
      let idx = 1;
      itemsMarkup += `
        <tr>
          <td style="text-align: center;">${idx++}</td>
          <td>Jasa Perbaikan: ${trx.serviceItem}</td>
          <td style="text-align: center;">1</td>
          <td style="text-align: right;">${formatCurrency(trx.servicePrice)}</td>
          <td style="text-align: right;">${formatCurrency(trx.servicePrice)}</td>
        </tr>
      `;
      if (trx.spareparts && trx.spareparts.length > 0) {
        trx.spareparts.forEach(part => {
          itemsMarkup += `
            <tr>
              <td style="text-align: center;">${idx++}</td>
              <td>Ganti Sparepart: ${part.name}</td>
              <td style="text-align: center;">1</td>
              <td style="text-align: right;">${formatCurrency(part.price)}</td>
              <td style="text-align: right;">${formatCurrency(part.price)}</td>
            </tr>
          `;
        });
      }
    } else if (trx.type === 'printing') {
      itemsMarkup += `
        <tr>
          <td style="text-align: center;">1</td>
          <td>
            Cetak Dokumen: <b>${trx.documentName}</b><br>
            <span style="font-size: 0.75rem; color:#64748b;">Bahan: ${trx.paperType} (${trx.paperSize}) | Cetakan: ${trx.printColor} | Jilid: ${trx.binding}</span>
          </td>
          <td style="text-align: center;">${trx.copies} set <br><span style="font-size:0.7rem; color:#64748b;">(x${trx.pages} hal)</span></td>
          <td style="text-align: right;">${formatCurrency(trx.pricePerCopy)}</td>
          <td style="text-align: right;">${formatCurrency(trx.grandTotal)}</td>
        </tr>
      `;
    }

    const subtotal = trx.grandTotal + (trx.discount || 0);
    const discount = trx.discount || 0;

    return `
      <div class="invoice-container layout-invoice">
        <!-- Invoice Header -->
        <div class="invoice-header">
          <div class="invoice-shop-logo">
            <img src="logo.png" alt="Logo">
            <div>
              <h3>${state.settings.shopName}</h3>
              <p>${state.settings.address}</p>
              <p>Telp: ${state.settings.phone}</p>
            </div>
          </div>
          <div class="invoice-title-block">
            <h2 class="invoice-title">NOTA TRANSAKSI</h2>
            <div class="invoice-meta">
              <div><strong>No. Invoice:</strong> ${trx.id}</div>
              <div><strong>Tanggal:</strong> ${dateStr}</div>
            </div>
          </div>
        </div>

        <!-- Client & Info Grid -->
        <div class="invoice-details-grid">
          <div class="invoice-col">
            <h4>Diterbitkan Untuk:</h4>
            <p><strong>Nama:</strong> ${trx.customerName || 'Pelanggan POS (Umum)'}</p>
            <p><strong>No. Telp:</strong> ${trx.customerPhone || '-'}</p>
          </div>
          <div class="invoice-col">
            <h4>Detail Layanan:</h4>
            <p><strong>Kategori:</strong> ${trx.type === 'sales' ? 'Penjualan ATK/Barang' : (trx.type === 'service' ? 'Jasa Perbaikan & Servis' : 'Jasa Percetakan/Cetak')}</p>
            <p><strong>Status Pembayaran:</strong> LUNAS</p>
          </div>
        </div>

        <!-- Items Table -->
        <table class="invoice-table">
          <thead>
            <tr>
              <th style="width: 5%; text-align: center;">No</th>
              <th style="text-align: left;">Deskripsi Barang / Jasa</th>
              <th style="width: 15%; text-align: center;">Qty</th>
              <th style="width: 20%; text-align: right;">Harga Satuan</th>
              <th style="width: 20%; text-align: right;">Total Harga</th>
            </tr>
          </thead>
          <tbody>
            ${itemsMarkup}
          </tbody>
        </table>

        <!-- Summary & Notes / Signatures -->
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 2rem; margin-top: 1rem;">
          <!-- Notes left -->
          <div style="flex-grow: 1; max-width: 50%;">
            ${trx.type === 'service' && trx.device ? `
              <div style="font-size: 0.8rem; color: #475569; line-height: 1.4; border: 1px solid #cbd5e1; padding: 0.5rem 0.75rem; border-radius: var(--radius-sm); background-color: #f8fafc; margin-bottom: 0.5rem;">
                <strong>Detail Unit:</strong> ${trx.device}<br>
                <strong>Keluhan Unit:</strong> ${trx.complaint}<br>
                ${trx.notes ? `<strong>Catatan Servis:</strong> ${trx.notes}` : ''}
              </div>
            ` : ''}
            <div style="font-size: 0.75rem; color: #64748b;">
              * Nota ini adalah bukti transaksi pembayaran yang sah.<br>
              * Barang yang sudah dibeli tidak dapat ditukar/dikembalikan kecuali ada perjanjian garansi.
            </div>
          </div>

          <!-- Summary table right -->
          <div class="invoice-summary">
            <table class="invoice-summary-table">
              <tr>
                <td>Subtotal</td>
                <td style="text-align: right; font-weight: 500;">${formatCurrency(subtotal)}</td>
              </tr>
              ${discount > 0 ? `
              <tr>
                <td>Diskon (Potongan)</td>
                <td style="text-align: right; color: var(--danger); font-weight: 500;">-${formatCurrency(discount)}</td>
              </tr>` : ''}
              <tr class="total-row">
                <td>Grand Total</td>
                <td style="text-align: right;">${formatCurrency(trx.grandTotal)}</td>
              </tr>
              ${trx.cash ? `
              <tr style="font-size: 0.75rem; color: #64748b;">
                <td style="padding-top: 0.3rem;">Jumlah Uang</td>
                <td style="text-align: right; padding-top: 0.3rem;">${formatCurrency(trx.cash)}</td>
              </tr>
              <tr style="font-size: 0.75rem; color: #64748b;">
                <td>Kembalian</td>
                <td style="text-align: right;">${formatCurrency(trx.change)}</td>
              </tr>` : ''}
            </table>
          </div>
        </div>

        <!-- Signatures Section -->
        <div class="invoice-signatures">
          <div class="sig-col">
            <span>Pelanggan / Penerima</span>
            <span style="border-bottom: 1px dashed #94a3b8; width: 140px; margin: 0 auto; display: block; height: 35px;"></span>
            <span>${trx.customerName || '( Pelanggan Umum )'}</span>
          </div>
          <div class="sig-col">
            <span>Petugas Kasir</span>
            <span style="border-bottom: 1px dashed #94a3b8; width: 140px; margin: 0 auto; display: block; height: 35px;"></span>
            <span>( .................................... )</span>
          </div>
        </div>
      </div>
    `;
  }

  function generateThermalHTML(trx) {
    const dateStr = new Date(trx.date).toLocaleString('id-ID');
    let itemsMarkup = '';

    if (trx.type === 'sales') {
      trx.items.forEach(item => {
        itemsMarkup += `
          <div class="receipt-row">
            <span>${item.name}</span>
          </div>
          <div class="receipt-row" style="color: #444; font-size: 0.8rem; padding-left: 10px;">
            <span>  ${item.qty} x ${formatCurrency(item.price)}</span>
            <span>${formatCurrency(item.total)}</span>
          </div>
        `;
      });
    } else if (trx.type === 'service') {
      itemsMarkup += `
        <div class="receipt-row"><b>Unit:</b> <span>${trx.device}</span></div>
        <div class="receipt-row" style="font-size: 0.8rem; color:#444;"><span>Keluhan: ${trx.complaint}</span></div>
        <div class="receipt-divider"></div>
        <div class="receipt-row">
          <span>Jasa: ${trx.serviceItem}</span>
          <span>${formatCurrency(trx.servicePrice)}</span>
        </div>
      `;
      if (trx.spareparts && trx.spareparts.length > 0) {
        itemsMarkup += `<div class="receipt-row" style="margin-top:5px; font-weight:600;">Sparepart:</div>`;
        trx.spareparts.forEach(part => {
          itemsMarkup += `
            <div class="receipt-row" style="font-size:0.8rem; color:#444; padding-left:10px;">
              <span>- ${part.name}</span>
              <span>${formatCurrency(part.price)}</span>
            </div>
          `;
        });
      }
      if (trx.notes) {
        itemsMarkup += `
          <div class="receipt-divider"></div>
          <div style="font-size:0.8rem; color:#444; word-break: break-all;">Catatan: ${trx.notes}</div>
        `;
      }
    } else if (trx.type === 'printing') {
      itemsMarkup += `
        <div class="receipt-row"><b>Cetak:</b> <span>${trx.documentName}</span></div>
        <div class="receipt-row" style="font-size: 0.8rem; color:#444;">
          <span>${trx.paperType} • ${trx.paperSize}</span>
        </div>
        <div class="receipt-row" style="font-size: 0.8rem; color:#444;">
          <span>${trx.printColor} • ${trx.binding}</span>
        </div>
        <div class="receipt-divider"></div>
        <div class="receipt-row">
          <span>Biaya per Set (x${trx.pages} hal):</span>
          <span>${formatCurrency(trx.pricePerCopy)}</span>
        </div>
        <div class="receipt-row">
          <span>Jumlah (Copies):</span>
          <span>x ${trx.copies} set</span>
        </div>
      `;
    }

    const subtotal = trx.grandTotal + (trx.discount || 0);
    const discount = trx.discount || 0;

    return `
      <div class="invoice-container layout-thermal" style="width: 100%; max-width: 300px; margin: 0 auto; color: #000; font-family: 'Courier New', Courier, monospace;">
        <div class="receipt-center" style="text-align: center;">
          <h3 style="margin-bottom: 2px; font-weight: 700; font-size: 1.1rem;">${state.settings.shopName}</h3>
          <div style="font-size: 0.75rem;">${state.settings.address}</div>
          <div style="font-size: 0.75rem;">Telp: ${state.settings.phone}</div>
        </div>
        <div class="receipt-divider"></div>
        <div class="receipt-row">
          <span>No. Trx: ${trx.id}</span>
          <span>Tipe: ${trx.type.toUpperCase()}</span>
        </div>
        <div class="receipt-row">
          <span>Tanggal: ${dateStr.split(' ')[0]}</span>
          <span>Waktu: ${dateStr.split(' ')[1] || ''}</span>
        </div>
        ${trx.customerName ? `<div class="receipt-row"><span>Pelanggan: ${trx.customerName}</span></div>` : ''}
        
        <div class="receipt-divider"></div>
        
        ${itemsMarkup}
        
        <div class="receipt-divider"></div>
        
        <div class="receipt-row">
          <span>Subtotal</span>
          <span>${formatCurrency(subtotal)}</span>
        </div>
        ${discount > 0 ? `
        <div class="receipt-row">
          <span>Diskon</span>
          <span>-${formatCurrency(discount)}</span>
        </div>` : ''}
        <div class="receipt-row" style="font-weight: bold; font-size: 1rem; border-top: 1px dashed #000; padding-top: 4px; margin-top: 4px;">
          <span>Total Bayar</span>
          <span>${formatCurrency(trx.grandTotal)}</span>
        </div>
        
        ${trx.cash ? `
        <div class="receipt-row" style="font-size: 0.8rem; color: #444; margin-top: 4px;">
          <span>Bayar Tunai</span>
          <span>${formatCurrency(trx.cash)}</span>
        </div>
        <div class="receipt-row" style="font-size: 0.8rem; color: #444;">
          <span>Kembalian</span>
          <span>${formatCurrency(trx.change)}</span>
        </div>
        ` : ''}
        
        <div class="receipt-divider"></div>
        <div class="receipt-center" style="font-size: 0.75rem; text-align: center; margin-top: 10px; font-weight:600;">
          Terima Kasih Atas Kunjungan Anda!
        </div>
      </div>
    `;
  }

  function triggerPhysicalPrint() {
    const previewContent = document.getElementById('receipt-preview-content').innerHTML;
    const printSection = document.getElementById('print-receipt-section');
    printSection.innerHTML = previewContent;
    window.print();
  }

  function viewReceipt(trxId) {
    const trx = state.transactions.find(t => t.id === trxId);
    if (trx) {
      openReceiptModal(trx);
    }
  }

  function deleteTransaction(trxId) {
    if (confirm(`Apakah Anda yakin ingin menghapus transaksi ${trxId}?`)) {
      db.collection("transactions").doc(trxId).delete();
    }
  }

  // --- EXPOSE API FOR INLINE EVENT HANDLERS ---
  window.App = {
    updateCartQty: (id, delta) => updateQty(id, delta),
    openEditService: (id) => openServiceModal(id),
    printServiceReceipt: (id) => {
      const svc = state.transactions.find(t => t.id === id);
      if (svc) openReceiptModal(svc);
    },
    removeSparepart: (idx) => removeTempSparepart(idx),
    updatePrintStatus: (id, status) => updatePrintStatus(id, status),
    completePrintOrder: (id) => completePrintOrder(id),
    printPrintReceipt: (id) => {
      const p = state.transactions.find(t => t.id === id);
      if (p) openReceiptModal(p);
    },
    viewReceipt: (id) => viewReceipt(id),
    deleteTransaction: (id) => deleteTransaction(id),
    
    // settings
    openEditProduct: (id) => openProductModal(id),
    deleteProduct: (id) => deleteProduct(id),
    openEditServiceConfig: (id) => openServiceConfigModal(id),
    deleteServiceConfig: (id) => deleteServiceConfig(id)
  };

})();
