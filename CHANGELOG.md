# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2026-05-10
### Added
- Free & Open Source model: Theme is now completely free with optional donations.
- Admin donation notice that appears every 30 days encouraging support (can be dismissed or permanently hidden).
- AJAX handler for donation notice dismissal with 30-day cooldown.
- Footer credit text linking to donation page and theme repository.
- "Support the Developer" section in README with donation links (Buy Me a Coffee).

### Changed
- Theme description updated to emphasize free and open-source nature.
- Documentation updated to reflect GPL-2.0-or-later licensing.
- Theme URI changed to donation link (https://buymeacoffee.com/mangayummy9).

## [1.0.0] - 2026-05-09
### Added
- Initial commercial release for the MangaYummy WordPress theme.
- Custom content architecture for manga, chapter, and news flows.
- Reader-facing homepage sections: popular, latest releases, recommended, recent comments, and news.
- User profile capabilities including bookmarks, ratings, reading progress, and social/community features.
- AJAX-based interactions for authentication, status updates, comments, and profile actions.
- Performance-oriented query patterns with transient caching for key homepage areas.
- Translation-ready setup using text domain `mangayummy`.
- Demo import starter file in `demo/demo-content.xml`.

### Security
- Nonce validation across core AJAX handlers.
- Profile update protection patterns for sensitive user actions.
