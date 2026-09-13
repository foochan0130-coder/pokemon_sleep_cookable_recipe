// cookable_recipe.py / image_to_foods.py を移植したブラウザ完結版ロジック

const STORAGE_KEY = "ownedFoods";
const CATEGORY_STORAGE_KEY = "selectedCategory";

// =========================================
// 所持食材の永続化
// =========================================

function loadOwnedFoods() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // ignore
  }
  const zeros = {};
  for (const food of FOOD_TYPES) zeros[food] = 0;
  return zeros;
}

function loadSelectedCategory() {
  try {
    const raw = localStorage.getItem(CATEGORY_STORAGE_KEY);
    if (raw && CATEGORIES.includes(raw)) return raw;
  } catch (e) {
    // ignore
  }
  return null;
}

function saveSelectedCategory(category) {
  try {
    if (category) {
      localStorage.setItem(CATEGORY_STORAGE_KEY, category);
    } else {
      localStorage.removeItem(CATEGORY_STORAGE_KEY);
    }
  } catch (e) {
    // ignore
  }
}

function saveOwnedFoods(ownedFoods) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ownedFoods));
  } catch (e) {
    // ignore
  }
}

// =========================================
// recipes.csv パース
// =========================================

function parseRecipesCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",");
  const recipes = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const cols = lines[i].split(",");
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx];
    });

    const ingredients = {};
    for (const food of FOOD_TYPES) {
      ingredients[food] = parseInt(row[food], 10) || 0;
    }

    recipes.push({
      unlocked: parseInt(row.unlocked, 10),
      category: row.category,
      recipe: row.recipe,
      ingredients,
      total: parseInt(row.total, 10) || 0,
      energy: parseInt(row.energy, 10) || 0,
    });
  }

  return recipes;
}

// =========================================
// 鍋容量（日曜日は2倍）
// =========================================

function computePotSize() {
  const base = 63;
  const isSunday = new Date().getDay() === 0;
  return isSunday ? base * 2 : base;
}

// =========================================
// 作成可能レシピ判定
// =========================================

function judgeRecipes(recipes, ownedFoods, categoryFilter, potSize) {
  const grouped = {};
  const almost = [];

  for (const recipe of recipes) {
    if (categoryFilter && recipe.category !== categoryFilter) continue;
    if (recipe.unlocked !== 0) continue;

    const missing = {};
    for (const food of FOOD_TYPES) {
      const shortage = recipe.ingredients[food] - (ownedFoods[food] || 0);
      if (shortage > 0) missing[food] = shortage;
    }

    if (Object.keys(missing).length === 0) {
      if (!grouped[recipe.category]) grouped[recipe.category] = [];
      grouped[recipe.category].push({ ...recipe, pot_over: recipe.total > potSize });
      continue;
    }

    const totalMissing = Object.values(missing).reduce((a, b) => a + b, 0);
    if (totalMissing <= 20) {
      almost.push({ ...recipe, missing_items: missing, total_missing: totalMissing });
    }
  }

  almost.sort((a, b) => a.total_missing - b.total_missing);

  return { grouped, almost };
}

// =========================================
// OCRテキスト正規化（image_to_foods.py 移植）
// =========================================

const COUNT_CHAR_MAP = {
  "０": "0", "１": "1", "２": "2", "３": "3", "４": "4",
  "５": "5", "６": "6", "７": "7", "８": "8", "９": "9",
  "〇": "0", "Ｏ": "0", "o": "0", "O": "0",
  "ロ": "0", "ろ": "3",
  "l": "1", "I": "1", "|": "1", "i": "1",
  "S": "5", "s": "5", "Z": "2", "z": "2",
  "B": "8",
};

function normalizeCountText(text) {
  return Array.from(text)
    .map((ch) => COUNT_CHAR_MAP[ch] ?? ch)
    .join("");
}

// スマホの画面をOCRすると食材名が「ふと いな が ね ぎ」のように
// 1文字ずつ空白区切りで認識されることがあるため、空白を除去してから照合する
function stripSpaces(text) {
  return text.replace(/\s+/g, "");
}

// 正式名称またはエイリアス(よくある誤読パターン)を含む食材IDをFOOD_TYPESの順序で返す
function findFoodIds(line) {
  const despaced = stripSpaces(line);
  return FOOD_TYPES.filter((id) => {
    const patterns = [FOOD_INFO[id].name, ...(FOOD_NAME_ALIASES[id] || [])];
    return patterns.some((p) => despaced.includes(p));
  });
}

