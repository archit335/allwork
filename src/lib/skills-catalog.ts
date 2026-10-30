// Predefined skills. Users and the AI assistant can add custom skills on top
// of these at any time — the catalog is a starting point, never a limit.
// `k` lists English, Hindi and Hinglish keywords used by the demo parser.

export type CatalogSkill = { name: string; category: string; k: string[] };

export const SKILL_CATALOG: CatalogSkill[] = [
  // Technology
  { name: "Web Developer", category: "Technology", k: ["website", "web developer", "web app", "frontend", "backend", "full stack", "react", "next.js", "wordpress", "landing page"] },
  { name: "Android Developer", category: "Technology", k: ["android", "android app", "mobile app", "kotlin", "flutter"] },
  { name: "iOS Developer", category: "Technology", k: ["ios", "iphone app", "swift"] },
  { name: "Software Engineer", category: "Technology", k: ["software", "software engineer", "programmer", "coder", "developer"] },
  { name: "AI Developer", category: "Technology", k: ["ai ", "machine learning", "ml ", "chatbot", "llm", "artificial intelligence"] },
  { name: "Data Analyst", category: "Technology", k: ["data analyst", "excel dashboard", "power bi", "tableau", "sql report", "analytics"] },
  { name: "UI/UX Designer", category: "Technology", k: ["ui/ux", "ui ux", "ux designer", "figma", "app design", "user interface"] },
  { name: "Graphic Designer", category: "Creative", k: ["graphic designer", "logo", "poster", "banner", "flyer", "visiting card", "branding"] },
  { name: "Video Editor", category: "Creative", k: ["video editor", "video editing", "edit video", "reels", "youtube video", "premiere"] },
  // Business
  { name: "Accountant", category: "Business", k: ["accountant", "accounting", "gst", "tally", "bookkeeping", "itr", "ca "] },
  { name: "Marketing Executive", category: "Business", k: ["marketing", "promotion", "digital marketing", "seo"] },
  { name: "Sales Executive", category: "Business", k: ["sales", "salesman", "salesperson", "counter sales", "field sales"] },
  { name: "Business Analyst", category: "Business", k: ["business analyst", "market research", "business plan"] },
  { name: "Data Entry Operator", category: "Business", k: ["data entry", "typing", "excel entry", "computer operator"] },
  { name: "Customer Support", category: "Business", k: ["customer support", "customer care", "telecaller", "call center", "bpo"] },
  { name: "HR Executive", category: "Business", k: ["hr ", "human resource", "recruiter", "recruitment", "payroll"] },
  { name: "Shop Manager", category: "Business", k: ["manage my shop", "shop manager", "store manager", "dukaan", "dukan sambhal"] },
  // Industrial
  { name: "Factory Worker", category: "Industrial", k: ["factory", "fectory", "plant worker", "industrial"] },
  { name: "Machine Operator", category: "Industrial", k: ["machine operator", "cnc", "lathe", "operator"] },
  { name: "Packaging Worker", category: "Industrial", k: ["packaging", "packing", "pack", "packers", "dabba"] },
  { name: "Warehouse Worker", category: "Industrial", k: ["warehouse", "godown", "loading", "unloading", "loader", "picker"] },
  { name: "Production Worker", category: "Industrial", k: ["production", "assembly line", "assembly"] },
  { name: "Welder", category: "Industrial", k: ["welder", "welding", "fabrication"] },
  { name: "Electrician", category: "Local Services", k: ["electrician", "bijli", "wiring", "fan", "switch", "light fitting", "mcb", "inverter"] },
  { name: "Technician", category: "Industrial", k: ["technician", "repair", "mechanic", "service engineer"] },
  { name: "Construction Labourer", category: "Industrial", k: ["construction", "labour", "labourer", "laborer", "mazdoor", "majdoor", "site work", "helper", "helpers"] },
  { name: "Mason", category: "Industrial", k: ["mason", "mistri", "brick", "plaster", "tiles", "tile work"] },
  // Local services
  { name: "Plumber", category: "Local Services", k: ["plumber", "plumbing", "tap", "leak", "pipe", "nal", "bathroom fitting", "tanki"] },
  { name: "Carpenter", category: "Local Services", k: ["carpenter", "furniture", "wood work", "badhai", "door repair", "bed repair"] },
  { name: "Painter", category: "Local Services", k: ["painter", "paint", "painting", "putty", "whitewash", "rang"] },
  { name: "AC Technician", category: "Local Services", k: ["ac ", "a.c", "air conditioner", "ac repair", "ac service", "ac gas"] },
  { name: "Cook", category: "Local Services", k: ["cook", "chef", "khana", "catering", "halwai", "rasoiya", "family event", "party food"] },
  { name: "Cleaner", category: "Local Services", k: ["cleaner", "cleaning", "safai", "maid", "housekeeping", "deep clean"] },
  { name: "Household Helper", category: "Local Services", k: ["household", "house help", "domestic help", "kaam wali", "naukar"] },
  { name: "Driver", category: "Local Services", k: ["driver", "chauffeur", "gaadi chalana", "drive"] },
  { name: "Gardener", category: "Local Services", k: ["gardener", "mali", "garden", "lawn", "plants"] },
  { name: "Security Guard", category: "Local Services", k: ["security guard", "guard", "watchman", "chowkidar", "bouncer"] },
  { name: "Delivery Partner", category: "Local Services", k: ["delivery", "courier", "parcel"] },
  { name: "Tutor", category: "Education", k: ["tutor", "tuition", "teacher", "teach", "padhai", "coaching"] },
  // Creative
  { name: "Photographer", category: "Creative", k: ["photographer", "photography", "photoshoot", "photo shoot", "wedding shoot"] },
  { name: "Content Writer", category: "Creative", k: ["content writer", "writer", "blog", "article", "copywriting", "script"] },
  { name: "Animator", category: "Creative", k: ["animator", "animation", "motion graphics", "2d", "3d"] },
  { name: "Social Media Manager", category: "Creative", k: ["social media", "instagram", "facebook page", "smm", "content calendar"] },
  { name: "Voice Artist", category: "Creative", k: ["voice artist", "voice over", "voiceover", "dubbing"] },
  { name: "Event Staff", category: "Events", k: ["event staff", "waiter", "serving", "event helper", "decorator", "decoration"] },
];

export const SKILL_CATEGORIES = Array.from(new Set(SKILL_CATALOG.map((s) => s.category)));

export const POPULAR_SKILLS = [
  "Electrician", "Web Developer", "Plumber", "Packaging Worker", "Graphic Designer", "Cook",
  "Driver", "Video Editor", "Carpenter", "Data Entry Operator", "Android Developer", "Construction Labourer",
];
