# Implementation Plan: To-Do List Life Dashboard

## Overview

Implement a fully client-side single-page dashboard using plain HTML, CSS, and Vanilla JavaScript — no build tools, no external libraries, no server. The app opens via `file://` directly from `index.html`. All state lives in `localStorage` and is mediated by a single `Storage_Manager` module. Five module objects (`Storage_Manager`, `Greeting_Widget`, `Focus_Timer`, `Todo_List`, `Quick_Links`) are co-located inside `js/app.js`.

The implementation proceeds layer by layer: file scaffold → Storage_Manager → Greeting_Widget → Focus_Timer → Todo_List → Quick_Links → styling → wiring and integration.

---

## Tasks

- [x] 1. Scaffold the project file structure and HTML shell
  - Create `index.html` at the workspace root with the standard HTML5 boilerplate (`<!DOCTYPE html>`, `<html lang="en">`, `<head>`, `<body>`).
  - Add a `<link rel="stylesheet" href="css/style.css">` reference in `<head>`.
  - Add a `<script src="js/app.js" defer></script>` reference before `</body>`.
  - Create `css/style.css` as an empty file (content added in later tasks).
  - Create `js/app.js` as an empty file (module objects added in later tasks).
  - Inside `<body>`, add the `<div class="dashboard-grid">` wrapper containing four `<section>` widgets:
    - `<section id="greeting-widget" class="widget widget--greeting">`
    - `<section id="focus-timer" class="widget widget--timer">`
    - `<section id="todo-list" class="widget widget--todo">`
    - `<section id="quick-links" class="widget widget--links">`
  - Inside `#greeting-widget`: add `<p id="greeting-text">`, `<p id="greeting-time">`, `<p id="greeting-date">`.
  - Inside `#focus-timer`: add `<div id="timer-display">25:00</div>`, buttons `#timer-start`, `#timer-stop`, `#timer-reset`, and `<p id="timer-message" hidden>Session complete!</p>`.
  - Inside `#todo-list`: add `<input id="todo-input">`, `<button id="todo-add-btn">Add</button>`, and `<ul id="todo-list-ul">`.
  - Inside `#quick-links`: add `<input id="link-label-input">`, `<input id="link-url-input">`, `<button id="link-add-btn">Add Link</button>`, `<p id="link-validation-msg" hidden></p>`, `<div id="links-container">`, and `<div id="storage-error-banner" hidden></div>`.
  - _Requirements: 6.1, 6.3_

- [x] 2. Implement Storage_Manager
  - [x] 2.1 Write the Storage_Manager module object in `js/app.js`
    - Define `const Storage_Manager = (() => { ... })()` as an IIFE.
    - Implement `KEYS` as a frozen object: `Object.freeze({ TASKS: 'tld_tasks', LINKS: 'tld_links' })`.
    - Implement `read(key)`: call `localStorage.getItem(key)`, wrap in `try/catch`, parse with `JSON.parse`, return result if it's an array, otherwise return `[]`. On any exception return `[]`.
    - Implement `write(key, array)`: wrap `JSON.stringify` + `localStorage.setItem` in `try/catch`; return `{ ok: true }` on success, `{ ok: false, error }` on failure.
    - Implement `init()`: test a sentinel write/read to set an internal `available` flag; expose `available` as a readable property.
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.7, 5.8_

- [x] 3. Implement Greeting_Widget
  - [x] 3.1 Write the pure `getGreeting(hour)` helper function
    - Implement `getGreeting(hour)` inside `js/app.js` as a standalone named function (not inside the module object, so it can be referenced in tests).
    - Mapping: `[5–11]` → `"Good Morning"`, `[12–17]` → `"Good Afternoon"`, `[18–20]` → `"Good Evening"`, `{0–4, 21–23}` → `"Good Night"`.
    - _Requirements: 1.3, 1.4, 1.5, 1.6_

  - [x] 3.3 Write the Greeting_Widget module object
    - Define `const Greeting_Widget = (() => { ... })()` as an IIFE.
    - Implement `init()`: query `#greeting-text`, `#greeting-time`, `#greeting-date` once; call `_tick()` immediately; store `intervalId = setInterval(_tick, 1000)`.
    - Implement `_tick()`: call `new Date()`, format time as `HH:MM` using `padStart(2,'0')`, format date as `"Weekday, D Month YYYY"` using arrays or `Intl.DateTimeFormat`, call `getGreeting(hour)` and set `#greeting-text.textContent`.
    - Implement `destroy()`: call `clearInterval(intervalId)`.
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 4. Implement Focus_Timer
  - [x] 4.1 Write the pure `formatTime(seconds)` helper function
    - Implement `formatTime(seconds)` inside `js/app.js` as a standalone named function.
    - Returns `MM:SS` string: `String(Math.floor(seconds/60)).padStart(2,'0') + ':' + String(seconds%60).padStart(2,'0')`.
    - _Requirements: 2.3_

  - [x] 4.3 Write the Focus_Timer module object and state machine
    - Define `const Focus_Timer = (() => { ... })()` as an IIFE.
    - Internal state: `{ state: 'idle', remaining: 1500, intervalId: null }`.
    - Implement `init()`: query `#timer-display`, `#timer-start`, `#timer-stop`, `#timer-reset`, `#timer-message`; call `_render()`; bind click events to `start()`, `stop()`, `reset()`.
    - Implement `start()`:
      - If `state === 'expired'`: set `remaining = 1500`, set `state = 'idle'`.
      - If `state === 'idle'` or `state === 'paused'`: set `state = 'running'`, start `setInterval(_tick, 1000)`, call `_render()`.
    - Implement `stop()`: if `state === 'running'`, clear interval, set `state = 'paused'`, call `_render()`.
    - Implement `reset()`: clear interval, set `state = 'idle'`, set `remaining = 1500`, hide `#timer-message`, call `_render()`.
    - Implement `_tick()`: decrement `remaining`; if `remaining === 0`, clear interval, set `state = 'expired'`, show `#timer-message`; call `_render()`.
    - Implement `_render()`: update `#timer-display` via `formatTime(remaining)`; apply button enable/disable matrix per state.
    - Implement `destroy()`: clear interval.
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9_

