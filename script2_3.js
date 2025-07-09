/**
 * ===================================================================
 * 経理ポータルサイト スクリプト (ver. 2_3)
 * ===================================================================
 * 機能はそのままに、アニメーションを強化し、よりスムーズな
 * ユーザー体験を目指してコードをリファクタリングしました。
 * ===================================================================
 */
document.addEventListener('DOMContentLoaded', () => {

    // スクロールアニメーション用のObserverを、複数の関数から使えるように定義
    let scrollObserver;

    /**
     * ==================================
     * ★ 機能1: お気に入り管理システム
     * ==================================
     */
    const favoritesApp = {
        addBtn: document.getElementById('add-favorite-btn'),
        closeBtn: document.getElementById('close-modal-btn'),
        modal: document.getElementById('favorite-modal'),
        form: document.getElementById('favorite-form'),
        list: document.getElementById('favorites-list'),
        nameInput: document.getElementById('favorite-name'),
        urlInput: document.getElementById('favorite-url'),
        favorites: [],

        init() {
            this.addEventListeners();
            this.loadFavorites();
            this.setupSortable();
        },

        addEventListeners() {
            this.addBtn.addEventListener('click', () => this.toggleModal(true));
            this.closeBtn.addEventListener('click', () => this.toggleModal(false));
            this.modal.addEventListener('click', (e) => {
                // モーダルの背景クリックで閉じる
                if (e.target === this.modal) this.toggleModal(false);
            });
            this.form.addEventListener('submit', (e) => this.addFavorite(e));
        },

        // --- ▲▼ 改善点: アニメーション対応のモーダル表示切替 ---
        toggleModal(show) {
            if (show) {
                this.modal.style.display = 'flex';
                // display:flexを適用した直後にクラスを付けないとtransitionが効かない
                requestAnimationFrame(() => {
                    this.modal.classList.add('is-open');
                    this.nameInput.focus();
                });
            } else {
                this.modal.classList.remove('is-open');
                // transitionの完了を待ってから非表示にする
                this.modal.addEventListener('transitionend', () => {
                    this.modal.style.display = 'none';
                }, { once: true }); // イベントリスナーを一度きりにする
            }
        },

        loadFavorites() {
            this.favorites = JSON.parse(localStorage.getItem('portalFavoritesV2')) || [];
            this.renderFavorites();
        },

        saveFavorites() {
            localStorage.setItem('portalFavoritesV2', JSON.stringify(this.favorites));
        },

        renderFavorites() {
            this.list.innerHTML = '';
            if (this.favorites.length === 0) {
                 // 空の場合のメッセージなどをここに書くこともできる
            } else {
                this.favorites.forEach(fav => {
                    const favElement = this.createFavoriteElement(fav);
                    this.list.appendChild(favElement);
                    // スクロール監視対象に追加
                    if (scrollObserver) {
                        scrollObserver.observe(favElement);
                    }
                });
            }
        },
        
        addFavorite(event) {
            event.preventDefault();
            const name = this.nameInput.value.trim();
            const url = this.urlInput.value.trim();

            if (name && url) {
                const newFavorite = { id: Date.now(), name, url };
                this.favorites.push(newFavorite);
                this.saveFavorites();
                
                // --- ▼ 改善点: 新規要素をアニメーション付きで追加 ---
                const newElement = this.createFavoriteElement(newFavorite);
                this.list.appendChild(newElement);
                if (scrollObserver) {
                    scrollObserver.observe(newElement);
                }
                // 即座に visible クラスを付与してアニメーションを開始
                requestAnimationFrame(() => {
                    newElement.classList.add('visible');
                });
                // --- ▲ 改善ここまで ---
                
                this.form.reset();
                this.toggleModal(false);
            }
        },
        
        // --- ▼ 改善点: 削除時にアニメーションを追加 ---
        deleteFavorite(id) {
            const favoriteElement = this.list.querySelector(`[data-id="${id}"]`);
            if (confirm('このお気に入りを削除しますか？')) {
                if (favoriteElement) {
                    favoriteElement.classList.add('is-deleting');
                    favoriteElement.addEventListener('transitionend', () => {
                        this.favorites = this.favorites.filter(fav => fav.id !== id);
                        this.saveFavorites();
                        favoriteElement.remove(); // DOMから直接削除
                    }, { once: true });
                } else {
                    // 要素が見つからない場合（万が一）は直接データを更新
                    this.favorites = this.favorites.filter(fav => fav.id !== id);
                    this.saveFavorites();
                }
            }
        },
        // --- ▲ 改善ここまで ---

        createFavoriteElement(fav) {
            const a = document.createElement('a');
            a.href = fav.url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            // アニメーションの初期状態クラスを追加
            a.className = 'card favorite-card fade-in-up';
            a.dataset.id = fav.id;

            a.innerHTML = `
                <i class="fa-solid fa-link card-icon-small"></i>
                <h4>${this.escapeHTML(fav.name)}</h4>
                <button class="button-delete" title="削除">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            `;
            
            const deleteBtn = a.querySelector('.button-delete');
            deleteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation(); // aタグのリンク遷移を防止
                this.deleteFavorite(fav.id);
            });

            return a;
        },

        setupSortable() {
            Sortable.create(this.list, {
                group: { name: 'shared-links', pull: 'clone', put: false },
                animation: 150,
                ghostClass: 'sortable-ghost',
                onEnd: () => {
                    // 並び替え後のDOMの順番を取得
                    const newOrder = Array.from(this.list.children).map(item => Number(item.dataset.id));
                    // データ配列をDOMの順番通りにソート
                    this.favorites.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
                    this.saveFavorites();
                }
            });
        },

        // XSS対策
        escapeHTML(str) {
            const p = document.createElement('p');
            p.textContent = str;
            return p.innerHTML;
        }
    };

    /**
     * ==================================
     * ★ 機能2: 静的リンクの並び替え機能
     * ==================================
     * (機能に変更はありません)
     */
    const sortableLinks = {
        targets: [
            { containerId: 'accounting-links-grid', storageKey: 'accountingLinksOrder_v2' },
            { containerId: 'ai-tools-grid', storageKey: 'aiToolsOrder_v2' },
            { containerId: 'company-links-grid', storageKey: 'companyLinksOrder_v2' }
        ],

        init() {
            this.targets.forEach(target => {
                const container = document.getElementById(target.containerId);
                if (container) {
                    this.applySavedOrder(container, target.storageKey);
                    this.setupSortable(container, target.storageKey);
                }
            });
        },

        applySavedOrder(container, storageKey) {
            const savedOrder = JSON.parse(localStorage.getItem(storageKey));
            if (!savedOrder) return;
            
            const items = new Map();
            // 子要素を Map に格納 (キーは href)
            container.childNodes.forEach(node => {
                if (node.nodeType === 1 && node.tagName === 'A') {
                    items.set(node.getAttribute('href'), node);
                }
            });
            // 保存された順番通りに要素をコンテナに追加し直す
            savedOrder.forEach(key => {
                const item = items.get(key);
                if (item) container.appendChild(item);
            });
        },

        setupSortable(container, storageKey) {
            Sortable.create(container, {
                group: { name: 'shared-links', pull: 'clone', put: false },
                animation: 150,
                ghostClass: 'sortable-ghost',
                onEnd: () => {
                    const newOrder = Array.from(container.children).map(item => item.getAttribute('href'));
                    localStorage.setItem(storageKey, JSON.stringify(newOrder));
                }
            });
        }
    };

    /**
     * ==================================
     * ★ 機能3: Quick Access 機能
     * ==================================
     */
    const quickAccessApp = {
        list: document.getElementById('quick-access-list'),
        placeholder: document.querySelector('.drop-placeholder'),
        items: [],

        init() {
            this.loadItems();
            this.setupSortable();
        },

        loadItems() {
            this.items = JSON.parse(localStorage.getItem('quickAccessItems_v2')) || [];
            this.renderItems();
        },

        saveItems() {
            localStorage.setItem('quickAccessItems_v2', JSON.stringify(this.items));
        },
        
        renderItems() {
            // プレースホルダー以外の要素をクリア
            Array.from(this.list.children).forEach(child => {
                if (!child.classList.contains('drop-placeholder')) {
                    child.remove();
                }
            });

            if (this.items.length === 0) {
                this.placeholder.style.display = 'block';
            } else {
                this.placeholder.style.display = 'none';
                this.items.forEach(item => {
                    const itemElement = this.createItemElement(item);
                    this.list.appendChild(itemElement);
                    // QuickAccessエリアは常に表示されているため、即座に表示クラスを付与
                    requestAnimationFrame(() => {
                        itemElement.classList.add('visible');
                    });
                });
            }
        },

        createItemElement(item) {
            const a = document.createElement('a');
            a.href = item.url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.className = 'card fade-in-up';
            a.dataset.id = item.id;
            a.innerHTML = item.htmlContent + `
                <button class="button-delete" title="削除">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            `;
            const deleteBtn = a.querySelector('.button-delete');
            deleteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.deleteItem(item.id);
            });
            return a;
        },
        
        addItem(originalElement) {
             const url = originalElement.href;
             // 既に追加されていないかチェック
             if (this.items.some(item => item.url === url)) {
                 originalElement.remove(); // ドロップされた複製元を消す
                 // ここで通知（例: 「既に追加されています」）を出しても良い
                 return;
             }
             const cleanClone = originalElement.cloneNode(true);
             const existingButton = cleanClone.querySelector('.button-delete');
             if (existingButton) existingButton.remove();

             const newItem = {
                 id: Date.now(),
                 url: url,
                 htmlContent: cleanClone.innerHTML
             };
             
             this.items.push(newItem);
             this.saveItems();
             this.renderItems(); // 再描画して新しい項目を表示
             originalElement.remove(); // ドロップされた複製元を消す
        },

        // --- ▼ 改善点: 削除時にアニメーションを追加 ---
        deleteItem(id) {
            const itemElement = this.list.querySelector(`[data-id="${id}"]`);
            if (itemElement) {
                itemElement.classList.add('is-deleting');
                itemElement.addEventListener('transitionend', () => {
                    this.items = this.items.filter(item => item.id !== id);
                    this.saveItems();
                    itemElement.remove();
                    // 最後のアイテムを消したらプレースホルダーを表示
                    if (this.items.length === 0) {
                        this.placeholder.style.display = 'block';
                    }
                }, { once: true });
            } else {
                this.items = this.items.filter(item => item.id !== id);
                this.saveItems();
                this.renderItems(); // 万が一要素が見つからない場合は再描画
            }
        },
        // --- ▲ 改善ここまで ---

        setupSortable() {
            Sortable.create(this.list, {
                group: 'shared-links',
                animation: 150,
                ghostClass: 'sortable-ghost',
                onAdd: (evt) => {
                    this.addItem(evt.item);
                },
                onEnd: (evt) => {
                    // QuickAccess内での並び替えの場合
                    if (evt.from === evt.to) {
                        const newOrder = Array.from(this.list.children)
                                               .map(item => Number(item.dataset.id))
                                               .filter(id => !isNaN(id));
                        if (newOrder.length > 0) {
                            this.items.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
                            this.saveItems();
                        }
                    }
                }
            });
        }
    };

    /**
     * ==================================
     * ★ 機能4: 天気予報ウィジェット
     * ==================================
     */
    const fetchWeather = async () => {
        const weatherWidget = document.getElementById('weather-info');
        if (!weatherWidget) return;

        // --- ▼ 改善点: ローディング表示をよりリッチに ---
        weatherWidget.innerHTML = `<div class="loading-skeleton"></div>`;
        const apiUrl = 'https://wttr.in/Osaka?format=j1';

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error('天気情報の取得に失敗');
            const data = await response.json();

            const current = data.current_condition[0];
            const today = data.weather[0];
            const desc = current.weatherDesc[0].value;
            const temp = current.temp_C;
            const maxTemp = today.maxtempC;
            const minTemp = today.mintempC;

            // 天気アイコンのマッピング
            const weatherIcons = {
                "Sunny": "fa-solid fa-sun",
                "Clear": "fa-solid fa-moon", // 夜は月アイコンに
                "Partly cloudy": "fa-solid fa-cloud-sun",
                "Cloudy": "fa-solid fa-cloud",
                "Overcast": "fa-solid fa-smog",
                "Mist": "fa-solid fa-smog",
                "Patchy rain possible": "fa-solid fa-cloud-rain",
                "Light rain": "fa-solid fa-cloud-rain",
                "Moderate rain": "fa-solid fa-cloud-showers-heavy",
                "Heavy rain": "fa-solid fa-cloud-showers-heavy",
                "Thundery outbreaks possible": "fa-solid fa-cloud-bolt",
                "Snow": "fa-solid fa-snowflake",
                "Sleet": "fa-solid fa-cloud-meatball",
            };
            // 夜かどうかで "Clear" のアイコンを切り替え
            const isNight = new Date().getHours() < 6 || new Date().getHours() > 18;
            let weatherIcon = weatherIcons[desc] || (isNight ? weatherIcons["Clear"] : weatherIcons["Sunny"]);

            const weatherHTML = `
                <div class="weather-main">
                    <i class="${weatherIcon}"></i>
                    <span class="weather-temp">${temp}°C</span>
                </div>
                <div class="weather-sub">
                    <span class="weather-desc">${desc}</span>
                    <span>H: ${maxTemp}° / L: ${minTemp}°</span>
                </div>`;
            
            // --- ▼ 改善点: クロスフェードで表示を切り替え ---
            const newContent = document.createElement('div');
            newContent.className = 'weather-content is-loading';
            newContent.innerHTML = weatherHTML;
            weatherWidget.innerHTML = ''; // ローディング表示を消去
            weatherWidget.appendChild(newContent);
            requestAnimationFrame(() => {
                newContent.classList.remove('is-loading');
            });
            // --- ▲ 改善ここまで ---
        } catch (error) {
            weatherWidget.innerHTML = '<p>天気情報を取得できませんでした。</p>';
            console.error(error);
        }
    };

    /**
     * ==================================
     * ★ 機能5: スクロールアニメーション
     * ==================================
     */
    const setupScrollAnimations = () => {
        const animatedElements = document.querySelectorAll('.fade-in-up');
        if (animatedElements.length === 0) return;
        
        scrollObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    // 一度表示されたら監視を停止（Quick Accessとお気に入り以外）
                    if (!entry.target.closest('#quick-access-sidebar') && !entry.target.classList.contains('favorite-card')) {
                        observer.unobserve(entry.target);
                    }
                }
            });
        }, { threshold: 0.1 }); // 要素が10%見えたら発火

        animatedElements.forEach(el => scrollObserver.observe(el));
    };

    /**
     * ==================================
     * ★ 機能6: パーティクルエフェクト
     * ==================================
     */
    const setupParticles = () => {
        if (typeof particlesJS !== 'undefined') {
            particlesJS('particles-js', {
                "particles": {
                    "number": { "value": 50, "density": { "enable": true, "value_area": 800 } },
                    "color": { "value": "#ffffff" },
                    "shape": { "type": "circle" },
                    "opacity": { "value": 0.4, "random": true, "anim": { "enable": true, "speed": 0.5, "opacity_min": 0.1, "sync": false } },
                    "size": { "value": 3, "random": true },
                    "line_linked": { "enable": true, "distance": 150, "color": "#ffffff", "opacity": 0.3, "width": 1 },
                    "move": { "enable": true, "speed": 1, "direction": "none", "random": true, "straight": false, "out_mode": "out" }
                },
                "interactivity": {
                    "detect_on": "canvas",
                    "events": { "onhover": { "enable": true, "mode": "grab" }, "onclick": { "enable": true, "mode": "push" } },
                     "modes": { "grab": { "distance": 140, "line_linked": { "opacity": 1 } }, "push": { "particles_nb": 4 } }
                },
                "retina_detect": true
            });
        } else {
            console.error('particles.js is not loaded.');
        }
    };
    
    // ==================================
    // >> 各機能の初期化・実行
    // ==================================
    fetchWeather();
    favoritesApp.init();
    sortableLinks.init();
    quickAccessApp.init();
    setupScrollAnimations();
    setupParticles();

});