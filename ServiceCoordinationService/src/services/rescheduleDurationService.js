import { getProviderQuotationById } from '../clients/providerServiceClient.js';
import { getRequestQuotationById } from '../clients/seekerServiceClient.js';
import { predictDuration } from '../clients/mlPredictionClient.js';
import { buildDurationPredictionPayload } from './mlPayloadBuilderService.js';
import { estimateServiceDuration } from './durationEstimationService.js';

// Reuse the initial coordination model contract, never the old duration or a client end time.
export async function predictRescheduleDuration(booking) {
  if (!booking.externalQuotationId || !booking.externalRequestQuotationId) {
    throw new Error('Linked quotation details are required to reevaluate service duration.');
  }
  const [providerQuotation, requestQuotation] = await Promise.all([
    getProviderQuotationById(booking.externalQuotationId),
    getRequestQuotationById(booking.externalRequestQuotationId),
  ]);
  const payload = buildDurationPredictionPayload({ providerQuotation, requestQuotation });
  const prediction = await predictDuration(payload);
  const hasModel = Number.isFinite(Number(prediction?.predictedDurationMins)) && Number(prediction.predictedDurationMins) > 0;
  const reference = hasModel ? null : estimateServiceDuration({
    serviceCategory: payload.serviceCategory, serviceSubcategory: payload.serviceType,
    taskName: payload.taskName, urgency: requestQuotation.urgencyLevel,
  });
  const predictedDurationMins = Math.round(hasModel ? Number(prediction.predictedDurationMins) : Number(reference?.averageDurationHours || 2) * 60);
  if (!(predictedDurationMins > 0)) throw new Error('Unable to calculate service duration.');
  return {
    durationHours: predictedDurationMins / 60,
    evidence: {
      capturedAt: new Date(), submittedPayload: payload,
      inputSources: providerQuotation.modelInputSources || {}, taskHistorySnapshot: providerQuotation.taskHistorySnapshot || null,
      prediction: hasModel ? prediction : null, predictedDurationMins, bufferMinutes: 15,
      source: hasModel ? prediction.source || 'TRAINED_DURATION_MODEL' : 'REFERENCE_DURATION_FALLBACK',
      modelVersion: hasModel ? prediction.modelVersion || null : null,
    },
  };
}
