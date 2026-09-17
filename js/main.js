(() => {
  const root = document.documentElement;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const pageCache = new Map();
  const previewTimers = new Set();
  const layer = document.getElementById("transition-layer");
  let busy = false;
  let queuedNavigation = null;
  let scrollTimer;
  let previewOrder = 0;
  let headerObserver;
  let disposeWordmark = () => {};
  history.scrollRestoration = "manual";

  function shell() { return document.getElementById("site-shell"); }
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
    disposeWordmark();
    document.body.dataset.page = shell().dataset.page;
    const closeLink = shell().querySelector('.project-close');
    if (closeLink && history.state?.returnTo) closeLink.href = history.state.returnTo;
    headerObserver?.disconnect();
    const header = shell().querySelector(".site-header");
    if (header) {
      headerObserver = new ResizeObserver(updateHeaderHeight);
      headerObserver.observe(header);
    }
    updateHeaderHeight();
    if (animateWordmark && shell().dataset.page === 'home') disposeWordmark = window.initPortfolioWordmark(false);
  }

  function showPreview(link, immediate = false, leaveDelay = null) {
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
    image.style.setProperty("--angle", (reducedMotion.matches ? 0 : (Math.random() * 16 - 8)).toFixed(2) + "deg");
    image.style.zIndex = String(++previewOrder);
    image.sizes = '(max-width: 700px) 76vw, (max-height: 580px) 40vw, (min-width: 1917px) 920px, 48vw';
    if (link.dataset.srcset) image.srcset = link.dataset.srcset;
    image.src = new URL(link.dataset.thumbnail, location.href).href;
    image.decoding = "async";
    image.draggable = false;
    stage.append(image);
    // Limiter la pile lors d'un passage rapide sur tous les titres.
    while (stage.children.length > 5) stage.firstElementChild.remove();

    function reveal() {
      if (!image.isConnected) return;
      image.classList.add("is-visible");
      if(leaveDelay!==null)delayPreview(() => hidePreview(image), leaveDelay);
    }
    if (immediate) {
      image.classList.add("is-immediate");
      reveal();
    } else {
      image.decode().then(() => {
        if (!image.isConnected) return;
        image.getBoundingClientRect();
        requestAnimationFrame(reveal);
      }).catch(() => image.remove());
    }
    return image;
  }
  function hidePreview(image) {
    if(!image?.isConnected || image.classList.contains('is-leaving'))return;
    image.classList.add('is-leaving');
    delayPreview(()=>image.remove(),reducedMotion.matches?0:600);
  }

  async function fetchPage(url) {
    const key = url.origin + url.pathname + url.search;
    if (!pageCache.has(key)) {
      const request = fetch(key, {credentials:"same-origin"}).then(response => {
        if (!response.ok) throw new Error("Page unavailable");
        return response.text();
      }).then(html => {
        const doc = new DOMParser().parseFromString(html, "text/html");
        if (!doc.getElementById("site-shell")) throw new Error("Unknown page");
        return html;
      }).catch(error => {
        pageCache.delete(key);
        throw error;
      });
      pageCache.set(key, request);
    }
    return pageCache.get(key);
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
    ], {duration:800, easing:"cubic-bezier(.22, 1, .36, 1)", fill:"both"});
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
        copy.src=original.currentSrc||original.src;
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
    document.body.classList.add("is-navigating");
    shell().setAttribute("aria-busy", "true");
    const oldProject = shell().dataset.project;
    let source = null;
    let hiddenImage = null;
    let flight = null;
    let outgoing = null;
    let inputLock = null;
    try {
      const html = await fetchPage(url);
      // Un retour navigateur demandé pendant le chargement garde la priorité.
      if (queuedNavigation?.options.history === false) return;
      const doc = new DOMParser().parseFromString(html, "text/html");
      const next = doc.getElementById("site-shell");
      const incomingHero = next.querySelector(".hero-image");
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
        await Promise.race([loader.decode().catch(() => {}), new Promise(resolve => setTimeout(resolve, 900))]);
      }
      if (queuedNavigation?.options.history === false) return;
      // Mesurer au dernier moment : un survol peut finir pendant le chargement.
      let sourceImage=null;
      if (!reducedMotion.matches && options.link?.isConnected && options.link.matches('.project-link')) {
        sourceImage=showPreview(options.link,true);
      } else if (!reducedMotion.matches && oldProject && /\/(?:index\.html)?$/.test(url.pathname)) {
        sourceImage=shell().querySelector('.hero-image');
      }
      source=imageBox(sourceImage);
      if(!reducedMotion.matches)outgoing=snapshotPage(source?sourceImage:null);
      inputLock=new AbortController();
      const stopScroll=event=>event.preventDefault();
      window.addEventListener('wheel',stopScroll,{passive:false,signal:inputLock.signal});
      window.addEventListener('touchmove',stopScroll,{passive:false,signal:inputLock.signal});
      if (options.history !== false) {
        history.replaceState({...history.state, scrollY:window.scrollY}, "", location.href);
        history.pushState({scrollY:0, ...closeDestinationFor(next.dataset.page)}, "", url);
      }
      clearPreviews();
      shell().replaceWith(next);
      document.title = doc.title;
      initPage();
      scrollToDestination(url, options.scrollY);
      let target = next.querySelector(".hero-image");
      let homeLink = null;
      if (next.dataset.page === "home" && oldProject) {
        homeLink = [...next.querySelectorAll(".project-link")].find(link => link.dataset.project === oldProject);
        // Au retour d'un projet, le fondu commence dès le clic de fermeture.
        target = source && homeLink ? showPreview(homeLink, true, 0) : null;
      }
      if (!reducedMotion.matches) {
        const destination = imageBox(target);
        if (source && destination) {
          hiddenImage = target;
          target.style.visibility = "hidden";
          flight = animateImage(source, destination, Boolean(oldProject && next.dataset.page === "home"));
        }
        const reveal = next.animate([
          {opacity:0}, {opacity:1}
        ], {duration:flight?600:450, easing:"cubic-bezier(.22, 1, .36, 1)"});
        const dismiss=outgoing?.animate([{opacity:1},{opacity:0}],{duration:flight?500:450,easing:'ease-in-out',fill:'forwards'});
        await Promise.allSettled([reveal.finished, dismiss?.finished, flight?.animation.finished]);
      }
      if (hiddenImage) hiddenImage.style.visibility = "";
      flight?.image.remove();
      outgoing?.remove();
      inputLock?.abort();
      // Le clavier arrive dans la nouvelle page, ou retrouve son titre à l'accueil.
      const focusTarget = homeLink || next.querySelector("#mn");
      focusTarget?.focus({preventScroll:true});
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
    if (url.origin !== location.origin ||
        !/(?:\/|\/index\.html|\/informations\.html|\/donnees-du-site\.html|\/projets\/[a-z-]+\.html)$/.test(url.pathname)) return;
    const samePage = url.pathname === location.pathname && url.search === location.search;
    if (samePage) {
      if (!url.hash || !link.closest(".skiplinks")) return;
      let id;
      try { id = decodeURIComponent(url.hash.slice(1)); } catch { id = ""; }
      const target = document.getElementById(id);
      if (!target) return;
      event.preventDefault();
      history.pushState({...history.state, scrollY:window.scrollY}, "", url);
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
