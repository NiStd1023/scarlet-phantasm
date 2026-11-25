# 緋夜幻彈 Scarlet Phantasm

直式瀏覽器彈幕射擊遊戲，支援電腦與觸控裝置。遊戲使用原生 HTML、CSS、Canvas 和 JavaScript；不需要安裝前端套件或編譯即可執行。

## 啟動開發環境

在專案根目錄執行：

```bash
python3 -m http.server 4173 --directory dist
```

以瀏覽器開啟 `http://localhost:4173/`。`dist/` 同時是實際原始碼與部署目錄；修改後重新整理瀏覽器即可查看。音樂播放可能需要先點擊遊戲按鈕，才能取得瀏覽器的播放授權。

## 專案結構

| 路徑 | 內容 |
| --- | --- |
| `dist/index.html` | 版面、遊戲按鈕與音樂元素 |
| `dist/style.css` | 電腦與手機版面樣式 |
| `dist/game.js` | 遊戲循環、角色、敵人、彈幕、碰撞、操作與音效 |
| `dist/assets/`、`dist/key-art.png` | 角色與背景圖像 |
| `dist/music/` | 三個關卡與頭目配樂；音色檔及其授權文件位於 `licenses/` |
| `tools/generate_music.py` | 配樂作曲及音檔產生程式 |
| `tests/` | 遊戲邏輯與配樂結構檢查 |
| `.openai/hosting.json` | 既有網站識別與靜態部署設定 |

## 驗證

```bash
node --check dist/game.js
node tests/game-logic.test.cjs
python3 tests/music-structure.test.py
```

遊戲邏輯測試需要 Node.js。配樂結構測試會載入作曲模組，需要 Python 3、NumPy 與 `libfluidsynth.so.3`；重新產生音樂時還需要 FFmpeg。一般遊玩與只修改網頁不需要這些音樂製作依賴。

## 操作

- 方向鍵或 WASD 移動；按住 Shift 低速移動。
- 空白鍵或 X 發動 BOMB；P 或 Esc 暫停。
- 觸控裝置在畫面上拖曳移動，並使用「低速」與 BOMB 按鈕。
- 攻擊為自動射擊；拾取 P 升級武裝，拾取 B 補充 BOMB。

## 頭目彈幕設計

每個頭目有四招不同的攻擊，包含專屬彈型、配色、彈道與施法圖騰。一般敵人使用較簡潔的花瓣與菱晶彈，與頭目攻擊區別。

| 關卡 | 頭目 | 主要彈幕特色 |
| --- | --- | --- |
| 霧之森 | 道中・霧之守護者 | 紫色符印、羽毛與秘典法陣 |
| 霧之森 | 關底・霧之幻影 | 青紫幻蝶、水滴與漂浮弧線 |
| 緋月之庭 | 道中・緋月守衛 | 金色封印、符紙與交錯陣列 |
| 緋月之庭 | 關底・緋月之主 | 蝠翼、緋刃與薔薇旋舞 |
| 紅月終焉 | 道中・深紅使徒 | 咒印十字、紫焰與逆轉星環 |
| 紅月終焉 | 關底・紅月終焉 | 新月、星芒與日蝕法陣；低血量時強化攻擊 |

頭目設定與招式名稱位於 `dist/game.js` 的 `BOSS_PROFILES`，各招彈幕的產生方式位於 `pattern()`。修改時請兼顧辨識度、閃避空間與 `MAX_ENEMY_BULLETS` 上限。

## 部署與版本

既有網站的 `.openai/hosting.json` 將 `dist/` 指定為靜態部署目錄。更新網站時應沿用原有 Site 專案，先將變更納入 Git 版本，再從同一版原始碼封裝並發布。請保留 `.openai/hosting.json` 與配樂授權文件；不要將登入憑證加入儲存庫。
