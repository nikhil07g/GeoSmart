export function scoreSeverity({
  category,
  confidence = 0,
  duplicateCount = 0,
  nearbyCount = 0,
  ageHours = 0,
}) {
  const categoryWeight =
    {
      "Illegal Dumping": 38,
      "E-Waste": 30,
      "Construction Waste": 28,
      "Mixed Waste": 24,
      "Plastic Waste": 20,
      "Organic Waste": 16,
    }[category] ?? 18;
  const score = Math.min(
    100,
    Math.round(
      categoryWeight +
        confidence * 0.25 +
        Math.min(duplicateCount, 8) * 4 +
        Math.min(nearbyCount, 8) * 2 +
        Math.min(ageHours, 72) * 0.15,
    ),
  );
  return {
    severityScore: score,
    severity: score >= 80 ? "CRITICAL" : score >= 60 ? "HIGH" : score >= 35 ? "MEDIUM" : "LOW",
  };
}
