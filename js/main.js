(() => {
  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const pageCache = new Map();
  const previewTimers = new Set();
  const previewPreloads = new Map();
  const layer = document.getElementById("transition-layer");
  let busy = false;
  let queuedNavigation = null;
  let scrollTimer;
  let previewOrder = 0;
  let headerObserver;
  let disposeWordmark = () => {};
  const mobileMenu = window.matchMedia('(max-width: 700px)');
  // Un même rythme pour toutes les routes ; le trajet de l'image est le temps fort.
  const motion = {page: 300, exit: 200, projectExit: 140, projectEntry: 240, image: 520, reveal: 600};
  let disposeMenu = () => {};
  let smoothScroll = null;
  let scrollFrame = 0;
  let imageObserver;
  history.scrollRestoration = "manual";

  function shell() { return document.getElementById("site-shell"); }
  function disposeSmoothScroll() {
    cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
    smoothScroll?.destroy();
    smoothScroll = null;
  }
  function initSmoothScroll() {
    disposeSmoothScroll();
    // L'accueil tient dans la fenêtre et conserve la manipulation des lettres.
    if (busy || shell().dataset.page === 'home' || !window.Lenis) return;
    const calm = reducedMotion.matches;
    // Le tactile garde le défilement natif du système, plus direct qu'une inertie simulée.
    smoothScroll = new window.Lenis({
      lerp: calm ? .3 : .2, wheelMultiplier: 1, syncTouch: false,
      prevent: element => element.matches('.header-menu, .header-contact')
    });
    if (root.classList.contains('sheet-open')) smoothScroll.stop();
    function tick(time) {
      scrollFrame = 0;
      smoothScroll.raf(time);
      if (smoothScroll.isScrolling === 'smooth') scrollFrame = requestAnimationFrame(tick);
    }
    smoothScroll.on('virtual-scroll', () => {
      if (scrollFrame || document.hidden) return;
      // Éviter un grand pas de temps quand une nouvelle impulsion suit le repos.
      smoothScroll.time = performance.now();
      scrollFrame = requestAnimationFrame(tick);
    });
  }
  reducedMotion.addEventListener('change', initSmoothScroll);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) disposeSmoothScroll();
    else initSmoothScroll();
  });
  window.addEventListener('pagehide', disposeSmoothScroll);
  window.addEventListener('pageshow', initSmoothScroll);
  function initImageReveals() {
    imageObserver?.disconnect();
    if (!('IntersectionObserver' in window)) return;
    imageObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const frame = entry.target;
        imageObserver.unobserve(frame);
        // L'apparition commence sur l'image décodée, pas sur son espace réservé.
        frame.querySelector('img').decode().catch(() => {}).then(() => {
          frame.classList.remove('image-reveal-pending');
          if (!frame.isConnected || !frame.classList.contains('is-loaded')) return;
          const frames = reducedMotion.matches
            ? [{opacity:0}, {opacity:1}]
            : [{transform:'translateY(-18px)', opacity:0, filter:'blur(4px)'},
              {transform:'translateY(0)', opacity:1, filter:'blur(0px)'}];
          frame.animate(frames, {duration:reducedMotion.matches ? 120 : motion.reveal,
            easing:getComputedStyle(root).getPropertyValue('--ease').trim()});
        });
      }
    }, {rootMargin:'0px 0px -24px 0px'});
    shell().querySelectorAll('.project-image-frame').forEach(frame => {
      // Préserver la couverture, la position restaurée et les images déjà à l'écran.
      if (frame.closest('.project-hero') || frame.getBoundingClientRect().top < innerHeight) return;
      frame.classList.add('image-reveal-pending');
      imageObserver.observe(frame);
    });
  }
  function delayPreview(callback, delay) {
    const timer = setTimeout(() => { previewTimers.delete(timer); callback(); }, delay);
    previewTimers.add(timer);
    return timer;
  }
  function clearPreviews() {
    previewTimers.forEach(clearTimeout);
    previewTimers.clear();
    shell().querySelectorAll(".home-thumbnail").forEach(image => image.remove());
  }
  function updateHeaderHeight() {
    const header = shell().querySelector(".site-header");
    if (header) root.style.setProperty("--header-height", header.getBoundingClientRect().height + "px");
  }
  function initPage(animateWordmark = true) {
    disposeMenu();
    disposeWordmark();
    document.body.dataset.page = shell().dataset.page;
    shell().querySelectorAll('.project-image-frame').forEach(frame => {
      const image = frame.querySelector('img');
      const update = () => frame.classList.toggle('is-loaded', image.complete && image.naturalWidth > 0);
      image.addEventListener('load', update);
      image.addEventListener('error', update);
      update();
    });
    const closeLink = shell().querySelector('.project-close');
    if (closeLink && history.state?.returnTo) closeLink.href = history.state.returnTo;
    headerObserver?.disconnect();
    const header = shell().querySelector(".site-header");
    if (header) {
      initMenu(header);
      headerObserver = new ResizeObserver(updateHeaderHeight);
      headerObserver.observe(header);
    }
    updateHeaderHeight();
    if (!busy) initImageReveals();
    initSmoothScroll();
    if (animateWordmark && shell().dataset.page === 'home') disposeWordmark = window.initPortfolioWordmark(false);
  }

  function initMenu(header) {
    const groups = [
      {panel: header.querySelector('.header-menu'), toggle: header.querySelector('.menu-toggle')},
      {panel: header.querySelector('.header-contact'), toggle: header.querySelector('.contact-toggle')}
    ];
    const controller = new AbortController();
    const options = {signal: controller.signal};
    const sheet = document.createElement('dialog');
    sheet.className = 'mobile-sheet';
    sheet.setAttribute('aria-labelledby', 'mobile-sheet-title');
    sheet.innerHTML = '<div class="sheet-heading"><h2 id="mobile-sheet-title"></h2><button class="sheet-close" type="button" autofocus>Fermer <span aria-hidden="true">×</span></button></div>';
    document.body.append(sheet);
    let active = null;
    let closeTimer;
    let outsidePress = false;
    groups.forEach(group => {
      group.anchor = document.createComment('mobile-panel');
      group.panel.before(group.anchor);
      group.toggle.setAttribute('aria-haspopup', 'dialog');
    });
    function unlock() {
      root.classList.remove('sheet-open');
      root.style.removeProperty('--sheet-scrollbar-width');
      smoothScroll?.start();
    }
    function finishClose(restoreFocus = true) {
      clearTimeout(closeTimer);
      const previous = active;
      active = null;
      sheet.classList.remove('is-open');
      if (sheet.open) sheet.close();
      groups.forEach(group => {
        group.anchor.after(group.panel);
        group.panel.inert = mobileMenu.matches;
      });
      unlock();
      if (restoreFocus && previous?.toggle.isConnected && mobileMenu.matches) previous.toggle.focus({preventScroll: true});
    }
    function close(restoreFocus = true) {
      if (!active) return;
      active.toggle.setAttribute('aria-expanded', 'false');
      sheet.classList.remove('is-open');
      clearTimeout(closeTimer);
      // Conserver la modalité et le verrouillage jusqu'à la fin de la sortie.
      if (reducedMotion.matches) finishClose(restoreFocus);
      else closeTimer = setTimeout(() => finishClose(restoreFocus), 280);
    }
    function open(group, focusLink = false) {
      if (!mobileMenu.matches) return;
      clearTimeout(closeTimer);
      groups.forEach(item => item.toggle.setAttribute('aria-expanded', String(item === group)));
      if (active && active !== group) {
        active.anchor.after(active.panel);
        active.panel.inert = true;
      }
      active = group;
      group.panel.inert = false;
      sheet.querySelector('h2').textContent = group.toggle.textContent;
      sheet.append(group.panel);
      if (!sheet.open) root.style.setProperty('--sheet-scrollbar-width', (innerWidth - root.clientWidth) + 'px');
      root.classList.add('sheet-open');
      smoothScroll?.stop();
      if (!sheet.open) {
        sheet.showModal();
        // Enregistrer la position basse avant de lancer la transition CSS.
        getComputedStyle(sheet).transform;
      }
      sheet.classList.add('is-open');
      (focusLink ? group.panel.querySelector('a') : sheet.querySelector('button')).focus({preventScroll: true});
    }
    function sync() {
      const previous = active;
      groups.forEach(group => group.toggle.setAttribute('aria-expanded', 'false'));
      finishClose(false);
      groups.forEach(group => { group.toggle.hidden = !mobileMenu.matches; });
      if (previous) (mobileMenu.matches ? previous.toggle : previous.panel.querySelector('a')).focus({preventScroll: true});
      updateHeaderHeight();
    }
    header.classList.add('menu-ready');
    groups.forEach(group => {
      group.toggle.addEventListener('click', () => {
        if (active === group && sheet.classList.contains('is-open')) close();
        else open(group);
      }, options);
      group.toggle.addEventListener('keydown', event => {
        if (event.key !== 'ArrowDown' || !mobileMenu.matches) return;
        event.preventDefault();
        open(group, true);
      }, options);
      group.panel.addEventListener('click', event => {
        if (mobileMenu.matches && event.target.closest('a[href]')) close();
      }, options);
    });
    sheet.querySelector('button').addEventListener('click', () => close(), options);
    sheet.addEventListener('cancel', event => {
      event.preventDefault();
      close();
    }, options);
    function isOutside(event) {
      const box = sheet.getBoundingClientRect();
      return event.target === sheet && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom);
    }
    sheet.addEventListener('pointerdown', event => { outsidePress = isOutside(event); }, options);
    sheet.addEventListener('click', event => {
      if (outsidePress && isOutside(event)) close();
      outsidePress = false;
    }, options);
    mobileMenu.addEventListener('change', sync, options);
    disposeMenu = () => { finishClose(false); controller.abort(); sheet.remove(); };
    sync();
  }

  function setPreviewSource(image, link) {
    image.sizes = '(max-width: 700px) 76vw, (max-height: 580px) 40vw, (min-width: 1917px) 920px, 48vw';
    if (link.dataset.srcset) image.srcset = link.dataset.srcset;
    image.src = new URL(link.dataset.thumbnail, location.href).href;
  }
  function preloadPreviews() {
    if (navigator.connection?.saveData) return;
    shell().querySelectorAll('.project-link').forEach(link => {
      const key = new URL(link.dataset.thumbnail, location.href).href;
      if (previewPreloads.has(key)) return;
      const image = new Image();
      previewPreloads.set(key, image);
      image.decoding = 'async';
      image.fetchPriority = 'low';
      setPreviewSource(image, link);
      image.decode().catch(() => previewPreloads.delete(key));
    });
  }

  function showPreview(link, immediate = false, leaveDelay = null) {
    if (mobileMenu.matches) return link.querySelector('.project-mobile-thumbnail');
    const stage = shell().querySelector(".preview-stage");
    if (!stage || (busy && !immediate)) return null;
    const previous = [...stage.children].find(image =>
      image.dataset.project === link.dataset.project && !image.classList.contains("is-leaving")
    );
    if (previous) return previous;
    const image = new Image();
    image.className = "home-thumbnail";
    image.alt = "";
    image.width = Number(link.dataset.width);
    image.height = Number(link.dataset.height);
    image.dataset.project = link.dataset.project;
    image.style.setProperty("--angle", (reducedMotion.matches ? 0 : (Math.random() * 14 - 7)).toFixed(2) + "deg");
    image.style.zIndex = String(++previewOrder);
    setPreviewSource(image, link);
    image.decoding = "async";
    image.draggable = false;
    stage.append(image);
    // Limiter la pile lors d'un passage rapide sur tous les titres.
    while (stage.children.length > 5) stage.firstElementChild.remove();

    function reveal() {
      if (!image.isConnected || image.classList.contains('is-leaving')) return;
      image.classList.add("is-visible");
      if(leaveDelay!==null)delayPreview(() => hidePreview(image), leaveDelay);
    }
    if (immediate) {
      image.classList.add("is-immediate");
      reveal();
    } else {
      image.decode().then(() => {
        if (!image.isConnected) return;
        // Enregistrer l'état invisible avant la transition, même au premier survol.
        getComputedStyle(image).opacity;
        requestAnimationFrame(() => requestAnimationFrame(reveal));
      }).catch(() => image.remove());
    }
    return image;
  }
  function hidePreview(image) {
    if(!image?.isConnected || image.classList.contains('is-leaving'))return;
    image.classList.add('is-leaving');
    delayPreview(()=>image.remove(),reducedMotion.matches?0:320);
  }

  async function fetchPage(url) {
    const key = url.origin + url.pathname + url.search;
    if (!pageCache.has(key)) {
      const request = fetch(key, {credentials:"same-origin"}).then(response => {
        if (!response.ok) throw new Error("Page unavailable");
        return response.text();
      }).then(html => {
        // Analyser le document seulement à la navigation, pas à chaque préchargement.
        if (!html.includes('id="site-shell"')) throw new Error("Unknown page");
        return html;
      }).catch(error => {
        pageCache.delete(key);
        throw error;
      });
      pageCache.set(key, request);
    }
    return pageCache.get(key);
  }

  const siteRoute = /(?:\/|\/index\.html|\/informations\.html|\/donnees-du-site\.html|\/projets\/[a-z-]+\.html)$/;
  // Les pages liées sont légères : les avoir en cache rend chaque clic immédiat, au tactile aussi.
  function prefetchPages() {
    if (navigator.connection?.saveData || location.protocol === 'file:') return;
    const run = () => shell().querySelectorAll('a[href]').forEach(link => {
      const url = new URL(link.href, location.href);
      if (url.origin === location.origin && url.pathname !== location.pathname && siteRoute.test(url.pathname)) fetchPage(url).catch(() => {});
    });
    if (window.requestIdleCallback) requestIdleCallback(run, {timeout: 2000});
    else setTimeout(run, 200);
  }

  function previewLink(link, immediate = false) {
    const image = showPreview(link, immediate);
    if (!navigator.connection?.saveData) fetchPage(new URL(link.href)).catch(() => {});
    return image;
  }
  document.addEventListener("pointerover", event => {
    const link = event.target.closest(".project-link");
    if (!link || event.pointerType === "touch" || link.contains(event.relatedTarget)) return;
    previewLink(link);
  });
  document.addEventListener("pointerout", event => {
    const link=event.target.closest('.project-link');
    if(!link || event.pointerType==='touch' || link.contains(event.relatedTarget))return;
    const image=[...shell().querySelectorAll('.home-thumbnail')].reverse().find(item=>item.dataset.project===link.dataset.project);
    hidePreview(image);
  });
  document.addEventListener("focusin", event => {
    const link = event.target.closest(".project-link");
    if (link && !busy) previewLink(link);
  });
  document.addEventListener('focusout',event=>{
    const link=event.target.closest('.project-link');
    if(link && !link.contains(event.relatedTarget)) {
      const image=[...shell().querySelectorAll('.home-thumbnail')].reverse().find(item=>item.dataset.project===link.dataset.project);
      hidePreview(image);
    }
  });

  function imageBox(image) {
    if (!image) return null;
    const rect = image.getBoundingClientRect();
    if (!rect.width || rect.bottom <= 0 || rect.top >= innerHeight) return null;
    const style = getComputedStyle(image);
    const transform = new DOMMatrix(style.transform);
    const scale = Math.hypot(transform.a, transform.b);
    const width = parseFloat(style.width) * scale;
    const height = parseFloat(style.height) * scale;
    return {
      element: image,
      src: image.currentSrc || image.src,
      width, height,
      x: rect.left + rect.width / 2 - width / 2,
      y: rect.top + rect.height / 2 - height / 2,
      angle: Math.atan2(transform.b, transform.a) * 180 / Math.PI
    };
  }

  function animateImage(from, to, fadeOut = false) {
    const image = from.element ?? new Image();
    image.removeAttribute('srcset');
    image.removeAttribute('sizes');
    image.className = "transition-image";
    image.src = from.src;
    image.alt = "";
    image.style.width = from.width + "px";
    image.style.height = from.height + "px";
    layer.append(image);
    // Le centre reste cohérent pendant la rotation et l'agrandissement.
    const finalScale = to.width / from.width;
    const finalX = to.x + (to.width - from.width) / 2;
    const finalY = to.y + (to.height - from.height) / 2;
    const animation = image.animate([
      {transform:"translate("+from.x+"px, "+from.y+"px) rotate("+from.angle+"deg) scale(1)",opacity:1},
      {transform:"translate("+finalX+"px, "+finalY+"px) rotate("+to.angle+"deg) scale("+finalScale+")",opacity:fadeOut?0:1}
    ], {duration:motion.image, easing:getComputedStyle(root).getPropertyValue('--ease').trim(), fill:"both"});
    return {image, animation};
  }

  function scrollToDestination(url, restoreScroll) {
    let top = restoreScroll ?? 0;
    if (url.hash) {
      let id;
      try { id = decodeURIComponent(url.hash.slice(1)); } catch { id = ""; }
      const target = document.getElementById(id);
      if (target) top = target.getBoundingClientRect().top + window.scrollY - 24;
    }
    window.scrollTo({top:Math.max(0, top), behavior:"instant"});
  }

  function closeDestinationFor(nextPage) {
    if (nextPage !== "project") return null;
    const currentPage = shell().dataset.page;
    const state = history.state ?? {};
    if (currentPage === "project") {
      const fallback = document.querySelector(".project-close")?.href ?? new URL("../index.html", location.href).href;
      const depth = Number.isInteger(state.returnDepth) && state.returnDepth > 0 ? state.returnDepth + 1 : 0;
      return {returnTo: state.returnTo ?? fallback, returnDepth: depth};
    }
    return {returnTo: location.href, returnDepth: 1};
  }

  function closeProject(link) {
    const state = history.state ?? {};
    const depth = Number.isInteger(state.returnDepth) ? state.returnDepth : 1;
    if (state.returnTo && depth > 0) {
      history.go(-depth);
      return;
    }
    navigate(new URL(state.returnTo ?? link?.href ?? "../index.html", location.href), {link});
  }

  function snapshotPage(sourceImage) {
    const current=shell(), rect=current.getBoundingClientRect();
    const snapshot=document.createElement('div');
    snapshot.className='transition-snapshot';
    snapshot.inert=true;
    snapshot.style.background=getComputedStyle(document.body).backgroundColor;
    snapshot.style.color=getComputedStyle(current).color;
    const clone=current.cloneNode(true);
    const originals=[current,...current.querySelectorAll('*')];
    const copies=[clone,...clone.querySelectorAll('*')];
    originals.forEach((original,index)=>{
      const copy=copies[index];
      copy.removeAttribute('id');
      if(original.tagName==='IMG') {
        copy.removeAttribute('srcset');
        // Une image différée non chargée ne doit pas télécharger son PNG d'origine.
        if(original.currentSrc)copy.src=original.currentSrc;else copy.removeAttribute('src');
      }
      if(original.tagName==='SOURCE')copy.removeAttribute('srcset');
      if(original.matches('.home-thumbnail,.letter-entry')) {
        const style=getComputedStyle(original);
        copy.style.transform=style.transform;copy.style.opacity=style.opacity;
      }
      if(original===sourceImage)copy.style.visibility='hidden';
    });
    Object.assign(clone.style,{width:rect.width+'px',minHeight:rect.height+'px',
      display:getComputedStyle(current).display,flexDirection:getComputedStyle(current).flexDirection,
      transform:'translateY('+(-window.scrollY)+'px)'});
    snapshot.append(clone);layer.append(snapshot);
    return snapshot;
  }

  async function navigate(url, options = {}) {
    if (busy) {
      queuedNavigation = {url, options};
      return;
    }
    busy = true;
    // Figer l'inertie avant la capture et l'enregistrement de la position.
    disposeSmoothScroll();
    document.body.classList.add("is-navigating");
    shell().setAttribute("aria-busy", "true");
    const oldProject = shell().dataset.project;
    const animateTransition = !reducedMotion.matches;
    let source = null;
    let hiddenImage = null;
    let flight = null;
    let outgoing = null;
    let inputLock = null;
    try {
      // Finir la fermeture du menu avant de capturer la page sortante.
      const menuExit = options.link?.closest('.header-menu')?.getAnimations() ?? [];
      await Promise.allSettled(menuExit.map(animation => animation.finished));
      const html = await fetchPage(url);
      // Un retour navigateur demandé pendant le chargement garde la priorité.
      if (queuedNavigation?.options.history === false) return;
      const doc = new DOMParser().parseFromString(html, "text/html");
      const next = doc.getElementById("site-shell");
      const betweenProjects = Boolean(oldProject && next.dataset.page === "project");
      const navigationEase = getComputedStyle(root).getPropertyValue('--ease').trim();
      const incomingHero = next.querySelector(".hero-image");
      let heroReady = Promise.resolve();
      if (incomingHero) {
        const loader = new Image();
        const source = incomingHero.parentElement.querySelector('source');
        if (source) {
          loader.sizes = source.sizes;
          loader.srcset = source.srcset.split(',').map(candidate => {
            const [file, descriptor] = candidate.trim().split(/\s+/);
            return new URL(file, url).href + ' ' + descriptor;
          }).join(', ');
        }
        loader.src = new URL(incomingHero.getAttribute("src"), url).href;
        // Les dimensions sont réservées dans le HTML, même si le réseau est lent.
        heroReady = Promise.race([loader.decode().catch(() => {}), new Promise(resolve => setTimeout(resolve, 900))]);
      }
      let sourceImage=null;
      if (animateTransition && options.link?.isConnected && options.link.matches('.project-link')) {
        sourceImage=showPreview(options.link,true);
      }
      // Sans image en vol, la couverture doit être prête ; sinon elle charge pendant le vol.
      if (!imageBox(sourceImage) && !(animateTransition && betweenProjects)) await heroReady;
      if (queuedNavigation?.options.history === false) return;
      // Mesurer au dernier moment : un survol peut finir pendant le chargement.
      source=imageBox(sourceImage);
      if(animateTransition)outgoing=snapshotPage(source?sourceImage:null);
      inputLock=new AbortController();
      const stopScroll=event=>event.preventDefault();
      window.addEventListener('wheel',stopScroll,{passive:false,signal:inputLock.signal});
      window.addEventListener('touchmove',stopScroll,{passive:false,signal:inputLock.signal});
      // Deux phases courtes évitent de superposer les contenus des projets.
      if (animateTransition && betweenProjects) {
        const departure = shell().animate([{opacity:1},{opacity:0}], {
          duration:motion.projectExit, easing:navigationEase, fill:'forwards'
        });
        const snapshotDeparture = outgoing.animate([{opacity:1},{opacity:0}], {
          duration:motion.projectExit, easing:navigationEase, fill:'forwards'
        });
        await Promise.allSettled([departure.finished, snapshotDeparture.finished, heroReady]);
        departure.cancel();
        if (queuedNavigation?.options.history === false) return;
        outgoing?.remove();
        outgoing = null;
      }
      if (options.history !== false) {
        history.replaceState({...history.state, scrollY:window.scrollY}, "", location.href);
        history.pushState({scrollY:0, ...closeDestinationFor(next.dataset.page)}, "", url);
      }
      clearPreviews();
      shell().replaceWith(next);
      document.title = doc.title;
      initPage();
      scrollToDestination(url, options.scrollY);
      initImageReveals();
      let target = next.querySelector(".hero-image");
      let homeLink = null;
      if (next.dataset.page === "home" && oldProject) {
        homeLink = [...next.querySelectorAll(".project-link")].find(link => link.dataset.project === oldProject);
        target = null;
      }
      if (animateTransition) {
        const destination = imageBox(target);
        if (source && destination) {
          hiddenImage = target;
          target.style.visibility = "hidden";
          flight = animateImage(source, destination, Boolean(oldProject && next.dataset.page === "home"));
        }
        const reveal = next.animate([
          {opacity:0}, {opacity:1}
        ], {duration:betweenProjects?motion.projectEntry:motion.page, easing:navigationEase});
        const dismiss=outgoing?.animate([{opacity:1},{opacity:0}],{duration:motion.exit,easing:navigationEase,fill:'forwards'});
        await Promise.allSettled([reveal.finished, dismiss?.finished, flight?.animation.finished]);
        // L'image en vol reste en place jusqu'au décodage de la couverture.
        if (flight) await heroReady;
      }
      if (hiddenImage) hiddenImage.style.visibility = "";
      flight?.image.remove();
      outgoing?.remove();
      inputLock?.abort();
      // Le clavier arrive dans la nouvelle page, ou retrouve son titre à l'accueil.
      const focusTarget = homeLink || next.querySelector("#mn");
      focusTarget?.focus({preventScroll:true});
      prefetchPages();
    } catch (error) {
      // Tous les liens fonctionnent aussi sans l'amélioration JavaScript.
      if (options.history === false) location.replace(url.href);
      else location.assign(url.href);
    } finally {
      if (hiddenImage) hiddenImage.style.visibility = "";
      flight?.image.remove();
      outgoing?.remove();
      inputLock?.abort();
      shell()?.removeAttribute("aria-busy");
      document.body.classList.remove("is-navigating");
      busy = false;
      initSmoothScroll();
      if (queuedNavigation) {
        const pending = queuedNavigation;
        queuedNavigation = null;
        navigate(pending.url, pending.options);
      }
    }
  }

  document.addEventListener("click", event => {
    const link = event.target.closest("a[href]");
    if (!link || link.target === "_blank" || link.hasAttribute("download") ||
        event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || !siteRoute.test(url.pathname)) return;
    const samePage = url.pathname === location.pathname && url.search === location.search;
    if (samePage) {
      if (!url.hash || !link.closest(".skiplinks")) return;
      let id;
      try { id = decodeURIComponent(url.hash.slice(1)); } catch { id = ""; }
      const target = document.getElementById(id);
      if (!target) return;
      event.preventDefault();
      const state = {...history.state, scrollY:window.scrollY};
      // Un lien d'évitement crée une entrée d'historique supplémentaire.
      // Sur une page projet, elle doit faire partie du recul de « Fermer » afin
      // de revenir à la page d'origine plutôt qu'au projet précédent.
      if (shell().dataset.page === "project" && state.returnTo && Number.isInteger(state.returnDepth)) {
        state.returnDepth += 1;
      }
      history.pushState(state, "", url);
      smoothScroll?.reset();
      target.focus({preventScroll:true});
      target.scrollIntoView({block:"start", behavior:"instant"});
      return;
    }
    if(link.matches('.project-close')) {
      event.preventDefault();
      closeProject(link);
      return;
    }
    event.preventDefault();
    navigate(url, {link});
  });
  window.addEventListener("popstate", event => {
    navigate(new URL(location.href), {history:false, scrollY:event.state?.scrollY ?? 0});
  });
  window.addEventListener("scroll", () => {
    if (busy) return;
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      if (!busy) history.replaceState({...history.state, scrollY:window.scrollY}, "", location.href);
    }, 120);
  }, {passive:true});
  document.addEventListener("keydown", event => {
    if (['ArrowUp','ArrowDown','PageUp','PageDown','Home','End',' '].includes(event.key)) smoothScroll?.reset();
    if (event.key !== "Escape" || busy || shell().dataset.page !== "project") return;
    const link = document.querySelector(".project-close");
    event.preventDefault();
    closeProject(link);
  });
  window.addEventListener("resize", updateHeaderHeight);
  async function initialLoad() {
    const boot = window.portfolioBoot;
    const resources = [document.fonts.ready];
    // Le pourcentage mesure les ressources utiles prêtes (pas les octets).
    for (const image of document.querySelectorAll('img[loading="eager"]')) resources.push(image.decode().catch(()=>{}));
    let completed = 2; // HTML, styles et scripts sont maintenant exécutés.
    const total = resources.length+completed;
    boot?.progress(completed/total*100);
    const ready = Promise.allSettled(resources.map(resource => Promise.resolve(resource).finally(()=>boot?.progress(++completed/total*100))));
    let timeout;
    await Promise.race([ready,new Promise(resolve=>{timeout=setTimeout(resolve,7500);})]);
    clearTimeout(timeout);
    await boot?.finish();
    updateHeaderHeight();
    preloadPreviews();
    prefetchPages();
    // Une navigation effectuée pendant le chargement ne réinitialise pas sa page.
    if (shell().dataset.page === 'home') {
      disposeWordmark();
      disposeWordmark=window.initPortfolioWordmark();
    }
  }
  initPage(false);
  initialLoad();
  document.fonts.ready.then(updateHeaderHeight);
  history.replaceState({...history.state, scrollY:window.scrollY}, "", location.href);
})();
