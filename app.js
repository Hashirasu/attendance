import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const SUPABASE_URL = "https://njdrnrnnlsrxdyugmsww.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qZHJucm5ubHNyeGR5dWdtc3d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5MDExNDEsImV4cCI6MjEwNTQ3NzE0MX0.F65pU2A3XjyEaisye2GfzLPF9DCaQF1fklMxgSTRhs8";
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const KIOSK_SECRET = "VIHARA_ZEN_SECRET_2026";

const loginSection = document.getElementById("login-section");
const userSection = document.getElementById("user-section");
const adminSection = document.getElementById("admin-section");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const nameGroup = document.getElementById("name-group");
const registerNameInput = document.getElementById("register-name");
const authMainButton = document.getElementById("auth-main-button");
const authButtonText = document.getElementById("auth-button-text");
const toggleAuthBtn = document.getElementById("toggle-auth-btn");
const toggleAuthText = document.getElementById("toggle-auth-text");
const messageEl = document.getElementById("message");

const unverifiedSection = document.getElementById("unverified-section");

const userNameDisplay = document.getElementById("user-name-display");
const userCodeEl = document.getElementById("user-code");
const todayStatusEl = document.getElementById("today-status");
const attendanceHistory = document.getElementById("attendance-history");

const switchToAdminBtn = document.getElementById("switch-to-admin");
const switchToUserBtn = document.getElementById("switch-to-user");
const logoutBtn = document.getElementById("logout-button");
const adminLogoutBtn = document.getElementById("admin-logout-button");

const tabRekapBtn = document.getElementById("tab-rekap-btn");
const tabKaryawanBtn = document.getElementById("tab-karyawan-btn");
const adminViewRekap = document.getElementById("admin-view-rekap");
const adminViewKaryawan = document.getElementById("admin-view-karyawan");

const adminFilterDate = document.getElementById("admin-filter-date");
const adminFilterStatus = document.getElementById("admin-filter-status");
const exportCsvBtn = document.getElementById("export-csv-btn");
const adminAttendanceList = document.getElementById("admin-attendance-list");
const adminEmployeeList = document.getElementById("admin-employee-list");

const adminChartFilter = document.getElementById("admin-chart-filter");
const adminChartContainer = document.getElementById("admin-chart-container");

const editEmpModal = document.getElementById("edit-emp-modal");
const editEmpId = document.getElementById("edit-emp-id");
const editEmpName = document.getElementById("edit-emp-name");
const editEmpCode = document.getElementById("edit-emp-code");
const editEmpRole = document.getElementById("edit-emp-role");
const editEmpActive = document.getElementById("edit-emp-active");
const editModalMsg = document.getElementById("edit-modal-msg");
const cancelEditEmp = document.getElementById("cancel-edit-emp");
const saveEditEmp = document.getElementById("save-edit-emp");

let isRegisterMode = false;
let currentUserRole = "user";

// ==============================
// 1. AUTO CHECK-IN & QR SCANNER
// ==============================
async function checkUrlAutoAttendance() {
  const urlParams = new URLSearchParams(window.location.search);
  const secret = urlParams.get("secret");
  const block = urlParams.get("block");

  if (secret && block) {
    sessionStorage.setItem("pending_secret", secret);
    sessionStorage.setItem("pending_block", block);
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  const savedSecret = sessionStorage.getItem("pending_secret");
  const savedBlock = sessionStorage.getItem("pending_block");

  if (savedSecret && savedBlock) {
    const currentUnix = Math.floor(Date.now() / 1000);
    const currentBlock = Math.floor(currentUnix / 15);

    if (savedSecret === KIOSK_SECRET && Math.abs(currentBlock - parseInt(savedBlock)) <= 4) {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        if (!isRegisterMode) toggleAuthBtn.click();
        messageEl.textContent = "Silakan buat akun untuk menyelesaikan presensi.";
        return; 
      }

      const { data, error } = await supabase.rpc("check_in");
      
      if (!error && data && data.success) {
        alert("Absensi Berhasil via Scan QR!");
        await loadTodayStatus();
        await loadAttendanceHistory();
        await loadMonthlyStatistics();
      } else {
        const errorMsg = error ? error.message : (data ? data.message : "Terjadi kesalahan.");
        alert("Gagal Absen: " + errorMsg);
      }
      
      sessionStorage.removeItem("pending_secret");
      sessionStorage.removeItem("pending_block");
    } else {
      alert("QR Code kedaluwarsa. Silakan scan ulang.");
      sessionStorage.removeItem("pending_secret");
      sessionStorage.removeItem("pending_block");
    }
  }
}

