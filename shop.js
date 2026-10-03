/* =========================================
   MUDIVIVERSE - SHOP & AVATAR SYSTEM
========================================= */
import { supabase } from "./app.js";

// Daftar item toko (bisa ditambah sesuai kebutuhan)
export const SHOP_ITEMS = [
  { id: "hat_cap", name: "Topi Kasual", type: "headwear", price: 50, icon: "🧢" },
  { id: "hat_crown", name: "Mahkota Raja", type: "headwear", price: 150, icon: "👑" },
  { id: "glasses_sun", name: "Kacamata Hitam", type: "eyewear", price: 40, icon: "🕶️" },
  { id: "outfit_kimono", name: "Kimono Tradisional", type: "outfit", price: 100, icon: "👘" },
  { id: "outfit_suit", name: "Setelan Jas", type: "outfit", price: 120, icon: "👔" }
];

let userOwnedItems = [];
let userEquippedItems = {};

// Memuat data inventaris dan item yang terpasang dari Supabase
export async function loadUserShopData(userId) {
  if (!userId) return;

  // Fetch item yang dimiliki
  const { data: inventory } = await supabase
    .from("user_inventory")
    .select("item_id")
    .eq("user_id", userId);

  if (inventory) {
    userOwnedItems = inventory.map(item => item.item_id);
  }

  // Fetch item yang sedang dipakai
  const { data: equipped } = await supabase
    .from("user_equipped")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (equipped) {
    userEquippedItems = equipped.items || {};
  }

  renderShopItems();
  renderAvatarPreview();
}

// Menampilkan daftar item di toko & inventaris
export function renderShopItems() {
  const shopContainer = document.getElementById("shop-item-list");
  if (!shopContainer) return;

  shopContainer.innerHTML = "";

  SHOP_ITEMS.forEach(item => {
    const isOwned = userOwnedItems.includes(item.id);
    const isEquipped = Object.values(userEquippedItems).includes(item.id);

    const card = document.createElement("div");
    card.className = `shop-item-card ${isOwned ? "owned" : ""}`;
    card.innerHTML = `
      <div class="shop-item-icon">${item.icon}</div>
      <div class="shop-item-info">
        <h4>${item.name}</h4>
        <p class="shop-item-price">🪙 ${item.price} Poin</p>
      </div>
      <div class="shop-item-action">
        ${
          !isOwned
            ? `<button class="btn-buy-item" data-id="${item.id}" data-price="${item.price}">Beli</button>`
            : isEquipped
            ? `<button class="btn-unequip-item" data-id="${item.id}" data-type="${item.type}">Lepas</button>`
            : `<button class="btn-equip-item" data-id="${item.id}" data-type="${item.type}">Pakai</button>`
        }
      </div>
    `;
    shopContainer.appendChild(card);
  });
}

// Beli Item
export async function buyShopItem(userId, itemId, itemPrice, currentPoints) {
  if (currentPoints < itemPrice) {
    alert("Poin kamu tidak mencukupi untuk membeli item ini!");
    return false;
  }

  const newPoints = currentPoints - itemPrice;

  // 1. Kurangi Poin
  const { error: pointsErr } = await supabase
    .from("employees")
    .update({ points: newPoints })
    .eq("id", userId);

  if (pointsErr) {
    alert("Gagal memproses pembelian: " + pointsErr.message);
    return false;
  }

  // 2. Tambahkan ke Inventaris
  const { error: invErr } = await supabase
    .from("user_inventory")
    .insert({ user_id: userId, item_id: itemId });

  if (invErr) {
    alert("Gagal menyimpan item ke inventaris: " + invErr.message);
    return false;
  }

  userOwnedItems.push(itemId);
  alert("🎉 Pembelian berhasil!");
  return true;
}

// Pakai / Lepas Item
export async function toggleEquipItem(userId, itemId, itemType, isEquip = true) {
  if (isEquip) {
    userEquippedItems[itemType] = itemId;
  } else {
    delete userEquippedItems[itemType];
  }

  const { error } = await supabase
    .from("user_equipped")
    .upsert({ user_id: userId, items: userEquippedItems }, { onConflict: "user_id" });

  if (error) {
    alert("Gagal mengupdate pakaian avatar: " + error.message);
  } else {
    renderShopItems();
    renderAvatarPreview();
  }
}

// Render tampilan avatar sesuai item yang dipasang
export function renderAvatarPreview() {
  const avatarStage = document.getElementById("avatar-chara-stage");
  if (!avatarStage) return;

  const equippedOverlay = document.getElementById("avatar-equipped-overlay");
  if (!equippedOverlay) return;

  equippedOverlay.innerHTML = "";

  Object.values(userEquippedItems).forEach(itemId => {
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (item) {
      const layer = document.createElement("span");
      layer.className = `avatar-layer layer-${item.type}`;
      layer.textContent = item.icon;
      equippedOverlay.appendChild(layer);
    }
  });
}