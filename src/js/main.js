import Lenis from '@studio-freight/lenis';
import Swiper from 'swiper';
import { Navigation } from 'swiper/modules';

// =========================
// App state
// =========================
const App = {
    lenis: null,
    navLenis: null,
    pageLeaveTimeout: null,
};

// =========================
// Helpers
// =========================
function isFinePointer() {
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

function isTouchDevice() {
    return window.matchMedia('(hover: none)').matches;
}

function isInternalLink(link) {
    if (!link) return false;
    if (!link.href) return false;
    if (link.target === '_blank') return false;
    if (link.hasAttribute('download')) return false;
    if (link.hasAttribute('data-no-transition')) return false;

    const href = link.getAttribute('href');
    if (!href || href.startsWith('#')) return false;
    if (href.startsWith('mailto:') || href.startsWith('tel:')) return false;

    return link.hostname === window.location.hostname;
}

// =========================
// Smooth scroll / Lenis
// =========================
function initLenis() {
    const lenis = new Lenis({
        duration: 1.2,
        smoothWheel: true,
        smoothTouch: false,
        easing: (t) => 1 - Math.pow(1 - t, 3),
    });

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    App.lenis = lenis;
    return lenis;
}

function initAnchorScroll(lenis) {
    if (!lenis) return;

    const anchors = document.querySelectorAll('a[href^="#"]:not(.legal-post__nav-link)');

    anchors.forEach((anchor) => {
        anchor.addEventListener('click', (e) => {
            const href = anchor.getAttribute('href');

            if (!href || href === '#') return;

            const target = document.querySelector(href);
            if (!target) return;

            e.preventDefault();

            lenis.scrollTo(target, {
                duration: 1.1,
            });
        });
    });

    if (window.location.hash) {
        const target = document.querySelector(window.location.hash);

        if (target) {
            requestAnimationFrame(() => {
                lenis.scrollTo(target, {
                    duration: 1.1,
                });
            });
        }
    }
}

function lockScroll() {
    document.body.classList.add('no-scroll');

    if (App.lenis) {
        App.lenis.stop();
    }
}

function unlockScroll() {
    document.body.classList.remove('no-scroll');

    if (App.lenis) {
        App.lenis.start();
    }
}

// =========================
// Preloader / page transitions
// =========================
function preloaderAnimation() {
    const preloader = document.getElementById('preloader');
    const logo = document.querySelector('.preloader__logo');

    if (!preloader || !logo) {
        document.body.classList.remove('is-loading');
        return;
    }

    const visiblePause = 900;
    const alreadyShown = sessionStorage.getItem('preloader-shown');

    if (alreadyShown) {
        preloader.remove();
        document.body.classList.remove('is-loading');
        return;
    }

    sessionStorage.setItem('preloader-shown', 'true');
    document.body.classList.add('is-loading');

    logo.addEventListener('animationend', (event) => {
        if (event.animationName !== 'logoReveal') return;

        setTimeout(() => {
            logo.classList.add('is-hide');

            logo.addEventListener('animationend', (e) => {
                if (e.animationName !== 'logoHide') return;

                preloader.classList.add('is-loaded');

                preloader.addEventListener('transitionend', () => {
                    preloader.remove();
                    document.body.classList.remove('is-loading');
                }, { once: true });
            }, { once: true });
        }, visiblePause);
    }, { once: true });
}

function pageEnterAnimation() {
    const transition = document.querySelector('.page-transition');

    document.body.classList.remove('is-page-leaving');
    document.body.classList.remove('is-page-entering-ready');
    document.body.classList.add('is-page-entering');

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            document.body.classList.add('is-page-entering-ready');
        });
    });

    if (!transition) return;

    transition.addEventListener('transitionend', (e) => {
        if (e.propertyName !== 'transform') return;

        document.body.classList.remove('is-page-entering');
        document.body.classList.remove('is-page-entering-ready');
    }, { once: true });
}

