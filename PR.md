## Purpose

The old email template editor required adding separate "blocks" (Heading, Text, Button) one by one, and each block was just a plain textarea, with no way to reorder them, no bold/italic/link support, and no resemblance to a real email. This PR replaces it with a proper rich-text editor (TipTap, same one used for job descriptions) so it feels like writing an actual email.

## Type of Change

- [x] Feature
- [ ] Bug fix
- [ ] Refactor
- [ ] Documentation
- [ ] Test improvement
- [ ] CI/CD
- [ ] Other

## Changes Made

- This PR replaces the block-based email builder with a single continuous TipTap editor (bold, italic, links, H1/H2/H3, bullet/numbered lists)
- This PR adds a "/" slash menu and a toolbar button to insert things like headings, a button, or a `{{variable}}` at the cursor
- This PR adds a simple button element (pill-styled, shows `[url]` under it as a placeholder for the link) and variable "chips" that insert `{{candidate_name}}` etc.
- This PR adds hover up/down arrows to reorder blocks in the editor
- This PR simplifies the live preview panel to just show the plain rendered email, no extra card/background styling
- This PR changes email templates to save as plain HTML (what TipTap outputs) instead of the old block-array format, with the backend updated to match (schema, validation, and the `{{var}}` substitution logic)
- This PR does not change event templates, they still work the same as before

## Screenshots (if applicable)

<!-- Add screenshots, recordings, or GIFs for UI changes -->

## Breaking Changes

- [ ] No breaking changes
- [x] This PR introduces breaking changes

If yes, describe them:

Email templates now store `bodyJson` as an HTML string instead of the old `ContentBlock[]` array. There were no templates saved in the database yet, so no migration was needed — but any code that assumed the old array shape for email templates would need updating.

## Checklist

- [x] Code follows project conventions
- [x] Self-review completed
- [ ] Documentation updated (if needed)
- [ ] Tests added/updated (if needed)
- [x] No sensitive data or secrets included
- [ ] Related issues linked

## Related Issues

Closes #

## Additional Notes

<!-- Anything reviewers should know -->
