/*
  Berlayar Rise public-source seed data.
  Static project/unit structure is source-informed. Dynamic availability is not an HDB live feed.
  Site-feature coordinates are schematic placements interpreted from the published project site plan.
*/
window.BERLAYAR_DATA = {
  project: {
    name: "Berlayar Rise",
    town: "Bukit Merah",
    launch: "June 2026 BTO",
    classification: "Prime",
    totalUnits: 1976,
    residentialBlocks: 6,
    subsidyRecoveryPct: 14,
    note: "Community tracker; not affiliated with HDB. Availability is not an HDB live feed."
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
      layoutNote: "Compact one-bedroom layout with the kitchen grouped near the entrance and the household shelter beside the living/dining zone. The schematic below is not to scale.",
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
      layoutNote: "Adds a flexible space beside the bedroom, giving the Type 2 plan a study/extra-room zone while retaining a separate kitchen and household shelter. The schematic below is not to scale.",
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
      layoutNote: "The published layout separates a dry-kitchen zone from the kitchen/utility area and places the two bedrooms along the outer edge. The schematic below is not to scale.",
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
      layoutNote: "Three-bedroom layout with a separate service yard beside the kitchen and two bathrooms grouped near the bedroom corridor. The schematic below is not to scale.",
      plan: "4R"
    }
  },

  shortLease2R: {
    "2R-T1": {15:[83000,114000],20:[99000,136000],25:[113000,155000],30:[124000,171000],35:[133000,184000],40:[141000,195000],45:[148000,204000]},
    "2R-T2": {15:[99000,136000],20:[119000,163000],25:[135000,185000],30:[148000,203000],35:[160000,219000],40:[169000,232000],45:[177000,243000]}
  },

  blocks: [
    {
      id: "200A", storeys: 46, total: 344, waitMonths: 54,
      floors: { min: 2, max: 46, exclude: [9,29] },
      stacks: [
        {no:"101",type:"3R"},{no:"103",type:"3R"},{no:"105",type:"2R-T1"},{no:"107",type:"2R-T1"},
        {no:"109",type:"4R"},{no:"111",type:"4R"},{no:"113",type:"4R"},{no:"115",type:"4R"}
      ],
      model: { x:-15.2, z:-10.2, rotationY:-0.08, width:8.7, depth:3.4 }
    },
    {
      id: "200B", storeys: 49, total: 368, waitMonths: 54,
      floors: { min: 2, max: 49, exclude: [20,40] },
      stacks: [
        {no:"117",type:"2R-T2"},{no:"119",type:"2R-T2"},{no:"121",type:"2R-T2"},{no:"123",type:"2R-T2"},
        {no:"125",type:"4R"},{no:"127",type:"4R"},{no:"129",type:"4R"},{no:"131",type:"4R"}
      ],
      model: { x:-3.1, z:-12.8, rotationY:0.06, width:9.4, depth:3.5 }
    },
    {
      id: "201A", storeys: 49, total: 360, waitMonths: 54,
      floors: { min: 2, max: 48, exclude: [9,30], roofGarden: 49 },
      stacks: [
        {no:"133",type:"2R-T2"},{no:"135",type:"2R-T2"},{no:"137",type:"2R-T2"},{no:"139",type:"2R-T2"},
        {no:"141",type:"4R"},{no:"143",type:"4R"},{no:"145",type:"4R"},{no:"147",type:"4R"}
      ],
      model: { x:9.1, z:-10.3, rotationY:0.08, width:9.2, depth:3.5 }
    },
    {
      id: "201B", storeys: 46, total: 344, waitMonths: 49,
      floors: { min: 2, max: 46, exclude: [22,37] },
      stacks: [
        {no:"149",type:"4R"},{no:"151",type:"4R"},{no:"153",type:"4R"},{no:"155",type:"4R"},
        {no:"157",type:"2R-T1"},{no:"159",type:"2R-T1"},{no:"161",type:"3R"},{no:"163",type:"3R"}
      ],
      model: { x:0.0, z:1.6, rotationY:-0.12, width:9.2, depth:3.6 },
      groundAmenities: ["Residents’ Network Centre"]
    },
    {
      id: "204A", storeys: 39, total: 304, waitMonths: 49,
      floors: { min: 2, max: 39, exclude: [] },
      stacks: [
        {no:"100",type:"4R"},{no:"102",type:"4R"},{no:"104",type:"4R"},{no:"106",type:"4R"},
        {no:"108",type:"2R-T2"},{no:"110",type:"2R-T2"},{no:"112",type:"2R-T2"},{no:"114",type:"2R-T2"}
      ],
      model: { x:-5.8, z:13.0, rotationY:0.06, width:9.1, depth:3.5 }
    },
    {
      id: "204B", storeys: 33, total: 256, waitMonths: 49,
      floors: { min: 2, max: 33, exclude: [] },
      stacks: [
        {no:"116",type:"4R"},{no:"118",type:"4R"},{no:"120",type:"4R"},{no:"122",type:"4R"},
        {no:"124",type:"2R-T2"},{no:"126",type:"2R-T2"},{no:"128",type:"2R-T2"},{no:"130",type:"2R-T2"}
      ],
      model: { x:-16.5, z:18.0, rotationY:-0.12, width:9.1, depth:3.5 }
    }
  ],

  /* Coordinates below map the published site plan into the simplified 3D scene.
     They are intended for orientation, not surveying or construction use. */
  siteFeatures: [
    {
      id: "mrt", category: "transport", name: "Telok Blangah MRT", short: "MRT",
      x: 2.7, z: -31.2, height: 1.7,
      detail: "Circle Line station immediately north of the project, across the Telok Blangah Road / West Coast Highway edge. The published project material shows sheltered-linkway connectivity toward the station.",
      basis: "Public site plan + published project review"
    },
    {
      id: "preschool", category: "community", name: "3-storey Preschool", short: "Preschool",
      x: 20.7, z: -6.5, height: 2.5,
      detail: "Separate 3-storey preschool building with a green roof, positioned on the eastern side of the precinct in the published site plan.",
      basis: "Public site plan"
    },
    {
      id: "mscp", category: "amenity", name: "Block 203 · 6-storey MSCP", short: "MSCP + shops",
      x: 13.0, z: 9.1, height: 3.2,
      detail: "Multi-storey car park. Published information lists a supermarket, eating house, restaurants/cafes and shops on the first storey, with a roof garden, fitness facilities and shelters above.",
      basis: "Public site plan + published project information"
    },
    {
      id: "rn", category: "community", name: "Residents’ Network Centre", short: "RN Centre",
      x: -0.2, z: 3.6, height: 0.8,
      detail: "Residents’ Network Centre reported on the first storey of Block 201B.",
      basis: "Published project guide"
    },
    {
      id: "pavilion", category: "community", name: "Precinct Pavilion", short: "Pavilion",
      x: -17.4, z: 2.4, height: 0.8,
      detail: "Community pavilion area interpreted from the published site plan. Placement in this 3D model is schematic.",
      basis: "Public site plan"
    },
    {
      id: "play", category: "recreation", name: "Nature-themed Playgrounds", short: "Playgrounds",
      x: -14.2, z: 5.8, height: 0.5,
      detail: "The project includes nature-themed playgrounds. The model groups the play areas into a simplified landscape cluster rather than reproducing construction geometry.",
      basis: "Public project information + site plan"
    },
    {
      id: "fitness", category: "recreation", name: "Fitness Areas", short: "Fitness",
      x: 5.6, z: 8.8, height: 0.5,
      detail: "Fitness corners/stations are part of the project. Ground-level markers and the MSCP roof facilities are schematic representations.",
      basis: "Public project information + site plan"
    },
    {
      id: "hardcourt", category: "recreation", name: "Hardcourt", short: "Hardcourt",
      x: 19.1, z: 0.9, height: 0.3,
      detail: "Hardcourt shown as part of the project’s recreation facilities. Geometry and placement are simplified from the public site plan.",
      basis: "Public project information + site plan"
    },
    {
      id: "roofshelters", category: "recreation", name: "MSCP Roof Garden Shelters", short: "Roof shelters",
      x: 13.0, z: 10.7, height: 3.8,
      detail: "Shelters are listed among the recreation facilities on the MSCP roof garden. The two canopy forms in this model are schematic rather than construction geometry.",
      basis: "Published project information"
    },
    {
      id: "linkways", category: "community", name: "Sheltered Linkway Network", short: "Sheltered links",
      x: 3.4, z: -3.2, height: 1.1,
      detail: "Published project information states that sheltered linkways connect the residential blocks to the MSCP, Telok Blangah MRT station and future bus stops. The routes drawn here are simplified from the public site plan.",
      basis: "Public site plan + published project review"
    },
    {
      id: "futurepark", category: "context", name: "Site reserved for park", short: "Future park",
      x: 11.3, z: 31.0, height: 0.1,
      detail: "Land south of the project is labelled as reserved for a park in the published site plan.",
      basis: "Public site plan"
    },
    {
      id: "futurehousing-east", category: "context", name: "Future residential development", short: "Future housing",
      x: 31.4, z: 8.5, height: 0.1,
      detail: "Adjacent eastern land is labelled for future high-rise residential development in the published site plan.",
      basis: "Public site plan"
    }
  ],

  roads: [
    { name: "Telok Blangah Road / West Coast Highway", x: 0, z: -28.2, w: 68, d: 6.5, rotation: 0 },
    { name: "Berlayar Street", x: -29.2, z: 1.7, w: 5.6, d: 55, rotation: -0.03 },
    { name: "Berlayar Drive", x: 3.4, z: 27.5, w: 59, d: 5.5, rotation: 0.03 }
  ],

  shelteredLinks: [
    { from: [-18.0,-10.5], to: [-4.5,-12.7] },
    { from: [-3.0,-14.7], to: [2.7,-28.6] },
    { from: [-1.0,-10.2], to: [8.0,-10.3] },
    { from: [8.7,-8.0], to: [1.2,0.0] },
    { from: [1.3,3.7], to: [10.0,8.6] },
    { from: [-1.7,3.8], to: [-5.1,11.1] },
    { from: [-6.5,15.0], to: [-15.0,17.0] }
  ],

  sources: [
    {
      name: "HDB — June 2026 BTO launch announcement",
      url: "https://www.hdb.gov.sg/hdb-pulse/news/2026/20260617-HDB-Launches-6952-Flats-Across-7-Projects-in-June-2026-BTO-Sales-Exercise",
      use: "Official project classification and June 2026 launch context."
    },
    {
      name: "HDB — Annex A: Jun 2026 BTO Flat Supply and Pricing Details",
      url: "https://www.hdb.gov.sg/-/media/hdb-pulse/news/2026/20260617-HDB-Launches-6952-Flats-Across-7-Projects-in-June-2026-BTO-Sales-Exercise/Annex-A.pdf",
      use: "Official unit totals, flat areas, indicative 99-year price ranges, 2-Room Flexi lease ranges and estimated waiting times."
    },
    {
      name: "HDB — Berlayar estate masterplan",
      url: "https://www.hdb.gov.sg/hdb-pulse/news/2025/hdb-unveils-masterplan-for-berlayar-estate",
      use: "Public context on Berlayar green corridors, walking/cycling connections and MRT access."
    },
    {
      name: "BTOHQ — Berlayar Rise project page & public site plan",
      url: "https://www.btohq.com/bto-project-spec/berlayar-rise",
      use: "Public site plan used to interpret block positions, Telok Blangah MRT, MSCP, preschool, community/recreation facilities and surrounding reserved sites."
    },
    {
      name: "Public Berlayar Rise site-plan image",
      url: "https://btohq.sgp1.cdn.digitaloceanspaces.com/bto/jun-2026-bto/projects/berlayar-rise/gallery/site-plan.jpg",
      use: "Site-plan reference for the 3D orientation layer."
    },
    {
      name: "99.co — Berlayar Rise site plan & elevation charts",
      url: "https://www.99.co/singapore/hdb/berlayar-rise---prime-de1ykFxT10z80WICTzZfAC0W",
      use: "Publicly accessible site/elevation references used to map residential stacks, flat types and residential levels."
    },
    {
      name: "Stacked Homes — June 2026 BTO launch review",
      url: "https://stackedhomes.com/june-2026-bto-launch-review/",
      use: "Cross-check for facilities, sheltered linkways, block completion groups and public floor-plan layouts used to create the app's original schematic floor plans."
    },
    {
      name: "DollarsAndSense — June 2026 BTO sales launch guide",
      url: "https://dollarsandsense.sg/june-2026-bto-sales-launch-guide-ang-mo-kio-bishan-lakeview-berlayar-sembawang-north/",
      use: "Cross-check for first-storey MSCP commercial uses and the Residents’ Network Centre at Block 201B."
    }
  ]
};
