/**
 * მოკლე დამხმარეები, რათა querySelector და querySelectorAll რამდენჯერმე არ გამეორდეს.
 * qs აბრუნებს პირველსავე დამთხვევას, ხოლო qsa — მასივს ყველა ელემენტით.
 */
const qs = (selector, scope = document) => scope.querySelector(selector);
const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

/**
 * მართვის პანელიდან შემოტანილი მონაცემების გზა.
 * JSON ფაილი ინახავს ყველა ტექსტს, სურათს და სიებს, რათა Netlify CMS-იდან
 * მარტივად შევცვალოთ კონტენტი და აქვე ავსახოთ.
 */
const CONTENT_PATH = 'content/site-content.json';

/**
 * JSON ფაილის წამოღება. თუ რაღაც ვერ წავიდა, კონსოლში გაფრთხილება იბეჭდება,
 * ხოლო გვერდი დარჩება HTML-ში მითითებული ნაგულისხმები ტექსტებით.
 */
const fetchSiteContent = async () => {
  try {
    const response = await fetch(CONTENT_PATH, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Content request failed with status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.warn('ვერ მოხერხდა მართვის პანელის მონაცემების ჩატვირთვა:', error);
    return null;
  }
};

/**
 * შაბლონის კლონირება <template> ტეგიდან.
 */
const cloneTemplate = (templateId) => {
  const template = qs(`#${templateId}`);
  if (!template?.content?.firstElementChild) return null;
  return template.content.firstElementChild.cloneNode(true);
};

/**
 * data-attr-* ატრიბუტის სახელის გარდაქმნა dataset-ის კემელკეისიდან HTML ატრიბუტამდე.
 */
const datasetKeyToAttr = (datasetKey) => {
  const raw = datasetKey.slice(4); // attrHref -> Href
  const decapitalised = raw.replace(/^([A-Z])/, (_, char) => char.toLowerCase());
  return decapitalised.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
};

/**
 * ერთ ელემენტში ვავსებთ data-field და data-attr-* ატრიბუტებს.
 */
const populateElementFields = (element, data) => {
  if (!element?.dataset) return;

  if (element.dataset.field) {
    const value = data[element.dataset.field];
    if (value !== undefined) {
      element.textContent = value;
    }
  }

  Object.keys(element.dataset)
    .filter((key) => key.startsWith('attr'))
    .forEach((key) => {
      const attrName = datasetKeyToAttr(key);
      const fieldName = element.dataset[key];
      const value = data[fieldName];
      if (value === undefined || value === null || value === '') {
        element.removeAttribute(attrName);
      } else {
        element.setAttribute(attrName, value);
      }
    });
};

/**
 * შაბლონური ბლოკის შიდა ელემენტების რენდერი JSON ობიექტიდან.
 */
const fillTemplate = (root, data) => {
  if (!root) return;
  populateElementFields(root, data);
  const descendants = root.querySelectorAll('*');
  descendants.forEach((node) => populateElementFields(node, data));
};

/**
 * დინამიკური სია: კონტეინერის გასუფთავება და ელემენტების ჩამატება.
 */
const renderList = (items, container, templateId, afterPopulate) => {
  if (!container || !templateId) return;
  container.innerHTML = '';

  if (!Array.isArray(items) || !items.length) {
    return;
  }

  items.forEach((item) => {
    const element = cloneTemplate(templateId);
    if (!element) return;
    fillTemplate(element, item);
    if (afterPopulate) {
      afterPopulate(element, item);
    }
    container.appendChild(element);
  });
};

const formatDisplayDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('ka-GE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
};

const applyHero = (hero) => {
  if (!hero) return;

  const headline = qs('.headline');
  if (headline && hero.headline) {
    headline.textContent = hero.headline;
  }

  const lead = qs('.lead');
  if (lead && hero.lead) {
    lead.textContent = hero.lead;
  }

  const ctas = qsa('.hero-cta a');
  if (ctas[0] && hero.primaryCta) {
    if (hero.primaryCta.label) {
      ctas[0].textContent = hero.primaryCta.label;
    }
    if (hero.primaryCta.href) {
      ctas[0].setAttribute('href', hero.primaryCta.href);
    }
  }
  if (ctas[1] && hero.secondaryCta) {
    if (hero.secondaryCta.label) {
      ctas[1].textContent = hero.secondaryCta.label;
    }
    if (hero.secondaryCta.href) {
      ctas[1].setAttribute('href', hero.secondaryCta.href);
    }
  }
};

const applyAbout = (about) => {
  if (!about) return;
  const sectionTitle = qs('#about-title');
  if (sectionTitle && about.title) {
    sectionTitle.textContent = about.title;
  }

  const container = qs('[data-dynamic-list="about"]');
  renderList(about.cards, container, 'about-card-template');
};

const applyNews = (news) => {
  if (!news) return;
  const sectionTitle = qs('#news-title');
  if (sectionTitle && news.title) {
    sectionTitle.textContent = news.title;
  }

  const track = qs('[data-dynamic-list="news"]');
  const items = Array.isArray(news.items)
    ? news.items.map((item) => ({
        ...item,
        formattedDate: formatDisplayDate(item.date),
      }))
    : [];

  renderList(items, track, 'news-card-template');
};

const applyUpcoming = (upcoming) => {
  if (!upcoming) return;
  const sectionTitle = qs('#upcoming-title');
  if (sectionTitle && upcoming.title) {
    sectionTitle.textContent = upcoming.title;
  }

  const container = qs('[data-dynamic-list="upcoming"]');
  renderList(upcoming.matches, container, 'match-card-template');
};

const applyResults = (results) => {
  if (!results) return;
  const sectionTitle = qs('#results-title');
  if (sectionTitle && results.title) {
    sectionTitle.textContent = results.title;
  }

  const tableBody = qs('[data-dynamic-list="results"]');
  renderList(results.items, tableBody, 'result-row-template', (row, item) => {
    const scoreCell = qs('[data-field="score"]', row);
    if (scoreCell) {
      scoreCell.className = 'score';
      if (item.outcome) {
        scoreCell.classList.add(item.outcome);
      }
    }
  });
};

const applyContact = (contact) => {
  if (!contact) return;

  const sectionTitle = qs('#contact-title');
  if (sectionTitle && contact.title) {
    sectionTitle.textContent = contact.title;
  }

  const infoTitle = qs('#contact-info-title');
  if (infoTitle && contact.infoTitle) {
    infoTitle.textContent = contact.infoTitle;
  }

  const list = qs('[data-dynamic-list="contact"]');
  renderList(contact.items, list, 'contact-item-template', (itemElement, item) => {
    const link = qs('a', itemElement);
    if (!link) return;

    if (!item.target) {
      link.removeAttribute('target');
    }
    if (!item.rel) {
      link.removeAttribute('rel');
    }
    if (item.ariaLabel) {
      link.setAttribute('aria-label', item.ariaLabel);
    } else {
      link.removeAttribute('aria-label');
    }
  });
};

const applyFooter = (footer) => {
  if (!footer) return;
  const footerText = qs('#footer-text');
  if (footerText && footer.text) {
    footerText.textContent = footer.text;
  }
};

const applySiteContent = (content) => {
  if (!content) return;
  applyHero(content.hero);
  applyAbout(content.about);
  applyNews(content.news);
  applyUpcoming(content.upcoming);
  applyResults(content.results);
  applyContact(content.contact);
  applyFooter(content.footer);
};

/**
 * მობილური მენიუს ტოგლი — ღილაკი გახსნა/დახურვისთვის და
 * ზომის ცვლილებისას ავტომატური დახურვა.
 */
const initMobileMenu = () => {
  const toggle = qs('.menu-toggle');
  const nav = qs('.nav');
  if (!toggle || !nav) return;

  const closeMenu = () => {
    nav.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  };

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  qsa('a', nav).forEach((link) => {
    link.addEventListener('click', () => {
      if (nav.classList.contains('is-open')) {
        closeMenu();
      }
    });
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 960) {
      closeMenu();
    }
  });
};