function initPageTransitions() {
    const links = document.querySelectorAll('a[href]');

    links.forEach((link) => {
        link.addEventListener('click', (e) => {
            if (!isInternalLink(link)) return;

            const href = link.getAttribute('href');
            if (!href) return;

            e.preventDefault();

            document.body.classList.add('is-page-leaving');

            clearTimeout(App.pageLeaveTimeout);
            App.pageLeaveTimeout = setTimeout(() => {
                window.location.href = href;
            }, 600);
        });
    });
}

function initPageShowHandler() {
    window.addEventListener('pageshow', (event) => {
        const preloader = document.getElementById('preloader');

        if (sessionStorage.getItem('preloader-shown') && preloader) {
            preloader.remove();
        }

        document.body.classList.remove('is-loading');
        document.body.classList.remove('is-page-leaving');

        if (event.persisted) {
            document.body.classList.remove('is-page-entering');
            document.body.classList.remove('is-page-entering-ready');
            pageEnterAnimation();
        }
    });
}

// =========================
// Header
// =========================
function headerSticky() {
    const offerSection = document.querySelector('.sticky-section');
    const darkHeader = document.querySelector('.main .header--dark');

    if (!offerSection || !darkHeader) return;

    function toggleDarkHeader() {
        const offerRect = offerSection.getBoundingClientRect();
        const shouldShow = offerRect.bottom <= 0;

        darkHeader.classList.toggle('is-visible', shouldShow);
    }

    window.addEventListener('scroll', toggleDarkHeader, { passive: true });
    window.addEventListener('resize', toggleDarkHeader);
    window.addEventListener('load', toggleDarkHeader);

    toggleDarkHeader();
}

function headerDropdown() {
    const dropdownItem = document.querySelector('.nav__item--has-dropdown');
    const toggle = document.querySelector('.nav__toggle');

    if (!dropdownItem || !toggle) return;
    if (!isTouchDevice()) return;

    toggle.addEventListener('click', (e) => {
        e.preventDefault();

        const isOpen = dropdownItem.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', (e) => {
        if (!dropdownItem.contains(e.target)) {
            dropdownItem.classList.remove('is-open');
            toggle.setAttribute('aria-expanded', 'false');
        }
    });
}

// =========================
// Custom cursor
// =========================
function initCustomCursor(targetSelector) {
    if (!isFinePointer()) return;

    const targets = document.querySelectorAll(targetSelector);
    if (!targets.length) return;

    targets.forEach((target) => {
        const cursor = target.querySelector('.custom-cursor');
        if (!cursor) return;

        target.addEventListener('mouseenter', () => {
            cursor.style.opacity = '1';
        });

        target.addEventListener('mouseleave', () => {
            cursor.style.opacity = '0';
        });

        target.addEventListener('mousemove', (e) => {
            const rect = target.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            cursor.style.left = `${x}px`;
            cursor.style.top = `${y}px`;
        });
    });
}

// =========================
// Numbers animation
// =========================
function animateCounter(element, duration = 1800) {
    const endValue = parseInt(element.dataset.value, 10);
    const prefix = element.dataset.prefix || '';
    const suffix = element.dataset.suffix || '';

    const startValue = 0;
    const startTime = performance.now();

    function updateCounter(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.floor(startValue + (endValue - startValue) * easedProgress);

        element.textContent = `${prefix}${currentValue}${suffix}`;

        if (progress < 1) {
            requestAnimationFrame(updateCounter);
        } else {
            element.textContent = `${prefix}${endValue}${suffix}`;
        }
    }

    requestAnimationFrame(updateCounter);
}

function initNumbersAnimation() {
    const section = document.querySelector('.numbers');
    const counters = document.querySelectorAll('.js-counter');

    if (!section || !counters.length) return;

    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            counters.forEach((counter) => {
                if (!counter.classList.contains('is-animated')) {
                    counter.classList.add('is-animated');
                    animateCounter(counter);
                }
            });

            obs.unobserve(entry.target);
        });
    }, {
        threshold: 0.35,
    });

    observer.observe(section);
}

