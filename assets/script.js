const header = document.querySelector(".site-header");
const toggle = document.querySelector(".menu-toggle");
const menu = document.querySelector(".nav-links");
const projectFilters = [...document.querySelectorAll(".project-filter")];
const projectCards = [...document.querySelectorAll(".project-card")];
const projectToggles = [...document.querySelectorAll(".project-card-toggle")];
const projectModal = document.querySelector("#project-modal");
const projectModalGallery = projectModal?.querySelector(".project-modal-gallery");
const projectModalTitle = projectModal?.querySelector("#project-modal-title");
const projectModalDescription = projectModal?.querySelector(".project-modal-description");
const projectModalClose = projectModal?.querySelector(".project-modal-close");
let lastProjectTrigger;

let scrollUpdatePending = false;
const updateScrollState = () => {
  header.classList.toggle("scrolled", window.scrollY > 15);
  const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
  const progress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
  document.documentElement.style.setProperty("--scroll-progress", String(progress));
  scrollUpdatePending = false;
};

window.addEventListener("scroll", () => {
  if (scrollUpdatePending) return;
  scrollUpdatePending = true;
  window.requestAnimationFrame(updateScrollState);
}, { passive: true });

updateScrollState();

toggle?.addEventListener("click", () => {
  const open = menu.classList.toggle("open");
  toggle.classList.toggle("open", open);
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
});

menu?.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    menu.classList.remove("open");
    toggle?.classList.remove("open");
    toggle?.setAttribute("aria-expanded", "false");
    menu.querySelectorAll("a").forEach(item => item.classList.toggle("active", item === link));
  });
});

const navLinks = [...document.querySelectorAll(".nav-links a")];
const sectionIds = navLinks
  .map(link => link.dataset.sectionLink || link.getAttribute("href")?.split("#").pop())
  .filter(Boolean);
const setActiveSection = (sectionId) => {
  navLinks.forEach(link => {
    const isActive = link.dataset.sectionLink === sectionId
      || link.getAttribute("href")?.split("#").pop() === sectionId;
    link.classList.toggle("active", isActive);
  });
};

const sectionObserver = new IntersectionObserver((entries) => {
  const visibleEntry = entries
    .filter(entry => entry.isIntersecting)
    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

  if (visibleEntry) {
    setActiveSection(visibleEntry.target.id);
  }
}, { threshold: [0.25, 0.5, 0.75], rootMargin: "-10% 0px -40% 0px" });

document.querySelectorAll("main section[id]").forEach(section => {
  if (sectionIds.includes(section.id)) {
    sectionObserver.observe(section);
  }
});

if (navLinks.length) {
  const initialSection = document.querySelector("main section[id='home']") || document.querySelector("main section[id]");
  if (initialSection) setActiveSection(initialSection.id);
}

projectCards.forEach(card => {
  card.addEventListener("pointermove", event => {
    if (event.pointerType === "touch" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const bounds = card.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    card.style.setProperty("--tilt-x", `${-y * 4}deg`);
    card.style.setProperty("--tilt-y", `${x * 4}deg`);
  });

  card.addEventListener("pointerleave", () => {
    card.style.removeProperty("--tilt-x");
    card.style.removeProperty("--tilt-y");
  });
});

projectFilters.forEach(filter => {
  filter.addEventListener("click", () => {
    const selectedFilter = filter.dataset.filter;
    projectFilters.forEach(item => item.classList.toggle("active", item === filter));
    projectCards.forEach(card => {
      const visible = selectedFilter === "all" || card.dataset.category === selectedFilter;
      card.hidden = !visible;
    });
  });
});

projectToggles.forEach(toggleButton => {
  toggleButton.addEventListener("click", () => {
    const card = toggleButton.closest(".project-card");
    const modalContent = card.querySelector(".project-modal-content").content;
    const modalImages = [...modalContent.querySelectorAll(".modal-project-images img")];

    lastProjectTrigger = toggleButton;
    projectModalGallery.innerHTML = "";

    modalImages.forEach((image, index) => {
      const wrap = document.createElement("div");
      wrap.className = index === 0 ? "project-modal-image-wrap project-modal-image-main" : "project-modal-image-wrap project-modal-image-support";

      const img = document.createElement("img");
      img.className = index === 0 ? "project-modal-image" : "project-modal-image project-modal-image-secondary";
      img.src = image.src;
      img.srcset = image.srcset;
      img.sizes = image.sizes;
      img.alt = image.alt;
      img.loading = "lazy";
      img.decoding = "async";

      wrap.appendChild(img);
      projectModalGallery.appendChild(wrap);
    });

    projectModalTitle.textContent = modalContent.querySelector(".modal-project-title").textContent;
    projectModalDescription.textContent = modalContent.querySelector(".modal-project-description").textContent;
    projectModal.hidden = false;
    document.body.classList.add("modal-open");
    projectModalClose.focus();
  });
});

const closeProjectModal = () => {
  if (!projectModal || projectModal.hidden) return;
  projectModal.hidden = true;
  document.body.classList.remove("modal-open");
  lastProjectTrigger?.focus();
};

projectModal?.querySelectorAll("[data-modal-close]").forEach(closeButton => {
  closeButton.addEventListener("click", closeProjectModal);
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeProjectModal();
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll(".reveal").forEach((el, i) => {
  el.style.transitionDelay = `${Math.min(i * 35, 220)}ms`;
  observer.observe(el);
});

// Graceful fallback when the user has not added the logo asset yet.
const logo = document.querySelector(".brand-logo");
const fallback = document.querySelector(".logo-fallback");
logo?.addEventListener("error", () => {
  logo.style.display = "none";
  fallback.style.display = "block";
});
