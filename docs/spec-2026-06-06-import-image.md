# Spec: `deckweave import-image` — 画像/PDF → 編集可能PPTX

- **作成日**: 2026-06-06
- **対象**: DeckWeave Phase 4（Image/PDF to PPTX）の再定義 + 実装
- **出典/着想**: うちた(@uchita_success) X記事「AIで作ったスライド（画像/PDF）を、ズレなく編集できるパワポに変換する全手順」(2026-05-30, 162万imp)
- **ステータス**: Draft（spec-first・未実装）

---

## 0. ロールバック手順（実装より先に明記）

本機能は **純粋な追加（additive）** であり、既存の import/export/critique/inspect の
シグネチャ・挙動を一切変更しない。

| 変更物 | ロールバック方法 | データ移行 |
|--------|------------------|-----------|
| `ir.ts` の `line.dash?` フィールド追加 | **optional** なので削除しても既存IR/HTMLは有効。型から1行除去 | 不要 |
| `pptx-export.ts` の dashType 分岐 | `if (el.line?.dash)` ブロックを除去 | 不要 |
| 新 `build` コマンド / `deckweave_build` MCP | コマンド登録を除去（他コマンドは無依存） | 不要 |
| 新 `render` コマンド / `deckweave_render` MCP | 同上。LibreOffice はコード結合なし（外部プロセス呼び出しのみ） | 不要 |
| SKILL.md の「Image/PDF→PPTX」節 | 節を削除 | 不要 |

→ ロールバックコスト: **低**。`git`未初期化のローカルツールのため、最悪は該当ファイルを
手動で元に戻すだけ。本番デプロイ・顧客接点なし。

---

## 1. 背景と「なぜ既存Phase 4を書き換えるか」

`docs/IMPLEMENTATION_PLAN.md` の現行 Phase 4 は **OCRオーバーレイ方式**:

> Place the original page image as the slide background. Overlay OCR text as editable text boxes.

= 元画像を背景に敷き、テキストだけ編集可能に重ねる。**図形・色は画像のまま**で編集不可。

一方、出典記事が価値を生んでいるのは **全要素を native object に再構築** する点:

- テキストも図形も1つずつ選択・編集できる（背景画像なし）
- 破線枠まで「破線アウトライン」として再現
- 出力をレンダリングして原画と比較し、AI自身がズレを直す

ユーザーが求めるのは後者（「ズレなく**編集できる**」）。よって Phase 4 を
**「reconstruction-first（再構築優先）+ 複雑部のみrasterize」** に再定義する。
これは既存planの "Keep complex graphics rasterized" とも矛盾しない（ハイブリッド）。

---

## 2. 中核アーキテクチャ判断（最重要）

DeckWeave は **決定論的TSツール（自前でLLMを呼ばない）**。
画像の版面解釈は本質的にvision推論であり、deckweaveの責務外。

→ **分業を以下で固定する:**

```
[画像/PDF]
   │
   ▼  ❶ Importer = Codex vision（ランタイム側 / SKILL.mdが駆動）
[DeckIR JSON]  ← AIが版面を読んで構造化。3原則をIR記述規約として遵守
   │
   ▼  ❷ Builder = deckweave build（決定論的TS）
[.pptx + preview.html]  ← exportDeckToPptx / renderDeckToHtml を再利用
   │
   ▼  ❸ Renderer = deckweave render（LibreOffice headless）
[rendered.png]
   │
   ▼  ❹ Self-check = Codex vision（原画 vs rendered を比較→IRをpatch）
[修正後DeckIR] → ❷へ（1〜2周）→ 最終 .pptx
```

- **deckweave が増やすのは ❷❸ の決定論プリミティブのみ**（vision/LLMは持ち込まない）
- **❶❹ の知性は Codex セッション内**（＝ユーザー自身のセッション。外部API課金なし・
  "no external upload" guardrail を維持）
- forgecad の `render-inspect` / `model-grader` ループと同型。設計資産を流用

> この分業により、deckweave は OSS公開可能な純ローカル決定論ツールのまま、
> 記事の「コード実行できるAI」役は Codex(GPT-5.5 vision) が担う。

---

## 3. 要件

### 3.1 Functional（MVP）

| # | 要件 |
|---|------|
| F1 | `deckweave build <ir.json> [--out x.pptx] [--html x.html]`: DeckIR JSON を ingest し .pptx を生成。`inspect` の逆操作（現状 IR は出力のみで ingress が無い） |
| F2 | DeckIR を **zodスキーマで検証**。AI生成の壊れたJSONは明示エラーで落とす（沈黙失敗禁止） |
| F3 | IR拡張: `ShapeElement.line.dash?: DashStyle`。`dash`指定時、pptxgenjs `dashType` で破線を出力（原則②: 点並べでなく破線アウトライン = prstDash相当） |
| F4 | `deckweave render <pptx> [--out-dir dir]`: LibreOffice headless で各スライドをPNG化（自己チェック用）。LibreOffice不在時は **actionableなエラー**（導入コマンド提示）で終了し、手動Ctrl+A確認(記事Step4)へfallback案内 |
| F5 | MCP に `deckweave_build` / `deckweave_render` を追加（既存4toolと同パターン） |
| F6 | SKILL.md に「Image/PDF → 編集可能PPTX」節を追加。Codex向けに ❶〜❹ の手順 + 3原則のIR記述規約 + PDF→PNG前処理（既存導入済 PyMuPDF の1-linerで可）を明記 |

### 3.2 3原則 → IR記述規約への落とし込み（SKILL.mdに記載）