window.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    await loadUserProfile();
    await checkUrlAutoAttendance();
  } else {
    showLoginSection();
    await checkUrlAutoAttendance(); 
  }
});

toggleAuthBtn.addEventListener("click", () => {
  isRegisterMode = !isRegisterMode;
  if (isRegisterMode) {
    nameGroup.style.display = "block";
    authButtonText.textContent = "Daftar";
    toggleAuthText.textContent = "Sudah punya akun?";
    toggleAuthBtn.textContent = "Login di sini";
  } else {
    nameGroup.style.display = "none";
    authButtonText.textContent = "Masuk";
    toggleAuthText.textContent = "Belum punya akun?";
    toggleAuthBtn.textContent = "Daftar di sini";
  }
  messageEl.textContent = "";
});

authMainButton.addEventListener("click", async () => {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    messageEl.textContent = "Email dan password wajib diisi!";
    return;
  }

  const emailRegex = /^[a-zA-Z0-9]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) {
    messageEl.textContent = "Format email tidak valid atau mengandung simbol terlarang.";
    return;
  }

  messageEl.textContent = "Memproses...";

  if (isRegisterMode) {
    const name = registerNameInput.value.trim();
    if (!name) {
      messageEl.textContent = "Nama lengkap wajib diisi!";
      return;
    }

    const nameRegex = /^[A-Za-z\s]+$/;
    if (!nameRegex.test(name)) {
      messageEl.textContent = "Nama hanya boleh berisi huruf dan spasi.";
      return;
    }

    const { data: nameExists, error: rpcError } = await supabase.rpc("check_name_exists", { p_name: name });
    if (rpcError) {
      messageEl.textContent = "Gagal memvalidasi nama: " + rpcError.message;
      return;
    }

    if (nameExists) {
      messageEl.textContent = "Nama lengkap ini sudah terdaftar!";
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email, password, options: { data: { full_name: name } }
    });

    if (signUpError) {
      messageEl.textContent = "Gagal mendaftar: " + signUpError.message;
      return;
    }

    if (sessionStorage.getItem("pending_secret")) {
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
      if (!loginError) {
        messageEl.textContent = "";
        await loadUserProfile();
        await checkUrlAutoAttendance();
      }
    } else {
      messageEl.textContent = "Pendaftaran berhasil! Silakan login.";
      toggleAuthBtn.click();
    }
  } else {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      messageEl.textContent = "Login Gagal: " + error.message;
      return;
    }

    if (data.user && !data.user.email_confirmed_at) {
      await supabase.auth.signOut();
      emailInput.style.display = "none";
      passwordInput.style.display = "none";
      authMainButton.style.display = "none";
      document.querySelector(".auth-toggle-box").style.display = "none";
      if (unverifiedSection) unverifiedSection.style.display = "block";
      window.pendingVerificationEmail = email;
      messageEl.textContent = "";
      return;
    }

    messageEl.textContent = "";
    await loadUserProfile();
    await checkUrlAutoAttendance();
  }
});

async function handleLogout() {
  await supabase.auth.signOut();
  showLoginSection();
}

if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);
if (adminLogoutBtn) adminLogoutBtn.addEventListener("click", handleLogout);

function showLoginSection() {
  loginSection.style.display = "block";
  userSection.style.display = "none";
  adminSection.style.display = "none";
  if (unverifiedSection) unverifiedSection.style.display = "none";
  emailInput.style.display = "block";
  passwordInput.style.display = "block";
  authMainButton.style.display = "block";
  document.querySelector(".auth-toggle-box").style.display = "block";
  messageEl.textContent = "";
}

// ==============================
// 2. USER DASHBOARD & STATS
// ==============================
async function loadUserProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: empData, error } = await supabase
    .from("employees")
    .select("name, employee_code, role")
    .eq("id", user.id)
    .single();

  if (!error && empData) {
    userNameDisplay.textContent = empData.name;
    userCodeEl.textContent = `Kode: ${empData.employee_code}`;
    currentUserRole = empData.role;

    if (currentUserRole === "admin" || currentUserRole === "adm1n") {
      switchToAdminBtn.style.display = "inline-block";
    } else {
      switchToAdminBtn.style.display = "none";
    }
  }

  loginSection.style.display = "none";
  userSection.style.display = "block";
  adminSection.style.display = "none";

  await loadTodayStatus();
  await loadAttendanceHistory();
  await loadMonthlyStatistics();
}