- [x] 5. Checkpoint — core modules passing
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement Todo_List
  - [x] 6.1 Implement task creation and rendering
    - Define `const Todo_List = (() => { ... })()` as an IIFE.
    - Internal state: `{ tasks: [], editingId: null }`.
    - Implement `init()`: load tasks from `Storage_Manager.read(Storage_Manager.KEYS.TASKS)`; bind `#todo-add-btn` click and `#todo-input` keydown (Enter) to `_addTask()`; call `_render()`.
    - Implement `_addTask()`: read `#todo-input` value, trim, reject if empty or length > 500; create `Task { id: crypto.randomUUID(), text, done: false, createdAt: Date.now() }`; push to `tasks`; call `_save()`, clear input, call `_render()`.
    - Implement `_render()`: clear `#todo-list-ul`; for each task, create `<li data-id="…">` with checkbox, text span, Edit button, and Delete button; apply `.done` class and strikethrough for completed tasks.
    - _Requirements: 3.1, 3.2, 3.3, 3.11_

  - [x] 6.3 Implement task toggle and delete
    - Implement `_toggleTask(id)`: find task by id, flip `done`, call `_save()`, call `_render()`.
    - Implement `_deleteTask(id)`: filter out task by id, call `_save()`, call `_render()`.
    - Wire checkbox `change` and Delete button `click` in `_render()` to `_toggleTask(id)` and `_deleteTask(id)`.
    - _Requirements: 3.4, 3.9, 3.10_

  - [x] 6.6 Implement task edit mode
    - Implement `_startEdit(id)`: set `editingId = id`, call `_render()`. In `_render()`, when `editingId` matches a task's id, render an `<input>` pre-populated with the task text instead of a text span.
    - Implement `_confirmEdit(id, newText)`: trim `newText`; if empty, call `_cancelEdit(id)`; else update `task.text`, clear `editingId`, call `_save()`, call `_render()`.
    - Implement `_cancelEdit()`: clear `editingId`, call `_render()`.
    - Wire Edit button click to `_startEdit(id)`, Escape keydown on the edit input to `_cancelEdit()`, and Enter keydown / blur on the edit input to `_confirmEdit(id, value)`.
    - Handle implicit save when a second task's Edit is clicked while another is in edit mode.
    - _Requirements: 3.5, 3.6, 3.7, 3.8_

  - [x] 6.7 Implement Storage_Manager write and error handling in Todo_List
    - Implement `_save()`: call `Storage_Manager.write(Storage_Manager.KEYS.TASKS, tasks)`; if result is `{ ok: false }`, display `#storage-error-banner` with message "Could not save changes — storage may be full.", auto-dismiss after 5 seconds; do NOT mutate `tasks`.
    - On `init()`, check `Storage_Manager.available`; if false, display a persistent warning in the widget: "Data persistence is unavailable in this browser context."
    - _Requirements: 3.10, 3.12, 3.13, 5.8_


- [x] 7. Implement Quick_Links
  - [x] 7.1 Implement link creation and rendering
    - Define `const Quick_Links = (() => { ... })()` as an IIFE.
    - Internal state: `{ links: [] }`.
    - Implement `init()`: load links from `Storage_Manager.read(Storage_Manager.KEYS.LINKS)`; bind `#link-add-btn` click to `_addLink()`; call `_render()`.
    - Implement `_addLink()`: read and trim `#link-label-input` and `#link-url-input`; if either is empty/whitespace, show `#link-validation-msg` with an appropriate message and return; create `Link { id: crypto.randomUUID(), label, url, createdAt: Date.now() }`; push to `links`; hide `#link-validation-msg`; call `_save()`, clear inputs, call `_render()`.
    - Implement `_render()`: clear `#links-container`; for each link, create a `<button>` with the label text and a Delete icon; bind button click to `window.open(link.url, '_blank', 'noopener,noreferrer')`.
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.7_

  - [x] 7.3 Implement link deletion and error handling
    - Implement `_deleteLink(id)`: filter out link by id; call `_save()`; call `_render()`.
    - Wire Delete button click in `_render()` to `_deleteLink(id)`.
    - Implement `_save()`: call `Storage_Manager.write(Storage_Manager.KEYS.LINKS, links)`; if `{ ok: false }`, display `#storage-error-banner` with "Could not save changes — storage may be full.", auto-dismiss after 5 seconds.
    - _Requirements: 4.5, 4.6, 4.8_