| 原則 | IRでの表現規約 |
|------|----------------|
| ① テキストを画像化しない | テキストは必ず `type:"text"` 要素。文字を含む領域を `type:"image"` にするのは禁止 |
| ② 破線枠は破線アウトライン | `type:"shape", shape:"rect", fill:transparent, line:{dash:"dash", color}`。点を敷き詰めない |
| ③ AIが自分で見て直す | build→render→原画とPNG比較→ズレ要素のx/y/w/h/colorをpatch→再build。1〜2周で打ち切り |
| （補）日英フォント隙間 | `fontFace` は当面単一指定（pptxgenjs制約）。eastAsia/latin分離は **既知の未解決ギャップ**として明記 |
| （補）複雑グラフィック | ロゴ・写真・図表など再構築困難な領域のみ `type:"image"`(dataUri) でrasterize。テキストには使わない |

### 3.3 Non-Goals（MVP対象外・記事/planのMVP限界を継承）

- charts / SmartArt / animation の構造再現（複雑部はimage要素でrasterize）
- ピクセルパーフェクト保証（記事自身「複雑な資料は多少のズレ→軽微修正」）
- eastAsia/latin デュアルフォント（既知ギャップ）
- 複数ページPDFの一括変換（MVPは「1スライド=1枚」ずつ。記事も同推奨）
- 外部アップロード（全処理ローカル + Codexセッション内で完結）

---

## 4. 実装詳細

### 4.1 `ir.ts`（データ構造変更 = 本specの中核理由）

```ts
export type DashStyle = "solid" | "dash" | "dashDot" | "lgDash" | "lgDashDot" | "sysDash" | "sysDot";

export type ShapeElement = BaseElement & {
  type: "shape";
  shape: "rect" | "line";
  fill?: Fill;
  line?: { color?: string; width?: number; dash?: DashStyle }; // dash 追加
};
```

### 4.2 `pptx-export.ts`

`addElement` の shape分岐の `line` に dashType を渡す:

```ts
line: el.line?.color
  ? { color: el.line.color.replace("#",""), width: el.line.width ?? 1, dashType: el.line.dash ?? "solid" }
  : { transparency: 100 }
```

### 4.3 新規 `src/build.ts`（IR JSON → 成果物）

- `loadDeckIR(path)`: JSON読込 + zod検証（F2）
- CLI `build` / MCP `deckweave_build` から `exportDeckToPptx` + （任意）`renderDeckToHtml`

### 4.4 新規 `src/render.ts`（pptx → PNG）

- `soffice --headless --convert-to pdf --outdir <tmp> <pptx>` → PyMuPDF or pdftoppm でページPNG
  （または `--convert-to png`。複数スライドは個別出力が必要なため pdf 経由が安定）
- soffice 解決: `which soffice` → 無ければ `/Applications/LibreOffice.app/Contents/MacOS/soffice`
  → どちらも無ければ F4 のactionableエラー

### 4.5 依存追加

| 依存 | 用途 | 導入 |
|------|------|------|
| LibreOffice | `render`（自己チェックの自動レンダリング） | `brew install --cask libreoffice`（**ユーザー承認後**） |
| PyMuPDF | PDF→PNG前処理 / render後のページ分割 | ✅ 導入済み（追加不要） |
| pptxgenjs dashType | 破線出力 | ✅ 既存依存(4.0.1)が対応・追加不要 |

> npm依存の新規追加は無し（pptxgenjs既存・PDFはPython側）。

---

## 5. 検証基準（成功条件）

| # | 検証 | 合格条件 | 証明する原則 |
|---|------|----------|-------------|
| V1 | `build` した pptx を PowerPoint で開き Ctrl+A | text/shapeが個別選択枠付き（画像1枚でない） | ① 編集可能 |
| V2 | `line.dash:"dash"` を含むIRをexport | 枠線が実線破線（点の羅列でない）として描画 | ② prstDash |
| V3 | `render x.pptx`（LibreOffice有/無） | 有=PNG生成 / 無=導入コマンド付きエラー | F4 fallback |
| V4 | 実サンプル1枚（画像）でフルループ | 原画 vs rendered が ≤2周で視覚的に一致（Codex vision判定・定性） | ③ 自己修正 |
| V5 | `npm run check`（tsc --noEmit） | パス。既存4コマンドの挙動不変 | additive保証 |

---

## 6. 段階実装計画

1. **P1（決定論コア）**: `ir.ts` dash拡張 → `pptx-export.ts` → `src/build.ts`（+zod） → CLI/MCP登録 → `npm run check` + 手書きIRでV1/V2
2. **P2（レンダラ）**: LibreOffice導入（要承認）→ `src/render.ts` → V3
3. **P3（スキル/ループ）**: SKILL.md に ❶〜❹ + 3原則規約 + PDF前処理を記載 → 実画像1枚でV4
4. **P4（記録）**: IMPLEMENTATION_PLAN.md Phase 4 を本方式に更新 / README "Not yet implemented" から image/PDF を移動

---

## 7. オープン論点（実装着手前に確認したい点）

- **LibreOffice 導入可否**: `brew install --cask libreoffice`（~700MB）を入れてよいか。
  入れない場合 P2/V3/V4 をスキップし「人間がCtrl+A確認」運用（記事Step4）に縮退。
- **Codex sandbox**: `render` の soffice 実行は workspace-write sandbox でフル権限が要る可能性。
  実装時に full-auto / 権限要否を確認。
- **置き場**: 本specは deckweave 内 `docs/`。deckweave自体は未git化のため、git初期化・公開は
  別途ユーザー承認事項（SKILL guardrail）。
