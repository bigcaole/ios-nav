const loginCard = document.getElementById("loginCard");
      const totpCard = document.getElementById("totpCard");
      const panelCard = document.getElementById("panelCard");
      const loginBtn = document.getElementById("loginBtn");
      const logoutBtn = document.getElementById("logoutBtn");
      const adminName = document.getElementById("adminName");
      const loginUsername = document.getElementById("loginUsername");
      const loginPassword = document.getElementById("loginPassword");
      const loginTotp = document.getElementById("loginTotp");
      const totpField = document.getElementById("totpField");
      const totpSecret = document.getElementById("totpSecret");
      const totpQr = document.getElementById("totpQr");
      const totpCode = document.getElementById("totpCode");
      const totpConfirmBtn = document.getElementById("totpConfirmBtn");
      const toastContainer = document.getElementById("toastContainer");
      const adminNav = document.getElementById("adminNav");

      let adminLogPage = 1;
      let adminLogPages = 1;
      let loginLogPage = 1;
      let loginLogPages = 1;

      function showToast(message, type = "success") {
        const toast = document.createElement("div");
        toast.className = `toast ${type === "error" ? "error" : "success"}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.remove(), 2400);
      }

      function showSection(key) {
        document.querySelectorAll(".admin-section").forEach((section) => {
          section.classList.toggle("hidden", section.id !== `section-${key}`);
        });
        adminNav.querySelectorAll("button[data-section]").forEach((btn) => {
          btn.classList.toggle("active", btn.dataset.section === key);
        });
      }

      function apiFetch(url, options = {}) {
        return fetch(url, {
          credentials: "same-origin",
          headers: { "Content-Type": "application/json", ...(options.headers || {}) },
          ...options
        });
      }

      async function checkAdminLogin() {
        const res = await apiFetch("/api/admin/me");
        const data = await res.json();
        if (data.loggedIn) {
          adminName.textContent = data.username || "管理员";
          loginCard.classList.add("hidden");
          totpCard.classList.add("hidden");
          panelCard.classList.remove("hidden");
          showSection("home");
          await loadAll();
        } else {
          loginCard.classList.remove("hidden");
          panelCard.classList.add("hidden");
        }
      }

      async function handleLogin() {
        const payload = {
          username: loginUsername.value.trim(),
          password: loginPassword.value,
          totp: loginTotp.value.trim()
        };
        const res = await apiFetch("/api/admin/login", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          showToast("登录成功");
          await checkAdminLogin();
          return;
        }
        if (data.totpRequired) {
          totpField.classList.remove("hidden");
          showToast("请输入二次验证码", "error");
          return;
        }
        if (data.setupRequired) {
          loginCard.classList.add("hidden");
          totpCard.classList.remove("hidden");
          totpSecret.textContent = data.secret || "";
          totpQr.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
            data.otpauth || ""
          )}" alt="QR" />`;
          return;
        }
        showToast(data.error || "登录失败", "error");
      }

      async function handleTotpSetup() {
        const code = totpCode.value.trim();
        const res = await apiFetch("/api/admin/totp/setup", {
          method: "POST",
          body: JSON.stringify({ code })
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          showToast("绑定成功");
          await checkAdminLogin();
          return;
        }
        showToast(data.error || "绑定失败", "error");
      }

      async function handleLogout() {
        await apiFetch("/api/admin/logout", { method: "POST" });
        loginCard.classList.remove("hidden");
        panelCard.classList.add("hidden");
      }

      async function loadRegisterWindow() {
        const res = await apiFetch("/api/admin/register-window");
        const data = await res.json();
        document.getElementById("registerStatus").textContent = data.open
          ? `已开放，截止 ${data.until || "-"}`
          : "未开放";
      }

      async function openRegister(open) {
        const hours = Number(document.getElementById("registerHours").value || 12);
        const res = await apiFetch("/api/admin/register-window", {
          method: "POST",
          body: JSON.stringify({ open, hours })
        });
        if (res.ok) {
          showToast("已更新");
          loadRegisterWindow();
        } else {
          showToast("更新失败", "error");
        }
      }

      async function loadInvites() {
        const res = await apiFetch("/api/admin/invites");
        const data = await res.json();
        const list = document.getElementById("inviteList");
        list.innerHTML = "";
        data.forEach((item) => {
          const row = document.createElement("div");
          row.className = "list-item";
          row.innerHTML = `<span>${item.code}</span><span class="text-xs text-slate-500">有效期至 ${item.expires_at}</span>`;
          list.appendChild(row);
        });
      }

      async function generateInvites() {
        const count = Number(document.getElementById("inviteCount").value || 1);
        const expiresHours = Number(document.getElementById("inviteHours").value || 12);
        const res = await apiFetch("/api/admin/invites", {
          method: "POST",
          body: JSON.stringify({ count, expiresHours })
        });
        if (res.ok) {
          showToast("生成成功");
          loadInvites();
        } else {
          showToast("生成失败", "error");
        }
      }

      async function loadUsers() {
        const res = await apiFetch("/api/admin/users");
        const users = await res.json();
        const list = document.getElementById("userList");
        list.innerHTML = "";
        users.forEach((user) => {
          const row = document.createElement("div");
          row.className = "list-item";
          row.innerHTML = `
            <div>
              <div class="font-semibold">${user.username}</div>
              <div class="text-xs text-slate-500">2FA: ${user.totp_enabled ? "On" : "Off"}</div>
            </div>
            <div class="flex gap-2 flex-wrap justify-end">
              <button class="btn btn-ghost user-action" data-action="toggle" data-id="${user.id}" data-active="${user.is_active}">
                ${user.is_active ? "禁用" : "启用"}
              </button>
              <button class="btn btn-ghost user-action" data-action="reset" data-id="${user.id}">重置密码</button>
              <button class="btn btn-ghost user-action" data-action="clear2fa" data-id="${user.id}">清除2FA</button>
              <button class="btn btn-ghost user-action" data-action="delete" data-id="${user.id}">删除</button>
            </div>
          `;
          list.appendChild(row);
        });
      }

      async function handleUserAction(id, action, active) {
        let endpoint = "";
        if (action === "toggle") {
          endpoint = active === "true" ? `/api/admin/users/${id}/disable` : `/api/admin/users/${id}/enable`;
        } else if (action === "reset") {
          endpoint = `/api/admin/users/${id}/reset-password`;
        } else if (action === "clear2fa") {
          endpoint = `/api/admin/users/${id}/clear-2fa`;
        } else if (action === "delete") {
          endpoint = `/api/admin/users/${id}`;
        }
        const res = await apiFetch(endpoint, { method: action === "delete" ? "DELETE" : "POST" });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          if (action === "reset" && data.password) {
            alert(`新密码：${data.password}`);
            showToast("已重置并显示新密码");
          } else {
            showToast("操作成功");
          }
          await loadUsers();
          if (action === "reset") {
            await loadAdminLogs();
          }
        } else {
          showToast(data.error || "操作失败", "error");
        }
      }

      function renderContactUsers(users) {
        const select = document.getElementById("contactUserSelect");
        if (!select) return;
        select.innerHTML = `<option value="">选择用户</option>`;
        users.forEach((user) => {
          const opt = document.createElement("option");
          opt.value = user.id;
          opt.textContent = user.username;
          select.appendChild(opt);
        });
      }

      function createContactRow(platform = "Telegram", value = "") {
        const row = document.createElement("div");
        row.className = "flex items-center gap-3 flex-wrap";
        row.innerHTML = `
          <select class="field w-40 contact-platform">
            <option value="Telegram">Telegram</option>
            <option value="Email">邮箱</option>
            <option value="QQ">QQ</option>
            <option value="Line">Line</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Discord">Discord</option>
            <option value="WeChat">微信</option>
          </select>
          <input class="field flex-1 contact-value" placeholder="联系方式" />
          <button class="btn btn-ghost contact-remove">移除</button>
        `;
        row.querySelector(".contact-platform").value = platform;
        row.querySelector(".contact-value").value = value;
        row.querySelector(".contact-remove").addEventListener("click", () => row.remove());
        return row;
      }

      async function loadContact() {
        const userId = document.getElementById("contactUserSelect").value;
        const res = await apiFetch(`/api/admin/contact/${userId || "all"}`);
        const data = await res.json();
        document.getElementById("contactEnabled").checked = Boolean(data.enabled);
        document.getElementById("contactApplyAll").checked = Boolean(data.applyAll);
        const list = document.getElementById("contactList");
        list.innerHTML = "";
        (data.items || []).forEach((item) => {
          list.appendChild(createContactRow(item.platform, item.value));
        });
      }

      async function saveContact() {
        const applyAll = document.getElementById("contactApplyAll").checked;
        const enabled = document.getElementById("contactEnabled").checked;
        const userId = document.getElementById("contactUserSelect").value;
        const items = Array.from(document.querySelectorAll("#contactList .contact-platform")).map((el, idx) => {
          const value = document.querySelectorAll("#contactList .contact-value")[idx].value.trim();
          return { platform: el.value, value };
        }).filter((item) => item.value);
        const res = await apiFetch("/api/admin/contact", {
          method: "POST",
          body: JSON.stringify({ userId, applyAll, enabled, items })
        });
        if (res.ok) {
          showToast("保存成功");
        } else {
          showToast("保存失败", "error");
        }
      }

      async function loadBlacklist() {
        const res = await apiFetch("/api/admin/blacklist");
        const data = await res.json();
        const list = document.getElementById("blacklistList");
        list.innerHTML = "";
        data.forEach((item) => {
          const row = document.createElement("div");
          row.className = "list-item";
          row.innerHTML = `
            <div>
              <div class="font-semibold">${item.type} - ${item.value}</div>
              <div class="text-xs text-slate-500">${item.reason || "无备注"} / ${item.expires_at || "永久"}</div>
            </div>
            <button class="btn btn-ghost remove-blacklist" data-id="${item.id}">移除</button>
          `;
          list.appendChild(row);
        });
      }

      async function addBlacklist() {
        const type = document.getElementById("blacklistType").value;
        const value = document.getElementById("blacklistValue").value.trim();
        const hours = Number(document.getElementById("blacklistHours").value || 24);
        const reason = document.getElementById("blacklistReason").value.trim();
        const res = await apiFetch("/api/admin/blacklist", {
          method: "POST",
          body: JSON.stringify({ type, value, hours, reason })
        });
        if (res.ok) {
          showToast("已加入黑名单");
          loadBlacklist();
        } else {
          showToast("操作失败", "error");
        }
      }

      async function loadSecurityPolicy() {
        const res = await apiFetch("/api/admin/security-policy");
        const data = await res.json();
        document.getElementById("policyFailThreshold").value = data.loginFailThreshold || 5;
        document.getElementById("policyBlockMinutes").value = data.autoBlockMinutes || 10;
        document.getElementById("policyAutoCleanup").checked = Boolean(data.loginLogAutoCleanup);
        document.getElementById("policyCleanupDay").value = data.loginLogCleanupDay || 28;
      }

      async function saveSecurityPolicy() {
        const payload = {
          loginFailThreshold: Number(document.getElementById("policyFailThreshold").value || 5),
          autoBlockMinutes: Number(document.getElementById("policyBlockMinutes").value || 10),
          loginLogAutoCleanup: document.getElementById("policyAutoCleanup").checked,
          loginLogCleanupDay: Number(document.getElementById("policyCleanupDay").value || 28)
        };
        const res = await apiFetch("/api/admin/security-policy", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          showToast("保存成功");
        } else {
          showToast("保存失败", "error");
        }
      }

      async function exportBackup() {
        const res = await apiFetch("/api/admin/backup/export-all");
        if (!res.ok) {
          showToast("导出失败", "error");
          return;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "backup.json";
        a.click();
        URL.revokeObjectURL(url);
      }

      async function importBackup() {
        const file = document.getElementById("importBackupFile").files[0];
        if (!file) return showToast("请选择文件", "error");
        const formData = new FormData();
        formData.append("backup", file);
        const res = await fetch("/api/admin/backup/import-all", {
          method: "POST",
          body: formData,
          credentials: "same-origin"
        });
        if (res.ok) {
          showToast("导入成功");
        } else {
          showToast("导入失败", "error");
        }
      }

      function formatDateTime(value) {
        if (!value) return "";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleString("zh-CN", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        });
      }

      async function loadAdminLogs() {
        const res = await apiFetch(`/api/admin/logs?page=${adminLogPage}`);
        const data = await res.json();
        adminLogPages = data.totalPages || 1;
        const list = document.getElementById("adminLogList");
        list.innerHTML = "";
        (data.logs || []).forEach((log) => {
          const row = document.createElement("div");
          row.className = "list-item";
          const detail = log.detail ? JSON.stringify(log.detail) : "";
          row.innerHTML = `<div>
            <div class="font-semibold">${log.action}</div>
            <div class="text-xs text-slate-500">${formatDateTime(log.created_at)}</div>
            ${detail ? `<div class="text-xs text-slate-500 mt-1">${detail}</div>` : ""}
          </div>`;
          list.appendChild(row);
        });
      }

      async function loadLoginLogs() {
        const res = await apiFetch(`/api/admin/user-logins?page=${loginLogPage}`);
        const data = await res.json();
        loginLogPages = data.totalPages || 1;
        const list = document.getElementById("loginLogList");
        list.innerHTML = "";
        (data.logs || []).forEach((log) => {
          const row = document.createElement("div");
          row.className = "list-item";
          row.innerHTML = `<div>
            <div class="font-semibold">${log.username || "未知用户"} - ${log.action}</div>
            <div class="text-xs text-slate-500">${formatDateTime(log.created_at)}</div>
          </div>`;
          list.appendChild(row);
        });
      }

      async function saveAdminCredentials() {
        const payload = {
          currentUsername: document.getElementById("currentAdminUsername").value.trim(),
          currentPassword: document.getElementById("currentAdminPassword").value,
          newUsername: document.getElementById("newAdminUsername").value.trim(),
          newPassword: document.getElementById("newAdminPassword").value,
          confirmPassword: document.getElementById("confirmAdminPassword").value
        };
        const res = await apiFetch("/api/admin/credentials", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.ok) {
          showToast("保存成功");
        } else {
          showToast(data.error || "保存失败", "error");
        }
      }

      async function loadAll() {
        await Promise.all([
          loadRegisterWindow(),
          loadInvites(),
          loadUsers(),
          loadBlacklist(),
          loadSecurityPolicy(),
          loadLoginLogs(),
          loadAdminLogs()
        ]);
      }

      loginBtn.addEventListener("click", handleLogin);
      totpConfirmBtn.addEventListener("click", handleTotpSetup);
      logoutBtn.addEventListener("click", handleLogout);
      document.getElementById("openRegisterBtn").addEventListener("click", () => openRegister(true));
      document.getElementById("closeRegisterBtn").addEventListener("click", () => openRegister(false));
      document.getElementById("generateInviteBtn").addEventListener("click", generateInvites);
      document.getElementById("addBlacklistBtn").addEventListener("click", addBlacklist);
      document.getElementById("savePolicyBtn").addEventListener("click", saveSecurityPolicy);
      document.getElementById("exportBackupBtn").addEventListener("click", exportBackup);
      document.getElementById("importBackupBtn").addEventListener("click", importBackup);
      document.getElementById("saveAdminCredentialsBtn").addEventListener("click", saveAdminCredentials);

      const addContactItemBtn = document.getElementById("addContactItemBtn");
      if (addContactItemBtn) {
        addContactItemBtn.addEventListener("click", () => {
          const contactList = document.getElementById("contactList");
          if (contactList) contactList.appendChild(createContactRow());
        });
      }
      const saveContactBtn = document.getElementById("saveContactBtn");
      if (saveContactBtn) saveContactBtn.addEventListener("click", saveContact);
      const contactUserSelect = document.getElementById("contactUserSelect");
      if (contactUserSelect) contactUserSelect.addEventListener("change", loadContact);

      document.getElementById("adminLogPrev").addEventListener("click", () => {
        adminLogPage = Math.max(1, adminLogPage - 1);
        loadAdminLogs();
      });
      document.getElementById("adminLogNext").addEventListener("click", () => {
        adminLogPage = Math.min(adminLogPages, adminLogPage + 1);
        loadAdminLogs();
      });
      document.getElementById("loginLogPrev").addEventListener("click", () => {
        loginLogPage = Math.max(1, loginLogPage - 1);
        loadLoginLogs();
      });
      document.getElementById("loginLogNext").addEventListener("click", () => {
        loginLogPage = Math.min(loginLogPages, loginLogPage + 1);
        loadLoginLogs();
      });

      document.getElementById("userList").addEventListener("click", (e) => {
        const target = e.target.closest(".user-action");
        if (!target) return;
        const id = target.dataset.id;
        const action = target.dataset.action;
        const active = target.dataset.active;
        handleUserAction(id, action, active);
      });

      document.getElementById("blacklistList").addEventListener("click", async (e) => {
        const btn = e.target.closest(".remove-blacklist");
        if (!btn) return;
        const res = await apiFetch(`/api/admin/blacklist/${btn.dataset.id}`, { method: "DELETE" });
        if (res.ok) {
          showToast("已移除");
          loadBlacklist();
        } else {
          showToast("操作失败", "error");
        }
      });

      adminNav.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-section]");
        if (!btn) return;
        showSection(btn.dataset.section);
      });

      checkAdminLogin();
