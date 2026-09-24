import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// CONFIG SUPABASE
const SUPABASE_URL = "https://njdrnrnnlsrxdyugmsww.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qZHJucm5ubHNyeGR5dWdtc3d3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk5MDExNDEsImV4cCI6MjEwNTQ3NzE0MX0.F65pU2A3XjyEaisye2GfzLPF9DCaQF1fklMxgSTRhs8";
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const KIOSK_SECRET = "VIHARA_ZEN_SECRET_2026";

// ELEMEN DOM
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
const checkInButton = document.getElementById("check-in-button");
const attendanceMessage = document.getElementById("attendance-message");
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
// 1. AUTO CHECK-IN DARI URL QR
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
      
      // Cek apakah user sudah login atau belum
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Jika belum login, arahkan otomatis ke mode Register supaya buat akun
        if (!isRegisterMode) {
          toggleAuthBtn.click();
        }
        messageEl.textContent = "Silakan buat akun terlebih dahulu untuk menyelesaikan absensi Anda.";
        return; 
      }

      // Jika sudah login, eksekusi absen
      const { data, error } = await supabase.rpc("check_in");
      
      console.log("DEBUG CHECK-IN RESULT:", { data, error });

      if (!error && data && data.success) {
        alert("Absensi Berhasil via Scan Kamera!");
        await loadTodayStatus();
        await loadAttendanceHistory();
      } else {
        const errorMsg = error ? error.message : (data ? data.message : "Terjadi kesalahan sistem.");
        alert("Gagal Absen: " + errorMsg);
      }
      
      sessionStorage.removeItem("pending_secret");
      sessionStorage.removeItem("pending_block");

    } else {
      alert("Sesi QR Code sudah kedaluwarsa. Silakan scan ulang di kios.");
      sessionStorage.removeItem("pending_secret");
      sessionStorage.removeItem("pending_block");
    }
  }
}

// ==============================
// 2. AUTHENTICATION & SESSION
// ==============================
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

  messageEl.textContent = "Memproses...";

  if (isRegisterMode) {
    const name = registerNameInput.value.trim();
    if (!name) {
      messageEl.textContent = "Nama lengkap wajib diisi!";
      return;
    }

    // 1. Validasi karakter: Hanya boleh huruf dan spasi (tanpa angka/simbol)
    const nameRegex = /^[A-Za-z\s]+$/;
    if (!nameRegex.test(name)) {
      messageEl.textContent = "Nama lengkap hanya boleh berisi huruf dan spasi (tidak boleh ada angka/simbol).";
      return;
    }

    // 2. Cek apakah nama sudah terdaftar menggunakan fungsi RPC publik
    const { data: nameExists, error: rpcError } = await supabase.rpc("check_name_exists", {
      p_name: name
    });

    if (rpcError) {
      messageEl.textContent = "Gagal memvalidasi nama: " + rpcError.message;
      return;
    }

    if (nameExists) {
      messageEl.textContent = "Nama lengkap ini sudah terdaftar! Silakan gunakan nama lain.";
      return;
    }

    // 3. Jika nama unik dan bersih, lanjutkan proses pendaftaran (Sign Up)
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } }
    });

    if (signUpError) {
      messageEl.textContent = "Gagal mendaftar: " + signUpError.message;
      return;
    }

    // Cek apakah halaman ini dibuka dari scan QR Kios
    const hasQrParam = sessionStorage.getItem("pending_secret");

    if (hasQrParam) {
      messageEl.textContent = "Pendaftaran berhasil, masuk otomatis...";
      
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (loginError) {
        messageEl.textContent = "Gagal otomatis masuk: " + loginError.message;
        return;
      }

      messageEl.textContent = "";
      await loadUserProfile();
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      await checkUrlAutoAttendance();
      
    } else {
      messageEl.textContent = "Pendaftaran berhasil! Silakan login.";
      toggleAuthBtn.click();
      
    } else {
      messageEl.textContent = "Pendaftaran berhasil! Silakan login.";
      toggleAuthBtn.click();
    }
  } else {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      messageEl.textContent = "Login Gagal: " + error.message;
      return;
    }

    const user = data.user;
    
    if (user && !user.email_confirmed_at) {
      await supabase.auth.signOut();

      emailInput.style.display = "none";
      passwordInput.style.display = "none";
      authMainButton.style.display = "none";
      document.querySelector(".auth-toggle-box").style.display = "none";
      
      if (unverifiedSection) {
        unverifiedSection.style.display = "block";
      }
      
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
  const toggleBox = document.querySelector(".auth-toggle-box");
  if (toggleBox) toggleBox.style.display = "block";
  messageEl.textContent = "";
}

