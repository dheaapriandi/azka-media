const INITIAL_DATA = {
  settings: {
    shopName: "Azka Media",
    address: "Jl. Raya Pendidikan No. 45, Jakarta",
    phone: "0812-3456-7890",
    currency: "Rp"
  },
  products: [
    { id: "p1", name: "Kertas HVS A4 80gsm (Sinar Dunia)", category: "ATK", price: 55000, cost: 45000, stock: 45, unit: "Rim" },
    { id: "p2", name: "Kertas Foto Glossy A4 200gsm", category: "Kertas Percetakan", price: 35000, cost: 25000, stock: 20, unit: "Pack" },
    { id: "p3", name: "Tinta Epson 003 Black Original", category: "Tinta", price: 95000, cost: 80000, stock: 12, unit: "Botol" },
    { id: "p4", name: "Tinta Epson 003 Cyan Original", category: "Tinta", price: 95000, cost: 80000, stock: 8, unit: "Botol" },
    { id: "p5", name: "Tinta Epson 003 Magenta Original", category: "Tinta", price: 95000, cost: 80000, stock: 8, unit: "Botol" },
    { id: "p6", name: "Tinta Epson 003 Yellow Original", category: "Tinta", price: 95000, cost: 80000, stock: 8, unit: "Botol" },
    { id: "p7", name: "Pulpen Gel Pilot G2 0.5 Black", category: "ATK", price: 18000, cost: 14000, stock: 60, unit: "Pcs" },
    { id: "p8", name: "Flashdisk SanDisk Cruzer Blade 32GB", category: "Aksesoris", price: 65000, cost: 50000, stock: 15, unit: "Pcs" },
    { id: "p9", name: "Map Plastik L-Folder A4 Clear", category: "ATK", price: 3500, cost: 2000, stock: 120, unit: "Pcs" }
  ],
  services: [
    { id: "s1", name: "Servis Ringan Printer (Reset / Cleaning)", price: 75000 },
    { id: "s2", name: "Instalasi OS Windows + Software Standar", price: 150000 },
    { id: "s3", name: "Ganti Keyboard Laptop", price: 100000 },
    { id: "s4", name: "Perbaikan Motherboard PC", price: 250000 },
    { id: "s5", name: "Pembersihan PC Desktop (Blowing + Repaste)", price: 120000 }
  ],
  printingConfig: {
    paperTypes: [
      { id: "pt1", name: "HVS 70/80gsm", pricePerSheet: 300 },
      { id: "pt2", name: "Art Paper 120/150gsm", pricePerSheet: 1200 },
      { id: "pt3", name: "Art Carton 230/260gsm", pricePerSheet: 2000 },
      { id: "pt4", name: "Stiker Bontax (Glossy)", pricePerSheet: 3500 },
      { id: "pt5", name: "Kertas Foto Silky", pricePerSheet: 5000 }
    ],
    paperSizes: [
      { id: "ps1", name: "A4", multiplier: 1.0 },
      { id: "ps2", name: "F4 / Folio", multiplier: 1.1 },
      { id: "ps3", name: "A3", multiplier: 2.0 },
      { id: "ps4", name: "A3+", multiplier: 2.2 }
    ],
    printColors: [
      { id: "pc1", name: "Hitam Putih (B&W)", pricePerPage: 200 },
      { id: "pc2", name: "Warna Standar (Teks/Grafik)", pricePerPage: 700 },
      { id: "pc3", name: "Warna Penuh / Full Photo", pricePerPage: 2000 }
    ],
    bindings: [
      { id: "b1", name: "Tanpa Jilid", price: 0 },
      { id: "b2", name: "Jilid Lakban + Mika", price: 5000 },
      { id: "b3", name: "Jilid Spiral Kawat", price: 15000 },
      { id: "b4", name: "Jilid Hardcover", price: 35000 }
    ]
  },
  transactions: [
    {
      id: "TRX-001",
      date: "2026-07-09T09:30:00+07:00",
      type: "sales",
      items: [
        { id: "p1", name: "Kertas HVS A4 80gsm (Sinar Dunia)", price: 55000, qty: 2, total: 110000 }
      ],
      discount: 5000,
      grandTotal: 105000,
      cash: 110000,
      change: 5000,
      status: "completed"
    },
    {
      id: "TRX-002",
      date: "2026-07-09T14:15:00+07:00",
      type: "service",
      customerName: "Budi Santoso",
      customerPhone: "081299998888",
      device: "Laptop ASUS A416",
      complaint: "Keyboard sebagian tidak berfungsi",
      serviceItem: "Ganti Keyboard Laptop",
      servicePrice: 100000,
      spareparts: [
        { name: "Keyboard ASUS A416 Original", price: 150000 }
      ],
      grandTotal: 250000,
      status: "picked_up",
      notes: "Keyboard diganti dengan yang baru, garansi 1 bulan."
    },
    {
      id: "TRX-003",
      date: "2026-07-10T10:00:00+07:00",
      type: "printing",
      customerName: "Rina Wijaya",
      customerPhone: "085711112222",
      documentName: "Proposal Proyek A.pdf",
      paperType: "HVS 70/80gsm",
      paperSize: "A4",
      printColor: "Warna Standar (Teks/Grafik)",
      binding: "Jilid Lakban + Mika",
      pages: 50,
      copies: 5,
      pricePerCopy: 55000,
      grandTotal: 275000,
      status: "completed"
    },
    {
      id: "TRX-004",
      date: "2026-07-11T11:45:00+07:00",
      type: "sales",
      items: [
        { id: "p3", name: "Tinta Epson 003 Black Original", price: 95000, qty: 1, total: 95000 },
        { id: "p7", name: "Pulpen Gel Pilot G2 0.5 Black", price: 18000, qty: 3, total: 54000 }
      ],
      discount: 0,
      grandTotal: 149000,
      cash: 150000,
      change: 1000,
      status: "completed"
    },
    {
      id: "TRX-005",
      date: "2026-07-12T16:00:00+07:00",
      type: "service",
      customerName: "Andi Wijaya",
      customerPhone: "081344445555",
      device: "Printer Epson L3110",
      complaint: "Hasil cetak bergaris, warna merah tidak keluar",
      serviceItem: "Servis Ringan Printer (Reset / Cleaning)",
      servicePrice: 75000,
      spareparts: [],
      grandTotal: 75000,
      status: "picked_up",
      notes: "Dilakukan deep cleaning head printer. Normal."
    },
    {
      id: "TRX-006",
      date: "2026-07-13T09:00:00+07:00",
      type: "printing",
      customerName: "Universitas Terbuka",
      customerPhone: "021-7490941",
      documentName: "Modul Pembelajaran 2026.pdf",
      paperType: "Art Paper 120/150gsm",
      paperSize: "A4",
      printColor: "Warna Penuh / Full Photo",
      binding: "Jilid Hardcover",
      pages: 100,
      copies: 10,
      pricePerCopy: 355000,
      grandTotal: 3550000,
      status: "completed"
    },
    {
      id: "TRX-007",
      date: "2026-07-14T15:20:00+07:00",
      type: "sales",
      items: [
        { id: "p8", name: "Flashdisk SanDisk Cruzer Blade 32GB", price: 65000, qty: 1, total: 65000 },
        { id: "p1", name: "Kertas HVS A4 80gsm (Sinar Dunia)", price: 55000, qty: 1, total: 55000 }
      ],
      discount: 10000,
      grandTotal: 110000,
      cash: 120000,
      change: 10000,
      status: "completed"
    },
    {
      id: "TRX-008",
      date: "2026-07-15T08:30:00+07:00",
      type: "service",
      customerName: "Diana Putri",
      customerPhone: "087812345678",
      device: "PC Gaming Intel i5",
      complaint: "Sering mati sendiri saat main game berat",
      serviceItem: "Pembersihan PC Desktop (Blowing + Repaste)",
      servicePrice: 120000,
      spareparts: [],
      grandTotal: 120000,
      status: "processing",
      notes: "Proses penggantian thermal paste Thermal Grizzly dan membersihkan debu heatsink."
    },
    {
      id: "TRX-009",
      date: "2026-07-15T09:15:00+07:00",
      type: "printing",
      customerName: "Catering Ibu Sri",
      customerPhone: "081288887777",
      documentName: "Stiker Label Toples Makanan.pdf",
      paperType: "Stiker Bontax (Glossy)",
      paperSize: "A3+",
      printColor: "Warna Penuh / Full Photo",
      binding: "Tanpa Jilid",
      pages: 1,
      copies: 100,
      pricePerCopy: 9700,
      grandTotal: 970000,
      status: "queued"
    }
  ]
};

if (typeof window !== "undefined") {
  window.INITIAL_DATA = INITIAL_DATA;
}
