const COLS = [
  { id:'todo',  title:'Todo',  dot:'bg-sky-400',     badge:'bg-sky-400/15 text-sky-300',     border:'border-t-sky-400' },
  { id:'doing', title:'Doing', dot:'bg-amber-400',   badge:'bg-amber-400/15 text-amber-300', border:'border-t-amber-400' },
  { id:'done',  title:'Done',  dot:'bg-emerald-400', badge:'bg-emerald-400/15 text-emerald-300', border:'border-t-emerald-400' },
];
// ponytail: 3 kolom fix + localStorage; upgrade: judul/jumlah kolom editable kalau perlu
// state: { kolomId: [{ t:teks, c:dibuat, u:diperbarui, e:editKe (opsional) }] }
const load = () => {
  const raw = JSON.parse(localStorage.getItem('kanban') || 'null') || Object.fromEntries(COLS.map(c => [c.id, []]));
  for (const id of Object.keys(raw)) raw[id] = raw[id].map(c => typeof c === 'string' ? { t: c, c: 0, u: 0 } : c); // migrasi data lama
  return raw;
};
let state = load();
const ARCHIVE = 'archive';
state[ARCHIVE] = state[ARCHIVE] || []; // arsip terpisah, bukan kolom
const save = () => localStorage.setItem('kanban', JSON.stringify(state));
const esc = s => s.replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt = ms => ms ? new Date(ms).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '';

