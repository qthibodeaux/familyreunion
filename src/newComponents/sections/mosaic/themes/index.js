const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const sample = (items = [], count = items.length) =>
  [...items].sort(() => Math.random() - 0.5).slice(0, count);

const profileInstruction = (profile, bg) => ({
  type: "profile",
  photoUrl: profile?.avatar_url || "",
  initials: profile?.initials || "",
  name: profile?.firstname || "",
  sub: profile?.sunrise || "",
  bg,
});

const labelInstruction = (text, bg, icon = null) => ({
  type: "label",
  text,
  icon,
  bg,
});

const colorInstruction = (bg) => ({
  type: "color",
  bg,
});

const photoSliceLayout = (profiles, geometry, palette) => {
  const [person] = sample(profiles.filter((profile) => profile.avatar_url), 1);
  const instructions = [];

  for (let row = 0; row < geometry.rows; row += 1) {
    for (let col = 0; col < geometry.cols; col += 1) {
      instructions.push({
        type: "slice",
        photoUrl: person?.avatar_url || "",
        name: person?.firstname || "",
        bg: palette.secondary,
        cropLayout: {
          w: geometry.cols,
          h: geometry.rows,
          x: col,
          y: row,
        },
      });
    }
  }

  return instructions;
};

const profileGridLayout = ({ title, profiles, geometry, palette, icon }) => {
  const total = geometry.cols * geometry.rows;
  const selected = sample(profiles, total - 1);
  const instructions = [labelInstruction(title, palette.primary, icon)];

  selected.forEach((profile) => {
    instructions.push(profileInstruction(profile, palette.secondary));
  });

  while (instructions.length < total) {
    instructions.push(colorInstruction(instructions.length % 2 === 0 ? palette.accent : palette.secondary));
  }

  return instructions;
};

const currentBirthdayProfiles = (data) => {
  const currentMonth = MONTHS[new Date().getMonth()];
  return data.birthdays[currentMonth] || [];
};

const anyBirthdayProfiles = (data) => {
  const current = currentBirthdayProfiles(data);
  if (current.length > 0) return current;
  return Object.values(data.birthdays).find((profiles) => profiles.length > 0) || [];
};

const relationPairs = (profiles) => {
  const byId = new Map(profiles.map((profile) => [profile.id, profile]));
  return profiles
    .filter((profile) => profile.parent && byId.has(profile.parent))
    .map((child) => ({ parent: byId.get(child.parent), child }));
};

