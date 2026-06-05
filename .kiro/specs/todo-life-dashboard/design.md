# Design Document: To-Do List Life Dashboard

## Overview

The To-Do List Life Dashboard is a fully client-side, single-page web application built with plain HTML, CSS, and Vanilla JavaScript. No build step, no server, no dependencies — the app opens directly from `index.html` via the `file://` protocol in any modern browser.

The dashboard presents four self-contained widgets:

| Widget | Responsibility |
|---|---|
| **Greeting_Widget** | Displays the live clock, date, and a time-aware greeting |
| **Focus_Timer** | Manages a 25-minute Pomodoro-style countdown |
| **Todo_List** | Persists and renders a collection of user tasks |
| **Quick_Links** | Persists and renders user-defined URL shortcuts |

All data lives in `localStorage`. A single `Storage_Manager` module mediates every read and write, keeping widget code free of storage concerns.

---

## Architecture

### Layered Design

```
┌─────────────────────────────────────────────────────┐
│                     index.html                       │
│         (page shell, widget markup slots)            │
└────────────────────┬────────────────────────────────┘
                     │ loads
┌────────────────────▼────────────────────────────────┐
│                   js/app.js                          │
│  ┌──────────────┐  ┌────────────┐  ┌─────────────┐  │
│  │Greeting_Widget│ │Focus_Timer │  │ Todo_List   │  │
│  └──────────────┘  └────────────┘  └─────────────┘  │
│                    ┌─────────────┐                   │
│                    │ Quick_Links │                   │
│                    └─────────────┘                   │
│  ─────────────────────────────────────────────────  │
│                  Storage_Manager                     │
│  (single module, wraps localStorage read/write)      │
└─────────────────────────────────────────────────────┘
                     │ reads/writes
┌────────────────────▼────────────────────────────────┐
│              Browser localStorage API               │
└─────────────────────────────────────────────────────┘
```

### Module Boundaries

Each widget is implemented as a plain JavaScript **module object** (IIFE or `const WidgetName = (() => { ... })()`) exposed on the global scope only for cross-module wiring in `app.js`. This avoids a build tool requirement while still enforcing encapsulation.

```
js/app.js
├─ Storage_Manager   (module)
├─ Greeting_Widget   (module)
├─ Focus_Timer       (module)
├─ Todo_List         (module)
└─ Quick_Links       (module)
```

Initialisation order in `app.js` `DOMContentLoaded` handler:

1. `Storage_Manager.init()`
2. `Greeting_Widget.init()`
3. `Focus_Timer.init()`
4. `Todo_List.init()`
5. `Quick_Links.init()`

---

## Components and Interfaces

### Storage_Manager

**Public API**

```js
Storage_Manager.read(key)            // → Array | []
Storage_Manager.write(key, array)    // → { ok: true } | { ok: false, error: Error }
Storage_Manager.KEYS                 // { TASKS: 'tld_tasks', LINKS: 'tld_links' }
```

- `read(key)` wraps `localStorage.getItem` + `JSON.parse`. Returns an empty array on `null`, malformed JSON, or any exception.
- `write(key, array)` wraps `JSON.stringify` + `localStorage.setItem` inside a `try/catch`. Returns a result object; never throws.
- `KEYS` is a frozen constants object to avoid typos and enable easy renaming.

---

### Greeting_Widget

**Public API**

```js
Greeting_Widget.init()    // starts the 1-second setInterval loop
Greeting_Widget.destroy() // clears the interval (for testing)
```

**Internal state:** `intervalId` (number | null)

**DOM targets** (queried once at `init` time):
- `#greeting-text` — greeting string
- `#greeting-time` — HH:MM clock
- `#greeting-date` — full date string

**Greeting logic (pure function, exportable for testing):**

```js
function getGreeting(hour) {
  if (hour >= 5  && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 18) return 'Good Afternoon';
  if (hour >= 18 && hour < 21) return 'Good Evening';
  return 'Good Night'; // covers 21–23 and 0–4
}
```

**Time update loop:**
- Calls `new Date()` on every tick.
- Formats time with `String(h).padStart(2,'0') + ':' + String(m).padStart(2,'0')`.
- Formats date with `Intl.DateTimeFormat` or manual weekday/month arrays to avoid locale inconsistencies.

---

### Focus_Timer

**Public API**