// icon SVG Lucide (lucide.dev) — inline biar rata & tanpa jaringan; scale via class size-*
const svg = p => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="size-4">${p}</svg>`;
const ICON = {
  copy: svg('<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>'),
  check: svg('<path d="M20 6 9 17l-5-5"/>'),
  edit: svg('<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>'),
  archive: svg('<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>'),
  del: svg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'),
};

const board = document.getElementById('board');
board.innerHTML = COLS.map(c => `
  <section class="col bg-zinc-900/50 backdrop-blur-md rounded-xl ring-1 ring-white/10 border-t-2 ${c.border} shadow-lg shadow-black/30 flex flex-col min-h-0" data-id="${c.id}">
    <h2 class="px-3 pt-2.5 pb-1 text-sm font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
      <span class="size-2.5 rounded-full ${c.dot}"></span>${c.title}
      <b class="rounded-full px-2 py-0.5 text-xs ${c.badge}" data-count></b>
      <button data-copy class="ml-auto text-zinc-400 hover:text-sky-300 transition" title="copy board jadi laporan teks">${ICON.copy}</button>
    </h2>
    <div class="cards flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-2"></div>
    <form class="flex gap-1.5 p-2"><input class="flex-1 min-w-0 bg-white/5 ring-1 ring-white/10 rounded-md px-3 py-1.5 text-sm outline-none focus:ring-sky-400/60 placeholder:text-zinc-600 transition" placeholder="+ kartu (Enter)" required></form>
  </section>`).join('');

// panel arsip (toggle)
const archivePanel = document.createElement('section');
archivePanel.className = 'fixed inset-x-0 bottom-0 bg-zinc-900/95 backdrop-blur ring-1 ring-zinc-800 border-t border-zinc-700 hidden';
archivePanel.innerHTML = `
  <div class="max-w-6xl mx-auto px-5 py-3">
    <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
      Arsip <b class="rounded-full px-2 py-0.5 bg-zinc-700 text-zinc-200" data-acount></b>
      <button data-close class="ml-auto text-zinc-500 hover:text-zinc-200 text-base leading-none" title="tutup">&times;</button>
    </div>
    <div data-acards class="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-h-48 overflow-y-auto pr-1"></div>
  </div>`;
document.body.appendChild(archivePanel);

function render() {
  for (const col of board.querySelectorAll('.col')) {
    const id = col.dataset.id;
    col.querySelector('.cards').innerHTML = state[id].map((card, i) => `
      <div class="card group bg-white/5 backdrop-blur-sm ring-1 ring-white/10 hover:ring-white/25 rounded-lg px-3 py-2 text-sm cursor-grab active:cursor-grabbing flex justify-between gap-2 items-start transition" draggable="true" data-i="${i}">
        <div class="min-w-0">
          <div class="break-words">${esc(card.t)}</div>
          <div class="mt-1 text-[11px] leading-snug text-zinc-500">dibuat ${fmt(card.c)}${card.u !== card.c ? ` · dipindah ${fmt(card.u)}` : ''}${card.e ? ` · diedit ${card.e}×` : ''}</div>
        </div>
        <div class="flex shrink-0 gap-1.5 opacity-0 group-hover:opacity-100 transition">
          <button data-act="edit" class="text-zinc-400 hover:text-sky-400 transition px-0.5" title="edit">${ICON.edit}</button>
          <button data-act="archive" class="text-zinc-400 hover:text-amber-400 transition px-0.5" title="arsip">${ICON.archive}</button>
          <button data-act="del" class="text-zinc-400 hover:text-red-400 transition px-0.5" title="hapus">${ICON.del}</button>
        </div>
      </div>`).join('');
    col.querySelector('[data-count]').textContent = state[id].length;
  }
  archivePanel.querySelector('[data-acards]').innerHTML = state.archive.map((card, i) => `
    <div class="bg-white/5 ring-1 ring-white/10 rounded-lg px-2.5 py-2 text-sm flex justify-between gap-2 items-start">
      <div class="min-w-0">
        <div class="break-words text-zinc-400 line-through">${esc(card.t)}</div>
        <div class="mt-1 text-[10px] text-zinc-600">dibuat ${fmt(card.c)} · diarsip ${fmt(card.u)}</div>
      </div>
      <button data-restore="${i}" class="shrink-0 text-zinc-500 hover:text-emerald-400 text-xs px-1 py-0.5 rounded ring-1 ring-zinc-700" title="kembalikan ke Todo">pulihkan</button>
    </div>`).join('');
  archivePanel.querySelector('[data-acount]').textContent = state.archive.length;
}

board.addEventListener('submit', e => {
  e.preventDefault();
  const input = e.target.querySelector('input');
  const now = Date.now();
  state[e.target.closest('.col').dataset.id].push({ t: input.value.trim(), c: now, u: now });
  input.value = ''; save(); render();
});

// aksi kartu: edit inline, arsip, hapus
board.addEventListener('click', e => {
  const copyBtn = e.target.closest('[data-copy]');
  if (copyBtn) {
    const id = copyBtn.closest('.col').dataset.id;
    const lines = state[id].map((c, i) => {
      const moved = c.u !== c.c ? `, ${id === 'done' ? 'done' : 'dipindah'} ${fmt(c.u)}` : '';
      return `${i + 1}. ${c.t} (dibuat ${fmt(c.c)}${moved})`;
    });
    const report = `## ${id.toUpperCase()} — ${state[id].length} kartu (${new Date().toLocaleString('id-ID')})\n${lines.join('\n') || '(kosong)'}`;
    navigator.clipboard.writeText(report).then(() => {
      copyBtn.innerHTML = ICON.check;
      setTimeout(() => copyBtn.innerHTML = ICON.copy, 1200);
    });
    return;
  }
  const btn = e.target.closest('button'); if (!btn) return;
  const col = btn.closest('.col'); if (!col) return;
  const id = col.dataset.id, i = +btn.closest('.card').dataset.i, card = state[id][i];
  if (btn.dataset.act === 'del') { state[id].splice(i, 1); save(); render(); return; }
  if (btn.dataset.act === 'archive') { card.u = Date.now(); state.archive.push(state[id].splice(i, 1)[0]); save(); render(); return; }
  if (btn.dataset.act !== 'edit') return;
  const span = btn.closest('.card').querySelector('.break-words');
  span.contentEditable = 'plaintext-only';
  span.focus();
  document.execCommand('selectAll', false, null);
  span.onblur = span.onkeydown = ev => {
    if (ev && ev.key !== 'Enter' && ev.key !== 'Escape') return;
    if (ev && ev.key === 'Escape') span.blur();
    span.contentEditable = 'false';
    const v = span.textContent.trim();
    if (v && v !== card.t) { card.t = v; card.u = Date.now(); card.e = (card.e || 0) + 1; }
    save(); render();
  };
});

// arsip: pulihkan + tutup
archivePanel.addEventListener('click', e => {
  if (e.target.hasAttribute('data-restore')) {
    const card = state.archive.splice(+e.target.dataset.restore, 1)[0];
    card.u = Date.now();
    state.todo.push(card); save(); render(); return;
 }
  if (e.target.closest('[data-close]')) archivePanel.classList.add('hidden');
});

document.getElementById('toggleArchive').addEventListener('click', () => archivePanel.classList.toggle('hidden'));

let drag = null; // {from, i}
board.addEventListener('dragstart', e => {
  const card = e.target.closest('.card'); if (!card) return;
  drag = { from: card.closest('.col').dataset.id, i: +card.dataset.i };
  e.dataTransfer.effectAllowed = 'move';
});
for (const evt of ['dragover','dragleave','drop'])
  board.addEventListener(evt, e => {
    const col = e.target.closest('.col'); if (!col || !drag) return;
    e.preventDefault();
    if (evt === 'dragover') col.classList.add('dragover');
    if (evt === 'dragleave') col.classList.remove('dragover');
    if (evt !== 'drop') return;
    const [card] = state[drag.from].splice(drag.i, 1);
    if (drag.from !== col.dataset.id) card.u = Date.now(); // pindah kolom = update; urutan dalam kolom tidak
    state[col.dataset.id].push(card);
    drag = null; save(); render();
  });

render();
