<?php
/**
 * HTML template fragment for autogenerate images section
 * To be inserted into mangapress_chapter_images_callback()
 */
?>
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
