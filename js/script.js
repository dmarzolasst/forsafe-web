const WA_NUMBER = '573045609816';
const STORAGE_KEY = 'forsafe-cotizacion';

const waUrl = (text) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
const openWa = (text) => window.open(waUrl(text), '_blank', 'noopener');
const foto = (id, n, size) => `assets/catalogo/${id}-${n}-${size}.webp`;
const byId = (id) => PRODUCTOS.find((p) => p.id === id);
const normalize = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const waIcon = '<svg viewBox="0 0 32 32" aria-hidden="true"><use href="#icon-wa"/></svg>';
const cameraIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.5" fill="none" stroke="currentColor" stroke-width="2"/></svg>';

// Foto representativa de cada categoría para los accesos rápidos
const CATEGORIA_FOTO = {
  cabeza: 'casco',
  ojos: 'gafas',
  oidos: 'tapones',
  respiratoria: 'mascara-3m',
  manos: 'guantes-nitrilo',
  pies: 'bota',
  desechables: 'tapabocas',
  emergencias: 'botiquin',
};

/* ---------- Cotización (se guarda en el navegador del visitante) ---------- */

let quote = {};
try { quote = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch (e) { quote = {}; }

function saveQuote() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(quote)); } catch (e) { /* sin almacenamiento */ }
}

function addToQuote(id, qty = 1, silent = false) {
  quote[id] = (quote[id] || 0) + qty;
  saveQuote();
  updateQuoteUI();
  if (!silent) showToast(`${byId(id).nombre} agregado a tu cotización`, true);
}

function setQty(id, qty) {
  if (qty <= 0) delete quote[id];
  else quote[id] = qty;
  saveQuote();
  updateQuoteUI();
}

function updateQuoteUI() {
  const count = Object.keys(quote).length;
  document.querySelectorAll('[data-quote-count]').forEach((el) => {
    el.textContent = count;
    el.hidden = count === 0;
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
  });
  document.querySelectorAll('[data-add]').forEach((btn) => {
    const q = quote[btn.dataset.add];
    btn.classList.toggle('added', Boolean(q));
    btn.textContent = q ? `✓ En cotización (${q})` : '+ Cotizar';
  });
  if (quoteDrawer.open) renderQuote();
}

/* ---------- Catálogo ---------- */

const grid = document.getElementById('product-grid');
const chipsEl = document.getElementById('chips');
const searchInput = document.getElementById('search');
const emptyResults = document.getElementById('empty-results');
let filter = 'todos';

function renderCats() {
  document.getElementById('cats-row').innerHTML = Object.entries(CATEGORIA_FOTO).map(([cat, id]) => `
    <button class="cat" type="button" data-cat="${cat}">
      <span class="cat-img"><img src="${foto(id, 1, 'sm')}" alt="" loading="lazy"></span>
      ${CATEGORIAS[cat]}
    </button>`).join('');
}

function renderChips() {
  chipsEl.innerHTML = Object.entries(CATEGORIAS).map(([cat, label]) => {
    const n = cat === 'todos' ? PRODUCTOS.length : PRODUCTOS.filter((p) => p.categoria === cat).length;
    if (!n) return '';
    return `<button class="chip${cat === filter ? ' active' : ''}" type="button" role="tab" aria-selected="${cat === filter}" data-chip="${cat}">${label} <small>${n}</small></button>`;
  }).join('');
}

