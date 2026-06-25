<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan
at specs/001-ochuna-link/plan.md
<!-- SPECKIT END -->

## Git ワークフロー

- ベースブランチは常に `main`
- 作業前に `main` から新しいブランチを切る
- ブランチ命名規則：
  - 新機能: `feat/説明`
  - バグ修正: `fix/説明`

## コードコメントのルール

コードを実装する際は、**初学者（プログラミング初心者）でも理解できる**ように、以下のルールに従ってコメントを記述してください。

- **すべての関数・コンポーネントの冒頭**に、その役割・目的を1〜2行で説明するコメントを書く
- **処理の流れが複雑な箇所**（条件分岐・非同期処理・副作用など）には、何をしているかを日本語で説明するコメントを書く
- **変数名だけでは意図が伝わりにくい箇所**は、その変数が何を表しているかをコメントで補足する
- コメントは**日本語**で書くことを基本とする
- 「何をするか」だけでなく「なぜそうするか」も書くと、より理解しやすいコメントになる

### コメントの例

```tsx
// ユーザーが写真を選択したときに呼ばれる関数
// ファイルサイズが10MBを超える場合はエラーメッセージを表示し、アップロードを中止する
function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
  const f = e.target.files?.[0] // 選択されたファイルを取得
  if (!f) return // ファイルが選択されていなければ何もしない
  if (f.size > MAX_SIZE) {
    setError('10MBを超えるファイルはアップロードできません')
    return
  }
  setFile(f)
  setPreview(URL.createObjectURL(f)) // プレビュー表示用のURLを生成
}
```
