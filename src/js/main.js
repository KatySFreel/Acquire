// =========================
// App state
// =========================
let lenis = null;

// iOS/touch scroll lock helper
let unlockTouchScroll = null;

// =========================
// Lenis
// =========================
function initLenis() {
    const instance = new Lenis({
        duration: 1.2,
        easing: (t) => 1 - Math.pow(1 - t, 3),
        smooth: true,
        direction: 'vertical',
        smoothTouch: false,
        touchMultiplier: 1,
    });

    function raf(time) {
        instance.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return instance;
}

// =========================
// Scroll lock (Lenis-friendly)
// =========================
function lockPageScroll() {
    document.documentElement.classList.add('is-lock');
    document.body.classList.add('is-lock');

    // iOS: блокируем touchmove
    const prevent = (e) => e.preventDefault();
    window.addEventListener('touchmove', prevent, { passive: false });

    unlockTouchScroll = () => {
        window.removeEventListener('touchmove', prevent);
        unlockTouchScroll = null;
    };
}

function unlockPageScroll() {
    document.documentElement.classList.remove('is-lock');
    document.body.classList.remove('is-lock');
    if (typeof unlockTouchScroll === 'function') unlockTouchScroll();
}

// =========================
// Benefits progress
// =========================
function initBenefitsProgress(lenisInstance) {
    const section = document.querySelector('.benefits');
    const line = document.querySelector('.benefits__line-progress');
    if (!section || !line || !lenisInstance) return;

    lenisInstance.on('scroll', () => {
        const rect = section.getBoundingClientRect();
        const windowHeight = window.innerHeight;

        const start = windowHeight * 0.2;
        const end = windowHeight;

        let progress = (start - rect.top) / (rect.height - (end - start));
        progress = Math.min(Math.max(progress, 0), 1);

        line.style.height = `${progress * 100}%`;
    });
}

function initLineProgress(lenisInstance) {
    if (!lenisInstance) return;

    const lines = Array.from(document.querySelectorAll('.line'))
        .map((wrap) => ({
            wrap,
            bar: wrap.querySelector('.line__progress'),
        }))
        .filter((x) => x.bar);

    if (!lines.length) return;

    const clamp01 = (v) => Math.min(Math.max(v, 0), 1);
    let rafId = null;

    const update = () => {
        rafId = null;

        const windowHeight = window.innerHeight;
        const start = windowHeight * 0.3;
        const end = windowHeight; // можно 0.9*windowHeight, если нужно быстрее

        for (const { wrap, bar } of lines) {
            const rect = wrap.getBoundingClientRect();

            // та же формула, что у benefits
            let progress = (rect.top - start) / (rect.height - (end - start));
            progress = clamp01(progress);

            bar.style.height = `${progress * 100}%`;
        }
    };

    update();

    lenisInstance.on('scroll', () => {
        if (rafId) return;
        rafId = requestAnimationFrame(update);
    });

    window.addEventListener('resize', update);
}

function initCtaForm() {
    const form = document.querySelector('.cta__form');
    if (!form) return;

    const statusEl = form.querySelector('.cta__status');
    const hintEl = form.querySelector('.cta__hint');
    const submitBtn = form.querySelector('.cta__submit');
    const COOLDOWN_MS = 30_000;

    const setStatus = (type, text) => {
        if (!statusEl) return;
        statusEl.classList.remove('is-success', 'is-error', 'is-loading');
        if (type) statusEl.classList.add(type);
        statusEl.textContent = text || '';
    };

    const setCooldown = (msLeft) => {
        submitBtn.disabled = true;
        form.classList.add('is-disabled');

        const tick = () => {
            const left = Math.max(0, msLeft);
            const sec = Math.ceil(left / 1000);

            submitBtn.textContent = sec > 0 ? `Отправить через ${sec} сек` : 'Отправить';

            if (left <= 0) {
                submitBtn.disabled = false;
                form.classList.remove('is-disabled');
                submitBtn.textContent = 'Отправить';
                return;
            }
            msLeft -= 250;
            requestAnimationFrame(tick);
        };
        tick();
    };

    const validate = () => {
        const name = form.elements.name?.value?.trim() || '';
        const email = form.elements.email?.value?.trim() || '';
        const service = form.elements.service?.value?.trim() || '';
        const message = form.elements.message?.value?.trim() || '';

        if (name.length < 2) return 'Введите имя (минимум 2 символа).';
        if (!email) return 'Укажите email.';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Проверьте email.';
        if (service.length < 2) return 'Укажите услугу (минимум 2 символа).';

        // сообщение НЕ обязательное, но если заполнено — можно минимально проверить
        if (message && message.length < 10) return 'Если заполняете сообщение — минимум 10 символов.';
        return null;
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // если уже на кулдауне
        if (submitBtn.disabled) return;

        const err = validate();
        if (err) {
            setStatus('is-error', err);
            return;
        }

        setStatus('is-loading', 'Отправляем…');
        submitBtn.disabled = true;

        try {
            const action = form.getAttribute('action') || '/contact.php';
            const fd = new FormData(form);

            const res = await fetch(action, {
                method: 'POST',
                body: fd,
                headers: { 'Accept': 'application/json' },
            });

            const data = await res.json().catch(() => null);

            if (res.ok && data?.ok) {
                setStatus('is-success', data.message || 'Заявка отправлена.');
                if (hintEl) hintEl.style.display = 'none';
                form.reset();
                // блок повторной отправки на 30 сек
                setCooldown(COOLDOWN_MS);
            } else {
                const msg = data?.message || 'Не удалось отправить. Проверьте поля и попробуйте ещё раз.';
                setStatus('is-error', msg);

                // если 429 — тоже уходим на кулдаун
                if (res.status === 429) {
                    setCooldown(COOLDOWN_MS);
                    return; // чтобы не включить кнопку обратно ниже
                }
                submitBtn.disabled = false;
                submitBtn.textContent = 'Отправить';
            }
        } catch (error) {
            setStatus('is-error', 'Ошибка сети. Попробуйте ещё раз.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Отправить';
        }
    });
}

// =========================
// Smooth anchor scroll (Lenis)
// =========================
function initAnchorScroll(lenisInstance, { onBeforeScroll } = {}) {
    if (!lenisInstance) return;

    document.body.addEventListener('click', function(e) {
        let link = e.target;
        while (link && link.tagName !== 'A') {
            link = link.parentElement;
        }

        if (!link) return;

        const href = link.getAttribute('href');
        if (!href) return;

        let hash;

        // Обрабатываем оба формата: "/#portfolio" и "#portfolio"
        if (href.startsWith('/#')) {
            // Проверяем что мы на главной странице
            if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
                hash = href.substring(1); // Убираем "/" оставляем "#portfolio"
                e.preventDefault(); // Предотвращаем переход
            } else {
                // На другой странице - пусть браузер перейдет на главную
                return;
            }
        } else if (href.startsWith('#')) {
            hash = href; // Уже "#portfolio"
            e.preventDefault();
        } else {
            return; // Не якорная ссылка
        }

        if (hash === '#') return;

        const target = document.querySelector(hash);
        if (!target) return;

        if (onBeforeScroll) onBeforeScroll();

        lenisInstance.scrollTo(target, {
            offset: -100,
            duration: 1.2,
        });
    });
}

