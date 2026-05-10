document.addEventListener('DOMContentLoaded', function () {
    function createImageRow(value = '') {
        const row = document.createElement('div');
        row.className = 'image-input-row';

        const input = document.createElement('input');
        input.type = 'url';
        input.name = 'chapter_image_urls[]';
        input.placeholder = 'https://.../page1.jpg';
        input.value = value;

        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.className = 'remove-image-row';
        removeButton.textContent = '✕';

        row.appendChild(input);
        row.appendChild(removeButton);

        return row;
    }

    function addImageRow(button) {
        const container = button.closest('.chapter-images-inputs');
        if (!container) return;
        const row = createImageRow();
        container.appendChild(row);
        row.querySelector('input').focus();
    }

    document.body.addEventListener('click', function (event) {
        const target = event.target;

        if (target.matches('.add-image-row')) {
            event.preventDefault();
            addImageRow(target);
        }

        if (target.matches('.remove-image-row')) {
            event.preventDefault();
            const row = target.closest('.image-input-row');
            if (!row) return;
            const container = row.parentElement;
            // keep at least one row
            const rows = container.querySelectorAll('.image-input-row');
            if (rows.length <= 1) {
                // clear value instead of removing
                const input = row.querySelector('input');
                if (input) input.value = '';
                return;
            }
            row.remove();
        }
    });
});