const initRevealAnimations = () => {
  const targets = qsa('.fade-in');
  if (!targets.length) return;

  // IntersectionObserver ამატებს "is-visible" კლასს, როცა სექცია გამოჩნდება.
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  targets.forEach((el) => observer.observe(el));
};

const initSmoothScroll = () => {
  // შიდა ლინკებზე დაკლიკებისას გვერდი რბილად იძვრება დანიშნულებამდე.
  qsa('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const targetId = link.getAttribute('href');
      if (!targetId || targetId === '#') return;
      const target = document.querySelector(targetId);
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({ behavior: 'smooth' });
    });
  });
};

const initCarousel = () => {
  // თითოეულ სიახლეების კარუსელს ვუშვებთ დამოუკიდებლად.
  qsa('.news-carousel').forEach((carousel) => {
    const track = qs('.news-track', carousel);
    const wrapper = qs('.news-wrapper', carousel);
    if (!track || !wrapper) return;
    const cards = qsa('.news-card', track);
    if (cards.length <= 1) return;

    let current = 0;
    let step = 0;
    let isSliding = false;
    let autoplayTimer;

    // ავტოპლეი ცალკე ვინახავთ, რომ სხვადასხვა ეკრანის ზომაზე გაჩერება/გააქტიურება შევძლოთ.
    const stopAutoplay = () => {
      if (autoplayTimer) {
        window.clearInterval(autoplayTimer);
        autoplayTimer = undefined;
      }
    };

    // აქტიურდება მხოლოდ მაშინ, როცა კარუსელს ნამდვილად სჭირდება სრიალი.
    const startAutoplay = () => {
      if (!isSliding || carousel.dataset.autoplay !== 'true') return;
      stopAutoplay();
      autoplayTimer = window.setInterval(goNext, 6000);
    };

    // კარტების სიგანე და gap-ი ერთად გვაძლევს გადაადგილების ნაბიჯს —
    // იგივე ლოგიკა მუშაობს პატარა ეკრანებზეც, სადაც ისრებით ერთი ბარათი ჩანს.
    const computeStep = () => {
      const styles = window.getComputedStyle(track);
      const gap = parseFloat(styles.columnGap || styles.gap || '0');
      const totalWidth = track.scrollWidth;
      const viewWidth = wrapper.clientWidth;

      // თუ ყველა ბარათი ეტევა, სტატიკურ განლაგებაზე გადავდივართ და სრიალს ვთიშავთ.
      if (totalWidth <= viewWidth + 1) {
        isSliding = false;
        step = 0;
        current = 0;
        carousel.classList.add('news-static');
        wrapper.scrollLeft = 0;
        updateTransform();
        stopAutoplay();
        return;
      }

      carousel.classList.remove('news-static');
      isSliding = true;
      const firstCard = cards[0];
      step = firstCard.getBoundingClientRect().width + gap;
      current = Math.min(current, cards.length - 1);
      wrapper.scrollLeft = 0;
      updateTransform();
      startAutoplay();
    };

    const updateTransform = () => {
      if (!isSliding) {
        track.style.transform = 'translateX(0)';
        return;
      }

      track.style.transform = `translateX(${-current * step}px)`;
    };

    // ციკლური გადაადგილება მარცხნივ/მარჯვნივ.
    const goTo = (index) => {
      if (!isSliding) return;
      current = (index + cards.length) % cards.length;
      updateTransform();
    };

    const goNext = () => goTo(current + 1);
    const goPrev = () => goTo(current - 1);

    qsa('.news-arrow', carousel).forEach((button) => {
      button.addEventListener('click', () => {
        if (button.dataset.direction === 'next') {
          goNext();
        } else {
          goPrev();
        }
      });
    });

    // resize-ისას ნაბიჯი თავიდან ითვლება, რომ კარტები არ გადაიხსნას.
    let resizeTimer;
    window.addEventListener('resize', () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(computeStep, 200);
    });

    carousel.addEventListener('mouseenter', stopAutoplay);
    carousel.addEventListener('mouseleave', startAutoplay);
    carousel.addEventListener('focusin', stopAutoplay);
    carousel.addEventListener('focusout', startAutoplay);

    // ინიციალიზაცია: დავთვალოთ ზომა და ჩავრთოთ ავტოპლეი (თუ მითითებულია).
    computeStep();
  });
};

