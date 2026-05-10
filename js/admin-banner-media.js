// Banner Media Picker Script for WordPress Media Library

(function() {
    'use strict';
    
    document.addEventListener('DOMContentLoaded', function() {
        // Verify wp.media is available
        if (typeof wp === 'undefined' || !wp.media) {
            console.error('WordPress media object not available');
            return;
        }
        
        const imageButton = document.getElementById('manga_banner_image_button');
        const removeButton = document.getElementById('manga_banner_image_remove');
        const imageInput = document.getElementById('manga_banner_custom_image');
        
        if (!imageInput) {
            console.error('Banner image input field not found');
            return;
        }
        
        if (imageButton) {
            imageButton.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Create media frame
                const frame = wp.media({
                    title: 'Alege imagine pentru banner',
                    button: {
                        text: 'Folosește aceasta'
                    },
                    multiple: false,
                    library: {
                        type: 'image'
                    }
                });
                
                // When image is selected
                frame.on('select', function() {
                    const attachment = frame.state().get('selection').first().toJSON();
                    imageInput.value = attachment.url;
                    
                    // Refresh the preview immediately
                    const preview = document.getElementById('banner-preview');
                    if (preview) {
                        preview.style.backgroundImage = 'url(' + attachment.url + ')';
                    }
                    
                    // Show remove button and image
                    if (removeButton) {
                        removeButton.style.display = 'inline-block';
                    }
                    
                    // Add feedback - highlight to show action completed
                    imageButton.style.backgroundColor = '#4CAF50';
                    imageButton.style.color = 'white';
                    setTimeout(function() {
                        imageButton.style.backgroundColor = '';
                        imageButton.style.color = '';
                    }, 2000);
                });
                
                frame.open();
            });
        }
        
        if (removeButton) {
            removeButton.addEventListener('click', function(e) {
                e.preventDefault();
                
                if (confirm('Ești sigur că vrei să ștergi imaginea custom?')) {
                    imageInput.value = '';
                    const preview = document.getElementById('banner-preview');
                    if (preview) {
                        preview.style.backgroundImage = '';
                    }
                    // Refresh page to see changes
                    setTimeout(function() {
                        location.reload();
                    }, 300);
                }
            });
        }
    });
})();
