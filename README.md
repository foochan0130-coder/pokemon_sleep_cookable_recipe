# pokemon_sleep_cookable_recipe

ポケモンスリープの所持食材から作成可能なレシピを判定するツール。

## スマホ完結版（Webアプリ）

`index.html` を開くだけで、スマホのブラウザ上で完結します（サーバー不要・追加費用ゼロ）。

1. スクリーンショットを選択して「OCR解析」（ブラウザ内でTesseract.jsが解析、サーバーへの送信なし）
2. 読み取られた所持食材を確認・修正（OCRが外れた場合は手動入力でもOK）
3. カテゴリを選んで「判定する」

「ホーム画面に追加」でアプリのように使えます（PWA対応）。

公開URL: https://foochan0130-coder.github.io/pokemon_sleep_cookable_recipe/

## PC版（Python, 従来どおり）

```
python python/cookable_recipe.py
python python/cookable_recipe.py s
python python/cookable_recipe.py --use-owned
```

`python/screenshots/` にスクショを置いて実行すると、EasyOCRで `python/owned_foods.csv` を生成します。
レシピデータ（`recipes.csv`）はリポジトリ直下のものをWeb版と共有しています。

## ディレクトリ構成

```
index.html, app.js, data.js, style.css, sw.js, manifest.json, icons/
                                  Web版（GitHub Pagesで公開するファイル一式）
recipes.csv                      レシピデータ（Web版・PC版で共通）
dev_server.py                    Web版をローカルで動作確認する時に使う簡易サーバー
python/                          PC版（Python + EasyOCR）
```
