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

根より先に子を `main` へマージすると、子の PR に載っている親のコミットも `main` へ入る。先に根をマージする。

1. 根の PR を `main` にマージする。
2. 根の head ブランチを、マージ済み PR の Delete branch で消す。自動削除がオンなら、マージ時の削除でもよい。
3. GitHub は、消したブランチを base にしている未マージの PR を、根の base である `main` へ付け替える。
4. 子の Files changed が子だけの差分になったことを確認してから、子をマージする。
5. 孫がいるなら、同じ順で続ける。

`gh pr merge --delete-branch` や `git push origin --delete` で根のブランチを消すと、子が付け替えられずに閉じることがある。`gh` で根をマージしたときは、ブランチを消す前に子の base を `main` へ移す。NUMBER は `gh pr list` で見た子の番号である。

```bash
gh pr edit NUMBER --base main
```

手順の根拠は GitHub Docs の [Managing branches within your repository](https://docs.github.com/en/pull-requests/how-tos/commit-changes/managing-branches-within-your-repository) にある。

親ブランチを rebase したあとは、子をその新しい先端へ rebase してから push する。共有ブランチへの force push は、確認を取ってから行う。
