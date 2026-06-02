# StepForge 1.0.22

## App Context Detection and email sharing

StepForge now captures more about what the tester interacted with, then carries that context into the editor, exports, sharing workflow, and the in-app release demo.

### Added
- Added App Context Detection for captured steps.
- Captured steps can now store app name, process name, window title, browser page title, URL, host, bounds, capture time, and confidence.
- Added browser URL/page detection for Chrome, Edge, Firefox, and Brave when Windows UI Automation exposes the address field.
- Added an App Context section in the step inspector so users can review the detected app, page, URL, host, window, process, and confidence.
- Added app context details to HTML, PDF, Markdown, and DOCX exports.
- Added interactive What's New demos for App Context Detection, context-rich reports, email sharing, Gmail defaults, HTML email delivery, and update shortcuts.

### Email sharing included in this release
- Added Share Export support for full HTML, compact HTML, Markdown, PDF, and DOCX reports.
- Added an Email tab in Settings for SMTP configuration.
- Added Gmail-friendly SMTP defaults for the StepForge Gmail account, including host, port, sender account, and From address.
- Added encrypted SMTP app-password storage using Electron safeStorage.
- Added a Test settings button so users can verify Gmail SMTP login before sending an export.
- Added clearer Gmail setup guidance and friendlier error messages for invalid app passwords, From-address mismatches, connection failures, and certificate issues.
- HTML Share Export now renders the selected report in the email body instead of only attaching an HTML file.
- HTML, Markdown, PDF, and DOCX attachments now include explicit MIME content types for better email-client handling.
- Gmail app passwords are normalized before saving so pasted spaces do not break authentication.
- Existing installs with blank email fields now receive the StepForge Gmail defaults after updating.

### Improved
- Step descriptions can now include detected page/app context, making raw recordings easier to understand.
- The post-update What's New icon now animates with a loading-style ring.
- What's New feature cards are now clickable and show animated examples for each release highlight.
- The Email settings shortcut opens directly to the Email tab.
- The Try Share Export shortcut opens the current or latest recording and starts a guided Share Export flow.

### Notes
- Browser URL detection depends on what the browser exposes through Windows UI Automation. If a browser hides the address field, StepForge still captures app/window context.
- The Gmail app password is not bundled into the installer. It must be entered once in Settings so it can be encrypted on the local machine.
