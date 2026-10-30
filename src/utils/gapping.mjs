// Loft-relative carry estimates for the golf club gapping calculator.
// One rule: 3 yards of carry per degree of loft versus the anchor club.
// See the "How this works" section on /tools/golf-club-gapping-calculator/.

export const YARDS_PER_DEGREE = 3;
export const METERS_PER_YARD = 0.9144;
export const TIGHT_GAP_YARDS = 8;
export const WIDE_GAP_YARDS = 15;
export const LARGE_GAP_YARDS = 18;
export const MIN_CARRY_YARDS = 40;
export const MAX_CARRY_YARDS = 400;
export const MIN_LOFT = 5;
export const MAX_LOFT = 64;
export const AMAZON_TAG = 'birdiereport-20';

export const CLUBS = [
  { id: 'driver', name: 'Driver', group: 'Woods', loft: 10.5 },
  { id: '3w', name: '3-wood', group: 'Woods', loft: 15 },
  { id: '5w', name: '5-wood', group: 'Woods', loft: 18 },
  { id: '7w', name: '7-wood', group: 'Woods', loft: 21 },
  { id: '3h', name: '3-hybrid', group: 'Hybrids', loft: 19 },
  { id: '4h', name: '4-hybrid', group: 'Hybrids', loft: 22 },
  { id: '5h', name: '5-hybrid', group: 'Hybrids', loft: 25 },
  { id: '6h', name: '6-hybrid', group: 'Hybrids', loft: 28 },
  { id: '4i', name: '4-iron', group: 'Irons', loft: 21 },
  { id: '5i', name: '5-iron', group: 'Irons', loft: 24 },
  { id: '6i', name: '6-iron', group: 'Irons', loft: 27 },
  { id: '7i', name: '7-iron', group: 'Irons', loft: 30 },
  { id: '8i', name: '8-iron', group: 'Irons', loft: 34 },
  { id: '9i', name: '9-iron', group: 'Irons', loft: 38 },
  { id: 'pw', name: 'Pitching wedge', group: 'Wedges', loft: 43 },
  { id: 'gw', name: 'Gap wedge', group: 'Wedges', loft: 48 },
  { id: 'sw', name: 'Sand wedge', group: 'Wedges', loft: 54 },
  { id: 'lw', name: 'Lob wedge', group: 'Wedges', loft: 58 },
];

export const DEFAULT_CLUB_IDS = ['driver', '3w', '5w', '4i', '5i', '6i', '7i', '8i', '9i', 'pw', 'sw', 'lw'];

const CLUB_BY_ID = new Map(CLUBS.map((club) => [club.id, club]));
const BRIDGE_PREFERENCE = ['gw', 'sw', 'lw', '3w', '5w', '7w', '4h', '5h', '3h', '6h', '4i', '5i'];

export function clubById(id) {
  return CLUB_BY_ID.get(id) ?? null;
}

export function clubsByGroup() {
  const groups = [];
  for (const club of CLUBS) {
    let group = groups.find((entry) => entry.name === club.group);
    if (!group) {
      group = { name: club.group, clubs: [] };
      groups.push(group);
    }
    group.clubs.push(club);
  }
  return groups;
}

export function familyOf(id) {
  if (id === 'driver' || id.endsWith('w')) return 'wood';
  if (id.endsWith('h')) return 'hybrid';
  if (id === 'pw' || id === 'gw' || id === 'sw' || id === 'lw') return 'wedge';
  return 'iron';
}

export function roundTo(value, places) {
  const factor = 10 ** places;
  return Math.round((value + 1e-9) * factor) / factor;
}

export function roundYards(value) {
  return Math.round(value + 1e-9);
}

