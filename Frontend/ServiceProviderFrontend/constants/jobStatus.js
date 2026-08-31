export const JOB_STATUS = {
  PENDING:  { key: 'pending',  label: 'Pending',           labelSi: 'බලා සිටිමින්',        color: '#F59E0B', bg: '#FEF3C7', icon: 'schedule'        },
  SELECTED: { key: 'selected', label: 'You are Selected!', labelSi: 'ඔබ තෝරා ගන්නා ලදී!', color: '#16A34A', bg: '#DCFCE7', icon: 'check-circle'    },
  REJECTED: { key: 'rejected', label: 'Rejected', labelSi: 'ප්‍රතික්ෂේප කරන ලදී', color: '#DC2626', bg: '#FEE2E2', icon: 'cancel'          },
  TAKEN:    { key: 'taken',    label: 'Taken by Another',  labelSi: 'වෙනත් කෙනෙකු විසින්', color: '#DC2626', bg: '#FEE2E2', icon: 'cancel'          },
  EXPIRED:  { key: 'expired',  label: 'Job Expired',       labelSi: 'රැකියාව කල් ඉකුත් විය', color: '#6B7280', bg: '#F3F4F6', icon: 'hourglass-empty' },
};
