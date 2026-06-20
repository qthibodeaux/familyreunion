import Alma from "../../../../assets/alma.jpg";
import Ben from "../../../../assets/ben.jpg";
import Bobbie from "../../../../assets/bobbie.jpg";
import Hazel from "../../../../assets/hazel.jpg";
import James from "../../../../assets/james.jpg";
import John from "../../../../assets/john.jpg";
import Joyce from "../../../../assets/joyce.jpg";
import Lorene from "../../../../assets/lorene.jpg";
import Loretta from "../../../../assets/loretta.jpg";
import Mary from "../../../../assets/mary.jpg";
import Sylvester from "../../../../assets/sylvester.jpg";
import DefaultAvatar from "../../../../assets/root.png";

const LOCAL_IMAGES = {
  alma: Alma,
  ben: Ben,
  bobbie: Bobbie,
  hazel: Hazel,
  james: James,
  john: John,
  joyce: Joyce,
  lorene: Lorene,
  loretta: Loretta,
  mary: Mary,
  sylvester: Sylvester,
  birdie: DefaultAvatar,
};

const DEMO_NAMES = [
  "Alma",
  "Ben",
  "Bobbie",
  "Hazel",
  "James",
  "John",
  "Joyce",
  "Lorene",
  "Loretta",
  "Mary",
  "Sylvester",
];

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

const getMonthName = (dateValue) => {
  if (!dateValue) return null;
  const match = String(dateValue).match(/(?:^\d{4}-(\d{2})-|^(\d{1,2})\/)/);
  const monthIndex = match ? Number(match[1] || match[2]) - 1 : -1;
  return MONTHS[monthIndex] || null;
};

const resolveAvatarUrl = (supabase, avatarUrl, firstname) => {
  const firstWord = (firstname || "").trim().split(/\s+/)[0].toLowerCase();

  if (!avatarUrl) return LOCAL_IMAGES[firstWord] || DefaultAvatar;
  if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://")) return avatarUrl;

  const baseName = avatarUrl.split(".")[0].toLowerCase();
  if (LOCAL_IMAGES[baseName]) return LOCAL_IMAGES[baseName];

  const matchedKey = Object.keys(LOCAL_IMAGES).find(
    (key) => baseName.startsWith(key) || baseName.includes(key) || firstWord === key
  );
  if (matchedKey) return LOCAL_IMAGES[matchedKey];

  return `${supabase.supabaseUrl}/storage/v1/object/public/avatars/${avatarUrl}`;
};

const normalizeProfile = (supabase, profile, index) => {
  const firstname = profile.firstname || profile.firstName || DEMO_NAMES[index % DEMO_NAMES.length];
  const lastname = profile.lastname || profile.lastName || "";
  const branch = Number(profile.branch || ((index % 5) + 1));

  return {
    id: profile.id || `profile-${index}`,
    firstname,
    lastname,
    displayName: [firstname, lastname].filter(Boolean).join(" "),
    initials: `${firstname[0] || ""}${lastname[0] || ""}`.toUpperCase() || firstname.slice(0, 2).toUpperCase(),
    avatar_url: resolveAvatarUrl(supabase, profile.avatar_url, firstname),
    parent: profile.parent || null,
    ancestor: profile.ancestor || null,
    sunrise: profile.sunrise || profile.birthdate || null,
    sunset: profile.sunset || profile.sunsetDate || null,
    branch,
    created_at: profile.created_at || profile.createdAt || null,
  };
};

const buildDemoProfiles = (minimum = 48) => {
  const profiles = [];
  const currentMonth = new Date().getMonth();

  for (let index = 0; index < minimum; index += 1) {
    const name = DEMO_NAMES[index % DEMO_NAMES.length];
    const branch = (index % 5) + 1;
    const month = index < 12 ? currentMonth : index % 12;
    const day = (index % 27) + 1;
    const parentIndex = index > 9 ? Math.max(0, index - 10) : null;

    profiles.push({
      id: `demo-${index}`,
      firstname: name,
      lastname: "",
      displayName: name,
      initials: name.slice(0, 2).toUpperCase(),
      avatar_url: LOCAL_IMAGES[name.toLowerCase()] || DefaultAvatar,
      parent: parentIndex !== null ? `demo-${parentIndex}` : null,
      ancestor: null,
      sunrise: `19${String(40 + (index % 45)).padStart(2, "0")}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
      sunset: index % 13 === 0 ? `20${String(1 + (index % 20)).padStart(2, "0")}-10-${String(day).padStart(2, "0")}` : null,
      branch,
      created_at: index < 8 ? new Date(Date.now() - index * 86400000).toISOString() : null,
    });
  }

  return profiles;
};

const groupMosaicData = (profiles) => {
  const birthdays = {};
  const branches = {};
  const recentCutoff = Date.now() - 30 * 86400000;

  profiles.forEach((profile) => {
    const month = getMonthName(profile.sunrise);
    if (month) birthdays[month] = [...(birthdays[month] || []), profile];

    const branchName = `Branch ${profile.branch || 1}`;
    branches[branchName] = [...(branches[branchName] || []), profile];
  });

  return {
    profiles,
    birthdays,
    deceased: profiles.filter((profile) => profile.sunset),
    branches,
    recentAdditions: profiles.filter((profile) => {
      if (!profile.created_at) return false;
      return new Date(profile.created_at).getTime() >= recentCutoff;
    }),
  };
};

export const fetchMosaicData = async (supabase) => {
  const demoProfiles = buildDemoProfiles();

  try {
    const { data, error } = await supabase
      .from("profile")
      .select("id, firstname, nickname, lastname, avatar_url, parent, ancestor, sunrise, sunset, branch")
      .limit(300);

    if (error) throw error;

    const realProfiles = (data || []).map((profile, index) => normalizeProfile(supabase, profile, index));
    const merged = [...realProfiles];
    const existingIds = new Set(merged.map((profile) => profile.id));

    demoProfiles.forEach((profile) => {
      if (merged.length < 48 && !existingIds.has(profile.id)) merged.push(profile);
    });

    return groupMosaicData(merged.length > 0 ? merged : demoProfiles);
  } catch (error) {
    console.error("Error fetching mosaic profiles:", error.message);
    return groupMosaicData(demoProfiles);
  }
};

export const buildInitialTileMap = (profiles = []) => {
  const source = profiles.length > 0 ? profiles : buildDemoProfiles(28);

  return Array.from({ length: 28 }, (_, index) => {
    const row = Math.floor(index / 4);
    const col = index % 4;
    const profile = source[index % source.length];

    return {
      id: `${row}-${col}`,
      row,
      col,
      state: "idle",
      zoneId: null,
      content: {
        type: "profile",
        photoUrl: profile.avatar_url,
        name: profile.firstname,
        initials: profile.initials,
      },
      transition: {
        type: "none",
        duration: 0,
        id: Math.random(),
      },
      cropLayout: null,
      cropRegion: "full",
    };
  });
};