// =========================
// Works cards
// =========================
function worksCards() {
    const cards = document.querySelectorAll('.js-animation-card');
    if (!cards.length) return;

    const isDesktop = window.matchMedia('(min-width: 1025px)').matches;
    if (!isDesktop) return;

    cards.forEach((card) => {
        const video = card.querySelector('.works-card__video');

        card.addEventListener('mouseenter', () => {
            cards.forEach((item) => {
                item.classList.remove('is-active');

                const itemVideo = item.querySelector('.works-card__video');
                if (itemVideo) {
                    itemVideo.pause();
                    itemVideo.currentTime = 0;
                }
            });

            card.classList.add('is-active');

            if (video) {
                video.play().catch(() => {});
            }
        });

        card.addEventListener('mouseleave', () => {
            if (video) {
                video.pause();
                video.currentTime = 0;
            }

            card.classList.remove('is-active');
        });
    });

    const grid = document.querySelector('.js-works-grid');
    if (!grid) return;

    grid.addEventListener('mouseleave', () => {
        cards.forEach((item) => {
            item.classList.remove('is-active');

            const itemVideo = item.querySelector('.works-card__video');
            if (itemVideo) {
                itemVideo.pause();
                itemVideo.currentTime = 0;
            }
        });
    });
}

function worksParallax() {
    const cards = document.querySelectorAll('.js-animation-card');
    if (!cards.length) return;

    const mediaQuery = window.matchMedia('(min-width: 1025px)');
    let rafId = null;
    let isRunning = false;

    const items = [...cards].map((card) => {
        const parallax = card.querySelector('.js-animation-card__parallax');

        return {
            card,
            parallax,
            currentY: 0,
            targetY: 0,
        };
    }).filter((item) => item.parallax);

    if (!items.length) return;

    const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

    const updateTargets = () => {
        if (!mediaQuery.matches) {
            items.forEach((item) => {
                item.targetY = 0;
                item.currentY = 0;
                item.parallax.style.transform = 'translate3d(0, 0, 0)';
            });
            return;
        }

        const windowHeight = window.innerHeight;

        items.forEach((item) => {
            const rect = item.card.getBoundingClientRect();
            const progress = (rect.top + rect.height) / (windowHeight + rect.height);
            const centered = 0.5 - progress;

            item.targetY = clamp(centered * 38, -9, 9);
        });
    };

    const animate = () => {
        let shouldContinue = false;

        items.forEach((item) => {
            item.currentY += (item.targetY - item.currentY) * 0.08;

            if (Math.abs(item.targetY - item.currentY) > 0.02) {
                shouldContinue = true;
            }

            item.parallax.style.transform = `translate3d(0, ${item.currentY.toFixed(3)}px, 0)`;
        });

        if (shouldContinue) {
            rafId = requestAnimationFrame(animate);
        } else {
            rafId = null;
            isRunning = false;
        }
    };

    const requestTick = () => {
        updateTargets();

        if (!isRunning) {
            isRunning = true;
            rafId = requestAnimationFrame(animate);
        }
    };

    requestTick();

    window.addEventListener('scroll', requestTick, { passive: true });
    window.addEventListener('resize', requestTick);
    mediaQuery.addEventListener('change', requestTick);
}

// =========================
// Contact CTA words
// =========================
function sloganWordsRotate() {
    const wrapper = document.querySelector('.contact-cta__words-inner');
    if (!wrapper) return;

    const words = wrapper.querySelectorAll('.contact-cta__word');
    if (!words.length) return;

    let currentIndex = 0;
    let wordHeight = words[0].getBoundingClientRect().height;
    let intervalId = null;
    let resizeTimeout = null;

    const updatePosition = () => {
        wrapper.style.transform = `translateY(-${currentIndex * wordHeight}px)`;
    };

    const updateSizes = () => {
        wordHeight = words[0].getBoundingClientRect().height;
        updatePosition();
    };

    const startRotation = () => {
        if (intervalId) clearInterval(intervalId);

        intervalId = setInterval(() => {
            currentIndex = (currentIndex + 1) % words.length;
            updatePosition();
        }, 2200);
    };

    updateSizes();
    startRotation();

    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);

        resizeTimeout = setTimeout(() => {
            updateSizes();
        }, 100);
    });
}

