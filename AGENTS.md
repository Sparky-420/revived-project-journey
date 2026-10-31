<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- The Don Cangrejo app logic lives in src/legacy (vanilla JS + CSS rendered by src/routes/index.tsx); keep its localStorage keys unchanged so saved prices/history survive.
- Android APKs use scripts/prepare-android.ts to package the same legacy assets in an isolated Capacitor workspace under /tmp; this keeps native builds independent of the hosted TanStack app and avoids service workers in preview.
