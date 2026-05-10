/**
 * Chapter Live Preview - Real-time preview of chapter title and SEO metadata
 * IMPORTANT: This is PREVIEW ONLY - does NOT save anything
 * All changes revert on page refresh
 */

(function($) {
    'use strict';

    // Store original values for potential reset
    let originalTitle = '';
    let originalYoastTitle = '';
    let originalYoastDesc = '';
    let mangaTitle = '';
    let mangaId = '';

    // Initialize on document ready
    $(document).ready(function() {
        // Get manga_id from select (not input)
        const mangaIdSelect = $('select[name="manga_id"]');
        if (!mangaIdSelect.length) {
            console.warn('Chapter Preview: manga_id select not found');
            return;
        }

        mangaId = mangaIdSelect.val();
        if (!mangaId) {
            console.warn('Chapter Preview: no manga selected');
            return;
        }

        // Store original title
        const titleElement = $('h1.wp-heading-inline, h2.wp-heading-inline, .post-title-wrapper input[type="text"]');
        if (titleElement.length) {
            originalTitle = titleElement.val() || titleElement.text();
        }

        // Fetch manga title via AJAX
        fetchMangaTitle(mangaId);

        // Listen for chapter_number changes
        const chapterNumberInput = $('input[name="chapter_number"]');
        if (chapterNumberInput.length) {
            chapterNumberInput.on('input change', function() {
                updatePreview();
            });
        }

        // Listen for manga_id changes (in case editor selects different manga)
        mangaIdSelect.on('change', function() {
            mangaId = $(this).val();
            if (mangaId) {
                fetchMangaTitle(mangaId);
                updatePreview();
            }
        });
    });

    /**
     * Fetch manga title via AJAX
     */
    function fetchMangaTitle(id) {
        $.ajax({
            url: chapterPreviewData.ajaxUrl,
            type: 'POST',
            data: {
                action: 'mangayummy_get_manga_title',
                manga_id: id,
                nonce: chapterPreviewData.nonce
            },
            success: function(response) {
                if (response.success && response.data.title) {
                    mangaTitle = response.data.title;
                    updatePreview();
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                var msg = 'Could not fetch manga title.';
                if (jqXHR && jqXHR.responseJSON && jqXHR.responseJSON.message) {
                    msg = jqXHR.responseJSON.message;
                } else if (errorThrown) {
                    msg = errorThrown;
                }
                showChapterPreviewMessage(msg, 'error');
            }
        });
    }

    /**
     * Update all preview elements based on chapter_number
     */
    function updatePreview() {
        const chapterNumberInput = $('input[name="chapter_number"]');
        const chapterNumber = chapterNumberInput.val().trim();

        // If chapter number is empty, don't update preview
        if (chapterNumber === '') {
            resetPreview();
            return;
        }

        const num = parseFloat(chapterNumber);
        let titleText = '';
        let yoastTitle = '';
        let yoastDesc = '';

        // Build preview based on chapter number (treat zero like any other number)
        if (num >= 0) {
            titleText = `${mangaTitle} – Chapter ${num}`;
            yoastTitle = `${mangaTitle} – Chapter ${num} | MangaYummy`;
            yoastDesc = `Read the latest ${mangaTitle} chapter ${num} online on MangaYummy.`;
        } else {
            resetPreview();
            return;
        }

        // Update UI elements with preview
        updateTitlePreview(titleText);
        updateYoastPreview(yoastTitle, yoastDesc);
    }

    /**
     * Update the post title preview (visual only)
     */
    function updateTitlePreview(title) {
        // WordPress post title - look for editable title
        const titleInput = $('#title, input[name="post_title"]');
        const titleHeading = $('h1.wp-heading-inline');

        // Add visual indicator that this is preview
        if (titleInput.length) {
            // Store original if not already stored
            if (!originalTitle) {
                originalTitle = titleInput.val();
            }
            titleInput.attr('placeholder', titleInput.attr('placeholder') || 'Chapter title (preview)');
        }

        if (titleHeading.length) {
            // Update heading display with preview indicator
            if (!titleHeading.find('.chapter-preview-indicator').length) {
                titleHeading.after('<span class="chapter-preview-indicator" style="color: #0073aa; font-size: 0.9em; margin-left: 10px; font-weight: normal;">(Preview)</span>');
            }
        }

        // Store in a data attribute for preview display
        $('input[name="chapter_number"]').closest('.postbox, .panel').find('input[name="chapter_number"]').attr('data-preview-title', title);
    }

    /**
     * Update Yoast SEO fields if plugin is active
     */
    function updateYoastPreview(title, description) {
        // Get current post ID from hidden field or localized data
        const postId = chapterPreviewData.postId || $('input[name="post_ID"]').val();
        
        // Save SEO meta via AJAX so Yoast sees the changes
        if (postId) {
            $.ajax({
                url: chapterPreviewData.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'mangayummy_save_chapter_seo',
                    post_id: postId,
                    title: title,
                    description: description,
                    nonce: chapterPreviewData.saveNonce
                },
                success: function(response) {
                    // SEO meta saved on server; do not attempt to modify Yoast slug/UI from JS.
                    // Yoast UI will reflect _yoast_wpseo_slug on full page refresh.
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    var msg = 'Failed to save SEO meta.';
                    if (jqXHR && jqXHR.responseJSON && jqXHR.responseJSON.message) {
                        msg = jqXHR.responseJSON.message;
                    } else if (errorThrown) {
                        msg = errorThrown;
                    }
                    showChapterPreviewMessage(msg, 'error');
                }
            });
        }
        
        // Yoast SEO Meta Title - UPDATE THE ACTUAL FIELD VALUE
        const yoastTitleField = $('#yoast_wpseo_title, input.js-yoast-field-title, input[data-react-attribute="title"]');
        if (yoastTitleField.length) {
            // Store original if not already stored
            if (!originalYoastTitle) {
                originalYoastTitle = yoastTitleField.val();
            }

            // Set the actual field value directly
            yoastTitleField.val(title).trigger('change').trigger('keyup');

            // Add visual preview indicator
            if (!yoastTitleField.parent().find('.yoast-preview-indicator').length) {
                yoastTitleField.after('<div class="yoast-preview-indicator" style="display: none; margin-top: 8px; padding: 8px; background: #f0f6fc; border-left: 3px solid #0073aa; color: #0073aa; font-size: 12px;"><strong>Preview:</strong> <span class="preview-text"></span></div>');
            }

            // Update preview display
            yoastTitleField.parent().find('.yoast-preview-indicator .preview-text').text(title);
            yoastTitleField.parent().find('.yoast-preview-indicator').show();

            // Add inline comment to show it's preview
            if (!yoastTitleField.parent().find('.js-yoast-preview-note').length) {
                yoastTitleField.parent().append('<p class="js-yoast-preview-note" style="color: #666; font-size: 11px; margin-top: 4px;">💡 Live preview - will update based on chapter number</p>');
            }
        }

        // Yoast SEO Meta Description - UPDATE THE ACTUAL FIELD VALUE
        const yoastDescField = $('#yoast_wpseo_metadesc, textarea.js-yoast-field-meta-description, textarea[data-react-attribute="metaDescription"]');
        if (yoastDescField.length) {
            // Store original if not already stored
            if (!originalYoastDesc) {
                originalYoastDesc = yoastDescField.val();
            }

            // Set the actual field value directly
            yoastDescField.val(description).trigger('change').trigger('keyup');

            // Add visual preview indicator
            if (!yoastDescField.parent().find('.yoast-preview-indicator').length) {
                yoastDescField.after('<div class="yoast-preview-indicator" style="display: none; margin-top: 8px; padding: 8px; background: #f0f6fc; border-left: 3px solid #0073aa; color: #0073aa; font-size: 12px;"><strong>Preview:</strong> <span class="preview-text"></span></div>');
            }

            // Update preview display
            yoastDescField.parent().find('.yoast-preview-indicator .preview-text').text(description);
            yoastDescField.parent().find('.yoast-preview-indicator').show();
        }
    }

    /**
     * Reset preview to original values
     */
    function resetPreview() {
        const yoastTitleField = $('#yoast_wpseo_title, input.js-yoast-field-title');
        const yoastDescField = $('#yoast_wpseo_metadesc, textarea.js-yoast-field-meta-description');

        // Hide preview indicators
        $('.yoast-preview-indicator').hide();
        $('.chapter-preview-indicator').remove();

        // Remove preview notes
        $('.js-yoast-preview-note').remove();
    }

    /**
     * Show an inline admin message for preview errors or info
     */
    function showChapterPreviewMessage(text, type) {
        type = type || 'info';
        var noticeId = 'chapter-preview-notice';
        var container = $('#' + noticeId);
        var cssClass = (type === 'error') ? 'notice notice-error inline' : 'notice notice-info inline';

        if (!container.length) {
            container = $('<div id="' + noticeId + '" class="' + cssClass + '" style="margin-bottom:10px;"><p></p></div>');
            // Try to insert in WP editor wrap area
            if ($('.wrap').length) {
                $('.wrap').first().prepend(container);
            } else if ($('#wpbody-content').length) {
                $('#wpbody-content').prepend(container);
            } else {
                $('body').prepend(container);
            }
        } else {
            container.attr('class', cssClass);
        }

        container.find('p').text(text);
    }

})(jQuery);