const initContactForm = () => {
  const form = qs('#contact-form');
  const status = qs('#contact-status');
  if (!form || !status) return;

  // ელფოსტის მარტივი რეგექსი იმის გადასამოწმებლად, რომ ფორმატი სწორია.
  const validateEmail = (email) => /[^\s@]+@[^\s@]+\.[^\s@]+/.test(email);

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const name = formData.get('name')?.toString().trim();
    const email = formData.get('email')?.toString().trim();
    const message = formData.get('message')?.toString().trim();

    if (!name || !email || !message) {
      status.textContent = 'გთხოვ, შეავსო ყველა ველი.';
      status.style.color = '#f87171';
      return;
    }

    if (!validateEmail(email)) {
      status.textContent = 'ელფოსტა არ არის სწორ ფორმატში.';
      status.style.color = '#f87171';
      return;
    }

    // წარმატებული შემოწმების შემდეგ, უბრალოდ ვაჩვენებთ შეტყობინებას და ვასუფთავებთ ველებს.
    status.textContent = 'მადლობა! თქვენი შეტყობინება მიღებულია.';
    status.style.color = '#34d399';
    form.reset();
  });
};

const setCurrentYear = () => {
  const yearHolder = qs('#year');
  if (yearHolder) {
    yearHolder.textContent = new Date().getFullYear();
  }
};

/**
 * „დურუჯი“-ს შემადგენელი ტექსტები ცენტრში გადადის —
 * გარდა ჰედერის ბრენდისა, რომელიც ყოველთვის მარცხნივ უნდა დარჩეს.
 */
const centerDurujiText = () => {
  const selectors = 'h1,h2,h3,h4,h5,h6,p,div,td,th,li,figcaption';
  qsa(selectors).forEach((element) => {
    const text = element.textContent?.trim();
    if (!text) return;

    if (element.closest('.brand')) return;

    if (/დურუჯ/i.test(text) || /duruji/i.test(text)) {
      element.classList.add('is-centered-duruji');

      const balancedParent = element.closest(
        '.hero-content, .match-card, .news-card, .about-card, .contact-card, .table-wrapper, .site-footer'
      );

      if (balancedParent && !balancedParent.classList.contains('has-centered-duruji')) {
        balancedParent.classList.add('has-centered-duruji');
      }
    }
  });
};

const loadSiteContent = async () => {
  const content = await fetchSiteContent();
  applySiteContent(content);
};

const init = async () => {
  // ჯერ შიგთავსს ვთავსებთ, რათა სლაიდერები/ცხრილები უკვე განახლებულ მონაცემებზე დაყენდეს.
  await loadSiteContent();

  initMobileMenu();
  initRevealAnimations();
  initSmoothScroll();
  initCarousel();
  initContactForm();
  setCurrentYear();
  centerDurujiText();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    init();
  });
} else {
  init();
}