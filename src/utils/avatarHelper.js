import { supabase } from "../supabaseClient";

// Import local assets
import Alma from "../assets/alma.jpg";
import Ben from "../assets/ben.jpg";
import Bobbie from "../assets/bobbie.jpg";
import Hazel from "../assets/hazel.jpg";
import James from "../assets/james.jpg";
import John from "../assets/john.jpg";
import Joyce from "../assets/joyce.jpg";
import Lorene from "../assets/lorene.jpg";
import Loretta from "../assets/loretta.jpg";
import Mary from "../assets/mary.jpg";
import Sylvester from "../assets/sylvester.jpg";
import DefaultAvatar from "../assets/root.png"; // Birdie Mae default

const localImages = {
  "alma.jpg": Alma,
  "ben.jpg": Ben,
  "bobbie.jpg": Bobbie,
  "hazel.jpg": Hazel,
  "james.jpg": James,
  "john.jpg": John,             // John Henry (seeded as john.jpg)
  "john_snake.jpg": John,       // John the son (seeded as john_snake.jpg)
  "joyce.jpg": Joyce,
  "lorene.jpg": Lorene,
  "loretta.jpg": Loretta,
  "mary.jpg": Mary,
  "sylvester.jpg": Sylvester,
  "birdie.jpg": DefaultAvatar,  // Birdie Mae
};

export const getAvatarSrc = (profile) => {
  if (!profile) return null;
  const avatarUrl = profile.avatar_url;
  if (!avatarUrl) return null;

  // Clean cache-busting parameters if present (e.g. james.jpg?t=123)
  const cleanUrl = avatarUrl.split("?")[0];

  // 1. Check if it matches a local static image file name
  if (localImages[cleanUrl]) {
    return localImages[cleanUrl];
  }

  // 2. If it is a fully-qualified URL, return it directly
  if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://")) {
    return avatarUrl;
  }

  // 3. Custom upload from Supabase avatars bucket
  return `${supabase.supabaseUrl}/storage/v1/object/public/avatars/${avatarUrl}`;
};
