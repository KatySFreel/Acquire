// =========================
// App state
// =========================

import Lenis from '@studio-freight/lenis';

function initSmoothScroll() {
    const lenis = new Lenis({
        duration: 1.1, // 👈 скорость (1 = быстрее, 1.5–2 = медленнее)
        easing: (t) => 1 - Math.pow(1 - t, 3), // мягкость
        smooth: true,
        smoothTouch: false,
    });

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);
}

function preloaderAnimation() {
    const preloader = document.getElementById('preloader');
    const logo = document.querySelector('.preloader__logo');

    if (!preloader || !logo) return;

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
        if (event.animationName === 'logoReveal') {
            setTimeout(() => {
                logo.classList.add('is-hide');

                logo.addEventListener('animationend', (e) => {
                    if (e.animationName === 'logoHide') {
                        preloader.classList.add('is-loaded');

                        preloader.addEventListener('transitionend', () => {
                            preloader.remove();
                            document.body.classList.remove('is-loading');
                        }, { once: true });
                    }
                }, { once: true });
            }, visiblePause);
        }
    }, { once: true });
}

function initPageTransitions() {
    const links = document.querySelectorAll('a[href]');

    links.forEach((link) => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');

            if (!href) return;
            if (href.startsWith('#')) return;
            if (link.target === '_blank') return;
            if (link.hasAttribute('download')) return;
            if (link.hostname !== window.location.hostname) return;

            e.preventDefault();

            document.body.classList.add('is-page-leaving');

            setTimeout(() => {
                window.location.href = href;
            }, 600);
        });
    });
}

function pageEnterAnimation() {
    document.body.classList.add('is-page-entering');

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            document.body.classList.add('is-page-entering-ready');
        });
    });

    const transition = document.querySelector('.page-transition');

    if (!transition) return;

    transition.addEventListener('transitionend', (e) => {
        if (e.propertyName !== 'transform') return;

        document.body.classList.remove('is-page-entering');
        document.body.classList.remove('is-page-entering-ready');
    }, { once: true });
}

function headerSticky() {
    const offerSection = document.querySelector('.offer');
    const darkHeader = document.querySelector('.main .header--dark');

    if (!offerSection || !darkHeader) return;

    function toggleDarkHeader() {
        const offerRect = offerSection.getBoundingClientRect();
        const darkHeaderHeight = darkHeader.offsetHeight;

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

    const isTouch = window.matchMedia('(hover: none)').matches;

    if (isTouch) {
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
}

function initCustomCursor(targetSelector) {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

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

function animateCounter(element, duration = 1800) {
    const endValue = parseInt(element.dataset.value, 10);
    const prefix = element.dataset.prefix || '';
    const suffix = element.dataset.suffix || '';

    let startValue = 0;
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
        threshold: 0.35
    });

    observer.observe(section);
}

function worksCards() {
    const cards = document.querySelectorAll('.works-card');

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
    const cards = document.querySelectorAll('.works-card');

    if (!cards.length) return;

    const mediaQuery = window.matchMedia('(min-width: 1025px)');
    let rafId = null;
    let isRunning = false;

    const items = [...cards].map((card) => {
        const parallax = card.querySelector('.works-card__parallax');

        return {
            card,
            parallax,
            currentY: 0,
            targetY: 0,
        };
    }).filter(item => item.parallax);

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

            // было 36 — это заметно. Делаем гораздо мягче
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

function sloganWordsRotate() {
    const wrapper = document.querySelector('.contact-cta__words-inner');
    if (!wrapper) return;

    const words = wrapper.querySelectorAll('.contact-cta__word');
    if (!words.length) return;

    let currentIndex = 0;
    let wordHeight = words[0].getBoundingClientRect().height;
    let intervalId = null;

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

    let resizeTimeout = null;

    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);

        resizeTimeout = setTimeout(() => {
            updateSizes();
        }, 100);
    });
}

function initFloatingLabels() {
    const fields = document.querySelectorAll('.contact-form__field');

    fields.forEach((field) => {
        const input = field.querySelector('input, textarea');

        if (!input) return;

        const toggleFilled = () => {
            if (input.value.trim() !== '') {
                field.classList.add('is-filled');
            } else {
                field.classList.remove('is-filled');
            }
        };

        toggleFilled();
        input.addEventListener('input', toggleFilled);
        input.addEventListener('blur', toggleFilled);
    });
}

// =========================
// App init
// =========================
function initApp() {
    const alreadyShown = sessionStorage.getItem('preloader-shown');

    preloaderAnimation();
    initPageTransitions();

    if (alreadyShown) {
        pageEnterAnimation();
    }

    initSmoothScroll();

    headerDropdown();
    headerSticky();
    initCustomCursor('.offer__wrapper');
    initCustomCursor('.quote-block');
    initNumbersAnimation();
    worksCards();
    worksParallax();
    sloganWordsRotate();
    initFloatingLabels();
}

document.addEventListener('DOMContentLoaded', initApp);