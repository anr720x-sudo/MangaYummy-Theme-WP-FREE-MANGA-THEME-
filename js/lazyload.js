document.addEventListener('DOMContentLoaded', function () {
  const lazySelector = 'img.lazy';
  const rootMargin = '200px';

  function loadImg(img) {
    const src = img.getAttribute('data-src');
    if (src) img.src = src;
    const srcset = img.getAttribute('data-srcset');
    if (srcset) img.srcset = srcset;
    img.removeAttribute('data-src');
    img.removeAttribute('data-srcset');
    img.addEventListener('load', function () {
      img.classList.remove('lazy');
    });
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting || entry.intersectionRatio > 0) {
          const img = entry.target;
          loadImg(img);
          obs.unobserve(img);
        }
      });
    }, { root: null, rootMargin: rootMargin, threshold: 0.01 });

    document.querySelectorAll(lazySelector).forEach(function (img) {
      observer.observe(img);
    });
  } else {
    // Fallback: load all images immediately
    document.querySelectorAll(lazySelector).forEach(function (img) {
      loadImg(img);
    });
  }
});