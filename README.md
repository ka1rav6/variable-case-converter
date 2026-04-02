# Variable Case Converter — VS Code Extension

Convert **all user-defined variable and container names** in any file to your
preferred naming convention in one command. Built-in functions, keywords, and
language primitives are automatically preserved.

---

## Features

| Case | Example |
|------|---------|
| `camelCase` | `myVariableName` |
| `PascalCase` | `MyVariableName` |
| `snake_case` | `my_variable_name` |
| `kebab-case` | `my-variable-name` |

- **Whole-file scan** — reads every identifier in the active file
- **Smart skip** — ignores `console`, `Math`, `print`, `React` hooks, language
  keywords, and 200+ built-ins across JS/TS/Python/Go/Rust/PHP
- **Destructuring aware** — handles `const { a, b } = obj` and `const [x, y] = arr`
- **Status bar button** — one-click access at the bottom right of VS Code
- **Right-click menu** — available in the editor context menu
- **Keyboard shortcut** — `Ctrl+Shift+Alt+C` (Windows/Linux) / `Cmd+Shift+Alt+C` (Mac)

---

## Supported Languages

JavaScript · TypeScript · JSX/TSX · Python · Java · C · C++ · C# · Go · Rust · PHP · Ruby · Swift *(and any language via the "proceed anyway" prompt)*

---

## How to Build & Use Locally (Step-by-Step)

### Prerequisites

```
Node.js ≥ 16   (https://nodejs.org)
VS Code        (https://code.visualstudio.com)
```

## Usage

| Method | Action |
|--------|--------|
| Status bar | Click **`$(symbol-variable) Case Convert`** in the bottom-right |
| Command Palette | `Ctrl+Shift+P` → "Convert Identifiers in File" |
| Right-click | Editor context menu → "Variable Case Converter: Convert Identifiers in File" |
| Keyboard | `Ctrl+Shift+Alt+C` / `Cmd+Shift+Alt+C` |

### Example

**Before (mixed):**
```javascript
const UserAge = 25;
let first_name = "Alice";
function calculateTotal_Price(item_price, user_discount) {
  const finalVal = item_price - user_discount;
  return finalVal;
}
```

**After → camelCase:**
```javascript
const userAge = 25;
let firstName = "Alice";
function calculateTotalPrice(itemPrice, userDiscount) {
  const finalVal = itemPrice - userDiscount;
  return finalVal;
}
```

---

## Configuration

No configuration needed — everything works out of the box. Future versions may
add per-language default case settings via `settings.json`.

---

## License

MIT