export const PRIORITY_THEMES = [
  {
    id: "birthdays",
    label: "Birthdays",
    coordinatorType: "priority",
    weight: 3,
    geometryPreferences: [{ cols: 2, rows: 4 }, { cols: 2, rows: 3 }, { cols: 1, rows: 4 }],
    minProfiles: 2,
    dataFilter: anyBirthdayProfiles,
    palette: ["blush", "gold", "rosewood"],
    buildLayout: (profiles, geometry, palette) => {
      const currentMonth = MONTHS[new Date().getMonth()];
      return profileGridLayout({
        title: `${currentMonth} Birthdays`,
        profiles,
        geometry,
        palette,
        icon: "cake",
      });
    },
    effectPreferences: ["diagonal-wave", "ripple", "wave", "random-stagger"],
    transitionPreferences: ["flip", "slide", "fade"],
    holdDuration: 1000,
  },
  {
    id: "memorial",
    label: "Memorial",
    coordinatorType: "priority",
    weight: 2,
    geometryPreferences: [{ cols: 3, rows: 3 }, { cols: 2, rows: 3 }, { cols: 2, rows: 2 }],
    minProfiles: 2,
    dataFilter: (data) => (data.deceased.length > 0 ? data.deceased : data.profiles),
    palette: ["rosewood", "indigo", "ember"],
    buildLayout: (profiles, geometry, palette) =>
      profileGridLayout({
        title: "In Loving Memory",
        profiles,
        geometry,
        palette,
        icon: "star",
      }),
    effectPreferences: ["ripple", "diagonal-wave", "spiral", "random-stagger"],
    transitionPreferences: ["fade", "flip", "scale"],
    holdDuration: 1100,
  },
  {
    id: "branchHighlight",
    label: "Branch Highlight",
    coordinatorType: "priority",
    weight: 2,
    geometryPreferences: [{ cols: 3, rows: 3 }, { cols: 2, rows: 3 }, { cols: 2, rows: 2 }],
    minProfiles: 2,
    dataFilter: (data) => {
      const branches = Object.values(data.branches).filter((profiles) => profiles.length >= 2);
      return sample(branches, 1)[0] || data.profiles;
    },
    palette: ["moss", "gold", "indigo", "rosewood"],
    buildLayout: (profiles, geometry, palette) =>
      profileGridLayout({
        title: `${profiles[0]?.firstname || "Family"}'s Line`,
        profiles,
        geometry,
        palette,
        icon: "branch",
      }),
    effectPreferences: ["wave", "diagonal-wave", "ripple", "random-stagger"],
    transitionPreferences: ["slide", "flip", "fade"],
    holdDuration: 1000,
  },
  {
    id: "lineage",
    label: "Lineage",
    coordinatorType: "priority",
    weight: 2,
    geometryPreferences: [{ cols: 1, rows: 5 }, { cols: 1, rows: 4 }, { cols: 1, rows: 3 }],
    minProfiles: 3,
    dataFilter: (data) => Object.values(data.branches).map((profiles) => profiles[0]).filter(Boolean),
    palette: ["moss", "gold", "rosewood"],
    buildLayout: (profiles, geometry, palette) => {
      const total = geometry.cols * geometry.rows;
      return sample(profiles, total).map((profile, index) =>
        index === 0
          ? labelInstruction("Branches", palette.primary, "tree")
          : profileInstruction(profile, index % 2 === 0 ? palette.secondary : palette.accent)
      );
    },
    effectPreferences: ["lineage-cascade", "wave", "sync"],
    transitionPreferences: ["slide", "flip"],
    holdDuration: 900,
  },
  {
    id: "mothersAndBabies",
    label: "Mothers & Babies",
    coordinatorType: "priority",
    weight: 3,
    geometryPreferences: [{ cols: 2, rows: 4 }, { cols: 2, rows: 3 }],
    minProfiles: 2,
    dataFilter: (data) => {
      const pairs = relationPairs(data.profiles);
      return pairs.flatMap((pair) => [pair.parent, pair.child]);
    },
    palette: ["blush", "moss", "gold"],
    buildLayout: (profiles, geometry, palette) => {
      const total = geometry.cols * geometry.rows;
      const instructions = [];
      const selected = sample(profiles, total);

      for (let index = 0; index < total; index += 1) {
        instructions.push(profileInstruction(selected[index], index % 2 === 0 ? palette.secondary : palette.accent));
      }

      return instructions;
    },
    effectPreferences: ["wave", "diagonal-wave", "random-stagger"],
    transitionPreferences: ["slide", "flip", "fade"],
    holdDuration: 1000,
  },
  {
    id: "portrait",
    label: "Portrait",
    coordinatorType: "priority",
    weight: 2,
    geometryPreferences: [{ cols: 3, rows: 3 }, { cols: 2, rows: 2 }],
    minProfiles: 1,
    dataFilter: (data) => data.profiles.filter((profile) => profile.avatar_url),
    palette: ["rosewood", "indigo", "moss"],
    buildLayout: photoSliceLayout,
    effectPreferences: ["spiral", "diagonal-wave", "ripple", "sync"],
    transitionPreferences: ["fade", "slide", "flip"],
    holdDuration: 1200,
  },
  {
    id: "panoramic",
    label: "Panoramic",
    coordinatorType: "priority",
    weight: 3,
    geometryPreferences: [{ cols: 4, rows: 2 }, { cols: 3, rows: 2 }],
    minProfiles: 1,
    dataFilter: (data) => data.profiles.filter((profile) => profile.avatar_url),
    palette: ["gold", "moss", "rosewood"],
    buildLayout: photoSliceLayout,
    effectPreferences: ["diagonal-wave", "wave", "sync"],
    transitionPreferences: ["slide", "fade", "scale"],
    holdDuration: 1100,
  },
  {
    id: "tower",
    label: "Tower",
    coordinatorType: "priority",
    weight: 3,
    geometryPreferences: [{ cols: 1, rows: 4 }, { cols: 1, rows: 3 }],
    minProfiles: 1,
    dataFilter: (data) => data.profiles.filter((profile) => profile.avatar_url),
    palette: ["indigo", "rosewood", "ember"],
    buildLayout: photoSliceLayout,
    effectPreferences: ["lineage-cascade", "ripple", "sync"],
    transitionPreferences: ["slide", "fade", "flip"],
    holdDuration: 1000,
  },
  {
    id: "hero",
    label: "Hero",
    coordinatorType: "priority",
    weight: 1,
    geometryPreferences: [{ cols: 4, rows: 4 }, { cols: 3, rows: 3 }],
    minProfiles: 1,
    dataFilter: (data) => data.profiles.filter((profile) => profile.avatar_url),
    palette: ["rosewood", "gold", "indigo"],
    buildLayout: photoSliceLayout,
    effectPreferences: ["spiral", "diagonal-wave", "sync"],
    transitionPreferences: ["fade", "slide", "scale"],
    holdDuration: 1300,
  },
  {
    id: "monograms",
    label: "Family Monograms",
    coordinatorType: "priority",
    weight: 2,
    geometryPreferences: [{ cols: 3, rows: 3 }, { cols: 2, rows: 3 }, { cols: 2, rows: 2 }],
    minProfiles: 4,
    dataFilter: (data) => data.profiles,
    palette: ["rosewood", "gold", "blush", "moss"],
    buildLayout: (profiles, geometry, palette) => {
      const total = geometry.cols * geometry.rows;
      const selected = sample(profiles, total);
      return selected.map((profile, index) => ({
        type: "initial",
        initials: profile.initials,
        label: profile.firstname,
        bg: index % 2 === 0 ? palette.primary : palette.secondary,
      }));
    },
    effectPreferences: ["diagonal-wave", "ripple", "random-stagger"],
    transitionPreferences: ["flip", "fade"],
    holdDuration: 1200,
  },
  {
    id: "silhouettes",
    label: "Family Silhouettes",
    coordinatorType: "priority",
    weight: 2,
    geometryPreferences: [{ cols: 3, rows: 3 }, { cols: 2, rows: 3 }, { cols: 2, rows: 2 }],
    minProfiles: 2,
    dataFilter: (data) => data.profiles.filter((profile) => profile.avatar_url),
    palette: ["rosewood", "indigo", "moss"],
    buildLayout: (profiles, geometry, palette) => {
      const total = geometry.cols * geometry.rows;
      const selected = sample(profiles, total - 1);
      const instructions = [labelInstruction("Ancestors", palette.primary, "star")];
      selected.forEach((p) => {
        instructions.push({
          type: "profile",
          photoUrl: p.avatar_url,
          initials: p.initials,
          name: p.firstname,
          bg: palette.secondary,
          mode: "silhouette",
        });
      });
      return instructions;
    },
    effectPreferences: ["spiral", "diagonal-wave", "ripple"],
    transitionPreferences: ["fade", "flip"],
    holdDuration: 1200,
  },
];

