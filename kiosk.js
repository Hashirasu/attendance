// Konfigurasi Kios
const KIOSK_SECRET = "MUDIVIVAVVBN"; // Key rahasia
const INTERVAL_SECONDS = 15; // Berubah tiap 15 detik

const qrContainer = document.getElementById("qrcode");
const timerBar = document.getElementById("timer-bar");
const timerText = document.getElementById("timer-text");

// Init QRCode JS Library
const qrcode = new QRCode(qrContainer, {
  width: 220,
  height: 220,
  colorDark: "#2d4334",
  colorLight: "#ffffff",
  correctLevel: QRCode.CorrectLevel.H
});

let countdown = INTERVAL_SECONDS;

function updateQRCode() {
  const unixTimestamp = Math.floor(Date.now() / 1000);
  const timeBlock = Math.floor(unixTimestamp / INTERVAL_SECONDS);
  
  // Buat Payload Unik per 15 detik
  const payload = JSON.stringify({
    secret: KIOSK_SECRET,
    block: timeBlock,
    ts: unixTimestamp
  });

  qrcode.clear();
  qrcode.makeCode(payload);
}

// Timer Loop
function startTimer() {
  updateQRCode();
  
  setInterval(() => {
    countdown--;
    
    // Update visual progress bar
    const percentage = (countdown / INTERVAL_SECONDS) * 100;
    timerBar.style.width = `${percentage}%`;
    timerText.textContent = `Memperbarui dalam ${countdown}s`;

    if (countdown <= 0) {
      countdown = INTERVAL_SECONDS;
      updateQRCode(); // QR Otomatis berganti gambar!
    }
  }, 1000);
}

// Jalankan saat halaman dibuka
window.addEventListener("DOMContentLoaded", startTimer);