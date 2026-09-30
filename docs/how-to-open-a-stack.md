# スタックを開く

`main` に対する根と、親ブランチに対する子を、ready の PR として開く。マージは根の PR から行う。並びの説明は [スタックド PR](stacked-pr.md) にある。

`origin` がインストールされていて、そのコマンドがこのリポジトリを解決できるときは `origin pr` を使う。無いときは `gh` を使う。このページのコマンドは `gh` である。

## 根を開く

1. `main` からブランチを切る。
2. そのブランチだけの変更をコミットする。
3. ブランチを push する。
4. base を `main` にして PR を作る。

```bash
git checkout -b docs/stacked-pr-chain main
git push -u origin HEAD
gh pr create --base main
```

## 子を開く

1. 親ブランチの先端から子ブランチを切る。
2. 子だけの変更をコミットする。
3. 子ブランチを push する。
4. base を親ブランチにして PR を作る。

```bash
git checkout -b docs/stacked-pr-child docs/stacked-pr-chain
git push -u origin HEAD
gh pr create --base docs/stacked-pr-chain
```

base を開いたあとに直すときは、`gh pr list` で見た番号を NUMBER に入れる。

```bash
gh pr edit NUMBER --base docs/stacked-pr-chain
```

## 根からマージする

根より先に子をマージすると、子の差分に親のコミットが残る。根からマージする。

1. 根の PR を `main` にマージする。
2. GitHub が子 PR の base を `main` に付け替えるまで待つ。
3. 子 PR をマージする。
4. 孫がいるなら、同じ順で続ける。

親ブランチを rebase したあとは、子をその新しい先端へ rebase してから push する。共有ブランチへの force push は、確認を取ってから行う。
