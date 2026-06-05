# Requirements Document

## Introduction

The **To-Do List Life Dashboard** is a client-side web application built with plain HTML, CSS, and Vanilla JavaScript. It serves as a personal productivity hub accessible from any modern browser, requiring no backend server or installation. The dashboard presents four integrated widgets on a single page: a real-time greeting with date and time, a focus (Pomodoro-style) timer, a persistent to-do list, and a quick-links launcher. All user data is stored locally in the browser using the Local Storage API.

---

## Glossary

- **Dashboard**: The single-page web application that hosts all four productivity widgets.
- **Greeting_Widget**: The UI component that displays the current time, date, and a time-based greeting message.
- **Focus_Timer**: The UI component that implements a 25-minute countdown timer with Start, Stop, and Reset controls.
- **Todo_List**: The UI component that manages a collection of tasks the user can add, edit, mark as done, and delete.
- **Quick_Links**: The UI component that stores and displays user-defined website shortcuts as clickable buttons.
- **Storage_Manager**: The JavaScript module responsible for reading and writing all data to the browser's Local Storage API.
- **Task**: A single to-do item consisting of a text description and a completion status.
- **Link**: A user-defined shortcut consisting of a display label and a URL.
- **Session**: A single uninterrupted 25-minute countdown period on the Focus_Timer.

---

## Requirements

### Requirement 1: Real-Time Greeting Display

**User Story:** As a user, I want to see the current time, date, and a greeting that reflects the time of day, so that I can quickly orient myself when I open the dashboard.

#### Acceptance Criteria

1. THE Greeting_Widget SHALL display the current time in 24-hour HH:MM format, updated every second.
2. THE Greeting_Widget SHALL display the current date in the format "Weekday, D Month YYYY" (e.g., "Monday, 2 June 2025").
3. IF the local time is 05:00 or later AND before 12:00, THEN THE Greeting_Widget SHALL display the greeting "Good Morning", and no other greeting SHALL be displayed simultaneously.
4. IF the local time is 12:00 or later AND before 18:00, THEN THE Greeting_Widget SHALL display the greeting "Good Afternoon", and no other greeting SHALL be displayed simultaneously.
5. IF the local time is 18:00 or later AND before 21:00, THEN THE Greeting_Widget SHALL display the greeting "Good Evening", and no other greeting SHALL be displayed simultaneously.
6. IF the local time is 21:00 or later OR before 05:00 (including exactly 00:00), THEN THE Greeting_Widget SHALL display the greeting "Good Night", and no other greeting SHALL be displayed simultaneously.
7. THE Greeting_Widget SHALL derive the current time from the browser's local clock without requiring a network request.

---

### Requirement 2: Focus Timer

**User Story:** As a user, I want a 25-minute countdown timer with Start, Stop, and Reset controls, so that I can manage focused work sessions.

#### Acceptance Criteria

1. THE Focus_Timer SHALL initialise to a duration of 25 minutes (1500 seconds) each time the page loads or after a reset.
2. WHEN the user activates the Start control, THE Focus_Timer SHALL begin counting down from the current remaining time at a rate of one second per second.
3. WHILE the Focus_Timer is counting down, THE Focus_Timer SHALL update the displayed time every second in MM:SS format.
4. WHEN the user activates the Stop control, THE Focus_Timer SHALL pause the countdown and preserve the remaining time.
5. WHEN the user activates the Reset control, THE Focus_Timer SHALL stop any active countdown and restore the displayed time to 25:00.
6. WHEN the countdown reaches 00:00, THE Focus_Timer SHALL stop automatically, display the time as "00:00", and show a visible completion message (e.g., "Session complete!") to notify the user that the session has ended.
7. WHILE the Focus_Timer is counting down, THE Focus_Timer SHALL disable the Start control to prevent duplicate intervals.
8. WHILE the Focus_Timer is paused or reset, THE Focus_Timer SHALL disable the Stop control; WHILE the Focus_Timer is counting down, THE Focus_Timer SHALL keep the Stop control enabled so the user can pause at any time.
9. WHEN the Focus_Timer is in the expired state and the user activates the Start control, THE Focus_Timer SHALL reset to 25:00 and begin a new countdown session.

---

### Requirement 3: To-Do List Management

**User Story:** As a user, I want to add, edit, mark as done, and delete tasks that persist across page reloads, so that I can track my daily responsibilities without losing data.

#### Acceptance Criteria

1. THE Todo_List SHALL provide an input field and an Add control for entering a new Task.
2. WHEN the user submits a non-empty Task description (up to 500 characters) via the Add control or the Enter key, THE Todo_List SHALL append the new Task to the list with a completion status of incomplete.
3. IF the user submits an empty or whitespace-only Task description, THEN THE Todo_List SHALL reject the submission and preserve the current list without modification.
4. WHEN the user activates the completion toggle on a Task, THE Todo_List SHALL change the Task's completion status to the opposite of its current status.
5. WHEN the user activates the Edit control on a Task, THE Todo_List SHALL replace the Task's text display with an editable input field pre-populated with the current Task description.
6. WHEN the user confirms an edit with a non-empty value (up to 500 characters), THE Todo_List SHALL update the Task description and return to display mode.
7. IF the user confirms an edit with an empty or whitespace-only value, THEN THE Todo_List SHALL reject the update and restore the original Task description.
8. WHEN the user presses Escape while in edit mode, THE Todo_List SHALL discard the edit and return the Task to display mode showing the original description.
9. WHEN the user activates the Delete control on a Task, THE Todo_List SHALL remove the Task from the list permanently.
10. WHEN any Task is added, updated, toggled, or deleted, THE Storage_Manager SHALL write the complete updated Task collection to Local Storage.
11. WHEN the Dashboard loads, THE Storage_Manager SHALL read the Task collection from Local Storage and THE Todo_List SHALL render all previously saved Tasks.
12. IF a Local Storage write operation fails (e.g., quota exceeded or access denied), THEN THE Todo_List SHALL display a visible error message to the user and preserve the in-memory task state unchanged.
13. IF Local Storage is unavailable when the Dashboard loads, THEN THE Todo_List SHALL start with an empty list and display a visible error message informing the user that persistence is unavailable.