// =========================
// Floating labels
// =========================
function initFloatingLabels() {
    const fields = document.querySelectorAll('.contact-form__field');
    if (!fields.length) return;

    fields.forEach((field) => {
        const input = field.querySelector('input, textarea');
        if (!input) return;

        const toggleFilled = () => {
            field.classList.toggle('is-filled', input.value.trim() !== '');
        };

        toggleFilled();
        input.addEventListener('input', toggleFilled);
        input.addEventListener('blur', toggleFilled);
    });
}

function initFaqSchema() {
    const schemaNode = document.querySelector('.js-faq-schema');
    const faqItems = document.querySelectorAll('.service-faq__item');

    if (!schemaNode || !faqItems.length) return;

    const entities = [...faqItems].map((item) => {
        const question = item.querySelector('.service-faq__question');
        const answer = item.querySelector('[itemprop="text"]');

        const questionText = question ? question.textContent.trim() : '';
        const answerText = answer ? answer.textContent.replace(/\s+/g, ' ').trim() : '';

        if (!questionText || !answerText) return null;

        return {
            '@type': 'Question',
            name: questionText,
            acceptedAnswer: {
                '@type': 'Answer',
                text: answerText,
            },
        };
    }).filter(Boolean);

    if (!entities.length) return;

    schemaNode.textContent = JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: entities,
    });
}

function initFaqAccordion() {
    const items = document.querySelectorAll('.service-faq__item');
    if (!items.length) return;

    items.forEach((item) => {
        const summary = item.querySelector('.service-faq__question');
        const content = item.querySelector('.service-faq__answer');

        if (!summary || !content) return;

        if (item.hasAttribute('open')) {
            content.style.height = `${content.scrollHeight}px`;
        } else {
            content.style.height = '0px';
        }

        summary.addEventListener('click', (e) => {
            e.preventDefault();

            const isOpen = item.hasAttribute('open');

            if (isOpen) {
                closeItem(item, content);
            } else {
                openItem(item, content);
            }
        });

        content.addEventListener('transitionend', (e) => {
            if (e.propertyName !== 'height') return;

            if (item.hasAttribute('open')) {
                content.style.height = 'auto';
            }
        });
    });

    function openItem(item, content) {
        item.setAttribute('open', '');

        content.style.height = '0px';

        requestAnimationFrame(() => {
            content.style.height = `${content.scrollHeight}px`;
        });
    }

    function closeItem(item, content) {
        content.style.height = `${content.scrollHeight}px`;

        requestAnimationFrame(() => {
            content.style.height = '0px';
        });

        content.addEventListener('transitionend', function handler(e) {
            if (e.propertyName !== 'height') return;

            item.removeAttribute('open');
            content.removeEventListener('transitionend', handler);
        });
    }
}

function initServiceSlider() {
    const sliderService = document.querySelector('.js-service-slider');
    if (!sliderService) return;

    new Swiper(sliderService, {
        modules: [Navigation],
        speed: 700,
        slidesPerView: 1.08,
        spaceBetween: 20,
        navigation: {
            nextEl: '.sub-services__nav--next',
            prevEl: '.sub-services__nav--prev',
        },
        breakpoints: {
            391: {
                slidesPerView: 1.02,
                spaceBetween: 16,
            },
            769: {
                slidesPerView: 1.5,
                spaceBetween: 20,
            },
            1025: {
                slidesPerView: 2.8,
                spaceBetween: 40,
            },
        },
    });
}

function initArticlePopularSlider() {
    const sliderPopularOffer = document.querySelector('.js-article-popular-slider');
    if (!sliderPopularOffer) return;

    new Swiper(sliderPopularOffer, {
        modules: [Navigation],
        speed: 700,
        slidesPerView: 1.08,
        spaceBetween: 20,
        navigation: {
            nextEl: '.sub-services__nav--next',
            prevEl: '.sub-services__nav--prev',
        },
        breakpoints: {
            391: {
                slidesPerView: 1.02,
                spaceBetween: 16,
            },
            769: {
                slidesPerView: 1.5,
                spaceBetween: 20,
            },
            1025: {
                slidesPerView: 2,
                spaceBetween: 40,
            },
        },
    });
}

