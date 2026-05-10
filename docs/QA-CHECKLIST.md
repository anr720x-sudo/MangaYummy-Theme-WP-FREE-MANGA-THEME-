# MangaYummy Final QA Checklist

## Cod
- [ ] No PHP syntax errors in theme files.
- [ ] No fatal errors/warnings on homepage, manga page, chapter page, profile page.
- [ ] No debug leftovers (`var_dump`, `print_r`, test endpoints, temporary logs) in release build.
- [ ] Legacy alias layer works for old AJAX actions during migration.
- [ ] New `mangayummy_*` handlers are reachable and tested.
- [ ] Caching/transients do not break fresh content updates.
- [ ] Child theme loads parent + child styles in correct order.
- [ ] OCDI integration file is loaded and hook is registered.

## Securitate
- [ ] All sensitive AJAX handlers verify nonce.
- [ ] Auth-only endpoints check `is_user_logged_in()` and required capabilities.
- [ ] Admin actions check role/capability (`manage_options` where needed).
- [ ] Input is sanitized (`sanitize_text_field`, `intval`, `wp_kses_post`, etc.).
- [ ] Output is escaped (`esc_html`, `esc_attr`, `esc_url`) in templates/admin HTML.
- [ ] No hardcoded secrets/tokens in repository.
- [ ] File upload handlers validate MIME/type and size.

## i18n
- [ ] User-facing strings are wrapped in i18n functions.
- [ ] Text domain is consistently `mangayummy` (parent) and `mangayummy-child` (child).
- [ ] `style.css` header includes correct Text Domain.
- [ ] POT generation works without parse errors.
- [ ] Romanian/English mixed UI strings were intentionally reviewed.

## Compatibilitate
- [ ] Tested on required WordPress minimum version.
- [ ] Tested on required PHP minimum version.
- [ ] Permalinks flushed after activation and routes work (`manga`, `chapter`, profile URLs).
- [ ] Theme works without optional plugins.
- [ ] OCDI notice appears when plugin is missing.
- [ ] OCDI import reads `demo/demo-content.xml` and `demo/widgets.wie` paths.
- [ ] Responsive checks passed on desktop/tablet/mobile.
- [ ] Major browsers smoke-tested (Chrome, Firefox, Edge, Safari).

## Pachet
- [ ] Main package includes only release-ready files.
- [ ] Excludes development artifacts (`tools/`, `node_modules/`, `.git/`, local audits/logs).
- [ ] Child theme packaged separately (`mangayummy-child.zip`).
- [ ] Main package zip built (`mangayummy-v1.0.0.zip`).
- [ ] SHA256 checksums generated and saved.
- [ ] `README.md` and `CHANGELOG.md` are up to date.
- [ ] Demo content files exist and import successfully.
- [ ] `screenshot.png` is 1200x900 and reflects final UI quality.
