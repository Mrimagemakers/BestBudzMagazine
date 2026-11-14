// Budz Marketplace content. Edit this file to change shops, products and links;
// the 3D district reads it at load time. No purchases happen inside the world.

export const MARKET_CONFIG = {
  // Best Budz merch/fashion/art store (e.g. a Shopify URL). null = "coming soon".
  shopUrl: null,
  // Authorized cannabis retailers. Add ONLY partners you have confirmed hold a
  // current license in that jurisdiction. Links show only to visitors who pick
  // the matching jurisdiction, and only when verified is true.
  // Example: {name:'Retailer name', url:'https://…', jurisdiction:'California', license:'C10-…', verified:true}
  retailers: []
};

export const JURISDICTIONS = ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','District of Columbia','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming','Outside the United States'];

export const SHOPS = [
  {
    id:'dispensary', name:'Dispensary Showroom', tagline:'Learn before you shop', accent:0x8fbf6a, link:'retailer',
    about:'An education-first showroom. Explore each product category, learn how to read a label and a lab report, then find an authorized retailer where cannabis is legal for adults.',
    host:['Rae','Showroom educator','Welcome to the showroom. Nothing is sold here. Tap any display to learn how that category works and what to look for on the label.'],
    products:[
      {name:'Flower', category:'Category guide', model:'jar', blurb:'Dried cannabis buds, sold by weight.',
       details:['Potency and terpene content vary by batch. Only a batch-specific certificate of analysis (COA) from a licensed lab tells you what is in it.','Strain names are not standardized; the same name can mean different products at different stores.','Look for a harvest or package date, the lot number and the testing lab on the label.']},
      {name:'Pre-rolls', category:'Category guide', model:'preroll', blurb:'Flower rolled and ready, sold singly or in packs.',
       details:['Check net weight per pre-roll on the label.','"Infused" pre-rolls contain added concentrate and are considerably stronger than plain flower.','Smoke of any kind irritates the lungs.']},
      {name:'Edibles', category:'Category guide', model:'edible', blurb:'Foods and drinks made with cannabis.',
       details:['Eaten cannabis takes longer to take effect than inhaled cannabis, often 30 minutes to 2 hours, and effects can last many hours. That delay is a common reason people take too much.','Per-serving and per-package amounts must be printed on legal packaging.','Keep edibles locked and out of reach of children and pets; they can look like ordinary snacks. If a child eats one, call Poison Control (1-800-222-1222) or 911.']},
      {name:'Tinctures', category:'Category guide', model:'tincture', blurb:'Liquid extracts in a dropper bottle.',
       details:['The label lists cannabinoid content per bottle and per measured serving.','How quickly effects begin depends on whether it is swallowed or held under the tongue.','Store like a medicine: closed, labeled and away from kids.']},
      {name:'Topicals', category:'Category guide', model:'topical', blurb:'Balms, lotions and creams applied to skin.',
       details:['Research on topical cannabis products is limited, and wellness claims on packaging are not FDA-evaluated.','Patch-test new skin products and check the ingredient list for allergens.']},
      {name:'Vape cartridges', category:'Category guide', model:'vape', blurb:'Cannabis oil heated by a battery device.',
       details:['In 2019–2020 the CDC tied an outbreak of serious lung injuries (EVALI) mainly to vitamin E acetate in THC vapes from informal sources.','Buy only from licensed, lab-tested sources and never add substances to a cartridge.']},
      {name:'Lab report (COA)', category:'Label literacy', model:'coa', blurb:'How to read a certificate of analysis.',
       details:['Match the lot or batch number on the package to the COA.','Check the testing date, the lab name and accreditation, cannabinoid results, and pass/fail screens for pesticides, heavy metals, microbes and solvents.','A missing or mismatched COA is a red flag.']}
    ]
  },
  {
    id:'accessories', name:'Accessories', tagline:'Gear, storage & safety', accent:0xc9a36a, link:'shop',
    about:'Storage, grinders, trays and lockboxes, displayed in 3D. Availability of accessories varies by location.',
    host:['Theo','Gear specialist','Storage is the underrated accessory. Smell-proof, airtight and lockable keeps things fresh and keeps kids out.'],
    products:[
      {name:'Smell-proof stash jar', category:'Storage', model:'stashjar', blurb:'Airtight, UV-blocking glass with a gasket lid.', details:['Airtight, dark storage helps preserve aroma.','Label anything you store; keep it out of reach of children.']},
      {name:'Four-piece grinder', category:'Prep', model:'grinder', blurb:'Machined aluminum with a pollen screen.', details:['Clean with isopropyl alcohol and a soft brush.']},
      {name:'Rolling tray', category:'Prep', model:'tray', blurb:'Raised-edge metal tray in Best Budz green.', details:['Concept design for the Best Budz accessories line.']},
      {name:'Lockable stash box', category:'Safety', model:'stashbox', blurb:'Walnut box with a combination lock.', details:['Locked storage is the simplest way to keep cannabis away from kids, pets and guests.']},
      {name:'Humidity packs', category:'Storage', model:'humidity', blurb:'Two-way humidity control packets.', details:['Help keep stored flower from drying out or getting too damp.']}
    ]
  },
  {
    id:'fashion', name:'Fashion Boutique', tagline:'Higher culture, worn well', accent:0xd48f74, link:'shop',
    about:'The Best Budz clothing line on mannequins and racks. Pieces shown are design previews for the magazine’s apparel line.',
    host:['Nia','Boutique stylist','Everything here is from the Best Budz design studio. Tap a piece to see it up close.'],
    products:[
      {name:'Higher Culture hoodie', category:'Apparel', model:'hoodie', color:0x2f5a46, blurb:'Heavyweight fleece, embroidered BB monogram.', details:['Design preview · sizes and fabric to be confirmed.']},
      {name:'BB logo tee', category:'Apparel', model:'tee', color:0xf2ead6, blurb:'Garment-dyed cotton, front logo print.', details:['Design preview.']},
      {name:'Script dad hat', category:'Headwear', model:'cap', color:0x18241e, blurb:'Unstructured six-panel with script embroidery.', details:['Design preview.']},
      {name:'Lounge joggers', category:'Apparel', model:'joggers', color:0x6d7b5f, blurb:'Soft terry joggers for lounge season.', details:['Design preview.']},
      {name:'Court sneaker concept', category:'Footwear', model:'sneaker', color:0xece5d3, blurb:'Low-top concept with lime accents.', details:['Concept only; not in production.']}
    ]
  },
  {
    id:'merch', name:'Best Budz Shop', tagline:'Official magazine merch', accent:0xd5ee83, link:'shop',
    about:'Back issues, prints and branded goods from Best Budz Magazine.',
    host:['Marcus','Shop host','Back issues are on the front table. Prints and mugs on the back wall.'],
    products:[
      {name:'Best Budz Magazine · Issue 01', category:'Print', model:'magazine', blurb:'The immersive issue: culture, music, film and politics.', details:['Collector print edition.']},
      {name:'Logo mug', category:'Home', model:'mug', blurb:'Stoneware mug, 14 oz.', details:['Merch preview.']},
      {name:'Canvas tote', category:'Carry', model:'tote', blurb:'Heavy canvas tote with BB print.', details:['Merch preview.']},
      {name:'Cover art print', category:'Art print', model:'poster', blurb:'Giclée print of the Issue 01 cover.', details:['Merch preview.']},
      {name:'Sticker pack', category:'Small goods', model:'stickers', blurb:'Six die-cut vinyl stickers.', details:['Merch preview.']}
    ]
  },
  {
    id:'gallery', name:'Art Gallery', tagline:'Culture on the walls', accent:0x9c8db6, link:'shop',
    about:'Rotating exhibits from artists in the Best Budz community. Each slot is open for featured artist submissions.',
    host:['Imani','Gallery curator','This season’s wall is open for submissions. Tap a piece to see the placeholder details.'],
    products:[
      {name:'Open call · Wall 01', category:'Painting', model:'art', seed:3, wall:[-2.6,-4.25], blurb:'Featured artist slot.', details:['Placeholder artwork generated for the preview.']},
      {name:'Open call · Wall 02', category:'Painting', model:'art', seed:9, wall:[0,-4.25], blurb:'Featured artist slot.', details:['Placeholder artwork generated for the preview.']},
      {name:'Open call · Wall 03', category:'Painting', model:'art', seed:17, wall:[2.6,-4.25], blurb:'Featured artist slot.', details:['Placeholder artwork generated for the preview.']},
      {name:'Open call · Sculpture', category:'Sculpture', model:'sculpture', slot:4, blurb:'Featured sculpture slot.', details:['Placeholder sculpture.']}
    ]
  }
];