```js
Focus_Timer.init()    // binds button events, renders initial state
Focus_Timer.destroy() // clears interval (for testing)
```

**State machine — four states:**

```
         start()
  IDLE ──────────────► RUNNING
   ▲                      │  │
   │  reset()             │  │ stop()
   │  ◄───────────────────┘  │
   │                         ▼
   │  reset()          PAUSED
   │  ◄───────────────────┐
   │                      │ start() (resume)
   │                   RUNNING (again)
   │
EXPIRED ◄── countdown hits 0 (from RUNNING)
   │
   │ start() → resets to 1500s, transitions to RUNNING
```

**Internal state:**

```js
{
  state:     'idle' | 'running' | 'paused' | 'expired',
  remaining: number,  // seconds, 0–1500
  intervalId: number | null
}
```

**Button enable/disable matrix:**

| State   | Start   | Stop    | Reset   |
|---------|---------|---------|---------|
| idle    | enabled | disabled | disabled |
| running | disabled | enabled | enabled |
| paused  | enabled | disabled | enabled |
| expired | enabled | disabled | enabled |

**DOM targets:**
- `#timer-display` — shows MM:SS
- `#timer-start`, `#timer-stop`, `#timer-reset` — control buttons
- `#timer-message` — completion message (hidden until `expired`)

**Countdown logic:**
- `setInterval` fires every 1000 ms, decrements `remaining`.
- On `remaining === 0`: clears interval, sets state to `expired`, shows `#timer-message`.
- `formatTime(seconds)` is a pure function: `MM:SS` with zero-padding.

---

### Todo_List

**Public API**

```js
Todo_List.init()    // loads from storage, renders list, binds add-form events
```

**Internal state:**

```js
{
  tasks: Task[],       // in-memory array, source of truth
  editingId: string | null  // id of task currently in edit mode
}
```

**Task lifecycle:**
- **Add**: validate → create `Task` → push to array → save → re-render
- **Toggle**: find by id → flip `done` → save → re-render
- **Edit start**: set `editingId` → re-render (shows input)
- **Edit confirm**: validate → update `text` → clear `editingId` → save → re-render
- **Edit cancel (Escape)**: clear `editingId` → re-render
- **Delete**: filter out by id → save → re-render

**Validation rules:**
- Empty / whitespace-only → reject (no storage write, no list change)
- Over 500 chars → reject

**DOM targets:**
- `#todo-input` — new task text field
- `#todo-add-btn` — add button
- `#todo-list` — `<ul>` container, re-rendered on every state change

**Rendering strategy:** Full list re-render on every mutation (simple, correctness-first). Each `<li>` item gets a `data-id` attribute matching `task.id`.

---

### Quick_Links

**Public API**

```js
Quick_Links.init()  // loads from storage, renders links, binds form events
```

**Internal state:**

```js
{
  links: Link[]  // in-memory array
}
```

**Link lifecycle:**
- **Add**: validate both fields → create `Link` → push → save → re-render
- **Delete**: filter out by id → save → re-render
- **Launch**: `window.open(link.url, '_blank', 'noopener,noreferrer')`

**URL handling:** Stored and used as-is. No auto-prefixing of `https://` at storage time, but the `<a>` href is always used via `window.open` to prevent navigation away from the dashboard.

**DOM targets:**
- `#link-label-input`, `#link-url-input` — input fields
- `#link-add-btn` — add button
- `#link-validation-msg` — inline validation message area
- `#links-container` — rendered link buttons

---

## Data Models

### Task

```js
/**
 * @typedef {Object} Task
 * @property {string} id        - UUID v4 generated at creation time (crypto.randomUUID())
 * @property {string} text      - Task description, 1–500 characters (trimmed)
 * @property {boolean} done     - Completion status; false on creation
 * @property {number} createdAt - Unix timestamp (Date.now()) at creation
 */
```

**Example:**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "text": "Review pull requests",
  "done": false,
  "createdAt": 1748908800000
}
```

**Invariants:**
- `text.trim().length >= 1` and `text.length <= 500`
- `done` is strictly boolean
- `id` is unique across the collection
- `createdAt` is a positive integer

---

### Link

```js
/**
 * @typedef {Object} Link
 * @property {string} id        - UUID v4 generated at creation time
 * @property {string} label     - Display name, 1+ characters (trimmed)
 * @property {string} url       - URL string, 1+ characters (trimmed)
 * @property {number} createdAt - Unix timestamp at creation
 */