function initTeamSlider() {
    const sliderPopularOffer = document.querySelector('.js-about-us-slider');
    if (!sliderPopularOffer) return;

    new Swiper(sliderPopularOffer, {
        modules: [Navigation],
        speed: 700,
        slidesPerView: 1.08,
        spaceBetween: 20,
        navigation: {
            nextEl: '.sub-services__nav--next',
            prevEl: '.sub-services__nav--prev',
        },
        breakpoints: {
            391: {
                slidesPerView: 1.8,
                spaceBetween: 16,
            },
            769: {
                slidesPerView: 2.8,
                spaceBetween: 20,
            },
            1025: {
                slidesPerView: 3.85,
                spaceBetween: 40,
            },
        },
    });
}

function initLegalPostNav(lenis) {
    const post = document.querySelector('.legal-post');
    if (!post) return;

    const aside = post.querySelector('.legal-post__aside');
    const toggle = post.querySelector('.legal-post__nav-toggle');
    const links = post.querySelectorAll('.legal-post__nav-link');
    const sections = post.querySelectorAll('.legal-post__section');

    if (!links.length || !sections.length) return;

    const map = new Map();
    const mobileMedia = window.matchMedia('(max-width: 767px)');

    const closeMobileNav = () => {
        if (!mobileMedia.matches || !aside || !toggle) return;

        aside.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
    };

    links.forEach((link) => {
        const id = link.getAttribute('href');
        if (!id) return;

        map.set(id.replace('#', ''), link);

        link.addEventListener('click', (e) => {
            const target = document.querySelector(id);
            if (!target) return;

            e.preventDefault();

            const runScroll = () => {
                const offset = mobileMedia.matches ? -90 : -60;

                if (lenis) {
                    lenis.scrollTo(target, {
                        offset,
                        duration: 1.1,
                    });
                } else {
                    const top = target.getBoundingClientRect().top + window.scrollY + offset;

                    window.scrollTo({
                        top,
                        behavior: 'smooth',
                    });
                }
            };

            if (mobileMedia.matches) {
                closeMobileNav();

                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        runScroll();
                    });
                });
            } else {
                runScroll();
            }
        });
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;

            links.forEach((link) => {
                link.classList.remove('is-active');
            });

            const activeLink = map.get(entry.target.id);

            if (activeLink) {
                activeLink.classList.add('is-active');
            }
        });
    }, {
        rootMargin: '-15% 0px -45% 0px',
        threshold: 0.01,
    });

    sections.forEach((section) => {
        observer.observe(section);
    });
}

