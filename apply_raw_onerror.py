from pathlib import Path
path = Path('single-manga.php')
text = path.read_text(encoding='utf-8')
old = '''              <a href="<?php echo esc_url($official_raw_url); ?>" target="_blank" rel="noopener noreferrer" title="<?php echo esc_attr($alt_text); ?>" style="display: inline-flex; align-items: center; gap: 5px; opacity: 1 !important;">
                <?php if ($logo_url): ?>
                  <img src="<?php echo esc_url($logo_url); ?>" alt="<?php echo esc_attr($alt_text); ?>" width="20" height="20" loading="lazy" decoding="async" style="vertical-align: middle;">
                <?php else: ?>
                  <span style="display:inline-block; font-size:0.75rem; font-weight:700; color:#fff; background:rgba(0,0,0,0.3); border-radius:3px; padding:2px 4px;">RAW</span>
                <?php endif; ?>
              </a>'''
new = '''              <a href="<?php echo esc_url($official_raw_url); ?>" target="_blank" rel="noopener noreferrer" title="<?php echo esc_attr($alt_text); ?>" style="display: inline-flex; align-items: center; gap: 5px; opacity: 1 !important;">
                <?php if ($logo_url): ?>
                  <img src="<?php echo esc_url($logo_url); ?>" alt="<?php echo esc_attr($alt_text); ?>" width="20" height="20" loading="lazy" decoding="async" style="vertical-align: middle;" onerror="this.outerHTML='<span style=\'display:inline-block;font-size:0.75rem;font-weight:700;color:#fff;background:rgba(0,0,0,0.3);border-radius:3px;padding:2px 4px;\'>RAW</span>'">
                <?php else: ?>
                  <span style="display:inline-block; font-size:0.75rem; font-weight:700; color:#fff; background:rgba(0,0,0,0.3); border-radius:3px; padding:2px 4px;">RAW</span>
                <?php endif; ?>
              </a>'''
count = text.count(old)
if count == 0:
    print('No occurrences found; nothing changed.')
else:
    text = text.replace(old, new)
    path.write_text(text, encoding='utf-8')
    print(f'Replaced {count} occurrences.')