```

**Example:**

```json
{
  "id": "f1e2d3c4-b5a6-7890-fedc-ba9876543210",
  "label": "GitHub",
  "url": "https://github.com",
  "createdAt": 1748908900000
}
```

**Invariants:**
- `label.trim().length >= 1`
- `url.trim().length >= 1`
- `id` is unique across the collection

---

### localStorage Key Schema

| Key | Value Type | Description |
|---|---|---|
| `tld_tasks` | JSON string (`Task[]`) | Complete task collection |
| `tld_links` | JSON string (`Link[]`) | Complete link collection |

The prefix `tld_` (todo-life-dashboard) avoids collisions with other apps sharing the same origin.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Greeting band coverage

*For any* integer hour in the range [0, 23], the `getGreeting(hour)` function SHALL return exactly one of {"Good Morning", "Good Afternoon", "Good Evening", "Good Night"}, with the mapping: [5–11] → "Good Morning", [12–17] → "Good Afternoon", [18–20] → "Good Evening", and {0–4, 21–23} → "Good Night". No hour SHALL produce a result outside this set, and no hour SHALL produce a result inconsistent with its band.

**Validates: Requirements 1.3, 1.4, 1.5, 1.6**

---

### Property 2: Timer display format correctness

*For any* integer number of seconds in the range [0, 1500], the `formatTime(seconds)` function SHALL return a string that (a) matches the pattern `^\d{2}:\d{2}$`, (b) has the minutes component equal to `Math.floor(seconds / 60)` zero-padded to two digits, and (c) has the seconds component equal to `seconds % 60` zero-padded to two digits.

**Validates: Requirements 2.3**

---

### Property 3: Collection serialisation round-trip (Tasks and Links)

*For any* valid array of `Task` objects and *for any* valid array of `Link` objects, serialising the array via `Storage_Manager.write(key, array)` and then reading it back via `Storage_Manager.read(key)` SHALL produce an array that is deeply equal to the original — same item count, same field values (`id`, `text`/`label`/`url`, `done`, `createdAt`), and same order.

*This property consolidates Requirements 5.3, 5.4, 5.5, and the storage write obligations from 3.10 and 4.6.*

**Validates: Requirements 3.10, 4.6, 5.3, 5.4, 5.5**

---

### Property 4: Storage_Manager graceful recovery from corrupt data

*For any* string (including empty string, random bytes, partial JSON, or valid non-array JSON) stored under a key, calling `Storage_Manager.read(key)` SHALL return an empty array `[]` and SHALL NOT throw an exception.

**Validates: Requirements 5.6**

---

### Property 5: Whitespace input rejection

*For any* string composed entirely of whitespace characters (spaces U+0020, tabs U+0009, newlines U+000A, carriage returns U+000D, or any combination), submitting it as (a) a new task description or (b) an edit confirmation for an existing task SHALL leave the respective collection unchanged — the in-memory array SHALL have the same length and all items SHALL retain their original field values.

**Validates: Requirements 3.3, 3.7**

---

### Property 6: Task addition appends a single incomplete task

*For any* existing task list and any valid task description string (trimmed length 1–500), calling `addTask(description)` SHALL increase the task list length by exactly 1, and the new task SHALL satisfy: `text === description.trim()`, `done === false`, and `id` is unique within the collection.

**Validates: Requirements 3.2**

---

### Property 7: Task deletion removes exactly one task by id

*For any* task list containing at least one task, calling `deleteTask(id)` for any id present in the list SHALL decrease the list length by exactly 1 and SHALL NOT leave any task with that `id` in the resulting list. All other tasks SHALL remain with their original field values in their original relative order.

**Validates: Requirements 3.9**

---

### Property 8: Completion toggle is its own inverse

*For any* task (regardless of its current `done` value), applying the completion toggle twice SHALL return the task's `done` field to its original value. In other words, `toggle(toggle(task)).done === task.done`.

**Validates: Requirements 3.4**

---

### Property 9: Link addition and deletion maintain collection integrity

*For any* link list, adding a `Link` with a non-empty `label` and non-empty `url` SHALL increase the collection size by exactly 1. Conversely, for any link list with at least one link, deleting a link by its `id` SHALL decrease the collection size by exactly 1 and SHALL NOT leave any link with that `id` in the resulting collection.

**Validates: Requirements 4.2, 4.5**

---

### Property 10: Link validation rejects empty fields

*For any* pair where at least one of `label` or `url` is an empty or whitespace-only string, calling `addLink(label, url)` SHALL leave the link collection unchanged and SHALL produce a validation error message (non-empty string).

**Validates: Requirements 4.3**

---

### Property 11: Timer start/stop round-trip preserves remaining time

*For any* remaining-time value in the range [1, 1499] seconds, transitioning the Focus_Timer from paused/idle to running (via `start()`) and then immediately back to paused (via `stop()`) SHALL leave `state.remaining` equal to the original value. The timer SHALL NOT have decremented during an instantaneous stop.

**Validates: Requirements 2.2, 2.4**

---

## UI Layout Design

### File / Folder Structure

```
index.html
css/
  style.css