---

### Requirement 4: Quick Links Management

**User Story:** As a user, I want to save and launch my favourite website shortcuts from the dashboard, so that I can access frequently used sites in one click.

#### Acceptance Criteria

1. THE Quick_Links SHALL provide input fields for a Link label and a Link URL, and an Add control for saving a new Link.
2. WHEN the user submits a Link with a non-empty label and a non-empty URL, THE Quick_Links SHALL add the Link to the displayed collection.
3. IF the user submits a Link with an empty label or an empty URL, THEN THE Quick_Links SHALL reject the submission and display an inline validation message.
4. WHEN the user activates a Link button, THE Quick_Links SHALL open the associated URL in a new browser tab.
5. WHEN the user activates the Delete control on a Link, THE Quick_Links SHALL remove the Link from the collection permanently.
6. WHEN any Link is added or deleted, THE Storage_Manager SHALL write the complete updated Link collection to Local Storage.
7. WHEN the Dashboard loads, THE Storage_Manager SHALL read the Link collection from Local Storage and THE Quick_Links SHALL render all previously saved Links.
8. IF a Local Storage write operation fails when saving Links, THEN THE Quick_Links SHALL display a visible error message to the user and preserve the in-memory link state unchanged.

---

### Requirement 5: Data Persistence via Local Storage

**User Story:** As a user, I want all my tasks and links to be automatically saved in my browser, so that my data is available every time I open the dashboard without any manual export or sync.

#### Acceptance Criteria

1. THE Storage_Manager SHALL store the Task collection under a dedicated, fixed key in Local Storage.
2. THE Storage_Manager SHALL store the Link collection under a separate, dedicated, fixed key in Local Storage.
3. WHEN a write operation is requested, THE Storage_Manager SHALL encode the collection as a JSON string and write it to Local Storage under the appropriate key.
4. WHEN the Dashboard initialises, before any component accesses the data, THE Storage_Manager SHALL read the stored JSON string from Local Storage and decode it into a JavaScript array.
5. FOR ALL valid Task and Link collections, serialising then deserialising SHALL produce a collection with the same item count, the same field values, and the same order as the original.
6. IF Local Storage read returns null or a malformed JSON string, THEN THE Storage_Manager SHALL initialise the collection to an empty array and allow subsequent read and write operations to proceed normally.
7. THE Storage_Manager SHALL perform all read and write operations without requiring a network request.
8. IF a Local Storage write operation fails due to quota exceeded or access denied, THEN THE Storage_Manager SHALL preserve the previously stored data, leave the in-memory state unchanged, and surface an error to the calling component.

---

### Requirement 6: Single-File Structure and Browser Compatibility

**User Story:** As a developer, I want the project to follow a strict single-file-per-type structure and work across all major browsers, so that the codebase remains maintainable and the app is universally accessible.

#### Acceptance Criteria

1. THE Dashboard SHALL be implemented using exactly one HTML file, exactly one CSS file located inside a `css/` directory, and exactly one JavaScript file located inside a `js/` directory.
2. THE Dashboard SHALL render without layout errors or missing elements, and execute without uncaught JavaScript errors, in the current stable release of Chrome, Firefox, Edge, and Safari without polyfills or transpilation.
3. THE Dashboard SHALL be openable as a local file (via `file://` protocol) without requiring a web server, and all interactive features (greeting, timer, to-do list, quick links) SHALL remain fully functional under the `file://` protocol.
4. THE Dashboard SHALL use only browser-native APIs supported by Chrome, Firefox, Edge, and Safari, and require no external libraries, frameworks, or package managers.
5. WHERE the Dashboard is used as a browser extension, THE Dashboard SHALL load without errors and all interactive features SHALL function as specified within the extension's local resource context.

---

### Requirement 7: Performance and Visual Design

**User Story:** As a user, I want the dashboard to load instantly and present a clean, readable interface, so that it does not interrupt my workflow.

#### Acceptance Criteria

1. THE Dashboard SHALL complete its initial render and display all four widgets within 2 seconds on a broadband connection of 10 Mbps or faster.
2. THE Dashboard SHALL apply a consistent visual hierarchy using heading text of at least 24px, sub-heading text of at least 18px, and body text of at least 14px.
3. THE Dashboard SHALL maintain a minimum contrast ratio of 4.5:1 between text and its background colour to meet WCAG AA readability standards.
4. WHEN the viewport width is 768 pixels or below, THE Dashboard SHALL reflow the widget layout to a single-column arrangement accessible without horizontal scrolling; WHEN the viewport width is 769 pixels or above, THE Dashboard SHALL display the multi-column layout immediately with no buffer zone.
5. THE Dashboard SHALL provide focus indicators on all interactive controls that use a minimum 2px outline with a contrast ratio of at least 3:1 against adjacent colours, in accordance with WCAG 2.1 SC 2.4.11.