function cardHTML(p) {
  const extra = p.fotos > 1;
  return `
    <article class="card">
      <button class="card-media" type="button" data-open="${p.id}" aria-label="Ver fotos y detalles de ${p.nombre}">
        <span class="card-tag">${CATEGORIAS[p.categoria]}</span>
        <img src="${foto(p.id, 1, 'sm')}" alt="${p.nombre}" loading="lazy" width="600" height="800">
        ${extra ? `<img class="img-alt" src="${foto(p.id, 2, 'sm')}" alt="" loading="lazy" width="600" height="800">` : ''}
        ${extra ? `<span class="card-photos">${cameraIcon}${p.fotos}</span>` : ''}
      </button>
      <div class="card-body">
        <span class="card-brand">${p.marca || ''}</span>
        <h3>${p.nombre}</h3>
        <p>${p.descripcion}</p>
        <div class="card-actions">
          <button class="btn-add" type="button" data-add="${p.id}">+ Cotizar</button>
          <a class="btn-wa-square" href="${waUrl(`Hola Forsafe 👋, quiero información sobre: ${p.nombre}${p.marca ? ` (${p.marca})` : ''}.`)}" target="_blank" rel="noopener" aria-label="Preguntar por ${p.nombre} en WhatsApp">${waIcon}</a>
        </div>
      </div>
    </article>`;
}

function renderGrid() {
  const term = normalize(searchInput.value.trim());
  const list = PRODUCTOS.filter((p) => {
    if (filter !== 'todos' && p.categoria !== filter) return false;
    if (!term) return true;
    const haystack = normalize([p.nombre, p.marca, p.descripcion, CATEGORIAS[p.categoria], ...p.detalles].join(' '));
    return haystack.includes(term);
  });
  grid.innerHTML = list.map(cardHTML).join('');
  emptyResults.hidden = list.length > 0;
  updateQuoteUI();
}

function setFilter(cat) {
  filter = cat;
  renderChips();
  renderGrid();
}

chipsEl.addEventListener('click', (e) => {
  const chip = e.target.closest('[data-chip]');
  if (chip) setFilter(chip.dataset.chip);
});

document.getElementById('cats-row').addEventListener('click', (e) => {
  const cat = e.target.closest('[data-cat]');
  if (!cat) return;
  searchInput.value = '';
  setFilter(cat.dataset.cat);
  document.getElementById('catalogo').scrollIntoView();
});

searchInput.addEventListener('input', renderGrid);

grid.addEventListener('click', (e) => {
  const add = e.target.closest('[data-add]');
  if (add) { addToQuote(add.dataset.add); return; }
  const open = e.target.closest('[data-open]');
  if (open) openProduct(open.dataset.open);
});

emptyResults.querySelector('[data-wa-search]').addEventListener('click', (e) => {
  e.preventDefault();
  openWa(`Hola Forsafe 👋, ¿tienen disponible: ${searchInput.value.trim()}?`);
});

/* ---------- Ficha de producto ---------- */

const productModal = document.getElementById('product-modal');
const pmMain = document.getElementById('pm-main');
const pmThumbs = document.getElementById('pm-thumbs');
const pmQty = document.getElementById('pm-qty');
let currentProduct = null;

function showPhoto(n) {
  pmMain.src = foto(currentProduct.id, n, 'lg');
  pmMain.alt = `${currentProduct.nombre} — foto ${n}`;
  pmThumbs.querySelectorAll('button').forEach((b) => b.classList.toggle('active', Number(b.dataset.photo) === n));
}

function openProduct(id) {
  const p = byId(id);
  currentProduct = p;
  document.getElementById('pm-cat').textContent = CATEGORIAS[p.categoria];
  document.getElementById('pm-title').textContent = p.nombre;
  document.getElementById('pm-brand').textContent = p.marca ? `Marca: ${p.marca}` : '';
  document.getElementById('pm-desc').textContent = p.descripcion;
  document.getElementById('pm-details').innerHTML = p.detalles.map((d) => `<li>${d}</li>`).join('');
  document.getElementById('pm-wa').href = waUrl(`Hola Forsafe 👋, quiero información sobre: ${p.nombre}${p.marca ? ` (${p.marca})` : ''}.`);
  pmThumbs.innerHTML = p.fotos > 1
    ? Array.from({ length: p.fotos }, (_, i) => `<button type="button" data-photo="${i + 1}" aria-label="Ver foto ${i + 1}"><img src="${foto(p.id, i + 1, 'sm')}" alt=""></button>`).join('')
    : '';
  pmQty.value = 1;
  showPhoto(1);
  productModal.showModal();
}

