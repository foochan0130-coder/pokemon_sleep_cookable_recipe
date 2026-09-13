// cookable_recipe.py / image_to_foods.py の食材定義を移植したもの

const FOOD_TYPES = [
  "largeleek",
  "tastymushroom",
  "fancyegg",
  "softpotato",
  "fancyapple",
  "fieryherb",
  "beansausage",
  "moomoomilk",
  "honey",
  "pureoil",
  "warmingginger",
  "snoozytomato",
  "soothingcacao",
  "slowpoketail",
  "greengrasssoybeans",
  "greengrasscorn",
  "tastycoffee",
  "heavypumpkin",
  "shinyavocado",
];

const FOOD_INFO = {
  largeleek: { name: "ふといながねぎ", energy: 185 },
  tastymushroom: { name: "あじわいキノコ", energy: 167 },
  fancyegg: { name: "とくせんエッグ", energy: 115 },
  softpotato: { name: "ほっこりポテト", energy: 124 },
  fancyapple: { name: "とくせんリンゴ", energy: 90 },
  fieryherb: { name: "げきからハーブ", energy: 130 },
  beansausage: { name: "マメミート", energy: 103 },
  moomoomilk: { name: "モーモーミルク", energy: 98 },
  honey: { name: "あまいミツ", energy: 101 },
  pureoil: { name: "ピュアなオイル", energy: 121 },
  warmingginger: { name: "あったかジンジャー", energy: 109 },
  snoozytomato: { name: "あんみんトマト", energy: 110 },
  soothingcacao: { name: "リラックスカカオ", energy: 151 },
  slowpoketail: { name: "おいしいシッポ", energy: 342 },
  greengrasssoybeans: { name: "ワカクサ大豆", energy: 100 },
  greengrasscorn: { name: "ワカクサコーン", energy: 140 },
  tastycoffee: { name: "めざましコーヒー", energy: 153 },
  heavypumpkin: { name: "ずっしりカボチャ", energy: 250 },
  shinyavocado: { name: "つやつやアボカド", energy: 162 },
};

// 日本語名 -> フィールド名（OCR結果の食材名マッチングに使用）
const FOOD_NAME_MAP = {};
for (const id of FOOD_TYPES) {
  FOOD_NAME_MAP[FOOD_INFO[id].name] = id;
}

// OCRでよく誤読される食材名のパターン(正式名称と合わせて照合に使う)
const FOOD_NAME_ALIASES = {
  warmingginger: ["ったがジン", "ったかジン"], // 「あったかジンジャー」の先頭が欠けたり「か」が「が」に化けやすい
  shinyavocado: ["つやつやアポカド"], // 「ボ」が「ポ」に化けやすい
};

const CATEGORIES = ["サラダ", "デザート・ドリンク", "カレー・シチュー"];
