/* js/app.js — To-Do List Life Dashboard
 * Single JavaScript file for all widget modules.
 * Initialisation order (DOMContentLoaded):
 *   1. Storage_Manager
 *   2. Theme_Manager
 *   3. Greeting_Widget
 *   4. Focus_Timer
 *   5. Todo_List
 *   6. Quick_Links
 */

'use strict';


/* ==========================================================================
   Storage_Manager
   Wraps localStorage read/write operations for all widget modules.
   ========================================================================== */

const Storage_Manager = (() => {
  const KEYS = Object.freeze({
    TASKS:  'tld_tasks',
    LINKS:  'tld_links',
    THEME:  'tld_theme',
    TIMER_DURATION: 'tld_timer_duration',
    TASK_SORT: 'tld_task_sort',
  });

  let _available = false;

  function read(key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (_err) {
      return [];
    }
  }

  /** Read a plain (non-array) value; returns `fallback` on miss or error. */
  function readValue(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (_err) {
      return fallback;
    }
  }

  function write(key, array) {
    try {
      localStorage.setItem(key, JSON.stringify(array));
      return { ok: true };
    } catch (error) {
      return { ok: false, error };
    }
  }

  /** Write any JSON-serialisable value (not just arrays). */
  function writeValue(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return { ok: true };
    } catch (error) {
      return { ok: false, error };
    }
  }

  function init() {
    const SENTINEL_KEY = '__tld_sentinel__';
    const SENTINEL_VAL = '1';
    try {
      localStorage.setItem(SENTINEL_KEY, SENTINEL_VAL);
      const result = localStorage.getItem(SENTINEL_KEY);
      localStorage.removeItem(SENTINEL_KEY);
      _available = result === SENTINEL_VAL;
    } catch (_err) {
      _available = false;
    }
  }

  return {
    KEYS,
    read,
    readValue,
    write,
    writeValue,
    init,
    get available() { return _available; },
  };
})();


/* ==========================================================================
   Theme_Manager
   Toggles light / dark mode and persists the preference.
   ========================================================================== */

const Theme_Manager = (() => {
  let _current = 'dark';

  function _apply(theme) {
    _current = theme;
    document.documentElement.setAttribute('data-theme', theme);

    const btn  = document.getElementById('theme-toggle');
    const icon = document.getElementById('theme-icon');
    if (!btn || !icon) return;

    if (theme === 'dark') {
      icon.textContent = '☀️';
      btn.setAttribute('aria-label', 'Switch to light mode');
    } else {
      icon.textContent = '🌙';
      btn.setAttribute('aria-label', 'Switch to dark mode');
    }
  }

  function toggle() {
    const next = _current === 'dark' ? 'light' : 'dark';
    _apply(next);
    Storage_Manager.writeValue(Storage_Manager.KEYS.THEME, next);
  }

  function init() {
    const saved = Storage_Manager.readValue(Storage_Manager.KEYS.THEME, 'dark');
    _apply(saved);

    const btn = document.getElementById('theme-toggle');
    if (btn) btn.addEventListener('click', toggle);
  }

  return { init };
})();


/* ==========================================================================
   Pure helpers
   ========================================================================== */

/**
 * Format seconds as a zero-padded "MM:SS" string.
 * @param {number} seconds
 * @returns {string}
 */
function formatTime(seconds) {
  return (
    String(Math.floor(seconds / 60)).padStart(2, '0') +
    ':' +
    String(seconds % 60).padStart(2, '0')
  );
}

/**
 * Return the appropriate greeting for the given hour (0–23).
 * @param {number} hour
 * @returns {string}
 */
function getGreeting(hour) {
  if (hour >= 5  && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 18) return 'Good Afternoon';
  if (hour >= 18 && hour < 21) return 'Good Evening';
  return 'Good Night';
}


/* ==========================================================================
   Greeting_Widget
   ========================================================================== */