// ==============================
// 3. PROFILE & DASHBOARD USER
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
}

async function loadTodayStatus() {
  if (!todayStatusEl) return;
  todayStatusEl.innerHTML = "<p style='color: var(--text-sub);'>Memuat status...</p>";

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  
  const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());

  const { data, error } = await supabase
    .from("attendance")
    .select("check_in, status")
    .eq("employee_id", user.id)
    .eq("attendance_date", todayStr)
    .maybeSingle();

  if (error) {
    todayStatusEl.innerHTML = "<p style='color: var(--ios-red);'>Gagal memuat status.</p>";
    return;
  }

  if (data) {
    const time = new Date(data.check_in).toLocaleTimeString("id-ID", {
      hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta"
    });
    const badge = data.status === "late" 
      ? `<span class="badge-late">Terlambat</span>` 
      : `<span class="badge-present">Tepat Waktu</span>`;

    todayStatusEl.innerHTML = `
      <div style="font-size: 15px; font-weight: 700; margin-bottom: 4px;">Sudah Absen</div>
      <div style="font-size: 12px; color: var(--text-sub); margin-bottom: 8px;">Pukul ${time} WIB</div>
      <div>${badge}</div>
    `;
  } else {
    todayStatusEl.innerHTML = `
      <div style="font-size: 15px; font-weight: 700; color: var(--ios-red); margin-bottom: 4px;">Belum Absen</div>
      <div style="font-size: 12px; color: var(--text-sub);">Silakan scan QR di lokasi.</div>
    `;
  }
}

async function loadAttendanceHistory() {
  if (!attendanceHistory) return;
  attendanceHistory.innerHTML = "<p style='color: var(--text-sub);'>Memuat riwayat...</p>";

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data, error } = await supabase
    .from("attendance")
    .select("attendance_date, check_in, status")
    .eq("employee_id", user.id)
    .order("attendance_date", { ascending: false });

  if (error || !data || data.length === 0) {
    attendanceHistory.innerHTML = `
      <div style="text-align: center; padding: 16px 10px;">
        <p style="font-size: 13px; color: var(--text-sub); margin: 0; font-weight: 500;">Belum ada riwayat.</p>
      </div>
    `;
    return;
  }

  attendanceHistory.innerHTML = "";

  data.forEach((row) => {
    const date = new Date(row.attendance_date + "T00:00:00").toLocaleDateString("id-ID", {
      day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta"
    });

    const time = new Date(row.check_in).toLocaleTimeString("id-ID", {
      hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta"
    });

    const isLate = row.status === "late";
    const statusBadge = isLate 
      ? `<span class="badge-late">Terlambat</span>` 
      : `<span class="badge-present">Hadir</span>`;

    const item = document.createElement("div");
    item.className = "history-item";
    item.innerHTML = `
      <div style="display: flex; align-items: center; gap: 12px;">
        <svg width="18" height="18" stroke="var(--ios-blue)" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
        <div>
          <strong style="font-size: 14px; color: var(--text-main);">${date}</strong>
          <div style="font-size: 11px; color: var(--text-sub); margin-top: 2px;">Pukul ${time} WIB</div>
        </div>
      </div>
      <div>${statusBadge}</div>
    `;

    attendanceHistory.appendChild(item);
  });
}