async function loadTodayStatus() {
  if (!todayStatusEl) return;
  todayStatusEl.innerHTML = "<p>Memuat status...</p>";

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());

  const { data } = await supabase
    .from("attendance")
    .select("check_in, status")
    .eq("employee_id", user.id)
    .eq("attendance_date", todayStr)
    .maybeSingle();

  if (data) {
    const time = new Date(data.check_in).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
    const badge = data.status === "late" ? `<span class="badge-late">Terlambat</span>` : `<span class="badge-present">Tepat Waktu</span>`;
    todayStatusEl.innerHTML = `<div style="font-size: 14px; font-weight: 700;">Sudah Absen (${time})</div><div style="margin-top:6px;">${badge}</div>`;
  } else {
    todayStatusEl.innerHTML = `<div style="font-size: 14px; font-weight: 700; color: var(--ios-red);">Belum Absen</div>`;
  }
}

async function loadAttendanceHistory() {
  if (!attendanceHistory) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data } = await supabase
    .from("attendance")
    .select("attendance_date, check_in, status")
    .eq("employee_id", user.id)
    .order("attendance_date", { ascending: false });

  if (!data || data.length === 0) {
    attendanceHistory.innerHTML = "<p style='font-size: 13px; color: var(--text-sub);'>Belum ada riwayat.</p>";
    return;
  }

  attendanceHistory.innerHTML = "";
  data.forEach((row) => {
    const date = new Date(row.attendance_date + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
    const time = new Date(row.check_in).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
    const badge = row.status === "late" ? `<span class="badge-late">Terlambat</span>` : `<span class="badge-present">Hadir</span>`;

    const item = document.createElement("div");
    item.className = "history-item";
    item.innerHTML = `<div><strong>${date}</strong><div style="font-size: 11px; color: var(--text-sub);">${time} WIB</div></div><div>${badge}</div>`;
    attendanceHistory.appendChild(item);
  });
}

async function loadMonthlyStatistics() {
  const statHadirEl = document.getElementById("stat-total-hadir");
  const statTerlambatEl = document.getElementById("stat-total-terlambat");
  const statRateEl = document.getElementById("stat-attendance-rate");
  const barPresent = document.getElementById("progress-bar-present");
  const barLate = document.getElementById("progress-bar-late");

  if (!statHadirEl) return;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const now = new Date();
  const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;

  const { data } = await supabase
    .from("attendance")
    .select("status")
    .eq("employee_id", user.id)
    .gte("attendance_date", startOfMonth);

  if (!data) return;

  let hadir = 0, terlambat = 0;
  data.forEach(r => r.status === "late" ? terlambat++ : hadir++);
  const total = hadir + terlambat;
  const percent = total > 0 ? Math.round((hadir / total) * 100) : 0;

  statHadirEl.textContent = hadir;
  statTerlambatEl.textContent = terlambat;
  statRateEl.textContent = percent + "%";
  if (barPresent && barLate) {
    barPresent.style.width = percent + "%";
    barLate.style.width = (total > 0 ? (terlambat / total) * 100 : 0) + "%";
  }
}

// ==============================
// 3. QR SCANNER KAMERA
// ==============================
const openScannerBtnUser = document.getElementById("open-scanner-btn-user");
const scannerModal = document.getElementById("scanner-modal");
const closeScannerBtn = document.getElementById("close-scanner-btn");
let html5QrCode = null;

async function startQrScanner() {
  if (!scannerModal) return;
  scannerModal.style.display = "flex";
  html5QrCode = new Html5Qrcode("reader");
  
  try {
    await html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, async (text) => {
      await html5QrCode.stop();
      html5QrCode.clear();
      scannerModal.style.display = "none";
      try {
        const url = new URL(text);
        const secret = url.searchParams.get("secret");
        const block = url.searchParams.get("block");
        if (secret && block) {
          sessionStorage.setItem("pending_secret", secret);
          sessionStorage.setItem("pending_block", block);
          await checkUrlAutoAttendance();
        } else {
          alert("QR Code tidak valid.");
        }
      } catch {
        alert("Format QR tidak dikenali.");
      }
    }, () => {});
  } catch {
    alert("Gagal membuka kamera.");
    scannerModal.style.display = "none";
  }
}

if (openScannerBtnUser) openScannerBtnUser.addEventListener("click", startQrScanner);
if (closeScannerBtn) {
  closeScannerBtn.addEventListener("click", async () => {
    if (html5QrCode && html5QrCode.isScanning) {
      await html5QrCode.stop();
      html5QrCode.clear();
    }
    scannerModal.style.display = "none";
  });
}

