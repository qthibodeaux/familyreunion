import { supabase } from "../supabaseClient";

/**
 * Updates the branch numbers for a family tree starting from the given profile
 * @param {string} profileId - The ID of the profile to start updating from
 * @param {number} newBranch - The new branch number to set
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

  // Get all children of the current profile
  const { data: children, error: childrenError } = await supabase
    .from("profile")
    .select("id")
    .eq("parent", profileId);

  if (childrenError) {
    console.error("Error fetching children:", childrenError);
    return;
  }

  // Recursively update all children with branch + 1
  for (const child of children) {
    await updateFamilyBranch(child.id, newBranch + 1, processed);
  }
};

/**
 * Updates the ancestor reference for a profile and all its descendants
 * @param {string} profileId - The ID of the profile to update
 * @param {string} ancestorId - The ID of the ancestor
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

  // Get all children of the current profile
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
