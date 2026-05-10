document.addEventListener('DOMContentLoaded', function () {
  var headerWrapper = document.querySelector('.community-wrapper');
  if (!headerWrapper) return;

  var dropdown = headerWrapper.querySelector('.community-dropdown');
  var headerToggle = headerWrapper.querySelector('.community-toggle');
  var mobileToggle = document.querySelector('.ya-bottom-nav .community-toggle');

  let closeTimeout = null;

  function openDropdown() {
    dropdown.classList.add('open');
    headerToggle.setAttribute('aria-expanded', 'true');
    dropdown.setAttribute('aria-hidden', 'false');
  }

  function closeDropdown() {
    dropdown.classList.remove('open');
    headerToggle.setAttribute('aria-expanded', 'false');
    dropdown.setAttribute('aria-hidden', 'true');
  }

  function toggleDropdown(e) {
    e.preventDefault();
    e.stopPropagation();

    if (dropdown.classList.contains('open')) {
      closeDropdown();
    } else {
      openDropdown();
    }
  }

  function scheduleClose() {
    closeTimeout = setTimeout(closeDropdown, 150);
  }

  function cancelClose() {
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      closeTimeout = null;
    }
  }

  headerToggle.addEventListener('click', toggleDropdown);
  if (mobileToggle) mobileToggle.addEventListener('click', toggleDropdown);

  headerWrapper.addEventListener('mouseenter', cancelClose);
  headerWrapper.addEventListener('mouseleave', function () {
    scheduleClose();
  });

  dropdown.addEventListener('mouseenter', cancelClose);
  dropdown.addEventListener('mouseleave', function () {
    scheduleClose();
  });

  document.addEventListener('click', function (e) {
    if (!headerWrapper.contains(e.target)) {
      closeDropdown();
    }
  });
});