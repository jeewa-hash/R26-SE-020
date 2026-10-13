const firstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== "");

const toOptionalNumber = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Builds the payload expected by Duration ML v2.
 *
 * IMPORTANT: No seeker/provider-entered duration is used here.
 * The duration model predicts service duration from service/task/provider context.
 * Missing optional numeric context is sent as null and handled by the Python
 * preprocessing pipeline.
 */
export const buildDurationPredictionPayload = ({
  requestQuotation,
  providerQuotation,
}) => ({
  serviceCategory: String(
    firstDefined(
      requestQuotation.serviceCategory,
      requestQuotation.detectedCategory,
      providerQuotation.serviceCategory,
      providerQuotation.category,
      "Unknown"
    )
  ).trim(),

  serviceType: String(
    firstDefined(
      requestQuotation.serviceType,
      requestQuotation.serviceSubcategory,
      providerQuotation.serviceType,
      providerQuotation.serviceSubcategory,
      providerQuotation.category,
      "Unknown"
    )
  ).trim(),

  taskName: String(
    firstDefined(
      requestQuotation.taskName,
      requestQuotation.detectedTask,
      requestQuotation.detectedObject,
      providerQuotation.taskName,
      providerQuotation.serviceName,
      requestQuotation.serviceSubcategory,
      requestQuotation.detectedCategory,
      "Unknown"
    )
  ).trim(),

  yearsExperience: toOptionalNumber(
    firstDefined(
      providerQuotation.yearsExperience,
      providerQuotation.providerYearsExperience,
      providerQuotation.providerSnapshot?.yearsExperience
    )
  ),

  taskFrequencyPerMonth: toOptionalNumber(
    firstDefined(
      providerQuotation.taskFrequencyPerMonth,
      providerQuotation.providerTaskFrequencyPerMonth,
      providerQuotation.providerSnapshot?.taskFrequencyPerMonth
    )
  ),

  plannedTeamSize: toOptionalNumber(
    firstDefined(
      providerQuotation.plannedTeamSize,
      providerQuotation.teamSize,
      providerQuotation.numberOfWorkers,
      providerQuotation.providerSnapshot?.teamSize
    )
  ),
});
