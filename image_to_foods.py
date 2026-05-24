import cv2
import easyocr
import csv
import re
from pathlib import Path

# =========================================
# 食材の日本語名→フィールド名マッピング
# =========================================

FOOD_NAME_MAP = {
    "ふといながねぎ": "largeleek",
    "あじわいキノコ": "tastymushroom",
    "とくせんエッグ": "fancyegg",
    "ほっこりポテト": "softpotato",
    "とくせんリンゴ": "fancyapple",
    "げきからハーブ": "fieryherb",
    "マメミート": "beansausage",
    "モーモーミルク": "moomoomilk",
    "あまいミツ": "honey",
    "ピュアなオイル": "pureoil",
    "あったかジンジャー": "warmingginger",
    "あんみんトマト": "snoozytomato",
    "リラックスカカオ": "soothingcacao",
    "おいしいシッポ": "slowpoketail",
    "ワカクサ大豆": "greengrasssoybeans",
    "ワカクサコーン": "greengrasscorn",
    "めざましコーヒー": "tastycoffee",
    "ずっしりカボチャ": "heavypumpkin",
    "つやつやアボカド": "shinyavocado"
}

# =========================================
# OCRで画像から食材情報を抽出
# =========================================

def normalize_line(line):
    return line.replace('×', 'x').replace('X', 'x').replace('*', 'x').strip()


def is_count_line(line):
    return bool(re.fullmatch(r'[xX×*]?\s*\d+', line.strip()))


def extract_count(line):
    match = re.search(r'[xX×*]?\s*(\d+)', line)
    return int(match.group(1)) if match else None


def collapse_ahattaka_ginger(lines):
    merged = []
    skip_indexes = set()

    for i, line in enumerate(lines):
        if i in skip_indexes:
            continue

        if line == "あったかジン":
            for j in range(i + 1, len(lines)):
                if lines[j] == "ジャー":
                    skip_indexes.add(j)
                    line = "あったかジンジャー"
                    break

        merged.append(line)

    return merged


def merge_split_food_name_lines(lines):
    merged = []
    skip_next = False

    for i, line in enumerate(lines):
        if skip_next:
            skip_next = False
            continue

        if i + 1 < len(lines):
            next_line = lines[i + 1]
            if line == "あったかジン" and next_line == "ジャー":
                merged.append("あったかジンジャー")
                skip_next = True
                continue

        merged.append(line)

    return merged


def find_food_names(line):
    return [jp_name for jp_name in FOOD_NAME_MAP.keys() if jp_name in line]


def extract_foods_from_image(image_path):
    """
    画像からEasyOCRで食材と個数を抽出
    """
    
    # 画像を読み込む
    image = cv2.imread(str(image_path))
    
    if image is None:
        print(f"エラー: 画像を読み込めません: {image_path}")
        return {}
    
    # EasyOCRでテキスト抽出（日本語）
    reader = easyocr.Reader(['ja'], gpu=True)
    results = reader.readtext(image, detail=1)
    
    # 抽出されたテキスト
    extracted_text = "\n".join([text[1] for text in results])
    print("=== 抽出されたテキスト ===")
    print(extracted_text)
    print("========================\n")
    
    # =========================================
    # テキストを行ごとに処理
    # =========================================
    
    raw_lines = [line.strip() for line in extracted_text.split('\n') if line.strip()]
    raw_lines = [normalize_line(line) for line in raw_lines]
    raw_lines = collapse_ahattaka_ginger(raw_lines)
    lines = merge_split_food_name_lines(raw_lines)

    # 名前または個数が連続するブロックを抽出
    segments = []
    current_segment = []

    for line in lines:
        has_name = bool(find_food_names(line))
        has_count = is_count_line(line)

        if has_name or has_count:
            current_segment.append(line)
        else:
            if current_segment:
                segments.append(current_segment)
                current_segment = []

    if current_segment:
        segments.append(current_segment)

    foods = {}

    for segment in segments:
        runs = []
        current_type = None
        current_values = []

        for line in segment:
            if is_count_line(line):
                count = extract_count(line)
                if current_type != "count":
                    if current_values:
                        runs.append((current_type, current_values))
                    current_type = "count"
                    current_values = [count]
                else:
                    current_values.append(count)
                continue

            line_names = find_food_names(line)
            if line_names:
                if current_type != "name":
                    if current_values:
                        runs.append((current_type, current_values))
                    current_type = "name"
                    current_values = line_names.copy()
                else:
                    current_values.extend(line_names)

        if current_values:
            runs.append((current_type, current_values))

        for i in range(len(runs) - 1):
            if runs[i][0] == "count" and runs[i + 1][0] == "name":
                counts = runs[i][1]
                names = runs[i + 1][1]
                
                # 抽出した食材名をFOOD_NAME_MAPの順序でソート
                sorted_names = []
                for jp_name in FOOD_NAME_MAP.keys():
                    if jp_name in names:
                        sorted_names.append(jp_name)
                
                # ソート済みの名前と数値を対応
                for j, jp_name in enumerate(sorted_names[:len(counts)]):
                    en_name = FOOD_NAME_MAP[jp_name]
                    foods[en_name] = counts[j]
                    print(f"✓ {jp_name} ({en_name}): {counts[j]}個")

    return foods

# =========================================
# owned_foods.csvを生成
# =========================================

def generate_csv(foods, output_path="owned_foods.csv"):
    """
    抽出した食材情報をCSVに書き込む
    """
    
    # すべての食材フィールド名
    all_fields = list(FOOD_NAME_MAP.values())
    
    # 持ってない食材は0で埋める
    food_dict = {field: 0 for field in all_fields}
    food_dict.update(foods)
    
    # CSVに書き込む
    with open(output_path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=all_fields)
        writer.writeheader()
        writer.writerow(food_dict)
    
    print(f"\n✅ {output_path} を生成しました")
    
    # 内容を表示
    print("\n=== 生成されたCSV内容 ===")
    with open(output_path, 'r', encoding='utf-8') as f:
        print(f.read())

def generate_owned_foods_csv_from_screenshots(screenshots_dir=Path('./screenshots'), output_path='owned_foods.csv'):
    """
    screenshots ディレクトリの画像から owned_foods.csv を生成する
    """
    if not screenshots_dir.exists():
        raise FileNotFoundError(f"{screenshots_dir} ディレクトリが見つかりません")

    image_files = sorted(screenshots_dir.glob('*.jpg')) + sorted(screenshots_dir.glob('*.png'))
    if not image_files:
        raise FileNotFoundError(f"{screenshots_dir} に .jpg または .png ファイルが見つかりません")

    all_foods = {}

    for image_path in image_files:
        print(f"処理中: {image_path}\n")
        foods = extract_foods_from_image(image_path)

        if not foods:
            print("警告: 食材情報を抽出できませんでした\n")
            continue

        for field_name, count in foods.items():
            all_foods[field_name] = count

    if not all_foods:
        raise ValueError("どの画像からも有効な食材情報を抽出できませんでした")

    generate_csv(all_foods, output_path=output_path)
    return all_foods


# =========================================
# メイン処理
# =========================================

if __name__ == "__main__":
    generate_owned_foods_csv_from_screenshots()