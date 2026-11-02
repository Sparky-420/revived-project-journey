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

- Roles live in public.user_roles (owner/supervisor/operator) and permissions in src/lib/roles.ts; UI hides locked modules but RLS must enforce every write.
- Base formulas and plant rules (premix, phase 2, cold-room traffic light, yield) live in src/lib/formula.ts with tests in src/test/rules.test.ts.
- PIN/biometric quick unlock is device-local (src/lib/quick-lock.ts) on top of the Google session; it is a convenience lock, not the security boundary.
- Android APKs use scripts/prepare-android.ts to build an isolated Capacitor shell under /tmp that loads the published app URL, because login and shared data need the online backend.
