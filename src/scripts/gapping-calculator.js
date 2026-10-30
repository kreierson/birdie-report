import {
  CLUBS,
  clubById,
  METERS_PER_YARD,
  buildChart,
  roundTo,
  roundYards,
  serializeState,
} from '../utils/gapping.mjs';
import { chartBodyHtml } from '../utils/gapping-render.mjs';

function selectedClubs(form) {
  const checked = new Set([...form.querySelectorAll('input[name="club"]:checked')].map((input) => input.value));
  return CLUBS.filter((club) => checked.has(club.id)).map((club) => ({
    id: club.id,
    loft: Number(form.querySelector(`[name="loft-${club.id}"]`)?.value),
  }));
}

function syncAnchorOptions(form, clubs) {
  const select = form.querySelector('#anchor');
  const previous = select.value;
  const ids = clubs.map((club) => club.id);
  select.replaceChildren();
  for (const id of ids) {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = clubById(id).name;
    select.append(option);
  }
  if (ids.includes(previous)) select.value = previous;
  else if (ids.includes('7i')) select.value = '7i';
  else if (ids[0]) select.value = ids[0];
}

function readState(form) {
  const unit = form.querySelector('input[name="unit"]:checked')?.value === 'm' ? 'm' : 'yd';
  const clubs = selectedClubs(form);
  syncAnchorOptions(form, clubs);
  const carryRaw = form.querySelector('#carry').value.trim();
  return {
    unit,
    anchor: form.querySelector('#anchor').value,
    carry: carryRaw === '' ? null : Number(carryRaw),
    clubs,
  };
}

function convertCarry(form, nextUnit) {
  const previous = form.dataset.unit === 'm' ? 'm' : 'yd';
  if (previous === nextUnit) return;
  const input = form.querySelector('#carry');
  const raw = Number(input.value);
  if (Number.isFinite(raw)) {
    const yards = previous === 'm' ? raw / METERS_PER_YARD : raw;
    input.value = nextUnit === 'm' ? String(roundTo(yards * METERS_PER_YARD, 1)) : String(roundYards(yards));
  }
  input.step = nextUnit === 'm' ? '0.1' : '1';
  form.dataset.unit = nextUnit;
  const unitLabel = form.querySelector('#carry-unit');
  if (unitLabel) unitLabel.textContent = nextUnit === 'm' ? 'meters' : 'yards';
}

function resultsUrl(state) {
  const url = new URL(window.location.href);
  url.search = serializeState(state);
  url.hash = '';
  return url.toString();
}

export function initGappingCalculator(root = document) {
  const form = root.querySelector('#gapping-form');
  const summary = root.querySelector('#gapping-summary');
  const chart = root.querySelector('#gapping-chart');
  const copyButton = root.querySelector('#copy-results');
  const copyStatus = root.querySelector('#copy-results-status');
  if (!form || !summary || !chart) return;

  let current = readState(form);

  function paint(state, { writeHistory }) {
    current = state;
    const model = buildChart(state);
    summary.textContent = model.summary;
    chart.innerHTML = chartBodyHtml(model);
    if (writeHistory) {
      const next = resultsUrl(state);
      if (next !== window.location.href) history.replaceState(null, '', next);
    }
  }

  form.addEventListener('change', (event) => {
    if (event.target?.name === 'unit') convertCarry(form, event.target.value);
    paint(readState(form), { writeHistory: true });
  });

  form.addEventListener('input', (event) => {
    if (event.target?.name === 'unit') return;
    paint(readState(form), { writeHistory: true });
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    paint(readState(form), { writeHistory: true });
    const heading = root.querySelector('#results-heading');
    heading?.focus();
  });

  root.querySelectorAll('[data-preset]').forEach((button) => {
    button.addEventListener('click', () => {
      const id = button.dataset.preset;
      const yardsRadio = form.querySelector('input[name="unit"][value="yd"]');
      if (yardsRadio) yardsRadio.checked = true;
      form.dataset.unit = 'yd';
      const carry = form.querySelector('#carry');
      carry.value = button.dataset.carry;
      carry.step = '1';
      const box = form.querySelector(`input[name="club"][value="${id}"]`);
      if (box) box.checked = true;
      syncAnchorOptions(form, selectedClubs(form));
      const anchor = form.querySelector('#anchor');
      if ([...anchor.options].some((option) => option.value === id)) anchor.value = id;
      const unitLabel = form.querySelector('#carry-unit');
      if (unitLabel) unitLabel.textContent = 'yards';
      paint(readState(form), { writeHistory: true });
    });
  });

  copyButton?.addEventListener('click', async () => {
    const link = resultsUrl(current);
    try {
      await navigator.clipboard.writeText(link);
      if (copyStatus) copyStatus.textContent = 'Copied the results link.';
    } catch {
      if (copyStatus) copyStatus.textContent = link;
    }
  });

  const embedButton = root.querySelector('#copy-embed');
  const embedCode = root.querySelector('#embed-code');
  const embedStatus = root.querySelector('#copy-embed-status');
  embedButton?.addEventListener('click', async () => {
    const html = embedCode?.value ?? '';
    try {
      await navigator.clipboard.writeText(html);
      if (embedStatus) embedStatus.textContent = 'Copied the HTML link.';
    } catch {
      embedCode?.select();
      if (embedStatus) embedStatus.textContent = 'Select the HTML and copy it.';
    }
  });
}