export function formatLoft(loft) {
  const rounded = roundTo(Number(loft), 1);
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

export function yardsToMeters(yards) {
  return roundTo(yards * METERS_PER_YARD, 1);
}

export function metersToYards(meters) {
  return meters / METERS_PER_YARD;
}

export function estimateCarryYards(clubLoft, anchorLoft, anchorCarryYards) {
  return anchorCarryYards + (anchorLoft - clubLoft) * YARDS_PER_DEGREE;
}

export function classifyGap(gapYards) {
  if (gapYards < TIGHT_GAP_YARDS) return 'tight';
  if (gapYards > LARGE_GAP_YARDS) return 'large';
  if (gapYards > WIDE_GAP_YARDS) return 'wide';
  return 'good';
}

export function gapStatusLabel(status) {
  if (status === 'tight') return 'Too small';
  if (status === 'wide') return 'A bit wide';
  if (status === 'large') return 'Too big';
  return 'Even';
}

export function amazonSearchUrl(query) {
  const url = new URL('https://www.amazon.com/s');
  url.searchParams.set('k', query);
  url.searchParams.set('tag', AMAZON_TAG);
  return url.toString();
}

export const GAP_CTAS = {
  wedge: {
    heading: 'Filling the wedge gap',
    body: 'A gap wedge is the usual club when the pitching wedge and the next wedge are too far apart, or when two wedges are stacked on the same number.',
    links: [
      { kind: 'guide', href: '/blog/best-wedges-2026/', label: 'Best wedges of 2026', product: 'Wedge guide' },
      { kind: 'amazon', href: amazonSearchUrl('golf gap wedge'), label: 'Shop gap wedges on Amazon', product: 'Gap wedge' },
    ],
  },
  hybrid: {
    heading: 'Filling the long-iron gap',
    body: 'A hybrid is the usual swap for a 4-iron, and the usual add when the top of the iron set leaves a window.',
    links: [
      { kind: 'guide', href: '/blog/how-to-hit-fairway-woods-hybrids-off-the-deck/', label: 'How to hit hybrids off the deck', product: 'Hybrid guide' },
      { kind: 'guide', href: '/blog/how-to-hit-a-hybrid-from-rough/', label: 'How to hit a hybrid from rough', product: 'Hybrid from rough' },
      { kind: 'amazon', href: amazonSearchUrl('golf hybrid club'), label: 'Shop hybrids on Amazon', product: 'Golf hybrid' },
    ],
  },
  fairway: {
    heading: 'Filling the top of the bag',
    body: 'A 3-wood, 5-wood, or 7-wood is the usual bridge when the driver is a long way from the next club.',
    links: [
      { kind: 'guide', href: '/blog/how-to-hit-fairway-woods-hybrids-off-the-deck/', label: 'Fairway woods and hybrids guide', product: 'Fairway wood guide' },
      { kind: 'amazon', href: amazonSearchUrl('golf fairway wood'), label: 'Shop fairway woods on Amazon', product: 'Fairway wood' },
    ],
  },
  iron: {
    heading: 'Sorting the iron set',
    body: 'When two irons cover one number, or a window opens inside the set, the loft makeup matters more than the badge on the back.',
    links: [
      { kind: 'guide', href: '/blog/best-irons-2026/', label: 'Best irons of 2026', product: 'Iron guide' },
      { kind: 'amazon', href: amazonSearchUrl('golf iron set'), label: 'Shop iron sets on Amazon', product: 'Golf irons' },
    ],
  },
};

function phraseName(name) {
  return name.toLowerCase();
}

function preferenceRank(id) {
  const index = BRIDGE_PREFERENCE.indexOf(id);
  return index === -1 ? BRIDGE_PREFERENCE.length : index;
}

function bridgeClub(stronger, weaker, selected) {
  const mid = (stronger.loft + weaker.loft) / 2;
  const between = CLUBS.filter((club) => !selected.has(club.id) && club.loft > stronger.loft && club.loft < weaker.loft);
  between.sort((a, b) => {
    const distance = Math.abs(a.loft - mid) - Math.abs(b.loft - mid);
    if (Math.abs(distance) > 0.25) return distance;
    return preferenceRank(a.id) - preferenceRank(b.id);
  });
  return between[0] ?? null;
}

function ctaForClub(id) {
  const family = familyOf(id);
  if (family === 'wedge') return 'wedge';
  if (family === 'hybrid') return 'hybrid';
  if (family === 'wood') return 'fairway';
  return 'iron';
}

function sizeClause(gapText, status) {
  if (status === 'large') return `${gapText} is a hole`;
  if (status === 'wide') return `${gapText} is a bit wide`;
  return `${gapText} is a tight gap`;
}

export function suggestGap(stronger, weaker, gapText, status, selected) {
  if (status === 'good') return null;
  const left = phraseName(stronger.name);
  const right = phraseName(weaker.name);

  if (status === 'tight') {
    const hybridAndIron = (familyOf(stronger.id) === 'hybrid' && familyOf(weaker.id) === 'iron')
      || (familyOf(stronger.id) === 'iron' && familyOf(weaker.id) === 'hybrid');
    if (hybridAndIron) {
      const iron = familyOf(stronger.id) === 'iron' ? stronger : weaker;
      return {
        cta: 'hybrid',
        text: `The ${left} and the ${right} are only ${gapText} apart, so they are doing the same job. Keep the one you strike more solidly and drop the other. Swapping the ${phraseName(iron.name)} for the hybrid is the usual choice when the iron is the miss.`,
      };
    }
    if (familyOf(stronger.id) === 'wedge' || familyOf(weaker.id) === 'wedge') {
      return {
        cta: 'wedge',
        text: `The ${left} and the ${right} are only ${gapText} apart. Spread those lofts by about 4 degrees, or take one of them out of the bag.`,
      };
    }
    return {
      cta: familyOf(stronger.id) === 'wood' || familyOf(weaker.id) === 'wood' ? 'fairway' : 'iron',
      text: `The ${left} and the ${right} are only ${gapText} apart. You can drop one, or bend a loft so the gap opens to about 10–12 yards.`,
    };
  }

  const bridge = bridgeClub(stronger, weaker, selected);
  const size = sizeClause(gapText, status);
  if (bridge) {
    const bridgeName = phraseName(bridge.name);
    const fourIronLoft = clubById('4i').loft;
    const hybridReplacesLongIron = fourIronLoft > stronger.loft - 1 && fourIronLoft < weaker.loft + 1;
    if (familyOf(bridge.id) === 'hybrid' && hybridReplacesLongIron) {
      return {
        cta: 'hybrid',
        text: `${size}. Add a ${bridgeName} between the ${left} and the ${right}, or swap the 4-iron for a hybrid if that iron is the club you do not strike solidly.`,
      };
    }
    if (bridge.id === 'gw') {
      return {
        cta: 'wedge',
        text: `${size}. Add a gap wedge between the ${left} and the ${right}.`,
      };
    }
    if (bridge.id === 'sw') {
      return {
        cta: 'wedge',
        text: `${size}. Add a sand wedge between the ${left} and the ${right}.`,
      };
    }
    if (bridge.id === 'lw') {
      return {
        cta: 'wedge',
        text: `${size}. Add a lob wedge if you want a full-swing club shorter than the ${left}. If the lob is only a chip club, this full-swing gap matters less.`,
      };
    }
    return {
      cta: ctaForClub(bridge.id),
      text: `${size}. Add a ${bridgeName} between the ${left} and the ${right}.`,
    };
  }

  if (weaker.id === '4i' || stronger.id === '4i') {
    return {
      cta: 'hybrid',
      text: `${size}. Swap the 4-iron for a hybrid near ${formatLoft(clubById('4i').loft)} degrees. A hybrid is easier to launch through that window.`,
    };
  }

  return {
    cta: familyOf(weaker.id) === 'wedge' || familyOf(stronger.id) === 'wedge' ? 'wedge' : 'iron',
    text: `${size}. A club lofted between ${formatLoft(stronger.loft)} and ${formatLoft(weaker.loft)} degrees, or a 2-degree bend on one of them, is the usual fix.`,
  };
}

function defaultClubs() {
  return DEFAULT_CLUB_IDS.map((id) => ({ id, loft: clubById(id).loft }));
}

export function defaultState() {
  return {
    unit: 'yd',
    anchor: '7i',
    carry: 150,
    clubs: defaultClubs(),
  };
}

function parseLoftList(value) {
  const lofts = new Map();
  if (!value) return lofts;
  for (const part of value.split(',')) {
    const [id, raw] = part.split(':');
    if (!clubById(id)) continue;
    const loft = Number(raw);
    if (!Number.isFinite(loft)) continue;
    lofts.set(id, loft);
  }
  return lofts;
}

function clampLoft(loft) {
  return Math.min(MAX_LOFT, Math.max(MIN_LOFT, roundTo(loft, 1)));
}

export function parseState(searchParams) {
  const defaults = defaultState();
  const unit = searchParams.get('unit') === 'm' ? 'm' : 'yd';
  const requested = searchParams.get('clubs');
  let ids = requested
    ? requested.split(',').map((id) => id.trim()).filter((id) => clubById(id))
    : defaults.clubs.map((club) => club.id);
  ids = CLUBS.map((club) => club.id).filter((id) => ids.includes(id));
  if (!ids.length) ids = defaults.clubs.map((club) => club.id);

  const loftOverrides = parseLoftList(searchParams.get('lofts'));
  const clubs = ids.map((id) => {
    const override = loftOverrides.get(id);
    const loft = override == null ? clubById(id).loft : clampLoft(override);
    return { id, loft };
  });

  let anchor = searchParams.get('anchor');
  if (!ids.includes(anchor)) {
    if (ids.includes('7i')) anchor = '7i';
    else if (ids.includes('driver')) anchor = 'driver';
    else anchor = ids[0];
  }

  const carryRaw = searchParams.get('carry');
  let carry = unit === 'm' ? yardsToMeters(150) : 150;
  if (carryRaw != null && carryRaw !== '') {
    const parsed = Number(carryRaw);
    carry = Number.isFinite(parsed) ? parsed : null;
  }

  return { unit, anchor, carry, clubs };
}

export function serializeState(state) {
  const params = new URLSearchParams();
  params.set('unit', state.unit === 'm' ? 'm' : 'yd');
  params.set('anchor', state.anchor);
  params.set('carry', state.carry == null || Number.isNaN(state.carry) ? '' : String(state.carry));
  params.set('clubs', state.clubs.map((club) => club.id).join(','));
  params.set('lofts', state.clubs.map((club) => `${club.id}:${formatLoft(club.loft)}`).join(','));
  return params.toString();
}

function carryError(carryYards) {
  if (carryYards == null || Number.isNaN(carryYards)) return 'Enter one full-swing carry to build the chart.';
  if (carryYards < MIN_CARRY_YARDS || carryYards > MAX_CARRY_YARDS) {
    return `Enter a full-swing carry between ${MIN_CARRY_YARDS} and ${MAX_CARRY_YARDS} yards (${yardsToMeters(MIN_CARRY_YARDS)}–${yardsToMeters(MAX_CARRY_YARDS)} meters).`;
  }
  return null;
}

export function displayDistance(yards, unit) {
  if (unit === 'm') return `${yardsToMeters(yards)} m`;
  return `${roundYards(yards)} yd`;
}

export function buildChart(state) {
  const unit = state.unit === 'm' ? 'm' : 'yd';
  const clubs = (state.clubs ?? [])
    .filter((club) => clubById(club.id))
    .map((club) => ({
      id: club.id,
      name: clubById(club.id).name,
      loft: Number(club.loft),
    }));

  if (!clubs.length) {
    return { ok: false, unit, summary: 'Check at least one club.', rows: [], ctas: [] };
  }

  const invalidLoft = clubs.find((club) => !Number.isFinite(club.loft) || club.loft < MIN_LOFT || club.loft > MAX_LOFT);
  if (invalidLoft) {
    return {
      ok: false,
      unit,
      summary: `Enter a loft between ${MIN_LOFT} and ${MAX_LOFT} degrees for the ${phraseName(invalidLoft.name)}.`,
      rows: [],
      ctas: [],
    };
  }

  const anchor = clubs.find((club) => club.id === state.anchor);
  if (!anchor) {
    return { ok: false, unit, summary: 'Pick the anchor club from the clubs in the bag.', rows: [], ctas: [] };
  }

  const carryYards = unit === 'm' ? metersToYards(Number(state.carry)) : Number(state.carry);
  const rangeError = carryError(carryYards);
  if (rangeError) return { ok: false, unit, summary: rangeError, rows: [], ctas: [] };

  const selected = new Set(clubs.map((club) => club.id));
  const rows = clubs
    .map((club) => ({
      ...club,
      carryYards: roundYards(estimateCarryYards(club.loft, anchor.loft, carryYards)),
    }))
    .sort((a, b) => a.loft - b.loft || a.name.localeCompare(b.name));

  const annotated = rows.map((club, index) => {
    const next = rows[index + 1] ?? null;
    if (!next) {
      return {
        ...club,
        carryLabel: displayDistance(club.carryYards, unit),
        loftLabel: `${formatLoft(club.loft)}°`,
        gapYards: null,
        gapLabel: null,
        status: null,
        statusLabel: null,
        suggestion: null,
        cta: null,
        nextName: null,
        isAnchor: club.id === anchor.id,
      };
    }
    const gapYards = club.carryYards - next.carryYards;
    const status = classifyGap(gapYards);
    const gapText = unit === 'm'
      ? `${roundTo(yardsToMeters(club.carryYards) - yardsToMeters(next.carryYards), 1)} meters`
      : `${gapYards} yards`;
    const suggestion = suggestGap(club, next, gapText, status, selected);
    const gapAmount = unit === 'm'
      ? `${roundTo(yardsToMeters(club.carryYards) - yardsToMeters(next.carryYards), 1)} m`
      : `${gapYards} yd`;
    return {
      ...club,
      carryLabel: displayDistance(club.carryYards, unit),
      loftLabel: `${formatLoft(club.loft)}°`,
      gapYards,
      gapLabel: gapAmount,
      status,
      statusLabel: gapStatusLabel(status),
      suggestion: suggestion?.text ?? null,
      cta: suggestion?.cta ?? null,
      nextName: next.name,
      isAnchor: club.id === anchor.id,
    };
  });

  const flags = annotated.filter((row) => row.status && row.status !== 'good');
  const ctaKinds = [];
  for (const row of flags) {
    if (row.cta && !ctaKinds.includes(row.cta)) ctaKinds.push(row.cta);
  }

  let summary;
  if (annotated.length < 2) {
    summary = 'Add at least one more club to measure a gap. The number above is only the anchor, repeated for that loft.';
  } else if (!flags.length) {
    summary = 'No gap is under 8 yards or over 15 yards. On this estimate, the clubs you checked are evenly spaced.';
  } else {
    const noun = flags.length === 1 ? 'gap needs' : 'gaps need';
    const details = flags.map((row) => `${phraseName(row.name)} to ${phraseName(row.nextName)} is ${row.statusLabel.toLowerCase()} (${row.gapLabel})`).join('; ');
    summary = `${flags.length} ${noun} a look: ${details}.`;
  }

  return {
    ok: true,
    unit,
    anchorId: anchor.id,
    anchorName: anchor.name,
    summary,
    rows: annotated,
    ctas: ctaKinds.map((kind) => ({ kind, ...GAP_CTAS[kind] })),
  };
}
