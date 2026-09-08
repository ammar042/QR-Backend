export const DONOR_BADGE_DEFS = [
  { id: "first_donation",   label: "First Drop",       emoji: "🩸", description: "Made your first blood donation",                color: "#dc2626" },
  { id: "regular_donor",    label: "Regular Donor",    emoji: "🔥", description: "Completed 3 or more donations",                 color: "#ea580c" },
  { id: "veteran_donor",    label: "Veteran Donor",    emoji: "⭐", description: "Completed 10 or more donations",                color: "#d97706" },
  { id: "elite_donor",      label: "Elite Donor",      emoji: "🏆", description: "Completed 25 or more donations",                color: "#7c3aed" },
  { id: "legendary_donor",  label: "Legendary",        emoji: "💎", description: "Completed 50 or more donations — a true hero",  color: "#0891b2" },
  { id: "one_year",         label: "1 Year Journey",   emoji: "📅", description: "Donor for over 1 year",                        color: "#059669" },
  { id: "three_year",       label: "3 Year Streak",    emoji: "🎯", description: "Donor for over 3 years",                       color: "#0369a1" },
  { id: "linked_org",       label: "Team Player",      emoji: "🏥", description: "Linked to a blood bank or organization",       color: "#9f1239" },
  { id: "multi_org",        label: "Multi Partner",    emoji: "🤝", description: "Linked to 3 or more organizations",            color: "#be185d" },
  { id: "rare_blood",       label: "Rare Blood",       emoji: "🦋", description: "Has a rare blood group (O- or AB-)",           color: "#6d28d9" },
  { id: "verified",         label: "Verified Hero",    emoji: "✅", description: "Verified donor account",                       color: "#065f46" },
  { id: "complete_profile", label: "Profile Complete", emoji: "🌟", description: "Filled in all profile information",            color: "#92400e" },
];

export const ORG_BADGE_DEFS = [
  { id: "first_open",    label: "Doors Open",     emoji: "🏥", description: "Registered blood bank on Blood Needer",      color: "#9f1239" },
  { id: "community_hub", label: "Community Hub",  emoji: "👥", description: "5 or more donors linked",                   color: "#0369a1" },
  { id: "large_network", label: "Large Network",  emoji: "🌍", description: "25 or more donors linked",                  color: "#065f46" },
  { id: "well_stocked",  label: "Well Stocked",   emoji: "🩸", description: "Over 1,000 ml of blood in stock",           color: "#dc2626" },
  { id: "blood_reserve", label: "Blood Reserve",  emoji: "💉", description: "Over 5,000 ml of blood in stock",           color: "#7c3aed" },
  { id: "full_spectrum", label: "Full Spectrum",  emoji: "🔬", description: "All 8 blood groups in stock",               color: "#0891b2" },
  { id: "all_types",     label: "All Types",      emoji: "📦", description: "4 or more blood groups in stock",           color: "#059669" },
  { id: "active_org",    label: "Active Org",     emoji: "⚡", description: "10 or more donations recorded",             color: "#d97706" },
  { id: "high_volume",   label: "High Volume",    emoji: "🏆", description: "50 or more donations recorded",             color: "#92400e" },
];

export function computeDonorBadges(donor) {
  const earned = [];
  const count = donor.donationHistory?.length || 0;
  const accountAgeDays = donor.createdAt
    ? Math.floor((new Date() - new Date(donor.createdAt)) / 86400000)
    : 0;

  if (count >= 1)  earned.push("first_donation");
  if (count >= 3)  earned.push("regular_donor");
  if (count >= 10) earned.push("veteran_donor");
  if (count >= 25) earned.push("elite_donor");
  if (count >= 50) earned.push("legendary_donor");

  if (accountAgeDays >= 365)  earned.push("one_year");
  if (accountAgeDays >= 1095) earned.push("three_year");

  if ((donor.linkedOrganizations?.length || 0) >= 1) earned.push("linked_org");
  if ((donor.linkedOrganizations?.length || 0) >= 3) earned.push("multi_org");

  if (["O-", "AB-"].includes(donor.bloodGroup)) earned.push("rare_blood");
  if (donor.isVerified) earned.push("verified");

  const hasCompleteProfile =
    donor.firstName && donor.lastName && donor.phone && donor.email &&
    donor.bloodGroup && donor.address && donor.district && donor.province;
  if (hasCompleteProfile) earned.push("complete_profile");

  return DONOR_BADGE_DEFS.filter((b) => earned.includes(b.id));
}

export function computeOrgBadges(org) {
  const earned = [];

  earned.push("first_open");

  const donorCount = org.donors?.length || 0;
  if (donorCount >= 5)  earned.push("community_hub");
  if (donorCount >= 25) earned.push("large_network");

  let totalStock = 0;
  let groupsInStock = 0;
  if (org.bloodStock) {
    Object.values(org.bloodStock).forEach((ml) => {
      if (ml > 0) { totalStock += ml; groupsInStock++; }
    });
  }

  if (totalStock >= 1000)  earned.push("well_stocked");
  if (totalStock >= 5000)  earned.push("blood_reserve");
  if (groupsInStock >= 4)  earned.push("all_types");
  if (groupsInStock >= 8)  earned.push("full_spectrum");

  const donationCount = org.dispenseHistory?.length || 0;
  if (donationCount >= 10) earned.push("active_org");
  if (donationCount >= 50) earned.push("high_volume");

  return ORG_BADGE_DEFS.filter((b) => earned.includes(b.id));
}