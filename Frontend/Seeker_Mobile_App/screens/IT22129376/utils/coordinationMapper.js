export const mapCoordinationDecision = (decision) => {
  switch ((decision || '').toUpperCase()) {
    case 'CAN_ACCEPT':
      return {
        label: 'Ready to Confirm',
        message: 'This quote can be scheduled based on provider availability.',
        tone: 'success',
        icon: 'verified',
      };
    case 'AVAILABLE_WITH_CAUTION':
      return {
        label: 'Available with Minor Risk',
        message: 'This quote can be accepted, but please review the delay risk.',
        tone: 'warning',
        icon: 'report-problem',
      };
    case 'RESCHEDULE_REQUIRED':
      return {
        label: 'Choose Another Time',
        message: 'The proposed time has a scheduling conflict. Please choose a suggested slot.',
        tone: 'warning',
        icon: 'event-repeat',
      };
    case 'REJECTED_DUE_TO_CONFLICT':
      return {
        label: 'Cannot Schedule',
        message: 'The provider is not available for the selected time.',
        tone: 'danger',
        icon: 'event-busy',
      };
    default:
      return {
        label: 'Not Checked',
        message: 'Availability and schedule risk have not been checked yet.',
        tone: 'neutral',
        icon: 'help-outline',
      };
  }
};

export const mapDelayRisk = (riskLevel) => {
  switch ((riskLevel || '').toLowerCase()) {
    case 'low':
      return { label: 'Low Risk', tone: 'success' };
    case 'medium':
      return { label: 'Medium Risk', tone: 'warning' };
    case 'high':
      return { label: 'High Risk', tone: 'danger' };
    default:
      return { label: 'Unknown Risk', tone: 'neutral' };
  }
};