// ==============================
// 4. ADMIN PANEL & MANAGEMENT
// ==============================
if (switchToAdminBtn) {
  switchToAdminBtn.addEventListener("click", async () => {
    userSection.style.display = "none";
    adminSection.style.display = "block";

    const todayWIB = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
    if (adminFilterDate) {
      adminFilterDate.value = todayWIB;
    }

    await loadAdminAttendance();
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

async function loadAdminAttendance() {
  if (!adminAttendanceList) return;
  adminAttendanceList.innerHTML = "<p style='color: var(--text-sub);'>Memuat rekap...</p>";

  const todayWIB = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());

  if (adminFilterDate && !adminFilterDate.value) {
    adminFilterDate.value = todayWIB;
  }

  const selectedDate = adminFilterDate.value;
  const selectedStatus = adminFilterStatus.value;

  let query = supabase
    .from("attendance")
    .select("id, attendance_date, check_in, status, employees(name, employee_code)")
    .order("check_in", { ascending: false });

  if (selectedDate) {
    query = query.eq("attendance_date", selectedDate);
  }

  if (selectedStatus !== "ALL") {
    query = query.eq("status", selectedStatus);
  }

  const { data, error } = await query;

  if (error || !data) {
    adminAttendanceList.innerHTML = "<p style='color: var(--ios-red);'>Gagal memuat rekap.</p>";
    return;
  }

  if (data.length === 0) {
    adminAttendanceList.innerHTML = "<p style='color: var(--text-sub); text-align: center; padding: 15px;'>Tidak ada data.</p>";
    return;
  }

  adminAttendanceList.innerHTML = "";

  data.forEach((row) => {
    const date = new Date(row.attendance_date + "T00:00:00").toLocaleDateString("id-ID", {
      day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta"
    });

    const time = new Date(row.check_in).toLocaleTimeString("id-ID", {
      hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta"
    });

    const empName = row.employees ? row.employees.name : "Member (Dihapus)";
    const empCode = row.employees ? row.employees.employee_code : "-";

    const isLate = row.status === "late";
    const statusBadge = isLate 
      ? `<span class="badge-late">Terlambat</span>` 
      : `<span class="badge-present">Hadir</span>`;

    const item = document.createElement("div");
    item.className = "history-item";
    item.innerHTML = `
      <div>
        <strong style="font-size: 14px; color: var(--text-main);">${empName}</strong> 
        <span style="font-size: 11px; color: var(--text-sub);">(${empCode})</span>
        <div style="font-size: 11px; color: var(--text-sub); margin-top: 2px;">${date} &bull; Pukul ${time} WIB</div>
      </div>
      <div>${statusBadge}</div>
    `;

    adminAttendanceList.appendChild(item);
  });
}

async function loadEmployeeManagement() {
  if (!adminEmployeeList) return;
  adminEmployeeList.innerHTML = "<p style='color: var(--text-sub);'>Memuat anggota...</p>";

  const { data, error } = await supabase
    .from("employees")
    .select("id, name, employee_code, role, is_active")
    .order("name", { ascending: true });

  if (error) {
    adminEmployeeList.innerHTML = "<p style='color: var(--ios-red);'>Gagal memuat anggota.</p>";
    return;
  }

  adminEmployeeList.innerHTML = "";

  data.forEach((emp) => {
    const isActive = emp.is_active !== false;
    const statusBadge = isActive 
      ? `<span class="badge-active">Aktif</span>` 
      : `<span class="badge-inactive">Nonaktif</span>`;

    const roleBadge = (emp.role === "admin" || emp.role === "adm1n")
      ? `<span class="role-badge role-admin">${emp.role.toUpperCase()}</span>`
      : `<span class="role-badge role-user">MEMBER</span>`;

    const card = document.createElement("div");
    card.className = "emp-card-item";
    
    card.innerHTML = `
      <div>
        <div class="emp-name-title">
          ${emp.name}
          ${roleBadge}
          ${statusBadge}
        </div>
        <div class="emp-code-sub">Kode: <strong>${emp.employee_code}</strong></div>
      </div>
      <button class="secondary-button edit-btn-style" type="button" style="padding: 6px 14px; font-size: 12px;">Edit</button>
    `;

    const editBtn = card.querySelector(".edit-btn-style");
    editBtn.addEventListener("click", () => {
      editEmpId.value = emp.id;
      editEmpName.value = emp.name;
      editEmpCode.value = emp.employee_code;
      editEmpRole.value = emp.role;
      editEmpActive.value = isActive ? "true" : "false";
      if (editModalMsg) editModalMsg.textContent = "";
      editEmpModal.style.display = "flex";
    });

    adminEmployeeList.appendChild(card);
  });
}

if (cancelEditEmp) {
  cancelEditEmp.addEventListener("click", () => {
    editEmpModal.style.display = "none";
  });
}

if (saveEditEmp) {
  saveEditEmp.addEventListener("click", async () => {
    const id = editEmpId.value;
    const name = editEmpName.value.trim();
    const code = editEmpCode.value.trim();
    const role = editEmpRole.value;
    const isActive = editEmpActive.value === "true";

    if (!name || !code) {
      editModalMsg.textContent = "Nama dan Kode wajib diisi!";
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { data: currentUserData } = await supabase
      .from("employees")
      .select("role")
      .eq("id", user.id)
      .single();

    if (currentUserData.role !== "adm1n") {
      const { data: targetUserData } = await supabase
        .from("employees")
        .select("role")
        .eq("id", id)
        .single();

      if (targetUserData.role !== role) {
        editModalMsg.textContent = "Hanya Adm1n yang bisa mengubah Role!";
        return;
      }
    }

    editModalMsg.textContent = "Menyimpan...";

    const { error } = await supabase
      .from("employees")
      .update({ name, employee_code: code, role, is_active: isActive })
      .eq("id", id);

    if (error) {
      editModalMsg.textContent = "Gagal: " + error.message;
    } else {
      editModalMsg.textContent = "Berhasil!";
      setTimeout(() => {
        editEmpModal.style.display = "none";
        loadEmployeeManagement();
      }, 800);
    }
  });
}

if (exportCsvBtn) {
  exportCsvBtn.addEventListener("click", async () => {
    const { data, error } = await supabase
      .from("attendance")
      .select("attendance_date, check_in, status, employees(name, employee_code)")
      .order("attendance_date", { ascending: false });

    if (error || !data) {
      alert("Gagal mengambil data ekspor.");
      return;
    }

    const excelData = data.map((row) => ({
      Tanggal: row.attendance_date,
      "Nama Anggota": row.employees ? row.employees.name : "N/A",
      "Kode Anggota": row.employees ? row.employees.employee_code : "N/A",
      "Jam Absen": new Date(row.check_in).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta" }),
      Status: row.status === "late" ? "Terlambat" : "Tepat Waktu",
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Presensi");
    XLSX.writeFile(workbook, `Rekap_Presensi_Mudiviverse_${new Date().toISOString().split("T")[0]}.xlsx`);
  });
}

// ==========================================
// 5. EVENT LISTENER POS SEMENTARA (UNVERIFIED)
// ==========================================
document.getElementById('btn-backend-login')?.addEventListener('click', () => {
  if (unverifiedSection) unverifiedSection.style.display = "none";
  emailInput.style.display = "block";
  passwordInput.style.display = "block";
  authMainButton.style.display = "block";
  const toggleBox = document.querySelector(".auth-toggle-box");
  if (toggleBox) toggleBox.style.display = "block";
  messageEl.textContent = "";
});

document.getElementById('btn-back-login')?.addEventListener('click', () => {
  if (unverifiedSection) unverifiedSection.style.display = "none";
  emailInput.style.display = "block";
  passwordInput.style.display = "block";
  authMainButton.style.display = "block";
  const toggleBox = document.querySelector(".auth-toggle-box");
  if (toggleBox) toggleBox.style.display = "block";
  messageEl.textContent = "";
});

document.getElementById('btn-resend')?.addEventListener('click', async () => {
  if (!window.pendingVerificationEmail) {
    alert("Email tidak ditemukan. Silakan coba login ulang.");
    return;
  }
  
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: window.pendingVerificationEmail,
  });

  if (error) {
    alert("Gagal mengirim ulang: " + error.message);
  } else {
    alert("Email verifikasi baru telah dikirim! Silakan cek inbox/spam kamu.");
  }
});



// ==============================
// 6. BUILT-IN QR CAMERA SCANNER
// ==============================
const openScannerBtn = document.getElementById("open-scanner-btn");
const scannerModal = document.getElementById("scanner-modal");
const closeScannerBtn = document.getElementById("close-scanner-btn");
let html5QrCode = null;

if (openScannerBtn) {
  openScannerBtn.addEventListener("click", async () => {
    scannerModal.style.display = "flex";
    
    // Inisialisasi scanner pada elemen dengan id="reader"
    html5QrCode = new Html5Qrcode("reader");
    
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    try {
      await html5QrCode.start(
        { facingMode: "environment" }, // Gunakan kamera belakang HP
        config,
        async (decodedText) => {
          // Berhasil scan! decodedText berisi URL lengkap dari QR Kios
          console.log("QR Terdeteksi:", decodedText);
          
          // Hentikan kamera
          await html5QrCode.stop();
          html5QrCode.clear();
          scannerModal.style.display = "none";
          
          // Ambil parameter secret dan block dari URL hasil scan
          try {
            const urlObj = new URL(decodedText);
            const secret = urlObj.searchParams.get("secret");
            const block = urlObj.searchParams.get("block");
            
            if (secret && block) {
              sessionStorage.setItem("pending_secret", secret);
              sessionStorage.setItem("pending_block", block);
              
              // Jalankan fungsi auto attendance
              await checkUrlAutoAttendance();
            } else {
              alert("QR Code tidak valid untuk presensi Mudiviverse.");
            }
          } catch (e) {
            alert("Format QR Code tidak dikenali.");
          }
        },
        (errorMessage) => {
          // Error saat proses scanning bingkai (biasanya diabaikan karena berjalan terus mencari QR)
        }
      );
    } catch (err) {
      alert("Gagal membuka kamera. Pastikan izin akses kamera diaktifkan di browser Anda.");
      console.error(err);
      scannerModal.style.display = "none";
    }
  });
}

if (closeScannerBtn) {
  closeScannerBtn.addEventListener("click", async () => {
    if (html5QrCode && html5QrCode.isScanning) {
      await html5QrCode.stop();
      html5QrCode.clear();
    }
    scannerModal.style.display = "none";
  });
}