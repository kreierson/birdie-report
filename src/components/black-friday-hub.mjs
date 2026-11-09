// GA4 affiliate_click placement for the Black Friday / Cyber Monday hub.
// Keep this stable so those clicks stay separate from gift guide and quick picks.
export const BF_HUB_PLACEMENT = 'bf_hub';

export const BF_HUB_PATH = '/deals/black-friday-golf-deals/';
export const BF_HUB_URL = 'https://www.birdiereport.com/deals/black-friday-golf-deals/';
export const BF_PUBLISHED = '2026-11-02';
export const BF_UPDATED = '2026-11-09';
export const BF_LISTING_VERIFIED = 'Listing verified November 9, 2026';

const SITE = 'https://www.birdiereport.com';

export const bfDates = [
  {
    iso: '2026-11-26',
    name: 'Thanksgiving',
    detail: 'Thursday, November 26. Retailers often start before Friday. This page does not treat Thursday as a separate sale we have checked.',
  },
  {
    iso: '2026-11-27',
    name: 'Black Friday',
    detail: 'Friday, November 27, 2026. The day the "black friday golf deals" searches are actually about.',
  },
  {
    iso: '2026-11-30',
    name: 'Cyber Monday',
    detail: 'Monday, November 30, 2026. The online-heavy end of the same long weekend.',
  },
];

export const bfBuyingTips = [
  {
    title: 'Match the exact model',
    text: 'Qi35, Qi35 Max, and Qi35 Max Lite are different drivers. The senior guide is about the Lite. A head with a similar name is a different club.',
  },
  {
    title: 'Match the variant the guide named',
    text: 'Hand, loft, shaft flex, and colorway change the buy. The Cart 14 button opens the verified Washed Indigo / Blue Bird / White listing. Other colors are a different choice, and they are discussed on the cart-bag guide.',
  },
  {
    title: 'Read the condition on the product page',
    text: 'A new listing is a different product page from a used, refurbished, or renewed offer. If the page says used, refurbished, or renewed, it is not the listing this hub is pointing at.',
  },
  {
    title: 'The right club beats a sale tag',
    text: 'Last year’s driver is a useful buy when the guide you trust already put it on the shortlist. It is not useful because a red tag showed up on a club that does not fit your speed, your miss, or your shaft.',
  },
  {
    title: 'Shoes, gloves, and apparel still have to fit',
    text: 'The wrong size is not a deal. Check the return window before you need the pair for a trip, and read the shoe or glove guide for the wet-weather limit before you buy the lighter one.',
  },
  {
    title: 'Balls follow swing speed',
    text: 'The balls guide sorts by swing speed. A dozen that does not match that speed is the wrong ball. The Kirkland note on that page also says the usual shelf is Costco.',
  },
];

function absolute(path) {
  return new URL(path, SITE).toString();
}

function listed(pick) {
  return {
    listingVerified: BF_LISTING_VERIFIED,
    availability: 'listed',
    ...pick,
  };
}

