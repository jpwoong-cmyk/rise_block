/*
  Berlayar Rise public-source seed data — V1.3.

  DATA FIDELITY RULES
  - verified: directly supported by an HDB/public brochure table, unit-distribution chart,
    site-plan label, or an explicitly named public source.
  - crossChecked: supported by a secondary public project guide and consistent with the
    published site-plan material.
  - schematic: x/z coordinates and simplified 3D footprints are visual interpretations
    for orientation only. They are NOT surveyed coordinates or BIM geometry.
  - live flat status is NOT sourced from HDB. All units begin as "untracked".
*/
window.BERLAYAR_DATA = {
  version: "1.4",

  project: {
    name: "Berlayar Rise",
    town: "Bukit Merah",
    launch: "June 2026 BTO",
    classification: "Prime",
    totalUnits: 1976,
    residentialBlocks: 6,
    subsidyRecoveryPct: 14,
    statusBaseline: "untracked",
    note: "Community tracker; not affiliated with HDB. No Singpass access and no HDB live-availability feed.",
    geometryNote: "Estate geometry is a source-plan sketch for orientation, not a survey or BIM model."
  },

  flatTypes: {
    "2R-T1": {
      label: "2-Room Flexi Type 1",
      total: 172,
      area: 40,
      internalArea: 38,
      price99: [247000, 341000],
      color: 0xe8a07d,
      sourcePlanUrl: "https://stacked-editorial.sgp1.digitaloceanspaces.com/editorial/wp-content/uploads/2026/06/17162648/Berlayar-Rise-2-Room-Flexi-Type-1.jpg",
      rooms: ["Living / dining", "Bedroom", "Kitchen", "Bath / WC", "Household shelter", "Air-con ledge"],
      layoutNote: "Layout preview only. Not to scale.",
      plan: "2R-T1"
    },
    "2R-T2": {
      label: "2-Room Flexi Type 2",
      total: 644,
      area: 48,
      internalArea: 46,
      price99: [296000, 406000],
      color: 0xd96d5d,
      sourcePlanUrl: "https://stacked-editorial.sgp1.digitaloceanspaces.com/editorial/wp-content/uploads/2026/06/17162703/Berlayar-Rise-2-Room-Flexi-Type-2.jpg",
      rooms: ["Living / dining", "Bedroom", "Flexible space", "Kitchen", "Bath / WC", "Household shelter", "Air-con ledge"],
      layoutNote: "Layout preview only. Not to scale.",
      plan: "2R-T2"
    },
    "3R": {
      label: "3-Room",
      total: 172,
      area: 67,
      internalArea: 64,
      price99: [435000, 591000],
      color: 0x91c779,
      sourcePlanUrl: "https://stacked-editorial.sgp1.digitaloceanspaces.com/editorial/wp-content/uploads/2026/06/17162714/Berlayar-Rise-3-Room-1600x1132.jpg",
      rooms: ["Living / dining", "Bedroom", "Main bedroom", "Dry kitchen", "Kitchen / utility", "2 Bath / WC", "Household shelter", "Air-con ledge"],
      layoutNote: "Layout preview only. Not to scale.",
      plan: "3R"
    },
    "4R": {
      label: "4-Room",
      total: 988,
      area: 90,
      internalArea: 86,
      price99: [592000, 810000],
      color: 0xe2d15a,
      sourcePlanUrl: "https://stacked-editorial.sgp1.digitaloceanspaces.com/editorial/wp-content/uploads/2026/06/17162814/Berlayar-Rise-4-Room-1600x1132.jpg",
      rooms: ["Living / dining", "2 Bedrooms", "Main bedroom", "Kitchen", "Service yard", "2 Bath / WC", "Household shelter", "Air-con ledge"],
      layoutNote: "Layout preview only. Not to scale.",
      plan: "4R"
    }
  },

  shortLease2R: {
    "2R-T1": {15:[83000,114000],20:[99000,136000],25:[113000,155000],30:[124000,171000],35:[133000,184000],40:[141000,195000],45:[148000,204000]},
    "2R-T2": {15:[99000,136000],20:[119000,163000],25:[135000,185000],30:[148000,203000],35:[160000,219000],40:[169000,232000],45:[177000,243000]}
  },

  /*
    Unit-distribution fields below are transcribed from the public Berlayar Rise
    elevation / unit-distribution charts. Each generated total is validated in app.js.
    `terraceLevels` are non-residential sky-terrace levels shown in those charts.
    `roofGardenAtTop` is used only where an accessible roof garden is explicitly shown.
  */
  blocks: [
    {
      id: "200A", storeys: 46, total: 344, waitMonths: 54,
      floors: { min: 2, max: 46, terraceLevels: [9,29] },
      roofGardenAtTop: false,
      stacks: [
        {no:"101",type:"3R"},{no:"103",type:"3R"},{no:"105",type:"2R-T1"},{no:"107",type:"2R-T1"},
        {no:"109",type:"4R"},{no:"111",type:"4R"},{no:"113",type:"4R"},{no:"115",type:"4R"}
      ],
      model: { x:-15.4, z:-10.8, rotationY:-0.07, width:8.8, depth:3.5 },
      distributionSource: "elevation-200"
    },
    {
      id: "200B", storeys: 48, total: 360, waitMonths: 54,
      floors: { min: 2, max: 48, terraceLevels: [20,40] },
      roofGardenAtTop: false,
      stacks: [
        {no:"117",type:"2R-T2"},{no:"119",type:"2R-T2"},{no:"121",type:"2R-T2"},{no:"123",type:"2R-T2"},
        {no:"125",type:"4R"},{no:"127",type:"4R"},{no:"129",type:"4R"},{no:"131",type:"4R"}
      ],
      model: { x:-3.4, z:-13.2, rotationY:0.05, width:9.2, depth:3.5 },
      distributionSource: "elevation-200"
    },
    {
      id: "201A", storeys: 49, total: 368, waitMonths: 54,
      floors: { min: 2, max: 49, terraceLevels: [9,29] },
      roofGardenAtTop: true,
      roofGardenLabel: "Accessible roof garden shown at the top of the published elevation",
      stacks: [
        {no:"133",type:"2R-T2"},{no:"135",type:"2R-T2"},{no:"137",type:"2R-T2"},{no:"139",type:"2R-T2"},
        {no:"141",type:"4R"},{no:"143",type:"4R"},{no:"145",type:"4R"},{no:"147",type:"4R"}
      ],
      model: { x:9.0, z:-10.8, rotationY:0.08, width:9.1, depth:3.5 },
      distributionSource: "elevation-201"
    },
    {
      id: "201B", storeys: 46, total: 344, waitMonths: 49,
      floors: { min: 2, max: 46, terraceLevels: [22,36] },
      roofGardenAtTop: true,
      roofGardenLabel: "Accessible roof garden shown at the top of the published elevation",
      stacks: [
        {no:"149",type:"4R"},{no:"151",type:"4R"},{no:"153",type:"4R"},{no:"155",type:"4R"},
        {no:"157",type:"2R-T1"},{no:"159",type:"2R-T1"},{no:"161",type:"3R"},{no:"163",type:"3R"}
      ],
      model: { x:-0.4, z:1.0, rotationY:-0.10, width:9.2, depth:3.6 },
      groundAmenities: ["Residents’ Network Centre"],
      distributionSource: "elevation-201"
    },
    {
      id: "204A", storeys: 39, total: 304, waitMonths: 49,
      floors: { min: 2, max: 39, terraceLevels: [] },
      roofGardenAtTop: false,
      stacks: [
        {no:"100",type:"4R"},{no:"102",type:"4R"},{no:"104",type:"4R"},{no:"106",type:"4R"},
        {no:"108",type:"2R-T2"},{no:"110",type:"2R-T2"},{no:"112",type:"2R-T2"},{no:"114",type:"2R-T2"}
      ],
      model: { x:-5.8, z:12.6, rotationY:0.05, width:9.0, depth:3.5 },
      distributionSource: "elevation-204"
    },
    {
      id: "204B", storeys: 33, total: 256, waitMonths: 49,
      floors: { min: 2, max: 33, terraceLevels: [] },
      roofGardenAtTop: true,
      roofGardenLabel: "Accessible roof garden shown at the top of the published elevation",
      stacks: [
        {no:"116",type:"4R"},{no:"118",type:"4R"},{no:"120",type:"4R"},{no:"122",type:"4R"},
        {no:"124",type:"2R-T2"},{no:"126",type:"2R-T2"},{no:"128",type:"2R-T2"},{no:"130",type:"2R-T2"}
      ],
      model: { x:-16.5, z:17.8, rotationY:-0.10, width:9.0, depth:3.5 },
      distributionSource: "elevation-204"
    }
  ],

  /*
    Site-feature coordinates are deliberately approximate. Names/existence are source-backed;
    the x/z positions are a hand-built orientation sketch based on the published site plan.
  */
  siteFeatures: [
    {
      id: "mrt", category: "transport", name: "Telok Blangah MRT Station", short: "Telok Blangah MRT",
      x: 2.2, z: -31.2, height: 1.7, confidence: "verified",
      detail: "The published Berlayar Rise site plan places Telok Blangah MRT Station immediately north of the project, beyond Telok Blangah Road / West Coast Highway.",
      geometry: "schematic", sourceIds: ["brochure","masterplan"]
    },
    {
      id: "preschool", category: "community", name: "3-storey Preschool", short: "3-storey preschool",
      x: 20.7, z: -5.2, height: 2.5, confidence: "verified",
      detail: "The site plan identifies a 3-storey preschool with a non-accessible green roof.",
      geometry: "schematic", sourceIds: ["brochure"]
    },
    {
      id: "mscp", category: "amenity", name: "Block 203 · 6-storey MSCP", short: "203 · MSCP",
      x: 12.1, z: 8.1, height: 3.2, confidence: "verified",
      detail: "The published plan identifies Block 203 as a 6-storey multi-storey car park with an accessible roof garden. Public project guides also list first-storey commercial uses including an eating house, supermarket, restaurants/cafes and shops.",
      geometry: "schematic", sourceIds: ["brochure","dollarsandsense"]
    },
    {
      id: "rn", category: "community", name: "Residents’ Network Centre", short: "RN Centre",
      x: 0.4, z: 3.0, height: 0.8, confidence: "verified",
      detail: "The published unit-distribution chart marks a Residents’ Network Centre at the ground level of Block 201B; public project guides also identify it at the first storey of Block 201B.",
      geometry: "schematic", sourceIds: ["elevation-201","dollarsandsense"]
    },
    {
      id: "community-zone", category: "community", name: "Community / communal spaces", short: "Community space",
      x: -18.0, z: 2.6, height: 0.8, confidence: "verified",
      detail: "The site plan includes precinct pavilion(s), drop-off porch(es) and space reserved for future community use. The marker groups these communal uses together.",
      geometry: "schematic", sourceIds: ["brochure"]
    },
    {
      id: "play", category: "recreation", name: "Children’s playground areas", short: "Play areas",
      x: -13.4, z: 5.7, height: 0.5, confidence: "verified",
      detail: "Children’s playground facilities are identified in the site-plan legend. They are grouped here as one marker.",
      geometry: "schematic", sourceIds: ["brochure","design"]
    },
    {
      id: "fitness", category: "recreation", name: "Adult & elderly fitness areas", short: "Fitness areas",
      x: 4.7, z: 8.2, height: 0.5, confidence: "verified",
      detail: "Adult and elderly fitness stations are identified in the site-plan legend.",
      geometry: "schematic", sourceIds: ["brochure"]
    },
    {
      id: "hardcourt", category: "recreation", name: "Hardcourt", short: "Hardcourt",
      x: 18.2, z: 1.0, height: 0.3, confidence: "verified",
      detail: "A hardcourt is included in the site-plan play-facility legend.",
      geometry: "schematic", sourceIds: ["brochure"]
    },
    {
      id: "roofshelters", category: "recreation", name: "MSCP roof-garden shelters", short: "Roof shelters",
      x: 12.1, z: 9.8, height: 3.8, confidence: "crossChecked",
      detail: "Public project material describes shelters and recreation facilities on the MSCP roof garden.",
      geometry: "schematic", sourceIds: ["stacked"]
    },
    {
      id: "linkways", category: "community", name: "Sheltered linkway network", short: "Sheltered links",
      x: 3.3, z: -3.0, height: 1.1, confidence: "crossChecked",
      detail: "Public project analysis states that sheltered linkways connect the residential blocks to the MSCP, Telok Blangah MRT and future bus stops.",
      geometry: "schematic", sourceIds: ["brochure","stacked"]
    },
    {
      id: "future-bus-west", category: "transport", name: "Future bus stop · west side", short: "Future bus stop",
      x: -28.2, z: 6.6, height: 0.4, confidence: "crossChecked",
      detail: "Public site-plan analysis describes three future bus stops serving the project.",
      geometry: "schematic", sourceIds: ["stacked","brochure"]
    },
    {
      id: "future-bus-south-1", category: "transport", name: "Future bus stop · Berlayar Drive", short: "Future bus stop",
      x: -1.5, z: 29.0, height: 0.4, confidence: "crossChecked",
      detail: "One of three future bus stops shown in public site-plan material.",
      geometry: "schematic", sourceIds: ["stacked","brochure"]
    },
    {
      id: "future-bus-south-2", category: "transport", name: "Future bus stop · Berlayar Drive", short: "Future bus stop",
      x: 16.0, z: 28.0, height: 0.4, confidence: "crossChecked",
      detail: "One of three future bus stops shown in public site-plan material.",
      geometry: "schematic", sourceIds: ["stacked","brochure"]
    },
    {
      id: "futurepark-nw", category: "context", name: "Site reserved for park · north-west", short: "Future park",
      x: -25.0, z: -25.0, height: 0.1, confidence: "verified",
      detail: "The public site plan labels land at the north-west edge as a site reserved for park.",
      geometry: "schematic", sourceIds: ["brochure"]
    },
    {
      id: "futurepark-south", category: "context", name: "Site reserved for park · south", short: "Future park",
      x: 9.5, z: 32.0, height: 0.1, confidence: "verified",
      detail: "The public site plan labels land south of the precinct as a site reserved for park.",
      geometry: "schematic", sourceIds: ["brochure"]
    },
    {
      id: "publichousing-west", category: "context", name: "Public housing · under construction", short: "Public housing U/C",
      x: -33.2, z: -3.0, height: 0.1, confidence: "verified",
      detail: "The public site plan labels the parcel west of Berlayar Street as public housing under construction.",
      geometry: "schematic", sourceIds: ["brochure"]
    },
    {
      id: "futurehousing-east", category: "context", name: "Site reserved for future high-rise residential development", short: "Future housing",
      x: 31.7, z: 6.0, height: 0.1, confidence: "verified",
      detail: "The public site plan labels adjacent land for future high-rise residential development.",
      geometry: "schematic", sourceIds: ["brochure"]
    },
    {
      id: "futurehousing-sw", category: "context", name: "Site reserved for future high-rise residential development", short: "Future housing",
      x: -24.0, z: 32.8, height: 0.1, confidence: "verified",
      detail: "The public site plan labels southern adjacent land for future high-rise residential development.",
      geometry: "schematic", sourceIds: ["brochure"]
    },
    {
      id: "futurehousing-se", category: "context", name: "Site reserved for future high-rise residential development", short: "Future housing",
      x: 29.5, z: 33.0, height: 0.1, confidence: "verified",
      detail: "The public site plan labels southern adjacent land for future high-rise residential development.",
      geometry: "schematic", sourceIds: ["brochure"]
    }
  ],

  /* Labels for standalone numbered blocks visible on the published site plan.
     Their function is intentionally NOT guessed here, except Block 203 which is separately verified as the MSCP. */
  planOnlyBlockLabels: [
    { id:"200", x:-20.7, z:-16.8 },
    { id:"201", x:20.6, z:-15.0 },
    { id:"202", x:21.2, z:17.8 },
    { id:"204", x:-1.8, z:20.3 },
    { id:"205", x:-25.0, z:21.0 }
  ],

  roads: [
    { name: "Telok Blangah Road / West Coast Highway", x: 0, z: -28.4, w: 68, d: 6.4, rotation: 0 },
    { name: "Berlayar Street", x: -29.2, z: 1.2, w: 5.5, d: 56, rotation: -0.035 },
    { name: "Berlayar Drive", x: 2.6, z: 27.5, w: 58, d: 5.4, rotation: 0.025 }
  ],

  /* Connectivity only: routes are intentionally schematic. */
  shelteredLinks: [
    { from: [-18.0,-10.7], to: [-5.1,-12.9] },
    { from: [-3.3,-14.8], to: [2.2,-28.1] },
    { from: [-1.2,-10.8], to: [7.8,-10.8] },
    { from: [8.5,-8.0], to: [0.8,0.0] },
    { from: [1.0,3.1], to: [9.0,7.7] },
    { from: [-1.8,3.5], to: [-5.1,10.8] },
    { from: [-6.4,14.8], to: [-15.0,16.7] }
  ],

  sources: [
    {
      id: "brochure",
      tier: "primary",
      name: "HDB — Berlayar Rise sales brochure (June 2026)",
      url: "https://assets.hdb.gov.sg/residential/buying-a-flat/finding-a-flat/sales-brochure/26JUNBTO_pdf_selection/berlayar_rise.pdf",
      use: "Primary visual source for the Berlayar Rise site plan, site-plan legend, block/storey information, unit-distribution/elevation charts and published flat layouts."
    },
    {
      id: "annex-a",
      tier: "primary",
      name: "HDB — Annex A: June 2026 BTO flat supply and pricing details",
      url: "https://www.hdb.gov.sg/-/media/hdb-pulse/news/2026/20260617-HDB-Launches-6952-Flats-Across-7-Projects-in-June-2026-BTO-Sales-Exercise/Annex-A.pdf",
      use: "Official flat-type totals, floor areas, indicative 99-year price ranges and estimated waiting-time range."
    },
    {
      id: "launch",
      tier: "primary",
      name: "HDB — June 2026 BTO launch announcement",
      url: "https://www.hdb.gov.sg/hdb-pulse/news/2026/20260617-HDB-Launches-6952-Flats-Across-7-Projects-in-June-2026-BTO-Sales-Exercise",
      use: "Official project classification and 14% subsidy-recovery rate for Berlayar Rise."
    },
    {
      id: "design",
      tier: "primary",
      name: "HDB Awards — Berlayar Residences & Berlayar Rise",
      url: "https://building-partner.hdb.gov.sg/awardwinners-projectshowcase/hdb-design-award/berlayar-residences---berlayar-rise/",
      use: "Official design description confirming Berlayar Rise has 1,976 homes across six blocks of 33–49 storeys, with staggered/stepped massing, sky gardens and rooftop landscapes."
    },
    {
      id: "masterplan",
      tier: "primary",
      name: "HDB — Berlayar estate masterplan",
      url: "https://www.hdb.gov.sg/hdb-pulse/news/2025/hdb-unveils-masterplan-for-berlayar-estate",
      use: "Official wider-estate context, connectivity and Telok Blangah MRT relationship."
    },
    {
      id: "elevation-200",
      tier: "mirror",
      name: "99.co — public mirror of Berlayar Rise unit distribution: Blocks 200A / 200B",
      url: "https://www.99.co/singapore/hdb/200a-berlayar-street-adJnvqJrRpcePmbBDALNDjZB",
      use: "Publicly accessible mirror used to manually cross-check stack numbers, flat types and sky-terrace levels against the HDB brochure."
    },
    {
      id: "elevation-201",
      tier: "mirror",
      name: "99.co — public mirror of Berlayar Rise unit distribution: Blocks 201A / 201B",
      url: "https://www.99.co/singapore/hdb/201a-berlayar-street-adZAkWWT6HqBvyE5gBwzWaa",
      use: "Public mirror used to cross-check stack/type distribution, sky terraces, roof-garden labels and the Residents’ Network Centre marker."
    },
    {
      id: "elevation-204",
      tier: "mirror",
      name: "99.co — Berlayar Rise site/elevation material",
      url: "https://www.99.co/singapore/hdb/berlayar-rise---prime-de1ykFxT10z80WICTzZfAC0W",
      use: "Public mirror used to cross-check the 204A/204B unit-distribution chart and the overall site-plan image."
    },
    {
      id: "stacked",
      tier: "secondary",
      name: "Stacked Homes — June 2026 BTO launch review",
      url: "https://stackedhomes.com/june-2026-bto-launch-review/",
      use: "Secondary cross-check for two drop-off points, sheltered-linkway connectivity, three future bus stops and publicly shown flat-layout images."
    },
    {
      id: "dollarsandsense",
      tier: "secondary",
      name: "DollarsAndSense — June 2026 BTO sales launch guide",
      url: "https://dollarsandsense.sg/june-2026-bto-sales-launch-guide-ang-mo-kio-bishan-lakeview-berlayar-sembawang-north/",
      use: "Secondary cross-check for first-storey MSCP commercial uses and the Residents’ Network Centre at Block 201B."
    }
  ]
};
