# <span style="color:#6366F1">🧭 Playwright CLI Guide</span>

> <span style="color:#0EA5E9"><strong>Goal:</strong></span> Use this guide whenever UI test case development is done in agent mode.
> <span style="color:#10B981"><strong>Required flow:</strong></span> Run the <code>playwright-cli</code> skill/workflow first, then apply manual refinements to satisfy framework standards.

---

## <span style="color:#3B82F6">🎯 Purpose</span>

This guide makes Playwright CLI usage actionable and repeatable for UI automation work.
It ensures generated output aligns with project rules in AGENT_INSTRUCTIONS and the UI test development guide.

---

## <span style="color:#8B5CF6">🧪 When To Use</span>

Use <code>playwright-cli</code> when you need to:
- 🆕 Create a new UI test flow from requirements
- 🏗️ Scaffold a new page object and related spec
- 🧭 Automate browser-driven step discovery for a new scenario
- 🔍 Validate selectors or interaction paths before coding

---

## <span style="color:#F59E0B">🛠️ Prerequisites</span>

Before you start, confirm:
- ✅ Project dependencies are installed (<code>npm ci</code>)
- ✅ Playwright setup is valid for the target project
- ✅ Target flow, tenant, and expected assertions are defined

---

## <span style="color:#06B6D4">🤖 How To Invoke In Agent Mode</span>

In Copilot Chat (agent mode), explicitly request <code>playwright-cli</code> automation.

### <span style="color:#14B8A6">💬 Example Prompts</span>

- "Use playwright-cli to generate a UI test skeleton for TC1 login flow and include page object methods."
- "Use playwright-cli to automate the booking flow steps and produce spec + page object updates."
- "Use playwright-cli to validate selectors for passenger details screen and propose stable locators."

---

## <span style="color:#10B981">🔄 Recommended Workflow</span>

1. 🚀 Use <code>playwright-cli</code> to discover and automate the UI flow.
2. 🧱 Generate or update page object methods based on discovered actions.
3. 🐾 Keep all interactions via <code>BlackPanther</code> methods.
4. 🗂️ Add test data in the appropriate <code>testdata/{tenant}/{subenv}</code> JSON.
5. ✅ Ensure assertions use the <code>assert</code> fixture.
6. 🔎 Run validation checks:
   - <code>npx tsc --noEmit</code>
   - <code>npm run lint</code>
   - <code>npx playwright test --project=call-center --grep "@sanity"</code> (or relevant project/tag)

---

## <span style="color:#EF4444">📏 Required Compliance After Generation</span>

Output from <code>playwright-cli</code> must still satisfy framework standards:
- 📄 One page object per screen
- 🪵 Logger entry and completion logs in public methods
- 📝 JSDoc on public methods
- 🚫 No raw Playwright calls inside page objects
- 📌 Variables declared at the top of each test
- 🔐 No hardcoded test data in specs

---

## <span style="color:#D97706">🩺 Troubleshooting</span>

If automation output is incomplete or ambiguous:
- ♻️ Rerun with a narrower scenario scope and explicit acceptance criteria
- 🎯 Request one screen/flow at a time
- 🧩 Provide locator strategy preference (ID first, then data attributes)
- 🧠 Manually refine generated code to align with <code>AGENT_INSTRUCTIONS.md</code>
