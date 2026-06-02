# StepForge 1.0.21

## Email sharing and export delivery

StepForge now supports sharing exported reports by email directly from the Export Report workflow.

### Added
- Added Share Export support for full HTML, compact HTML, Markdown, PDF, and DOCX reports.
- Added an Email tab in Settings for SMTP configuration.
- Added Gmail-friendly SMTP defaults for the StepForge Gmail account, including host, port, sender account, and From address.
- Added encrypted SMTP app-password storage using Electron safeStorage.
- Added a Test settings button so users can verify Gmail SMTP login before sending an export.
- Added clearer Gmail setup guidance and friendlier error messages for invalid app passwords, From-address mismatches, connection failures, and certificate issues.
- Added a post-update What's New overlay so new releases can introduce important changes inside the app.
- Added interactive What's New feature cards with animated examples for each email-sharing improvement.
- Added direct What's New shortcuts into Email settings and the guided Share Export workflow.

### Improved
- HTML Share Export now renders the selected report in the email body instead of only attaching an HTML file.
- HTML, Markdown, PDF, and DOCX attachments now include explicit MIME content types for better email-client handling.
- Gmail app passwords are normalized before saving so pasted spaces do not break authentication.
- Existing installs with blank email fields now receive the StepForge Gmail defaults after updating.
- The What's New update icon now animates while the release summary is open.

### Notes
- The Gmail app password is not bundled into the installer. It must be entered once in Settings so it can be encrypted on the local machine.
- Gmail may still classify early automated test messages as spam. Marking the message as Not spam and keeping the sender in contacts can help future deliveries.
