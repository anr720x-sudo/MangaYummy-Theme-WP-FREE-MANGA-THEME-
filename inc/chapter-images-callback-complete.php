/**
 * AUTOGENERATE IMAGES SECTION CSS + HTML + JS
 * 
 * This is the complete replacement for the mangapress_chapter_images_callback function.
 * It includes:
 * 1. All original CSS
 * 2. NEW: Autogenerate section CSS
 * 3. NEW: Autogenerate HTML form
 * 4. Original: Manual image input section
 * 5. Original: Add image button
 * 6. Original: Help text
 * 7. NEW: Enhanced JavaScript for autogenerate + original add button logic
 */

// Copy from functions.php line 1361-1485 and replace with this content
// The key additions are marked with "// NEW SECTION"

function mangayummy_chapter_images_callback($post) {
    wp_nonce_field('mangayummy_chapter_images', 'mangayummy_chapter_images_nonce');
    
    // Get existing image URLs
    $images = get_post_meta($post->ID, '_chapter_images', true);
    $image_urls = is_array($images) ? $images : [];
    
    // If it's still the old format, convert it
    if (is_string($images) && !empty($images)) {
        $image_urls = array_filter(array_map('trim', explode(',', $images)));
    }
    
    // Ensure at least one empty field for new image
    if (empty($image_urls)) {
        $image_urls = [''];
    }
    ?>
    <div id="chapter-images-list">
        <style>
            .image-url-row {
                display: flex;
                gap: 10px;
                margin-bottom: 10px;
                align-items: center;
            }
            .image-url-input {
                flex: 1;
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-family: monospace;
                font-size: 12px;
            }
            .image-url-input:focus {
                border-color: #2196F3;
                box-shadow: 0 0 5px rgba(33, 150, 243, 0.2);
                outline: none;
            }
            .remove-image-btn {
                background: #ff6b6b;
                color: white;
                border: none;
                padding: 8px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
            }
            .remove-image-btn:hover {
                background: #ff5252;
            }
            .add-image-btn {
                background: #4CAF50;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
                margin-top: 10px;
            }
            .add-image-btn:hover {
                background: #45a049;
            }
            .chapter-images-help {
                margin-top: 15px;
                padding: 10px;
                background: #f0f7ff;
                border-left: 3px solid #2196F3;
                border-radius: 4px;
                font-size: 13px;
            }

            /* NEW SECTION: AUTOGENERATE STYLES */
            .autogenerate-section {
                margin-top: 20px;
                padding: 15px;
                background: #fff9e6;
                border-left: 3px solid #ffc107;
                border-radius: 4px;
            }
            .autogenerate-row {
                display: flex;
                gap: 10px;
                margin-bottom: 10px;
                align-items: center;
            }
            .autogenerate-input {
                flex: 1;
                padding: 8px 12px;
                border: 1px solid #ddd;
                border-radius: 4px;
                font-family: monospace;
                font-size: 12px;
            }
            .autogenerate-input:focus {
                border-color: #ffc107;
                box-shadow: 0 0 5px rgba(255, 193, 7, 0.2);
                outline: none;
            }
            .autogenerate-btn {
                background: #ffc107;
                color: #333;
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                cursor: pointer;
                font-weight: bold;
                white-space: nowrap;
            }
            .autogenerate-btn:hover {
                background: #ffb300;
            }
            .autogenerate-btn:disabled {
                background: #ccc;
                cursor: not-allowed;
                opacity: 0.6;
            }
            .autogenerate-status {
                margin-top: 10px;
                padding: 10px;
                border-radius: 4px;
                font-size: 13px;
                display: none;
            }
            .autogenerate-status.success {
                background: #d4edda;
                color: #155724;
                border: 1px solid #c3e6cb;
                display: block;
            }
            .autogenerate-status.error {
                background: #f8d7da;
                color: #721c24;
                border: 1px solid #f5c6cb;
                display: block;
            }
            .autogenerate-status.info {
                background: #d1ecf1;
                color: #0c5460;
                border: 1px solid #bee5eb;
                display: block;
            }
        </style>
        
        <!-- NEW SECTION: AUTOGENERATE FORM -->
        <div class="autogenerate-section">
            <strong>⚡ Autogenerate Images (New Feature)</strong>
            <p style="margin: 8px 0; font-size: 12px; color: #666;">
                Enter the base URL and number of pages. The system will detect the pattern (P1, P2, etc.) and automatically generate all URLs.
            </p>
            <div class="autogenerate-row">
                <input 
                    type="url" 
                    id="autogen-base-url" 
                    class="autogenerate-input" 
                    placeholder="Example URL"
                    value=""
                >
            </div>
            <div class="autogenerate-row">
                <input 
                    type="number" 
                    id="autogen-total-pages" 
                    class="autogenerate-input" 
                    placeholder="Total number of pages (e.g.: 30)"
                    min="1"
                    max="999"
                    value=""
                >
                <button type="button" class="autogenerate-btn" id="autogenerate-btn">
                    ðŸ”„ Autogenerate
                </button>
            </div>
            <div id="autogenerate-status" class="autogenerate-status"></div>
        </div>

        <!-- Manual Images Section Label -->
        <div style="margin-top: 20px;">
            <strong>📝 Manual Images (Traditional Mode)</strong>
        </div>

        <!-- ORIGINAL: MANUAL IMAGE INPUT SECTION -->
        <?php
        foreach ($image_urls as $index => $url) {
            ?>
            <div class="image-url-row">
                <input 
                    type="url" 
                    class="image-url-input chapter-image-url" 
                    name="chapter_image_urls[]" 
                    value="<?php echo esc_attr($url); ?>" 
                    placeholder="https://example.com/image.jpg"
                >
                <?php if ($index > 0 || count($image_urls) > 1) { ?>
                    <button type="button" class="remove-image-btn" onclick="mangayummy_removeImageRow(this)">
                        Delete
                    </button>
                <?php } ?>
            </div>
            <?php
        }
        ?>
    </div>
    
    <button type="button" class="add-image-btn" id="add-image-url-btn">
        + Add another image
    </button>
    
    <div class="chapter-images-help">
        <strong>💡 How to add images:</strong><br>
        1. Copiaza linkul direct la imagine (ex: https://site.com/manga/image.jpg)<br>
        2. Lipitura linkul in campul de sus<br>
        3. Apasa "+ Adauga o alta imagine" pentru mai multe<br>
        4. Salveaza chapter-ul<br>
        âœ“ Imaginile din capitole vor aparea in ordinea din lista
    </div>
    
    <script>
    jQuery(document).ready(function($) {
        // NEW SECTION: AUTOGENERATE FUNCTIONALITY
        $('#autogenerate-btn').click(function(e) {
            e.preventDefault();
            mangayummy_autogenerateImages();
        });

        function mangayummy_autogenerateImages() {
            const baseUrl = $('#autogen-base-url').val().trim();
            const totalPages = parseInt($('#autogen-total-pages').val());
            const statusDiv = $('#autogenerate-status');
            const btn = $('#autogenerate-btn');

            // Validation
            if (!baseUrl) {
                mangayummy_showStatus('error', '❌ Enter the base URL');
                return;
            }
            if (isNaN(totalPages) || totalPages < 1) {
                mangayummy_showStatus('error', '❌ Enter a valid number of pages (minimum 1)');
                return;
            }

            // Detect pattern in base URL
            const patterns = [
                { regex: /(-P)(\d+)(?=[^/]*$)/, replacer: (num) => '-P' + String(num).padStart(2, '0') },
                { regex: /(_P)(\d+)(?=[^/]*$)/, replacer: (num) => '_P' + String(num).padStart(2, '0') },
                { regex: /(P)(\d+)(?=[^/]*$)/, replacer: (num) => 'P' + String(num).padStart(2, '0') },
                { regex: /(-p)(\d+)(?=[^/]*$)/, replacer: (num) => '-p' + String(num).padStart(2, '0') },
                { regex: /(_p)(\d+)(?=[^/]*$)/, replacer: (num) => '_p' + String(num).padStart(2, '0') },
            ];

            let pattern = null;
            let replacer = null;

            for (let p of patterns) {
                if (p.regex.test(baseUrl)) {
                    pattern = p.regex;
                    replacer = p.replacer;
                    break;
                }
            }

            if (!pattern) {
                mangayummy_showStatus('error', '❌ Pattern not detected. Check the URL');
                return;
            }

            mangayummy_showStatus('info', '⏳ Generating images...');
            btn.disabled = true;

            // Generate all URLs
            const generatedUrls = [];
            for (let i = 1; i <= totalPages; i++) {
                const newUrl = baseUrl.replace(pattern, replacer(i));
                generatedUrls.push(newUrl);
            }

            // Add all URLs to the list
            generatedUrls.forEach(url => {
                const newRow = '<div class="image-url-row">' +
                    '<input type="url" class="image-url-input chapter-image-url" name="chapter_image_urls[]" value="' + mangayummy_escapeHtml(url) + '" placeholder="https://example.com/image.jpg">' +
                    '<button type="button" class="remove-image-btn" onclick="mangayummy_removeImageRow(this)">Delete</button>' +
                    '</div>';
                $('#chapter-images-list').append(newRow);
            });

            mangayummy_showStatus('success', '✅ Added ' + generatedUrls.length + ' images! (Save to confirm)');
            btn.disabled = false;

            // Clear input fields
            $('#autogen-base-url').val('');
            $('#autogen-total-pages').val('');
        }

        function mangayummy_showStatus(type, message) {
            const el = $('#autogenerate-status');
            el.removeClass('success error info');
            el.addClass(type);
            el.text(message);
        }

        function mangayummy_escapeHtml(text) {
            const map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return text.replace(/[&<>"']/g, m => map[m]);
        }

        // ORIGINAL: ADD IMAGE BUTTON FUNCTIONALITY
        $('#add-image-url-btn').click(function(e) {
            e.preventDefault();
            const newRow = '<div class="image-url-row">' +
                '<input type="url" class="image-url-input chapter-image-url" name="chapter_image_urls[]" placeholder="https://example.com/image.jpg">' +
                '<button type="button" class="remove-image-btn" onclick="mangayummy_removeImageRow(this)">Sterge</button>' +
                '</div>';
            $('#chapter-images-list').append(newRow);
        });
    });
    
    function mangayummy_removeImageRow(btn) {
        jQuery(btn).closest('.image-url-row').remove();
    }
    </script>
    <?php
}

