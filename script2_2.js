/**
 * =================================================================
 * 経理ポータルサイト 全体スクリプト (script2_2.js)
 * =================================================================
 * 機能：
 * 1. お気に入り管理 (追加/削除/並び替え/保存)
 * 2. 静的リンクの並び替えと保存
 * 3. Quick Access機能 (ドラッグ&ドロップによる追加/削除/並び替え/保存)
 * 4. 天気予報ウィジェットの非同期取得と表示
 * 5. 各種要素のスクロール連動アニメーション
 * 6. ヘッダーのパーティクルエフェクト
 * =================================================================
 */
document.addEventListener('DOMContentLoaded', () => {

    // 複数の関数からアクセスできるよう、グローバルスコープに近い位置にObserverを定義
    let scrollObserver;

    /**
     * @module favoritesApp
     * @description お気に入り機能の管理
     */
    const favoritesApp = {
        // DOM要素のキャッシュ
        addBtn: document.getElementById('add-favorite-btn'),
        closeBtn: document.getElementById('close-modal-btn'),
        modal: document.getElementById('favorite-modal'),
        form: document.getElementById('favorite-form'),
        list: document.getElementById('favorites-list'),
        nameInput: document.getElementById('favorite-name'),
        urlInput: document.getElementById('favorite-url'),
        
        // データ
        favorites: [],

        /**
         * 初期化処理
         */
        init() {
            this.addEventListeners();
            this.loadFavorites();
            this.setupSortable();
        },

        /**
         * イベントリスナーをまとめて登録
         */
        addEventListeners() {
            this.addBtn.addEventListener('click', () => this.toggleModal(true));
            this.closeBtn.addEventListener('click', () => this.toggleModal(false));
            this.modal.addEventListener('click', (e) => {
                // モーダルの背景クリックで閉じる
                if (e.target === this.modal) this.toggleModal(false);
            });
            this.form.addEventListener('submit', (e) => this.addFavorite(e));
        },

        /**
         * モーダルの表示/非表示を切り替え
         * @param {boolean} show - 表示する場合はtrue
         */
        toggleModal(show) {
            // ★変更点: style直接操作からクラスの付け外しに変更
            // これによりCSSで開閉時のアニメーションを自由に設定できる
            this.modal.classList.toggle('is-visible', show);
            if (show) {
                this.nameInput.focus();
            }
        },
        
        /**
         * localStorageからお気に入りデータを読み込む
         */
        loadFavorites() {
            this.favorites = JSON.parse(localStorage.getItem('portalFavoritesV2')) || [];
            this.renderFavorites();
        },

        /**
         * お気に入りデータをlocalStorageに保存する
         */
        saveFavorites() {
            localStorage.setItem('portalFavoritesV2', JSON.stringify(this.favorites));
        },

        /**
         * お気に入りリストを描画する
         */
        renderFavorites() {
            const fragment = document.createDocumentFragment();
            this.list.innerHTML = ''; // 一旦リストを空にする

            this.favorites.forEach(fav => {
                const favElement = this.createFavoriteElement(fav);
                fragment.appendChild(favElement);
                // スクロールアニメーションの監視対象に追加
                if (scrollObserver) {
                    scrollObserver.observe(favElement);
                }
            });
            
            // ★変更点: DocumentFragmentを使ってDOM操作を効率化
            this.list.appendChild(fragment);
        },
        
        /**
         * 新しいお気に入りを追加する
         * @param {Event} event - フォーム送信イベント
         */
        addFavorite(event) {
            event.preventDefault();
            const name = this.nameInput.value.trim();
            const url = this.urlInput.value.trim();

            if (name && url) {
                const newFavorite = { id: Date.now(), name, url };
                this.favorites.push(newFavorite);
                this.saveFavorites();
                
                const newElement = this.createFavoriteElement(newFavorite);
                this.list.appendChild(newElement);
                if (scrollObserver) scrollObserver.observe(newElement);

                this.form.reset();
                this.toggleModal(false);
            }
        },

        /**
         * 指定されたIDのお気に入りを削除する
         * @param {number} id - 削除するお気に入りのID
         */
        deleteFavorite(id) {
            if (confirm('このお気に入りを削除しますか？')) {
                const targetElement = this.list.querySelector(`[data-id="${id}"]`);
                
                // ★変更点: 削除アニメーションを追加
                if (targetElement) {
                    targetElement.classList.add('is-hiding'); // 削除アニメーション用のクラス
                    targetElement.addEventListener('transitionend', () => {
                        this.favorites = this.favorites.filter(fav => fav.id !== id);
                        this.saveFavorites();
                        targetElement.remove(); // DOMから要素を削除
                    }, { once: true }); // イベントリスナーを一度だけ実行する
                } else {
                    // アニメーションが不要な場合のフォールバック
                    this.favorites = this.favorites.filter(fav => fav.id !== id);
                    this.saveFavorites();
                    this.renderFavorites();
                }
            }
        },

        /**
         * お気に入り要素のHTMLを生成する
         * @param {object} fav - お気に入りデータ
         * @returns {HTMLElement} - 生成されたa要素
         */
        createFavoriteElement(fav) {
            const a = document.createElement('a');
            a.href = fav.url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.className = 'card favorite-card fade-in-up';
            a.dataset.id = fav.id;

            a.innerHTML = `
                <i class="fa-solid fa-link card-icon-small"></i>
                <h4>${this.escapeHTML(fav.name)}</h4>
                <button class="button-delete" title="削除" aria-label="削除">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            `;
            
            // 削除ボタンにイベントを追加
            const deleteBtn = a.querySelector('.button-delete');
            deleteBtn.addEventListener('click', (e) => {
                e.preventDefault(); // リンク遷移を防ぐ
                e.stopPropagation(); // 親要素へのイベント伝播を防ぐ
                this.deleteFavorite(fav.id);
            });

            return a;
        },

        /**
         * お気に入りリストの並び替え(SortableJS)を設定
         */
        setupSortable() {
            Sortable.create(this.list, {
                group: { name: 'shared-links', pull: 'clone', put: false },
                animation: 150,
                ghostClass: 'sortable-ghost',
                onEnd: () => {
                    const newOrder = Array.from(this.list.children).map(item => Number(item.dataset.id));
                    this.favorites.sort((a, b) => newOrder.indexOf(a.id) - newOrder.indexOf(b.id));
                    this.saveFavorites();
                }
            });
        },
        
        /**
         * XSS対策のためのHTMLエスケープ
         * @param {string} str - エスケープ対象の文字列
         * @returns {string} - エスケープ後の文字列
         */
        escapeHTML(str) {
            const p = document.createElement('p');
            p.textContent = str;
            return p.innerHTML;
        }
    };

    /**
     * @module sortableLinks
     * @description 静的なリンクグリッドの並び替え機能
     */
    const sortableLinks = {
        targets: [
            { containerId: 'accounting-links-grid', storageKey: 'accountingLinksOrder' },
            { containerId: 'ai-tools-grid', storageKey: 'aiToolsOrder' },
            { containerId: 'company-links-grid', storageKey: 'companyLinksOrder' }
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

            const items = new Map(
                Array.from(container.children).map(node => [node.getAttribute('href'), node])
            );

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
     * @module quickAccessApp
     * @description Quick Accessサイドバーの管理
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
            this.items = JSON.parse(localStorage.getItem('quickAccessItems')) || [];
            this.renderItems();
        },

        saveItems() {
            localStorage.setItem('quickAccessItems', JSON.stringify(this.items));
        },

        renderItems() {
            this.list.innerHTML = '';
            
            if (this.items.length === 0) {
                this.list.appendChild(this.placeholder);
                this.placeholder.style.display = 'block';
            } else {
                const fragment = document.createDocumentFragment();
                this.placeholder.style.display = 'none';

                this.items.forEach(item => {
                    const itemElement = this.createItemElement(item);
                    fragment.appendChild(itemElement);
                    // サイドバーの要素は即座に表示
                    requestAnimationFrame(() => {
                        itemElement.classList.add('visible');
                    });
                });
                this.list.appendChild(fragment);
            }
        },
        
        createItemElement(item) {
            const a = document.createElement('a');
            a.href = item.url;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.className = 'card fade-in-up';
            a.dataset.id = item.id;

            // 元のHTMLコンテンツと削除ボタンを結合
            a.innerHTML = item.htmlContent + `
                <button class="button-delete" title="削除" aria-label="削除">
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
                originalElement.remove(); // ドロップされたクローン要素を削除
                return;
            }

            // 元要素から不要なボタンを削除してHTMLコンテンツをクリーンにする
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
            this.renderItems(); // 全体を再描画して順序を反映
            originalElement.remove(); // ドロップされたクローン要素を削除
        },

        deleteItem(id) {
            const targetElement = this.list.querySelector(`[data-id="${id}"]`);

            // ★変更点: 削除アニメーションを追加
            if (targetElement) {
                targetElement.classList.add('is-hiding');
                targetElement.addEventListener('transitionend', () => {
                    this.items = this.items.filter(item => item.id !== id);
                    this.saveItems();
                    this.renderItems(); // アイテムが0になった場合にプレースホルダを表示するため再描画
                }, { once: true });
            } else {
                this.items = this.items.filter(item => item.id !== id);
                this.saveItems();
                this.renderItems();
            }
        },

        setupSortable() {
            Sortable.create(this.list, {
                group: 'shared-links',
                animation: 150,
                ghostClass: 'sortable-ghost',
                onAdd: (evt) => {
                    this.addItem(evt.item);
                },
                onEnd: (evt) => {
                    // Quick Access内で並び替えた場合
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
     * @function fetchWeather
     * @description 天気情報をAPIから取得して表示する
     */
    const fetchWeather = async () => {
        const weatherWidget = document.getElementById('weather-info');
        if (!weatherWidget) return;

        const apiUrl = 'https://wttr.in/Osaka?format=j1';
        try {
            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error('APIからのレスポンスが正常ではありません。');
            const data = await response.json();
            
            const currentCondition = data.current_condition[0];
            const todayWeather = data.weather[0];
            
            const description = currentCondition.weatherDesc[0].value;
            const tempC = currentCondition.temp_C;
            const maxTemp = todayWeather.maxtempC;
            const minTemp = todayWeather.mintempC;

            // 天気アイコンのマッピング
            const weatherIcons = {
                'Sunny': 'fa-sun',
                'Clear': 'fa-sun',
                'Partly cloudy': 'fa-cloud-sun',
                'Cloudy': 'fa-cloud',
                'Overcast': 'fa-cloud',
                'Mist': 'fa-smog',
                'Rain': 'fa-cloud-rain',
                'Shower': 'fa-cloud-showers-heavy',
                'Snow': 'fa-snowflake',
                'Sleet': 'fa-cloud-meatball',
                'Thundery outbreaks possible': 'fa-cloud-bolt',
                'default': 'fa-cloud-sun' // デフォルトアイコン
            };
            const iconKey = Object.keys(weatherIcons).find(key => description.includes(key)) || 'default';
            const weatherIconClass = `fa-solid ${weatherIcons[iconKey]}`;
            
            weatherWidget.innerHTML = `
                <div class="weather-main">
                    <i class="${weatherIconClass}"></i>
                    <span class="weather-temp">${tempC}°C</span>
                    <span class="weather-desc">${description}</span>
                </div>
                <div class="weather-sub">
                    <span>最高: ${maxTemp}°C</span> / <span>最低: ${minTemp}°C</span>
                </div>`;
        } catch (error) {
            console.error('天気情報の取得に失敗しました:', error);
            weatherWidget.innerHTML = '<p>天気情報を取得できませんでした。</p>';
        }
    };

    /**
     * @function setupScrollAnimations
     * @description IntersectionObserverを用いてスクロール時のアニメーションを設定する
     */
    const setupScrollAnimations = () => {
        const animatedElements = document.querySelectorAll('.card');
        if (animatedElements.length === 0) return;
        
        scrollObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    // Quick Accessや動的に追加されるお気に入り以外は一度表示されたら監視を解除
                    if (!entry.target.closest('#quick-access-sidebar') && !entry.target.classList.contains('favorite-card')) {
                        observer.unobserve(entry.target);
                    }
                }
            });
        }, { threshold: 0.1 });

        animatedElements.forEach(el => {
            if (!el.classList.contains('fade-in-up')) {
                el.classList.add('fade-in-up');
            }
            scrollObserver.observe(el);
        });
    };
    
    /**
     * @function setupParticles
     * @description ヘッダーにparticles.jsを適用する
     */
    const setupParticles = () => {
        if (typeof particlesJS !== 'undefined') {
            particlesJS('particles-js', {
                "particles": { "number": { "value": 60, "density": { "enable": true, "value_area": 800 } }, "color": { "value": "#ffffff" }, "shape": { "type": "circle" }, "opacity": { "value": 0.5, "random": true }, "size": { "value": 3, "random": true }, "line_linked": { "enable": true, "distance": 150, "color": "#ffffff", "opacity": 0.4, "width": 1 }, "move": { "enable": true, "speed": 2, "direction": "none", "random": false, "straight": false, "out_mode": "out" } },
                "interactivity": { "detect_on": "canvas", "events": { "onhover": { "enable": true, "mode": "repulse" }, "onclick": { "enable": true, "mode": "push" } } },
                "retina_detect": true
            });
        } else {
            console.error('particles.jsが読み込まれていません。');
        }
    };
    
    // --- 各機能の初期化・実行 ---
    fetchWeather();
    favoritesApp.init();
    sortableLinks.init();
    quickAccessApp.init();
    setupScrollAnimations();
    setupParticles();
});