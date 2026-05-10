(function(){
  if (typeof window === 'undefined') return;

  // Lazy image observer
  const imgObserver = new IntersectionObserver((entries)=>{
    entries.forEach(entry=>{
      if (!entry.isIntersecting) return;
      const img = entry.target;
      const src = img.getAttribute('data-src');
      if (src) {
        img.src = src;
        img.removeAttribute('data-src');
        img.classList.remove('lazy');
      }
      imgObserver.unobserve(img);
    });
  }, {rootMargin: '200px 0px'});

  function observeLazyImages(root=document){
    root.querySelectorAll('img.lazy').forEach(img=>imgObserver.observe(img));
  }

  // Preload first N images above the fold
  function preloadTopImages(n=5){
    const imgs = Array.from(document.querySelectorAll('img.lazy')).slice(0,n);
    imgs.forEach(img=>{
      const src = img.getAttribute('data-src');
      if (src) img.src = src;
    });
  }

  // Progressive fetch for sections
  function fetchSection(section, page=1, per_page=20){
    const url = new URL(window.mgy_home.rest_url);
    url.searchParams.set('section', section);
    url.searchParams.set('page', page);
    url.searchParams.set('per_page', per_page);
    return fetch(url.toString(), {headers: {'X-WP-Nonce': (window.mgy_home && window.mgy_home.nonce) || ''}})
      .then(r=>r.json());
  }

  // Render item into container: minimal card HTML matching theme styles
  function renderMangaCard(item){
    const div = document.createElement('div');
    div.className = 'manga-card virtual-item';
    div.innerHTML = `
      <a href="${item.permalink}" class="manga-link">
        <div class="manga-poster-wrap">
          <img data-src="${item.thumbnail}" class="lazy manga-cover" alt="${escapeHtml(item.title)}" loading="lazy" decoding="async">
        </div>
        <span class="manga-title">${escapeHtml(item.title)}</span>
      </a>
    `;
    return div;
  }

  function escapeHtml(s){
    return (s+'').replace(/[&<>\"']/g, function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c];});
  }

  // Virtualization: keep roughly maxItems in DOM by removing oldest when appending
  function attachProgressiveLoader(container, sectionName, initialPage){
    container.dataset.section = sectionName;
    container.dataset.page = initialPage || 1;
    container.dataset.loading = '0';
    container.dataset.perPage = container.dataset.perPage || '20';
    container.dataset.maxDom = container.dataset.maxDom || '40';

    const sentinel = document.createElement('div');
    sentinel.className = 'virtual-sentinel';
    container.parentNode.appendChild(sentinel);

    const sentinelObserver = new IntersectionObserver((entries)=>{
      entries.forEach(async ent=>{
        if (!ent.isIntersecting) return;
        if (container.dataset.loading === '1') return;
        container.dataset.loading = '1';
        let page = parseInt(container.dataset.page,10) + 1;
        const per_page = parseInt(container.dataset.perPage,10);
        try{
          const json = await fetchSection(sectionName, page, per_page);
          if (json && Array.isArray(json.items) && json.items.length>0){
            json.items.forEach(item=>{
              const node = renderMangaCard(item);
              container.appendChild(node);
            });
            observeLazyImages(container);
            // reduce DOM if too many
            const maxDom = parseInt(container.dataset.maxDom,10);
            const items = container.querySelectorAll('.virtual-item');
            if (items.length > maxDom){
              const removeCount = items.length - maxDom;
              for (let i=0;i<removeCount;i++) items[i].remove();
            }
            container.dataset.page = page;
          } else {
            // nothing more; stop observing
            sentinelObserver.unobserve(sentinel);
          }
        }catch(e){
          console.error('Failed to load section',sectionName,e);
        }
        container.dataset.loading = '0';
      });
    }, {rootMargin: '800px 0px'});

    sentinelObserver.observe(sentinel);
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    // Observe lazy images already present
    observeLazyImages(document);
    preloadTopImages(5);

    // Attach progressive loaders to known containers
    const popularGrid = document.querySelector('.swiper.popular-swiper .swiper-wrapper') || document.querySelector('#popular-recent-grid');
    if (popularGrid) {
      // container should be the element where .manga-card items are appended
      const container = popularGrid;
      attachProgressiveLoader(container, 'popular', parseInt(container.dataset.page||1,10));
    }

    const recentlyAdded = document.querySelector('.swiper.recently-added-swiper .swiper-wrapper');
    if (recentlyAdded){
      attachProgressiveLoader(recentlyAdded, 'recently_added', parseInt(recentlyAdded.dataset.page||1,10));
    }

    const recommended = document.querySelector('.swiper.recommended-swiper .swiper-wrapper');
    if (recommended){
      // recommended small; still allow progressive loading
      attachProgressiveLoader(recommended, 'recommended', parseInt(recommended.dataset.page||1,10));
    }
  });
})();