// =========================
// Lottie
// =========================
function initLottie() {
    if (!window.lottie) return;

    document.querySelectorAll('.js-lottie').forEach((el) => {
        if (!el.dataset.lottie) return;

        window.lottie.loadAnimation({
            container: el,
            renderer: 'svg',
            loop: true,
            autoplay: true,
            path: el.dataset.lottie,
        });
    });
}

// =========================
// Tilt
// =========================
function initTilt() {
    if (!window.VanillaTilt) return;

    document.querySelectorAll('.service__item').forEach((card) => {
        window.VanillaTilt.init(card, {
            max: 5,
            speed: 400,
            glare: true,
            'max-glare': 0.2,
            perspective: 1000,
            transition: true,
            easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
            gyroscope: true,
        });
    });
}

// =========================
// Cards entrance animation
// =========================
function initCardsEntrance() {
    const cards = document.querySelectorAll('.service__item');
    if (!cards.length) return;

    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';

        setTimeout(() => {
            card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

// =========================
// Header mobile menu (Lenis-aware)
// =========================
function initHeaderMobileMenu({ lenisInstance } = {}) {
    // Получаем ОБЕ шапки
    const headerAbsolute = document.querySelector('.header--absolute .header-container');
    const headerFixed = document.querySelector('.header--fixed .header-container');

    // Бургеры и мобильные меню из обеих шапок
    const burgerAbsolute = document.querySelector('.header--absolute .header__burger');
    const burgerFixed = document.querySelector('.header--fixed .header__burger');
    const mobileAbsolute = document.querySelector('.header--absolute .header__mobile');
    const mobileFixed = document.querySelector('.header--fixed .header__mobile');

    // Проверяем наличие хотя бы одной шапки
    if ((!headerAbsolute && !headerFixed) || (!burgerAbsolute && !burgerFixed)) {
        return { close: () => {} };
    }

    const burgerIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36" fill="none">
      <path d="M4.5 9.0015H31.5M4.5 18.0015H31.5M4.5 27.0015H31.5"
            stroke="#F0EFEB" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;

    const closeIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36" fill="none">
      <path d="M8 8L28 28M8 28L28 8"
            stroke="#F0EFEB" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;

    const OPEN_CLASS = 'is-open';

    const open = () => {
        // Открываем обе шапки
        if (headerAbsolute) headerAbsolute.classList.add(OPEN_CLASS);
        if (headerFixed) headerFixed.classList.add(OPEN_CLASS);

        if (burgerAbsolute) {
            burgerAbsolute.setAttribute('aria-expanded', 'true');
            burgerAbsolute.innerHTML = closeIcon;
        }
        if (burgerFixed) {
            burgerFixed.setAttribute('aria-expanded', 'true');
            burgerFixed.innerHTML = closeIcon;
        }

        if (mobileAbsolute) mobileAbsolute.setAttribute('aria-hidden', 'false');
        if (mobileFixed) mobileFixed.setAttribute('aria-hidden', 'false');

        // Lenis stop + lock scroll
        if (lenisInstance) lenisInstance.stop();
        lockPageScroll();
    };

    const close = () => {
        // Закрываем обе шапки
        if (headerAbsolute) headerAbsolute.classList.remove(OPEN_CLASS);
        if (headerFixed) headerFixed.classList.remove(OPEN_CLASS);

        if (burgerAbsolute) {
            burgerAbsolute.setAttribute('aria-expanded', 'false');
            burgerAbsolute.innerHTML = burgerIcon;
        }
        if (burgerFixed) {
            burgerFixed.setAttribute('aria-expanded', 'false');
            burgerFixed.innerHTML = burgerIcon;
        }

        if (mobileAbsolute) mobileAbsolute.setAttribute('aria-hidden', 'true');
        if (mobileFixed) mobileFixed.setAttribute('aria-hidden', 'true');

        unlockPageScroll();
        if (lenisInstance) lenisInstance.start();
    };

    const toggle = () => {
        // Проверяем состояние любой из шапок
        const isOpen = headerAbsolute?.classList.contains(OPEN_CLASS) ||
            headerFixed?.classList.contains(OPEN_CLASS);
        isOpen ? close() : open();
    };

    // Стартовое состояние для обеих шапок
    if (burgerAbsolute) {
        burgerAbsolute.innerHTML = burgerIcon;
        burgerAbsolute.setAttribute('aria-expanded', 'false');
    }
    if (burgerFixed) {
        burgerFixed.innerHTML = burgerIcon;
        burgerFixed.setAttribute('aria-expanded', 'false');
    }
    if (mobileAbsolute) mobileAbsolute.setAttribute('aria-hidden', 'true');
    if (mobileFixed) mobileFixed.setAttribute('aria-hidden', 'true');

    // События для обоих бургеров
    if (burgerAbsolute) burgerAbsolute.addEventListener('click', toggle);
    if (burgerFixed) burgerFixed.addEventListener('click', toggle);

    // Закрыть по клику на ссылку в меню (в обеих шапках)
    if (mobileAbsolute) {
        mobileAbsolute.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', () => close());
        });
    }
    if (mobileFixed) {
        mobileFixed.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', () => close());
        });
    }

    // ESC
    document.addEventListener('keydown', (e) => {
        const isOpen = headerAbsolute?.classList.contains(OPEN_CLASS) ||
            headerFixed?.classList.contains(OPEN_CLASS);
        if (e.key === 'Escape' && isOpen) close();
    });

    // При переходе на десктоп закрыть
    const mq = window.matchMedia('(min-width: 1024px)');
    const onMqChange = (e) => {
        if (e.matches) close();
    };
    mq.addEventListener ? mq.addEventListener('change', onMqChange) : mq.addListener(onMqChange);

    return { close };
}

