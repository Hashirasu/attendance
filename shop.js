import { supabase } from "./app.js";

// =========================================
// 1. TOKO FISIK (REAL ITEMS) & PUBLISH ADMIN
// =========================================
export async function getRealItems() {
  const { data, error } = await supabase
    .from("real_shop_items")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return [];
  return data || [];
}

export async function renderRealItems() {
  const container = document.getElementById("real-shop-item-list");
  if (!container) return;

  container.innerHTML = "<p style='text-align:center; color:var(--text-sub); font-size:12px; grid-column:1/-1;'>Memuat barang...</p>";

  const items = await getRealItems();
  if (!items || items.length === 0) {
    container.innerHTML = "<p style='text-align:center; color:var(--text-sub); font-size:12px; grid-column:1/-1;'>Belum ada barang fisik untuk ditukarkan.</p>";
    return;
  }

  container.innerHTML = "";
  items.forEach(item => {
    const card = document.createElement("div");
    card.className = "shop-item-card";
    card.innerHTML = `
      <img src="${item.image_url || 'https://via.placeholder.com/150'}" class="real-item-img" alt="${item.title}">
      <div class="shop-item-info" style="margin-top:8px;">
        <h4>${item.title}</h4>
        <p style="font-size:11px; color:var(--text-sub); margin:4px 0;">${item.description || 'Tidak ada deskripsi.'}</p>
        <p style="font-size:10px; color:var(--text-sub); margin-bottom:4px;">Stok: ${item.stock}</p>
        <p class="shop-item-price">🪙 ${item.price_points} Poin</p>
      </div>
      <button class="btn-redeem-real" data-id="${item.id}" data-price="${item.price_points}" data-stock="${item.stock}" ${item.stock <= 0 ? 'disabled' : ''}>
        ${item.stock > 0 ? 'Tukar Barang' : 'Stok Habis'}
      </button>
    `;
    container.appendChild(card);
  });
}

export async function publishRealItem(adminId, title, description, pricePoints, stock, fileImage) {
  let imageUrl = "https://via.placeholder.com/150";

  if (fileImage) {
    const fileExt = fileImage.name.split('.').pop();
    const filePath = `real_items/item_${Date.now()}.${fileExt}`;

    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(filePath, fileImage, { upsert: true });

    if (uploadErr) {
      alert("Gagal mengunggah gambar barang: " + uploadErr.message);
      return false;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    imageUrl = publicUrl;
  }

  const { error } = await supabase.from("real_shop_items").insert({
    title,
    description,
    price_points: pricePoints,
    stock,
    image_url: imageUrl,
    created_by: adminId
  });

  if (error) {
    alert("Gagal publish barang: " + error.message);
    return false;
  }
  return true;
}

export async function redeemRealItem(userId, itemId, pricePoints, currentPoints) {
  if (currentPoints < pricePoints) {
    alert("Poin kamu tidak cukup untuk menukarkan barang ini!");
    return false;
  }

  const { data: item } = await supabase.from("real_shop_items").select("stock, title").eq("id", itemId).single();
  if (!item || item.stock <= 0) {
    alert("Stok barang sudah habis!");
    return false;
  }

  const newPoints = currentPoints - pricePoints;
  const newStock = item.stock - 1;

  const { error: pointsErr } = await supabase.from("employees").update({ points: newPoints }).eq("id", userId);
  if (pointsErr) {
    alert("Gagal memotong poin: " + pointsErr.message);
    return false;
  }

  await supabase.from("real_shop_items").update({ stock: newStock }).eq("id", itemId);
  await supabase.from("redemption_logs").insert({
    user_id: userId,
    item_id: itemId,
    item_title: item.title,
    points_used: pricePoints
  });

  alert(`🎁 Berhasil menukarkan ${item.title}! Silakan hubungi pengurus Vihara.`);
  return true;
}

// =========================================
// 2. KUSTOMISASI AVATAR (BASIC + CLOTHING)
// =========================================
export let currentAvatarConfig = {
  skin: "#fcd34d",
  face: "😃",
  headwear: "",
  outfit: "👕",
  pants: "JB"
};

export async function loadUserAvatarConfig(userId) {
  const { data } = await supabase
    .from("user_avatar_config")
    .select("config")
    .eq("user_id", userId)
    .maybeSingle();

  if (data && data.config) {
    currentAvatarConfig = { ...currentAvatarConfig, ...data.config };
  }
  renderAvatarDisplay();
}

export function renderAvatarDisplay() {
  const bodyBase = document.getElementById("avatar-base-body");
  const faceEl = document.getElementById("avatar-layer-face");
  const headwearEl = document.getElementById("avatar-layer-headwear");
  const outfitEl = document.getElementById("avatar-layer-outfit");
  const pantsEl = document.getElementById("avatar-layer-pants");

  if (bodyBase) bodyBase.style.backgroundColor = currentAvatarConfig.skin || "#fcd34d";
  if (faceEl) faceEl.textContent = currentAvatarConfig.face || "😃";
  if (headwearEl) headwearEl.textContent = currentAvatarConfig.headwear || "";
  if (outfitEl) outfitEl.textContent = currentAvatarConfig.outfit || "👕";
  if (pantsEl) pantsEl.textContent = currentAvatarConfig.pants || "👖";
}

export async function saveUserAvatarConfig(userId) {
  const { error } = await supabase
    .from("user_avatar_config")
    .upsert({ user_id: userId, config: currentAvatarConfig });

  if (error) {
    alert("Gagal menyimpan kustomisasi avatar: " + error.message);
  } else {
    alert("✅ Tampilan Avatar berhasil disimpan!");
  }
}

export async function addNewCatalogItem(name, category, price, assetValue) {
  const { error } = await supabase.from("avatar_catalog").insert({
    name, category, price_points: price, asset_value: assetValue
  });
  if (error) {
    alert("Gagal menambah item catalog: " + error.message);
    return false;
  }
  alert("✅ Item aksesoris/pakaian baru berhasil ditambahkan!");
  return true;
}