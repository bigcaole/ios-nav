if ("serviceWorker" in navigator) {
        window.addEventListener("load", () => {
          navigator.serviceWorker.register("/service-worker.js");
        });
      }

      document.addEventListener("DOMContentLoaded", () => {

      const grid = document.querySelector("#appGrid");
      const dockGrid = document.querySelector("#dockGrid");
      const modal = document.querySelector("#modal");
      const addMenuModal = document.querySelector("#addMenuModal");
      const categoryManagerModal = document.querySelector("#categoryManagerModal");
      const settingsModal = document.querySelector("#settingsModal");
      const visitorModal = document.querySelector("#visitorModal");
      const settingsBackdrop = document.querySelector("#settingsBackdrop");
      const visitorBackdrop = document.querySelector("#visitorBackdrop");
      const addBtn = document.querySelector("#addBtn");
      const addMenuCloseBtn = document.querySelector("#addMenuCloseBtn");
      const addLinkEntryBtn = document.querySelector("#addLinkEntryBtn");
      const manageCategoryEntryBtn = document.querySelector("#manageCategoryEntryBtn");
      const cancelBtn = document.querySelector("#cancelBtn");
      const loginBtn = document.querySelector("#loginBtn");
      const registerBtn = document.querySelector("#registerBtn");
      const settingsBtn = document.querySelector("#settingsBtn");
      const settingsCloseBtn = document.querySelector("#settingsCloseBtn");
      const visitorCloseBtn = document.querySelector("#visitorCloseBtn");
      const toast = document.querySelector("#toast");
      const modalBackBtn = document.querySelector("#modalBackBtn");
      const avatarWrap = document.querySelector("#avatarWrap");
      const avatarBtn = document.querySelector("#avatarBtn");
      const avatarMenu = document.querySelector("#avatarMenu");
      const avatarImg = document.querySelector("#avatarImg");
      const avatarText = document.querySelector("#avatarText");
      const userNameLabel = document.querySelector("#userNameLabel");
      const profileEditBtn = document.querySelector("#profileEditBtn");
      const logoutBtn = document.querySelector("#logoutBtn");
      const menuToggle = document.querySelector("#menuToggle");
      const controlGroup = document.querySelector("#controlGroup");
      const modeControl = document.querySelector("#modeControl");
      const modeButtons = modeControl ? Array.from(modeControl.querySelectorAll(".mode-btn")) : [];
      const viewToggleBtn = document.querySelector("#viewToggleBtn");
      const linkForm = document.querySelector("#linkForm");
      const formTitle = document.querySelector("#formTitle");
      const saveBtn = document.querySelector("#saveBtn");
      const topControls = document.querySelector("#top-controls");
      const titleInput = document.querySelector("#titleInput");
      const urlInput = document.querySelector("#urlInput");
      const tagsInput = document.querySelector("#tagsInput");
      const protocolToggle = document.querySelector("#protocolToggle");
      const protocolButtons = protocolToggle
        ? Array.from(protocolToggle.querySelectorAll(".protocol-btn"))
        : [];
      const categoryInput = document.querySelector("#categoryInput");
      const categorySelectBtn = document.querySelector("#categorySelectBtn");
      const categorySelectLabel = document.querySelector("#categorySelectLabel");
      const categorySelectMenu = document.querySelector("#categorySelectMenu");
      const dockInput = document.querySelector("#dockInput");
      const privateInput = document.querySelector("#privateInput");
      const categoryManagerCloseBtn = document.querySelector("#categoryManagerCloseBtn");
      const categoryManagerDoneBtn = document.querySelector("#categoryManagerDoneBtn");
      const newCategoryInput = document.querySelector("#newCategoryInput");
      const createCategoryBtn = document.querySelector("#createCategoryBtn");
      const categoryManagerList = document.querySelector("#categoryManagerList");
      const newCategoryPrivate = document.querySelector("#newCategoryPrivate");
      const iosBg = document.querySelector("#iosBg");
      const siteTitle = document.querySelector("#siteTitle");
      const logoMark = document.querySelector(".logo-mark");
      const siteLogoImg = document.querySelector("#siteLogoImg");
      const siteLogoText = document.querySelector("#siteLogoText");
      const todayVisitorBadge = document.querySelector("#todayVisitorBadge");
      const visitorList = document.querySelector("#visitorList");
      const visitorEmpty = document.querySelector("#visitorEmpty");
      const siteNameInput = document.querySelector("#siteNameInput");
      const logoInput = document.querySelector("#logoInput");
      const fontSizeInput = document.querySelector("#fontSizeInput");
      const boldToggle = document.querySelector("#boldToggle");
      const iconSizeInput = document.querySelector("#iconSizeInput");
      const frostBlurInput = document.querySelector("#frostBlurInput");
      const brightnessInput = document.querySelector("#brightnessInput");
      const brightnessControl = document.querySelector("#brightnessControl");
      const brightnessToggle = document.querySelector("#brightnessToggle");
      const userTotpToggle = document.querySelector("#userTotpToggle");
      const exportBtn = document.querySelector("#exportBtn");
      const importFile = document.querySelector("#importFile");
      const importBtn = document.querySelector("#importBtn");
      const backupGroup = document.querySelector("#backupGroup");
      const settingsSaveBtn = document.querySelector("#settingsSaveBtn");
      const searchInput = document.querySelector("#searchInput");
      const searchClearBtn = document.querySelector("#searchClearBtn");
      const brightnessSettingInput = document.querySelector("#brightnessSettingInput");
      const lowPowerToggle = document.querySelector("#lowPowerToggle");
      const quickBrightnessToggle = document.querySelector("#quickBrightnessToggle");
      const compactHeaderToggle = document.querySelector("#compactHeaderToggle");
      const saveLayoutA = document.querySelector("#saveLayoutA");
      const saveLayoutB = document.querySelector("#saveLayoutB");
      const applyLayoutA = document.querySelector("#applyLayoutA");
      const applyLayoutB = document.querySelector("#applyLayoutB");
      const bulkBar = document.querySelector("#bulkBar");
      const bulkCount = document.querySelector("#bulkCount");
      const bulkMoveSelect = document.querySelector("#bulkMoveSelect");
      const bulkMoveBtn = document.querySelector("#bulkMoveBtn");
      const bulkDeleteBtn = document.querySelector("#bulkDeleteBtn");
      const editModeToggle = document.getElementById("editModeSwitch");
      const deleteModeToggle = document.getElementById("deleteModeSwitch");
      const sortLockBtn = document.querySelector("#sortLockBtn");
      const editToolbar = document.querySelector("#editToolbar");
      const editDoneBtn = document.querySelector("#editDoneBtn");
      const editStatusLabel = document.querySelector("#editStatusLabel");
      let loggedIn = false;
      let editing = false;
      let deleting = false;
      let currentMode = "preview";
      let categoryLayoutState = null;
      let categoryDragState = null;
      let categoryDragPointerId = null;
      let currentUsername = "";
      let visitorTracked = false;
      let currentProtocol = "https://";
      let isAdmin = false;
      let registerOpenUntil = null;
      const publicUsername = (() => {
        try {
          const params = new URLSearchParams(window.location.search);
          let name = params.get("user") || params.get("u") || "";
          if (!name) {
            const match = window.location.pathname.match(/^\/u\/([^/]+)$/);
            if (match && match[1]) {
              name = decodeURIComponent(match[1]);
            }
          }
          if (!name) {
            const pathMatch = window.location.pathname.match(/^\/([A-Za-z0-9]+)$/);
            if (pathMatch && pathMatch[1]) {
              const candidate = decodeURIComponent(pathMatch[1]);
              const reserved = new Set([
                "api",
                "public",
                "guide",
                "login",
                "register",
                "profile",
                "manifest",
                "service-worker",
                "favicon",
                "icon"
              ]);
              if (!reserved.has(candidate.toLowerCase())) {
                name = candidate;
              }
            }
          }
          return name ? String(name).trim() : "";
        } catch (err) {
          return "";
        }
      })()
      const isVisitorMode = Boolean(publicUsername);;
      const savedViewMode = localStorage.getItem("viewMode");
      let viewMode =
        window.innerWidth < 768 ? "card" : savedViewMode || "list";
      let iconScale = 1;
        let editingLinkId = null;
        let editingDockPosition = null;
        let returnToSettings = null;
        let returnToMode = null;
        let pendingChanges = false;
        let sortUnlocked = false;
        let activeDeleteBubble = null;
        let activeDeleteId = null;
        const dockLimit = 6;
        let dockFullWarned = false;
      let saveTimer = null;
      let appearanceTimer = null;

      const modalList = [modal, addMenuModal, categoryManagerModal, settingsModal, visitorModal].filter(Boolean);
      const iconCache = new Map();
      const iconCacheOrder = [];
      let iconCacheSaveTimer = null;
      const MAX_ICON_CACHE = 320;
      const ICON_CACHE_KEY = "iconCacheV2";
      let scrollLockY = 0;
      let scrollPerfTimer = null;
      let scrollRaf = null;
      let lastRenderSignature = "";
      let renderQueued = false;
      let searchTerm = "";
      const bulkSelected = new Set();
      let categoryLazyObserver = null;
      const lazyCategoryMap = new Map();

      function loadIconCache() {
        try {
          const raw = localStorage.getItem(ICON_CACHE_KEY);
          if (!raw) return;
          const parsed = JSON.parse(raw);
          if (!parsed || typeof parsed !== "object") return;
          const entries = parsed.entries || {};
          const order = Array.isArray(parsed.order) ? parsed.order : Object.keys(entries);
          order.forEach((key) => {
            if (entries[key]) {
              iconCache.set(key, entries[key]);
              iconCacheOrder.push(key);
            }
          });
        } catch (err) {}
      }

      function persistIconCache() {
        if (iconCacheSaveTimer) {
          clearTimeout(iconCacheSaveTimer);
        }
        iconCacheSaveTimer = setTimeout(() => {
          try {
            const entries = {};
            iconCacheOrder.forEach((key) => {
              const value = iconCache.get(key);
              if (value) {
                entries[key] = value;
              }
            });
            localStorage.setItem(ICON_CACHE_KEY, JSON.stringify({ order: iconCacheOrder, entries }));
          } catch (err) {}
        }, 300);
      }

      function rememberIconCache(key, value) {
        if (!key || !value) return;
        if (iconCache.has(key)) {
          const idx = iconCacheOrder.indexOf(key);
          if (idx !== -1) iconCacheOrder.splice(idx, 1);
        }
        iconCache.set(key, value);
        iconCacheOrder.unshift(key);
        if (iconCacheOrder.length > MAX_ICON_CACHE) {
          const toDrop = iconCacheOrder.splice(MAX_ICON_CACHE);
          toDrop.forEach((dropKey) => iconCache.delete(dropKey));
        }
        persistIconCache();
      }

      loadIconCache();

      function updateMobileClass() {
        const isMobileView =
          window.matchMedia("(max-width: 768px)").matches ||
          /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        document.body.classList.toggle("is-mobile", isMobileView);
      }
      updateMobileClass();
      window.addEventListener("resize", updateMobileClass, { passive: true });

      function lockBodyScroll() {
        const isMobile =
          window.matchMedia && window.matchMedia("(max-width: 640px)").matches;
        if (!isMobile) return;
        if (document.body.classList.contains("scroll-locked")) return;
        scrollLockY = window.scrollY || 0;
        document.body.classList.add("scroll-locked");
        document.body.style.top = `-${scrollLockY}px`;
      }

      function unlockBodyScroll() {
        if (!document.body.classList.contains("scroll-locked")) return;
        document.body.classList.remove("scroll-locked");
        const top = document.body.style.top;
        document.body.style.top = "";
        const offset = parseInt(top || "0", 10) * -1;
        window.scrollTo(0, offset || scrollLockY || 0);
      }

      function openModal(target, options = {}) {
        if (!target) return;
        modalList.forEach((item) => {
          if (item !== target) {
            item.classList.remove("active");
          }
        });
        target.classList.remove("closing");
        target.classList.add("active");
        document.body.classList.add("modal-open");
        lockBodyScroll();
        returnToSettings = options.returnToSettings ? target : null;
        if (target === settingsModal && avatarMenu) {
          setAvatarMenuOpen(false);
        }
      }

        function closeModal(target) {
          if (!target) return;
          if (!target.classList.contains("active")) return;
          target.classList.add("closing");
          const closeDelay = 180;
          setTimeout(() => {
            target.classList.remove("active", "closing");
            if (returnToSettings === target) {
              returnToSettings = null;
              if (settingsModal) {
                openModal(settingsModal);
              }
            }
            if (!document.querySelector(".modal.active")) {
              document.body.classList.remove("modal-open");
              unlockBodyScroll();
            }
          }, closeDelay);
          if (returnToSettings === target) {
            returnToSettings = null;
            if (settingsModal) {
              openModal(settingsModal);
            }
          }
        }

        function closeEditModalToPreview() {
          const nextMode = returnToMode || "preview";
          returnToMode = null;
          returnToSettings = null;
          closeModal(modal);
          setActiveMode(nextMode);
        }

      function renderCategorySelect(categories, selectedName) {
        if (!categorySelectMenu || !categorySelectLabel || !categoryInput) return;
        categorySelectMenu.innerHTML = "";
        const current =
          selectedName || categoryInput.value || (categories[0] ? categories[0].name : "");

        categories.forEach((item) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "select-item";
          btn.dataset.private = item.is_private ? "1" : "0";
          const label = document.createElement("span");
          label.textContent = item.name;
          btn.appendChild(label);
          if (item.is_private) {
            const lock = document.createElement("span");
            lock.className = "select-lock";
            lock.textContent = "🔒";
            btn.appendChild(lock);
          }
          if (item.name === current) {
            const check = document.createElement("span");
            check.className = "select-check";
            check.innerHTML =
              '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M9.5 16.2 5.8 12.5a1 1 0 0 1 1.4-1.4l2.3 2.3 6.1-6.1a1 1 0 1 1 1.4 1.4l-6.8 6.8a1 1 0 0 1-1.4 0Z"/></svg>';
            btn.appendChild(check);
          }
          btn.addEventListener("click", (event) => {
            event.stopPropagation();
            categoryInput.value = item.name;
            categorySelectLabel.textContent = item.name;
            categorySelectMenu.classList.remove("open");
            renderCategorySelect(categories, item.name);
            syncPrivateToggleForCategory(item.name);
          });
          categorySelectMenu.appendChild(btn);
        });

        const manageBtn = document.createElement("button");
        manageBtn.type = "button";
        manageBtn.className = "select-item select-manage";
        manageBtn.innerHTML =
          '<span>+ 管理/新建分类</span><span class="select-check"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 5a7 7 0 1 1-7 7 7 7 0 0 1 7-7Zm0-2a9 9 0 1 0 9 9 9 9 0 0 0-9-9Zm1 8h3a1 1 0 0 1 0 2h-3v3a1 1 0 1 1-2 0v-3H8a1 1 0 1 1 0-2h3V8a1 1 0 1 1 2 0Z"/></svg></span>';
        manageBtn.addEventListener("click", (event) => {
          event.stopPropagation();
          categorySelectMenu.classList.remove("open");
          closeModal(modal);
          loadCategories().then((list) => {
            renderCategoryManager(list);
          });
            openModal(categoryManagerModal, { returnToSettings: false });
        });
        categorySelectMenu.appendChild(manageBtn);

        categoryInput.value = current || "";
        categorySelectLabel.textContent = current || "选择分类";
        syncPrivateToggleForCategory(current);
      }

      async function parseCategoryResponse(res, fallbackMessage) {
        const contentType = res.headers.get("content-type") || "";
        if (!res.ok) {
          if (contentType.includes("text/html")) {
            const text = await res.text();
            console.warn("收到非 JSON 响应，可能是静态资源路径冲突");
            console.warn("Response preview:", text.slice(0, 100));
            throw new Error("服务器返回了网页，请检查登录态或 API 路径");
          }
          let errData = null;
          try {
            errData = await res.json();
          } catch (err) {
            errData = null;
          }
          throw new Error(
            (errData && (errData.detail || errData.error)) || fallbackMessage || "请求失败"
          );
        }
        if (contentType.includes("text/html")) {
          const text = await res.text();
          console.warn("收到非 JSON 响应，可能是静态资源路径冲突");
          console.warn("Response preview:", text.slice(0, 100));
          throw new Error("服务器返回了网页，请检查登录态或 API 路径");
        }
        return res.json();
      }

      function loadCategories(selectedName) {
        return fetch("/api/categories", { credentials: "include" })
          .then((res) => parseCategoryResponse(res, "加载分类失败"))
          .then((data) => {
            const list = Array.isArray(data) ? data : [];
            const categories = list.map((item) => {
              if (typeof item === "string") {
                return { id: item, name: item };
              }
              return {
                id: item.id,
                name: item.name,
                is_private: Boolean(item.is_private),
                pos_x: Number.isFinite(item.pos_x) ? item.pos_x : null,
                pos_y: Number.isFinite(item.pos_y) ? item.pos_y : null
              };
            });
            allCategories = categories;
            renderCategorySelect(categories, selectedName);
            refreshBulkMoveOptions();
            if (Array.isArray(allLinks) && allLinks.length) {
              renderLinks(allLinks);
              renderDockLinks(allLinks);
            }
            return categories;
          })
          .catch((err) => {
            alert(err.message || "加载分类失败");
            return [];
          });
      }

      function getCategoryByName(name) {
        if (!name) return null;
        return allCategories.find((item) => item.name === name) || null;
      }

      function refreshBulkMoveOptions() {
        if (!bulkMoveSelect) return;
        bulkMoveSelect.innerHTML = '<option value="">移动到...</option>';
        allCategories.forEach((item) => {
          const option = document.createElement("option");
          option.value = item.name;
          option.textContent = item.name;
          bulkMoveSelect.appendChild(option);
        });
      }

      function syncPrivateToggleForCategory(name) {
        if (!privateInput) return;
        const info = getCategoryByName(name);
        if (info && info.is_private) {
          privateInput.checked = true;
          privateInput.disabled = true;
        } else {
          privateInput.disabled = false;
        }
      }

      function renderCategoryManager(categories) {
        if (!categoryManagerList) return;
        categoryManagerList.innerHTML = "";
        if (!categories || !categories.length) {
          const empty = document.createElement("div");
          empty.className = "category-row";
          empty.textContent = "暂无分类";
          categoryManagerList.appendChild(empty);
          return;
        }
        categories.forEach((item) => {
          const row = document.createElement("div");
          row.className = "category-row";
          const name = document.createElement("div");
          name.className = "category-name text-slate-900 dark:text-slate-100 font-bold opacity-100 pl-1";
          name.textContent = item.name || "未命名分类";
          if (item.is_private) {
            const lock = document.createElement("span");
            lock.className = "category-lock";
            lock.textContent = "🔒";
            name.appendChild(lock);
          }
          const privacy = document.createElement("label");
          privacy.className = "toggle";
          const privacyInput = document.createElement("input");
          privacyInput.type = "checkbox";
          privacyInput.className = "category-private-toggle";
          privacyInput.dataset.id = item.id;
          privacyInput.checked = Boolean(item.is_private);
          const privacySlider = document.createElement("span");
          privacySlider.className = "slider";
          privacy.append(privacyInput, privacySlider);
          privacyInput.addEventListener("change", (event) => {
            event.preventDefault();
            event.stopPropagation();
            const checked = privacyInput.checked;
            const nameText = name.textContent.replace("🔒", "").trim();
            fetch(`/api/categories/${item.id}`, {
              method: "PUT",
              credentials: "include",
              headers: { "Content-Type": "application/json; charset=utf-8" },
              body: JSON.stringify({ name: nameText, is_private: checked })
            })
              .then((res) => parseCategoryResponse(res, "更新失败"))
              .then((updated) => {
                loadCategories(updated.name || nameText).then((list) => {
                  renderCategoryManager(list);
                });
                fetchLinks();
              })
              .catch((err) => {
                alert(err.message || "更新失败");
              });
          });
          const actions = document.createElement("div");
          actions.className = "category-actions";

          const editBtn = document.createElement("button");
          editBtn.type = "button";
          editBtn.className = "icon-btn";
          editBtn.dataset.id = item.id;
          editBtn.innerHTML =
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 17.25V20h2.75l8.1-8.1-2.75-2.75-8.1 8.1Zm15.71-9.04a1 1 0 0 0 0-1.41l-2.5-2.5a1 1 0 0 0-1.41 0l-1.95 1.95 3.91 3.91 1.95-1.95Z"/></svg>';
          editBtn.addEventListener("click", () => {
            const nextName = window.prompt("请输入新的分类名称", item.name);
            if (!nextName) return;
            fetch(`/api/categories/${item.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json; charset=utf-8" },
              body: JSON.stringify({ name: nextName })
            })
              .then((res) => {
                if (!res.ok) throw new Error("更新失败");
                return res.json();
              })
              .then((updated) => {
                loadCategories(updated.name || nextName).then((list) => {
                  renderCategoryManager(list);
                });
                applySearch();
              })
              .catch((err) => {
                alert(err.message || "更新失败");
              });
          });

          const deleteBtn = document.createElement("button");
          deleteBtn.type = "button";
          deleteBtn.className = "icon-btn danger";
          deleteBtn.dataset.id = item.id;
          deleteBtn.innerHTML =
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 7h12v2H6V7Zm2 3h8l-1 10H9L8 10Zm4-7a2 2 0 0 1 2 2v1H10V5a2 2 0 0 1 2-2Z"/></svg>';
          deleteBtn.addEventListener("click", () => {
            const confirmDelete = window.confirm(
              "删除分类并删除其链接？点击取消将移动到“未分类”。"
            );
            const mode = confirmDelete ? "delete" : "move";
            fetch(`/api/categories/${item.id}?mode=${mode}`, { method: "DELETE" })
              .then((res) => {
                if (!res.ok) throw new Error("删除失败");
                row.remove();
                loadCategories();
                fetchLinks();
              })
              .catch((err) => {
                alert(err.message || "删除失败");
              });
          });

          actions.append(editBtn, deleteBtn);
          row.dataset.categoryId = item.id;
          row.append(name, privacy, actions);
          categoryManagerList.appendChild(row);
        });
      }
      let allLinks = [];
      let allCategories = [];
      let sortables = [];

      function hashCode(text) {
        let hash = 0;
        for (let i = 0; i < text.length; i += 1) {
          hash = (hash << 5) - hash + text.charCodeAt(i);
          hash |= 0;
        }
        return Math.abs(hash);
      }

      function slugify(text) {
        return String(text || "")
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
          .replace(/^-+|-+$/g, "");
      }

      function colorPair(seed) {
        const hue = seed % 360;
        const hue2 = (hue + 40 + (seed % 60)) % 360;
        return [`hsl(${hue}, 70%, 55%)`, `hsl(${hue2}, 80%, 45%)`];
      }

      function normalizeUrlForFavicon(url) {
        const raw = String(url || "").trim();
        if (!raw) return "";
        if (/^https?:\/\//i.test(raw)) {
          return raw;
        }
        return `https://${raw.replace(/^\/+/, "")}`;
      }

      function tryParseUrl(url) {
        const normalized = normalizeUrlForFavicon(url);
        if (!normalized) return null;
        try {
          return new URL(normalized);
        } catch (err) {
          return null;
        }
      }

      function firstLetter(url) {
        const parsed = tryParseUrl(url);
        if (!parsed) return "A";
        const host = parsed.hostname.replace(/^www\./, "");
        return host.charAt(0).toUpperCase() || "A";
      }

      function pickInitial(title, url) {
        const text = String(title || "").trim();
        const han = text.match(/[\u4e00-\u9fff]/);
        if (han) return han[0];
        const latin = text.replace(/[^A-Za-z0-9]/g, "");
        if (latin) return latin.charAt(0).toUpperCase();
        return firstLetter(url);
      }

      function normalizeHost(url) {
        const parsed = tryParseUrl(url);
        return parsed ? parsed.hostname.replace(/^www\./, "") : "";
      }

      function normalizeIconUrl(iconUrl) {
        if (!iconUrl || typeof iconUrl !== "string") return "";
        if (iconUrl.startsWith("/public/icons/")) {
          return iconUrl.replace("/public/icons/", "/icons/");
        }
        return iconUrl;
      }

      function setProtocol(value) {
        currentProtocol = value;
        protocolButtons.forEach((btn) => {
          const isActive = btn.dataset.proto === value;
          btn.classList.toggle("active", isActive);
        });
      }

      function applyUrlToInput(fullUrl) {
        if (!fullUrl) {
          if (urlInput) urlInput.value = "";
          setProtocol("https://");
          return;
        }
        if (/^https?:\/\//i.test(fullUrl)) {
          try {
            const parsed = new URL(fullUrl);
            setProtocol(`${parsed.protocol}//`);
            const rest =
              parsed.host +
              (parsed.pathname || "") +
              (parsed.search || "") +
              (parsed.hash || "");
            if (urlInput) urlInput.value = rest.replace(/^\/+/, "");
            return;
          } catch (err) {}
        }
        if (urlInput) urlInput.value = fullUrl;
        setProtocol("https://");
      }

      function buildFullUrl() {
        const raw = (urlInput ? urlInput.value : "").trim();
        if (!raw) return "";
        if (/^https?:\/\//i.test(raw)) {
          return raw;
        }
        return `${currentProtocol}${raw.replace(/^\/+/, "")}`;
      }

      function buildIcon(iconEl, url, iconUrl, isPrivate, title) {
        const seed = hashCode(url);
        const [c1, c2] = colorPair(seed);

        const cacheKey =
          normalizeIconUrl(iconUrl) ||
          normalizeUrlForFavicon(url) ||
          normalizeHost(url) ||
          url;

        const lockEl = isPrivate
          ? (() => {
              const lock = document.createElement("div");
              lock.className = "lock";
              lock.innerHTML =
                '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2ZM10 7a2 2 0 1 1 4 0v2h-4V7Z"/></svg>';
              return lock;
            })()
          : null;

        function fallbackToLetter() {
          iconEl.innerHTML = "";
          iconEl.classList.add("icon-fallback");
          iconEl.style.background = `linear-gradient(135deg, ${c1}, ${c2})`;
          const text = document.createElement("span");
          text.className = "icon-fallback-text";
          text.textContent = pickInitial(title, url);
          iconEl.appendChild(text);
          if (lockEl) {
            iconEl.appendChild(lockEl);
          }
        }

        function isGenericPlaceholder(src, width, height) {
          const source = String(src || "").toLowerCase();
          if (!source) return false;
          const fromProxy =
            source.includes("google.com/s2/favicons") ||
            source.includes("gstatic.com/faviconv2") ||
            source.includes("icon.horse");
          if (!fromProxy) return false;
          const size = Math.max(width || 0, height || 0);
          return size > 0 && size <= 24;
        }

        const img = document.createElement("img");
        img.className =
          "w-full h-full object-cover rounded-2xl transition-transform duration-300 hover:scale-110 transform";
        img.loading = "lazy";
        img.decoding = "async";
        img.referrerPolicy = "no-referrer";
        img.style.opacity = "0";
        img.style.transition = "opacity 0.2s ease";
        img.style.pointerEvents = "none";
        img.draggable = false;
        iconEl.classList.remove("icon-fallback");
        const candidates = [];
        const normalizedIcon = normalizeIconUrl(iconUrl);
        if (normalizedIcon && typeof normalizedIcon === "string") {
          candidates.push(normalizedIcon);
        }
        const fullUrl = normalizeUrlForFavicon(url);
        const parsedUrl = tryParseUrl(fullUrl || url);
        const host = normalizeHost(fullUrl || url);
        const origin = parsedUrl ? parsedUrl.origin : "";
        const specialIcons = {
          "mail.google.com": "https://www.gstatic.com/images/branding/product/1x/gmail_2020q4_48dp.png",
          "calendar.google.com":
            "https://ssl.gstatic.com/calendar/images/dynamiclogo_2020q4/calendar_31_2x.png",
          "drive.google.com": "https://www.gstatic.com/images/branding/product/1x/drive_2020q4_48dp.png",
          "www.google.com": "https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png",
          "google.com": "https://www.gstatic.com/images/branding/product/1x/googleg_48dp.png",
          "youtube.com": "https://www.youtube.com/s/desktop/7d4f3b7a/img/favicon_144x144.png",
          "www.youtube.com": "https://www.youtube.com/s/desktop/7d4f3b7a/img/favicon_144x144.png"
        };
        if (host && specialIcons[host]) {
          candidates.push(specialIcons[host]);
        }
        if (origin) {
          candidates.push(`${origin}/favicon.ico`);
          candidates.push(`${origin}/favicon.png`);
          candidates.push(`${origin}/apple-touch-icon.png`);
          candidates.push(`${origin}/apple-touch-icon-precomposed.png`);
          candidates.push(`${origin}/favicon-32x32.png`);
          candidates.push(`${origin}/favicon-192x192.png`);
        }
        let idx = 0;
        const loadNext = () => {
          if (!candidates.length || idx >= candidates.length) {
            if (img.parentNode) {
              img.remove();
            }
            return;
          }
          img.src = candidates[idx++];
        };
        img.alt = "";
        img.onerror = () => {
          loadNext();
        };
        img.onload = () => {
          if (isGenericPlaceholder(img.src, img.naturalWidth, img.naturalHeight)) {
            loadNext();
            return;
          }
          try {
            if (cacheKey) {
              rememberIconCache(cacheKey, img.src);
            }
          } catch (err) {}
          const fallbackText = iconEl.querySelector(".icon-fallback-text");
          if (fallbackText) {
            fallbackText.remove();
          }
          iconEl.classList.remove("icon-fallback");
          iconEl.style.background = "";
          if (!iconEl.contains(img)) {
            iconEl.appendChild(img);
          }
          img.style.opacity = "1";
          if (lockEl && !iconEl.contains(lockEl)) {
            iconEl.appendChild(lockEl);
          }
        };
        const cached = cacheKey ? iconCache.get(cacheKey) : null;
        if (cached) {
          iconEl.innerHTML = "";
          iconEl.style.background = "";
          iconEl.classList.remove("icon-fallback");
          img.src = cached;
          img.style.opacity = "1";
          iconEl.appendChild(img);
          if (lockEl) {
            iconEl.appendChild(lockEl);
          }
          return;
        }
        if (!candidates.length) {
          fallbackToLetter();
          return;
        }
        fallbackToLetter();
        iconEl.appendChild(img);
        loadNext();
      }

      function prefetchIcons(items = []) {
        items.forEach((item) => {
          const direct = normalizeIconUrl(item.icon);
          const normalized = normalizeUrlForFavicon(item.url);
          const cacheKey =
            normalizeIconUrl(item.icon) ||
            normalizeUrlForFavicon(item.url) ||
            normalizeHost(item.url) ||
            item.url;
          const prefetchUrl = direct
            ? direct
            : normalized
            ? `https://t2.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(
                normalized
              )}&size=128`
            : "";
          if (!prefetchUrl) return;
          const img = new Image();
          img.decoding = "async";
          img.loading = "lazy";
          img.referrerPolicy = "no-referrer";
          img.src = prefetchUrl;
          if (cacheKey) {
            rememberIconCache(cacheKey, prefetchUrl);
          }
        });
      }

            function groupByCategory(links) {
        const groups = {};
        const order = [];
        const privacy = {};
        links.forEach((item) => {
          const key = (item.category || "默认分类").trim();
          if (!groups[key]) {
            groups[key] = [];
          }
          if (item.category_private) {
            privacy[key] = true;
          }
          groups[key].push(item);
        });
        const preferredOrder = Array.isArray(allCategories)
          ? allCategories.map((c) => c.name).filter(Boolean)
          : [];
        preferredOrder.forEach((name) => {
          if (groups[name]) {
            order.push(name);
          }
        });
        Object.keys(groups).forEach((name) => {
          if (!order.includes(name)) {
            order.push(name);
          }
        });
        return { groups, order, privacy };
      }

      function renderDockLinks(links) {
        try {
          if (!dockGrid) return;
          dockGrid.dataset.dock = "true";
          const dockItems = links.filter((item) => item.is_dock);
          const dockContainer = dockGrid.closest("#dock-container");
          if (dockContainer) {
            dockContainer.classList.toggle("dock-empty", !dockItems.length);
          }
          dockGrid.innerHTML = "";
          dockItems.sort((a, b) => {
            const ai = Number(a.position_index);
            const bi = Number(b.position_index);
            const aValid = Number.isFinite(ai);
            const bValid = Number.isFinite(bi);
            if (aValid && bValid && ai !== bi) return ai - bi;
            if (aValid !== bValid) return aValid ? -1 : 1;
            const as = Number(a.sort_index) || 0;
            const bs = Number(b.sort_index) || 0;
            if (as !== bs) return as - bs;
            return String(a.id).localeCompare(String(b.id));
          });

        dockItems.forEach((item, index) => {
            const isPrivate = loggedIn && Number(item.is_private) === 1;
            const card = document.createElement("a");
            const showJiggle = editing || deleting;
            card.className = showJiggle
              ? "app dock-item jiggle icon-item"
              : "app dock-item icon-item";
            card.href = item.url;
            card.target = "_blank";
            card.rel = "noreferrer";
            const canDragDock = currentMode === "sort" || sortUnlocked;
            card.draggable = canDragDock;
            card.setAttribute("draggable", canDragDock ? "true" : "false");
            card.dataset.id = item.id;
            card.dataset.title = item.title || "";
            card.dataset.originalTitle = item.title || "";
            card.dataset.category = "";
            card.dataset.dock = "true";
            card.dataset.positionIndex = String(index);
            card.addEventListener("click", () => {
              if (currentMode !== "preview") return;
              trackVisitorEvent("click", {
                linkId: item.id,
                title: item.title || "",
                url: item.url,
                category: item.category || ""
              });
            });

            const icon = document.createElement("div");
            icon.className =
              "icon mb-2 border border-white/20 bg-white/40 dark:bg-black/40 backdrop-blur-xl rounded-2xl shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:brightness-105 dark:shadow-black/30 transform";
            icon.draggable = false;
            icon.style.isolation = "isolate";
            icon.style.transform = "translateZ(0)";
            icon.style.willChange = "transform";
            icon.style.clipPath = "inset(0 round 1.25rem)";
            icon.style.webkitClipPath = "inset(0 round 1.25rem)";
            buildIcon(icon, item.url, item.icon, isPrivate, item.title);

            const minus = document.createElement("button");
            minus.className = "minus delete-badge";
            minus.type = "button";
            minus.textContent = "-";
            minus.dataset.id = item.id;
            icon.appendChild(minus);

            const editBadge = document.createElement("button");
            editBadge.className = "edit-badge";
            editBadge.type = "button";
            editBadge.dataset.id = item.id;
            editBadge.innerHTML =
              '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M4 17.25V20h2.75l8.1-8.1-2.75-2.75-8.1 8.1Zm15.71-9.04a1 1 0 0 0 0-1.41l-2.5-2.5a1 1 0 0 0-1.41 0l-1.95 1.95 3.91 3.91 1.95-1.95Z"/></svg>';
            icon.appendChild(editBadge);

            const tooltip = document.createElement("div");
            tooltip.className = "dock-label-capsule";
            tooltip.textContent = item.title || "未命名";
            card.appendChild(tooltip);

            const label = document.createElement("div");
            label.className = "label text-slate-900 dark:text-white";
            label.textContent = item.title || "未命名";
            if (editing) {
              label.classList.add("editable", "cursor-text");
              label.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (!editing || label.querySelector("input")) {
                  return;
                }
                const current = label.textContent.trim();
                const input = document.createElement("input");
                input.type = "text";
                input.value = current;
                input.className = "rename-input text-slate-900 dark:text-white";
                label.textContent = "";
                label.appendChild(input);
                input.focus();
                input.select();
                const commit = (apply) => {
                  const next = apply ? input.value.trim() : current;
                  const finalTitle = next || "未命名";
                  label.textContent = finalTitle;
                  card.dataset.title = finalTitle;
                  if (finalTitle !== current) {
                    pendingChanges = true;
                    scheduleAutoSave();
                  }
                };
                input.addEventListener("keydown", (keyEvent) => {
                  if (keyEvent.key === "Enter") {
                    commit(true);
                  }
                  if (keyEvent.key === "Escape") {
                    commit(false);
                  }
                });
                input.addEventListener("blur", () => commit(true));
              });
            }

            card.append(icon, label);
          dockGrid.appendChild(card);
        });
          if (currentMode === "delete" && activeDeleteId) {
            const target = dockGrid.querySelector(`.dock-item[data-id="${activeDeleteId}"]`);
            if (target) {
              showDeleteBubble(target, activeDeleteId);
            }
          }
          updateDockDragState();

          if (currentMode === "delete" && dockItems.length < dockLimit) {
            for (let i = dockItems.length; i < dockLimit; i += 1) {
              const placeholder = document.createElement("div");
              placeholder.className = "app dock-item dock-add-placeholder add-placeholder";
              placeholder.dataset.dock = "true";

              const icon = document.createElement("div");
              icon.className =
                "icon border border-white/20 bg-white/20 dark:bg-black/30 backdrop-blur-xl rounded-2xl shadow-sm transition-all duration-300 ease-out";
              icon.textContent = "+";
              placeholder.appendChild(icon);

              placeholder.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                returnToMode = currentMode;
                editingLinkId = null;
                editingDockPosition = null;
                if (dockInput) {
                  dockInput.checked = true;
                }
                formTitle.textContent = "添加导航";
                saveBtn.textContent = "保存";
                titleInput.value = "";
                applyUrlToInput("");
                if (tagsInput) {
                  tagsInput.value = "";
                }
                privateInput.checked = false;
                loadCategories();
                openModal(modal, { returnToSettings: true });
              });

              dockGrid.appendChild(placeholder);
            }
          }
        } catch (err) {
          console.log("No data found");
        }
      }

      function getDockCountLive(excludeId) {
        if (!dockGrid) {
          return allLinks.filter((item) => item.is_dock).length;
        }
        const items = dockGrid.querySelectorAll(
          ".dock-item:not(.dock-add-placeholder):not(.sortable-ghost):not(.sortable-chosen):not(.sortable-fallback)"
        );
        let count = 0;
        items.forEach((item) => {
          if (excludeId && String(item.dataset.id) === String(excludeId)) {
            return;
          }
          count += 1;
        });
        return count;
      }

      function getFirstEmptyDockSlot() {
        if (!dockGrid) return null;
        const count = getDockCountLive();
        return count < dockLimit ? count : null;
      }

      function getRenderSignature(links, mode) {
        const keyParts = [];
        if (Array.isArray(links)) {
          links.forEach((item) => {
            keyParts.push(
              [
                item.id,
                item.sort_index,
                item.position_index,
                item.category,
                item.is_dock ? 1 : 0,
                item.title,
                item.icon
              ].join(":")
            );
          });
        }
        return `${mode || viewMode}|${keyParts.join("|")}`;
      }

      function setupCategoryLazyObserver() {
        if (categoryLazyObserver) {
          categoryLazyObserver.disconnect();
        }
        lazyCategoryMap.clear();
        categoryLazyObserver = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting) return;
              const renderFn = lazyCategoryMap.get(entry.target);
              if (renderFn) {
                renderFn();
                lazyCategoryMap.delete(entry.target);
                categoryLazyObserver.unobserve(entry.target);
              }
            });
          },
          { root: null, rootMargin: "200px", threshold: 0.1 }
        );
      }

      function renderLinks(links) {
        try {
          const signature = getRenderSignature(links, viewMode);
          if (signature === lastRenderSignature) {
            return;
          }
          lastRenderSignature = signature;
          setupCategoryLazyObserver();
          const normalLinks = links.filter((item) => !item.is_dock);
          const isCardView = viewMode === "card";
          const isMobileView = window.innerWidth < 768;
          if (grid) {
            grid.classList.toggle("card-layout", isCardView);
          }
          grid.innerHTML = "";
          const grouped = groupByCategory(normalLinks);
          const gridGap = 26;
          const perRow = 3;
          const baseIconSize = 64;
          const safeScale = Math.max(0.6, iconScale);
          let iconSize = Math.round(baseIconSize * safeScale);
          const maxCardWidth =
            isCardView && isMobileView
              ? Math.max(0, (grid?.clientWidth || window.innerWidth) - 12)
              : null;
          if (isCardView && isMobileView && maxCardWidth) {
            const edgePadGuess = Math.round(iconSize * 0.22);
            const maxIconSize = Math.floor(
              (maxCardWidth - (perRow - 1) * gridGap - edgePadGuess * 2) / perRow
            );
            if (Number.isFinite(maxIconSize) && maxIconSize > 0) {
              iconSize = Math.min(iconSize, Math.max(40, maxIconSize));
            }
          }
          if (isCardView && grid) {
            grid.style.removeProperty("--card-cols");
          }
          grouped.order.forEach((category) => {
            const cardWrap = document.createElement("section");
            cardWrap.className =
              isCardView ? "category-card card-view" : "category-card";
            cardWrap.dataset.category = category;
            cardWrap.dataset.original = category;
            cardWrap.id = `category-${slugify(category)}`;
            if (grouped.privacy && grouped.privacy[category]) {
              cardWrap.dataset.private = "true";
            } else {
              cardWrap.dataset.private = "false";
            }
            const categoryInfo = getCategoryByName(category);
            if (categoryInfo) {
              if (Number.isFinite(categoryInfo.pos_x)) {
                cardWrap.dataset.posX = String(categoryInfo.pos_x);
              }
              if (Number.isFinite(categoryInfo.pos_y)) {
                cardWrap.dataset.posY = String(categoryInfo.pos_y);
              }
            }

            const heading = document.createElement("div");
            heading.className = "category-title category-title-capsule";
            heading.textContent = category;
            if (grouped.privacy && grouped.privacy[category]) {
              const lock = document.createElement("span");
              lock.className = "category-lock";
              lock.textContent = "🔒";
              heading.appendChild(lock);
            }
            cardWrap.appendChild(heading);

            const spacer = document.createElement("div");
            spacer.className = "category-spacer category-drag-handle";
            cardWrap.appendChild(spacer);

            const innerGrid = document.createElement("div");
            innerGrid.className = "category-grid icon-page-container";
            innerGrid.dataset.category = category;
            innerGrid.dataset.dock = "false";
            innerGrid.style.gap = `${gridGap}px`;
            if (!isCardView && !innerGrid.dataset.wheelBound) {
              innerGrid.addEventListener(
                "wheel",
                (event) => {
                  const absX = Math.abs(event.deltaX || 0);
                  const absY = Math.abs(event.deltaY || 0);
                  const hasHorizontalIntent = absX > absY || event.shiftKey;
                  if (!hasHorizontalIntent) {
                    return;
                  }
                  event.preventDefault();
                  const delta = absX > 0 ? event.deltaX : event.deltaY;
                  innerGrid.scrollLeft += delta;
                },
                { passive: false }
              );
              innerGrid.dataset.wheelBound = "true";
            }
            if (!isCardView && isMobileView && !innerGrid.dataset.touchBound) {
              let startX = 0;
              let startY = 0;
              let startLeft = 0;
              let lockedAxis = "";
              innerGrid.addEventListener(
                "touchstart",
                (event) => {
                  const touch = event.touches[0];
                  if (!touch) return;
                  startX = touch.clientX;
                  startY = touch.clientY;
                  startLeft = innerGrid.scrollLeft;
                  lockedAxis = "";
                },
                { passive: true }
              );
              innerGrid.addEventListener(
                "touchmove",
                (event) => {
                  const touch = event.touches[0];
                  if (!touch) return;
                  const dx = touch.clientX - startX;
                  const dy = touch.clientY - startY;
                  if (!lockedAxis) {
                    lockedAxis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
                  }
                  if (lockedAxis === "x") {
                    event.preventDefault();
                    innerGrid.scrollLeft = startLeft - dx;
                  }
                },
                { passive: false }
              );
              innerGrid.dataset.touchBound = "true";
            }
            const items = grouped.groups[category];
            const edgePad = isCardView ? Math.round(iconSize * 0.22) : 0;
            const gridWidth = perRow * iconSize + (perRow - 1) * gridGap + edgePad * 2;
            const rowHeight = iconSize + 36;
            const visibleCount = Math.min(items.length, 9);
            const rows = Math.max(1, Math.ceil(visibleCount / perRow));
            const gridHeight = rows * rowHeight + (rows - 1) * gridGap + edgePad * 2;
            const gridSize = Math.max(gridWidth, gridHeight);
            innerGrid.style.setProperty("--icon-size", `${iconSize}px`);
            innerGrid.style.setProperty("--grid-gap", `${gridGap}px`);
            cardWrap.style.setProperty("--grid-gap", `${gridGap}px`);
            if (edgePad) {
              innerGrid.style.padding = `${edgePad}px`;
            } else {
              innerGrid.style.removeProperty("padding");
            }
            if (isCardView) {
              cardWrap.style.setProperty("--grid-width", `${gridWidth}px`);
              cardWrap.style.setProperty("--grid-size", `${gridSize}px`);
              const rawCardWidth = gridSize + 32;
              const finalCardWidth =
                maxCardWidth && maxCardWidth > 0
                  ? Math.min(rawCardWidth, maxCardWidth)
                  : rawCardWidth;
              const innerMax = Math.max(0, finalCardWidth - 32);
              cardWrap.style.setProperty("--card-width", `${finalCardWidth}px`);
              cardWrap.style.width = `${finalCardWidth}px`;
              innerGrid.style.maxWidth = `${Math.min(gridWidth, innerMax)}px`;
              innerGrid.style.width = `${Math.min(gridWidth, innerMax)}px`;
            } else {
              cardWrap.style.removeProperty("--grid-width");
              cardWrap.style.removeProperty("--grid-size");
              cardWrap.style.removeProperty("--card-width");
              cardWrap.style.removeProperty("width");
              innerGrid.style.maxWidth = "100%";
              innerGrid.style.width = "100%";
            }
            if (currentMode === "edit") {
              heading.classList.add("cursor-text", "editable");
            } else {
              heading.classList.remove("editable");
            }
            heading.addEventListener("click", (event) => {
              event.stopPropagation();
              if (currentMode !== "edit" || heading.querySelector("input")) {
                return;
              }
              const current = heading.textContent.trim();
              const input = document.createElement("input");
              input.type = "text";
              input.value = current;
              input.className = "rename-input text-slate-900 dark:text-white";
              heading.textContent = "";
              heading.appendChild(input);
              input.focus();
              input.select();

              const commit = (apply) => {
                const next = apply ? input.value.trim() : current;
                const finalName = next || "默认分类";
                heading.textContent = finalName;
                cardWrap.dataset.category = finalName;
                innerGrid.dataset.category = finalName;
                innerGrid.querySelectorAll(".app").forEach((app) => {
                  app.dataset.category = finalName;
                });
                if (finalName !== current) {
                  pendingChanges = true;
                  scheduleAutoSave();
                }
              };
              input.addEventListener("keydown", (keyEvent) => {
                if (keyEvent.key === "Enter") {
                  commit(true);
                }
                if (keyEvent.key === "Escape") {
                  commit(false);
                }
              });
              input.addEventListener("blur", () => commit(true));
            });

            if (isCardView) {
              cardWrap.style.setProperty("--icon-size", `${iconSize}px`);
              cardWrap.classList.toggle("card-compact", items.length > 6);
            }
            const renderItem = (item) => {
                const isPrivate =
                  loggedIn && (Number(item.is_private) === 1 || item.category_private);
            const card = document.createElement("a");
            const showJiggle = editing || deleting;
            card.className = showJiggle ? "app jiggle icon-item" : "app icon-item";
            card.href = item.url;
            card.target = "_blank";
            card.rel = "noreferrer";
            card.draggable = false;
                card.dataset.id = item.id;
                card.dataset.title = item.title || "";
                card.dataset.originalTitle = item.title || "";
                card.dataset.category = category;
            card.addEventListener("click", () => {
              if (currentMode !== "preview") return;
              trackVisitorEvent("click", {
                linkId: item.id,
                title: item.title || "",
                url: item.url,
                category
              });
            });

                const icon = document.createElement("div");
                icon.className =
                  "icon mb-2 border border-white/20 bg-white/40 dark:bg-black/40 backdrop-blur-xl rounded-2xl shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl hover:brightness-105 dark:shadow-black/30 transform";
                icon.draggable = false;
                icon.style.isolation = "isolate";
                icon.style.transform = "translateZ(0)";
                icon.style.willChange = "transform";
                icon.style.clipPath = "inset(0 round 1.25rem)";
                icon.style.webkitClipPath = "inset(0 round 1.25rem)";
                buildIcon(icon, item.url, item.icon, isPrivate, item.title);

                const minus = document.createElement("button");
                minus.className = "minus delete-badge";
                minus.type = "button";
                minus.textContent = "-";
                minus.dataset.id = item.id;
                icon.appendChild(minus);

                const editBadge = document.createElement("button");
                editBadge.className = "edit-badge";
                editBadge.type = "button";
                editBadge.textContent = "编辑";
                editBadge.dataset.id = item.id;
                icon.appendChild(editBadge);

                const label = document.createElement("div");
                label.className = "icon-label-capsule";
                const labelText = document.createElement("span");
                labelText.className = "icon-label-text";
                labelText.textContent = item.title || "未命名";
                label.appendChild(labelText);
                if (editing) {
                  label.classList.add("editable", "cursor-text");
                  label.addEventListener("click", (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (!editing || label.querySelector("input")) {
                      return;
                    }
                    const current = label.textContent.trim();
                    const input = document.createElement("input");
                    input.type = "text";
                    input.value = current;
                    input.className = "rename-input text-slate-900 dark:text-white";
                    label.textContent = "";
                    label.appendChild(input);
                    input.focus();
                    input.select();
                    const commit = (apply) => {
                      const next = apply ? input.value.trim() : current;
                      const finalTitle = next || "未命名";
                      label.textContent = finalTitle;
                      card.dataset.title = finalTitle;
                      if (finalTitle !== current) {
                        pendingChanges = true;
                        scheduleAutoSave();
                      }
                    };
                    input.addEventListener("keydown", (keyEvent) => {
                      if (keyEvent.key === "Enter") {
                        commit(true);
                      }
                      if (keyEvent.key === "Escape") {
                        commit(false);
                      }
                    });
                    input.addEventListener("blur", () => commit(true));
                  });
                }

            card.append(icon, label);
            if (isCardView && items.length > 6) {
              const hoverLabel = document.createElement("div");
              hoverLabel.className = "card-hover-label";
              hoverLabel.textContent = item.title || "未命名";
              card.appendChild(hoverLabel);
            }
            return card;
            };

            const usePagedCards = isCardView && (currentMode === "preview" || currentMode === "sort");
            if (usePagedCards && items.length > 9) {
              const pagesContainer = document.createElement("div");
              pagesContainer.className = "card-pages";
              const track = document.createElement("div");
              track.className = "card-pages-track";
              const totalPages = Math.ceil(items.length / 9);
              let currentPage = 0;
              let touchStartX = 0;
              let touchActive = false;
              for (let i = 0; i < totalPages; i += 1) {
                const page = document.createElement("div");
                page.className = "card-page";
                page.dataset.category = category;
                page.dataset.dock = "false";
                const slice = items.slice(i * 9, i * 9 + 9);
                slice.forEach((item) => {
                  page.appendChild(renderItem(item));
                });
                track.appendChild(page);
              }
              pagesContainer.appendChild(track);

              const dots = document.createElement("div");
              dots.className = "pagination-dots";
              const updateDots = () => {
                dots.querySelectorAll(".pagination-dot").forEach((dot, idx) => {
                  dot.classList.toggle("active", idx === currentPage);
                });
              };
              for (let i = 0; i < totalPages; i += 1) {
                const dot = document.createElement("div");
                dot.className = "pagination-dot";
                dot.addEventListener("click", () => {
                  currentPage = i;
                  track.style.transform = `translateX(-${currentPage * 100}%)`;
                  updateDots();
                });
                dots.appendChild(dot);
              }
              updateDots();

              const leftArrow = document.createElement("button");
              leftArrow.type = "button";
              leftArrow.className = "page-arrow left";
              leftArrow.innerHTML = "&lt;";
              const rightArrow = document.createElement("button");
              rightArrow.type = "button";
              rightArrow.className = "page-arrow right";
              rightArrow.innerHTML = "&gt;";
              const updateArrows = () => {
                leftArrow.classList.toggle("hidden", currentPage === 0);
                rightArrow.classList.toggle("hidden", currentPage === totalPages - 1);
              };
              leftArrow.addEventListener("click", () => {
                if (currentPage === 0) return;
                currentPage -= 1;
                track.style.transform = `translateX(-${currentPage * 100}%)`;
                updateDots();
                updateArrows();
              });
              rightArrow.addEventListener("click", () => {
                if (currentPage >= totalPages - 1) return;
                currentPage += 1;
                track.style.transform = `translateX(-${currentPage * 100}%)`;
                updateDots();
                updateArrows();
              });
              pagesContainer.addEventListener("touchstart", (event) => {
                const touch = event.touches[0];
                if (!touch) return;
                touchStartX = touch.clientX;
                touchActive = true;
              });
              pagesContainer.addEventListener("touchend", (event) => {
                if (!touchActive) return;
                touchActive = false;
                const touch = event.changedTouches[0];
                if (!touch) return;
                const deltaX = touch.clientX - touchStartX;
                if (Math.abs(deltaX) < 30) return;
                if (deltaX < 0 && currentPage < totalPages - 1) {
                  currentPage += 1;
                } else if (deltaX > 0 && currentPage > 0) {
                  currentPage -= 1;
                }
                track.style.transform = `translateX(-${currentPage * 100}%)`;
                updateDots();
                updateArrows();
              });
              updateArrows();

              if (items.length > 9) {
                const nextSlice = items.slice(9, 18);
                setTimeout(() => {
                  prefetchIcons(nextSlice);
                }, 500);
              }

              cardWrap.appendChild(pagesContainer);
              cardWrap.appendChild(dots);
              cardWrap.appendChild(leftArrow);
              cardWrap.appendChild(rightArrow);
            } else {
              items.forEach((item) => {
                innerGrid.appendChild(renderItem(item));
              });
              cardWrap.appendChild(innerGrid);
            }

            if (currentMode === "delete") {
              const placeholder = document.createElement("div");
              placeholder.className = "app add-placeholder";
              placeholder.dataset.category = category;
              placeholder.dataset.dock = "false";

              const icon = document.createElement("div");
              icon.className =
                "icon border border-white/20 bg-white/20 dark:bg-black/30 backdrop-blur-xl rounded-2xl shadow-sm transition-all duration-300 ease-out";
              icon.textContent = "+";
              placeholder.appendChild(icon);

              const label = document.createElement("div");
              label.className = "icon-label-capsule";
              const labelText = document.createElement("span");
              labelText.className = "icon-label-text";
              labelText.textContent = "新增";
              label.appendChild(labelText);
              placeholder.appendChild(label);

              placeholder.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();
                editingLinkId = null;
                editingDockPosition = null;
                if (dockInput) {
                  dockInput.checked = false;
                }
                formTitle.textContent = "添加导航";
                saveBtn.textContent = "保存";
                titleInput.value = "";
                applyUrlToInput("");
                if (tagsInput) {
                  tagsInput.value = "";
                }
                privateInput.checked = false;
                categoryInput.value = category;
                categorySelectLabel.textContent = category;
                loadCategories(category);
                openModal(modal, { returnToSettings: true });
              });

              innerGrid.appendChild(placeholder);
            }

            if (!usePagedCards || items.length <= 9) {
              cardWrap.appendChild(innerGrid);
          }
          grid.appendChild(cardWrap);
        });
        if (currentMode === "delete") {
            const addCard = document.createElement("section");
            addCard.className = "category-card category-add-card";
            const addBtn = document.createElement("button");
            addBtn.type = "button";
            addBtn.className = "add-category-btn";
            addBtn.innerHTML = "<span>+ 新增分类</span>";
            addBtn.addEventListener("click", (event) => {
              event.preventDefault();
              event.stopPropagation();
              loadCategories().then((list) => {
                renderCategoryManager(list);
              });
            openModal(categoryManagerModal, { returnToSettings: false });
            });
            addCard.appendChild(addBtn);
          grid.appendChild(addCard);
        }
          renderCategoryNav(grouped.order);
      document.body.classList.toggle("is-editing", editing);
      document.body.classList.toggle("is-deleting", deleting);
          applyCategoryFreeLayout();
          initCategoryFreeDrag();
          initCategoryFisheye();
          initSortables();
          updateEmptyCategories();
        } catch (err) {
          console.log("No data found");
        }
      }

      function updateContainerState(container) {
        if (!container) return;
        const isDock =
          container.dataset.dock === "true" ||
          (dockGrid && container === dockGrid);
        const categoryName = isDock ? "" : container.dataset.category || "";
        container.querySelectorAll(".app").forEach((app) => {
          app.dataset.dock = isDock ? "true" : "false";
          app.dataset.category = categoryName;
        });
      }

      function getCategoryCards() {
        if (!grid) return [];
        return Array.from(grid.querySelectorAll(".category-card"));
      }

      function getCategoryCardOrder(cards) {
        const withPos = cards
          .filter((card) => !card.classList.contains("category-add-card"))
          .map((card, index) => {
            const posX = Number(card.dataset.posX);
            const posY = Number(card.dataset.posY);
            return {
              card,
              name: card.dataset.category || "",
              posX: Number.isFinite(posX) ? posX : null,
              posY: Number.isFinite(posY) ? posY : null,
              index
            };
          });
        if (grid && grid.classList.contains("free-layout")) {
          withPos.sort((a, b) => {
            const ay = Number.isFinite(a.posY) ? a.posY : 9999;
            const by = Number.isFinite(b.posY) ? b.posY : 9999;
            if (ay !== by) return ay - by;
            const ax = Number.isFinite(a.posX) ? a.posX : 9999;
            const bx = Number.isFinite(b.posX) ? b.posX : 9999;
            if (ax !== bx) return ax - bx;
            return a.index - b.index;
          });
        }
        return withPos;
      }

      function computeCategoryLayoutState(cards) {
        if (!grid || !cards.length) return null;
        const gridStyle = getComputedStyle(grid);
        const gap = Number.parseFloat(gridStyle.gap) || 18;
        const paddingLeft = Number.parseFloat(gridStyle.paddingLeft) || 0;
        const paddingRight = Number.parseFloat(gridStyle.paddingRight) || 0;
        const paddingTop = Number.parseFloat(gridStyle.paddingTop) || 0;
        const paddingBottom = Number.parseFloat(gridStyle.paddingBottom) || 0;
        const availableWidth = Math.max(0, grid.clientWidth - paddingLeft - paddingRight);
        return {
          gap,
          paddingLeft,
          paddingRight,
          paddingTop,
          paddingBottom,
          availableWidth,
          placed: []
        };
      }

      function clampValue(value, min, max) {
        return Math.max(min, Math.min(max, value));
      }

      function rectsOverlap(a, b, pad) {
        return !(
          a.x + a.w + pad <= b.x ||
          b.x + b.w + pad <= a.x ||
          a.y + a.h + pad <= b.y ||
          b.y + b.h + pad <= a.y
        );
      }

      function isOverlapping(state, rect, ignoreCard) {
        if (!state) return false;
        const pad = Math.max(12, state.gap);
        return state.placed.some((item) => {
          if (ignoreCard && item.card === ignoreCard) {
            return false;
          }
          return rectsOverlap(rect, item, pad);
        });
      }

      function snapToNeighborEdges(state, desiredX, desiredY, size) {
        if (!state || !state.placed.length) {
          return { x: desiredX, y: desiredY };
        }
        const maxX = Math.max(0, state.availableWidth - size.w);
        const clampX = (x) => clampValue(x, 0, maxX);
        let bestX = desiredX;
        let bestY = desiredY;
        let bestDx = Infinity;
        let bestDy = Infinity;
        state.placed.forEach((item) => {
          const overlapY =
            Math.min(desiredY + size.h, item.y + item.h) -
            Math.max(desiredY, item.y);
          const overlapX =
            Math.min(desiredX + size.w, item.x + item.w) -
            Math.max(desiredX, item.x);
          const yAligned = overlapY > Math.min(size.h, item.h) * 0.3;
          const xAligned = overlapX > Math.min(size.w, item.w) * 0.3;
          if (yAligned) {
            const rightX = item.x + item.w + state.gap;
            const leftX = item.x - size.w - state.gap;
            const dxRight = Math.abs(desiredX - rightX);
            const dxLeft = Math.abs(desiredX - leftX);
            if (dxRight < bestDx && dxRight <= state.gap * 2.5) {
              bestDx = dxRight;
              bestX = rightX;
            }
            if (dxLeft < bestDx && dxLeft <= state.gap * 2.5) {
              bestDx = dxLeft;
              bestX = leftX;
            }
          }
          if (xAligned) {
            const bottomY = item.y + item.h + state.gap;
            const topY = item.y - size.h - state.gap;
            const dyBottom = Math.abs(desiredY - bottomY);
            const dyTop = Math.abs(desiredY - topY);
            if (dyBottom < bestDy && dyBottom <= state.gap * 2.5) {
              bestDy = dyBottom;
              bestY = bottomY;
            }
            if (dyTop < bestDy && dyTop <= state.gap * 2.5) {
              bestDy = dyTop;
              bestY = topY;
            }
          }
        });
        return { x: clampX(bestX), y: Math.max(0, bestY) };
      }

      function findFreePosition(state, desiredX, desiredY, size, ignoreCard, options = {}) {
        if (!state) return { x: 0, y: 0 };
        const maxX = Math.max(0, state.availableWidth - size.w);
        const clampX = (x) => clampValue(x, 0, maxX);
        const allowSnap = options.snap !== false;
        const basePoint = allowSnap
          ? snapToNeighborEdges(state, desiredX, desiredY, size)
          : { x: desiredX, y: desiredY };
        const baseX = clampX(basePoint.x);
        const baseY = Math.max(0, basePoint.y);
        const baseRect = { x: baseX, y: baseY, w: size.w, h: size.h };
        if (!isOverlapping(state, baseRect, ignoreCard)) {
          return { x: baseX, y: baseY };
        }
        const stepValue = Number.isFinite(Number(options.step)) ? Number(options.step) : null;
        const step = Math.max(4, Math.round(stepValue || state.gap / 2));
        const maxRadius = 800;
        for (let radius = step; radius <= maxRadius; radius += step) {
          for (let dy = -radius; dy <= radius; dy += step) {
            for (let dx = -radius; dx <= radius; dx += step) {
              if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) {
                continue;
              }
              const x = clampX(baseX + dx);
              const y = Math.max(0, baseY + dy);
              const rect = { x, y, w: size.w, h: size.h };
              if (!isOverlapping(state, rect, ignoreCard)) {
                return { x, y };
              }
            }
          }
        }
        return { x: baseX, y: baseY };
      }

      function updateFreeLayoutMinHeight(state) {
        if (!grid || !state) return;
        const maxBottom = state.placed.reduce(
          (acc, item) => Math.max(acc, item.y + item.h),
          0
        );
        grid.style.minHeight = `${
          state.paddingTop + state.paddingBottom + Math.max(0, maxBottom)
        }px`;
      }

      function ensureDragGuides() {
        if (!grid) return null;
        let guides = grid.querySelector(".drag-guides");
        if (guides) return guides;
        guides = document.createElement("div");
        guides.className = "drag-guides";
        const lineX = document.createElement("div");
        lineX.className = "drag-guide-line drag-guide-x";
        const lineY = document.createElement("div");
        lineY.className = "drag-guide-line drag-guide-y";
        guides.appendChild(lineX);
        guides.appendChild(lineY);
        grid.appendChild(guides);
        return guides;
      }

      function updateDragGuides(x, y) {
        if (!grid) return;
        grid.style.setProperty("--guide-x", `${Math.max(0, x)}px`);
        grid.style.setProperty("--guide-y", `${Math.max(0, y)}px`);
      }

      function clearDragGuides() {
        if (!grid) return;
        grid.classList.remove("drag-guides-active");
      }

      function getCardSize(card) {
        if (!card) return { w: 0, h: 0 };
        const width = card.offsetWidth || card.getBoundingClientRect().width || 0;
        const height = card.offsetHeight || card.getBoundingClientRect().height || 0;
        return { w: width, h: height };
      }

      function applyCategoryFreeLayout() {
        if (!grid) return;
        const enable = viewMode === "card";
        grid.classList.toggle("free-layout", enable);
        if (!enable) {
          clearDragGuides();
          grid.style.minHeight = "";
          categoryLayoutState = null;
          getCategoryCards().forEach((card) => {
            card.style.position = "";
            card.style.left = "";
            card.style.top = "";
            card.style.zIndex = "";
          });
          return;
        }
        const isMobileLayout = window.innerWidth < 768;
        const cards = getCategoryCards();
        if (!cards.length) {
          categoryLayoutState = null;
          return;
        }
        const state = computeCategoryLayoutState(cards);
        if (!state) return;
        const maxCardWidth = cards.reduce((acc, card) => {
          const size = getCardSize(card);
          return Math.max(acc, size.w || 0);
        }, 0);
        const minTwoCardWidth = maxCardWidth * 2 + state.gap;
        const shouldAutoFlow = state.availableWidth < minTwoCardWidth;
        const allowStoredPositions = !isMobileLayout;
        const cardsWithPos = [];
        const cardsWithoutPos = [];
        cards.forEach((card) => {
          const rawX = Number(card.dataset.posX);
          const rawY = Number(card.dataset.posY);
          if (allowStoredPositions && Number.isFinite(rawX) && Number.isFinite(rawY)) {
            cardsWithPos.push(card);
          } else {
            cardsWithoutPos.push(card);
          }
        });
        const lockCardSize = (card) => {
          const rect = getCardSize(card);
          const storedW = Number(card.dataset.fixedW);
          const storedH = Number(card.dataset.fixedH);
          if (
            !Number.isFinite(storedW) ||
            storedW <= 0 ||
            (rect.w && Math.abs(storedW - rect.w) > 2)
          ) {
            card.dataset.fixedW = rect.w ? String(rect.w) : "";
          }
          if (
            !Number.isFinite(storedH) ||
            storedH <= 0 ||
            (rect.h && Math.abs(storedH - rect.h) > 2)
          ) {
            card.dataset.fixedH = rect.h ? String(rect.h) : "";
          }
          const finalW = Number(card.dataset.fixedW);
          const finalH = Number(card.dataset.fixedH);
          if (Number.isFinite(finalW) && finalW > 0) {
            card.style.width = `${finalW}px`;
          }
          if (Number.isFinite(finalH) && finalH > 0) {
            card.style.height = `${finalH}px`;
          }
        };
        const placeCard = (card, posX, posY, options = {}) => {
          const {
            snap = true,
            commitPosition = true,
            strictPersist = false
          } = options;
          const rect = getCardSize(card);
          const size = { w: rect.w, h: rect.h };
          const target = findFreePosition(state, posX, posY, size, null, { snap });
          const moved = target.x !== posX || target.y !== posY;
          const canPersist =
            commitPosition &&
            (!strictPersist || !moved);
          if (canPersist) {
            card.dataset.posX = String(target.x);
            card.dataset.posY = String(target.y);
          }
          card.style.position = "absolute";
          card.style.left = `${state.paddingLeft + target.x}px`;
          card.style.top = `${state.paddingTop + target.y}px`;
          state.placed.push({ card, x: target.x, y: target.y, w: size.w, h: size.h });
          lockCardSize(card);
          return { x: target.x, y: target.y, moved };
        };
        let storedLayoutOk = allowStoredPositions && !shouldAutoFlow && cardsWithPos.length > 0;
        if (storedLayoutOk) {
          state.placed = [];
          cardsWithPos.forEach((card) => {
            const posX = Number(card.dataset.posX) || 0;
            const posY = Number(card.dataset.posY) || 0;
            const result = placeCard(card, posX, posY, {
              snap: false,
              commitPosition: false,
              strictPersist: true
            });
            if (result.moved) {
              storedLayoutOk = false;
            }
          });
        }
        if (!storedLayoutOk) {
          state.placed = [];
          cardsWithPos.length = 0;
          cardsWithoutPos.length = 0;
          cards.forEach((card) => cardsWithoutPos.push(card));
        }
        const shouldPersistPositions =
          allowStoredPositions && !shouldAutoFlow && storedLayoutOk;
        let cursorX = 0;
        let cursorY = 0;
        let rowHeight = 0;
        cardsWithoutPos.forEach((card) => {
          const rect = getCardSize(card);
          const cardWidth = rect.w;
          const cardHeight = rect.h;
          if (cursorX + cardWidth > state.availableWidth && cursorX !== 0) {
            cursorX = 0;
            cursorY += rowHeight + state.gap;
            rowHeight = 0;
          }
          placeCard(card, cursorX, cursorY, {
            snap: true,
            commitPosition: shouldPersistPositions
          });
          cursorX += cardWidth + state.gap;
          rowHeight = Math.max(rowHeight, cardHeight);
        });
        const order = getCategoryCardOrder(cards);
        order.forEach((entry) => grid.appendChild(entry.card));
        updateFreeLayoutMinHeight(state);
        categoryLayoutState = state;
      }

      function captureLayoutPreset() {
        return getCategoryCards()
          .filter((card) => !card.classList.contains("category-add-card"))
          .map((card) => ({
            name: card.dataset.category || "",
            pos_x: Number.isFinite(Number(card.dataset.posX))
              ? Number(card.dataset.posX)
              : null,
            pos_y: Number.isFinite(Number(card.dataset.posY))
              ? Number(card.dataset.posY)
              : null
          }));
      }

      function saveLayoutPreset(key) {
        try {
          const payload = captureLayoutPreset();
          localStorage.setItem(key, JSON.stringify(payload));
          showToast("布局已保存");
        } catch (err) {
          showToast("保存失败");
        }
      }

      function applyLayoutPreset(key) {
        try {
          const raw = localStorage.getItem(key);
          if (!raw) {
            showToast("暂无保存的布局");
            return;
          }
          const preset = JSON.parse(raw);
          if (!Array.isArray(preset)) return;
          const lookup = new Map(preset.map((item) => [item.name, item]));
          getCategoryCards().forEach((card) => {
            const entry = lookup.get(card.dataset.category || "");
            if (entry) {
              card.dataset.posX =
                Number.isFinite(Number(entry.pos_x)) ? String(entry.pos_x) : "";
              card.dataset.posY =
                Number.isFinite(Number(entry.pos_y)) ? String(entry.pos_y) : "";
            }
          });
          pendingChanges = true;
          applyCategoryFreeLayout();
          scheduleAutoSave();
          showToast("布局已应用");
        } catch (err) {
          showToast("应用失败");
        }
      }

      function initCategoryFreeDrag() {
        if (!grid) return;
        if (viewMode !== "card") return;
        if (window.innerWidth < 768) return;
        const cards = getCategoryCards();
        cards.forEach((card) => {
          if (card.classList.contains("category-add-card")) return;
          if (card.dataset.freeDragBound) return;
          const handle =
            card.querySelector(".category-title") || card.querySelector(".category-drag-handle");
          if (!handle) return;
          card.dataset.freeDragBound = "true";
          handle.addEventListener("pointerdown", (event) => {
            if (event.button !== 0 && event.pointerType !== "touch") {
              return;
            }
            if (currentMode !== "sort" && !sortUnlocked) {
              return;
            }
            ensureSortSession();
            if (!categoryLayoutState) {
              applyCategoryFreeLayout();
            }
            const state = categoryLayoutState;
            if (!state) return;
            event.preventDefault();
            event.stopPropagation();
            if (categoryDragState && categoryDragState.cleanup) {
              try {
                categoryDragState.cleanup();
              } catch (err) {}
              categoryDragPointerId = null;
              categoryDragState = null;
            }
            const gridRect = grid.getBoundingClientRect();
            const cardRect = card.getBoundingClientRect();
            const offsetX = event.clientX - cardRect.left;
            const offsetY = event.clientY - cardRect.top;
            const dragSize = getCardSize(card);
            const originX = Number.isFinite(Number(card.dataset.posX)) ? Number(card.dataset.posX) : 0;
            const originY = Number.isFinite(Number(card.dataset.posY)) ? Number(card.dataset.posY) : 0;
            categoryDragPointerId = event.pointerId;
            state.placed = state.placed.filter((item) => item.card !== card);
            card.classList.add("is-free-dragging");
            card.style.zIndex = "10000";
            document.body.classList.add("dragging-card");
            let rafId = null;
            let pendingMove = null;
            categoryDragState = { card, offsetX, offsetY, originX, originY, cleanup: null };
            ensureDragGuides();
            grid.classList.add("drag-guides-active");
            const move = (moveEvent) => {
              if (!categoryDragState) return;
              if (moveEvent.pointerId !== categoryDragPointerId) return;
              pendingMove = moveEvent;
              if (rafId) return;
              rafId = requestAnimationFrame(() => {
                rafId = null;
                if (!categoryDragState || !pendingMove) return;
                const evt = pendingMove;
                pendingMove = null;
                const x = evt.clientX - gridRect.left - offsetX;
                const y = evt.clientY - gridRect.top - offsetY;
                card.style.left = `${x}px`;
                card.style.top = `${y}px`;
                const relX = evt.clientX - gridRect.left - state.paddingLeft - offsetX;
                const relY = evt.clientY - gridRect.top - state.paddingTop - offsetY;
                const target = findFreePosition(state, relX, relY, dragSize, card, { snap: false, step: 6 });
                updateDragGuides(state.paddingLeft + target.x, state.paddingTop + target.y);
              });
            };
            const up = (upEvent) => {
              if (!categoryDragState) return;
              if (upEvent.pointerId !== categoryDragPointerId) return;
              const relX = upEvent.clientX - gridRect.left - state.paddingLeft - offsetX;
              const relY = upEvent.clientY - gridRect.top - state.paddingTop - offsetY;
              const target = findFreePosition(state, relX, relY, dragSize, card, { snap: false, step: 6 });
              card.dataset.posX = String(target.x);
              card.dataset.posY = String(target.y);
              card.style.left = `${state.paddingLeft + target.x}px`;
              card.style.top = `${state.paddingTop + target.y}px`;
              state.placed.push({ card, x: target.x, y: target.y, w: dragSize.w, h: dragSize.h });
              card.classList.remove("is-free-dragging");
              card.style.zIndex = "";
              categoryDragState = null;
              categoryDragPointerId = null;
              document.body.classList.remove("dragging-card");
              pendingChanges = true;
              syncAllOrders();
              updateFreeLayoutMinHeight(state);
              scheduleAutoSave();
              clearDragGuides();
            };
            const cleanup = () => {
              document.removeEventListener("pointermove", move);
              document.removeEventListener("pointerup", up);
              document.removeEventListener("pointercancel", cancel);
              document.removeEventListener("lostpointercapture", cancel);
              if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
              }
            };
            const cancel = () => {
              card.classList.remove("is-free-dragging");
              card.style.zIndex = "";
              clearDragGuides();
              const fallbackX = Number.isFinite(originX) ? originX : 0;
              const fallbackY = Number.isFinite(originY) ? originY : 0;
              card.dataset.posX = String(fallbackX);
              card.dataset.posY = String(fallbackY);
              card.style.left = `${state.paddingLeft + fallbackX}px`;
              card.style.top = `${state.paddingTop + fallbackY}px`;
              document.body.classList.remove("dragging-card");
              categoryDragState = null;
              categoryDragPointerId = null;
              cleanup();
            };
            categoryDragState.cleanup = cleanup;
            document.addEventListener("pointermove", move);
            document.addEventListener("pointerup", (upEvent) => {
              up(upEvent);
              cleanup();
            }, { once: true });
            document.addEventListener("pointercancel", cancel, { once: true });
            document.addEventListener("lostpointercapture", cancel, { once: true });
          });
        });
      }

      function normalizeDockItem(card) {
        if (!card) return;
        card.classList.add("dock-item");
        const capsule = card.querySelector(".icon-label-capsule");
        if (capsule) capsule.remove();
        const label = card.querySelector(".label");
        if (label) label.remove();
        if (!card.querySelector(".dock-label-capsule")) {
          const capsule = document.createElement("div");
          capsule.className = "dock-label-capsule";
          capsule.textContent = card.dataset.title || "未命名";
          card.appendChild(capsule);
        }
      }

      function normalizeCategoryItem(card) {
        if (!card) return;
        card.classList.remove("dock-item");
        const tooltip = card.querySelector(".dock-tooltip");
        if (tooltip) tooltip.remove();
        const label = card.querySelector(".label");
        if (label) label.remove();
        if (!card.querySelector(".icon-label-capsule")) {
          const capsule = document.createElement("div");
          capsule.className = "icon-label-capsule";
          const text = document.createElement("span");
          text.className = "icon-label-text";
          text.textContent = card.dataset.title || "未命名";
          capsule.appendChild(text);
          card.appendChild(capsule);
        }
      }

      function updateEmptyCategories() {
        if (currentMode === "sort" || sortUnlocked) {
          return;
        }
        if (!grid) return;
        if (grid.classList.contains("free-layout")) {
          return;
        }
        const cards = Array.from(grid.querySelectorAll(".category-card"));
        const visibleCards = [];
        const emptyCards = [];
        cards.forEach((card) => {
          if (card.classList.contains("category-add-card")) {
            visibleCards.push(card);
            return;
          }
          const hasIcons = Boolean(
            card.querySelector(".category-grid .app, .card-page .app")
          );
          if (hasIcons) {
            card.classList.remove("category-empty");
            visibleCards.push(card);
          } else {
            card.classList.add("category-empty");
            emptyCards.push(card);
          }
        });
        visibleCards.forEach((card) => grid.appendChild(card));
        emptyCards.forEach((card) => grid.appendChild(card));
      }

      function renderCategoryNav(categories) {
          const nav = document.querySelector("#categoryNav");
          if (!nav) return;
          nav.innerHTML = "";
          if (!nav.dataset.wheelBound) {
            const canWheel =
              window.matchMedia &&
              window.matchMedia("(hover: hover) and (pointer: fine)").matches;
            if (canWheel) {
              nav.addEventListener(
                "wheel",
                (event) => {
                  if (event.deltaY !== 0) {
                    event.preventDefault();
                    nav.scrollLeft += event.deltaY;
                  }
                },
                { passive: false }
              );
            }
            nav.dataset.wheelBound = "true";
          }
          const maxVisible = 7;
          const visibleCategories =
            Array.isArray(categories) && categories.length > maxVisible
              ? categories.slice(0, maxVisible)
              : categories;
          const overflowCategories =
            Array.isArray(categories) && categories.length > maxVisible
              ? categories.slice(maxVisible)
              : [];
          visibleCategories.forEach((category) => {
            const pill = document.createElement("button");
            pill.type = "button";
            pill.className = "category-pill nav-item";
            pill.textContent = category;
            pill.addEventListener("click", () => {
              nav.querySelectorAll(".category-pill").forEach((btn) => {
                btn.classList.remove("active");
              });
              pill.classList.add("active");
              const target = document.getElementById(`category-${slugify(category)}`);
              if (!target) return;
              const headerHeight = document.querySelector(".site-header")?.offsetHeight || 0;
              const navHeight = nav.offsetHeight || 0;
              const top =
                target.getBoundingClientRect().top + window.scrollY - headerHeight - navHeight - 12;
              window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
              document.querySelectorAll(".category-card.nav-active").forEach((card) => {
                card.classList.remove("nav-active");
              });
              target.classList.add("nav-active");
            });
            nav.appendChild(pill);
          });
          if (overflowCategories.length) {
            const moreWrap = document.createElement("div");
            moreWrap.className = "nav-more";
            const moreBtn = document.createElement("button");
            moreBtn.type = "button";
            moreBtn.className = "category-pill nav-item";
            moreBtn.textContent = "更多";
            const menu = document.createElement("div");
            menu.className = "nav-more-menu hidden";
            overflowCategories.forEach((category) => {
              const itemBtn = document.createElement("button");
              itemBtn.type = "button";
              itemBtn.className = "nav-more-item";
              itemBtn.textContent = category;
              itemBtn.addEventListener("click", () => {
                menu.classList.add("hidden");
                const target = document.getElementById(`category-${slugify(category)}`);
                if (!target) return;
                const headerHeight = document.querySelector(".site-header")?.offsetHeight || 0;
                const navHeight = nav.offsetHeight || 0;
                const top =
                  target.getBoundingClientRect().top + window.scrollY - headerHeight - navHeight - 12;
                window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
                document.querySelectorAll(".category-card.nav-active").forEach((card) => {
                  card.classList.remove("nav-active");
                });
                target.classList.add("nav-active");
              });
              menu.appendChild(itemBtn);
            });
            moreBtn.addEventListener("click", (event) => {
              event.stopPropagation();
              menu.classList.toggle("hidden");
            });
            document.addEventListener("click", () => {
              menu.classList.add("hidden");
            });
            moreWrap.appendChild(moreBtn);
            moreWrap.appendChild(menu);
            nav.appendChild(moreWrap);
          }
        }

      function fetchPublicView() {
        if (!publicUsername) {
          renderLinks([]);
          renderDockLinks([]);
          return;
        }
        fetch(`/api/public/${encodeURIComponent(publicUsername)}`, { cache: "no-store" })
          .then((res) => {
            if (res.status === 404) {
              showToast("\u7528\u6237\u4e0d\u5b58\u5728");
              return null;
            }
            return res.json();
          })
          .then((data) => {
            if (!data) return;
            const categories = Array.isArray(data.categories) ? data.categories : [];
            const icons = Array.isArray(data.icons) ? data.icons : [];
            allCategories = categories;
            allLinks = icons;
            renderLinks(allLinks);
            renderDockLinks(allLinks);
            renderCategoryNav(categories.map((c) => c.name));
          })
          .catch(() => {
            renderLinks([]);
            renderDockLinks([]);
          });
      }

      function fetchLinks() {
        if (isVisitorMode) {
          return fetchPublicView();
        }
        if (loggedIn && (!Array.isArray(allCategories) || !allCategories.length)) {
          return loadCategories()
            .then(() => fetchLinks())
            .catch(() => fetchLinks());
        }
        const url = loggedIn
          ? "/api/links?includePrivate=1"
          : publicUsername
          ? `/api/links?user=${encodeURIComponent(publicUsername)}`
          : "/api/links";
        fetch(url, { credentials: "include", cache: "no-store" })
          .then((res) => {
            const authHeader = res.headers.get("x-logged-in");
            return res
              .json()
              .catch(() => null)
              .then((data) => ({ data, authHeader }));
          })
          .then(({ data, authHeader }) => {
              if (authHeader === "1" && !loggedIn) {
                setLoginState(true, { skipFetch: true });
              }
              if (Array.isArray(data)) {
                allLinks = data;
                renderLinks(allLinks);
                renderDockLinks(allLinks);
                if (currentMode === "preview") {
                  trackVisitorEvent("visit");
                }
              } else {
                console.log("No data found");
                renderLinks([]);
                renderDockLinks([]);
              }
          })
          .catch(() => {
            renderLinks([]);
            renderDockLinks([]);
          });
      }

      function destroySortables() {
        sortables.forEach((instance) => {
          try {
            instance.destroy();
          } catch (err) {}
        });
        sortables = [];
      }

      function clearDragImage(event) {
        try {
          const dataTransfer = event?.originalEvent?.dataTransfer;
          if (dataTransfer && typeof dataTransfer.setDragImage === "function") {
            dataTransfer.setDragImage(new Image(), 0, 0);
          }
        } catch (err) {}
      }

      function setSortablesEnabled(enabled) {
        sortables.forEach((instance) => {
          try {
            instance.option("disabled", !enabled);
          } catch (err) {}
        });
      }

      function ensureSortSession() {
        if (currentMode !== "sort") return;
        if (!sortUnlocked) {
          sortUnlocked = true;
          document.body.classList.add("sort-unlocked", "app-unlocked");
        }
        setSortablesEnabled(true);
      }

      function initSortables() {
        if (isVisitorMode) {
          destroySortables();
          return;
        }
        const sortActive = currentMode === "sort" || sortUnlocked;
        console.log("Sortable init:", typeof Sortable, "loggedIn:", loggedIn, "sortUnlocked:", sortUnlocked);
        if (!window.Sortable || !loggedIn || !sortActive) {
          destroySortables();
          return;
        }
        destroySortables();

        if (viewMode !== "card") {
          const categorySortable = new Sortable(grid, {
            animation: 250,
            draggable: ".category-card:not(.category-empty):not(.category-add-card)",
            handle: ".category-title, .category-drag-handle",
            forceFallback: true,
            fallbackOnBody: true,
            fallbackTolerance: 3,
            fallbackClass: "sortable-fallback",
            easing: "cubic-bezier(0.25, 1, 0.5, 1)",
            direction: "vertical",
            invertSwap: true,
            invertedSwapThreshold: 0.3,
            swapThreshold: 0.65,
            disabled: false,
            onStart: (event) => {
              console.log("图标拖拽已捕获");
              ensureSortSession();
              document.body.classList.add("is-dragging");
              clearDragImage(event);
            },
            onEnd: (event) => {
              console.log("排序数据已保存");
              document.body.classList.remove("is-dragging");
              const moved =
                event &&
                (event.from !== event.to || event.oldIndex !== event.newIndex);
              if (moved) {
                pendingChanges = true;
                scheduleAutoSave();
                syncAllOrders();
                updateEmptyCategories();
              }
            }
          });
          sortables.push(categorySortable);
        }

        document.querySelectorAll(".category-grid, .card-page").forEach((container) => {
          const rect = container.getBoundingClientRect();
          console.log("Category grid rect:", rect.width, rect.height);
          const sortable = new Sortable(container, {
            animation: 320,
            draggable: ".icon-item",
            handle: ".icon",
            group: {
              name: "shared",
              pull: true,
              put: (to, from, dragEl) => {
                if (to !== dockGrid) return true;
                if (from === dockGrid) return true;
                const draggedId = dragEl && dragEl.dataset ? dragEl.dataset.id : null;
                return getDockCountLive(draggedId) < dockLimit;
              }
            },
            sort: true,
            filter: ".edit-badge, .delete-badge, .lock, .dock-tooltip, .icon-label-capsule, .rename-input",
            preventOnFilter: false,
            forceFallback: true,
            fallbackOnBody: true,
            fallbackTolerance: 0,
            fallbackClass: "sortable-fallback",
            delay: 0,
            delayOnTouchOnly: true,
            touchStartThreshold: 2,
            dragoverBubble: false,
            invertSwap: true,
            invertedSwapThreshold: 0.3,
            scroll: true,
            scrollSensitivity: 80,
            scrollSpeed: 12,
            swap: false,
            easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
            swapThreshold: 0.7,
            ghostClass: "sortable-ghost",
            dragClass: "sortable-drag",
            disabled: false,
            onStart: (event) => {
              console.log("图标拖拽已捕获");
              ensureSortSession();
              document.body.classList.add("is-dragging");
              clearDragImage(event);
              if (event.item) {
                event.item.classList.add("is-dragging");
                event.item.draggable = false;
                event.item.setAttribute("draggable", "false");
                event.item.querySelectorAll("img").forEach((img) => {
                  img.draggable = false;
                  img.setAttribute("draggable", "false");
                });
              }
              if (dockGrid) {
                dockGrid.classList.add("dock-drop");
              }
            },
            onMove: (event) => {
              if (!dockGrid) return true;
              const dockContainer = dockGrid.closest("#dock-container");
              if (!dockContainer) return true;
              if (event.to === dockGrid) {
                const draggedId = event.dragged && event.dragged.dataset ? event.dragged.dataset.id : null;
                const full = getDockCountLive(draggedId) >= dockLimit;
                dockContainer.classList.toggle("dock-full", full);
                if (full) {
                  if (!dockFullWarned) {
                    showToast("快捷栏已满（限6个图标），请先移除多余项。");
                    dockFullWarned = true;
                  }
                  return false;
                }
                dockFullWarned = false;
              } else {
                dockContainer.classList.remove("dock-full");
                dockFullWarned = false;
              }
              return true;
            },
            onAdd: (event) => {
              const card = event.item;
              if (!card) return;
              const id = card.dataset.id;
              const categoryName = container.dataset.category || "";
              normalizeCategoryItem(card);
              updateLinkDockState(id, false, categoryName, null);
              updateContainerState(container);
              syncAllOrders();
            },
            onEnd: (event) => {
              console.log("排序数据已保存");
              document.body.classList.remove("is-dragging");
              if (event.item) {
                event.item.classList.remove("is-dragging");
                event.item.draggable = false;
                event.item.setAttribute("draggable", "false");
              }
              if (dockGrid) {
                const dockContainer = dockGrid.closest("#dock-container");
                if (dockContainer) dockContainer.classList.remove("dock-full");
                dockFullWarned = false;
              }
              const moved =
                event &&
                (event.from !== event.to || event.oldIndex !== event.newIndex);
              if (moved) {
                pendingChanges = true;
                updateContainerState(event.from);
                updateContainerState(event.to);
                syncAllOrders();
              }
              if (dockGrid) {
                dockGrid.classList.remove("dock-drop");
              }
              updateEmptyCategories();
            }
          });
          sortables.push(sortable);
        });
        if (dockGrid) {
          const rect = dockGrid.getBoundingClientRect();
          console.log("Dock grid rect:", rect.width, rect.height);
          const dockSortable = new Sortable(dockGrid, {
            animation: 180,
            draggable: ".dock-item",
            handle: ".icon",
            group: { name: "shared", pull: true, put: true },
            sort: true,
            filter: ".edit-badge, .delete-badge, .lock, .dock-tooltip, .icon-label-capsule, .rename-input",
            preventOnFilter: false,
            forceFallback: true,
            fallbackOnBody: true,
            fallbackTolerance: 3,
            fallbackClass: "sortable-fallback",
            delay: 0,
            delayOnTouchOnly: true,
            touchStartThreshold: 2,
            dragoverBubble: false,
            invertSwap: false,
            direction: "horizontal",
            scroll: false,
            swap: false,
            swapThreshold: 0.6,
            easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
            ghostClass: "sortable-ghost",
            dragClass: "sortable-drag",
            disabled: false,
            onStart: (event) => {
              console.log("图标拖拽已捕获");
              ensureSortSession();
              document.body.classList.add("is-dragging");
              clearDragImage(event);
              dockGrid.classList.add("dock-drop");
              if (event.item) {
                event.item.classList.add("is-dragging");
                event.item.draggable = true;
                event.item.setAttribute("draggable", "true");
                event.item.querySelectorAll("img").forEach((img) => {
                  img.draggable = true;
                  img.setAttribute("draggable", "true");
                });
              }
            },
            onMove: (event) => {
              if (event.to !== dockGrid) return true;
              const fromDock = event.from === dockGrid;
              const draggedId = event.dragged && event.dragged.dataset ? event.dragged.dataset.id : null;
              const dockContainer = dockGrid.closest("#dock-container");
              const full = !fromDock && getDockCountLive(draggedId) >= dockLimit;
              if (dockContainer) {
                dockContainer.classList.toggle("dock-full", full);
              }
              if (full) {
                if (!dockFullWarned) {
                  showToast("快捷栏已满（限6个图标），请先移除多余项。");
                  dockFullWarned = true;
                }
                return false;
              }
              dockFullWarned = false;
              return true;
            },
            onUpdate: () => {
              updateContainerState(dockGrid);
              syncAllOrders();
            },
            onRemove: (event) => {
              if (event.item) {
                normalizeCategoryItem(event.item);
              }
            },
            onAdd: (event) => {
              const card = event.item;
              if (!card) return;
              const fromDock = event.from === dockGrid;
              const draggedId = card ? card.dataset.id : null;
              if (!fromDock && getDockCountLive(draggedId) > dockLimit) {
                showToast("快捷栏已满（限6个图标），请先移除多余项。");
                event.from && event.from.appendChild(card);
                return;
              }
              const id = card.dataset.id;
              normalizeDockItem(card);
              updateLinkDockState(id, true, "", null);
            },
            onEnd: (event) => {
              console.log("排序数据已保存");
              document.body.classList.remove("is-dragging");
              if (event.item) {
                event.item.classList.remove("is-dragging");
                event.item.draggable = false;
                event.item.setAttribute("draggable", "false");
              }
              const moved =
                event &&
                (event.from !== event.to || event.oldIndex !== event.newIndex);
              if (moved) {
                pendingChanges = true;
              }
              updateContainerState(dockGrid);
              dockGrid.classList.remove("dock-drop");
              const dockContainer = dockGrid.closest("#dock-container");
              if (dockContainer) dockContainer.classList.remove("dock-full");
              dockFullWarned = false;
              syncAllOrders();
              updateEmptyCategories();
            }
          });
          sortables.push(dockSortable);
        }
      }

      function applyVisitorModeUI() {
        document.body.classList.add("is-visitor");
        if (todayVisitorBadge) {
          todayVisitorBadge.classList.add("hidden");
        }
        if (loginBtn) {
          loginBtn.classList.remove("hidden");
          const label = loginBtn.querySelector("span");
          if (label) label.textContent = "\u767B\u5F55";
        }
        if (registerBtn) {
          registerBtn.classList.remove("hidden");
          const regLabel = registerBtn.querySelector("span");
          if (regLabel) regLabel.textContent = "\u6CE8\u518C";
        }
        if (avatarWrap) avatarWrap.classList.add("hidden");
        if (addBtn) addBtn.classList.add("hidden");
        if (settingsBtn) settingsBtn.classList.add("hidden");
        if (sortLockBtn) sortLockBtn.classList.add("hidden");
        if (viewToggleBtn) viewToggleBtn.classList.add("hidden");
        if (modeControl) modeControl.classList.add("hidden");
        setEditingState(false);
        setDeleteState(false);
        setSortLockState(false);
        if (editModeToggle) editModeToggle.checked = false;
        if (deleteModeToggle) deleteModeToggle.checked = false;
        destroySortables();
        currentMode = "preview";
        try {
          setActiveMode("preview");
        } catch (err) {}
      }

      function updateTodayVisitorBadge(count) {
        if (!todayVisitorBadge) return;
        if (!loggedIn || isVisitorMode) {
          todayVisitorBadge.classList.add("hidden");
          return;
        }
        const safeCount = Number.isFinite(Number(count)) ? Number(count) : 0;
        todayVisitorBadge.textContent = `今日访客 ${safeCount}`;
        todayVisitorBadge.classList.remove("hidden");
      }

      function fetchTodayVisitors() {
        if (!todayVisitorBadge || !loggedIn || isVisitorMode) return;
        fetch("/api/visitors/today", { credentials: "include", cache: "no-store" })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data && data.count !== undefined) {
              updateTodayVisitorBadge(data.count);
            }
          })
          .catch(() => {});
      }

      function renderVisitorDetails(items) {
        if (!visitorList || !visitorEmpty) return;
        visitorList.innerHTML = "";
        const rows = Array.isArray(items) ? items : [];
        visitorEmpty.classList.toggle("hidden", rows.length > 0);
        rows.forEach((item) => {
          const wrap = document.createElement("div");
          wrap.className = "visitor-item";
          const ip = document.createElement("div");
          ip.className = "visitor-ip";
          ip.textContent = item.ip || "未知 IP";
          const meta = document.createElement("div");
          meta.className = "visitor-location";
          const location = [item.city, item.region, item.country]
            .filter(Boolean)
            .join(" ");
          meta.textContent = location || "未知归属地";
          const time = document.createElement("div");
          time.className = "visitor-time";
          const ts = item.created_at ? new Date(item.created_at) : null;
          time.textContent = ts ? ts.toLocaleString() : "";
          const left = document.createElement("div");
          left.style.display = "grid";
          left.style.gap = "2px";
          left.appendChild(ip);
          left.appendChild(meta);
          wrap.appendChild(left);
          wrap.appendChild(time);
          visitorList.appendChild(wrap);
        });
      }

      function fetchTodayVisitorDetails() {
        if (!loggedIn || isVisitorMode) return;
        if (visitorList) {
          visitorList.innerHTML = "";
        }
        if (visitorEmpty) {
          visitorEmpty.classList.add("hidden");
        }
        fetch("/api/visitors/today/details", { credentials: "include", cache: "no-store" })
          .then((res) => (res.ok ? res.json() : null))
          .then((data) => {
            if (data && Array.isArray(data.items)) {
              renderVisitorDetails(data.items);
            } else {
              renderVisitorDetails([]);
            }
          })
          .catch(() => {
            renderVisitorDetails([]);
          });
      }

      function setLoginState(next, options = {}) {
        if (isVisitorMode) {
          loggedIn = false;
          applyVisitorModeUI();
          return;
        }
        try {
          loggedIn = next;
          if (!loggedIn) {
            destroySortables();
          }
          const label = loginBtn ? loginBtn.querySelector("span") : null;
          if (label) {
            label.textContent = "登录";
          }
          if (loginBtn) {
            loginBtn.classList.toggle("hidden", loggedIn);
          }
          if (registerBtn) {
            registerBtn.classList.toggle("hidden", loggedIn);
          }
          if (avatarWrap) {
            avatarWrap.classList.toggle("hidden", !loggedIn);
          }
          if (addBtn) {
            addBtn.classList.toggle("hidden", !loggedIn);
          }
          if (settingsBtn) {
            settingsBtn.classList.toggle("hidden", !loggedIn);
          }
          if (sortLockBtn) {
            sortLockBtn.classList.toggle("hidden", !loggedIn);
          }
          if (editModeToggle) {
            editModeToggle.checked = false;
          }
          if (deleteModeToggle) {
            deleteModeToggle.checked = false;
          }
          setEditingState(false);
          setDeleteState(false);
          setSortLockState(false);
          if (backupGroup) {
            backupGroup.classList.toggle("hidden", !loggedIn);
          }
          if (!options.skipFetch) {
            if (loggedIn) {
              loadCategories()
                .then(() => fetchLinks())
                .catch(() => fetchLinks());
            } else {
              fetchLinks();
            }
          }
          if (loggedIn) {
            fetchTodayVisitors();
          } else if (todayVisitorBadge) {
            todayVisitorBadge.classList.add("hidden");
          }
        } catch (err) {}
      }

      function getRegisterOpen() {
        if (!registerOpenUntil) return false;
        const ts = new Date(registerOpenUntil).getTime();
        if (!Number.isFinite(ts)) return false;
        return ts > Date.now();
      }

      function applyUserProfile(name, avatarUrl) {
        const safeName = name || "Admin";
        if (userNameLabel) {
          userNameLabel.textContent = safeName;
        }
        if (avatarText) {
          const initial = safeName.trim().charAt(0).toUpperCase() || "A";
          avatarText.textContent = initial;
        }
        if (avatarImg && avatarText) {
          if (avatarUrl) {
            avatarImg.src = avatarUrl;
            avatarImg.classList.remove("hidden");
            avatarText.classList.add("hidden");
          } else {
            avatarImg.classList.add("hidden");
            avatarText.classList.remove("hidden");
          }
        }
      }

      function trackVisitorEvent(type, payload = {}) {
        const viewUser = publicUsername || currentUsername || "";
        if (type === "visit" && visitorTracked) {
          return;
        }
        const body = {
          type,
          viewUser,
          ...payload
        };
        try {
          const data = JSON.stringify(body);
          if (navigator.sendBeacon) {
            const blob = new Blob([data], { type: "application/json" });
            navigator.sendBeacon("/api/visit/track", blob);
          } else {
            fetch("/api/visit/track", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: data,
              keepalive: true
            }).catch(() => {});
          }
          if (type === "visit") {
            visitorTracked = true;
          }
        } catch (err) {}
      }

      function applySiteLogo(logoPath) {
        if (!siteLogoImg || !siteLogoText) return;
        const defaultLogo =
          siteLogoImg.dataset.defaultLogo || siteLogoImg.getAttribute("src") || "";
        if (logoPath) {
          siteLogoImg.src = logoPath;
          siteLogoImg.classList.remove("hidden");
          siteLogoText.classList.add("hidden");
          if (logoMark) {
            logoMark.classList.add("has-logo");
          }
          return;
        }
        if (defaultLogo) {
          siteLogoImg.src = defaultLogo;
          siteLogoImg.classList.remove("hidden");
          siteLogoText.classList.add("hidden");
          if (logoMark) {
            logoMark.classList.add("has-logo");
          }
          return;
        }
        siteLogoImg.classList.add("hidden");
        siteLogoText.classList.remove("hidden");
        if (logoMark) {
          logoMark.classList.remove("has-logo");
        }
      }

      function setAvatarMenuOpen(open) {
        if (!avatarMenu || !avatarBtn) return;
        if (open) {
          avatarMenu.classList.remove("opacity-0", "pointer-events-none", "scale-95");
          avatarMenu.classList.add("opacity-100", "pointer-events-auto", "scale-100");
          avatarBtn.setAttribute("aria-expanded", "true");
        } else {
          avatarMenu.classList.add("opacity-0", "pointer-events-none", "scale-95");
          avatarMenu.classList.remove("opacity-100", "pointer-events-auto", "scale-100");
          avatarBtn.setAttribute("aria-expanded", "false");
        }
      }

      if (avatarBtn) {
        avatarBtn.addEventListener("click", (event) => {
          event.stopPropagation();
          const isOpen = avatarMenu && avatarMenu.classList.contains("opacity-100");
          setAvatarMenuOpen(!isOpen);
        });
      }

      document.addEventListener("click", (event) => {
        if (!avatarMenu) return;
        if (event.target.closest("#avatarWrap")) {
          return;
        }
        setAvatarMenuOpen(false);
      });

      if (profileEditBtn) {
        profileEditBtn.addEventListener("click", () => {
          window.location.href = "/profile.html";
          setAvatarMenuOpen(false);
        });
      }


      if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
          fetch("/api/logout", { method: "POST" })
            .then(() => {
              const lastUser = localStorage.getItem("lastUsername");
              if (lastUser) {
                window.location.href = `/${encodeURIComponent(lastUser)}`;
                return;
              }
              window.location.reload();
            })
            .catch(() => {});
        });
      }

      function applySearch() {
        try {
          const term = String(searchTerm || "").trim().toLowerCase();
          const source = Array.isArray(allLinks) ? allLinks : [];
          const filtered = term
            ? source.filter((item) => {
                const hay =
                  `${item.title || ""} ${item.category || ""} ${item.url || ""} ${item.tags || ""}`.toLowerCase();
                return hay.includes(term);
              })
            : source;
          renderLinks(filtered);
          if (!(currentMode === "delete" && activeDeleteBubble)) {
            renderDockLinks(filtered);
          }
        } catch (err) {
          console.log("No data found");
        }
      }

      function updateBulkBar() {
        if (!bulkBar || !bulkCount) return;
        bulkCount.textContent = String(bulkSelected.size);
        bulkBar.classList.toggle("hidden", bulkSelected.size === 0);
      }

      function resetBulkSelection() {
        bulkSelected.clear();
        document.querySelectorAll(".bulk-selected").forEach((el) => {
          el.classList.remove("bulk-selected");
        });
        updateBulkBar();
      }

      if (searchInput) {
        searchInput.addEventListener("input", () => {
          searchTerm = searchInput.value;
          if (searchClearBtn) {
            searchClearBtn.classList.toggle("hidden", !searchTerm);
          }
          applySearch();
        });
      }
      if (searchClearBtn) {
        searchClearBtn.addEventListener("click", () => {
          searchTerm = "";
          if (searchInput) searchInput.value = "";
          searchClearBtn.classList.add("hidden");
          applySearch();
        });
      }

      function deleteLink(id) {
        if (!loggedIn || !id) {
          return;
        }
        if (!deleting && !window.confirm("确定要删除这个导航吗？")) {
          return;
        }
        fetch(`/api/links/${id}`, {
          method: "DELETE",
          credentials: "same-origin"
        })
          .then((res) => {
            if (!res.ok) {
              throw new Error("Delete failed");
            }
            allLinks = allLinks.filter((item) => String(item.id) !== String(id));
            applySearch();
          })
          .catch(() => {});
      }


      function handleBadgeAction(event) {
        const editBtn = event.target.closest(".edit-badge");
        const deleteBtn = event.target.closest(".delete-badge");
        const card = event.target.closest(".app");
        const id =
          (editBtn && editBtn.dataset.id) ||
          (deleteBtn && deleteBtn.dataset.id) ||
          (card ? card.dataset.id : null);
        if (!id) {
          return;
        }
        if (currentMode === "sort" || document.body.classList.contains("is-dragging")) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        if (editBtn || deleteBtn) {
          event.preventDefault();
          event.stopPropagation();
          if (editBtn) {
            const item = allLinks.find((link) => String(link.id) === String(id));
            if (item) {
              openEditModal(item);
            }
            return;
          }
          if (deleteBtn) {
            showDeleteBubble(card, id);
            return;
          }
        }

        if (currentMode !== "preview" && currentMode !== "sort") {
          event.preventDefault();
          event.stopPropagation();
          if (currentMode === "edit") {
            const item = allLinks.find((link) => String(link.id) === String(id));
            if (item) {
              openEditModal(item);
            }
            return;
          }
          if (currentMode === "delete") {
            showDeleteBubble(card, id);
          }
        }
      }

      function handleBulkSelect(event) {
        if (currentMode !== "delete") return;
        if (event.target.closest(".delete-badge") || event.target.closest(".edit-badge")) {
          return;
        }
        const app = event.target.closest(".app");
        if (!app || !app.dataset.id) return;
        event.preventDefault();
        event.stopPropagation();
        const id = String(app.dataset.id);
        if (bulkSelected.has(id)) {
          bulkSelected.delete(id);
          app.classList.remove("bulk-selected");
        } else {
          bulkSelected.add(id);
          app.classList.add("bulk-selected");
        }
        updateBulkBar();
      }

      async function bulkDeleteSelected() {
        if (!bulkSelected.size) return;
        if (!window.confirm(`确定删除选中的 ${bulkSelected.size} 个图标吗？`)) {
          return;
        }
        const ids = Array.from(bulkSelected);
        for (const id of ids) {
          try {
            await fetch(`/api/links/${id}`, {
              method: "DELETE",
              credentials: "same-origin"
            });
          } catch (err) {}
        }
        allLinks = allLinks.filter((item) => !bulkSelected.has(String(item.id)));
        resetBulkSelection();
        applySearch();
      }

      async function bulkMoveSelected() {
        if (!bulkSelected.size) return;
        if (!bulkMoveSelect || !bulkMoveSelect.value) {
          showToast("请选择目标分类");
          return;
        }
        const targetCategory = bulkMoveSelect.value;
        const categoryInfo = getCategoryByName(targetCategory);
        const enforcedPrivate = categoryInfo && categoryInfo.is_private;
        const ids = Array.from(bulkSelected);
        for (const id of ids) {
          const item = allLinks.find((link) => String(link.id) === String(id));
          if (!item) continue;
          const payload = {
            title: item.title,
            url: item.url,
            tags: item.tags || "",
            category: targetCategory,
            is_private: enforcedPrivate ? 1 : item.is_private ? 1 : 0,
            is_dock: false,
            position_index: null
          };
          try {
            await fetch(`/api/links/${id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json; charset=utf-8" },
              credentials: "same-origin",
              body: JSON.stringify(payload)
            });
          } catch (err) {}
        }
        await fetchLinks();
        resetBulkSelection();
        if (bulkMoveSelect) bulkMoveSelect.value = "";
      }

      if (grid) {
        grid.addEventListener("click", handleBadgeAction);
        grid.addEventListener("click", handleBulkSelect);
      }
      if (dockGrid) {
        dockGrid.addEventListener("click", handleBadgeAction);
        dockGrid.addEventListener("click", handleBulkSelect);
      }
      const dockContainer = document.querySelector("#dock-container");
      if (dockContainer) {
        dockContainer.addEventListener("click", handleBadgeAction);
      }
      document.addEventListener(
        "click",
        (event) => {
          if (currentMode !== "sort") return;
          const link = event.target.closest(".app");
          if (!link) return;
          event.preventDefault();
          event.stopPropagation();
        },
        true
      );
      document.addEventListener("click", (event) => {
        if (event.target.closest(".delete-bubble")) {
          return;
        }
        closeDeleteBubble();
      });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          return;
        }
      });
      document.addEventListener("selectstart", (event) => {
        if (currentMode === "sort") {
          event.preventDefault();
        }
      });

      function showToast(message) {
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add("show");
        setTimeout(() => {
          toast.classList.remove("show");
        }, 1200);
      }

      function showHintOnce(key, message) {
        try {
          if (localStorage.getItem(key)) return;
          localStorage.setItem(key, "1");
        } catch (err) {}
        showToast(message);
      }

      function closeDeleteBubble() {
        if (activeDeleteBubble) {
          activeDeleteBubble.remove();
          activeDeleteBubble = null;
        }
        activeDeleteId = null;
      }

      function showDeleteBubble(card, id) {
        if (!card) return;
        closeDeleteBubble();
        activeDeleteId = String(id || "");
        const bubble = document.createElement("div");
        bubble.className = "delete-bubble";
        bubble.innerHTML =
          '<button type="button" class="confirm">确认</button><button type="button" class="cancel">取消</button>';
        bubble.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
        });
        const confirmBtn = bubble.querySelector(".confirm");
        const cancelBtn = bubble.querySelector(".cancel");
        if (confirmBtn) {
          confirmBtn.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            closeDeleteBubble();
            deleteLink(id);
          });
        }
        if (cancelBtn) {
          cancelBtn.addEventListener("click", (event) => {
            event.preventDefault();
            event.stopPropagation();
            closeDeleteBubble();
          });
        }
        card.appendChild(bubble);
        activeDeleteBubble = bubble;
      }


      function applyViewMode(mode) {
        const isMobileView = document.body.classList.contains("is-mobile") || window.innerWidth < 768;
        if (isMobileView) {
          viewMode = "list";
        } else {
          viewMode = mode;
          localStorage.setItem("viewMode", mode);
        }
        document.body.classList.toggle("view-card", viewMode === "card");
        if (viewMode === "list" && !isMobileView) {
          showHintOnce("hint_list_mode", "列表模式下可左右滑动分类内图标");
        }
        if (viewToggleBtn) {
          const gridIcon = viewToggleBtn.querySelector(".view-icon-grid");
          const cardIcon = viewToggleBtn.querySelector(".view-icon-card");
          if (gridIcon && cardIcon) {
            if (viewMode === "card") {
              gridIcon.classList.add("hidden");
              cardIcon.classList.remove("hidden");
            } else {
              gridIcon.classList.remove("hidden");
              cardIcon.classList.add("hidden");
            }
          }
        }
      }

      function updateMobileLongPressLock() {
        const isMobile =
          window.matchMedia && window.matchMedia("(max-width: 640px)").matches;
        const shouldLock = isMobile && currentMode === "preview";
        document.body.classList.toggle("mobile-preview-lock", shouldLock);
      }

      function formatInviteExpiry(value) {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "";
        return date.toLocaleString();
      }

      function saveAppearanceSettings(payload) {
        if (!loggedIn) {
          return;
        }
        fetch("/api/settings", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json; charset=utf-8"
          },
          body: JSON.stringify(payload)
        })
          .then((res) => {
            if (!res.ok) {
              throw new Error("Failed to save settings");
            }
            return res.json();
          })
          .then(() => {
            if (payload.siteName && siteTitle) {
              siteTitle.textContent = payload.siteName;
              document.title = payload.siteName;
            }
            if (payload.iconScale !== undefined) {
              applyIconScale(payload.iconScale);
            }
            if (payload.frostBlur !== undefined) {
              applyFrostBlur(payload.frostBlur);
            }
            if (payload.pageBrightness !== undefined) {
              applyBrightness(payload.pageBrightness);
            }
            if (payload.lowPowerMode !== undefined) {
              applyLowPower(payload.lowPowerMode);
            }
            if (payload.quickBrightness !== undefined) {
              applyQuickBrightness(payload.quickBrightness);
            }
            if (payload.compactHeader !== undefined) {
              applyCompactHeader(payload.compactHeader);
            }
            showToast("保存成功");
          })
          .catch(() => {
            showToast("保存失败");
          });
      }

      function updateLinkDockState(id, isDock, categoryName, positionIndex) {
        const target = allLinks.find((item) => String(item.id) === String(id));
        if (!target) return;
        if (isDock && !target.is_dock && getDockCountLive(target.id) >= dockLimit) {
          showToast("快捷栏已满（限6个图标），请先移除多余项。");
          if (currentMode !== "sort" && !sortUnlocked) {
            applySearch();
          }
          return;
        }
        const categoryInfo = !isDock ? getCategoryByName(categoryName) : null;
        const enforcedPrivate = Boolean(categoryInfo && categoryInfo.is_private);
        const payload = {
          title: target.title || "",
          url: target.url || "",
          category: isDock ? "" : categoryName || target.category || "",
          is_private: enforcedPrivate ? 1 : target.is_private ? 1 : 0,
          is_dock: isDock,
          position_index: isDock && typeof positionIndex === "number" ? positionIndex : null
        };
        fetch(`/api/links/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify(payload)
        })
          .then((res) => {
            if (!res.ok) throw new Error("Failed");
            target.is_dock = isDock;
            target.category = payload.category;
            target.position_index = payload.position_index;
            target.is_private = payload.is_private ? 1 : 0;
            target.category_private = enforcedPrivate;
            if (currentMode !== "sort" && !sortUnlocked) {
              applySearch();
            }
          })
          .catch(() => {});
      }

      function queueAppearanceSave(payload) {
        if (appearanceTimer) {
          clearTimeout(appearanceTimer);
        }
        appearanceTimer = setTimeout(() => {
          saveAppearanceSettings(payload);
        }, 400);
      }

      function scheduleAutoSave() {
        if (!loggedIn) return;
        if (saveTimer) {
          clearTimeout(saveTimer);
        }
        saveTimer = setTimeout(() => {
          saveEditingChanges()
            .then(() => {
              pendingChanges = false;
              document.querySelectorAll(".category-card").forEach((card) => {
                card.dataset.original = card.dataset.category || "";
              });
              showToast("保存成功");
            })
            .catch(() => {
              showToast("保存失败");
            });
          }, 600);
        }

      function saveOrder(orderIds) {
        if (!loggedIn) return;
        if (!Array.isArray(orderIds)) return;
        pendingChanges = true;
        scheduleAutoSave();
      }

      function syncAllOrders() {
        const orderedCategories = [];
        const cards = getCategoryCards();
        const orderedCards = grid && grid.classList.contains("free-layout")
          ? getCategoryCardOrder(cards)
          : cards
              .filter((card) => !card.classList.contains("category-add-card"))
              .map((card, index) => ({
                card,
                name: card.dataset.category || "",
                posX: Number(card.dataset.posX),
                posY: Number(card.dataset.posY),
                index
              }));
        orderedCards.forEach((entry) => {
          if (!entry.name) return;
          orderedCategories.push(entry.name);
          if (grid && grid.classList.contains("free-layout")) {
            entry.card.dataset.posX = String(
              Number.isFinite(entry.posX) ? entry.posX : 0
            );
            entry.card.dataset.posY = String(
              Number.isFinite(entry.posY) ? entry.posY : 0
            );
          }
        });
        if (orderedCategories.length) {
          const existing = Array.isArray(allCategories) ? allCategories : [];
          const map = new Map(existing.map((item) => [item.name, item]));
          allCategories = orderedCategories.map((name, index) => {
            const match = map.get(name);
            const card = orderedCards[index]?.card;
            const posX = card ? Number(card.dataset.posX) : null;
            const posY = card ? Number(card.dataset.posY) : null;
            if (match) {
              match.pos_x = Number.isFinite(posX) ? posX : match.pos_x ?? null;
              match.pos_y = Number.isFinite(posY) ? posY : match.pos_y ?? null;
              return match;
            }
            return {
              name,
              is_private: false,
              pos_x: Number.isFinite(posX) ? posX : null,
              pos_y: Number.isFinite(posY) ? posY : null
            };
          });
          renderCategoryNav(orderedCategories);
        }

        document.querySelectorAll(".category-grid, .card-page").forEach((container) => {
          updateContainerState(container);
          const categoryName = container.dataset.category || "";
          container.querySelectorAll(".app").forEach((app, index) => {
            const target = allLinks.find((item) => String(item.id) === String(app.dataset.id));
            if (!target) return;
            const categoryInfo = getCategoryByName(categoryName);
            target.is_dock = false;
            target.category = categoryName;
            target.sort_index = index;
            target.category_private = categoryInfo ? categoryInfo.is_private : false;
          });
        });
        if (dockGrid) {
          updateContainerState(dockGrid);
          dockGrid.querySelectorAll(".dock-item").forEach((app, index) => {
            const target = allLinks.find((item) => String(item.id) === String(app.dataset.id));
            if (!target) return;
            target.is_dock = true;
            target.category = "";
            target.position_index = index;
          });
        }
        pendingChanges = true;
        scheduleAutoSave();
      }

      function setSortLockState(unlocked) {
        if (!loggedIn) {
          sortUnlocked = false;
          document.body.classList.remove("sort-unlocked");
          destroySortables();
          return;
        }
        console.log("Sort lock toggled:", unlocked);
        sortUnlocked = unlocked;
        document.body.classList.toggle("sort-unlocked", sortUnlocked);
        document.body.classList.toggle("app-unlocked", sortUnlocked);
        document.body.classList.remove("is-editing");
        window.isEditing = currentMode === "edit" || currentMode === "delete";
        if (sortLockBtn) {
          sortLockBtn.classList.toggle("text-blue-500", sortUnlocked);
          sortLockBtn.classList.toggle("border-blue-400/40", sortUnlocked);
          sortLockBtn.setAttribute("aria-pressed", sortUnlocked ? "true" : "false");
          const closed = sortLockBtn.querySelector('[data-icon="lock-closed"]');
          const open = sortLockBtn.querySelector('[data-icon="lock-open"]');
          if (closed && open) {
            closed.classList.toggle("hidden", sortUnlocked);
            open.classList.toggle("hidden", !sortUnlocked);
          }
        }
        if (sortUnlocked) {
          setTimeout(() => {
            initSortables();
            setSortablesEnabled(true);
            updateDockDragState();
            const containers = document.querySelectorAll(".category-grid, .card-page");
            console.log("检测到 " + containers.length + " 个分类容器已激活排序");
          }, 150);
        } else {
          setSortablesEnabled(false);
          destroySortables();
          updateDockDragState();
        }
      }

      function applyMode(next) {
        const modes = ["preview", "sort", "edit", "delete"];
        if (!modes.includes(next)) {
          next = "preview";
        }
        if (next !== currentMode) {
          triggerModeTransition();
        }
        closeDeleteBubble();
        document.querySelectorAll(".app.jiggle").forEach((el) => {
          el.classList.remove("jiggle", "is-shaking");
        });
        document.body.classList.remove(
          "mode-preview",
          "mode-sort",
          "mode-edit",
          "mode-delete"
        );
        currentMode = next;
        document.body.classList.add(`mode-${next}`);
        modeButtons.forEach((btn) => {
          btn.classList.toggle("active", btn.dataset.mode === next);
        });

        if (next === "sort") {
          sortUnlocked = true;
          setSortLockState(true);
          editing = false;
          deleting = false;
          showHintOnce("hint_sort_mode", "拖拽图标或分类可排序，完成后退出排序模式");
        } else if (next === "edit") {
          sortUnlocked = false;
          setSortLockState(false);
          editing = true;
          deleting = false;
        } else if (next === "delete") {
          sortUnlocked = false;
          setSortLockState(false);
          editing = false;
          deleting = true;
        } else {
          sortUnlocked = false;
          setSortLockState(false);
          editing = false;
          deleting = false;
        }
        if (next !== "delete") {
          resetBulkSelection();
        }
        updateDockDragState();
        updateModeUI();
        if (next === "sort") {
          setTimeout(() => {
            sortUnlocked = true;
            setSortLockState(true);
            initSortables();
            setSortablesEnabled(true);
            initCategoryFreeDrag();
          }, 80);
        }
        try {
          const selection = window.getSelection && window.getSelection();
          if (selection && selection.removeAllRanges) {
            selection.removeAllRanges();
          }
        } catch (err) {
          console.warn("Selection reset failed", err);
        }
        console.log("当前全站模式已切换至：" + next);
      }

      function setActiveMode(next) {
        console.log("检测到模式切换：正在清理所有排序实例...");
        const previousMode = currentMode;
        closeDeleteBubble();
        destroySortables();
        document.querySelectorAll(".app.jiggle, .icon.is-shaking, .app.is-shaking").forEach((el) => {
          el.classList.remove("jiggle", "is-shaking");
        });
        document.body.classList.remove("sort-unlocked", "app-unlocked");
        document.querySelectorAll(".rename-input").forEach((input) => {
          try {
            input.blur();
          } catch (err) {}
        });
        document.querySelectorAll(".modal.active").forEach((modalEl) => {
          modalEl.classList.remove("active");
        });
        document.body.classList.remove("modal-open");
        unlockBodyScroll();
        applyMode(next);
        updateMobileLongPressLock();
        if (Array.isArray(allLinks)) {
          const isSortPreviewSwitch =
            (previousMode === "preview" && next === "sort") ||
            (previousMode === "sort" && next === "preview");
          if (!isSortPreviewSwitch) {
            renderLinks(allLinks);
            renderDockLinks(allLinks);
          }
        }
        console.log("清理完成。");
      }

      function collectEditingPayload() {
        const categoryCards = Array.from(document.querySelectorAll(".category-card"));
        const categories = categoryCards.map((card, index) => ({
          name: card.dataset.category || "",
          sort_index: index,
          pos_x: Number.isFinite(Number(card.dataset.posX)) ? Number(card.dataset.posX) : null,
          pos_y: Number.isFinite(Number(card.dataset.posY)) ? Number(card.dataset.posY) : null
        }));
        const renames = categoryCards
          .map((card) => ({
            from: card.dataset.original || "",
            to: card.dataset.category || ""
          }))
          .filter((item) => item.from && item.to && item.from !== item.to);

        const links = [];
        const linkTitles = [];
        categoryCards.forEach((card) => {
          const categoryName = card.dataset.category || "";
          const items = card.querySelectorAll(".category-grid .app");
          items.forEach((app, index) => {
            links.push({
              id: app.dataset.id,
              sort_index: index,
              category: categoryName,
              is_dock: false
            });
            const originalTitle = app.dataset.originalTitle || "";
            const currentTitle = app.dataset.title || "";
            if (currentTitle && currentTitle !== originalTitle) {
              linkTitles.push({ id: app.dataset.id, title: currentTitle });
              app.dataset.originalTitle = currentTitle;
            }
          });
        });
        if (dockGrid) {
          dockGrid.querySelectorAll(".dock-item").forEach((app, index) => {
            links.push({
              id: app.dataset.id,
              sort_index: index,
              position_index: index,
              category: "",
              is_dock: true
            });
            const originalTitle = app.dataset.originalTitle || "";
            const currentTitle = app.dataset.title || "";
            if (currentTitle && currentTitle !== originalTitle) {
              linkTitles.push({ id: app.dataset.id, title: currentTitle });
              app.dataset.originalTitle = currentTitle;
            }
          });
        }
        return { categories, links, renames, linkTitles };
      }

      function saveEditingChanges() {
        if (!loggedIn) {
          return Promise.reject(new Error("Not logged in"));
        }
        const payload = collectEditingPayload();
        return fetch("/api/editing/save", {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8"
          },
          credentials: "same-origin",
          body: JSON.stringify(payload)
        }).then((res) => {
          if (!res.ok) {
            throw new Error("Failed to save");
          }
        });
      }

      function updateModeUI() {
        try {
          if (editModeToggle) {
            editModeToggle.checked = false;
          }
          if (deleteModeToggle) {
            deleteModeToggle.checked = false;
          }
          if (editToolbar) {
            editToolbar.classList.toggle("active", false);
          }
          if (editStatusLabel) {
            editStatusLabel.textContent = "";
          }
          document.body.classList.remove("is-editing", "is-deleting");
        } catch (err) {}
      }

      function triggerModeTransition() {
        document.body.classList.add("mode-transition");
        clearTimeout(window.__modeTransitionTimer);
        window.__modeTransitionTimer = setTimeout(() => {
          document.body.classList.remove("mode-transition");
        }, 200);
      }

      function setEditingState(next) {
        if (!next) {
          setActiveMode("preview");
          return;
        }
        setActiveMode("edit");
      }

      function setDeleteState(next) {
        if (!next) {
          setActiveMode("preview");
          return;
        }
        setActiveMode("delete");
      }

      function refreshApp() {
        fetchLinks();
        loadCategories();
      }

      function initDockFisheye() {
        const dock = document.querySelector("#dock-container");
        if (!dock) return;
        let rafId = null;
        const maxDistance = 140;
        const minScale = 1;
        const maxScale = 1.5;

        function resetScales() {
          dock.querySelectorAll(".dock-item").forEach((item) => {
            item.style.transform = "translateY(0) scale(1)";
          });
        }

        function handleMove(event) {
          if (editing || deleting || sortUnlocked || currentMode === "sort") {
            return;
          }
          const rect = dock.getBoundingClientRect();
          const x = event.clientX - rect.left;
          if (rafId) cancelAnimationFrame(rafId);
          rafId = requestAnimationFrame(() => {
            dock.querySelectorAll(".dock-item").forEach((item) => {
              const itemRect = item.getBoundingClientRect();
              const center = itemRect.left - rect.left + itemRect.width / 2;
              const dist = Math.abs(x - center);
              const t = Math.max(0, 1 - dist / maxDistance);
              const scale = minScale + (maxScale - minScale) * t * t;
              const lift = -10 * t;
              item.style.transform = `translateY(${lift}px) scale(${scale})`;
            });
          });
        }

        dock.addEventListener("mousemove", handleMove);
        dock.addEventListener("mouseleave", () => {
          if (editing || deleting || sortUnlocked || currentMode === "sort") {
            return;
          }
          if (rafId) cancelAnimationFrame(rafId);
          resetScales();
        });
      }

      function initCategoryFisheye() {
        const categoryGrids = document.querySelectorAll(".category-grid, .card-page");
        if (!categoryGrids.length) return;
        categoryGrids.forEach((gridEl) => {
          if (gridEl.dataset.fisheyeBound) return;
          gridEl.dataset.fisheyeBound = "true";
          let rafId = null;
          const baseMaxDistance = gridEl.classList.contains("card-page") ? 160 : 200;
          const minScale = 1;
          const maxScale = 1.3;
          const neighborScale = 1.15;

          function resetScales() {
            gridEl.querySelectorAll(".app").forEach((item) => {
              item.style.transform = "translateY(0) scale(1)";
              item.style.zIndex = "";
              item.classList.remove("fisheye-active");
            });
          }

          function handleMove(event) {
            if (sortUnlocked || currentMode === "sort") {
              return;
            }
            const rect = gridEl.getBoundingClientRect();
            const x = event.clientX - rect.left;
            const y = event.clientY - rect.top;
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(() => {
              const items = Array.from(gridEl.querySelectorAll(".app"));
              items.forEach((item) => {
                const itemRect = item.getBoundingClientRect();
                const centerX = itemRect.left - rect.left + itemRect.width / 2;
                const centerY = itemRect.top - rect.top + itemRect.height / 2;
                const dx = x - centerX;
                const dy = y - centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const t = Math.max(0, 1 - dist / baseMaxDistance);
                const eased = t * t;
                const scale = minScale + (maxScale - minScale) * eased;
                const neighbor = minScale + (neighborScale - minScale) * eased;
                const finalScale = Math.max(scale, neighbor);
                const lift = -6 * eased;
                item.style.transform = `translateY(${lift}px) scale(${finalScale})`;
                item.style.zIndex = t > 0 ? "100" : "";
                if (item.closest(".card-compact") || item.closest(".card-page")) {
                  if (t > 0.12) {
                    item.classList.add("fisheye-active");
                  } else {
                    item.classList.remove("fisheye-active");
                  }
                }
              });
            });
          }

          gridEl.addEventListener("mousemove", handleMove);
          gridEl.addEventListener("mouseleave", () => {
            if (sortUnlocked || currentMode === "sort") {
              return;
            }
            if (rafId) cancelAnimationFrame(rafId);
            resetScales();
          });
        });
      }

      function openEditModal(item) {
        if (!item) return;
        returnToMode = currentMode;
        editingLinkId = item.id;
        if (item && item.is_dock) {
          const pos = Number(item.position_index);
          editingDockPosition = Number.isNaN(pos) ? null : pos;
        } else {
          editingDockPosition = null;
        }
        formTitle.textContent = "编辑导航";
        saveBtn.textContent = "保存修改";
        titleInput.value = item.title || "";
        applyUrlToInput(item.url || "");
        if (tagsInput) {
          tagsInput.value = item.tags || "";
        }
        const categoryName = item.is_dock ? "" : item.category || "";
        categoryInput.value = categoryName;
        privateInput.checked = Number(item.is_private) === 1;
        if (dockInput) {
          dockInput.checked = Boolean(item.is_dock);
        }
        loadCategories(categoryName).then(() => {
          syncPrivateToggleForCategory(categoryName);
        });
          openModal(modal, { returnToSettings: false });
        }

      function applyFontSettings() {
        if (fontSizeInput) {
          const size = Number(fontSizeInput.value);
          if (!Number.isNaN(size) && size > 0) {
            document.documentElement.style.setProperty("--base-size", `${size}px`);
          }
        }
        document.body.classList.toggle("bold", boldToggle && boldToggle.checked);
      }

      function applyIconScale(value) {
        const next = Number(value);
        if (Number.isNaN(next)) return;
        iconScale = Math.min(1, Math.max(0, next / 100));
        renderLinks(allLinks);
      }

      function applyFrostBlur(value) {
        const clarity = Math.max(0, Math.min(100, Number(value)));
        if (Number.isNaN(clarity)) return;
        const maxBlur = 90;
        const minBlur = 0;
        const blur = maxBlur - (clarity / 100) * (maxBlur - minBlur);
        const minOpacity = 0.08;
        const maxOpacity = 0.45;
        const opacity = maxOpacity - (clarity / 100) * (maxOpacity - minOpacity);
        const maxGlowBlur = 180;
        const minGlowBlur = 70;
        const glowBlur = maxGlowBlur - (clarity / 100) * (maxGlowBlur - minGlowBlur);
        const minGlowOpacity = 0.55;
        const maxGlowOpacity = 1;
        const glowOpacity =
          minGlowOpacity + (clarity / 100) * (maxGlowOpacity - minGlowOpacity);
        document.documentElement.style.setProperty("--frost-blur", `${blur.toFixed(1)}px`);
        document.documentElement.style.setProperty("--frost-opacity", opacity.toFixed(2));
        document.documentElement.style.setProperty("--glow-blur", `${glowBlur.toFixed(1)}px`);
        document.documentElement.style.setProperty("--glow-opacity", glowOpacity.toFixed(2));
      }

      function applyBrightness(value) {
        const brightness = Math.max(0, Math.min(100, Number(value)));
        if (Number.isNaN(brightness)) return;
        const maxDim = 0.45;
        const minDim = 0;
        const dim = maxDim - (brightness / 100) * (maxDim - minDim);
        document.documentElement.style.setProperty("--page-dim", dim.toFixed(2));
        try {
          localStorage.setItem("pageBrightness", String(brightness));
        } catch (err) {}
      }

      function applyLowPower(enabled) {
        document.body.classList.toggle("low-power", Boolean(enabled));
      }

      function applyQuickBrightness(enabled) {
        if (!brightnessControl) return;
        brightnessControl.classList.toggle("hidden", !enabled);
      }

      function applyCompactHeader(enabled) {
        document.body.classList.toggle("compact-header", Boolean(enabled));
      }

      function updateDockDragState() {
        if (!dockGrid) return;
        const enabled = currentMode === "sort" || sortUnlocked;
        dockGrid.querySelectorAll(".dock-item").forEach((item) => {
          item.draggable = enabled;
          item.setAttribute("draggable", enabled ? "true" : "false");
        });
      }

      if (brightnessInput) {
        const savedBrightness = localStorage.getItem("pageBrightness");
        const initialBrightness =
          savedBrightness !== null ? savedBrightness : brightnessInput.value || "60";
        brightnessInput.value = initialBrightness;
        applyBrightness(initialBrightness);
      }
      if (quickBrightnessToggle) {
        if (quickBrightnessToggle.checked === false) {
          quickBrightnessToggle.checked = true;
        }
        applyQuickBrightness(quickBrightnessToggle.checked);
      }

      function initMobilePosition() {}

      if (menuToggle && controlGroup) {
        menuToggle.addEventListener("click", (event) => {
          event.stopPropagation();
          controlGroup.classList.toggle("open");
          menuToggle.classList.toggle("open");
          const expanded = controlGroup.classList.contains("open");
          menuToggle.setAttribute("aria-expanded", expanded ? "true" : "false");
        });
      }
      if (brightnessToggle && brightnessControl) {
        brightnessToggle.addEventListener("click", (event) => {
          event.stopPropagation();
          brightnessControl.classList.toggle("open");
        });
        brightnessControl.addEventListener("click", (event) => {
          event.stopPropagation();
        });
        document.addEventListener("click", () => {
          brightnessControl.classList.remove("open");
        });
      }

      window.addEventListener(
        "scroll",
        () => {
          if (scrollRaf) return;
          scrollRaf = requestAnimationFrame(() => {
            scrollRaf = null;
            if (!document.body.classList.contains("is-scrolling")) {
              document.body.classList.add("is-scrolling");
            }
            if (scrollPerfTimer) {
              clearTimeout(scrollPerfTimer);
            }
            scrollPerfTimer = setTimeout(() => {
              document.body.classList.remove("is-scrolling");
            }, 180);
          });
        },
        { passive: true }
      );
      if (controlGroup) {
        controlGroup.addEventListener("click", (event) => {
          const target = event.target;
          if (!target) return;
          const isButton = target.closest("button");
          if (isButton && menuToggle && controlGroup.classList.contains("open")) {
            controlGroup.classList.remove("open");
            menuToggle.classList.remove("open");
            menuToggle.setAttribute("aria-expanded", "false");
          }
        });
      }
      document.addEventListener("click", (event) => {
        if (!menuToggle || !controlGroup) return;
        if (!controlGroup.classList.contains("open")) return;
        const target = event.target;
        if (target && (target.closest("#menuToggle") || target.closest("#controlGroup"))) {
          return;
        }
        controlGroup.classList.remove("open");
        menuToggle.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
      });
      document.addEventListener(
        "touchstart",
        (event) => {
          if (!menuToggle || !controlGroup) return;
          if (!controlGroup.classList.contains("open")) return;
          const target = event.target;
          if (target && (target.closest("#menuToggle") || target.closest("#controlGroup"))) {
            return;
          }
          controlGroup.classList.remove("open");
          menuToggle.classList.remove("open");
          menuToggle.setAttribute("aria-expanded", "false");
        },
        { passive: true }
      );
      document.addEventListener(
        "touchmove",
        (event) => {
          if (!document.body.classList.contains("modal-open")) return;
          const sheet = event.target.closest(".modal .sheet");
          if (!sheet) {
            event.preventDefault();
          }
        },
        { passive: false }
      );

      if (loginBtn) {
        try {
          loginBtn.addEventListener("click", async (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (isVisitorMode) {
              window.location.href = "/login.html";
              return;
            }
            window.location.href = "/login.html";
          });
        } catch (err) {}
      }
      if (registerBtn) {
        registerBtn.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!getRegisterOpen()) {
            showToast("注册入口未开放");
            return;
          }
          window.location.href = "/register.html";
        });
      }

      if (addBtn) {
        addBtn.addEventListener("click", () => {
          if (!loggedIn) {
            window.location.href = "/login.html";
            return;
          }
          openModal(addMenuModal, { returnToSettings: true });
        });
      }

        cancelBtn.addEventListener("click", () => {
          closeEditModalToPreview();
        });

        if (modalBackBtn) {
          modalBackBtn.addEventListener("click", () => {
            closeEditModalToPreview();
          });
        }

      if (addMenuCloseBtn) {
        addMenuCloseBtn.addEventListener("click", () => {
          closeModal(addMenuModal);
        });
      }
      if (addLinkEntryBtn) {
        addLinkEntryBtn.addEventListener("click", () => {
          closeModal(addMenuModal);
          returnToMode = currentMode;
          editingLinkId = null;
          editingDockPosition = null;
          formTitle.textContent = "添加导航";
          saveBtn.textContent = "保存";
          titleInput.value = "";
          applyUrlToInput("");
          privateInput.checked = false;
          if (dockInput) {
            dockInput.checked = false;
          }
          loadCategories();
          openModal(modal, { returnToSettings: true });
        });
      }

      if (protocolButtons.length) {
        protocolButtons.forEach((btn) => {
          btn.addEventListener("click", () => {
            const proto = btn.dataset.proto || "https://";
            setProtocol(proto);
          });
        });
        setProtocol(currentProtocol);
      }
      if (categorySelectBtn) {
        categorySelectBtn.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (categorySelectMenu) {
            categorySelectMenu.classList.toggle("open");
          }
        });
      }
      if (categorySelectMenu) {
        categorySelectMenu.addEventListener("click", (event) => {
          event.stopPropagation();
        });
      }
      document.addEventListener("click", () => {
        if (categorySelectMenu) {
          categorySelectMenu.classList.remove("open");
        }
      });
      if (dockInput) {
        dockInput.addEventListener("change", () => {
          if (dockInput.checked) {
            if (privateInput) {
              privateInput.disabled = false;
            }
          } else {
            syncPrivateToggleForCategory(categoryInput ? categoryInput.value : "");
          }
        });
      }
      if (manageCategoryEntryBtn) {
        manageCategoryEntryBtn.addEventListener("click", () => {
          closeModal(addMenuModal);
          loadCategories().then((categories) => {
            renderCategoryManager(categories);
          });
            openModal(categoryManagerModal, { returnToSettings: false });
        });
      }
      function handleCreateCategory(event) {
        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }
        const name = newCategoryInput ? newCategoryInput.value.trim() : "";
        if (!name) {
          alert("分类名称不能为空");
          return;
        }
        const isPrivate = Boolean(newCategoryPrivate && newCategoryPrivate.checked);
        fetch("/api/categories", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json; charset=utf-8" },
          body: JSON.stringify({ name, is_private: isPrivate })
        })
          .then((res) => parseCategoryResponse(res, "新增失败"))
          .then((created) => {
            if (newCategoryInput) {
              newCategoryInput.value = "";
            }
            if (newCategoryPrivate) {
              newCategoryPrivate.checked = false;
            }
            return loadCategories(created.name || name);
          })
          .then((updated) => {
            renderCategoryManager(updated);
          })
          .catch((err) => {
            alert(err.message || "新增失败");
          });
      }

      if (createCategoryBtn) {
        createCategoryBtn.addEventListener("click", handleCreateCategory);
      }
      if (categoryManagerModal) {
        categoryManagerModal.addEventListener("click", (event) => {
          const target = event.target;
          if (!target) return;
          if (target.id === "createCategoryBtn" || target.closest("#createCategoryBtn")) {
            handleCreateCategory(event);
          }
          const editButton = target.closest(".category-actions .icon-btn:not(.danger)");
          const deleteButton = target.closest(".category-actions .icon-btn.danger");
          if (editButton || deleteButton) {
            event.preventDefault();
            event.stopPropagation();
            const row = target.closest(".category-row");
            const buttonId = target.closest("button")?.dataset?.id || "";
            const categoryId = buttonId || (row ? row.dataset.categoryId : "");
            const nameEl = row ? row.querySelector(".category-name") : null;
            if (!categoryId || !nameEl) {
              alert("分类信息无效");
              return;
            }
            if (editButton) {
              const nextName = window.prompt("请输入新的分类名称", nameEl.textContent || "");
              if (!nextName) return;
              fetch(`/api/categories/${categoryId}`, {
                method: "PUT",
                credentials: "include",
                headers: { "Content-Type": "application/json; charset=utf-8" },
                body: JSON.stringify({ name: nextName })
              })
                .then((res) => parseCategoryResponse(res, "更新失败"))
                .then((updated) => {
                  nameEl.textContent = updated.name || nextName;
                  loadCategories(updated.name || nextName);
                  applySearch();
                })
                .catch((err) => {
                  alert(err.message || "更新失败");
                });
            }
            if (deleteButton) {
              const confirmDelete = window.confirm(
                "删除分类并删除其链接？点击取消将移动到“未分类”。"
              );
              const mode = confirmDelete ? "delete" : "move";
              fetch(`/api/categories/${categoryId}?mode=${mode}`, {
                method: "DELETE",
                credentials: "include"
              })
                .then((res) => parseCategoryResponse(res, "删除失败"))
                .then(() => {
                  if (row) row.remove();
                  loadCategories();
                  fetchLinks();
                })
                .catch((err) => {
                  alert(err.message || "删除失败");
                });
            }
          }
        });
      }
      if (newCategoryInput) {
        newCategoryInput.addEventListener("keydown", (event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          if (createCategoryBtn) {
            createCategoryBtn.click();
          }
        });
      }
      if (categoryManagerCloseBtn) {
        categoryManagerCloseBtn.addEventListener("click", () => {
          returnToSettings = null;
          closeModal(categoryManagerModal);
          refreshApp();
        });
      }
      if (categoryManagerDoneBtn) {
        categoryManagerDoneBtn.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          returnToSettings = null;
          closeModal(categoryManagerModal);
          refreshApp();
        });
      }

      if (settingsBtn) {
        try {
          settingsBtn.addEventListener("click", () => {
            openModal(settingsModal);
          });
        } catch (err) {}
      }

      if (todayVisitorBadge) {
        todayVisitorBadge.addEventListener("click", () => {
          if (!loggedIn || isVisitorMode) return;
          openModal(visitorModal);
          fetchTodayVisitorDetails();
        });
      }

      if (settingsCloseBtn) {
        settingsCloseBtn.addEventListener("click", () => {
          closeModal(settingsModal);
        });
      }

      if (settingsBackdrop) {
        settingsBackdrop.addEventListener("click", () => {
          closeModal(settingsModal);
        });
      }

      if (visitorCloseBtn) {
        visitorCloseBtn.addEventListener("click", () => {
          closeModal(visitorModal);
        });
      }

      if (visitorBackdrop) {
        visitorBackdrop.addEventListener("click", () => {
          closeModal(visitorModal);
        });
      }

      document.addEventListener("contextmenu", (event) => {
        const target = event.target;
        if (!target) return;
        if (currentMode === "sort") {
          event.preventDefault();
          return;
        }
        if (document.body.classList.contains("is-editing") || sortUnlocked) {
          return;
        }
        if (target.closest("input, textarea")) return;
        if (target.closest(".header-logo, .category-card, .dock-container")) {
          event.preventDefault();
        }
      });

        document.addEventListener("dragstart", (event) => {
          if (currentMode === "sort" || sortUnlocked) {
            return;
          }
          if (window.isEditing) {
            return;
          }
          const target = event.target;
          if (target && target.closest(".app, .icon, .icon-item")) {
            event.preventDefault();
            return;
          }
          event.preventDefault();
        });

      if (settingsSaveBtn) {
        settingsSaveBtn.addEventListener("click", () => {
          const payload = {
            siteName: siteNameInput.value.trim()
          };
          if (iconSizeInput) {
            payload.iconScale = iconSizeInput.value;
          }
          if (frostBlurInput) {
            payload.frostBlur = frostBlurInput.value;
          }
          if (brightnessSettingInput) {
            payload.pageBrightness = brightnessSettingInput.value;
          } else if (brightnessInput) {
            payload.pageBrightness = brightnessInput.value;
          }
          if (lowPowerToggle) {
            payload.lowPowerMode = lowPowerToggle.checked;
          }
          if (quickBrightnessToggle) {
            payload.quickBrightness = quickBrightnessToggle.checked;
          }
          if (compactHeaderToggle) {
            payload.compactHeader = compactHeaderToggle.checked;
          }
          if (userTotpToggle) {
            payload.userTotpEnabled = userTotpToggle.checked;
          }
          saveAppearanceSettings(payload);
        });
      }
      if (bulkDeleteBtn) {
        bulkDeleteBtn.addEventListener("click", bulkDeleteSelected);
      }
      if (bulkMoveBtn) {
        bulkMoveBtn.addEventListener("click", bulkMoveSelected);
      }

      if (saveLayoutA) {
        saveLayoutA.addEventListener("click", () => saveLayoutPreset("layoutPresetA"));
      }
      if (saveLayoutB) {
        saveLayoutB.addEventListener("click", () => saveLayoutPreset("layoutPresetB"));
      }
      if (applyLayoutA) {
        applyLayoutA.addEventListener("click", () => applyLayoutPreset("layoutPresetA"));
      }
      if (applyLayoutB) {
        applyLayoutB.addEventListener("click", () => applyLayoutPreset("layoutPresetB"));
      }

      if (siteNameInput) {
        siteNameInput.addEventListener("change", () => {
          queueAppearanceSave({ siteName: siteNameInput.value.trim() });
        });
      }


      if (logoInput) {
        logoInput.addEventListener("change", () => {
          if (!logoInput.files || !logoInput.files[0]) return;
          const formData = new FormData();
          formData.append("logo", logoInput.files[0]);
          fetch("/api/settings/logo", { method: "POST", body: formData })
            .then((res) => res.json())
            .then((data) => {
              applySiteLogo(data && data.path ? data.path : "");
              showToast("保存成功");
            })
            .catch(() => {});
        });
      }

      if (fontSizeInput) {
        fontSizeInput.addEventListener("input", () => {
          applyFontSettings();
          queueAppearanceSave({});
        });
      }

      if (boldToggle) {
        boldToggle.addEventListener("change", () => {
          applyFontSettings();
          queueAppearanceSave({});
        });
      }

      if (iconSizeInput) {
        iconSizeInput.addEventListener("input", () => {
          applyIconScale(iconSizeInput.value);
          queueAppearanceSave({ iconScale: iconSizeInput.value });
        });
      }
      if (frostBlurInput) {
        frostBlurInput.addEventListener("input", () => {
          applyFrostBlur(frostBlurInput.value);
          queueAppearanceSave({ frostBlur: frostBlurInput.value });
        });
      }
      if (brightnessSettingInput) {
        brightnessSettingInput.addEventListener("input", () => {
          if (brightnessInput) {
            brightnessInput.value = brightnessSettingInput.value;
          }
          applyBrightness(brightnessSettingInput.value);
          queueAppearanceSave({ pageBrightness: brightnessSettingInput.value });
        });
      }
      if (brightnessInput) {
        brightnessInput.addEventListener("input", () => {
          applyBrightness(brightnessInput.value);
          queueAppearanceSave({ pageBrightness: brightnessInput.value });
          if (brightnessSettingInput) {
            brightnessSettingInput.value = brightnessInput.value;
          }
        });
      }
      if (lowPowerToggle) {
        lowPowerToggle.addEventListener("change", () => {
          applyLowPower(lowPowerToggle.checked);
          queueAppearanceSave({ lowPowerMode: lowPowerToggle.checked });
        });
      }
      if (quickBrightnessToggle) {
        quickBrightnessToggle.addEventListener("change", () => {
          applyQuickBrightness(quickBrightnessToggle.checked);
          queueAppearanceSave({ quickBrightness: quickBrightnessToggle.checked });
        });
      }
      if (compactHeaderToggle) {
        compactHeaderToggle.addEventListener("change", () => {
          applyCompactHeader(compactHeaderToggle.checked);
          queueAppearanceSave({ compactHeader: compactHeaderToggle.checked });
        });
      }

      if (editDoneBtn) {
        editDoneBtn.addEventListener("click", () => {
          setActiveMode("preview");
          if (settingsModal) {
            openModal(settingsModal);
          }
        });
      }

      if (sortLockBtn) {
        sortLockBtn.addEventListener("click", () => {
          if (currentMode !== "preview") {
            setActiveMode("preview");
            if (modeControl) {
              modeControl.classList.remove("open");
            }
            return;
          }
          if (modeControl) {
            const willOpen = !modeControl.classList.contains("open");
            if (willOpen) {
              modeControl.classList.add("open");
            } else {
              modeControl.classList.remove("open");
              setActiveMode("preview");
            }
          }
        });
      }

      if (modeButtons.length) {
        modeButtons.forEach((btn) => {
          btn.addEventListener("click", () => {
            setActiveMode(btn.dataset.mode);
            if (modeControl) {
              modeControl.classList.remove("open");
            }
          });
        });
      }

      if (viewToggleBtn) {
        viewToggleBtn.addEventListener("click", () => {
          if (window.innerWidth < 768) {
            return;
          }
          const next = viewMode === "card" ? "list" : "card";
          applyViewMode(next);
          renderLinks(allLinks);
          renderDockLinks(allLinks);
        });
      }

      setActiveMode("preview");
      applyViewMode(viewMode);
      window.addEventListener("resize", () => {
        const preferred = localStorage.getItem("viewMode") || "card";
        applyViewMode(preferred);
        if (viewMode === "card") {
          applyCategoryFreeLayout();
        }
      });
      updateMobileLongPressLock();

      linkForm.addEventListener("submit", (event) => {
        event.preventDefault();
        if (dockInput && dockInput.checked) {
          const existing = allLinks.find((item) => String(item.id) === String(editingLinkId));
          const alreadyDock = existing && existing.is_dock;
          if (!alreadyDock && getDockCountLive() >= dockLimit) {
            showToast("快捷栏已满（限6个图标），请先移除多余项。");
            return;
          }
        }
        let positionIndex = null;
        if (dockInput && dockInput.checked) {
          if (editingDockPosition !== null && !Number.isNaN(editingDockPosition)) {
            positionIndex = editingDockPosition;
          } else {
            positionIndex = getFirstEmptyDockSlot();
          }
          if (positionIndex === null) {
            showToast("快捷栏已满（限6个图标），请先移除多余项。");
            return;
          }
        }
        const selectedCategory = dockInput && dockInput.checked ? "" : categoryInput.value.trim();
        const categoryInfo = selectedCategory ? getCategoryByName(selectedCategory) : null;
        const enforcedPrivate = categoryInfo && categoryInfo.is_private;
        const payload = {
          title: titleInput.value.trim(),
          url: buildFullUrl(),
          tags: tagsInput ? tagsInput.value.trim() : "",
          category: selectedCategory,
          is_private: enforcedPrivate ? 1 : privateInput.checked ? 1 : 0,
          is_dock: dockInput && dockInput.checked,
          position_index: positionIndex
        };
        const targetUrl = editingLinkId ? `/api/links/${editingLinkId}` : "/api/links";
        const method = editingLinkId ? "PUT" : "POST";
          fetch(targetUrl, {
            method,
            headers: { "Content-Type": "application/json; charset=utf-8" },
            credentials: "same-origin",
            body: JSON.stringify(payload)
          })
            .then((res) => {
              if (!res.ok) throw new Error("Failed to save");
              closeEditModalToPreview();
              return fetchLinks();
            })
            .catch(() => {});
        });

      if (exportBtn) {
        exportBtn.addEventListener("click", () => {
          fetch("/api/backup/export")
            .then((res) => res.blob())
            .then((blob) => {
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "mynav-backup.json";
              document.body.appendChild(a);
              a.click();
              a.remove();
              URL.revokeObjectURL(url);
            })
            .catch(() => {});
        });
      }

      if (importBtn) {
        importBtn.addEventListener("click", () => {
          if (!importFile || !importFile.files || !importFile.files[0]) return;
          const formData = new FormData();
          formData.append("backup", importFile.files[0]);
          fetch("/api/backup/import", {
            method: "POST",
            body: formData
          })
            .then((res) => {
              if (!res.ok) {
                throw new Error("Import failed");
              }
              return res.json();
            })
            .then(() => {
              importFile.value = "";
              fetchLinks();
            })
            .catch(() => {});
        });
      }

      function loadSettings(viewUser) {
        const url = viewUser
          ? `/api/settings?user=${encodeURIComponent(viewUser)}`
          : "/api/settings";
        return fetch(url)
          .then((res) => {
            if (!res.ok) {
              throw new Error("settings");
            }
            return res.json();
          })
          .then((data) => {
            if (data && data.siteName) {
              siteTitle.textContent = data.siteName;
              siteNameInput.value = data.siteName;
              document.title = data.siteName;
            }
            if (data && data.siteLogo !== undefined) {
              applySiteLogo(data.siteLogo || "");
            }
            if (data && data.iconScale !== undefined) {
              const value = Math.max(0, Math.min(100, Number(data.iconScale)));
              if (iconSizeInput) {
                iconSizeInput.value = Number.isNaN(value) ? 100 : String(value);
              }
              applyIconScale(Number.isNaN(value) ? 100 : value);
            }
            if (data && data.frostBlur !== undefined) {
              const value = Math.max(0, Math.min(100, Number(data.frostBlur)));
              const safeValue = Number.isNaN(value) ? 50 : value;
              if (frostBlurInput) {
                frostBlurInput.value = String(safeValue);
              }
              applyFrostBlur(safeValue);
            }
            if (data && data.pageBrightness !== undefined) {
              const value = Math.max(0, Math.min(100, Number(data.pageBrightness)));
              const safeValue = Number.isNaN(value) ? 60 : value;
              if (brightnessInput) {
                brightnessInput.value = String(safeValue);
              }
              if (brightnessSettingInput) {
                brightnessSettingInput.value = String(safeValue);
              }
              applyBrightness(safeValue);
            }
            if (data && data.lowPowerMode !== undefined && lowPowerToggle) {
              lowPowerToggle.checked = Boolean(data.lowPowerMode);
              applyLowPower(lowPowerToggle.checked);
            }
            if (data && data.quickBrightness !== undefined && quickBrightnessToggle) {
              quickBrightnessToggle.checked = Boolean(data.quickBrightness);
              applyQuickBrightness(quickBrightnessToggle.checked);
            }
            if (data && data.compactHeader !== undefined && compactHeaderToggle) {
              compactHeaderToggle.checked = Boolean(data.compactHeader);
              applyCompactHeader(compactHeaderToggle.checked);
            }
            if (data && data.userTotpEnabled !== undefined && userTotpToggle) {
              userTotpToggle.checked = Boolean(data.userTotpEnabled);
            }
            if (data && data.registerOpenUntil !== undefined) {
              registerOpenUntil = data.registerOpenUntil || null;
            }
            return data;
          })
          .catch(() => {});
      }

      if (isVisitorMode) {
        setLoginState(false, { skipFetch: true });
        applyVisitorModeUI();
        loadSettings(publicUsername);
        fetchLinks();
        trackVisitorEvent("visit");
      } else {
        fetch("/api/me", { credentials: "include", cache: "no-store" })
          .then((res) => res.json())
          .then((data) => {
            const logged = Boolean(data && data.loggedIn);
            isAdmin = Boolean(data && data.isAdmin);
            if (!logged) {
              window.location.href = "/login.html";
              return;
            }
            setLoginState(logged);
            if (data && data.userName) {
              try {
                localStorage.setItem("lastUsername", data.userName);
              } catch (err) {}
            }
            currentUsername = data.username || "";
            applyUserProfile(data.userName || "Admin", data.userAvatar || "");
            if (data && data.error === "blocked") {
              showToast(data.message || "\u4f60\u7684\u8bbf\u95ee\u5df2\u88ab\u9650\u5236\uff0c\u8bf7\u8054\u7cfb\u7ba1\u7406\u5458");
            }
            loadSettings("");
          })
          .catch(() => {
            window.location.href = "/login.html";
          });
      }
      applyFontSettings();
      initMobilePosition();
      initDockFisheye();
      initCategoryFisheye();
      });
