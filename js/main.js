/* ==========================================================================
   Red Bridge Construction
   Alpine components, GSAP hero entrance, scroll spy and navigation helpers
   ========================================================================== */

(function () {
  'use strict';

  /* --------------------------------------------------------------------- */
  /* Where the two request forms post to.                                   */
  /*                                                                        */
  /* Leave it empty and the forms still validate, but the confirmation says */
  /* plainly that nothing was delivered, so a site put live before the      */
  /* inbox is wired up cannot quietly swallow a lead.                       */
  /*                                                                        */
  /* Set it to a URL that accepts a JSON POST (Formspree, Basin, Netlify    */
  /* Forms, a Worker, whatever the host offers) and the forms start sending */
  /* for real. Nothing else needs to change.                                */
  /* --------------------------------------------------------------------- */
  var FORM_ENDPOINT = '';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var prefersReduced = function () { return reduceMotion.matches; };

  /* ======================================================  Alpine data  == */

  document.addEventListener('alpine:init', function () {

    /* ----------------------------------------------------- Site nav ----- */

    Alpine.data('siteNav', function () {
      return {
        open: false,

        init: function () {
          var self = this;

          this.$watch('open', function (value) {
            document.documentElement.classList.toggle('menu-open', value);
          });

          /* A menu left open across a resize to desktop would hide its own
             close control, so shut it when the inline links take over. */
          var desktop = window.matchMedia('(min-width: 901px)');
          var onChange = function (event) {
            if (event.matches) self.close(false);
          };
          if (desktop.addEventListener) {
            desktop.addEventListener('change', onChange);
          } else if (desktop.addListener) {
            desktop.addListener(onChange);
          }
        },

        toggle: function () {
          this.open = !this.open;
          if (this.open) {
            var self = this;
            this.$nextTick(function () {
              var first = self.$refs.panel.querySelector('a[href]');
              if (first) first.focus();
            });
          }
        },

        /* returnFocus is false when the menu closes because a link was
           followed, so the destination keeps focus instead of the toggle. */
        close: function (returnFocus) {
          if (!this.open) return;
          this.open = false;
          if (returnFocus !== false && this.$refs.toggle) {
            this.$refs.toggle.focus();
          }
        },

        trap: function (event) {
          if (!this.open || !this.$refs.panel) return;

          var items = [this.$refs.toggle].concat(
            Array.prototype.slice.call(
              this.$refs.panel.querySelectorAll('a[href], button:not([disabled])')
            )
          );
          if (!items.length) return;

          var first = items[0];
          var last = items[items.length - 1];

          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      };
    });
   
    /* Project selection lives in createDrawer() and initProjects() rather than
       in an Alpine component: the project records are held by the renderer
       that reads data/projects.json, and an Alpine component would only have
       the id string and would need a store plumbed back to that data. */

    /* ------------------------------------------------- Project forms ---- */

    Alpine.data('projectForm', function (prefix) {
      return {
        prefix: prefix,
        keys: ['name', 'contact', 'service', 'details'],
        sent: false,
        submitted: false,
        busy: false,
        summary: '',
        sentTitle: '',
        sentBody: '',
        fields: { name: '', contact: '', service: '', details: '' },
        errors: { name: '', contact: '', service: '', details: '' },

        get footNote() {
          return FORM_ENDPOINT
            ? 'We reply within one business day. We never share your information.'
            : 'This form is not connected to an inbox yet. Please call (215) 534-1008 in the meantime.';
        },

        init: function () {
          var self = this;
          this.keys.forEach(function (key) {
            self.$watch('fields.' + key, function () {
              /* Clear an error as soon as the value becomes valid, never
                 introduce a new one while the person is still typing. */
              if (self.errors[key]) {
                self.errors[key] = self.check(key);
                self.refreshSummary();
              }
            });
          });
        },

        check: function (key) {
          var value = (this.fields[key] || '').trim();

          if (key === 'name') {
            if (!value) return 'Please enter your name.';
            if (value.length < 2) return 'Please enter your full name.';
            return '';
          }

          if (key === 'contact') {
            if (!value) return 'We need an email address or a phone number so we can reply.';
            var isEmail = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(value);
            var digits = value.replace(/\D/g, '');
            var isPhone = /^[\d\s()+.\-]+$/.test(value) && digits.length >= 10 && digits.length <= 15;
            if (!isEmail && !isPhone) {
              return 'Enter a valid email address, or a phone number with at least 10 digits.';
            }
            return '';
          }

          if (key === 'service') {
            if (!value) return 'Pick the closest fit, or choose Something else.';
            return '';
          }

          if (key === 'details') {
            if (!value) return 'Tell us briefly what the project involves.';
            if (value.length < 15) return 'A little more detail helps. Please write at least 15 characters.';
            return '';
          }

          return '';
        },

        /* Validate on blur, but stay quiet about an empty field the person
           has not tried to submit yet. */
        touch: function (key) {
          if (!this.submitted && !(this.fields[key] || '').trim()) {
            this.errors[key] = '';
            this.refreshSummary();
            return;
          }
          this.errors[key] = this.check(key);
          this.refreshSummary();
        },

        errorCount: function () {
          var self = this;
          return this.keys.filter(function (key) { return self.errors[key]; }).length;
        },

        refreshSummary: function () {
          if (!this.submitted) return;
          var count = this.errorCount();
          if (!count) {
            this.summary = '';
          } else if (count === 1) {
            this.summary = 'One field still needs attention. Nothing has been sent.';
          } else {
            this.summary = count + ' fields still need attention. Nothing has been sent.';
          }
        },

        submit: function () {
          var self = this;
          if (this.busy) return;
          this.submitted = true;

          var firstInvalid = null;
          this.keys.forEach(function (key) {
            self.errors[key] = self.check(key);
            if (self.errors[key] && !firstInvalid) firstInvalid = key;
          });

          if (firstInvalid) {
            this.refreshSummary();
            this.$nextTick(function () {
              var el = document.getElementById(self.prefix + '-' + firstInvalid);
              if (el) el.focus();
            });
            return;
          }

          this.summary = '';

          /* No endpoint configured: say so rather than implying it arrived. */
          if (!FORM_ENDPOINT) {
            this.finish(
              'Checked, and not sent.',
              'Your details passed validation, but this site has no form inbox connected yet, so ' +
              'nothing was delivered. Please call (215) 534-1008 or email ' +
              'redbridgeconstructionllc@gmail.com and we will pick it up from there.'
            );
            return;
          }

          this.busy = true;

          window.fetch(FORM_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
              name: this.fields.name.trim(),
              contact: this.fields.contact.trim(),
              service: this.fields.service,
              details: this.fields.details.trim(),
              source: this.prefix === 'hero' ? 'Hero form' : 'Contact form'
            })
          }).then(function (response) {
            if (!response.ok) throw new Error('Request failed with status ' + response.status);
            self.busy = false;
            self.finish(
              'Thanks, that reached us.',
              'We read every one of these ourselves. Expect a reply within one business day, ' +
              'with next steps and anything we need answered before we can scope the work.'
            );
          }).catch(function () {
            self.busy = false;
            self.summary =
              'Something went wrong sending that. Please try again, or call (215) 534-1008.';
          });
        },

        finish: function (title, body) {
          var self = this;
          this.sentTitle = title;
          this.sentBody = body;
          this.sent = true;
          this.$nextTick(function () {
            if (self.$refs.sentPanel) self.$refs.sentPanel.focus();
          });
        },

        edit: function () {
          var self = this;
          this.sent = false;
          this.$nextTick(function () {
            var el = document.getElementById(self.prefix + '-name');
            if (el) el.focus();
          });
        }
      };
    });
  });
 /* ------------------------------------------------- Featured Hero ---- */
  Alpine.data('featuredProject', function () {
    return {
      init: function () {
      
      }
    }
  });
  /* ==========================================================  Motion  == */

  function initHeroMotion() {
    var root = document.documentElement;
    var gsap = window.gsap;
    var lines = document.querySelectorAll('.hero__title .line');
    var deck = document.querySelector('.hero__deck');
    var actions = document.querySelector('.hero__ctas');
    var facts = document.querySelector('.hero__facts');
    var card = document.querySelector('.hero .card');
    var media = document.querySelector('.hero__media');
    var mediaImg = document.querySelector('.hero__img');
    var badge = document.querySelector('.review-badge');
    var starEls = document.querySelectorAll('.review-star');

    var stack = [deck, badge, actions, facts, card].filter(Boolean);

    /* Move the pre paint state from CSS onto the elements themselves before
       releasing the stylesheet hold, so there is no flash either way. */
    gsap.set(lines, { yPercent: 102, y: 0 });
    gsap.set(stack, { opacity: 0, y: 20 });
    /* Set separately from the stack: the stars ride inside the badge, which is
       already fading and lifting as a whole, so they only carry the pop. */
    if (starEls.length) gsap.set(starEls, { opacity: 0, scale: 0.35 });
    if (media) gsap.set(media, { opacity: 0 });
    if (mediaImg) gsap.set(mediaImg, { scale: 1.06 });
    root.classList.add('anim-ready');

    /* The photograph carries no text, so it is not held back by the font swap
       below. It settles while the headline is still waiting on metrics. */
    if (media) {
      gsap.to(media, { opacity: 1, duration: 1.2, ease: 'power2.out' });
    }
    if (mediaImg) {
      gsap.fromTo(mediaImg, { scale: 1.06 }, { scale: 1, duration: 2.4, ease: 'power2.out' });
    }

    function play() {
      var tl = gsap.timeline({ defaults: { ease: 'power3.out', duration: 0.95 } });

      /* fromTo, with y pinned: a reflow between the set above and this tween
         can leave GSAP reading the transform back as a matrix, which carries
         no percentage, turning the 102% into a stuck pixel offset. */
      tl.fromTo(lines, { yPercent: 102, y: 0 }, { yPercent: 0, y: 0, stagger: 0.085 })
        .to(deck, { opacity: 1, y: 0 }, '-=0.62')
        .to(badge, { opacity: 1, y: 0, duration: 0.6 }, '-=0.70')
        /* The stars land one at a time inside the badge. 0.085 between them
           matches the headline stagger, so the two read as the same gesture.
           back.out gives each one a small overshoot as it settles. */
        .to(starEls, {
          opacity: 1,
          scale: 1,
          duration: 0.42,
          ease: 'back.out(2.4)',
          stagger: 0.085
        }, '-=0.46')
        .to(actions, { opacity: 1, y: 0 }, '-=0.52');

      /* The facts strip is optional. Tweening a null target only earns a
         console warning from GSAP rather than throwing, but the warning is
         noise and hides real ones, so it is skipped when it is not there. */
      if (facts) tl.to(facts, { opacity: 1, y: 0 }, '-=0.76');

      tl.to(card, { opacity: 1, y: 0, duration: 1.05 }, '-=0.86');
    }

    /* Manrope changes the headline metrics, and the masked lines are measured
       against them, so wait for the swap. Capped so a slow font never holds
       the hero back for long. */
    if (document.fonts && document.fonts.ready) {
      var started = false;
      var startOnce = function () {
        if (started) return;
        started = true;
        play();
      };
      document.fonts.ready.then(startOnce);
      window.setTimeout(startOnce, 800);
    } else {
      play();
    }
  }

  /* ========================================  Projects marquee  == */

  /* The wall is built from data/projects.json so a new project is one object in
     that file and nothing else. Two things are worth knowing before editing:

     - Lanes are filled round robin, so adding one project lengthens one lane
       rather than reshuffling the wall.
     - Each lane repeats its cards until it comfortably overflows the window.
       A vertical marquee only loops seamlessly while the groups are taller
       than the frame they run in, and with six projects across three lanes a
       single pass would leave a gap at the bottom of the cycle. */

  var MIN_CARDS_PER_LANE = 6;

  /* ==============================================================  Drawer  == */

  /* A side drawer. Generic on purpose: it knows how to open, close, trap focus
     and lock the page, and takes whatever content it is handed. The projects
     wall is its only caller today.

       drawer.open({ eyebrow, title, text, image: {src, srcset, sizes, alt},
                     facts: [[label, value], ...], scope: [string, ...] },
                   triggerElement)

     The trigger is remembered so focus can go back to the exact card that
     opened it, which is the difference between a drawer that is usable from
     the keyboard and one that dumps you at the top of the document. */
  function createDrawer() {
    var root = document.querySelector('[data-drawer]');
    if (!root) return null;

    var panel = root.querySelector('[data-drawer-panel]');
    var image = root.querySelector('[data-drawer-image]');
    var media = root.querySelector('.drawer__media');
    var eyebrow = root.querySelector('[data-drawer-eyebrow]');
    var title = root.querySelector('[data-drawer-title]');
    var text = root.querySelector('[data-drawer-text]');
    var facts = root.querySelector('[data-drawer-facts]');
    var scope = root.querySelector('[data-drawer-scope]');
    var scopeList = root.querySelector('[data-drawer-scope-list]');

    var open = false;
    var trigger = null;

    function lock(on) {
      var html = document.documentElement;
      if (on) {
        /* Measured before the lock: afterwards the scrollbar is gone and the
           difference reads as zero. */
        var gap = window.innerWidth - html.clientWidth;
        html.style.setProperty('--scrollbar-w', gap + 'px');
        html.classList.add('drawer-open');
      } else {
        html.classList.remove('drawer-open');
        html.style.removeProperty('--scrollbar-w');
      }
    }

    function focusable() {
      return Array.prototype.filter.call(
        panel.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
        function (el) { return el.offsetParent !== null || el === panel; }
      );
    }

    function fill(content) {
      var picture = content.image || {};

      if (picture.src) {
        image.setAttribute('src', picture.src);
        if (picture.srcset) image.setAttribute('srcset', picture.srcset);
        else image.removeAttribute('srcset');
        if (picture.sizes) image.setAttribute('sizes', picture.sizes);
        image.setAttribute('alt', picture.alt || '');
        media.hidden = false;
      } else {
        media.hidden = true;
      }

      eyebrow.textContent = content.eyebrow || '';
      title.textContent = content.title || '';
      text.textContent = content.text || '';

      facts.innerHTML = (content.facts || [])
        .filter(function (row) { return row && row[1]; })
        .map(function (row) {
          return '<div><dt>' + escapeHtml(row[0]) + '</dt><dd>' + escapeHtml(row[1]) + '</dd></div>';
        }).join('');

      var items = content.scope || [];
      scope.hidden = !items.length;
      scopeList.innerHTML = items.map(function (item) {
        return '<li>' + escapeHtml(item) + '</li>';
      }).join('');
    }

    function show(content, from) {
      fill(content);
      trigger = from || null;
      open = true;
      lock(true);
      root.classList.add('is-open');
      /* The panel keeps the previous project's scroll position otherwise. */
      panel.scrollTop = 0;
      window.setTimeout(function () { panel.focus(); }, 0);
    }

    function hide() {
      if (!open) return;
      open = false;
      root.classList.remove('is-open');
      lock(false);
      if (trigger && document.contains(trigger)) trigger.focus();
      trigger = null;
    }

    root.addEventListener('click', function (event) {
      if (event.target.closest('[data-drawer-dismiss]')) hide();
    });

    document.addEventListener('keydown', function (event) {
      if (!open) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        hide();
        return;
      }

      if (event.key !== 'Tab') return;

      var items = focusable();
      if (!items.length) {
        event.preventDefault();
        panel.focus();
        return;
      }

      var first = items[0];
      var last = items[items.length - 1];
      var active = document.activeElement;

      if (event.shiftKey && (active === first || active === panel)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    });

    /* The action inside the drawer points at the contact form, so the drawer
       has to get out of the way before the page scrolls to it. */
    var cta = root.querySelector('[data-drawer-cta]');
    if (cta) cta.addEventListener('click', function () { hide(); });

    return { open: show, close: hide, isOpen: function () { return open; } };
  }

  function loadProjectData() {
    /* An inline <script type="application/json" id="projects-data"> wins if it
       is present. That lets the whole page be served as one file, and makes it
       work from file:// where fetch cannot read a sibling. */
    var inline = document.getElementById('projects-data');
    if (inline) {
      try {
        return Promise.resolve(JSON.parse(inline.textContent));
      } catch (error) {
        return Promise.reject(error);
      }
    }
    return window.fetch('data/projects.json', { cache: 'no-cache' }).then(function (response) {
      if (!response.ok) throw new Error('projects.json responded ' + response.status);
      return response.json();
    });
  }

  /* Builds src and srcset for one project. A full URL is taken as given; a
     path goes through the Next.js optimiser while `optimizer` is on. Once the
     photographs are hosted locally, a local .webp path is expanded to its
     pre-sized siblings, name-<width>.webp; any other path is used as is. */
  function buildImage(project, data) {
    var path = project.image || '';
    if (/^https?:/i.test(path)) return { src: path, srcset: '' };

    var base = data.imageBase || '';
    var widths = data.widths && data.widths.length ? data.widths : [640, 828, 1200];
    var url;

    if (data.optimizer) {
      url = function (width) {
        return base + '/_next/image?url=' + encodeURIComponent(path) + '&w=' + width + '&q=75';
      };
    } else if (/\.webp$/i.test(path)) {
      url = function (width) {
        return base + path.replace(/\.webp$/i, '-' + width + '.webp');
      };
    } else {
      return { src: base + path, srcset: '' };
    }

    return {
      src: url(widths[Math.min(1, widths.length - 1)]),
      srcset: widths.map(function (width) { return url(width) + ' ' + width + 'w'; }).join(', ')
    };
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* `duplicate` cards are inside an aria-hidden group, so they carry an empty
     alt and no role or tabindex: a screen reader hears each project once, and
     Tab does not walk through six copies of the same wall. They keep the id,
     because clicking a repeat is still clicking that project and it would be
     strange for half the visible cards to do nothing. */
  function cardMarkup(project, data, duplicate, sizes) {
    var image = buildImage(project, data);
    var meta = [project.category, project.location].filter(Boolean).join(', ');

    return '<figure class="project" data-project-id="' + escapeHtml(project.id) + '"' +
      (duplicate
        ? ''
        : ' role="button" tabindex="0" aria-label="' + escapeHtml(project.name + ', open details') + '"') +
      '>' +
      '<img src="' + escapeHtml(image.src) + '"' +
      (image.srcset ? ' srcset="' + escapeHtml(image.srcset) + '"' : '') +
      ' sizes="' + escapeHtml(sizes) + '" width="1200" height="900" loading="lazy" decoding="async"' +
      ' alt="' + (duplicate ? '' : escapeHtml(project.alt)) + '">' +
      '<figcaption>' +
      '<p class="project__name">' + escapeHtml(project.name) + '</p>' +
      (meta ? '<p class="project__meta">' + escapeHtml(meta) + '</p>' : '') +
      '</figcaption>' +
      '</figure>';
  }

  function laneCountFor(data) {
    var marquee = data.marquee || {};
    if (window.matchMedia('(max-width: 559px)').matches) return marquee.lanesPhone || 1;
    if (window.matchMedia('(max-width: 899px)').matches) return marquee.lanesTablet || 2;
    return marquee.lanes || 3;
  }

  function renderProjects(wall, data) {
    var projects = (data.projects || []).filter(function (p) { return p && p.name; });
    if (!projects.length) throw new Error('projects.json contained no projects');

    var marquee = data.marquee || {};
    var lanes = Math.max(1, Math.min(laneCountFor(data), projects.length));
    var durations = marquee.durations || [];
    var reverse = marquee.reverse || [];

    /* Matches the --lanes the stylesheet is using at this width, so the
       columns the CSS draws and the columns filled here cannot disagree. */
    wall.style.setProperty('--lanes', lanes);

    var sizes = lanes === 1 ? '92vw' : lanes === 2 ? '46vw' : '31vw';
    var html = '';

    for (var lane = 0; lane < lanes; lane++) {
      var items = projects.filter(function (_, index) { return index % lanes === lane; });
      var groups = Math.max(2, Math.ceil(MIN_CARDS_PER_LANE / items.length));

      var cards = function (duplicate) {
        return items.map(function (project) {
          return cardMarkup(project, data, duplicate, sizes);
        }).join('');
      };

      var groupsHtml = '';
      for (var group = 0; group < groups; group++) {
        groupsHtml += '<div class="marquee__group"' +
          (group === 0 ? '' : ' aria-hidden="true"') + '>' +
          cards(group !== 0) +
          '</div>';
      }

      html += '<div class="marquee"' + (reverse[lane] ? ' marquee--reverse' : '') + '"' +
        ' style="--duration:' + escapeHtml(durations[lane] || '48s') + '">' +
        groupsHtml +
        '</div>';
    }

    wall.innerHTML = html;
    return lanes;
  }

  function initProjects() {
    var wall = document.querySelector('[data-projects-wall]');
    if (!wall) return;

    var fallback = wall.querySelector('[data-projects-fallback]');

    var fail = function (error) {
      wall.innerHTML = '';
      if (fallback) {
        fallback.hidden = false;
        wall.appendChild(fallback);
      }
      if (window.console) window.console.error('Projects failed to load:', error);
    };

    if (typeof window.fetch !== 'function' && !document.getElementById('projects-data')) {
      fail(new Error('fetch is unavailable and no inline projects data was found'));
      return;
    }

    loadProjectData().then(function (data) {
      var lanes = renderProjects(wall, data);

      /* ---------------------------------------- Cards open the drawer --- */

      var drawer = createDrawer();

      if (drawer) {
        var byId = {};
        (data.projects || []).forEach(function (project) { byId[project.id] = project; });

        var openFor = function (card) {
          var project = byId[card.getAttribute('data-project-id')];
          if (!project) return;

          var picture = buildImage(project, data);

          drawer.open({
            eyebrow: project.category || '',
            title: project.name || '',
            /* summary is the written story; alt describes the photograph and
               is the honest fallback while a project has no summary yet. */
            text: project.summary || project.alt || '',
            image: {
              src: picture.src,
              srcset: picture.srcset,
              sizes: '(max-width: 640px) 100vw, 540px',
              alt: project.alt || ''
            },
            facts: [
              ['Type', project.category],
              ['Location', project.location],
              ['Completed', project.year]
            ],
            scope: project.scope || []
          }, card);
        };

        /* Delegated, so it survives the innerHTML swap on every re-render. */
        wall.addEventListener('click', function (event) {
          var card = event.target.closest('.project');
          if (card) openFor(card);
        });

        /* The cards are figures with role="button", so Enter and Space have to
           be wired by hand; a real button would get them for free but would
           fight the card styling. Space is also the page scroll key, so the
           default is suppressed only when a card actually has focus. */
        wall.addEventListener('keydown', function (event) {
          if (event.key !== 'Enter' && event.key !== ' ' && event.key !== 'Spacebar') return;
          var card = event.target.closest('.project[role="button"]');
          if (!card) return;
          event.preventDefault();
          openFor(card);
        });
      }

      /* Re-render on a breakpoint change rather than hiding lanes in CSS,
         which would drop whichever projects happened to land in them. */
      var onResize = function () {
        var next = laneCountFor(data);
        if (next === lanes) return;
        lanes = renderProjects(wall, data);
      };

      ['(max-width: 559px)', '(max-width: 899px)'].forEach(function (query) {
        var mql = window.matchMedia(query);
        if (mql.addEventListener) {
          mql.addEventListener('change', onResize);
        } else if (mql.addListener) {
          mql.addListener(onResize);
        }
      });
    }).catch(fail);
  }

  function initReveals() {
    if (typeof window.ScrollTrigger === 'undefined') return;

    var gsap = window.gsap;
    gsap.registerPlugin(window.ScrollTrigger);

    gsap.utils.toArray('[data-reveal]').forEach(function (el) {
      gsap.set(el, { opacity: 0, y: 22 });
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true }
      });
    });
  }

  /* =====================================================  Navigation  == */

  function initNavState() {
    var nav = document.querySelector('.nav');
    if (!nav) return;

    var ticking = false;
    function update() {
      nav.classList.toggle('is-scrolled', window.scrollY > 8);
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }, { passive: true });

    update();
  }

  function initScrollSpy() {
    var links = Array.prototype.slice.call(document.querySelectorAll('[data-nav-link]'));
    var sections = ['services', 'projects', 'about', 'faq', 'contact']
      .map(function (id) { return document.getElementById(id); })
      .filter(Boolean);

    if (!links.length || !sections.length || !('IntersectionObserver' in window)) return;

    function setCurrent(id) {
      links.forEach(function (link) {
        var match = id !== null && link.getAttribute('href') === '#' + id;
        link.classList.toggle('is-current', match);
        if (match) {
          link.setAttribute('aria-current', 'true');
        } else {
          link.removeAttribute('aria-current');
        }
      });
    }

    var visible = {};

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        visible[entry.target.id] = entry.isIntersecting;
      });

      var active = null;
      for (var i = 0; i < sections.length; i++) {
        if (visible[sections[i].id]) { active = sections[i].id; break; }
      }
      setCurrent(active);
    }, { rootMargin: '-50% 0px -45% 0px', threshold: 0 });

    sections.forEach(function (section) { observer.observe(section); });
  }

  /* Start a project buttons scroll to a form and hand it focus. */
  function initEstimateLinks() {
    var links = document.querySelectorAll('[data-estimate-link]');

    Array.prototype.forEach.call(links, function (link) {
      link.addEventListener('click', function (event) {
        var href = link.getAttribute('href') || '';
        if (href.charAt(0) !== '#') return;

        var target = document.querySelector(href);
        if (!target) return;

        event.preventDefault();
        var instant = prefersReduced();

        target.scrollIntoView({ behavior: instant ? 'auto' : 'smooth', block: 'start' });

        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, '', href);
        }

        window.setTimeout(function () {
          var field = target.querySelector('form input, form select, form textarea');
          if (!field) field = target.querySelector('.sent');
          if (!field) return;

          /* If the scroll landed, focus quietly. If it did not, let focus
             bring the field into view rather than stranding it offscreen. */
          var rect = field.getBoundingClientRect();
          var inView = rect.top >= 0 && rect.bottom <= window.innerHeight;
          field.focus({ preventScroll: inView });
        }, instant ? 0 : 640);
      });
    });
  }

  /* ============================================================  Boot  == */

  function boot() {
    var root = document.documentElement;
    var canAnimate = !prefersReduced() && typeof window.gsap !== 'undefined';

    if (!canAnimate) {
      root.classList.add('anim-ready');
    } else {
      /* Wait for a real animation frame before taking rendering over. In any
         environment that never produces one (a background tab, a prerenderer,
         a screenshot runner) nothing here is hidden in the first place, and
         the fallback timer in the document head reveals the hero on its own. */
      window.requestAnimationFrame(function () {
        if (root.classList.contains('anim-ready')) return;
        initHeroMotion();
        initReveals();
      });
    }

    initProjects();
    initNavState();
    initScrollSpy();
    initEstimateLinks();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
