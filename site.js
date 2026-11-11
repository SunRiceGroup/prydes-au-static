'use strict';

async function resolveArchiveView() {
  const params = new URLSearchParams(location.search);
  if (!['offset', 'author', 'tag', 'category'].some(key => params.has(key))) return;
  const response = await fetch('/archive-map.json');
  if (!response.ok) return;
  const views = await response.json();
  const path = decodeURIComponent(location.pathname).replace(/\/$/, '');
  params.sort();
  const query = params.toString();
  const destination = views[path + '?' + query];
  if (destination) location.replace(destination + location.hash);
}

async function renderSearch() {
  const results = document.querySelector('#search-results');
  if (!results) return;
  const query = (new URLSearchParams(location.search).get('q') || '').trim();
  const field = document.querySelector('#search-query');
  field.value = query;
  if (!query) return;
  const response = await fetch('/search-index.json');
  if (!response.ok) throw new Error('Search index unavailable');
  const rows = await response.json();
  const terms = query.toLocaleLowerCase('en-AU').split(/\s+/);
  const ranked = rows.flatMap(([path, title, description]) => {
    const heading = title.toLocaleLowerCase('en-AU');
    const content = description.toLocaleLowerCase('en-AU');
    if (!terms.every(term => heading.includes(term) || content.includes(term))) return [];
    return [{path, title, description, rank: terms.filter(term => heading.includes(term)).length}];
  }).sort((a, b) => b.rank - a.rank);
  const list = document.createElement('ul');
  for (const {path, title, description} of ranked.slice(0, 40)) {
    const item = document.createElement('li');
    const anchor = document.createElement('a');
    anchor.href = path;
    anchor.textContent = title;
    const snippet = document.createElement('p');
    snippet.textContent = description;
    item.append(anchor, snippet);
    list.append(item);
  }
  const status = document.createElement('p');
  status.textContent = ranked.length ? `Showing ${list.children.length} of ${ranked.length} results.` : 'No results found.';
  results.replaceChildren(status, list);
}

function galleryControls(gallery, move) {
  const controls = document.createElement('div');
  controls.className = 'static-gallery-controls';
  for (const [step, label] of [[-1, 'Previous image'], [1, 'Next image']]) {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', label);
    button.textContent = step === -1 ? '‹' : '›';
    button.addEventListener('click', () => move(step));
    controls.append(button);
  }
  gallery.append(controls);
}

function enableGalleries() {
  const galleries = document.querySelectorAll('.sqs-gallery-block-slider, .sqs-gallery-block-slideshow');
  for (const gallery of galleries) {
    const track = gallery.querySelector(':scope > .sqs-gallery');
    if (!track) continue;
    if (gallery.closest('#event-highlight-display-section')) {
      const seen = new Set();
      for (const image of track.querySelectorAll(':scope > img')) {
        if (seen.has(image.getAttribute('src'))) image.remove();
        else seen.add(image.getAttribute('src'));
      }
      gallery.classList.add('static-image-strip');
      galleryControls(gallery, step => {
        const firstImage = track.firstElementChild;
        track.scrollBy({left: step * firstImage.getBoundingClientRect().width});
      });
      continue;
    }
    const slides = [...track.children].filter(slide => slide.matches('img') || slide.querySelector('img'));
    if (!slides.length) continue;
    gallery.classList.add('static-gallery');
    if (gallery.classList.contains('sqs-gallery-block-slider')) {
      gallery.style.setProperty('--gallery-ratio', '2');
    } else {
      const ratios = slides.map(slide => {
        const [width, height] = (slide.querySelector('img')?.dataset.imageDimensions || '').split('x').map(Number);
        return width > 0 && height > 0 ? width / height : 0;
      });
      const ratio = Math.max(...ratios);
      if (ratio) gallery.style.setProperty('--gallery-ratio', ratio);
    }
    let index = 0;
    function select(next) {
      index = (next + slides.length) % slides.length;
      for (const [position, slide] of slides.entries()) slide.hidden = position !== index;
    }
    select(0);
    if (slides.length > 1) galleryControls(gallery, step => select(index + step));
  }
}

function enableSearchControls() {
  for (const controls of document.querySelectorAll('[data-site-search]')) {
    const input = controls.querySelector('input[type="search"]');
    const button = controls.querySelector('button');
    if (!input || !button) continue;
    const goToResults = () => {
      const query = input.value.trim();
      if (query) location.href = '/search?' + new URLSearchParams({q: query});
    };
    button.addEventListener('click', goToResults);
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter') goToResults();
    });
  }
}

