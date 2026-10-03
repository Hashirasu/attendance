import { supabase } from "./app.js";

// =========================================
// 1. DATA MASTER POKEMON (GEN 1 - 6) & SCENERY
// =========================================
export const FREE_STARTER_POKEMON = [
  { id: "p-1", name: "Bulbasaur", gen: 1, price: 0, img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png" },
  { id: "p-152", name: "Chikorita", gen: 2, price: 0, img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/152.png" },
  { id: "p-252", name: "Treecko", gen: 3, price: 0, img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/252.png" },
  { id: "p-387", name: "Turtwig", gen: 4, price: 0, img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/387.png" },
  { id: "p-495", name: "Snivy", gen: 5, price: 0, img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/495.png" },
  { id: "p-650", name: "Chespin", gen: 6, price: 0, img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/650.png" }
];

export const ALL_SHOP_POKEMON = [
  ...FREE_STARTER_POKEMON,
  { id: "p-4", name: "Charmander", gen: 1, price: 50, img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/4.png" },
  { id: "p-7", name: "Squirtle", gen: 1, price: 50, img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/7.png" },
  { id: "p-25", name: "Pikachu", gen: 1, price: 100, img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png" },
  { id: "p-155", name: "Cyndaquil", gen: 2, price: 50, img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/155.png" },
  { id: "p-158", name: "Totodile", gen: 2, price: 50, img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/158.png" },
  { id: "p-255", name: "Torchic", gen: 3, price: 50, img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/255.png" },
  { id: "p-258", name: "Mudkip", gen: 3, price: 50, img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/258.png" },
  { id: "p-390", name: "Chimchar", gen: 4, price: 60, img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/390.png" },
  { id: "p-393", name: "Piplup", gen: 4, price: 60, img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/393.png" },
  { id: "p-498", name: "Tepig", gen: 5, price: 60, img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/498.png" },
  { id: "p-501", name: "Oshawott", gen: 5, price: 60, img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/501.png" },
  { id: "p-653", name: "Fennekin", gen: 6, price: 70, img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/653.png" },
  { id: "p-656", name: "Froakie", gen: 6, price: 70, img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/656.png" },
  { id: "p-133", name: "Eevee", gen: 1, price: 120, img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/133.png" },
  { id: "p-150", name: "Mewtwo", gen: 1, price: 300, img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/150.png" },
  { id: "p-384", name: "Rayquaza", gen: 3, price: 350, img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/384.png" },
  { id: "p-448", name: "Lucario", gen: 4, price: 200, img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/448.png" },
  { id: "p-658", name: "Greninja", gen: 6, price: 220, img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/658.png" }
];

export const ALL_SHOP_SCENERY = [
  { id: "sc-default", title: "Default Nature", price: 0, url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1000&q=80" },
  { id: "sc-vihara-zen", title: "Vihara Zen Garden", price: 80, url: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1000&q=80" },
  { id: "sc-sakura-park", title: "Sakura Blossom Park", price: 100, url: "https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=1000&q=80" },
  { id: "sc-night-shrine", title: "Night Temple Shrine", price: 150, url: "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=1000&q=80" },
  { id: "sc-mountain-mist", title: "Mountain Peak Mist", price: 120, url: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=80" }
];

// =========================================
// 2. TOKO FISIK REAL ITEMS (PUBLISH, DELETE, REDEEM)
// =========================================
export async function getRealItems() {
  const { data, error } = await supabase
    .from("real_shop_items")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return [];
  return data || [];
}

export async function renderRealItems(currentUserRole) {
  const container = document.getElementById("real-shop-item-list");
  if (!container) return;

  container.innerHTML = "<p style='text-align:center; color:var(--text-sub); font-size:12px; grid-column:1/-1;'>Memuat barang...</p>";

  const items = await getRealItems();
  if (!items || items.length === 0) {
    container.innerHTML = "<p style='text-align:center; color:var(--text-sub); font-size:12px; grid-column:1/-1;'>Belum ada barang fisik untuk ditukarkan.</p>";
    return;
  }

  const isAdmin = currentUserRole === "admin" || currentUserRole === "adm1n";

  container.innerHTML = "";
  items.forEach(item => {
    const card = document.createElement("div");
    card.className = "shop-item-card";
    card.innerHTML = `
      <img src="${item.image_url || 'https://via.placeholder.com/150'}" class="real-item-img" alt="${item.title}">
      <div class="shop-item-info" style="margin-top:8px; text-align:left; width:100%;">
        <h4 style="font-size:13px; font-weight:700; color:var(--text-main); margin-bottom:2px;">${item.title}</h4>
        <p style="font-size:11px; color:var(--text-sub); margin:4px 0; line-height:1.3;">${item.description || 'Tidak ada deskripsi.'}</p>
        <p style="font-size:11px; color:#f59e0b; font-weight:700;">🪙 ${item.price_points} Poin / pcs</p>
        <p style="font-size:10px; color:var(--text-sub); margin-bottom:8px;">Sisa Stok: <strong>${item.stock}</strong></p>
        
        <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(255,255,255,0.08); border-radius:8px; padding:4px 8px; margin-bottom:8px;">
          <label style="font-size:10px; color:var(--text-sub);">Beli Qty:</label>
          <div style="display:flex; align-items:center;">
            <button class="btn-qty-minus" data-id="${item.id}" data-price="${item.price_points}" style="background:none; border:none; color:white; font-weight:800; padding:2px 6px; cursor:pointer;">-</button>
            <span id="qty-count-${item.id}" style="font-size:12px; font-weight:700; padding:0 8px;">1</span>
            <button class="btn-qty-plus" data-id="${item.id}" data-price="${item.price_points}" data-stock="${item.stock}" style="background:none; border:none; color:white; font-weight:800; padding:2px 6px; cursor:pointer;">+</button>
          </div>
        </div>

        <p style="font-size:11px; font-weight:800; color:var(--text-main); margin-bottom:8px;">Total: 🪙 <span id="total-price-${item.id}">${item.price_points}</span> Poin</p>
      </div>

      <button class="btn-redeem-real" data-id="${item.id}" data-price="${item.price_points}" ${item.stock <= 0 ? 'disabled' : ''}>
        ${item.stock > 0 ? '🎁 Tukar Barang' : 'Stok Habis'}
      </button>

      ${isAdmin ? `
        <div style="display:flex; gap:4px; margin-top:8px; width:100%;">
          <button class="btn-edit-item secondary-button-sm" data-id="${item.id}" data-title="${item.title}" data-desc="${item.description || ''}" data-price="${item.price_points}" data-stock="${item.stock}" style="flex:1; font-size:10px;">✏️ Edit</button>
          <button class="btn-delete-item secondary-button-sm" data-id="${item.id}" style="flex:1; font-size:10px; background:rgba(239,68,68,0.2); color:#f87171; border:none;">🗑️ Hapus</button>
        </div>
        <button class="btn-check-redemptions secondary-button-sm" data-id="${item.id}" style="width:100%; margin-top:4px; font-size:10px; color:#60a5fa;">📋 Cek Penukar</button>
      ` : ''}
    `;
    container.appendChild(card);
  });
}

export async function publishRealItem(adminId, title, description, pricePoints, stock, fileImage, editItemId = null) {
  let imageUrl = null;

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

  if (editItemId) {
    const updatePayload = { title, description, price_points: pricePoints, stock };
    if (imageUrl) updatePayload.image_url = imageUrl;

    const { error } = await supabase.from("real_shop_items").update(updatePayload).eq("id", editItemId);
    if (error) {
      alert("Gagal mengedit barang: " + error.message);
      return false;
    }
  } else {
    const { error } = await supabase.from("real_shop_items").insert({
      title, description, price_points: pricePoints, stock,
      image_url: imageUrl || 'https://via.placeholder.com/150',
      created_by: adminId
    });

    if (error) {
      alert("Gagal publish barang: " + error.message);
      return false;
    }
  }
  return true;
}

export async function deleteRealItem(itemId) {
  const { error } = await supabase.from("real_shop_items").delete().eq("id", itemId);
  if (error) {
    alert("Gagal menghapus barang: " + error.message);
    return false;
  }
  return true;
}

export async function redeemRealItem(userId, itemId, quantity, totalPoints, currentPoints) {
  if (currentPoints < totalPoints) {
    alert("Poin kamu tidak cukup!");
    return false;
  }

  const { data: item } = await supabase.from("real_shop_items").select("stock, title").eq("id", itemId).single();
  if (!item || item.stock < quantity) {
    alert("Stok barang tidak mencukupi!");
    return false;
  }

  const newPoints = currentPoints - totalPoints;
  const newStock = item.stock - quantity;

  const { error: pointsErr } = await supabase.from("employees").update({ points: newPoints }).eq("id", userId);
  if (pointsErr) {
    alert("Gagal memotong poin: " + pointsErr.message);
    return false;
  }

  await supabase.from("real_shop_items").update({ stock: newStock }).eq("id", itemId);
  await supabase.from("real_shop_redemptions").insert({
    user_id: userId,
    item_id: itemId,
    quantity: quantity,
    total_points: totalPoints
  });

  alert(`🎁 Berhasil menukarkan ${quantity}x ${item.title}! Silakan hubungi pengurus Vihara.`);
  return true;
}

export async function loadItemRedemptions(itemId) {
  const { data, error } = await supabase
    .from("real_shop_redemptions")
    .select("quantity, total_points, created_at, employees(name, employee_code)")
    .eq("item_id", itemId)
    .order("created_at", { ascending: false });

  if (error) return [];
  return data || [];
}

// =========================================
// 3. ADOPSI POKEMON & SCENERY TOKO
// =========================================
export async function renderPokemonShop(userId, currentPoints) {
  const container = document.getElementById("pokemon-shop-item-list");
  if (!container) return;

  const { data: userInventory } = await supabase.from("user_pokemon_inventory").select("pokemon_id").eq("user_id", userId);
  const ownedIds = (userInventory || []).map(i => i.pokemon_id);

  container.innerHTML = "";
  ALL_SHOP_POKEMON.forEach(poke => {
    const isOwned = ownedIds.includes(poke.id);
    const card = document.createElement("div");
    card.className = "shop-item-card";
    card.innerHTML = `
      <img src="${poke.img}" style="width:70px; height:70px; object-fit:contain; margin-bottom:6px;" alt="${poke.name}">
      <h4 style="font-size:13px; font-weight:700; color:var(--text-main);">${poke.name}</h4>
      <span style="font-size:10px; color:var(--text-sub);">Gen ${poke.gen}</span>
      <p style="font-size:11px; color:#f59e0b; font-weight:800; margin-top:4px;">${poke.price === 0 ? 'GRATIS STARTER' : `🪙 ${poke.price} Poin`}</p>

      <button class="btn-buy-pokemon btn-redeem-real" data-id="${poke.id}" data-price="${poke.price}" data-name="${poke.name}" ${isOwned ? 'disabled' : ''}>
        ${isOwned ? '✅ Sudah Miliki' : '🐾 Adopsi'}
      </button>
    `;
    container.appendChild(card);
  });
}

export async function buyPokemon(userId, pokemonId, price, name, currentPoints) {
  if (currentPoints < price) {
    alert("Poin kamu tidak cukup untuk mengadopsi Pokémon ini!");
    return false;
  }

  const newPoints = currentPoints - price;

  const { error: pointsErr } = await supabase.from("employees").update({ points: newPoints }).eq("id", userId);
  if (pointsErr) {
    alert("Gagal memotong poin: " + pointsErr.message);
    return false;
  }

  await supabase.from("user_pokemon_inventory").insert({ user_id: userId, pokemon_id: pokemonId });

  alert(`🎉 Selamat! Kamu telah berhasil mengadopsi ${name}!`);
  return true;
}

export async function renderSceneryShop(userId, currentPoints, currentActiveScenery) {
  const container = document.getElementById("scenery-shop-item-list");
  if (!container) return;

  const { data: userScenery } = await supabase.from("user_scenery_inventory").select("scenery_id").eq("user_id", userId);
  const ownedIds = (userScenery || []).map(s => s.scenery_id);
  ownedIds.push("sc-default");

  container.innerHTML = "";
  ALL_SHOP_SCENERY.forEach(sc => {
    const isOwned = ownedIds.includes(sc.id);
    const isActive = currentActiveScenery === sc.url;

    const card = document.createElement("div");
    card.className = "shop-item-card";
    card.innerHTML = `
      <div style="width:100%; height:70px; border-radius:8px; background-image:url('${sc.url}'); background-size:cover; background-position:center; margin-bottom:6px;"></div>
      <h4 style="font-size:12px; font-weight:700; color:var(--text-main);">${sc.title}</h4>
      <p style="font-size:11px; color:#f59e0b; font-weight:800; margin-top:2px;">${sc.price === 0 ? 'GRATIS' : `🪙 ${sc.price} Poin`}</p>

      ${!isOwned ? `
        <button class="btn-buy-scenery btn-redeem-real" data-id="${sc.id}" data-price="${sc.price}" data-url="${sc.url}" data-title="${sc.title}">🛍️ Beli Background</button>
      ` : `
        <button class="btn-equip-scenery secondary-button-sm" data-url="${sc.url}" style="width:100%; margin-top:6px; ${isActive ? 'background:#10b981; color:white;' : ''}">
          ${isActive ? '✨ Sedang Dipakai' : '🖼️ Pasang'}
        </button>
      `}
    `;
    container.appendChild(card);
  });
}

export async function buyScenery(userId, sceneryId, price, url, title, currentPoints) {
  if (currentPoints < price) {
    alert("Poin kamu tidak cukup!");
    return false;
  }

  const newPoints = currentPoints - price;
  await supabase.from("employees").update({ points: newPoints }).eq("id", userId);
  await supabase.from("user_scenery_inventory").insert({ user_id: userId, scenery_id: sceneryId });
  await supabase.from("employees").update({ active_scenery_url: url }).eq("id", userId);

  alert(`🎉 Berhasil membeli dan memasang Background ${title}!`);
  return true;
}

// =========================================
// 4. ENSURE FREE POKEMON STARTER
// =========================================
export async function ensureFreeStarterPokemon(userId) {
  const { data } = await supabase.from("user_pokemon_inventory").select("id").eq("user_id", userId);
  if (!data || data.length === 0) {
    const starterInserts = FREE_STARTER_POKEMON.map(p => ({ user_id: userId, pokemon_id: p.id }));
    await supabase.from("user_pokemon_inventory").insert(starterInserts);
  }
}