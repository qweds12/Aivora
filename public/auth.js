(async () => {
  "use strict";

  // =========================================================
  // AIVORA AI - STAGE 2 AUTH
  // Supabase Authentication + Profile + Credits + Projects
  // =========================================================

  let client = null;
  let session = null;
  let authReady = false;

  // ---------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------

  const getJSON = async (url, options = {}) => {
    try {
      const response = await fetch(url, options);
      const data = await response.json().catch(() => null);

      return {
        response,
        data
      };
    } catch (error) {
      return {
        response: null,
        data: null,
        error
      };
    }
  };

  // ---------------------------------------------------------
  // Load configuration from server
  // ---------------------------------------------------------

  const configResult = await getJSON("/api/config");

  const cfg = configResult.data;

  if (
    !cfg ||
    !cfg.authEnabled ||
    !cfg.supabaseUrl ||
    !cfg.supabaseKey
  ) {
    console.warn("Aivora Auth: Supabase authentication is disabled.");
    return;
  }

  // ---------------------------------------------------------
  // Load Supabase JS
  // ---------------------------------------------------------

  const loadSupabase = () =>
    new Promise((resolve, reject) => {
      if (window.supabase?.createClient) {
        resolve();
        return;
      }

      const script = document.createElement("script");

      script.src =
        "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

      script.async = true;

      script.onload = resolve;

      script.onerror = () =>
        reject(new Error("تعذر تحميل Supabase"));

      document.head.appendChild(script);
    });

  try {
    await loadSupabase();
  } catch (error) {
    console.error(error);
    return;
  }

  // ---------------------------------------------------------
  // Create Supabase client
  // ---------------------------------------------------------

  try {
    client = window.supabase.createClient(
      cfg.supabaseUrl,
      cfg.supabaseKey
    );

    authReady = true;
  } catch (error) {
    console.error(
      "Aivora Auth: Failed to create Supabase client.",
      error
    );

    return;
  }

  // ---------------------------------------------------------
  // Styles
  // ---------------------------------------------------------

  const style = document.createElement("style");

  style.textContent = `
    #aivora-authbar {
      display:flex;
      gap:8px;
      align-items:center;
      justify-content:center;
      flex-wrap:wrap;
      margin:0 0 14px;
      padding:6px 10px;
      direction:rtl;
    }

    #aivora-authbar button {
      border:1px solid rgba(255,255,255,.12);
      border-radius:999px;
      padding:9px 15px;
      background:#24324a;
      color:#e2e8f0;
      cursor:pointer;
      font-size:13px;
    }

    #aivora-authbar button:hover {
      opacity:.9;
    }

    #aivora-authbar .a-primary {
      background:linear-gradient(
        135deg,
        #38bdf8,
        #0ea5e9
      );
      color:#062033;
      font-weight:800;
    }

    #aivora-authbar .a-credits {
      color:#bbf7d0;
      font-size:13px;
      font-weight:700;
    }

    #aivora-authbar .a-email {
      color:#9aa8bf;
      font-size:13px;
      direction:ltr;
    }

    #aivora-auth-modal {
      position:fixed;
      inset:0;
      background:rgba(2,6,23,.84);
      display:none;
      align-items:center;
      justify-content:center;
      padding:18px;
      z-index:99999;
      direction:rtl;
    }

    #aivora-auth-modal.show {
      display:flex;
    }

    .a-modal {
      width:min(430px,100%);
      background:#172238;
      border:1px solid rgba(255,255,255,.1);
      border-radius:24px;
      padding:22px;
      box-shadow:0 25px 80px rgba(0,0,0,.45);
    }

    .a-modal h2 {
      margin:0 0 14px;
      color:#e0f2fe;
      text-align:center;
    }

    .a-modal input {
      width:100%;
      box-sizing:border-box;
      margin:7px 0;
      padding:13px;
      border-radius:12px;
      border:1px solid rgba(255,255,255,.1);
      background:#111a2e;
      color:#fff;
      outline:none;
    }

    .a-modal input:focus {
      border-color:#38bdf8;
    }

    .a-modal button {
      width:100%;
      margin-top:9px;
      padding:12px;
      border-radius:12px;
      border:0;
      background:#38bdf8;
      color:#062033;
      font-weight:800;
      cursor:pointer;
    }

    .a-modal button:disabled {
      opacity:.6;
      cursor:not-allowed;
    }

    .a-modal .a-close {
      background:#24324a;
      color:#fff;
    }

    .a-msg {
      min-height:22px;
      color:#9aa8bf;
      font-size:13px;
      margin-top:10px;
      text-align:center;
      line-height:1.6;
    }

    #aivora-projects-modal {
      position:fixed;
      inset:0;
      background:rgba(2,6,23,.84);
      display:none;
      align-items:center;
      justify-content:center;
      padding:18px;
      z-index:99998;
      direction:rtl;
    }

    #aivora-projects-modal.show {
      display:flex;
    }

    .a-projects-box {
      width:min(600px,100%);
      max-height:80vh;
      overflow:auto;
      background:#172238;
      border:1px solid rgba(255,255,255,.1);
      border-radius:24px;
      padding:20px;
      box-shadow:0 25px 80px rgba(0,0,0,.45);
    }

    .a-projects-box h2 {
      margin:0 0 15px;
      color:#e0f2fe;
      text-align:center;
    }

    .a-project {
      background:#111a2e;
      border:1px solid rgba(255,255,255,.08);
      border-radius:14px;
      padding:12px;
      margin:8px 0;
    }

    .a-project-title {
      color:#e0f2fe;
      font-weight:700;
      margin-bottom:5px;
    }

    .a-project-date {
      color:#94a3b8;
      font-size:12px;
    }

    .a-project-tool {
      color:#7dd3fc;
      font-size:12px;
      margin-top:5px;
    }

    .a-project-close {
      width:100%;
      margin-top:12px;
      padding:12px;
      border:0;
      border-radius:12px;
      background:#24324a;
      color:#fff;
      cursor:pointer;
    }
  `;

  document.head.appendChild(style);

  // ---------------------------------------------------------
  // Auth Bar
  // ---------------------------------------------------------

  const bar = document.createElement("div");

  bar.id = "aivora-authbar";

  document.body.prepend(bar);

  // ---------------------------------------------------------
  // Login / Signup Modal
  // ---------------------------------------------------------

  const modal = document.createElement("div");

  modal.id = "aivora-auth-modal";

  modal.innerHTML = `
    <div class="a-modal">

      <h2>حساب Aivora AI</h2>

      <input
        id="a-email"
        type="email"
        placeholder="البريد الإلكتروني"
        autocomplete="email"
      >

      <input
        id="a-password"
        type="password"
        placeholder="كلمة المرور"
        autocomplete="current-password"
      >

      <input
        id="a-name"
        type="text"
        placeholder="الاسم — للتسجيل فقط"
        autocomplete="name"
      >

      <button id="a-login">
        تسجيل الدخول
      </button>

      <button id="a-signup">
        إنشاء حساب جديد
      </button>

      <button
        class="a-close"
        id="a-close"
      >
        إغلاق
      </button>

      <div
        class="a-msg"
        id="a-msg"
      ></div>

    </div>
  `;

  document.body.appendChild(modal);

  // ---------------------------------------------------------
  // Projects Modal
  // ---------------------------------------------------------

  const projectsModal = document.createElement("div");

  projectsModal.id = "aivora-projects-modal";

  projectsModal.innerHTML = `
    <div class="a-projects-box">

      <h2>مشاريعي</h2>

      <div id="a-projects-list">
        جاري تحميل المشاريع...
      </div>

      <button
        class="a-project-close"
        id="a-projects-close"
      >
        إغلاق
      </button>

    </div>
  `;

  document.body.appendChild(projectsModal);

  // ---------------------------------------------------------
  // DOM Helpers
  // ---------------------------------------------------------

  const $ = (id) => document.getElementById(id);

  const msg = (text) => {
    const element = $("a-msg");

    if (element) {
      element.textContent = text || "";
    }
  };

  const setButtonsDisabled = (disabled) => {
    [
      $("a-login"),
      $("a-signup"),
      $("a-close")
    ].forEach((button) => {
      if (button) {
        button.disabled = disabled;
      }
    });
  };

  // ---------------------------------------------------------
  // Modal Controls
  // ---------------------------------------------------------

  function openModal() {
    modal.classList.add("show");

    setTimeout(() => {
      $("a-email")?.focus();
    }, 50);
  }

  function closeModal() {
    modal.classList.remove("show");
    msg("");
  }

  function openProjectsModal() {
    projectsModal.classList.add("show");
  }

  function closeProjectsModal() {
    projectsModal.classList.remove("show");
  }

  // ---------------------------------------------------------
  // Get Current Session
  // ---------------------------------------------------------

  async function getCurrentSession() {
    if (!authReady) return null;

    try {
      const {
        data,
        error
      } = await client.auth.getSession();

      if (error) {
        console.error(error);
        return null;
      }

      return data?.session || null;

    } catch (error) {
      console.error(error);
      return null;
    }
  }

  // ---------------------------------------------------------
  // Refresh User UI
  // ---------------------------------------------------------

  async function refresh() {

    session = await getCurrentSession();

    if (!session) {

      bar.innerHTML = `
        <button
          class="a-primary"
          id="a-open"
        >
          تسجيل الدخول / إنشاء حساب
        </button>
      `;

      $("a-open").onclick = openModal;

      return;
    }

    const result = await getJSON(
      "/api/me",
      {
        headers: {
          Authorization:
            `Bearer ${session.access_token}`
        }
      }
    );

    const me = result.data;

    const credits =
      Number.isFinite(Number(me?.credits))
        ? Number(me.credits)
        : 0;

    const email =
      me?.user?.email ||
      session.user?.email ||
      "";

    bar.innerHTML = `
      <span class="a-credits">
        Credits: ${credits}
      </span>

      <span class="a-email">
        ${escapeHTML(email)}
      </span>

      <button id="a-projects">
        مشاريعي
      </button>

      <button id="a-logout">
        تسجيل الخروج
      </button>
    `;

    $("a-logout").onclick = logout;

    $("a-projects").onclick = loadProjects;
  }

  // ---------------------------------------------------------
  // Login
  // ---------------------------------------------------------

  async function login() {

    const email =
      $("a-email")?.value.trim() || "";

    const password =
      $("a-password")?.value || "";

    if (!email || !password) {
      msg("اكتب البريد الإلكتروني وكلمة المرور.");
      return;
    }

    setButtonsDisabled(true);

    msg("جاري تسجيل الدخول...");

    try {

      const {
        data,
        error
      } = await client.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        msg(error.message);
        return;
      }

      session = data?.session || null;

      closeModal();

      await refresh();

      location.reload();

    } catch (error) {

      console.error(error);

      msg("حدث خطأ أثناء تسجيل الدخول.");

    } finally {

      setButtonsDisabled(false);

    }
  }

  // ---------------------------------------------------------
  // Signup
  // ---------------------------------------------------------

  async function signup() {

    const email =
      $("a-email")?.value.trim() || "";

    const password =
      $("a-password")?.value || "";

    const name =
      $("a-name")?.value.trim() || "";

    if (!email || !password) {
      msg("اكتب البريد الإلكتروني وكلمة المرور.");
      return;
    }

    if (password.length < 6) {
      msg(
        "كلمة المرور يجب أن تكون 6 أحرف على الأقل."
      );
      return;
    }

    setButtonsDisabled(true);

    msg("جاري إنشاء الحساب...");

    try {

      const {
        data,
        error
      } = await client.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: name
          }
        }
      });

      if (error) {
        msg(error.message);
        return;
      }

      if (data?.session) {

        session = data.session;

        msg("تم إنشاء الحساب وتسجيل الدخول بنجاح.");

        setTimeout(async () => {

          closeModal();

          await refresh();

          location.reload();

        }, 800);

      } else {

        msg(
          "تم إنشاء الحساب. تحقق من بريدك الإلكتروني لتأكيد الحساب."
        );

      }

    } catch (error) {

      console.error(error);

      msg("حدث خطأ أثناء إنشاء الحساب.");

    } finally {

      setButtonsDisabled(false);

    }
  }

  // ---------------------------------------------------------
  // Logout
  // ---------------------------------------------------------

  async function logout() {

    try {

      await client.auth.signOut();

      session = null;

      await refresh();

      location.reload();

    } catch (error) {

      console.error(error);

      alert("تعذر تسجيل الخروج.");

    }
  }

  // ---------------------------------------------------------
  // Load Projects
  // ---------------------------------------------------------

  async function loadProjects() {

    if (!session) {
      openModal();
      return;
    }

    openProjectsModal();

    const list = $("a-projects-list");

    list.innerHTML =
      "جاري تحميل المشاريع...";

    const result = await getJSON(
      "/api/projects",
      {
        headers: {
          Authorization:
            `Bearer ${session.access_token}`
        }
      }
    );

    if (!result.response) {

      list.innerHTML =
        "تعذر الاتصال بالخادم.";

      return;
    }

    const data = result.data;

    if (!result.response.ok) {

      list.innerHTML =
        escapeHTML(
          data?.error ||
          "تعذر تحميل المشاريع."
        );

      return;
    }

    const projects =
      Array.isArray(data?.projects)
        ? data.projects
        : [];

    if (!projects.length) {

      list.innerHTML =
        "لا توجد مشاريع محفوظة بعد.";

      return;
    }

    list.innerHTML = projects
      .map((project) => {

        const date =
          project.created_at
            ? new Date(
                project.created_at
              ).toLocaleString("ar-IQ")
            : "";

        return `
          <div class="a-project">

            <div class="a-project-title">
              ${escapeHTML(
                project.input ||
                "مشروع بدون عنوان"
              )}
            </div>

            <div class="a-project-tool">
              الأداة:
              ${escapeHTML(
                project.tool || "AI Studio"
              )}
            </div>

            <div class="a-project-date">
              ${escapeHTML(date)}
            </div>

          </div>
        `;

      })
      .join("");
  }

  // ---------------------------------------------------------
  // Escape HTML
  // ---------------------------------------------------------

  function escapeHTML(value) {

    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ---------------------------------------------------------
  // Auth State Listener
  // ---------------------------------------------------------

  client.auth.onAuthStateChange(
    async (_event, newSession) => {

      session = newSession;

      await refresh();

    }
  );

  // ---------------------------------------------------------
  // Automatically Attach Supabase Token
  // ---------------------------------------------------------

  const originalFetch =
    window.fetch.bind(window);

  window.fetch = async (
    input,
    init = {}
  ) => {

    if (session?.access_token) {

      const headers =
        new Headers(
          init.headers || {}
        );

      headers.set(
        "Authorization",
        `Bearer ${session.access_token}`
      );

      init = {
        ...init,
        headers
      };
    }

    return originalFetch(
      input,
      init
    );
  };

  // ---------------------------------------------------------
  // Button Events
  // ---------------------------------------------------------

  $("a-login").onclick = login;

  $("a-signup").onclick = signup;

  $("a-close").onclick = closeModal;

  $("a-projects-close").onclick =
    closeProjectsModal;

  modal.addEventListener(
    "click",
    (event) => {

      if (event.target === modal) {
        closeModal();
      }

    }
  );

  projectsModal.addEventListener(
    "click",
    (event) => {

      if (event.target === projectsModal) {
        closeProjectsModal();
      }

    }
  );

  // ---------------------------------------------------------
  // Initial State
  // ---------------------------------------------------------

  await refresh();

})();
