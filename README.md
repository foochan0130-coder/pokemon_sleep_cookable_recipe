# pokemon_sleep_cookable_recipe

ポケモンスリープの所持食材から作成可能なレシピを判定するツール。

## スマホ完結版（Webアプリ）

`index.html` を開くだけで、スマホのブラウザ上で完結します（サーバー不要・追加費用ゼロ）。

1. スクリーンショットを選択して「OCR解析」（ブラウザ内でTesseract.jsが解析、サーバーへの送信なし）
2. 読み取られた所持食材を確認・修正（OCRが外れた場合は手動入力でもOK）
3. カテゴリを選んで「判定する」

「ホーム画面に追加」でアプリのように使えます（PWA対応）。

GitHub Pagesを有効化すれば `https://<username>.github.io/<repo>/` で公開できます。

## PC版（Python, 従来どおり）

```
python cookable_recipe.py
python cookable_recipe.py s
python cookable_recipe.py --use-owned
```

`screenshots/` にスクショを置いて実行すると、EasyOCRで `owned_foods.csv` を生成します。