function initLegalPostMobileNav() {
    const post = document.querySelector('.legal-post');
    if (!post) return;

    const aside = post.querySelector('.legal-post__aside');
    const toggle = post.querySelector('.legal-post__nav-toggle');
    const links = post.querySelectorAll('.legal-post__nav-link');

    if (!aside || !toggle || !links.length) return;

    const mobileMedia = window.matchMedia('(max-width: 767px)');
    let lastScrollY = window.scrollY;
    let isAnchorScrolling = false;
    let anchorScrollTimer = null;

    const closeNav = (hideOnClose = false) => {
        if (!mobileMedia.matches) return;

        aside.classList.remove('is-open');

        if (hideOnClose) {
            aside.classList.add('is-hidden-on-scroll');
        }

        toggle.setAttribute('aria-expanded', 'false');

        destroyNavLenis();
        unlockScroll();
    };

    const openNav = () => {
        if (!mobileMedia.matches) return;

        aside.classList.add('is-open');
        aside.classList.remove('is-hidden-on-scroll');
        toggle.setAttribute('aria-expanded', 'true');

        lockScroll();

        setTimeout(() => {
            createNavLenis();
        }, 50);
    };

    const toggleNav = () => {
        if (!mobileMedia.matches) {
            aside.classList.remove('is-open');
            aside.classList.remove('is-hidden-on-scroll');
            toggle.setAttribute('aria-expanded', 'false');
            destroyNavLenis();
            unlockScroll();
            return;
        }

        const isOpen = aside.classList.contains('is-open');

        if (isOpen) {
            closeNav();
        } else {
            openNav();
        }
    };

    const startAnchorScrollState = () => {
        isAnchorScrolling = true;

        clearTimeout(anchorScrollTimer);
        anchorScrollTimer = setTimeout(() => {
            isAnchorScrolling = false;
            lastScrollY = window.scrollY;
        }, 1200);
    };

    const handleScrollVisibility = () => {
        if (!mobileMedia.matches) {
            aside.classList.remove('is-hidden-on-scroll');
            return;
        }

        if (aside.classList.contains('is-open')) {
            aside.classList.remove('is-hidden-on-scroll');
            return;
        }

        if (isAnchorScrolling) {
            return;
        }

        const currentScrollY = window.scrollY;
        const diff = currentScrollY - lastScrollY;

        if (Math.abs(diff) < 8) return;

        if (diff > 0 && currentScrollY > 310) {
            aside.classList.add('is-hidden-on-scroll');
        } else if (diff < 0) {
            aside.classList.remove('is-hidden-on-scroll');
        }

        lastScrollY = currentScrollY;
    };

    const handleBreakpointChange = () => {
        if (!mobileMedia.matches) {
            aside.classList.remove('is-open');
            aside.classList.remove('is-hidden-on-scroll');
            toggle.setAttribute('aria-expanded', 'false');

            isAnchorScrolling = false;
            clearTimeout(anchorScrollTimer);

            destroyNavLenis();
            unlockScroll();

            lastScrollY = window.scrollY;
        }
    };

    toggle.addEventListener('click', toggleNav);

    links.forEach((link) => {
        link.addEventListener('click', () => {
            closeNav(true);
            startAnchorScrollState();
        });
    });

    window.addEventListener('scroll', handleScrollVisibility, { passive: true });

    if (mobileMedia.addEventListener) {
        mobileMedia.addEventListener('change', handleBreakpointChange);
    } else {
        mobileMedia.addListener(handleBreakpointChange);
    }

    handleBreakpointChange();
}

function createNavLenis() {
    const navList = document.querySelector('.legal-post__nav-list');
    if (!navList) return;

    if (App.navLenis) {
        App.navLenis.destroy();
        App.navLenis = null;
    }

    App.navLenis = new Lenis({
        wrapper: navList,
        content: navList,
        duration: 1,
        smoothWheel: true,
        smoothTouch: false,
        easing: (t) => 1 - Math.pow(1 - t, 3),
    });

    const rafNav = (time) => {
        if (!App.navLenis) return;
        App.navLenis.raf(time);

        if (App.navLenis) {
            requestAnimationFrame(rafNav);
        }
    };

    requestAnimationFrame(rafNav);
}

function destroyNavLenis() {
    if (App.navLenis) {
        App.navLenis.destroy();
        App.navLenis = null;
    }
}

// =========================
// App init
// =========================
function initApp() {
    const alreadyShown = sessionStorage.getItem('preloader-shown');

    preloaderAnimation();
    initPageTransitions();
    initPageShowHandler();

    if (alreadyShown) {
        pageEnterAnimation();
    }

    const lenis = initLenis();
    initAnchorScroll(lenis);

    headerDropdown();
    headerSticky();
    initCustomCursor('.sticky-section');
    initCustomCursor('.quote-block');
    initNumbersAnimation();
    worksCards();
    worksParallax();
    sloganWordsRotate();
    initFloatingLabels();
    initFaqSchema();
    initFaqAccordion();
    initServiceSlider();
    initArticlePopularSlider();
    initLegalPostNav(lenis);
    initLegalPostMobileNav();
    initTeamSlider();
}

document.addEventListener('DOMContentLoaded', initApp);
