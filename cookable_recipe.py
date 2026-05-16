import csv
import sys

# =========================================
# カテゴリフィルタ
# =========================================

CATEGORY_MAP = {
    "s": "サラダ",
    "d": "デザート・ドリンク",
    "c": "カレー・シチュー"
}

selected_category = None

# 第1引数を取得
if len(sys.argv) >= 2:

    arg = sys.argv[1].lower()

    selected_category = CATEGORY_MAP.get(arg)

# =========================================
# ポケモンスリープ 食材定義
# =========================================

FOOD_TYPES = [
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
    "shinyavocado"
]

# =========================================
# 食材情報
# =========================================

FOOD_INFO = {

    "largeleek": {
        "name": "ふといながねぎ",
        "energy": 185
    },

    "tastymushroom": {
        "name": "あじわいキノコ",
        "energy": 167
    },

    "fancyegg": {
        "name": "とくせんエッグ",
        "energy": 115
    },

    "softpotato": {
        "name": "ほっこりポテト",
        "energy": 124
    },

    "fancyapple": {
        "name": "とくせんリンゴ",
        "energy": 90
    },

    "fieryherb": {
        "name": "げきからハーブ",
        "energy": 130
    },

    "beansausage": {
        "name": "マメミート",
        "energy": 103
    },

    "moomoomilk": {
        "name": "モーモーミルク",
        "energy": 98
    },

    "honey": {
        "name": "あまいミツ",
        "energy": 101
    },

    "pureoil": {
        "name": "ピュアなオイル",
        "energy": 121
    },

    "warmingginger": {
        "name": "あったかジンジャー",
        "energy": 109
    },

    "snoozytomato": {
        "name": "あんみんトマト",
        "energy": 110
    },

    "soothingcacao": {
        "name": "リラックスカカオ",
        "energy": 151
    },

    "slowpoketail": {
        "name": "おいしいシッポ",
        "energy": 342
    },

    "greengrasssoybeans": {
        "name": "ワカクサ大豆",
        "energy": 100
    },

    "greengrasscorn": {
        "name": "ワカクサコーン",
        "energy": 140
    },

    "tastycoffee": {
        "name": "めざましコーヒー",
        "energy": 153
    },

    "heavypumpkin": {
        "name": "ずっしりカボチャ",
        "energy": 250
    },

    "shinyavocado": {
        "name": "つやつやアボカド",
        "energy": 162
    }
}

# =========================================
# 所持食材を読み込む
# =========================================

with open("owned_foods.csv", encoding="utf-8") as f:

    reader = csv.DictReader(f)

    owned_foods = next(reader)

    owned_foods = {
        food: int(count)
        for food, count in owned_foods.items()
    }

# =========================================
# レシピを読み込む
# =========================================

recipes = []

with open("recipes.csv", encoding="utf-8") as f:

    reader = csv.DictReader(f)

    for row in reader:
        
        unlocked = int(row["unlocked"])

        category = row["category"]

        # カテゴリフィルタ
        if selected_category is not None:
            if category != selected_category:
                continue

        recipe_name = row["recipe"]

        ingredients = {
            food: int(row[food])
            for food in FOOD_TYPES
        }

        recipes.append({
            "unlocked": unlocked,
            "category": category,
            "recipe": recipe_name,
            "ingredients": ingredients,
            "total": int(row["total"]),
            "energy": int(row["energy"])
})

# =========================================
# 現在の鍋容量
# =========================================

POT_SIZE = 45

# =========================================
# 作成可能レシピを判定
# =========================================

cookable_recipes = []
almost_recipes = []

for recipe in recipes:

    missing_items = {}

    for food in FOOD_TYPES:

        required = recipe["ingredients"][food]
        owned = owned_foods.get(food, 0)

        shortage = required - owned

        if shortage > 0:
            missing_items[food] = shortage

    # 完全に作れる
    if len(missing_items) == 0:

        # 未解放のみ表示
        if recipe["unlocked"] == 0:

            total_ingredients = recipe.get("total", 0)

            recipe["pot_over"] = total_ingredients > POT_SIZE

            cookable_recipes.append(recipe)

    # あと少し判定
    else:

        # 未解放レシピのみ対象
        if recipe["unlocked"] == 0:

            total_missing = sum(missing_items.values())

            if total_missing <= 10:

                recipe["missing_items"] = missing_items
                recipe["total_missing"] = total_missing

                almost_recipes.append(recipe)

# =========================================
# カテゴリごとに表示
# =========================================

grouped = {}

for recipe in cookable_recipes:

    category = recipe["category"]

    if category not in grouped:
        grouped[category] = []

    grouped[category].append(recipe)

# =========================================
# 結果表示
# =========================================

print("\n==============================")
print(f" 作成可能レシピ（鍋容量: {POT_SIZE}）")
print("==============================")

for category, recipe_list in grouped.items():

    print(f"\n[{category}]")

    for recipe in recipe_list:

        print(f"\n- {recipe['recipe']}")

        total_energy = recipe.get("energy", 0)
        total_count = recipe.get("total", 0)

        # 使用食材表示
        for food_id, count in recipe["ingredients"].items():

            if count > 0:

                food_name = FOOD_INFO[food_id]["name"]

                print(f"  {food_name}: {count}")

        print(f"  食材合計: {total_count}")
        print(f"  レシピエナジー: {total_energy}")

        # 鍋容量超過表示
        if recipe["pot_over"]:

            over = total_count - POT_SIZE

            print(
                f"  ⚠ 鍋容量不足 "
                f"(必要: {total_count} / 現在: {POT_SIZE} / +{over})"
            )
        else:
            print("  ✅ 調理可能")

# =========================================
# あと少しレシピ表示
# =========================================

print("\n==============================")
print(" あと少しで作れるレシピ")
print("==============================")

for recipe in sorted(
    almost_recipes,
    key=lambda x: x["total_missing"]
):

    print(f"\n- {recipe['recipe']}")

    print(
        f"  不足合計: {recipe['total_missing']}"
    )

    print("")

    # レシピ食材一覧
    for food_id, required in recipe["ingredients"].items():

        if required <= 0:
            continue

        owned = owned_foods.get(food_id, 0)

        food_name = FOOD_INFO[food_id]["name"]

        shortage = required - owned

        # 足りない場合
        if shortage > 0:

            print(
                f"  {food_name}: "
                f"{required} "
                f"(あと{shortage})"
            )

        # 足りている場合
        else:

            print(
                f"  {food_name}: {required}"
            )