const Greeting_Widget = (() => {
  let _elText = null;
  let _elTime = null;
  let _elDate = null;
  let intervalId = null;

  const _WEEKDAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const _MONTHS   = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

  function _tick() {
    const now = new Date();

    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    _elTime.textContent = hh + ':' + mm;

    const weekday = _WEEKDAYS[now.getDay()];
    const day     = now.getDate();
    const month   = _MONTHS[now.getMonth()];
    const year    = now.getFullYear();
    _elDate.textContent = weekday + ', ' + day + ' ' + month + ' ' + year;

    _elText.textContent = getGreeting(now.getHours());
  }

  function init() {
    _elText = document.querySelector('#greeting-text');
    _elTime = document.querySelector('#greeting-time');
    _elDate = document.querySelector('#greeting-date');

    _tick();
    intervalId = setInterval(_tick, 1000);
  }

  function destroy() {
    clearInterval(intervalId);
    intervalId = null;
  }

  return { init, destroy };
})();


/* ==========================================================================
   Focus_Timer
   25-minute (configurable) Pomodoro-style countdown.
   New: custom duration input (#timer-duration-input + #timer-set-btn).
   ========================================================================== */

const Focus_Timer = (() => {
  // Default duration in seconds (25 min). Restored from localStorage on init.
  let _customDuration = 1500;

  const _state = {
    state:      'idle',
    remaining:  1500,
    intervalId: null,
  };

  let _display          = null;
  let _btnStart         = null;
  let _btnStop          = null;
  let _btnReset         = null;
  let _message          = null;
  let _durationInput    = null;
  let _btnSet           = null;

  // Button disabled-state matrix (true = disabled)
  const _MATRIX = {
    idle:    { start: false, stop: true,  reset: true  },
    running: { start: true,  stop: false, reset: false },
    paused:  { start: false, stop: true,  reset: false },
    expired: { start: false, stop: true,  reset: false },
  };

  function _render() {
    if (_display) _display.textContent = formatTime(_state.remaining);

    const d = _MATRIX[_state.state];
    if (_btnStart) _btnStart.disabled = d.start;
    if (_btnStop)  _btnStop.disabled  = d.stop;
    if (_btnReset) _btnReset.disabled = d.reset;

    // Disable the Set button while timer is running/paused mid-session
    if (_btnSet) {
      _btnSet.disabled         = (_state.state === 'running' || _state.state === 'paused');
      _durationInput.disabled  = (_state.state === 'running' || _state.state === 'paused');
    }
  }

  function _tick() {
    _state.remaining -= 1;
    if (_state.remaining === 0) {
      clearInterval(_state.intervalId);
      _state.intervalId = null;
      _state.state = 'expired';
      if (_message) {
        _message.style.display = '';
        _message.hidden = false;
      }
    }
    _render();
  }

  function start() {
    if (_state.state === 'expired') {
      _state.remaining = _customDuration;
      _state.state = 'idle';
    }
    if (_state.state === 'idle' || _state.state === 'paused') {
      _state.state = 'running';
      _state.intervalId = setInterval(_tick, 1000);
      _render();
    }
  }

  function stop() {
    if (_state.state === 'running') {
      clearInterval(_state.intervalId);
      _state.intervalId = null;
      _state.state = 'paused';
      _render();
    }
  }

  function reset() {
    clearInterval(_state.intervalId);
    _state.intervalId = null;
    _state.state = 'idle';
    _state.remaining = _customDuration;
    if (_message) {
      _message.hidden = true;
      _message.style.display = 'none';
    }
    _render();
  }

  /** Apply a new duration (minutes). Only allowed when idle or expired. */
  function _setDuration() {
    const raw = parseInt(_durationInput.value, 10);
    if (isNaN(raw) || raw < 1 || raw > 120) {
      _durationInput.value = Math.round(_customDuration / 60);
      return;
    }
    _customDuration    = raw * 60;
    _state.remaining   = _customDuration;
    _state.state       = 'idle';
    Storage_Manager.writeValue(Storage_Manager.KEYS.TIMER_DURATION, raw);
    if (_message) {
      _message.hidden = true;
      _message.style.display = 'none';
    }
    _render();
  }

  function init() {
    _display       = document.querySelector('#timer-display');
    _btnStart      = document.querySelector('#timer-start');
    _btnStop       = document.querySelector('#timer-stop');
    _btnReset      = document.querySelector('#timer-reset');
    _message       = document.querySelector('#timer-message');
    _durationInput = document.querySelector('#timer-duration-input');
    _btnSet        = document.querySelector('#timer-set-btn');

    // Restore saved duration
    const savedMinutes = Storage_Manager.readValue(Storage_Manager.KEYS.TIMER_DURATION, 25);
    const validMinutes = (Number.isInteger(savedMinutes) && savedMinutes >= 1 && savedMinutes <= 120)
      ? savedMinutes : 25;
    _customDuration   = validMinutes * 60;
    _state.remaining  = _customDuration;
    if (_durationInput) _durationInput.value = validMinutes;

    if (_message) {
      _message.hidden = true;
      _message.style.display = 'none';
    }

    _render();

    if (_btnStart) _btnStart.addEventListener('click', start);
    if (_btnStop)  _btnStop.addEventListener('click', stop);
    if (_btnReset) _btnReset.addEventListener('click', reset);
    if (_btnSet)   _btnSet.addEventListener('click', _setDuration);

    // Allow pressing Enter inside the duration input
    if (_durationInput) {
      _durationInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); _setDuration(); }
      });
    }
  }

  function destroy() {
    clearInterval(_state.intervalId);
    _state.intervalId = null;
  }

  return { init, start, stop, reset, destroy };
})();