// 1行に「x21 x10 x14 x4」のように複数の個数が並ぶ場合があるため、
// 行全体からx/X/×/*に続く数字をすべて抽出する
function extractCountsFromLine(line) {
  const normalized = normalizeCountText(stripSpaces(line));
  const counts = [];
  for (const m of normalized.matchAll(/[xX×*]+(\d+)/g)) {
    counts.push(parseInt(m[1], 10));
  }
  return counts;
}

function extractFoodsFromText(text) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // 食材名または個数を含む行のブロックを抽出
  const segments = [];
  let currentSegment = [];

  for (const line of lines) {
    const ids = findFoodIds(line);
    const counts = extractCountsFromLine(line);

    if (ids.length || counts.length) {
      currentSegment.push({ ids, counts });
    } else if (currentSegment.length) {
      segments.push(currentSegment);
      currentSegment = [];
    }
  }
  if (currentSegment.length) segments.push(currentSegment);

  const foods = {};

  for (const segment of segments) {
    const runs = [];
    let currentType = null;
    let currentValues = [];

    const flushRun = () => {
      if (currentValues.length) runs.push([currentType, currentValues]);
    };

    for (const { ids, counts } of segment) {
      if (counts.length) {
        if (currentType !== "count") {
          flushRun();
          currentType = "count";
          currentValues = [...counts];
        } else {
          currentValues.push(...counts);
        }
      } else if (ids.length) {
        if (currentType !== "name") {
          flushRun();
          currentType = "name";
          currentValues = [...ids];
        } else {
          currentValues.push(...ids);
        }
      }
    }
    flushRun();

    for (let i = 0; i < runs.length - 1; i++) {
      if (runs[i][0] === "count" && runs[i + 1][0] === "name") {
        const counts = runs[i][1];
        const ids = runs[i + 1][1];

        for (let j = 0; j < Math.min(ids.length, counts.length); j++) {
          foods[ids[j]] = counts[j];
        }
      }
    }
  }

  return foods;
}

// =========================================
// Tesseract.js によるOCR実行
// =========================================

async function runOcrOnFiles(files, onProgress) {
  const allFoods = {};
  const rawTexts = [];

  for (let i = 0; i < files.length; i++) {
    const { data } = await Tesseract.recognize(files[i], "jpn", {
      logger: (m) => onProgress && onProgress(i, files.length, m),
    });
    rawTexts.push(data.text);
    Object.assign(allFoods, extractFoodsFromText(data.text));
  }

  return { foods: allFoods, rawTexts };
}

// =========================================
// UI
// =========================================

let allRecipes = [];
let ownedFoods = loadOwnedFoods();
let selectedCategory = loadSelectedCategory();

function renderFoodsGrid() {
  const grid = document.getElementById("foods-grid");
  grid.innerHTML = "";

  for (const food of FOOD_TYPES) {
    const wrapper = document.createElement("label");
    wrapper.className = "food-input";

    const span = document.createElement("span");
    span.textContent = FOOD_INFO[food].name;

    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.inputMode = "numeric";
    input.value = ownedFoods[food] || 0;
    input.addEventListener("change", () => {
      ownedFoods[food] = parseInt(input.value, 10) || 0;
      saveOwnedFoods(ownedFoods);
      runJudge();
    });

    wrapper.appendChild(span);
    wrapper.appendChild(input);
    grid.appendChild(wrapper);
  }
}

function renderCategoryTabs() {
  const container = document.getElementById("category-tabs");
  container.innerHTML = "";

  const options = [{ label: "すべて", value: null }, ...CATEGORIES.map((c) => ({ label: c, value: c }))];

  for (const opt of options) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = opt.label;
    button.className = "tab" + (selectedCategory === opt.value ? " active" : "");
    button.addEventListener("click", () => {
      selectedCategory = opt.value;
      saveSelectedCategory(selectedCategory);
      renderCategoryTabs();
      runJudge();
    });
    container.appendChild(button);
  }
}

function ingredientsListHtml(recipe) {
  return FOOD_TYPES
    .filter((food) => recipe.ingredients[food] > 0)
    .map((food) => `<li>${FOOD_INFO[food].name}: ${recipe.ingredients[food]}</li>`)
    .join("");
}

