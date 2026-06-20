import { supabase } from "../supabaseClient";

/**
 * Updates the branch numbers for a family tree starting from the given profile,
 * recursively updating all descendants and their spouses.
 * @param {string} profileId - The ID of the profile to start updating from
 * @param {number|null} newBranch - The new branch number to set
 * @param {Set} [processed=new Set()] - Set to track processed profiles and prevent cycles
 */
export const updateFamilyBranch = async (
  profileId,
  newBranch,
  processed = new Set(),
) => {
  // Prevent infinite recursion
  if (processed.has(profileId)) return;
  processed.add(profileId);

  // Update the current profile's branch
  const { error: updateError } = await supabase
    .from("profile")
    .update({ branch: newBranch })
    .eq("id", profileId);

  if (updateError) {
    console.error("Error updating branch:", updateError);
    return;
  }

  // 1. Fetch active spouse connections to also update their branch
  const { data: spouseConns, error: spouseError } = await supabase
    .from("connection")
    .select("profile_2")
    .eq("profile_1", profileId)
    .eq("connection_type", "spouse")
    .eq("status", "active");

  if (!spouseError && spouseConns) {
    for (const conn of spouseConns) {
      const spouseId = conn.profile_2;
      await updateFamilyBranch(spouseId, newBranch, processed);
    }
  }

  // 2. Get all children of the current profile
  const { data: children, error: childrenError } = await supabase
    .from("profile")
    .select("id")
    .eq("parent", profileId);

  if (childrenError) {
    console.error("Error fetching children:", childrenError);
    return;
  }

  // Recursively update all children with branch + 1 (unless newBranch is null)
  const nextBranch = newBranch !== null && newBranch !== undefined ? newBranch + 1 : null;
  for (const child of children) {
    await updateFamilyBranch(child.id, nextBranch, processed);
  }
};

/**
 * Updates the ancestor reference for a profile, all its descendants, and their spouses.
 * @param {string} profileId - The ID of the profile to update
 * @param {string|null} ancestorId - The ID of the ancestor
 * @param {Set} [processed=new Set()] - Set to track processed profiles and prevent cycles
 */
export const updateAncestorReference = async (
  profileId,
  ancestorId,
  processed = new Set(),
) => {
  // Prevent infinite recursion
  if (processed.has(profileId)) return;
  processed.add(profileId);

  // Update the current profile's ancestor
  const { error: updateError } = await supabase
    .from("profile")
    .update({ ancestor: ancestorId })
    .eq("id", profileId);

  if (updateError) {
    console.error("Error updating ancestor reference:", updateError);
    return;
  }

  // 1. Fetch active spouse connections to also update their ancestor reference
  const { data: spouseConns, error: spouseError } = await supabase
    .from("connection")
    .select("profile_2")
    .eq("profile_1", profileId)
    .eq("connection_type", "spouse")
    .eq("status", "active");

  if (!spouseError && spouseConns) {
    for (const conn of spouseConns) {
      const spouseId = conn.profile_2;
      await updateAncestorReference(spouseId, ancestorId, processed);
    }
  }

  // 2. Get all children of the current profile
  const { data: children, error: childrenError } = await supabase
    .from("profile")
    .select("id")
    .eq("parent", profileId);

  if (childrenError) {
    console.error("Error fetching children:", childrenError);
    return;
  }

  // Recursively update all children
  for (const child of children) {
    await updateAncestorReference(child.id, ancestorId, processed);
  }
};
