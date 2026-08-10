/* Shared visual language for the storefront and CMS. Team names are data, not route logic. */
window.F1_TEAMS = [
  {
    slug: "mclaren", name: "McLaren", drivers: ["Lando Norris", "Oscar Piastri"],
    colors: { primary: "#ff8000", secondary: "#111111", accent: "#b7b8ba", dark: "#111111", light: "#e6e7e8" },
  },
  {
    slug: "mercedes", name: "Mercedes", drivers: ["George Russell", "Kimi Antonelli"],
    colors: { primary: "#00a19c", secondary: "#0a0c0f", accent: "#c8c8c8", dark: "#081b1d", light: "#f2f6f5" },
  },
  {
    slug: "ferrari", name: "Ferrari", drivers: ["Charles Leclerc", "Lewis Hamilton"],
    colors: { primary: "#dc0000", secondary: "#ffffff", accent: "#ffe600", dark: "#250707", light: "#fff2ed" },
  },
  {
    slug: "red-bull", name: "Red Bull Racing", drivers: ["Max Verstappen", "Isack Hadjar"],
    colors: { primary: "#1e41ff", secondary: "#ff1e00", accent: "#ffd400", dark: "#061338", light: "#f5f7ff" },
  },
  {
    slug: "racing-bulls", name: "Racing Bulls", drivers: ["Liam Lawson", "Arvid Lindblad"],
    colors: { primary: "#eaf1ff", secondary: "#1e4fff", accent: "#8ac5ff", dark: "#071326", light: "#f4f7ff" },
  },
  {
    slug: "alpine", name: "Alpine", drivers: ["Pierre Gasly", "Franco Colapinto"],
    colors: { primary: "#ff87bc", secondary: "#2293d1", accent: "#f7f7f7", dark: "#061827", light: "#f5f9ff" },
  },
  {
    slug: "haas", name: "Haas", drivers: ["Esteban Ocon", "Oliver Bearman"],
    colors: { primary: "#b6babd", secondary: "#e10600", accent: "#ffffff", dark: "#121619", light: "#f4f5f6" },
  },
  {
    slug: "audi", name: "Audi", drivers: ["Nico Hulkenberg", "Gabriel Bortoleto"],
    colors: { primary: "#bdbdbd", secondary: "#e60000", accent: "#ff5a5a", dark: "#111111", light: "#f6f6f6" },
  },
  {
    slug: "williams", name: "Williams", drivers: ["Alex Albon", "Carlos Sainz"],
    colors: { primary: "#005aff", secondary: "#00a3e0", accent: "#f7f7ff", dark: "#061426", light: "#f4f8ff" },
  },
  {
    slug: "aston-martin", name: "Aston Martin", drivers: ["Fernando Alonso", "Lance Stroll"],
    colors: { primary: "#006f62", secondary: "#003c36", accent: "#c7b273", dark: "#061b18", light: "#f2f6f2" },
  },
  {
    slug: "other", name: "Другое", drivers: [],
    colors: { primary: "#e10600", secondary: "#161616", accent: "#f1f1f1", dark: "#111111", light: "#f6f6f6" },
  },
];

window.F1_TEAM_BY_SLUG = Object.fromEntries(window.F1_TEAMS.map((team) => [team.slug, team]));
