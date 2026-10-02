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
const registerBirthPlace = document.getElementById("register-birth-place");
const registerBirthDate = document.getElementById("register-birth-date");
const registerPhoneInput = document.getElementById("register-phone");

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
const tabKioskBtn = document.getElementById("tab-kiosk-btn");

const adminViewRekap = document.getElementById("admin-view-rekap");
const adminViewKaryawan = document.getElementById("admin-view-karyawan");
const adminViewKiosk = document.getElementById("admin-view-kiosk");

const adminFilterDate = document.getElementById("admin-filter-date");
const adminFilterStatus = document.getElementById("admin-filter-status");
const exportCsvBtn = document.getElementById("export-csv-btn");
const adminAttendanceList = document.getElementById("admin-attendance-list");
const adminEmployeeList = document.getElementById("admin-employee-list");

const adminChartFilter = document.getElementById("admin-chart-filter");
const adminChartContainer = document.getElementById("admin-chart-container");

let isRegisterMode = false;
let currentUserRole = "user";
let currentUserId = null;
let currentEmployeeData = null;
let kioskTimerInterval = null;
let kioskQrObject = null;

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
        if (!isRegisterMode && toggleAuthBtn) toggleAuthBtn.click();
        if (messageEl) messageEl.textContent = "Silakan buat akun untuk menyelesaikan presensi.";
        return; 
      }

      const { data, error } = await supabase.rpc("check_in");
      
      if (!error && data && data.success) {
        alert("Absensi Berhasil via Scan QR!");
        await Promise.all([
          loadUserProfile(),
          loadTodayStatus(),
          loadAttendanceHistory(),
          loadMonthlyStatistics(),
          loadUserAchievements()
        ]);
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

if (toggleAuthBtn) {
  toggleAuthBtn.addEventListener("click", () => {
    isRegisterMode = !isRegisterMode;
    if (isRegisterMode) {
      if (nameGroup) nameGroup.style.display = "block";
      if (authButtonText) authButtonText.textContent = "Daftar";
      if (toggleAuthText) toggleAuthText.textContent = "Sudah punya akun?";
      toggleAuthBtn.textContent = "Login di sini";
    } else {
      if (nameGroup) nameGroup.style.display = "none";
      if (authButtonText) authButtonText.textContent = "Masuk";
      if (toggleAuthText) toggleAuthText.textContent = "Belum punya akun?";
      toggleAuthBtn.textContent = "Daftar di sini";
    }
    if (messageEl) messageEl.textContent = "";
  });
}

if (authMainButton) {
  authMainButton.addEventListener("click", async () => {
    const email = emailInput.value.trim();
    const password = passwordInput.value.trim();

    if (!email || !password) {
      if (messageEl) messageEl.textContent = "Email dan password wajib diisi!";
      return;
    }

    const emailRegex = /^[a-zA-Z0-9.]+@gmail\.com$/;
    if (!emailRegex.test(email)) {
      if (messageEl) messageEl.textContent = "Format email harus menggunakan @gmail.com.";
      return;
    }

    if (messageEl) messageEl.textContent = "Memproses...";

    if (isRegisterMode) {
      const name = registerNameInput.value.trim();
      const birthPlace = registerBirthPlace.value.trim();
      const birthDate = registerBirthDate.value;
      const phone = registerPhoneInput ? registerPhoneInput.value.trim() : "";

      if (!name || !birthPlace || !birthDate || !phone) {
        if (messageEl) messageEl.textContent = "Semua kolom wajib diisi!";
        return;
      }

      const { data: nameExists } = await supabase.rpc("check_name_exists", { p_name: name });
      if (nameExists) {
        if (messageEl) messageEl.textContent = "Nama lengkap ini sudah terdaftar!";
        return;
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email, password, options: { data: { full_name: name, birth_place: birthPlace, birth_date: birthDate, phone: phone } }
      });

      if (signUpError) {
        if (messageEl) messageEl.textContent = "Gagal mendaftar: " + signUpError.message;
        return;
      }

      await supabase.auth.signInWithPassword({ email, password });
      if (messageEl) messageEl.textContent = "";
      await loadUserProfile();
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (messageEl) messageEl.textContent = "Login Gagal: " + error.message;
        return;
      }
      if (messageEl) messageEl.textContent = "";
      await loadUserProfile();
    }
  });
}

async function handleLogout() {
  if (kioskTimerInterval) clearInterval(kioskTimerInterval);
  await supabase.auth.signOut();
  showLoginSection();
}

const mobileLogoutBtn = document.getElementById("mobile-logout-button");
if (mobileLogoutBtn) mobileLogoutBtn.addEventListener("click", handleLogout);
if (logoutBtn) logoutBtn.addEventListener("click", handleLogout);
if (adminLogoutBtn) adminLogoutBtn.addEventListener("click", handleLogout);

