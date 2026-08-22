(function () {
  'use strict';

  // ==================== CONFIG ====================
  var CONFIG = {
    storageKey: 'mdg_glass_kaimono',
  };

  // 文字入力なしで選べる品目カタログ
  var CATALOG = [
    { id: 'veg', emoji: '🥬', name: 'やさい', items: ['トマト', 'たまねぎ', 'にんじん', 'じゃがいも', 'キャベツ', 'レタス', 'きゅうり', 'ねぎ', 'ピーマン', 'もやし', 'ほうれんそう', 'だいこん'] },
    { id: 'fruit', emoji: '🍎', name: 'くだもの', items: ['りんご', 'バナナ', 'みかん', 'いちご', 'ぶどう', 'もも', 'キウイ', 'レモン'] },
    { id: 'meat', emoji: '🍖', name: 'にく・さかな', items: ['とりむね', 'とりもも', 'ぶたこま', 'ぎゅうこま', 'ひきにく', 'ベーコン', 'ウインナー', 'さけ', 'さば', 'えび'] },
    { id: 'dairy', emoji: '🥛', name: 'パン・たまご・乳', items: ['しょくパン', 'たまご', 'ぎゅうにゅう', 'ヨーグルト', 'チーズ', 'バター', 'とうふ', 'なっとう'] },
    { id: 'staple', emoji: '🍚', name: 'しゅしょく・めん', items: ['おこめ', 'パスタ', 'うどん', 'そば', 'ラーメン', 'こむぎこ', 'シリアル'] },
    { id: 'drink', emoji: '🧃', name: 'のみもの', items: ['みず', 'おちゃ', 'コーヒー', 'ジュース', 'たんさんすい', 'ビール'] },
    { id: 'season', emoji: '🧂', name: 'ちょうみりょう', items: ['しょうゆ', 'みそ', 'さとう', 'しお', 'あぶら', 'マヨネーズ', 'ケチャップ', 'めんつゆ'] },
    { id: 'snack', emoji: '🍫', name: 'おかし', items: ['チョコ', 'ポテチ', 'クッキー', 'グミ', 'アイス', 'せんべい'] },
    { id: 'daily', emoji: '🧻', name: 'にちようひん', items: ['トイレットペーパー', 'ティッシュ', 'せんざい', 'シャンプー', 'はぶらし', 'でんち', 'ゴミぶくろ', 'マスク'] },
  ];

  // ==================== STATE ====================
  var state = {
    currentScreen: 'home',
    screenHistory: [],
    list: [],            // [{id, name, emoji, cat, checked}]
    trips: 0,            // かいもの完了回数
    currentCat: null,    // items画面で開いているカテゴリid
    doneShown: false,    // 全チェック演出を今回のリストで出したか
  };

  var screens = {};

  function $(id) { return document.getElementById(id); }

  function collectScreens() {
    document.querySelectorAll('.screen').forEach(function (s) {
      if (s.id) screens[s.id] = s;
    });
  }

  // ==================== UTIL ====================
  function toZen(n) {
    return String(n).replace(/\d/g, function (d) {
      return String.fromCharCode(d.charCodeAt(0) + 0xFEE0);
    });
  }

  function findCat(catId) {
    for (var i = 0; i < CATALOG.length; i++) if (CATALOG[i].id === catId) return CATALOG[i];
    return null;
  }

  function itemKey(catId, name) { return catId + ':' + name; }

  function inList(catId, name) {
    var key = itemKey(catId, name);
    for (var i = 0; i < state.list.length; i++) if (state.list[i].id === key) return i;
    return -1;
  }

  function remaining() {
    return state.list.filter(function (it) { return !it.checked; }).length;
  }

  // ==================== NAVIGATION ====================
  function navigateTo(screenId, options) {
    options = options || {};
    if (options.addToHistory !== false && state.currentScreen) {
      state.screenHistory.push(state.currentScreen);
    }
    Object.keys(screens).forEach(function (id) { screens[id].classList.add('hidden'); });
    var next = screens[screenId];
    if (!next) return;
    next.classList.remove('hidden');
    state.currentScreen = screenId;
    onScreenEnter(screenId);
    focusFirst(next);
  }

  function goHome() {
    state.screenHistory = [];
    navigateTo('home', { addToHistory: false });
  }

  function navigateBack() {
    if (state.screenHistory.length > 0) {
      navigateTo(state.screenHistory.pop(), { addToHistory: false });
    } else if (state.currentScreen !== 'home') {
      goHome();
    }
  }

  // ==================== FOCUS ====================
  function focusFirst(container) {
    var el = container.querySelector('.focusable:not([disabled])');
    if (el && el.offsetParent !== null) el.focus();
  }

  function visibleFocusables(container) {
    return Array.from(container.querySelectorAll('.focusable:not([disabled])'))
      .filter(function (el) { return el.offsetParent !== null; });
  }

  function moveFocus(direction) {
    var container = screens[state.currentScreen];
    if (!container) return;
    var focusables = visibleFocusables(container);
    if (focusables.length === 0) return;
    var idx = focusables.indexOf(document.activeElement);
    if (idx === -1) { focusables[0].focus(); return; }
    var nextIdx;
    if (direction === 'up' || direction === 'left') {
      nextIdx = idx > 0 ? idx - 1 : focusables.length - 1;
    } else {
      nextIdx = idx < focusables.length - 1 ? idx + 1 : 0;
    }
    focusables[nextIdx].focus();
    focusables[nextIdx].scrollIntoView({ block: 'nearest' });
  }

  // ==================== STORAGE ====================
  function loadData() {
    try {
      var saved = JSON.parse(localStorage.getItem(CONFIG.storageKey) || '{}');
      if (Array.isArray(saved.list)) state.list = saved.list;
      if (typeof saved.trips === 'number') state.trips = saved.trips;
    } catch (e) { /* 壊れた保存データは無視して初期値で続行 */ }
  }

  function saveData() {
    try {
      localStorage.setItem(CONFIG.storageKey, JSON.stringify({
        list: state.list,
        trips: state.trips,
      }));
    } catch (e) { /* private mode 等では保存できなくてもアプリは動かす */ }
  }

  // ==================== RENDER: HOME ====================
  function renderHome() {
    var listEl = $('shop-list');
    listEl.innerHTML = '';

    // 未チェックを上、チェックずみを下に（元の追加順は保つ）
    var sorted = state.list.slice().sort(function (a, b) {
      return (a.checked ? 1 : 0) - (b.checked ? 1 : 0);
    });

    sorted.forEach(function (it) {
      var btn = document.createElement('button');
      btn.className = 'shop-item focusable' + (it.checked ? ' checked' : '');
      btn.dataset.action = 'toggle-check';
      btn.dataset.itemId = it.id;
      btn.innerHTML =
        '<span class="si-check">' + (it.checked ? '✓' : '') + '</span>' +
        '<span class="si-emoji"></span>' +
        '<span class="si-name"></span>';
      btn.querySelector('.si-emoji').textContent = it.emoji;
      btn.querySelector('.si-name').textContent = it.name;
      listEl.appendChild(btn);
    });

    var total = state.list.length;
    var left = remaining();
    $('empty-note').classList.toggle('hidden', total > 0);
    $('shop-list').classList.toggle('hidden', total === 0);
    $('home-meta').textContent = total === 0
      ? (state.trips > 0 ? 'かいもの ' + toZen(state.trips) + '回め' : 'ハンズフリー')
      : 'のこり ' + toZen(left) + '品';
    var pct = total === 0 ? 0 : Math.round((total - left) / total * 100);
    $('home-progress').style.width = pct + '%';
    $('home-progress-track').classList.toggle('hidden', total === 0);
  }

  // ==================== RENDER: CATALOG / ITEMS ====================
  function renderCatalog() {
    var listEl = $('cat-list');
    listEl.innerHTML = '';
    CATALOG.forEach(function (cat) {
      var count = state.list.filter(function (it) { return it.cat === cat.id; }).length;
      var btn = document.createElement('button');
      btn.className = 'cat-item focusable';
      btn.dataset.action = 'open-cat';
      btn.dataset.catId = cat.id;
      btn.innerHTML =
        '<span class="ci-emoji"></span>' +
        '<span class="ci-name"></span>' +
        '<span class="ci-count"></span>';
      btn.querySelector('.ci-emoji').textContent = cat.emoji;
      btn.querySelector('.ci-name').textContent = cat.name;
      btn.querySelector('.ci-count').textContent = count > 0 ? toZen(count) + '品' : '';
      listEl.appendChild(btn);
    });
    $('catalog-meta').textContent = 'リスト ' + toZen(state.list.length) + '品';
  }

  function renderItems() {
    var cat = findCat(state.currentCat);
    if (!cat) return;
    $('items-title').textContent = cat.emoji + ' ' + cat.name;
    var grid = $('item-grid');
    grid.innerHTML = '';
    cat.items.forEach(function (name) {
      var selected = inList(cat.id, name) !== -1;
      var btn = document.createElement('button');
      btn.className = 'pick-item focusable' + (selected ? ' selected' : '');
      btn.dataset.action = 'toggle-item';
      btn.dataset.catId = cat.id;
      btn.dataset.name = name;
      btn.innerHTML = '<span class="pi-name"></span><span class="pi-badge">' + (selected ? '✓' : '＋') + '</span>';
      btn.querySelector('.pi-name').textContent = name;
      grid.appendChild(btn);
    });
    var count = state.list.filter(function (it) { return it.cat === cat.id; }).length;
    $('items-meta').textContent = count > 0 ? toZen(count) + '品' : '';
  }

  // ==================== ACTIONS: LIST ====================
  function toggleItem(catId, name, btn) {
    var cat = findCat(catId);
    var idx = inList(catId, name);
    if (idx === -1) {
      state.list.push({ id: itemKey(catId, name), name: name, emoji: cat.emoji, cat: catId, checked: false });
    } else {
      state.list.splice(idx, 1);
    }
    state.doneShown = false;
    saveData();
    // フォーカスを保ったままボタンだけ更新
    var selected = idx === -1;
    btn.classList.toggle('selected', selected);
    btn.querySelector('.pi-badge').textContent = selected ? '✓' : '＋';
    var count = state.list.filter(function (it) { return it.cat === catId; }).length;
    $('items-meta').textContent = count > 0 ? toZen(count) + '品' : '';
  }

  function toggleCheck(itemId) {
    for (var i = 0; i < state.list.length; i++) {
      if (state.list[i].id === itemId) {
        state.list[i].checked = !state.list[i].checked;
        break;
      }
    }
    saveData();
    renderHome();

    if (state.list.length > 0 && remaining() === 0 && !state.doneShown) {
      state.doneShown = true;
      state.trips += 1;
      saveData();
      $('done-sub').textContent = toZen(state.list.length) + '品 ぜんぶチェック！ かいもの ' + toZen(state.trips) + '回め';
      setTimeout(function () { navigateTo('done', { addToHistory: false }); }, 450);
      return;
    }
    // チェック後もリスト内の操作を続けられるようにフォーカスを戻す
    var next = $('shop-list').querySelector('.shop-item:not(.checked)') || $('shop-list').querySelector('.shop-item');
    if (next) next.focus();
  }

  // ==================== ACTIONS ====================
  function handleAction(action, element) {
    switch (action) {
      case 'add':
        navigateTo('catalog');
        break;
      case 'menu':
        navigateTo('menu');
        break;
      case 'open-cat':
        state.currentCat = element.dataset.catId;
        navigateTo('items');
        break;
      case 'toggle-item':
        toggleItem(element.dataset.catId, element.dataset.name, element);
        break;
      case 'toggle-check':
        toggleCheck(element.dataset.itemId);
        break;
      case 'uncheck-all':
        state.list.forEach(function (it) { it.checked = false; });
        state.doneShown = false;
        saveData();
        goHome();
        break;
      case 'remove-checked':
        state.list = state.list.filter(function (it) { return !it.checked; });
        state.doneShown = false;
        saveData();
        goHome();
        break;
      case 'clear-all':
        state.list = [];
        state.doneShown = false;
        saveData();
        goHome();
        break;
      case 'finish-clear':
        state.list = [];
        state.doneShown = false;
        saveData();
        goHome();
        break;
      case 'finish-keep':
        goHome();
        break;
      case 'back':
        navigateBack();
        break;
    }
  }

  function onScreenEnter(screenId) {
    if (screenId === 'home') renderHome();
    if (screenId === 'catalog') renderCatalog();
    if (screenId === 'items') renderItems();
  }

  // ==================== EVENTS ====================
  function setupEvents() {
    document.addEventListener('click', function (e) {
      var el = e.target.closest('[data-action]');
      if (el) handleAction(el.dataset.action, el);
    });

    document.addEventListener('keydown', function (e) {
      switch (e.key) {
        case 'ArrowUp':
          moveFocus('up');
          e.preventDefault();
          break;
        case 'ArrowDown':
          moveFocus('down');
          e.preventDefault();
          break;
        case 'ArrowLeft':
          moveFocus('left');
          e.preventDefault();
          break;
        case 'ArrowRight':
          moveFocus('right');
          e.preventDefault();
          break;
        case 'Enter':
          if (document.activeElement && document.activeElement.classList.contains('focusable')) {
            document.activeElement.click();
          }
          e.preventDefault();
          break;
        case 'Escape':
          // PC確認用の補助のみ（グラスに戻るジェスチャーはない）
          navigateBack();
          e.preventDefault();
          break;
      }
    });
  }

  // ==================== INIT ====================
  function init() {
    collectScreens();
    setupEvents();
    loadData();
    setTimeout(function () { navigateTo('home', { addToHistory: false }); }, 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
