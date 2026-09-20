const KIOSK_SECRET = "VIHARA_ZEN_SECRET_2026";
const INTERVAL_SECONDS = 15;

const qrContainer = document.getElementById("qrcode");
const timerBar = document.getElementById("timer-bar");
const timerText = document.getElementById("timer-text");

const qrcode = new QRCode(qrContainer, {
  width: 220,
  height: 220,
  colorDark: "#30452d",
  colorLight: "#ffffff",
  correctLevel: QRCode.CorrectLevel.H
});

let countdown = INTERVAL_SECONDS;

function updateQRCode() {
  const unixTimestamp = Math.floor(Date.now() / 1000);
  const timeBlock = Math.floor(unixTimestamp / INTERVAL_SECONDS);
  
  // Dapatkan URL Domain utama kamu (cth: https://namadomain.vercel.app)
  const baseUrl = window.location.origin;
  
  // Buat URL lengkap dengan query parameter token
  const qrUrl = `${baseUrl}/?secret=${KIOSK_SECRET}&block=${timeBlock}`;

  qrcode.clear();
  qrcode.makeCode(qrUrl);
}

function startTimer() {
  updateQRCode();
  
  setInterval(() => {
    countdown--;
    const percentage = (countdown / INTERVAL_SECONDS) * 100;
    if (timerBar) timerBar.style.width = `${percentage}%`;
    if (timerText) timerText.textContent = `Memperbarui dalam ${countdown}s`;

    if (countdown <= 0) {
      countdown = INTERVAL_SECONDS;
      updateQRCode();
    }
  }, 1000);
}

window.addEventListener("DOMContentLoaded", startTimer);