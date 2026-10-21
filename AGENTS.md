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

## Architecture rules
- Rule engine lives in `src/lib/alpha/` as pure functions (parser, evaluator, validate, adapters); UI must not reimplement decision logic — keeps behavior unit-testable.
- Persistence is browser localStorage via `src/lib/alpha/store.ts`; any UI must keep the "仅浏览器演示模式，非24h后台调度" marking until a real backend worker exists — honesty requirement.
- Data access goes through the `DataAdapter` interface; unconnected adapters must report not-connected, never fake data.
- Dedupe key format is `taskId:v{ruleVersion}:e{episode}`; editing a rule creates a new version and resets runtime state — version isolation.
