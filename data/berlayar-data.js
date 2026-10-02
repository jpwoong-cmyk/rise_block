/*
  Berlayar Rise public-source seed data.
  The unit list is generated from published block/stack/type/level distribution.
  No exact unit selling prices are fabricated. Public HDB pricing is stored by flat type.
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
    "2R-T1": { label: "2-Room Flexi Type 1", total: 172, area: 40, internalArea: 38, price99: [247000, 341000], color: 0xe8a07d },
    "2R-T2": { label: "2-Room Flexi Type 2", total: 644, area: 48, internalArea: 46, price99: [296000, 406000], color: 0xd96d5d },
    "3R":    { label: "3-Room", total: 172, area: 67, internalArea: 64, price99: [435000, 591000], color: 0x91c779 },
    "4R":    { label: "4-Room", total: 988, area: 90, internalArea: 86, price99: [592000, 810000], color: 0xe2d15a }
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
      model: { x:-15, z:-10, rotationY:-0.08, width:8.5, depth:3.3 }
    },
    {
      id: "200B", storeys: 49, total: 368, waitMonths: 54,
      floors: { min: 2, max: 49, exclude: [20,40] },
      stacks: [
        {no:"117",type:"2R-T2"},{no:"119",type:"2R-T2"},{no:"121",type:"2R-T2"},{no:"123",type:"2R-T2"},
        {no:"125",type:"4R"},{no:"127",type:"4R"},{no:"129",type:"4R"},{no:"131",type:"4R"}
      ],
      model: { x:-3, z:-12.5, rotationY:0.06, width:9.2, depth:3.5 }
    },
    {
      id: "201A", storeys: 49, total: 360, waitMonths: 54,
      floors: { min: 2, max: 48, exclude: [9,30], roofGarden: 49 },
      stacks: [
        {no:"133",type:"2R-T2"},{no:"135",type:"2R-T2"},{no:"137",type:"2R-T2"},{no:"139",type:"2R-T2"},
        {no:"141",type:"4R"},{no:"143",type:"4R"},{no:"145",type:"4R"},{no:"147",type:"4R"}
      ],
      model: { x:9.5, z:-10.5, rotationY:0.08, width:9.0, depth:3.5 }
    },
    {
      id: "201B", storeys: 46, total: 344, waitMonths: 49,
      floors: { min: 2, max: 46, exclude: [22,37] },
      stacks: [
        {no:"149",type:"4R"},{no:"151",type:"4R"},{no:"153",type:"4R"},{no:"155",type:"4R"},
        {no:"157",type:"2R-T1"},{no:"159",type:"2R-T1"},{no:"161",type:"3R"},{no:"163",type:"3R"}
      ],
      model: { x:0.2, z:1.5, rotationY:-0.12, width:9.0, depth:3.5 }
    },
    {
      id: "204A", storeys: 39, total: 304, waitMonths: 49,
      floors: { min: 2, max: 39, exclude: [] },
      stacks: [
        {no:"100",type:"4R"},{no:"102",type:"4R"},{no:"104",type:"4R"},{no:"106",type:"4R"},
        {no:"108",type:"2R-T2"},{no:"110",type:"2R-T2"},{no:"112",type:"2R-T2"},{no:"114",type:"2R-T2"}
      ],
      model: { x:-5.6, z:13, rotationY:0.06, width:9.0, depth:3.5 }
    },
    {
      id: "204B", storeys: 33, total: 256, waitMonths: 49,
      floors: { min: 2, max: 33, exclude: [] },
      stacks: [
        {no:"116",type:"4R"},{no:"118",type:"4R"},{no:"120",type:"4R"},{no:"122",type:"4R"},
        {no:"124",type:"2R-T2"},{no:"126",type:"2R-T2"},{no:"128",type:"2R-T2"},{no:"130",type:"2R-T2"}
      ],
      model: { x:-16.7, z:18, rotationY:-0.12, width:9.0, depth:3.5 }
    }
  ],
  sources: [
    {
      name: "HDB — June 2026 BTO launch announcement",
      url: "https://www.hdb.gov.sg/hdb-pulse/news/2026/20260617-HDB-Launches-6952-Flats-Across-7-Projects-in-June-2026-BTO-Sales-Exercise",
      use: "Official project classification, June 2026 launch context and 14% subsidy recovery for Berlayar Rise."
    },
    {
      name: "HDB — Annex A: Jun 2026 BTO Flat Supply and Pricing Details",
      url: "https://www.hdb.gov.sg/-/media/hdb-pulse/news/2026/20260617-HDB-Launches-6952-Flats-Across-7-Projects-in-June-2026-BTO-Sales-Exercise/Annex-A.pdf",
      use: "Official unit totals, flat areas, indicative price ranges, 2-Room Flexi lease ranges and 49/54-month estimated waiting time."
    },
    {
      name: "HDB — Final June 2026 application rates",
      url: "https://services-homes.hdb.gov.sg/sales/application-rate/bto/202606",
      use: "Official totals by flat category: 816 2-Room Flexi, 172 3-Room and 988 4-Room."
    },
    {
      name: "99.co — Berlayar Rise site plan & elevation charts",
      url: "https://www.99.co/singapore/hdb/berlayar-rise---prime-de1ykFxT10z80WICTzZfAC0W",
      use: "Publicly accessible reproductions of the project site plan and HDB-style unit distribution/elevation charts used to map block stacks, flat types and residential levels."
    },
    {
      name: "Stacked Homes — June 2026 BTO launch review",
      url: "https://stackedhomes.com/june-2026-bto-launch-review/",
      use: "Cross-check of six residential blocks, block completion groups, flat mix and published stack numbers."
    }
  ]
};