pmThumbs.addEventListener('click', (e) => {
  const b = e.target.closest('[data-photo]');
  if (b) showPhoto(Number(b.dataset.photo));
});

productModal.querySelectorAll('[data-step]').forEach((b) => {
  b.addEventListener('click', () => {
    pmQty.value = Math.max(1, (parseInt(pmQty.value, 10) || 1) + Number(b.dataset.step));
  });
});

document.getElementById('pm-add').addEventListener('click', () => {
  addToQuote(currentProduct.id, Math.max(1, parseInt(pmQty.value, 10) || 1));
  productModal.close();
});

/* ---------- Panel de cotización ---------- */

const quoteDrawer = document.getElementById('quote-drawer');
const quoteList = document.getElementById('quote-list');

function renderQuote() {
  const ids = Object.keys(quote);
  const empty = ids.length === 0;
  document.getElementById('quote-empty').hidden = !empty;
  document.getElementById('quote-fields').hidden = empty;
  document.getElementById('quote-foot').hidden = empty;
  quoteList.innerHTML = ids.map((id) => {
    const p = byId(id);
    if (!p) return '';
    return `
      <li class="quote-item">
        <img src="${foto(id, 1, 'sm')}" alt="">
        <div>
          <strong>${p.nombre}</strong>
          <button class="quote-remove" type="button" data-remove="${id}">Quitar</button>
        </div>
        <div class="stepper stepper-sm">
          <button type="button" data-qstep="-1" data-id="${id}" aria-label="Menos">−</button>
          <input type="number" min="1" value="${quote[id]}" data-qinput="${id}" inputmode="numeric" aria-label="Cantidad de ${p.nombre}">
          <button type="button" data-qstep="1" data-id="${id}" aria-label="Más">+</button>
        </div>
      </li>`;
  }).join('');
}

function openQuote() {
  renderQuote();
  quoteDrawer.showModal();
}

document.getElementById('open-quote').addEventListener('click', openQuote);

quoteList.addEventListener('click', (e) => {
  const step = e.target.closest('[data-qstep]');
  if (step) {
    const id = step.dataset.id;
    setQty(id, Math.max(1, quote[id] + Number(step.dataset.qstep)));
    return;
  }
  const remove = e.target.closest('[data-remove]');
  if (remove) setQty(remove.dataset.remove, 0);
});

quoteList.addEventListener('change', (e) => {
  const input = e.target.closest('[data-qinput]');
  if (input) setQty(input.dataset.qinput, Math.max(1, parseInt(input.value, 10) || 1));
});

document.getElementById('clear-quote').addEventListener('click', () => {
  quote = {};
  saveQuote();
  updateQuoteUI();
});

document.getElementById('send-quote').addEventListener('click', () => {
  const nombre = document.getElementById('q-nombre').value.trim();
  const empresa = document.getElementById('q-empresa').value.trim();
  const lines = ['Hola Forsafe 👋, quiero cotizar los siguientes productos:', ''];
  Object.entries(quote).forEach(([id, qty]) => {
    const p = byId(id);
    if (p) lines.push(`• ${p.nombre}${p.marca ? ` (${p.marca})` : ''} — Cantidad: ${qty}`);
  });
  if (nombre || empresa) {
    lines.push('');
    if (nombre) lines.push(`Nombre: ${nombre}`);
    if (empresa) lines.push(`Empresa: ${empresa}`);
  }
  lines.push('', 'Quedo atento(a) a la cotización. ¡Gracias!');
  openWa(lines.join('\n'));
});

/* ---------- Diálogos: cerrar con botón o clic afuera ---------- */

[productModal, quoteDrawer].forEach((dialog) => {
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog || e.target.closest('[data-close]')) dialog.close();
  });
});

/* ---------- Kit de emergencia ---------- */