js/
  app.js
```

Exactly one file per type, satisfying Requirement 6.1.

### Page Shell (index.html)

```html
<body>
  <div class="dashboard-grid">
    <section id="greeting-widget"   class="widget widget--greeting">…</section>
    <section id="focus-timer"       class="widget widget--timer">…</section>
    <section id="todo-list"         class="widget widget--todo">…</section>
    <section id="quick-links"       class="widget widget--links">…</section>
  </div>
</body>
```

### Responsive Grid (css/style.css)

**Desktop (≥769 px):** 2-column CSS Grid

```css
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto auto;
  gap: 1.5rem;
  padding: 1.5rem;
}
```

Widget placement:

```
┌────────────────────┬────────────────────┐
│  Greeting_Widget   │    Focus_Timer     │
├────────────────────┼────────────────────┤
│    Todo_List       │   Quick_Links      │
└────────────────────┴────────────────────┘
```

**Mobile (≤768 px):** Single-column reflow

```css
@media (max-width: 768px) {
  .dashboard-grid {
    grid-template-columns: 1fr;
  }
}
```

Widgets stack in DOM order: Greeting → Timer → Todo → Links.

### Typography Scale

| Element | Min size | CSS token |
|---|---|---|
| Widget headings (`<h2>`) | 24 px | `--text-heading: 1.5rem` |
| Sub-headings / labels | 18 px | `--text-subheading: 1.125rem` |
| Body / list items | 14 px | `--text-body: 0.875rem` |

### Colour and Contrast

- Background: `#1a1a2e` (dark navy)
- Widget surface: `#16213e`
- Primary text: `#e0e0e0` (contrast ≥ 4.5:1 on widget surface)
- Accent / interactive: `#0f3460` → hover `#533483`
- Completion text (done tasks): `#6c757d` with strikethrough

### Focus Indicators

All interactive elements (`button`, `input`, `a`) receive:

```css
:focus-visible {
  outline: 2px solid #e0e0e0;
  outline-offset: 2px;
}
```

Meets WCAG 2.1 SC 2.4.11 (minimum 2 px, ≥ 3:1 contrast).

---

## Error Handling

### Storage write failure

`Storage_Manager.write` wraps `localStorage.setItem` in a `try/catch`. On failure it returns `{ ok: false, error }`. Callers (`Todo_List`, `Quick_Links`) check the result and, if `ok` is false:

1. Do **not** apply the mutation to the in-memory state.
2. Render a visible error banner (e.g., `#storage-error-banner`) with text such as "Could not save changes — storage may be full."
3. The banner auto-dismisses after 5 seconds or on next successful write.

### Storage unavailability on load

`Storage_Manager.read` catches all exceptions (including `SecurityError` when `localStorage` is blocked). Returns `[]` and sets an internal `available` flag to `false`. `Todo_List.init` and `Quick_Links.init` check this flag and display a persistent warning: "Data persistence is unavailable in this browser context."

### Timer edge cases

- If `setInterval` drifts, the display may lag by up to 1 second; this is acceptable for a Pomodoro timer.
- Calling `start()` on a running timer is a no-op (Start button is disabled in `running` state).
- Calling `reset()` while running clears the interval before resetting state to avoid ghost intervals.

### Task edit mode conflict

Only one task can be in edit mode at a time (`editingId` is a single value). Clicking Edit on a second task while another is being edited implicitly saves the current edit if valid, or cancels it if the field is empty.

---