// ==============================
// 4. ADMIN PANEL & GRAFIK X-Y
// ==============================
if (switchToAdminBtn) {
  switchToAdminBtn.addEventListener("click", async () => {
    userSection.style.display = "none";
    adminSection.style.display = "block";
    adminFilterDate.value = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
    await loadAdminAttendance();
    await loadAdminChart();
  });
}

if (switchToUserBtn) {
  switchToUserBtn.addEventListener("click", () => {
    adminSection.style.display = "none";
    userSection.style.display = "block";
  });
}

if (tabRekapBtn && tabKaryawanBtn) {
  tabRekapBtn.addEventListener("click", () => {
    adminViewRekap.style.display = "block";
    adminViewKaryawan.style.display = "none";
    tabRekapBtn.classList.add("active");
    tabKaryawanBtn.classList.remove("active");
  });
  tabKaryawanBtn.addEventListener("click", async () => {
    adminViewRekap.style.display = "none";
    adminViewKaryawan.style.display = "block";
    tabKaryawanBtn.classList.add("active");
    tabRekapBtn.classList.remove("active");
    await loadEmployeeManagement();
  });
}

if (adminFilterDate) adminFilterDate.addEventListener("change", loadAdminAttendance);
if (adminFilterStatus) adminFilterStatus.addEventListener("change", loadAdminAttendance);
if (adminChartFilter) adminChartFilter.addEventListener("change", loadAdminChart);

async function loadAdminAttendance() {
  if (!adminAttendanceList) return;
  adminAttendanceList.innerHTML = "<p>Memuat rekap...</p>";

  let query = supabase.from("attendance").select("attendance_date, check_in, status, employees(name, employee_code)").order("check_in", { ascending: false });
  if (adminFilterDate.value) query = query.eq("attendance_date", adminFilterDate.value);
  if (adminFilterStatus.value !== "ALL") query = query.eq("status", adminFilterStatus.value);

  const { data } = await query;
  if (!data || data.length === 0) {
    adminAttendanceList.innerHTML = "<p style='font-size: 13px; color: var(--text-sub);'>Tidak ada data.</p>";
    return;
  }

  adminAttendanceList.innerHTML = "";
  data.forEach(row => {
    const time = new Date(row.check_in).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
    const name = row.employees ? row.employees.name : "Dihapus";
    const badge = row.status === "late" ? `<span class="badge-late">Terlambat</span>` : `<span class="badge-present">Hadir</span>`;

    const item = document.createElement("div");
    item.className = "history-item";
    item.innerHTML = `<div><strong>${name}</strong><div style="font-size: 11px; color: var(--text-sub);">${row.attendance_date} &bull; ${time} WIB</div></div><div>${badge}</div>`;
    adminAttendanceList.appendChild(item);
  });
}

async function loadAdminChart() {
  if (!adminChartContainer) return;
  adminChartContainer.innerHTML = "<p style='font-size: 12px; color: var(--text-sub); margin: auto;'>Memuat grafik...</p>";

  const filterType = adminChartFilter ? adminChartFilter.value : "month";
  const { data } = await supabase.from("attendance").select("attendance_date, status");
  if (!data) return;

  const grouped = {};
  data.forEach(row => {
    let key = row.attendance_date;
    if (filterType === "month") key = row.attendance_date.substring(0, 7);
    else if (filterType === "year") key = row.attendance_date.substring(0, 4);

    if (!grouped[key]) grouped[key] = { total: 0 };
    grouped[key].total++;
  });

  const keys = Object.keys(grouped).sort().slice(-7);
  if (keys.length === 0) {
    adminChartContainer.innerHTML = "<p style='font-size: 12px; color: var(--text-sub); margin: auto;'>Belum ada data.</p>";
    return;
  }

  const max = Math.max(...keys.map(k => grouped[k].total), 5);
  adminChartContainer.innerHTML = "";

  keys.forEach(k => {
    const total = grouped[k].total;
    const height = Math.round((total / max) * 100);
    const wrapper = document.createElement("div");
    wrapper.style.cssText = "display: flex; flex-direction: column; align-items: center; flex: 1; height: 100%; justify-content: flex-end;";
    wrapper.innerHTML = `
      <div style="font-size: 10px; color: var(--text-sub); margin-bottom: 4px;">${total}</div>
      <div style="width: 100%; max-width: 24px; height: ${Math.max(height, 10)}%; background: var(--ios-blue); border-radius: 4px 4px 0 0;"></div>
      <div style="font-size: 9px; color: var(--text-sub); margin-top: 4px; overflow: hidden; text-overflow: ellipsis; max-width: 45px;">${k}</div>
    `;
    adminChartContainer.appendChild(wrapper);
  });
}