function renderResults() {
  const potSize = computePotSize();
  document.getElementById("pot-size-display").textContent = `鍋容量: ${potSize}`;

  const { grouped, almost } = judgeRecipes(allRecipes, ownedFoods, selectedCategory, potSize);

  const cookableEl = document.getElementById("cookable-results");
  cookableEl.innerHTML = "";

  const categoriesToShow = selectedCategory ? [selectedCategory] : CATEGORIES;
  let anyCookable = false;

  for (const category of categoriesToShow) {
    const list = grouped[category];
    if (!list || !list.length) continue;
    anyCookable = true;

    const section = document.createElement("div");
    section.className = "category-section";

    const heading = document.createElement("h3");
    heading.textContent = category;
    section.appendChild(heading);

    for (const recipe of list) {
      const card = document.createElement("div");
      card.className = "recipe-card";

      const overHtml = recipe.pot_over
        ? `<p class="warn">⚠ 鍋容量不足 (必要: ${recipe.total} / 現在: ${potSize} / +${recipe.total - potSize})</p>`
        : `<p class="ok">✅ 調理可能</p>`;

      card.innerHTML = `
        <h4>${recipe.recipe}</h4>
        <ul>${ingredientsListHtml(recipe)}</ul>
        <p>食材合計: ${recipe.total}</p>
        <p>レシピエナジー: ${recipe.energy}</p>
        ${overHtml}
      `;
      section.appendChild(card);
    }

    cookableEl.appendChild(section);
  }

  if (!anyCookable) {
    cookableEl.innerHTML = '<p class="empty">作成可能なレシピはありません</p>';
  }

  const almostEl = document.getElementById("almost-results");
  almostEl.innerHTML = "";

  if (!almost.length) {
    almostEl.innerHTML = '<p class="empty">対象レシピはありません</p>';
  } else {
    for (const recipe of almost) {
      const card = document.createElement("div");
      card.className = "recipe-card";

      const itemsHtml = FOOD_TYPES
        .filter((food) => recipe.ingredients[food] > 0)
        .map((food) => {
          const required = recipe.ingredients[food];
          const owned = ownedFoods[food] || 0;
          const shortage = required - owned;
          const name = FOOD_INFO[food].name;
          return shortage > 0 ? `<li>${name}: ${required} (あと${shortage})</li>` : `<li>${name}: ${required}</li>`;
        })
        .join("");

      card.innerHTML = `
        <h4>${recipe.recipe}</h4>
        <p>不足合計: ${recipe.total_missing}</p>
        <ul>${itemsHtml}</ul>
      `;
      almostEl.appendChild(card);
    }
  }
}

function runJudge() {
  renderResults();
}

async function runOcr() {
  const input = document.getElementById("screenshot-input");
  const status = document.getElementById("ocr-status");
  const files = Array.from(input.files || []);

  if (!files.length) {
    status.textContent = "スクリーンショットを選択してください";
    return;
  }

  status.textContent = "解析中...";

  try {
    const { foods, rawTexts } = await runOcrOnFiles(files, (i, total, m) => {
      if (m.status === "recognizing text") {
        status.textContent = `解析中 (${i + 1}/${total}): ${Math.round(m.progress * 100)}%`;
      }
    });

    try {
      await fetch("./log", {
        method: "POST",
        body: JSON.stringify({ rawTexts, foods }, null, 2),
      });
    } catch (e) {
      // ローカル開発サーバー以外では失敗して当然なので無視
    }

    Object.assign(ownedFoods, foods);
    saveOwnedFoods(ownedFoods);
    renderFoodsGrid();

    const count = Object.keys(foods).length;
    status.textContent =
      count > 0
        ? `✅ ${count}種類の食材を読み取りました。内容を確認・修正してください`
        : "⚠ 食材を読み取れませんでした。手動で入力してください（下の「OCRの生テキスト」を確認してください）";

    runJudge();
  } catch (e) {
    console.error(e);
    status.textContent = "OCR中にエラーが発生しました: " + e.message;
  }
}

async function init() {
  renderFoodsGrid();
  renderCategoryTabs();

  document.getElementById("judge-button").addEventListener("click", runJudge);
  document.getElementById("ocr-button").addEventListener("click", runOcr);

  try {
    const res = await fetch("./recipes.csv");
    const text = await res.text();
    allRecipes = parseRecipesCSV(text);
  } catch (e) {
    console.error("recipes.csv の読み込みに失敗しました", e);
  }

  runJudge();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch((e) => console.error("SW登録失敗", e));
  }
}

document.addEventListener("DOMContentLoaded", init);
