# Desk Clock

Android端末を横置きし、常時表示するためのシンプルなデスククロックです。東京または現在地の現在天気、時間別予報、今日・明日の予報を取得し、時刻を優先した画面に表示します。

## 主な機能

- コロン位置が動かない固定幅の `HH:mm:ss` 時計と日本語の日付表示
- Android横画面を中心としたレスポンシブデザイン
- 選択地域の現在気温、このあと2時間おきの4件、今日の最高・最低気温、明日の天気を30分ごとに更新
- 東京と現在地の切り替え
- ミッドナイトと白基調のライトテーマ
- テーマと地域の端末内保存
- Screen Wake Lock APIによる画面スリープ防止
- ホーム画面へ追加できるPWA
- 通信失敗時の天気キャッシュとアプリ画面のオフライン表示

現在地は設定画面で明示的に選んだ場合だけ取得します。APIキーやビルドツールは使用しません。

## 表示内容

```text
09 : 38 : 57
8月28日 金曜日
京都市 · ☁ 一部曇り 27°C
このあと 10時 ☀ 28°  12時 ☀ 30°  14時 ☁ 32°  16時 ☂ 29°
今日 最高33° / 最低23°
明日 ☂ 雨 最高26° / 最低22°
```

「このあと」は現在時刻より後の最初の時間から2時間間隔で4件表示します。天気情報はページ表示時と地域変更時に即時取得し、以降30分ごとに更新します。

## ローカルで確認する

Service WorkerとWake Lockはセキュアコンテキストが必要です。ローカルでは `localhost` がセキュアコンテキストとして扱われます。

```sh
python3 -m http.server 8000 --directory src
```

ブラウザで `http://localhost:8000/` を開いてください。ファイルを直接開いた場合も時計は動作しますが、PWA機能は利用できません。

## 設定

画面右上のメニューボタンから変更できます。

- カラーテーマ: ミッドナイト、ライト
- 地域: 東京、または現在地

「現在地を使う」を押した場合のみブラウザが位置情報の許可を求めます。取得できなかった場合は、それまで選択していた地域を維持します。現在地の表示名はOpenStreetMapの逆ジオコーディング結果を使用し、取得できない場合のみ「現在地」と表示します。

設定はブラウザの `localStorage` に保存されます。ブラウザデータを消去すると初期値の「ミッドナイト／東京」に戻ります。

## GitHub Pagesへデプロイする

リポジトリの `main` ブランチへpushすると、GitHub Actionsが構文検証を行い、成功したファイルをGitHub Pagesへデプロイします。

初回のみGitHubリポジトリで次の設定を行ってください。

1. **Settings → Pages** を開く
2. **Build and deployment → Source** で **GitHub Actions** を選ぶ
3. `main` ブランチへpushする
4. **Actions → Deploy to GitHub Pages** で完了を確認する

手動で再デプロイする場合は、同じワークフローの **Run workflow** を使用できます。

## ファイル構成

```text
.
├── .github/workflows/deploy-pages.yml  # 検証とGitHub Pagesデプロイ
├── docs/design.md                       # 設計書
└── src/                                 # GitHub Pages公開対象
    ├── index.html                       # 画面構造と設定ダイアログ
    ├── style.css                        # レイアウトとテーマ
    ├── settings.js                      # 設定、地域、位置情報
    ├── clock.js                         # 時計、Wake Lock、PWA登録
    ├── weather.js                       # 現在・時間別・日別天気とキャッシュ
    ├── manifest.json                    # PWAマニフェスト
    ├── sw.js                            # アプリシェルのキャッシュ
    ├── icon.svg                         # アイコン原本
    └── icon.png                         # PWAアイコン
```

詳細は[設計書](docs/design.md)を参照してください。

## 使用API

- [Open-Meteo Forecast API](https://open-meteo.com/en/docs)
- [OpenStreetMap Nominatim](https://nominatim.org/)
- Geolocation API
- Screen Wake Lock API
- Service Worker API
- Web App Manifest

## ライセンス

ライセンスを設定する場合は、リポジトリへ `LICENSE` ファイルを追加してください。
