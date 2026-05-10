<?php
/**
 * HTML template for autogenerate images section
 * Insert this after the .chapter-images-help CSS in mangapress_chapter_images_callback()
 */
?>
        <!-- AUTOGENERATE SECTION -->
        <div class="autogenerate-section">
            <strong>⚡ Extract Chapter Images (New Feature)</strong>
            <p style="margin: 8px 0; font-size: 12px; color: #666;">
                Enter the chapter page URL. The script will load the page, find the reader container, and extract all images in order.
            </p>
            <div class="autogenerate-row">
                <input 
                    type="url" 
                    id="autogen-base-url" 
                    class="autogenerate-input" 
                    placeholder="Ex: https://site.com/chapter/1"
                    value=""
                >
                <button type="button" class="autogenerate-btn" id="autogenerate-btn">
                    🔄 Extract Images
                </button>
            </div>
            <div id="autogenerate-status" class="autogenerate-status"></div>
        </div>

        <!-- MANUAL INPUT SECTION -->
        <div style="margin-top: 20px;">
            <strong>📝 Manual Images (Traditional Mode)</strong>
        </div>
