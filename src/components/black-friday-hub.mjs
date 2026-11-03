// GA4 affiliate_click placement for the Black Friday / Cyber Monday hub.
// Keep this stable so those clicks stay separate from gift guide and quick picks.
export const BF_HUB_PLACEMENT = 'bf_hub';

export const BF_HUB_PATH = '/deals/black-friday-golf-deals/';
export const BF_HUB_URL = 'https://www.birdiereport.com/deals/black-friday-golf-deals/';
export const BF_PUBLISHED = '2026-11-02';

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
    text: 'Qi35, Qi35 Max, and Qi35 Max Lite are different drivers. The senior guide is about the Lite. A cheaper head with a similar name is a different club.',
  },
  {
    title: 'Match the variant the guide named',
    text: 'Hand, loft, shaft flex, and colorway change the buy. The Cart 14 button opens the verified Washed Indigo / Blue Bird / White listing. Other colors are a different choice, and they are discussed on the cart-bag guide.',
  },
  {
    title: 'Read who is selling it',
    text: 'A new listing sold by Amazon.com is a different product page from a marketplace seller offering a used or renewed club. If the page says used, refurbished, or renewed, it is not the listing this hub is pointing at.',
  },
  {
    title: 'A lower number only helps if you wanted that club',
    text: 'Last year’s driver is a useful buy when the guide you trust already put it on the shortlist. It is not useful because a red tag showed up on a club that does not fit your speed, your miss, or your shaft.',
  },
  {
    title: 'Shoes, gloves, and apparel still have to fit',
    text: 'The wrong size is not a deal. Check the return window before you need the pair for a trip, and read the shoe or glove guide for the wet-weather limit before you buy the lighter one.',
  },
  {
    title: 'Balls follow swing speed, not the sticker',
    text: 'The balls guide sorts by swing speed. A cheaper dozen that does not match that speed is just a cheaper dozen. The Kirkland note on that page also says the usual shelf is Costco, so confirm the seller.',
  },
];

function absolute(path) {
  return new URL(path, SITE).toString();
}

