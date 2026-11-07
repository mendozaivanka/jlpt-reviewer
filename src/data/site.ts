// Project-owned: everything personal to this site lives here.
export const site = {
  name: "JLPT Reviewer",
  description: "An N4 to N3 review course in the Sou Matome rhythm, built on open dictionary data.",
};

/** Prefix a path with the GitHub Pages base path. */
export const href = (p: string) => import.meta.env.BASE_URL + p.replace(/^\//, "");

export const nav = [
  { label: "Today", href: href("/") },
  { label: "Cards", href: href("/cards/") },
  { label: "Course", href: href("/course/") },
  { label: "Grammar", href: href("/grammar/") },
  { label: "Progress", href: href("/progress/") },
];