// =========================
// PopupManager (оставил твой класс, без изменений логики)
// =========================
class PopupManager {
    constructor(lenisInstance) {
        this.popups = document.querySelectorAll('.popup');
        this.activePopup = null;
        this.lenis = lenisInstance;
        this.popupLenis = null;
        this.scrollPosition = 0;
        this.init();
    }

    init() {
        document.querySelectorAll('.service__item').forEach((card) => {
            card.addEventListener('click', () => {
                const serviceType = card.getAttribute('data-service');
                this.openPopup(serviceType);
            });
        });

        this.popups.forEach((popup) => {
            const closeBtn = popup.querySelector('.popup__close');
            const overlay = popup.querySelector('.popup__overlay');

            if (closeBtn) closeBtn.addEventListener('click', () => this.closePopup(popup));
            if (overlay) overlay.addEventListener('click', () => this.closePopup(popup));
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activePopup) this.closePopup(this.activePopup);
        });
    }

    openPopup(serviceType) {
        const popup = document.getElementById(`popup-${serviceType}`);
        if (!popup) return;

        this.scrollPosition = window.pageYOffset || document.documentElement.scrollTop;

        if (this.lenis) this.lenis.stop();

        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

        document.body.style.position = 'fixed';
        document.body.style.top = `-${this.scrollPosition}px`;
        document.body.style.width = '100%';
        document.body.style.paddingRight = `${scrollbarWidth}px`;

        document.documentElement.classList.add('popup-open');
        document.body.classList.add('popup-open');

        popup.classList.add('active');
        this.activePopup = popup;

        const popupContent = popup.querySelector('.popup__content');

        if (!popupContent) return;

        setTimeout(() => {
            this.popupLenis = new Lenis({
                wrapper: popupContent,
                content: popupContent,
                duration: 1,
                easing: (t) => 1 - Math.pow(1 - t, 3),
                smooth: true,
                direction: 'vertical',
                smoothTouch: false,
                touchMultiplier: 1,
            });

            const rafPopup = (time) => {
                if (!this.popupLenis) return;
                this.popupLenis.raf(time);
                if (this.activePopup) requestAnimationFrame(rafPopup);
            };
            requestAnimationFrame(rafPopup);

            popupContent.style.opacity = '1';
        }, 50);
    }

    closePopup(popup) {
        if (this.popupLenis) {
            this.popupLenis.destroy();
            this.popupLenis = null;
        }

        popup.classList.remove('active');
        this.activePopup = null;

        document.documentElement.classList.remove('popup-open');
        document.body.classList.remove('popup-open');

        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.paddingRight = '';

        window.scrollTo(0, this.scrollPosition);

        if (this.lenis) this.lenis.start();
    }
}