async function loadEmployeeManagement() {
  if (!adminEmployeeList) return;
  adminEmployeeList.innerHTML = "<p>Memuat anggota...</p>";

  const { data } = await supabase.from("employees").select("id, name, employee_code, role, is_active").order("name");
  if (!data) return;

  adminEmployeeList.innerHTML = "";
  data.forEach(emp => {
    // Badge styling: adm1n = merah, admin = oren, user = biru
    let roleBadgeBg = "rgba(0, 92, 191, 0.1)";
    let roleBadgeColor = "var(--ios-blue)";
    let roleText = "MEMBER";

    if (emp.role === "adm1n") {
      roleBadgeBg = "rgba(255, 59, 48, 0.15)";
      roleBadgeColor = "var(--ios-red)";
      roleText = "ADM1N";
    } else if (emp.role === "admin") {
      roleBadgeBg = "rgba(245, 158, 11, 0.15)";
      roleBadgeColor = "#f59e0b";
      roleText = "ADMIN";
    }

    const card = document.createElement("div");
    card.className = "emp-card-item";
    card.innerHTML = `
      <div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 3px;">
          <strong style="font-size: 14px; color: var(--text-main);">${emp.name}</strong>
          <span style="font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 10px; background: ${roleBadgeBg}; color: ${roleBadgeColor};">${roleText}</span>
        </div>
        <div style="font-size: 11px; color: var(--text-sub);">Kode: ${emp.employee_code}</div>
      </div>
      <button class="secondary-button" style="padding: 4px 10px; font-size: 12px;">Edit</button>
    `;
    
    card.querySelector("button").addEventListener("click", () => {
      editEmpId.value = emp.id;
      editEmpName.value = emp.name;
      editEmpCode.value = emp.employee_code;
      editEmpRole.value = emp.role;
      editEmpActive.value = String(emp.is_active);
      editModalMsg.textContent = "";
      editEmpModal.style.display = "flex";
    });
    adminEmployeeList.appendChild(card);
  });
}

if (cancelEditEmp) cancelEditEmp.addEventListener("click", () => editEmpModal.style.display = "none");

if (saveEditEmp) {
  saveEditEmp.addEventListener("click", async () => {
    const id = editEmpId.value;
    const name = editEmpName.value.trim();
    const code = editEmpCode.value.trim();
    const role = editEmpRole.value;
    const isActive = editEmpActive.value === "true";

    const { data: { user } } = await supabase.auth.getUser();
    const { data: me } = await supabase.from("employees").select("role").eq("id", user.id).single();

    if (me.role !== "adm1n") {
      const { data: target } = await supabase.from("employees").select("role").eq("id", id).single();
      if (target.role !== role) {
        editModalMsg.textContent = "Akses ditolak: Hanya Super Admin (adm1n) yang dapat mengubah role!";
        return;
      }
    }

    editModalMsg.textContent = "Menyimpan...";
    const { error } = await supabase.from("employees").update({ name, employee_code: code, role, is_active: isActive }).eq("id", id);
    
    if (error) {
      editModalMsg.textContent = "Gagal: " + error.message;
    } else {
      editModalMsg.textContent = "Berhasil!";
      setTimeout(() => {
        editEmpModal.style.display = "none";
        loadEmployeeManagement();
      }, 700);
    }
  });
}

if (exportCsvBtn) {
  exportCsvBtn.addEventListener("click", async () => {
    const { data } = await supabase.from("attendance").select("attendance_date, check_in, status, employees(name, employee_code)");
    if (!data) return;
    const excel = data.map(r => ({ Tanggal: r.attendance_date, Nama: r.employees?.name, Kode: r.employees?.employee_code, Status: r.status }));
    const ws = XLSX.utils.json_to_sheet(excel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap");
    XLSX.writeFile(wb, "Rekap_Mudiviverse.xlsx");
  });
}

document.getElementById('btn-resend')?.addEventListener('click', async () => {
  if (window.pendingVerificationEmail) {
    await supabase.auth.resend({ type: 'signup', email: window.pendingVerificationEmail });
    alert("Email verifikasi dikirim ulang.");
  }
});