/* ==========================================================================
   Todo_List
   New: sort control (#todo-sort-select) that re-orders the rendered list.
   Sort preference is persisted in localStorage.
   ========================================================================== */

const Todo_List = (() => {
  const _state = {
    tasks:     [],
    editingId: null,
  };

  let _input           = null;
  let _addBtn          = null;
  let _listUl          = null;
  let _sortSelect      = null;
  let _errorBanner     = null;
  let _errorBannerTimer = null;

  // ── Sorting ───────────────────────────────────────────────────────────────

  /** Return a sorted *copy* of the task array for rendering. */
  function _sorted() {
    const mode  = _sortSelect ? _sortSelect.value : 'added';
    const copy  = [..._state.tasks];

    switch (mode) {
      case 'az':
        return copy.sort((a, b) => a.text.localeCompare(b.text));
      case 'za':
        return copy.sort((a, b) => b.text.localeCompare(a.text));
      case 'done-last':
        return copy.sort((a, b) => Number(a.done) - Number(b.done));
      case 'done-first':
        return copy.sort((a, b) => Number(b.done) - Number(a.done));
      case 'added':
      default:
        return copy.sort((a, b) => a.createdAt - b.createdAt);
    }
  }

  // ── Persistence ──────────────────────────────────────────────────────────

  function _save() {
    const result = Storage_Manager.write(Storage_Manager.KEYS.TASKS, _state.tasks);
    if (!result.ok) {
      if (_errorBanner) {
        _errorBanner.textContent = 'Could not save changes — storage may be full.';
        _errorBanner.hidden = false;
        if (_errorBannerTimer !== null) clearTimeout(_errorBannerTimer);
        _errorBannerTimer = setTimeout(() => {
          _errorBanner.hidden = true;
          _errorBannerTimer   = null;
        }, 5000);
      }
    }
  }

  // ── Rendering ────────────────────────────────────────────────────────────

  function _render() {
    _listUl.innerHTML = '';

    _sorted().forEach(task => {
      const li = document.createElement('li');
      li.setAttribute('data-id', task.id);
      if (task.done) li.classList.add('done');

      // Checkbox
      const checkbox        = document.createElement('input');
      checkbox.type         = 'checkbox';
      checkbox.checked      = task.done;
      checkbox.setAttribute('aria-label',
        'Mark task as ' + (task.done ? 'incomplete' : 'complete'));
      checkbox.addEventListener('change', () => _toggleTask(task.id));

      // Edit button
      const editBtn         = document.createElement('button');
      editBtn.className     = 'task-edit-btn';
      editBtn.textContent   = 'Edit';
      editBtn.setAttribute('aria-label', 'Edit task');
      editBtn.addEventListener('click', () => {
        if (_state.editingId !== null && _state.editingId !== task.id) {
          const currentInput = _listUl.querySelector(
            'li[data-id="' + _state.editingId + '"] input.task-edit-input'
          );
          if (currentInput) _confirmEdit(_state.editingId, currentInput.value);
        }
        _startEdit(task.id);
      });

      // Delete button
      const deleteBtn       = document.createElement('button');
      deleteBtn.className   = 'task-delete-btn';
      deleteBtn.textContent = '✕';
      deleteBtn.setAttribute('aria-label', 'Delete task');
      deleteBtn.addEventListener('click', () => _deleteTask(task.id));

      li.appendChild(checkbox);

      if (_state.editingId === task.id) {
        const editInput         = document.createElement('input');
        editInput.type          = 'text';
        editInput.className     = 'task-edit-input';
        editInput.value         = task.text;
        editInput.setAttribute('aria-label', 'Edit task text');
        editInput.setAttribute('maxlength', '500');

        editInput.addEventListener('keydown', e => {
          if (e.key === 'Enter')  { e.preventDefault(); _confirmEdit(task.id, editInput.value); }
          if (e.key === 'Escape') { e.preventDefault(); _cancelEdit(); }
        });
        editInput.addEventListener('blur', () => {
          if (_state.editingId === task.id) _confirmEdit(task.id, editInput.value);
        });

        li.appendChild(editInput);
        requestAnimationFrame(() => editInput.focus());
      } else {
        const textSpan         = document.createElement('span');
        textSpan.className     = 'task-text';
        textSpan.textContent   = task.text;
        li.appendChild(textSpan);
      }

      li.appendChild(editBtn);
      li.appendChild(deleteBtn);
      _listUl.appendChild(li);
    });
  }

  // ── Task operations ──────────────────────────────────────────────────────

  function _addTask() {
    const text = _input.value.trim();
    if (text.length === 0 || text.length > 500) return;
    _state.tasks.push({
      id:        crypto.randomUUID(),
      text,
      done:      false,
      createdAt: Date.now(),
    });
    _save();
    _input.value = '';
    _render();
  }

  function _toggleTask(id) {
    const task = _state.tasks.find(t => t.id === id);
    if (!task) return;
    task.done = !task.done;
    _save();
    _render();
  }

  function _startEdit(id) {
    _state.editingId = id;
    _render();
  }

  function _confirmEdit(id, newText) {
    const trimmed = newText.trim();
    if (trimmed.length === 0) { _cancelEdit(); return; }
    const task = _state.tasks.find(t => t.id === id);
    if (!task) return;
    task.text = trimmed;
    _state.editingId = null;
    _save();
    _render();
  }

  function _cancelEdit() {
    _state.editingId = null;
    _render();
  }

  function _deleteTask(id) {
    _state.tasks = _state.tasks.filter(t => t.id !== id);
    _save();
    _render();
  }

  // ── Init ─────────────────────────────────────────────────────────────────

  function init() {
    _input       = document.querySelector('#todo-input');
    _addBtn      = document.querySelector('#todo-add-btn');
    _listUl      = document.querySelector('#todo-list-ul');
    _sortSelect  = document.querySelector('#todo-sort-select');
    _errorBanner = document.querySelector('#storage-error-banner');

    if (!Storage_Manager.available) {
      const warning         = document.createElement('p');
      warning.className     = 'storage-unavailable-warning';
      warning.textContent   = 'Data persistence is unavailable in this browser context.';
      const widget          = document.querySelector('#todo-list');
      if (widget) widget.insertBefore(warning, widget.firstChild);
    }

    _state.tasks = Storage_Manager.read(Storage_Manager.KEYS.TASKS);

    // Restore saved sort preference
    if (_sortSelect) {
      const savedSort = Storage_Manager.readValue(Storage_Manager.KEYS.TASK_SORT, 'added');
      const validValues = ['added', 'az', 'za', 'done-last', 'done-first'];
      _sortSelect.value = validValues.includes(savedSort) ? savedSort : 'added';

      _sortSelect.addEventListener('change', () => {
        Storage_Manager.writeValue(Storage_Manager.KEYS.TASK_SORT, _sortSelect.value);
        _render();
      });
    }

    _addBtn.addEventListener('click', _addTask);
    _input.addEventListener('keydown', e => { if (e.key === 'Enter') _addTask(); });

    _render();
  }

  return { init };
})();