document.getElementById('kit-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const checked = [...e.target.querySelectorAll('input:checked')].map((i) => i.value);
  if (!checked.length) { showToast('Selecciona al menos un elemento del kit'); return; }
  checked.forEach((id) => addToQuote(id, 1, true));
  showToast(`${checked.length} elementos del kit agregados a tu cotización`, true);
});

/* ---------- Formulario de contacto → WhatsApp ---------- */

document.getElementById('contact-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const data = new FormData(e.target);
  const lines = ['Hola Forsafe 👋'];
  if (data.get('nombre')) lines.push(`Soy ${data.get('nombre').trim()}${data.get('empresa') ? ` de ${data.get('empresa').trim()}` : ''}.`);
  else if (data.get('empresa')) lines.push(`Escribo de ${data.get('empresa').trim()}.`);
  lines.push('', data.get('mensaje').trim());
  openWa(lines.join('\n'));
});

/* ---------- Widget de WhatsApp ---------- */

const waFab = document.getElementById('wa-fab');
const waPanel = document.getElementById('wa-panel');
const waTeaser = document.getElementById('wa-teaser');
const waDot = document.getElementById('wa-dot');

function setPanel(open) {
  waPanel.hidden = !open;
  waFab.setAttribute('aria-expanded', open);
  if (open) {
    waTeaser.hidden = true;
    waDot.hidden = true;
    try { sessionStorage.setItem('forsafe-wa-visto', '1'); } catch (e) { /* sin almacenamiento */ }
    setTimeout(() => document.getElementById('wa-input').focus({ preventScroll: true }), 300);
  }
}

waFab.addEventListener('click', () => setPanel(waPanel.hidden));
document.getElementById('wa-close').addEventListener('click', () => setPanel(false));

waTeaser.addEventListener('click', (e) => {
  if (e.target.closest('#wa-teaser-close')) { waTeaser.hidden = true; return; }
  setPanel(true);
});

let seenWa = false;
try { seenWa = sessionStorage.getItem('forsafe-wa-visto') === '1'; } catch (e) { /* sin almacenamiento */ }
if (seenWa) waDot.hidden = true;
else setTimeout(() => { if (waPanel.hidden) waTeaser.hidden = false; }, 6000);

waPanel.addEventListener('click', (e) => {
  if (e.target.closest('[data-open-quote]')) { setPanel(false); openQuote(); }
});

document.getElementById('wa-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const input = document.getElementById('wa-input');
  openWa(input.value.trim() || 'Hola Forsafe 👋, quiero hacer una consulta.');
  input.value = '';
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !waPanel.hidden) setPanel(false);
});

/* ---------- Enlaces y botones de WhatsApp con mensaje predefinido ---------- */

document.querySelectorAll('a[data-wa]').forEach((a) => {
  a.href = waUrl(a.dataset.wa);
  a.target = '_blank';
  a.rel = 'noopener';
});

document.querySelectorAll('button[data-wa]').forEach((b) => {
  b.addEventListener('click', () => openWa(b.dataset.wa));
});

/* ---------- Aviso flotante ---------- */

const toast = document.getElementById('toast');
let toastTimer;

function showToast(message, withAction = false) {
  toast.innerHTML = `<span>${message}</span>${withAction ? '<button type="button">Ver</button>' : ''}`;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

toast.addEventListener('click', (e) => {
  if (e.target.closest('button')) { toast.classList.remove('show'); openQuote(); }
});

/* ---------- Menú, header y animaciones ---------- */

const nav = document.getElementById('nav');
const navToggle = document.getElementById('nav-toggle');

navToggle.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', open);
});

nav.addEventListener('click', (e) => {
  if (e.target.closest('a')) {
    nav.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  }
});

const header = document.getElementById('header');
window.addEventListener('scroll', () => header.classList.toggle('scrolled', window.scrollY > 10), { passive: true });

if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
} else {
  document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
}

document.getElementById('year').textContent = new Date().getFullYear();

renderCats();
renderChips();
renderGrid();