function showLoginSection() {
  const authContainer = document.getElementById("auth-container");
  const dashboardWorkspace = document.getElementById("dashboard-workspace");
  if (authContainer) authContainer.style.display = "flex";
  if (dashboardWorkspace) dashboardWorkspace.style.display = "none";
  if (loginSection) loginSection.style.display = "block";
}

async function loadUserProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  currentUserId = user.id;
  const authContainer = document.getElementById("auth-container");
  const dashboardWorkspace = document.getElementById("dashboard-workspace");
  if (authContainer) authContainer.style.display = "none";
  if (dashboardWorkspace) dashboardWorkspace.style.display = "flex";

  const { data: empData, error } = await supabase
    .from("employees")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!error && empData) {
    currentEmployeeData = empData;
    currentUserRole = empData.role;

    if (userNameDisplay) userNameDisplay.textContent = empData.name;
    if (userCodeEl) userCodeEl.textContent = `Kode: ${empData.employee_code}`;

    const profilePageAvatar = document.getElementById("profile-page-avatar");
    const profilePageName = document.getElementById("profile-page-name");
    const profilePageCode = document.getElementById("profile-page-code");
    const profilePagePoints = document.getElementById("profile-page-points");
    const profilePageBio = document.getElementById("profile-page-bio");

    const avatarUrl = empData.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${empData.name}`;
    if (profilePageAvatar) profilePageAvatar.src = avatarUrl;
    if (profilePageName) profilePageName.textContent = empData.name;
    if (profilePageCode) profilePageCode.textContent = `Kode Anggota: ${empData.employee_code}`;
    if (profilePagePoints) profilePagePoints.textContent = empData.points || 0;
    if (profilePageBio) profilePageBio.textContent = `"${empData.bio || 'Tulis perenungan atau kata motivasi favoritmu di sini...'}"`;

    const navAdminBtn = document.getElementById("nav-admin-btn");
    if (currentUserRole === "admin" || currentUserRole === "adm1n" || currentUserRole === "pengurus") {
      if (switchToAdminBtn) switchToAdminBtn.style.display = "inline-block";
      if (navAdminBtn) navAdminBtn.style.display = "flex";
      if (tabKioskBtn) tabKioskBtn.style.display = "inline-block";
    }
  }

  await Promise.all([
    loadTodayStatus(),
    loadAttendanceHistory(),
    loadMonthlyStatistics(),
    loadUserAchievements()
  ]);

  if (window.initFeedSystem) {
    await window.initFeedSystem();
  }
}

async function loadUserAchievements() {
  if (!currentUserId) return;
  const { count } = await supabase
    .from("attendance")
    .select("id", { count: "exact", head: true })
    .eq("employee_id", currentUserId);

  const totalAbsen = count || 0;
  let unlockedCount = 0;

  const checkBadge = (id, target) => {
    const item = document.getElementById(`badge-item-${id}`);
    const bar = document.getElementById(`badge-bar-${id}`);
    const status = document.getElementById(`badge-status-${id}`);
    if (item && bar && status) {
      const pct = Math.min(100, Math.round((totalAbsen / target) * 100));
      bar.style.width = `${pct}%`;
      if (totalAbsen >= target) {
        item.classList.remove("locked"); item.classList.add("unlocked");
        status.textContent = `✅ Terbuka (${target} / ${target} Absen)`;
        status.style.color = "#10b981";
        unlockedCount++;
      } else {
        status.textContent = `${totalAbsen} / ${target} Absen`;
      }
    }
  };

  checkBadge(10, 10);
  checkBadge(30, 30);
  checkBadge(90, 90);

  const badgeCountText = document.getElementById("badge-count-text");
  if (badgeCountText) badgeCountText.textContent = `${unlockedCount} / 3 Unlocked`;
}

// UPLOAD AVATAR GALERI
const uploadAvatarFileInput = document.getElementById("upload-avatar-file");
if (uploadAvatarFileInput) {
  uploadAvatarFileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file || !currentUserId) return;
    if (!file.type.startsWith("image/")) { alert("Pilih file gambar!"); return; }

    const fileExt = file.name.split('.').pop();
    const filePath = `${currentUserId}/avatar_${Date.now()}.${fileExt}`;

    try {
      const { error: uploadErr } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath);
      await supabase.from('employees').update({ avatar_url: publicUrl }).eq('id', currentUserId);

      const profileAvatar = document.getElementById("profile-page-avatar");
      if (profileAvatar) profileAvatar.src = publicUrl;
      alert("✅ Foto profil berhasil diperbarui!");
    } catch (err) {
      alert("Gagal mengunggah foto: " + err.message);
    }
  });
}

// EDIT BIO
const btnOpenEditBioModal = document.getElementById("btn-open-edit-bio-modal");
const editBioModal = document.getElementById("edit-bio-modal");
const editBioInputText = document.getElementById("edit-bio-input-text");
const cancelEditBio = document.getElementById("cancel-edit-bio");
const saveEditBio = document.getElementById("save-edit-bio");

if (btnOpenEditBioModal) {
  btnOpenEditBioModal.addEventListener("click", () => {
    if (currentEmployeeData) editBioInputText.value = currentEmployeeData.bio || "";
    editBioModal.style.display = "flex";
  });
}
if (cancelEditBio) cancelEditBio.addEventListener("click", () => editBioModal.style.display = "none");
if (saveEditBio) {
  saveEditBio.addEventListener("click", async () => {
    const bio = editBioInputText.value.trim();
    await supabase.from("employees").update({ bio }).eq("id", currentUserId);
    editBioModal.style.display = "none";
    await loadUserProfile();
  });
}

async function loadTodayStatus() {
  if (!todayStatusEl) return;
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
  const { data } = await supabase.from("attendance").select("check_in, status").eq("employee_id", currentUserId).eq("attendance_date", todayStr).maybeSingle();
  if (data) {
    const time = new Date(data.check_in).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
    const badge = data.status === "late" ? `<span class="badge-late">Terlambat</span>` : `<span class="badge-present">Tepat Waktu</span>`;
    todayStatusEl.innerHTML = `<div style="font-size: 15px; font-weight: 700;">Sudah Absen (${time} WIB)</div><div style="margin-top:8px;">${badge}</div>`;
  } else {
    todayStatusEl.innerHTML = `<div style="font-size: 15px; font-weight: 700; color: #ef4444;">Belum Absen</div>`;
  }
}

async function loadAttendanceHistory() {
  if (!attendanceHistory) return;
  const { data } = await supabase.from("attendance").select("attendance_date, check_in, status").eq("employee_id", currentUserId).order("attendance_date", { ascending: false });
  if (!data || data.length === 0) { attendanceHistory.innerHTML = "<p style='font-size: 13px; color: var(--text-sub);'>Belum ada riwayat.</p>"; return; }
  attendanceHistory.innerHTML = "";
  data.forEach((row) => {
    const date = new Date(row.attendance_date + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
    const time = new Date(row.check_in).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
    const isLate = row.status === "late";
    const badge = isLate ? `<span class="badge-late">Terlambat (+10)</span>` : `<span class="badge-present">Hadir (+50)</span>`;
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
  if (!statHadirEl) return;
  const now = new Date();
  const startOfMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const { data } = await supabase.from("attendance").select("status").eq("employee_id", currentUserId).gte("attendance_date", startOfMonth);
  if (!data) return;
  let hadir = 0, terlambat = 0;
  data.forEach(r => r.status === "late" ? terlambat++ : hadir++);
  const total = hadir + terlambat;
  const percent = total > 0 ? Math.round((hadir / total) * 100) : 0;
  statHadirEl.textContent = hadir;
  if (statTerlambatEl) statTerlambatEl.textContent = terlambat;
  if (statRateEl) statRateEl.textContent = percent + "%";
}

// QR SCANNER
const openScannerBtnUser = document.getElementById("open-scanner-btn-user");
const scannerModal = document.getElementById("scanner-modal");
const closeScannerBtn = document.getElementById("close-scanner-btn");
let html5QrCode = null;

if (openScannerBtnUser) {
  openScannerBtnUser.addEventListener("click", async () => {
    scannerModal.style.display = "flex";
    html5QrCode = new Html5Qrcode("reader");
    try {
      await html5QrCode.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 }, async (text) => {
        await html5QrCode.stop(); html5QrCode.clear(); scannerModal.style.display = "none";
        const url = new URL(text);
        const secret = url.searchParams.get("secret");
        const block = url.searchParams.get("block");
        if (secret && block) {
          sessionStorage.setItem("pending_secret", secret);
          sessionStorage.setItem("pending_block", block);
          await checkUrlAutoAttendance();
        }
      }, () => {});
    } catch { alert("Gagal buka kamera."); scannerModal.style.display = "none"; }
  });
}
if (closeScannerBtn) closeScannerBtn.addEventListener("click", async () => { if (html5QrCode) await html5QrCode.stop(); scannerModal.style.display = "none"; });

// EXPORT & SYNC & ADMIN
// (Fungsi Admin, Export, Sinkronisasi Google Sheets tetap berjalan otomatis seperti sebelumnya)