export const bfCategories = [
  {
    id: 'drivers',
    title: 'Drivers',
    lede: 'Buy the driver that fits the swing you have. The senior guide and the general drivers guide are not the same shortlist, and a sale does not merge them.',
    guides: [
      { href: '/blog/best-drivers-2026/', label: 'best drivers guide' },
      { href: '/blog/best-drivers-seniors-2026/', label: 'drivers for seniors guide' },
    ],
    picks: [
      {
        product: 'TaylorMade Stealth 2 Plus',
        note: 'The drivers guide ranks the Stealth 2 Plus as its best overall: workable, and forgiving enough that a miss does not become a different hole. It is not the lightweight senior shortlist.',
        guideHref: '/blog/best-drivers-2026/',
        guideLabel: 'best drivers guide',
        url: 'https://www.amazon.com/s?k=TaylorMade+Stealth+2+Plus+Driver&tag=birdiereport-20',
      },
      {
        product: 'Callaway Elyte Max Fast',
        note: 'The senior driver guide ranks the Elyte Max Fast first for swing speeds around 70–85 mph. The dedicated review is the longer version of that case. A standard-weight head on sale is a different driver.',
        guideHref: '/blog/best-drivers-seniors-2026/',
        guideLabel: 'drivers for seniors guide',
        also: [{ href: '/blog/callaway-elyte-max-fast-driver-review/', label: 'Elyte Max Fast review' }],
        url: 'https://www.amazon.com/s?k=Callaway+Elyte+Max+Fast+Driver&tag=birdiereport-20',
      },
    ],
  },
  {
    id: 'irons',
    title: 'Irons',
    lede: 'High-handicap irons are a forgiveness decision. A discount on a players’ set does not become a game-improvement set because the calendar says November.',
    guides: [
      { href: '/blog/best-irons-high-handicappers-2026/', label: 'irons for high handicappers guide' },
    ],
    picks: [
      {
        product: 'Callaway Elyte Irons',
        note: 'The high-handicap irons guide calls the Elyte its best overall: distance and a wide sole, at the top of that page’s set list. Read it before you chase a cheaper set with a similar name.',
        guideHref: '/blog/best-irons-high-handicappers-2026/',
        guideLabel: 'irons for high handicappers guide',
        url: 'https://www.amazon.com/s?k=Callaway+Elyte+Irons&tag=birdiereport-20',
      },
      {
        product: 'Wilson Dynapower Irons',
        note: 'Same guide’s budget set, with progressive long-iron and short-iron shaping. The page treats it as the budget shortlist, not the flagship.',
        guideHref: '/blog/best-irons-high-handicappers-2026/',
        guideLabel: 'irons for high handicappers guide',
        url: 'https://www.amazon.com/s?k=Wilson+Dynapower+Irons&tag=birdiereport-20',
      },
    ],
  },
  {
    id: 'putters',
    title: 'Putters',
    lede: 'A blade and a mallet are different answers. The putter guide is for someone who can aim a blade. The high-handicap guide is for someone who needs the miss to stay online.',
    guides: [
      { href: '/blog/best-putters-2026/', label: 'putter guide' },
      { href: '/blog/best-putters-high-handicappers-2026/', label: 'putters for high handicappers guide' },
    ],
    picks: [
      {
        product: 'Odyssey White Hot OG 2-Ball',
        note: 'The high-handicap putter guide’s best overall. Those two circles are the alignment system, and that page says a blade will not bail out a miss the same way.',
        guideHref: '/blog/best-putters-high-handicappers-2026/',
        guideLabel: 'putters for high handicappers guide',
        url: 'https://www.amazon.com/s?k=Odyssey+White+Hot+OG+2-Ball+Putter&tag=birdiereport-20',
      },
      {
        product: 'Odyssey DFX Seven',
        note: 'The start-here mallet on that same guide: oversized head, soft insert, one sightline. Some players on the page find the insert too muted.',
        guideHref: '/blog/best-putters-high-handicappers-2026/',
        guideLabel: 'putters for high handicappers guide',
        url: 'https://www.amazon.com/s?k=Odyssey+DFX+Seven+Putter&tag=birdiereport-20',
      },
      {
        product: 'Scotty Cameron Super Select Newport 2',
        note: 'The putter guide’s best overall, and a blade. That page says it exposes a golfer who needs forgiveness. High handicappers stay with the mallet guide.',
        guideHref: '/blog/best-putters-2026/',
        guideLabel: 'putter guide',
        url: 'https://www.amazon.com/s?k=Scotty+Cameron+Super+Select+Newport+2&tag=birdiereport-20',
      },
    ],
  },
  {
    id: 'balls',
    title: 'Golf balls',
    lede: 'The ball is every shot, not fourteen drives. Match the swing speed on the balls guide, then check today’s price.',
    guides: [
      { href: '/blog/best-golf-balls-2026/', label: 'golf balls guide' },
    ],
    picks: [
      {
        product: 'Titleist Pro V1',
        note: 'The balls guide’s best overall for a golfer who finishes the dozen. It calls the Pro V1 the wide-fit premium ball. It is the wrong buy if the dozen ends up in the water.',
        guideHref: '/blog/best-golf-balls-2026/',
        guideLabel: 'golf balls guide',
        url: 'https://www.amazon.com/s?k=Titleist+Pro+V1&tag=birdiereport-20',
      },
      {
        product: 'Kirkland Signature V3',
        note: 'The same guide’s budget ball. It calls the greenside spin impressive for the money and the consistency short of Pro V1. The guide says the usual shelf is Costco, so confirm the seller on whatever page opens.',
        guideHref: '/blog/best-golf-balls-2026/',
        guideLabel: 'golf balls guide',
        url: 'https://www.amazon.com/s?k=Kirkland+Signature+V3&tag=birdiereport-20',
      },
    ],
  },
  {
    id: 'rangefinders',
    title: 'Rangefinders and GPS',
    lede: 'A laser and a watch answer different questions. The rangefinder guide is the laser list. The GPS watch guide is the wrist list. The Tour Hybrid review is the one-device case.',
    guides: [
      { href: '/blog/best-rangefinders-2026/', label: 'rangefinder guide' },
      { href: '/blog/best-golf-gps-watches-2026/', label: 'GPS watch guide' },
      { href: '/blog/bushnell-tour-hybrid-review/', label: 'Tour Hybrid review' },
    ],
    picks: [
      {
        product: 'Bushnell Tour Hybrid',
        note: 'The Tour Hybrid review makes the one-device case: laser plus front, center, and back yardages. The button opens the verified Blue listing. Orange is on that same page. It is not the budget laser.',
        guideHref: '/blog/bushnell-tour-hybrid-review/',
        guideLabel: 'Tour Hybrid review',
        also: [{ href: '/blog/best-rangefinders-2026/', label: 'rangefinder guide' }],
        url: 'https://www.amazon.com/dp/B0DWNKD682?tag=birdiereport-20',
      },
      {
        product: 'Blue Tees Series 3 Max',
        note: 'The rangefinder guide’s under-$200 slope pick, with an OLED display and a magnetic strip in the housing. That page also says it locks slower than Bushnell or Precision Pro when the flag blends into the background.',
        guideHref: '/blog/best-rangefinders-2026/',
        guideLabel: 'rangefinder guide',
        url: 'https://www.amazon.com/s?k=Blue+Tees+Series+3+Max&tag=birdiereport-20',
      },
      {
        product: 'Garmin Approach S12',
        note: 'The GPS watch guide’s no-frills pick. The S12 review is the longer version: front, middle, and back from buttons, no color maps, and no slope. Wrong watch if they want a smartwatch.',
        guideHref: '/blog/best-golf-gps-watches-2026/',
        guideLabel: 'GPS watch guide',
        also: [{ href: '/blog/garmin-approach-s12-review/', label: 'Approach S12 review' }],
        url: 'https://www.amazon.com/s?k=Garmin+Approach+S12+Golf+Watch&tag=birdiereport-20',
      },
    ],
  },
  {
    id: 'carts-bags',
    title: 'Push carts and bags',
    lede: 'A push cart is for someone who walks. A cart bag is for a cart. The gift guide already separates those, and so does this page.',
    guides: [
      { href: '/blog/best-golf-push-carts-2026/', label: 'push cart guide' },
      { href: '/blog/best-golf-cart-bags-2026/', label: 'cart bag guide' },
    ],
    picks: [
      {
        product: 'Clicgear Model 4.0+',
        note: 'The push-cart guide’s top rank: a brake that locks on hills, and a cart it treats as a long-term buy rather than a one-season experiment. It is heavier than the budget folders.',
        guideHref: '/blog/best-golf-push-carts-2026/',
        guideLabel: 'push cart guide',
        url: 'https://www.amazon.com/s?k=Clicgear+Model+4.0+Golf+Push+Cart&tag=birdiereport-20',
      },
      {
        product: 'Titleist Cart 14',
        note: 'The cart-bag guide’s easier-to-lift full-length option. The button opens the verified Washed Indigo / Blue Bird / White listing. Other current colors are on that page. Check the base against their cart.',
        guideHref: '/blog/best-golf-cart-bags-2026/',
        guideLabel: 'cart bag guide',
        url: 'https://www.amazon.com/dp/B0FKCT6B4K?tag=birdiereport-20',
      },
      {
        product: 'TaylorMade Cart Lite',
        note: 'The same guide’s pick for golfers who ride and push. The button opens the verified 2025 Coral listing. That guide also says the published weight figures conflict, so this page does not pick one.',
        guideHref: '/blog/best-golf-cart-bags-2026/',
        guideLabel: 'cart bag guide',
        url: 'https://www.amazon.com/dp/B0DJ3HNGMK?tag=birdiereport-20',
      },
    ],
  },
  {
    id: 'shoes',
    title: 'Shoes',
    lede: 'Fit beats a weekend price. The shoes guide is hands-on. The walking-shoe guide is the page for a dry, flat round.',
    guides: [
      { href: '/blog/best-golf-shoes-2026/', label: 'golf shoes guide' },
      { href: '/blog/best-golf-shoes-walking-2026/', label: 'walking shoes guide' },
    ],
    picks: [
      {
        product: 'FootJoy Pro/SL',
        note: 'The shoes guide’s best overall, from hands-on rounds: support, traction, and walking comfort. Spikeless will not match a spiked shoe in the wet, which is why the Tour360 is the other pick.',
        guideHref: '/blog/best-golf-shoes-2026/',
        guideLabel: 'golf shoes guide',
        url: 'https://www.amazon.com/s?k=FootJoy+Pro+SL&tag=birdiereport-20',
      },
      {
        product: 'adidas Tour360 24',
        note: 'That guide’s spiked pick, for dew and hills. Heavier than the spikeless shoes, and spikes are a replacement cost. Use the walking-shoe guide if the round is a walk on dry ground.',
        guideHref: '/blog/best-golf-shoes-2026/',
        guideLabel: 'golf shoes guide',
        also: [{ href: '/blog/best-golf-shoes-walking-2026/', label: 'walking shoes guide' }],
        url: 'https://www.amazon.com/s?k=adidas+Tour360+24&tag=birdiereport-20',
      },
    ],
  },
  {
    id: 'apparel',
    title: 'Apparel and rain gear',
    lede: 'A polo and a rain jacket solve different forecasts. Buy the one the week actually needs.',
    guides: [
      { href: '/blog/best-golf-rain-jackets-2026/', label: 'rain jacket guide' },
      { href: '/blog/best-golf-apparel-2026/', label: 'golf apparel guide' },
    ],
    picks: [
      {
        product: 'FootJoy HydroTour',
        note: 'The rain-jacket guide’s best overall: seam-sealed, with stretch that page says does not fight the swing. A jacket you hope to leave in the bag is still the right buy when the forecast is the reason you are shopping.',
        guideHref: '/blog/best-golf-rain-jackets-2026/',
        guideLabel: 'rain jacket guide',
        url: 'https://www.amazon.com/s?k=FootJoy+HydroTour+Rain+Jacket&tag=birdiereport-20',
      },
      {
        product: 'Nike Dri-FIT Tour Polo',
        note: 'The apparel guide’s polo for a hot round rather than a wet one. That page says it runs slightly long in the torso. Rain and a polo are different purchases.',
        guideHref: '/blog/best-golf-apparel-2026/',
        guideLabel: 'golf apparel guide',
        url: 'https://www.amazon.com/s?k=Nike+Dri-FIT+Tour+Golf+Polo&tag=birdiereport-20',
      },
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
      {
        product: 'Orange Whip Trainer',
        note: 'The training-aids guide’s first pick. The Orange Whip review is the longer version: tempo and warm-up, and the counterweight fights you if you muscle it. It is a narrow job, not a full swing rebuild.',
        guideHref: '/blog/best-golf-training-aids-2026/',
        guideLabel: 'training aids guide',
        also: [{ href: '/blog/orange-whip-trainer-review/', label: 'Orange Whip review' }],
        url: 'https://www.amazon.com/s?k=Orange+Whip+Golf+Swing+Trainer&tag=birdiereport-20',
      },
      {
        product: 'Tour Striker Smart Ball',
        note: 'The same guide’s connection drill. An inflatable ball between the forearms falls out if the arms disconnect. That is the whole product.',
        guideHref: '/blog/best-golf-training-aids-2026/',
        guideLabel: 'training aids guide',
        url: 'https://www.amazon.com/s?k=Tour+Striker+Smart+Ball&tag=birdiereport-20',
      },
    ],
  },
  {
    id: 'gifts-under-50',
    title: 'Gifts under $50',
    lede: 'Small enough to wrap, and already on a Birdie Report page. The gift guide files the same kind of gear by the prices those pages published. This section does not add a new price.',
    guides: [
      { href: '/blog/best-golf-gifts/', label: '2026 golf gift guide' },
    ],
    picks: [
      {
        product: 'FootJoy StaSof',
        note: 'The gloves guide’s all-climate default: cabretta leather and a fit it says stays consistent across pairs. It still wears out.',
        guideHref: '/blog/best-golf-gloves-2026/',
        guideLabel: 'golf gloves guide',
        url: 'https://www.amazon.com/s?k=FootJoy+StaSof+Golf+Glove&tag=birdiereport-20',
      },
      {
        product: 'Tifosi Seek FC 2.0',
        note: 'The sunglasses guide’s backup pair for people who lose or break them. That page says plainly that these lenses are not Oakley or Maui Jim lenses.',
        guideHref: '/blog/best-golf-sunglasses-2026/',
        guideLabel: 'golf sunglasses guide',
        url: 'https://www.amazon.com/s?k=Tifosi+Seek+FC+2.0+Golf+Sunglasses&tag=birdiereport-20',
      },
      {
        product: 'Eyeline Golf Putting Mirror',
        note: 'The training-aids guide’s setup mirror. Set on the ground, it shows eyes, shoulders, and the putter face. It does not read greens.',
        guideHref: '/blog/best-golf-training-aids-2026/',
        guideLabel: 'training aids guide',
        url: 'https://www.amazon.com/s?k=Eyeline+Golf+Putting+Mirror&tag=birdiereport-20',
      },
    ],
  },
  {
    id: 'gifts-under-100',
    title: 'Gifts under $100',
    lede: 'Still gift territory, still gear this site already covers. Confirm the model before you wrap it. The gift guide is the budget sort of the same idea.',
    guides: [
      { href: '/blog/best-golf-gifts/', label: '2026 golf gift guide' },
    ],
    picks: [
      {
        product: 'Wilson Infinite Buckingham',
        note: 'The high-handicap putter guide’s counterbalanced mid-mallet for someone who will not overpay for a putter. That page also says it is not as forgiving as a full mallet.',
        guideHref: '/blog/best-putters-high-handicappers-2026/',
        guideLabel: 'putters for high handicappers guide',
        url: 'https://www.amazon.com/s?k=Wilson+Infinite+Buckingham+Putter&tag=birdiereport-20',
      },
      {
        product: 'Gogogo Sport Vpro GS24',
        note: 'The rangefinder guide’s budget laser: slope and a flag-lock vibration. That page says the build feels like the price: light plastic, a small display, and a slow lock.',
        guideHref: '/blog/best-rangefinders-2026/',
        guideLabel: 'rangefinder guide',
        url: 'https://www.amazon.com/s?k=Gogogo+Sport+Vpro+GS24&tag=birdiereport-20',
      },
      {
        product: 'Callaway Coronado v3',
        note: 'The walking-shoe guide’s budget walking shoe. The same section says the waterproofing may last about a season of heavy use and the wet traction is mediocre.',
        guideHref: '/blog/best-golf-shoes-walking-2026/',
        guideLabel: 'walking shoes guide',
        url: 'https://www.amazon.com/s?k=Callaway+Coronado+v3+Golf+Shoes&tag=birdiereport-20',
      },
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
        dateModified: BF_PUBLISHED,
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