/* ==========================================================================
   Quick_Links
   ========================================================================== */

const Quick_Links = (() => {
  const _state = { links: [] };

  let _labelInput    = null;
  let _urlInput      = null;
  let _addBtn        = null;
  let _validationMsg = null;
  let _container     = null;
  let _errorBanner   = null;
  let _errorBannerTimer = null;

  function _save() {
    const result = Storage_Manager.write(Storage_Manager.KEYS.LINKS, _state.links);
    if (!result.ok) {
      if (_errorBanner) {
        _errorBanner.textContent = 'Could not save changes — storage may be full.';
        _errorBanner.hidden = false;
        if (_errorBannerTimer !== null) clearTimeout(_errorBannerTimer);
        _errorBannerTimer = setTimeout(() => {
          _errorBanner.hidden = true;
          _errorBannerTimer   = null;
        }, 5000);
      }
    }
  }

  function _deleteLink(id) {
    _state.links = _state.links.filter(link => link.id !== id);
    _save();
    _render();
  }

  function _render() {
    _container.innerHTML = '';
    _state.links.forEach(link => {
      const item      = document.createElement('div');
      item.className  = 'link-item';

      const launchBtn = document.createElement('button');
      launchBtn.className   = 'link-launch-btn';
      launchBtn.textContent = link.label;
      launchBtn.setAttribute('aria-label', 'Open ' + link.label);
      launchBtn.addEventListener('click', () => {
        window.open(link.url, '_blank', 'noopener,noreferrer');
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'link-delete-btn';
      deleteBtn.setAttribute('aria-label', 'Delete ' + link.label);
      deleteBtn.innerHTML = '🗑';
      deleteBtn.addEventListener('click', () => _deleteLink(link.id));

      item.appendChild(launchBtn);
      item.appendChild(deleteBtn);
      _container.appendChild(item);
    });
  }

  function _addLink() {
    const label = _labelInput.value.trim();
    const url   = _urlInput.value.trim();

    if (label.length === 0 && url.length === 0) {
      _validationMsg.textContent = 'Please enter both a label and a URL.';
      _validationMsg.hidden = false;
      return;
    }
    if (label.length === 0) {
      _validationMsg.textContent = 'Please enter a label for the link.';
      _validationMsg.hidden = false;
      return;
    }
    if (url.length === 0) {
      _validationMsg.textContent = 'Please enter a URL for the link.';
      _validationMsg.hidden = false;
      return;
    }

    _state.links.push({
      id:        crypto.randomUUID(),
      label,
      url,
      createdAt: Date.now(),
    });

    _validationMsg.textContent = '';
    _validationMsg.hidden = true;
    _save();
    _labelInput.value = '';
    _urlInput.value   = '';
    _render();
  }

  function init() {
    _labelInput    = document.querySelector('#link-label-input');
    _urlInput      = document.querySelector('#link-url-input');
    _addBtn        = document.querySelector('#link-add-btn');
    _validationMsg = document.querySelector('#link-validation-msg');
    _container     = document.querySelector('#links-container');
    _errorBanner   = document.querySelector('#storage-error-banner');

    _state.links = Storage_Manager.read(Storage_Manager.KEYS.LINKS);
    _addBtn.addEventListener('click', _addLink);
    _render();
  }

  return { init };
})();


/* ==========================================================================
   Bootstrap — DOMContentLoaded
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  Storage_Manager.init();
  Theme_Manager.init();
  Greeting_Widget.init();
  Focus_Timer.init();
  Todo_List.init();
  Quick_Links.init();
});
