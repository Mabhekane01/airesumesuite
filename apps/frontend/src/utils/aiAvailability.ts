export type AIProviderFailure =
  | {
      provider: string;
      reason?: string;
      message?: string;
      status?: number;
    }
  | string;

type AIAvailabilityMeta = {
  mode?: string;
  confidence?: string;
  providerFailures?: AIProviderFailure[];
  reason?: string;
};

const REASON_LABELS: Record<string, string> = {
  rate_limit: 'rate limit',
  quota: 'quota exceeded',
  invalid_key: 'invalid key',
  unauthorized: 'unauthorized',
  service_unavailable: 'service unavailable',
  timeout: 'timeout',
  unknown: 'unknown error'
};

const toTitleCase = (value: string) =>
  value ? value.charAt(0).toUpperCase() + value.slice(1) : value;

export const formatProviderFailures = (
  providerFailures?: AIProviderFailure[]
): string | null => {
  if (!providerFailures || providerFailures.length === 0) {
    return null;
  }

  const entries = providerFailures
    .map((entry) => {
      if (typeof entry === 'string') {
        const [provider, ...rest] = entry.split('_');
        const reason = rest.join('_');
        const reasonLabel = reason
          ? reason.replace(/_/g, ' ')
          : 'error';
        return `${toTitleCase(provider)}: ${reasonLabel}`;
      }

      const reasonLabel = entry.reason
        ? REASON_LABELS[entry.reason] || entry.reason.replace(/_/g, ' ')
        : 'error';

      return `${toTitleCase(entry.provider)}: ${reasonLabel}`;
    })
    .filter(Boolean);

  return entries.length > 0 ? entries.join('; ') : null;
};

export const buildAIUnavailableToast = (
  meta: AIAvailabilityMeta
): { title: string; description?: string } | null => {
  const hasFallback =
    meta.mode === 'fallback' ||
    meta.confidence === 'low' ||
    (meta.providerFailures && meta.providerFailures.length > 0);

  if (!hasFallback) {
    return null;
  }

  const details: string[] = [];
  if (meta.reason) {
    details.push(meta.reason);
  }

  const failures = formatProviderFailures(meta.providerFailures);
  if (failures) {
    details.push(`Providers: ${failures}`);
  }

  return {
    title: 'AI temporarily unavailable',
    description: details.length > 0 ? details.join(' ') : 'Using fallback analysis.'
  };
};

export const getAIUnavailableToastFromError = (
  error: any
): { title: string; description?: string } | null => {
  const data = error?.response?.data;
  const meta: AIAvailabilityMeta = {
    mode: data?.mode || data?.data?.mode,
    confidence: data?.confidence || data?.data?.confidence,
    providerFailures: data?.providerFailures || data?.data?.providerFailures,
    reason: data?.reason || data?.data?.reason
  };

  const toast = buildAIUnavailableToast(meta);
  if (toast) {
    return toast;
  }

  const message =
    data?.error ||
    data?.message ||
    error?.message ||
    '';
  const lower = message.toLowerCase();
  const matches =
    lower.includes('ai provider') ||
    lower.includes('ai service') ||
    lower.includes('quota') ||
    lower.includes('rate limit') ||
    lower.includes('invalid api key') ||
    lower.includes('resource_exhausted');

  if (!matches) {
    return null;
  }

  return {
    title: 'AI temporarily unavailable',
    description: message
  };
};
