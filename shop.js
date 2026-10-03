import { supabase } from "./app.js";

export const SHOP_ITEMS = [
  { id: "hat_cap", name: "Topi Kasual", type: "headwear", price: 50, icon: "🧢" },
  { id: "hat_crown", name: "Mahkota Raja", type: "headwear", price: 150, icon: "👑" },
  { id: "glasses_sun", name: "Kacamata Hitam", type: "eyewear", price: 40, icon: "🕶️" },
  { id: "outfit_kimono", name: "Kimono Tradisional", type: "outfit", price: 100, icon: "👘" },
  { id: "outfit_suit", name: "Setelan Jas", type: "outfit", price: 120, icon: "👔" }
];

let userOwnedItems = [];
let userEquippedItems = {};

export async function loadUserShopData(userId) {
  if (!userId) return;

  const { data: inventory } = await supabase
    .from("user_inventory")
    .select("item_id")
    .eq("user_id", userId);

  if (inventory) {
    userOwnedItems = inventory.map(item => item.item_id);
  }

  const { data: equipped } = await supabase
    .from("user_equipped")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (equipped) {
    userEquippedItems = equipped.items || {};
  }

  renderShopItems();
  renderAvatarPreview();
}

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

export async function buyShopItem(userId, itemId, itemPrice, currentPoints) {
  if (currentPoints < itemPrice) {
    alert("Poin kamu tidak mencukupi!");
    return false;
  }

  const newPoints = currentPoints - itemPrice;

  const { error: pointsErr } = await supabase
    .from("employees")
    .update({ points: newPoints })
    .eq("id", userId);

  if (pointsErr) {
    alert("Gagal memproses pembelian: " + pointsErr.message);
    return false;
  }

  const { error: invErr } = await supabase
    .from("user_inventory")
    .insert({ user_id: userId, item_id: itemId });

  if (invErr) {
    alert("Gagal menyimpan item: " + invErr.message);
    return false;
  }

  userOwnedItems.push(itemId);
  alert("🎉 Pembelian kostum berhasil!");
  return true;
}

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
    alert("Gagal update pakaian: " + error.message);
  } else {
    renderShopItems();
    renderAvatarPreview();
  }
}

export function renderAvatarPreview() {
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

// =========================================
// FITUR BARANG PHYSICAL / HADIAH REAL
// =========================================
export async function publishRealItem(adminId, title, pricePoints, stock, imageUrl) {
  const { error } = await supabase.from("real_shop_items").insert({
    title,
    price_points: pricePoints,
    stock,
    image_url: imageUrl || "https://via.placeholder.com/150",
    created_by: adminId
  });

  if (error) {
    alert("Gagal publish barang: " + error.message);
    return false;
  }
  return true;
}

export async function getRealItems() {
  const { data, error } = await supabase.from("real_shop_items").select("*").order("created_at", { ascending: false });
  if (error) return [];
  return data || [];
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

  alert(`🎁 Berhasil menukarkan ${item.title}! Silakan hubungi pengurus untuk mengambil barang.`);
  return true;
}