- [x] 8. Checkpoint — all widget logic passing
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Apply CSS styling and layout
  - [x] 9.1 Implement CSS custom properties, reset, and base styles
    - At the top of `css/style.css`, define CSS custom properties on `:root`:
      - `--color-bg: #1a1a2e`
      - `--color-surface: #16213e`
      - `--color-text: #e0e0e0`
      - `--color-accent: #0f3460`
      - `--color-accent-hover: #533483`
      - `--color-done: #6c757d`
      - `--text-heading: 1.5rem`
      - `--text-subheading: 1.125rem`
      - `--text-body: 0.875rem`
    - Add a minimal reset: `box-sizing: border-box`, `margin: 0`, `padding: 0` on `*`.
    - Set `body` background to `var(--color-bg)`, color to `var(--color-text)`, and a readable sans-serif font stack.
    - _Requirements: 7.2, 7.3_

  - [x] 9.2 Implement the dashboard grid and widget card styles
    - Style `.dashboard-grid`: `display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: auto auto; gap: 1.5rem; padding: 1.5rem;`.
    - Style `.widget`: `background: var(--color-surface); border-radius: 8px; padding: 1.5rem;`.
    - Style `h2` inside widgets: `font-size: var(--text-heading)` (≥ 24px).
    - Style sub-headings / labels: `font-size: var(--text-subheading)` (≥ 18px).
    - Style body text and list items: `font-size: var(--text-body)` (≥ 14px).
    - Add `@media (max-width: 768px)` breakpoint: set `.dashboard-grid { grid-template-columns: 1fr; }`.
    - _Requirements: 7.2, 7.4_

  - [x] 9.3 Implement interactive element styles and focus indicators
    - Style `button`, `input` elements inside widgets using accent colours.
    - Add hover state: `background: var(--color-accent-hover)` on buttons.
    - Add universal focus indicator: `:focus-visible { outline: 2px solid #e0e0e0; outline-offset: 2px; }` on `button`, `input`, `a`.
    - Style completed tasks: `.task-item.done .task-text { text-decoration: line-through; color: var(--color-done); }`.
    - Style `#timer-message` as visually prominent (larger font, contrasting colour).
    - Style `#storage-error-banner` and `#link-validation-msg` as visible alert/warning boxes.
    - _Requirements: 7.3, 7.5_

- [x] 10. Wire all modules together in DOMContentLoaded and perform integration
  - [x] 10.1 Write the DOMContentLoaded bootstrap in js/app.js
    - At the bottom of `js/app.js`, add:
      ```js
      document.addEventListener('DOMContentLoaded', () => {
        Storage_Manager.init();
        Greeting_Widget.init();
        Focus_Timer.init();
        Todo_List.init();
        Quick_Links.init();
      });
      ```
    - Ensure module objects are defined before this event listener in the file.
    - _Requirements: 5.4, 6.1, 6.2, 6.3, 6.4_

  - [x] 10.2 Validate cross-browser compatibility and file:// protocol operation
    - Open `index.html` directly via the `file://` protocol in Chrome, Firefox, Edge, and Safari.
    - Verify no uncaught JavaScript errors appear in the console.
    - Verify all four widgets render and all interactive controls (greeting tick, timer, add/delete tasks, add/delete links) function correctly.
    - Verify tasks and links survive a page reload (data persisted via localStorage).
    - _Requirements: 6.2, 6.3, 6.4_

- [x] 11. Final checkpoint — full suite passing
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP.
- Property tests in `tests/*.test.html` use plain JavaScript `console.assert` or a minimal inline harness — no external framework required (NFR-1 simplicity). Each test file is a standalone HTML file that can be opened directly via `file://`.
- Each task references specific requirements for traceability.
- Checkpoints ensure incremental validation at module-level (task 5) and widget-level (task 8) before final integration (task 11).
- Property tests validate universal correctness properties; example-based assertions in integration tests validate specific scenarios and edge cases.
- The `tests/` directory is development-only scaffolding and is NOT part of the production file structure (which remains exactly `index.html`, `css/style.css`, `js/app.js` per Requirements 6.1).

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "3.1", "4.1"] },
    { "id": 1, "tasks": ["2.2", "2.3", "3.2", "3.3", "4.2", "4.3"] },
    { "id": 2, "tasks": ["4.4", "6.1", "9.1"] },
    { "id": 3, "tasks": ["6.2", "6.3", "7.1", "9.2"] },
    { "id": 4, "tasks": ["6.4", "6.5", "6.6", "7.2", "7.3", "9.3"] },
    { "id": 5, "tasks": ["6.7", "6.8", "7.4", "10.1"] },
    { "id": 6, "tasks": ["10.2", "10.3"] }
  ]
}
```
