export function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

function bestWordDistance(query, name) {
  let best = levenshteinDistance(query, name);
  for (const word of name.split(/\s+/)) {
    best = Math.min(best, levenshteinDistance(query, word));
  }
  return best;
}

// Lower is better; null means "not a match at all".
export function matchScore(query, name) {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return null;

  const n = name.toLowerCase();
  const substringIndex = n.indexOf(q);
  if (substringIndex !== -1) {
    return substringIndex;
  }

  const maxDistance = Math.max(2, Math.floor(q.length * 0.3));
  const distance = bestWordDistance(q, n);
  return distance <= maxDistance ? 1000 + distance : null;
}
