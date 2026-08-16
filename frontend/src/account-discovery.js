const ANCHOR_PATTERN = /^sensor\.league_stats_(.+)_last_match$/;

function fallbackLabel(id) {
  return id.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("#");
}

export function discoverAccounts(states = {}) {
  return Object.entries(states)
    .map(([entityId, stateObj]) => {
      const match = entityId.match(ANCHOR_PATTERN);
      if (!match) return null;
      const id = match[1];
      const friendlyName = stateObj?.attributes?.friendly_name || "";
      const labelMatch = friendlyName.match(/^League Stats - (.+) Last Match$/);
      return {
        id,
        label: stateObj?.attributes?.account || labelMatch?.[1] || fallbackLabel(id),
        prefix: `sensor.league_stats_${id}`,
        anchorEntityId: entityId,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label));
}

export function resolveAccount(states = {}, configuredId) {
  const accounts = discoverAccounts(states);
  if (configuredId) {
    const account = accounts.find((candidate) => candidate.id === configuredId);
    return account
      ? { status: "ready", accounts, account }
      : { status: "configured_account_missing", accounts, account: null };
  }
  if (accounts.length === 1) return { status: "ready", accounts, account: accounts[0] };
  if (accounts.length > 1) return { status: "selection_required", accounts, account: null };
  return { status: "not_found", accounts, account: null };
}