class HeaderAnimation {
    constructor() {
        this.headerAbsolute = document.querySelector('.header--absolute');
        this.headerFixed = document.querySelector('.header--fixed');
        this.scrollDistance = 150;

        this.init();
    }

    init() {
        // Добавляем класс для transition с задержкой
        setTimeout(() => {
            this.headerFixed.classList.add('transtime');

            // Проверяем начальную позицию при загрузке
            if (window.pageYOffset > this.scrollDistance) {
                this.showFixed();
            }
        }, 500);

        // Отслеживаем скролл
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    this.handleScroll();
                    ticking = false;
                });
                ticking = true;
            }
        });
    }

    handleScroll() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

        if (scrollTop >= this.scrollDistance) {
            this.showFixed();
        } else {
            this.hideFixed();
        }
    }

    showFixed() {
        this.headerAbsolute.classList.add('is-hidden');
        this.headerFixed.classList.add('is-visible');
    }

    hideFixed() {
        this.headerAbsolute.classList.remove('is-hidden');
        this.headerFixed.classList.remove('is-visible');
    }
}

function initBrandsMarquee() {
    const track = document.querySelector('.brands__track');
    const group = track?.querySelector('.brands__group');
    if (!track || !group) return;

    const SPEED = 120; // px/сек — меняешь как хочешь

    const update = () => {
        const distance = group.scrollWidth; // ширина одного набора
        const duration = distance / SPEED;  // секунды
        track.style.setProperty('--marquee-distance', `${distance}px`);
        track.style.setProperty('--marquee-duration', `${duration}s`);
    };

    update();
    window.addEventListener('resize', update);
}

function initAOS() {
    if (typeof AOS === 'undefined') {
        console.error('AOS не загружен!');
        return;
    }

    AOS.init({
        duration: 800,
        easing: 'ease-out',
        once: true, // анимация срабатывает только один раз
        offset: 100,
        disable: false, // не отключать на мобильных
        anchorPlacement: 'top-bottom',
    });
}

// =========================
// App init
// =========================
function initApp() {
    // 1) Lenis
    lenis = initLenis();

    // 2) Header menu (важно: до anchor scroll, чтобы закрывать меню перед скроллом)
    const headerMenu = initHeaderMobileMenu({ lenisInstance: lenis });

    // 3) Smooth anchxors (закрыть меню перед прокруткой)
    initAnchorScroll(lenis, {
        onBeforeScroll: () => headerMenu.close(),
    });

    // 4) Benefits progress
    initBenefitsProgress(lenis);

    initLineProgress(lenis);

    // 5) Popups
    new PopupManager(lenis);

    new HeaderAnimation();

    // 6) UI effects
    initTilt();
    initCardsEntrance();

    // 7) Lottie
    initLottie();

    initBrandsMarquee();

    initCtaForm();

    // 8) AOS - ДОБАВЬ ЭТО
    initAOS();
}

document.addEventListener('DOMContentLoaded', initApp);