(async () => {
  const cfg = await fetch("/api/config").then(r => r.json()).catch(() => null);

  if (!cfg?.authEnabled || !cfg.supabaseUrl || !cfg.supabaseKey) {
    return;
  }

  const loadSupabase = () =>
    new Promise((resolve, reject) => {
      if (window.supabase?.createClient) return resolve();
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });

  try {
    await loadSupabase();
  } catch {
    return;
  }

  const client = window.supabase.createClient(
    cfg.supabaseUrl,
    cfg.supabaseKey
  );

  let session = null;

  const style = document.createElement("style");
  style.textContent = `
    #aivora-authbar{
      display:flex;gap:8px;align-items:center;justify-content:center;
      flex-wrap:wrap;margin:0 0 14px;padding:4px 8px
    }
    #aivora-authbar button{
      border:1px solid rgba(255,255,255,.1);border-radius:999px;
      padding:9px 15px;background:#24324a;color:#e2e8f0;cursor:pointer
    }
    #aivora-authbar .a-primary{
      background:linear-gradient(135deg,#38bdf8,#0ea5e9);
      color:#062033;font-weight:800
    }
    #aivora-authbar .a-credits{color:#bbf7d0;font-size:13px}
    #aivora-auth-modal{
      position:fixed;inset:0;background:rgba(2,6,23,.82);
      display:none;align-items:center;justify-content:center;
      padding:18px;z-index:99999
    }
    #aivora-auth-modal.show{display:flex}
    .a-modal{
      width:min(430px,100%);background:#172238;
      border:1px solid rgba(255,255,255,.1);border-radius:24px;
      padding:20px;box-shadow:0 25px 80px rgba(0,0,0,.45)
    }
    .a-modal h2{margin:0 0 12px;color:#e0f2fe;text-align:center}
    .a-modal input{
      width:100%;box-sizing:border-box;margin:7px 0;padding:13px;
      border-radius:12px;border:1px solid rgba(255,255,255,.1);
      background:#111a2e;color:#fff;outline:none
    }
    .a-modal button{
      width:100%;margin-top:9px;padding:12px;border-radius:12px;
      border:0;background:#38bdf8;color:#062033;font-weight:800;cursor:pointer
    }
    .a-modal .a-close{background:#24324a;color:#fff}
    .a-msg{min-height:22px;color:#9aa8bf;font-size:13px;margin-top:9px;text-align:center}
  `;
  document.head.appendChild(style);

  const bar = document.createElement("div");
  bar.id = "aivora-authbar";
  document.body.prepend(bar);

  const modal = document.createElement("div");
  modal.id = "aivora-auth-modal";
  modal.dir = "rtl";
  modal.innerHTML = `
    <div class="a-modal">
      <h2>حساب Aivora AI</h2>
      <input id="a-email" type="email" placeholder="البريد الإلكتروني">
      <input id="a-password" type="password" placeholder="كلمة المرور">
      <input id="a-name" type="text" placeholder="الاسم — للتسجيل فقط">
      <button id="a-login">تسجيل الدخول</button>
      <button id="a-signup">إنشاء حساب جديد</button>
      <button class="a-close" id="a-close">إغلاق</button>
      <div class="a-msg" id="a-msg"></div>
    </div>
  `;
  document.body.appendChild(modal);

  const $ = (id) => document.getElementById(id);
  const msg = (text) => ($("a-msg").textContent = text || "");

  function openModal() {
    modal.classList.add("show");
    $("a-email").focus();
  }

  function closeModal() {
    modal.classList.remove("show");
    msg("");
  }

  async function refresh() {
    const { data } = await client.auth.getSession();
    session = data?.session || null;

    if (!session) {
      bar.innerHTML = `
        <button class="a-primary" id="a-open">تسجيل الدخول / إنشاء حساب</button>
      `;
      $("a-open").onclick = openModal;
      return;
    }

    const me = await fetch("/api/me", {
      headers: { Authorization: `Bearer ${session.access_token}` }
    }).then(r => r.json()).catch(() => null);

    bar.innerHTML = `
      <span class="a-credits">Credits: ${me?.credits ?? 0}</span>
      <span style="color:#9aa8bf;font-size:13px">${me?.user?.email || ""}</span>
      <button id="a-projects">مشاريعي</button>
      <button id="a-logout">تسجيل الخروج</button>
    `;

    $("a-logout").onclick = async () => {
      await client.auth.signOut();
      await refresh();
      location.reload();
    };

    $("a-projects").onclick = loadProjects;
  }

  async function login() {
    const email = $("a-email").value.trim();
    const password = $("a-password").value;

    if (!email || !password) return msg("اكتب البريد وكلمة المرور.");

    msg("جاري تسجيل الدخول...");

    const { error } = await client.auth.signInWithPassword({
      email,
      password
    });

    if (error) return msg(error.message);

    closeModal();
    await refresh();
    location.reload();
  }

  async function signup() {
    const email = $("a-email").value.trim();
    const password = $("a-password").value;
    const name = $("a-name").value.trim();

    if (!email || !password) return msg("اكتب البريد وكلمة المرور.");
    if (password.length < 6) return msg("كلمة المرور يجب أن تكون 6 أحرف على الأقل.");

    msg("جاري إنشاء الحساب...");

    const { error } = await client.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: name }
      }
    });

    if (error) return msg(error.message);

    msg("تم إنشاء الحساب. تحقق من بريدك الإلكتروني إذا كان تأكيد البريد مفعلاً.");
  }

  async function loadProjects() {
    if (!session) return openModal();

    const response = await fetch("/api/projects", {
      headers: { Authorization: `Bearer ${session.access_token}` }
    });

    const data = await response.json();

    if (!response.ok) return alert(data.error || "تعذر تحميل المشاريع.");

    const lines = (data.projects || []).map((p) => {
      const date = new Date(p.created_at).toLocaleString("ar-IQ");
      return `• ${p.tool} — ${date}`;
    });

    alert(
      lines.length
        ? "مشاريعك المحفوظة:\n\n" + lines.join("\n")
        : "لا توجد مشاريع محفوظة بعد."
    );
  }

  $("a-login").onclick = login;
  $("a-signup").onclick = signup;
  $("a-close").onclick = closeModal;

  client.auth.onAuthStateChange((_event, newSession) => {
    session = newSession;
    refresh();
  });

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init = {}) => {
    if (session?.access_token) {
      const headers = new Headers(init.headers || {});
      headers.set("Authorization", `Bearer ${session.access_token}`);
      init = { ...init, headers };
    }
    return originalFetch(input, init);
  };

  await refresh();
})();