export const bfCategories = [
  {
    id: 'drivers',
    title: 'Drivers',
    lede: 'Buy the driver that fits the swing you have. The senior guide and the general drivers guide are not the same shortlist, and a sale does not merge them. The Stealth 2 Plus link is one 8.0 degree extra-stiff build, not every Stealth 2 Plus.',
    guides: [
      { href: '/blog/best-drivers-2026/', label: 'best drivers guide' },
      { href: '/blog/best-drivers-seniors-2026/', label: 'drivers for seniors guide' },
    ],
    picks: [
      listed({
        product: 'TaylorMade Stealth 2 Plus+ 8.0',
        note: 'The drivers guide ranks the Stealth 2 Plus as its best overall: workable, and forgiving enough that a miss does not become a different hole. It is not the lightweight senior shortlist. The listing is this build only: 8.0 degrees, Mitsubishi Kai\'li Red, extra stiff, right hand, model Stealth 2 Plus, part N7465411. It is not every Stealth 2 Plus.',
        guideHref: '/blog/best-drivers-2026/',
        guideLabel: 'best drivers guide',
        url: 'https://www.amazon.com/dp/B0F1BHSGN4?tag=birdiereport-20',
        sourceAsin: 'B0F1BHSGN4',
        variant: 'Right hand, 8.0 degrees, Mitsubishi Kai\'li Red, extra stiff. Model Stealth 2 Plus, part N7465411.',
      }),
      listed({
        product: 'Callaway Elyte Max Fast Driver',
        note: 'The senior driver guide ranks the Elyte Max Fast first for swing speeds around 70–85 mph. The dedicated review is the longer version of that case. A standard-weight head is a different driver. This listing is the right-hand 10.5 degree regular-flex graphite build in black.',
        guideHref: '/blog/best-drivers-seniors-2026/',
        guideLabel: 'drivers for seniors guide',
        also: [{ href: '/blog/callaway-elyte-max-fast-driver-review/', label: 'Elyte Max Fast review' }],
        url: 'https://www.amazon.com/dp/B0DHWGSGWF?tag=birdiereport-20',
        sourceAsin: 'B0DHWGSGWF',
        variant: 'Right hand, 10.5 degrees, graphite, regular flex, standard rubber grip, black.',
      }),
    ],
  },
  {
    id: 'irons',
    title: 'Irons',
    lede: 'High-handicap irons are a forgiveness decision. A sale on a players’ set does not become a game-improvement set because the calendar says November. The Elyte link is a 6-PW. The Dynapower link is a 5-PW with a gap wedge.',
    guides: [
      { href: '/blog/best-irons-high-handicappers-2026/', label: 'irons for high handicappers guide' },
    ],
    picks: [
      listed({
        product: 'Callaway Elyte Iron Set',
        note: 'The high-handicap irons guide calls the Elyte its best overall: distance and a wide sole, at the top of that page’s set list. Read it before you chase a set with a similar name. This listing is 6-iron through pitching wedge, right hand, steel, regular. It is not a 4-PW.',
        guideHref: '/blog/best-irons-high-handicappers-2026/',
        guideLabel: 'irons for high handicappers guide',
        url: 'https://www.amazon.com/dp/B0DHWGV745?tag=birdiereport-20',
        sourceAsin: 'B0DHWGV745',
        variant: 'Right hand, steel, regular flex, 6-iron through pitching wedge.',
      }),
      listed({
        product: 'Wilson Dynapower Irons',
        note: 'Same guide’s budget set, with progressive long-iron and short-iron shaping. The page treats it as the budget shortlist, not the flagship. The listing is right hand, steel, regular, model WG1P028601R, and the page says the set is 5-PW plus a gap wedge.',
        guideHref: '/blog/best-irons-high-handicappers-2026/',
        guideLabel: 'irons for high handicappers guide',
        url: 'https://www.amazon.com/dp/B0BT26B16M?tag=birdiereport-20',
        sourceAsin: 'B0BT26B16M',
        variant: 'Right hand, steel, regular flex, 5-PW and gap wedge. Model WG1P028601R.',
      }),
    ],
  },
  {
    id: 'putters',
    title: 'Putters',
    lede: 'A blade and a mallet are different answers. The putter guide is for someone who can aim a blade. The high-handicap guide is for someone who needs the miss to stay online. White Hot OG 2-Ball, DFX Seven, and Super Select Newport 2 are off this list: the pages opened from those names were a different model.',
    guides: [
      { href: '/blog/best-putters-2026/', label: 'putter guide' },
      { href: '/blog/best-putters-high-handicappers-2026/', label: 'putters for high handicappers guide' },
    ],
    picks: [
      listed({
        product: 'Wilson Infinite Buckingham',
        note: 'The high-handicap putter guide’s counterbalanced mid-mallet. That page also says it is not as forgiving as a full mallet. This listing is the right-hand 35-inch 2024 Infinite Buckingham.',
        guideHref: '/blog/best-putters-high-handicappers-2026/',
        guideLabel: 'putters for high handicappers guide',
        url: 'https://www.amazon.com/dp/B0CPT8TN5C?tag=birdiereport-20',
        sourceAsin: 'B0CPT8TN5C',
        variant: 'Right hand, 35 inches. 2024 Infinite Buckingham.',
      }),
    ],
  },
  {
    id: 'balls',
    title: 'Golf balls',
    lede: 'The ball is every shot, not fourteen drives. Match the swing speed on the balls guide, then use the variant named here. Kirkland Signature V3 is not listed. The balls guide names Costco as the usual shelf.',
    guides: [
      { href: '/blog/best-golf-balls-2026/', label: 'golf balls guide' },
    ],
    picks: [
      listed({
        product: 'Titleist Pro V1 Golf Balls, 1 Count',
        note: 'The balls guide’s best overall for a golfer who finishes a dozen. It calls the Pro V1 the wide-fit premium ball. It is the wrong buy if balls end up in the water. The Amazon listing title is Titleist Pro V1 Golf Balls. Product details list Unit Count 1 Count, Number of Items 1, and Number of Packs 1. That is one ball, not a dozen. The variant is yellow, low numbers, size One Size, model T2129S.',
        guideHref: '/blog/best-golf-balls-2026/',
        guideLabel: 'golf balls guide',
        url: 'https://www.amazon.com/dp/B0DPN71RTJ?tag=birdiereport-20',
        sourceAsin: 'B0DPN71RTJ',
        variant: 'Yellow, low numbers, One Size. Unit Count 1 Count. Model T2129S. Not a dozen.',
      }),
    ],
  },
  {
    id: 'rangefinders',
    title: 'Rangefinders and GPS',
    lede: 'A laser and a watch answer different questions. The rangefinder guide is the laser list. The GPS watch guide is the wrist list. The Tour Hybrid review is the one-device case. The Approach S12 is not listed. The Amazon pages opened for it were renewed watches, which are a different listing from a new S12.',
    guides: [
      { href: '/blog/best-rangefinders-2026/', label: 'rangefinder guide' },
      { href: '/blog/best-golf-gps-watches-2026/', label: 'GPS watch guide' },
      { href: '/blog/bushnell-tour-hybrid-review/', label: 'Tour Hybrid review' },
    ],
    picks: [
      listed({
        product: 'Bushnell Tour Hybrid',
        note: 'The Tour Hybrid review makes the one-device case: laser plus front, center, and back yardages. The button opens the Blue listing. Orange is another color on that same page. It is not the budget laser. A used Amazon Resale row on the same page is a different offer.',
        guideHref: '/blog/bushnell-tour-hybrid-review/',
        guideLabel: 'Tour Hybrid review',
        also: [{ href: '/blog/best-rangefinders-2026/', label: 'rangefinder guide' }],
        url: 'https://www.amazon.com/dp/B0DWNKD682?tag=birdiereport-20',
        sourceAsin: 'B0DWNKD682',
        variant: 'Blue. New listing. An Amazon Resale row on the same page is a different offer.',
      }),
      listed({
        product: 'Blue Tees Series 3 Max+',
        note: 'The rangefinder guide’s slope pick, with an OLED display and a magnetic strip in the housing. That page also says it locks slower than Bushnell or Precision Pro when the flag blends into the background. The listing title is Series 3 Max+, blue, and it says slope switch, 1,000 yards, and 6X magnification.',
        guideHref: '/blog/best-rangefinders-2026/',
        guideLabel: 'rangefinder guide',
        url: 'https://www.amazon.com/dp/B09DLJ37TW?tag=birdiereport-20',
        sourceAsin: 'B09DLJ37TW',
        variant: 'Blue. Listing title: Series 3 Max+ with slope switch, 1,000 yards, 6X magnification.',
      }),
    ],
  },
  {
    id: 'carts-bags',
    title: 'Push carts and bags',
    lede: 'A push cart is for someone who walks. A cart bag is for a cart. The gift guide already separates those, and so does this page. Clicgear Model 4.0 is not listed. The Amazon pages for that name were Model 4.5 carts, and this page does not swap the model.',
    guides: [
      { href: '/blog/best-golf-push-carts-2026/', label: 'push cart guide' },
      { href: '/blog/best-golf-cart-bags-2026/', label: 'cart bag guide' },
    ],
    picks: [
      listed({
        product: 'Titleist Cart 14',
        note: 'The cart-bag guide’s easier-to-lift full-length option. The button opens the Washed Indigo / Blue Bird / White listing, model TB22CT6-441. Other current colors are on that page. Check the base against their cart.',
        guideHref: '/blog/best-golf-cart-bags-2026/',
        guideLabel: 'cart bag guide',
        url: 'https://www.amazon.com/dp/B0FKCT6B4K?tag=birdiereport-20',
        sourceAsin: 'B0FKCT6B4K',
        variant: 'Washed Indigo/Blue Bird/White. Model TB22CT6-441.',
      }),
      listed({
        product: 'TaylorMade Cart Lite',
        note: 'The same guide’s pick for golfers who ride and push. The button opens the 2025 Coral listing. The Amazon title says CARTLITE, model N3828601. That guide also says the published weight figures conflict, so this page does not pick one.',
        guideHref: '/blog/best-golf-cart-bags-2026/',
        guideLabel: 'cart bag guide',
        url: 'https://www.amazon.com/dp/B0DJ3HNGMK?tag=birdiereport-20',
        sourceAsin: 'B0DJ3HNGMK',
        variant: '2025 Coral. Model N3828601.',
      }),
    ],
  },
  {
    id: 'shoes',
    title: 'Shoes',
    lede: 'Fit comes first. The shoes guide is a research roundup. The walking-shoe guide is the page for a dry, flat round. Each shoe link is the size and color named under it.',
    guides: [
      { href: '/blog/best-golf-shoes-2026/', label: 'golf shoes guide' },
      { href: '/blog/best-golf-shoes-walking-2026/', label: 'walking shoes guide' },
    ],
    picks: [
      listed({
        product: 'FootJoy Pro/SL',
        note: 'The shoes guide’s best overall, from the published fit case: support, traction, and walking comfort. Spikeless will not match a spiked shoe in the wet, which is why the Tour360 is the other pick. This listing is size 10 Wide in Jet Black/Cobalt/White, item model Pro/SL.',
        guideHref: '/blog/best-golf-shoes-2026/',
        guideLabel: 'golf shoes guide',
        url: 'https://www.amazon.com/dp/B0FFF14RMN?tag=birdiereport-20',
        sourceAsin: 'B0FFF14RMN',
        variant: 'Size 10 Wide, Jet Black/Cobalt/White. Item model Pro/SL.',
      }),
      listed({
        product: 'adidas Tour360 24',
        note: 'That guide’s spiked pick, for dew and hills. Heavier than the spikeless shoes, and spikes are a replacement cost. Use the walking-shoe guide if the round is a walk on dry ground. This listing is size 11 in Core Black/Footwear White, item model 34DC094-OFW.',
        guideHref: '/blog/best-golf-shoes-2026/',
        guideLabel: 'golf shoes guide',
        also: [{ href: '/blog/best-golf-shoes-walking-2026/', label: 'walking shoes guide' }],
        url: 'https://www.amazon.com/dp/B0C67FF37F?tag=birdiereport-20',
        sourceAsin: 'B0C67FF37F',
        variant: 'Size 11, Core Black/Footwear White. Item model 34DC094-OFW.',
      }),
      listed({
        product: 'Callaway Coronado V3',
        note: 'The walking-shoe guide’s walking shoe. The same section says the waterproofing may last about a season of heavy use and the wet traction is mediocre. This listing is size 8.5 in Grey/Charcoal, item model CG410WBD.',
        guideHref: '/blog/best-golf-shoes-walking-2026/',
        guideLabel: 'walking shoes guide',
        url: 'https://www.amazon.com/dp/B0BLTYZM75?tag=birdiereport-20',
        sourceAsin: 'B0BLTYZM75',
        variant: 'Size 8.5, Grey/Charcoal. Item model CG410WBD.',
      }),
    ],
  },
  {
    id: 'apparel',
    title: 'Apparel and rain gear',
    lede: 'A polo and a rain jacket solve different forecasts. The HydroTour is not listed. A FootJoy HydroTour product page did not come up, so this page does not include one. The polo link is the size and color named below.',
    guides: [
      { href: '/blog/best-golf-rain-jackets-2026/', label: 'rain jacket guide' },
      { href: '/blog/best-golf-apparel-2026/', label: 'golf apparel guide' },
    ],
    picks: [
      listed({
        product: 'Nike Dri-FIT Tour Polo',
        note: 'The apparel guide’s polo for a hot round rather than a wet one. That page says it runs slightly long in the torso. Rain and a polo are different purchases. This listing is X-Large in Midnight Navy | Black (Honeycomb).',
        guideHref: '/blog/best-golf-apparel-2026/',
        guideLabel: 'golf apparel guide',
        url: 'https://www.amazon.com/dp/B0F7PSL7GW?tag=birdiereport-20',
        sourceAsin: 'B0F7PSL7GW',
        variant: 'X-Large, Midnight Navy | Black (Honeycomb).',
      }),
    ],
  },
  {
    id: 'training-aids',
    title: 'Training aids',
    lede: 'Most training aids become garage art. These two are the ones the training-aids guide actually keeps.',
    guides: [
      { href: '/blog/best-golf-training-aids-2026/', label: 'training aids guide' },
    ],
    picks: [
      listed({
        product: 'Orange Whip Trainer',
        note: 'The training-aids guide’s first pick. The Orange Whip review is the longer version: tempo and warm-up, and the counterweight fights you if you muscle it. It is a narrow job, not a full swing rebuild. This listing is the full-size 47-inch trainer, model PBS3416. The listing title is Orange Whip Golf Swing Trainer Aid.',
        guideHref: '/blog/best-golf-training-aids-2026/',
        guideLabel: 'training aids guide',
        also: [{ href: '/blog/orange-whip-trainer-review/', label: 'Orange Whip review' }],
        url: 'https://www.amazon.com/dp/B07HXTFD8D?tag=birdiereport-20',
        sourceAsin: 'B07HXTFD8D',
        variant: 'Full-size, 47 inches. Model PBS3416.',
      }),
      listed({
        product: 'Tour Striker Smart Ball',
        note: 'The same guide’s connection drill. An inflatable ball between the forearms falls out if the arms disconnect. That is the whole product. The listing title is Tour Striker Smart Ball Golf Swing Training Aid, model 3433.',
        guideHref: '/blog/best-golf-training-aids-2026/',
        guideLabel: 'training aids guide',
        url: 'https://www.amazon.com/dp/B00II5RSR2?tag=birdiereport-20',
        sourceAsin: 'B00II5RSR2',
        variant: 'Tour Striker Smart Ball. Model 3433.',
      }),
    ],
  },
  {
    id: 'gifts-stocking',
    title: 'Stocking stuffers',
    lede: 'Small enough to wrap, and already on a Birdie Report page. The Tifosi Seek FC 2.0 sits in the next section.',
    guides: [
      { href: '/blog/best-golf-gifts/', label: '2026 golf gift guide' },
    ],
    picks: [
      listed({
        product: 'FootJoy StaSof',
        note: 'The gloves guide’s all-climate default: cabretta leather and a fit it says stays consistent across pairs. It still wears out. This listing is white, medium, worn on the left hand, model 66770-M.',
        guideHref: '/blog/best-golf-gloves-2026/',
        guideLabel: 'golf gloves guide',
        url: 'https://www.amazon.com/dp/B0B9Q9BR6S?tag=birdiereport-20',
        sourceAsin: 'B0B9Q9BR6S',
        variant: 'White, medium, worn on the left hand. Model 66770-M.',
      }),
      listed({
        product: 'EyeLine Golf Putting Mirror',
        note: 'The training-aids guide’s setup mirror. Set on the ground, it shows eyes, shoulders, and the putter face. It does not read greens. The listing title is Genuine EyeLine Golf Alignment Putting Mirror, model PAM. Product details list the size as 23.25 inches long by 7 inches wide.',
        guideHref: '/blog/best-golf-training-aids-2026/',
        guideLabel: 'training aids guide',
        url: 'https://www.amazon.com/dp/B0030F4JHM?tag=birdiereport-20',
        sourceAsin: 'B0030F4JHM',
        variant: 'Model PAM. Listed size 23.25 inches long by 7 inches wide.',
      }),
    ],
  },
  {
    id: 'gifts-beyond-stocking',
    title: 'Gifts beyond stocking stuffers',
    lede: 'Still gift territory, still gear this site already covers. Buckingham and the Coronado V3 sit with the putters and the shoes.',
    guides: [
      { href: '/blog/best-golf-gifts/', label: '2026 golf gift guide' },
    ],
    picks: [
      listed({
        product: 'Tifosi Seek FC 2.0',
        note: 'The sunglasses guide’s backup pair for people who lose or break them. That page says plainly that these lenses are not Oakley or Maui Jim lenses. This listing is tortoise with brown polarized lenses.',
        guideHref: '/blog/best-golf-sunglasses-2026/',
        guideLabel: 'golf sunglasses guide',
        url: 'https://www.amazon.com/dp/B0BQCMHCY4?tag=birdiereport-20',
        sourceAsin: 'B0BQCMHCY4',
        variant: 'Tortoise, brown polarized.',
      }),
      listed({
        product: 'Gogogo Sport Vpro GS24',
        note: 'The rangefinder guide’s budget laser: slope and a flag-lock vibration. That page says the build is light plastic, with a small display and a slow lock. The listing title says Gogogo Sport Vpro GS24, white, 1,200 yards.',
        guideHref: '/blog/best-rangefinders-2026/',
        guideLabel: 'rangefinder guide',
        url: 'https://www.amazon.com/dp/B07PX9YR31?tag=birdiereport-20',
        sourceAsin: 'B07PX9YR31',
        variant: 'White. Model GS24. Listing title says 1,200 yards.',
      }),
    ],
  },
];

export function bfPicks() {
  return bfCategories.flatMap((category) => category.picks.map((pick) => ({ ...pick, categoryId: category.id, categoryTitle: category.title })));
}

export function blackFridayStructuredData({ title, description }) {
  const picks = bfPicks();
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${BF_HUB_URL}#webpage`,
        name: title,
        url: BF_HUB_URL,
        description,
        datePublished: BF_PUBLISHED,
        dateModified: BF_UPDATED,
        isPartOf: {
          '@type': 'WebSite',
          name: 'The Birdie Report',
          url: `${SITE}/`,
        },
      },
      {
        '@type': 'ItemList',
        '@id': `${BF_HUB_URL}#shortlist`,
        name: 'Black Friday 2026 golf gear shortlist',
        itemListOrder: 'https://schema.org/ItemListOrderAscending',
        numberOfItems: picks.length,
        itemListElement: picks.map((pick, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: pick.product,
          url: absolute(pick.guideHref),
        })),
      },
    ],
  };
}