function enableArticleSidebars() {
  for (const sidebar of document.querySelectorAll('.blog-item .support-sidebar')) {
    const current = [...sidebar.querySelectorAll('a[href^="/"]')].find(link => link.pathname === location.pathname);
    if (current) {
      current.classList.add('active');
      current.setAttribute('aria-current', 'page');
    }
    for (const group of sidebar.querySelectorAll('.has-sub')) {
      const toggle = group.querySelector(':scope > a[href="#"]');
      if (!toggle) continue;
      const open = expanded => {
        group.classList.toggle('open', expanded);
        toggle.setAttribute('aria-expanded', String(expanded));
      };
      open(current ? group.contains(current) : false);
      toggle.addEventListener('click', event => {
        event.preventDefault();
        open(!group.classList.contains('open'));
      });
    }
    const menu = sidebar.querySelector('.sidebar-menu');
    if (menu) {
      menu.setAttribute('role', 'button');
      menu.setAttribute('aria-label', 'Support menu');
      menu.setAttribute('aria-expanded', 'false');
      menu.tabIndex = 0;
      menu.addEventListener('click', () => {
        menu.setAttribute('aria-expanded', String(sidebar.classList.toggle('open')));
      });
      menu.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        menu.click();
      });
    }
  }
}

const stockistWidget = document.querySelector('#static-stockist-map #storemapper');
if (stockistWidget) {
  const removeLeadCapture = () => stockistWidget.querySelector('#storemapper-leads-collection')?.remove();
  new MutationObserver(removeLeadCapture).observe(stockistWidget, {childList: true, subtree: true});
  removeLeadCapture();
}

const header = document.querySelector('#header');
if (header?.querySelector('#mainNavWrapper.show-on-scroll')) {
  const updateScrollNav = () => header.classList.toggle('static-nav-fixed', window.scrollY > header.offsetHeight);
  window.addEventListener('scroll', updateScrollNav, {passive: true});
  updateScrollNav();
}

function enableBackgroundVideo() {
  const banner = document.querySelector('[data-background-video]');
  const toggle = document.querySelector('[data-background-toggle]');
  if (!banner || !toggle) return;

  const url = new URL(banner.dataset.backgroundVideo);
  url.searchParams.set('autoplay', '1');
  url.searchParams.set('mute', '1');
  url.searchParams.set('playsinline', '1');
  url.searchParams.set('controls', '0');
  url.searchParams.set('loop', '1');
  url.searchParams.set('playlist', url.pathname.split('/').pop());

  let player;
  function play() {
    player = document.createElement('iframe');
    player.src = url.href;
    player.title = 'Pryde’s EasiFeed background video';
    player.allow = 'autoplay; encrypted-media';
    player.referrerPolicy = 'strict-origin-when-cross-origin';
    player.tabIndex = -1;
    player.setAttribute('aria-hidden', 'true');
    banner.append(player);
    toggle.textContent = 'Stop background video';
  }
  function stop() {
    player.remove();
    player = null;
    toggle.textContent = 'Play background video';
  }

  toggle.hidden = false;
  toggle.addEventListener('click', () => player ? stop() : play());
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) play();
}

function enableVideo(button) {
  const url = new URL(button.dataset.videoSrc);
  if (url.origin !== 'https://www.youtube-nocookie.com') return;
  url.searchParams.set('autoplay', '1');
  const player = document.createElement('iframe');
  player.src = url.href;
  player.title = button.dataset.videoTitle || 'Pryde’s video';
  player.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
  player.allowFullscreen = true;
  button.replaceWith(player);
}

function loadStockistMap(button) {
  const frame = document.createElement('iframe');
  frame.src = '/stockist-map';
  frame.title = 'Pryde’s stockist locator';
  frame.className = 'static-map-frame';
  frame.sandbox = 'allow-scripts allow-popups allow-popups-to-escape-sandbox';
  button.replaceWith(frame);
}

document.addEventListener('click', event => {
  const video = event.target.closest('.static-video-button');
  const map = event.target.closest('.static-map-button');
  if (video) enableVideo(video);
  if (map) loadStockistMap(map);
});

for (const quiz of document.querySelectorAll('.static-quiz-frame')) {
  let quizObserver;
  quiz.addEventListener('load', () => {
    quizObserver?.disconnect();
    const body = quiz.contentDocument?.body;
    if (!body) return;
    const sizeQuiz = () => {
      quiz.style.height = Math.ceil(body.getBoundingClientRect().height) + 4 + 'px';
    };
    quizObserver = new ResizeObserver(sizeQuiz);
    quizObserver.observe(body);
    sizeQuiz();
  });
}

const picker = document.querySelector('#myDropdown');
const pickerButton = document.querySelector('[data-product-picker]');
if (picker && pickerButton) {
  pickerButton.addEventListener('click', () => {
    pickerButton.setAttribute('aria-expanded', String(picker.classList.toggle('show')));
  });
  const filter = picker.querySelector('input');
  if (filter) {
    filter.addEventListener('input', () => {
      const term = filter.value.toLocaleLowerCase('en-AU');
      for (const link of picker.querySelectorAll('a')) {
        link.hidden = !link.textContent.toLocaleLowerCase('en-AU').includes(term);
      }
    });
  }
}

for (const nav of document.querySelectorAll('#mobileNavigation, #mainNavigation')) {
  for (const label of nav.querySelectorAll('.folder-toggle-label')) {
    label.tabIndex = 0;
    label.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      label.click();
    });
  }
}

enableGalleries();
enableBackgroundVideo();
enableSearchControls();
enableArticleSidebars();
resolveArchiveView().catch(() => {});
renderSearch().catch(() => {
  const results = document.querySelector('#search-results');
  if (results) results.textContent = 'Search is temporarily unavailable.';
});
