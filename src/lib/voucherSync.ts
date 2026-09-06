/**
 * Unified Google Apps Script sync and error formatting for GVTIW Financial System.
 */

export interface BackendSaveResult {
  success: boolean;
  code?: string;
  message?: string;
  error?: string;
}

/**
 * Formats error messages according to strict institutional requirements:
 * - code === "AUTH_FAILED" -> "❌ Not saved — incorrect password. Please check PIN Settings."
 * - code === "QUOTA_EXCEEDED" -> "❌ Not saved — Google quota limit reached. Please try again shortly."
 * - code === "SERVER_ERROR" or any other code -> "❌ Not saved — server error: <message>"
 * - Network / timeout failure -> "❌ Not saved — could not reach the server. Check your internet connection."
 */
export function formatSaveErrorMessage(
  res?: BackendSaveResult | null,
  isNetworkError: boolean = false
): string {
  if (isNetworkError || !res) {
    return '❌ Not saved — could not reach the server. Check your internet connection.';
  }

  const rawCode = res.code;
  const rawMsg = res.message || res.error || '';
  const lowerMsg = rawMsg.toLowerCase();

  let resolvedCode = rawCode;
  if (!resolvedCode) {
    if (
      lowerMsg.includes('unauthorized') ||
      lowerMsg.includes('password') ||
      lowerMsg.includes('pin') ||
      lowerMsg.includes('auth')
    ) {
      resolvedCode = 'AUTH_FAILED';
    } else if (lowerMsg.includes('quota') || lowerMsg.includes('rate limit')) {
      resolvedCode = 'QUOTA_EXCEEDED';
    } else {
      resolvedCode = 'SERVER_ERROR';
    }
  }

  if (resolvedCode === 'AUTH_FAILED') {
    return '❌ Not saved — incorrect password. Please check PIN Settings.';
  }
  if (resolvedCode === 'QUOTA_EXCEEDED') {
    return '❌ Not saved — Google quota limit reached. Please try again shortly.';
  }
  if (resolvedCode === 'NETWORK_ERROR') {
    return '❌ Not saved — could not reach the server. Check your internet connection.';
  }

  return `❌ Not saved — server error: ${rawMsg || 'An unexpected error occurred.'}`;
}

/**
 * Formats deletion error messages according to strict institutional requirements:
 * - code === "AUTH_FAILED" -> "❌ Not deleted — incorrect password. Please check PIN Settings."
 * - code === "QUOTA_EXCEEDED" -> "❌ Not deleted — Google quota limit reached. Please try again shortly."
 * - other / SERVER_ERROR -> "❌ Not deleted — server error: <message>"
 */
export function formatDeleteErrorMessage(
  res?: BackendSaveResult | null,
  isNetworkError: boolean = false
): string {
  if (isNetworkError || !res) {
    return '❌ Not deleted — could not reach the server. Check your internet connection.';
  }

  const rawCode = res.code;
  const rawMsg = res.message || res.error || '';
  const lowerMsg = rawMsg.toLowerCase();

  let resolvedCode = rawCode;
  if (!resolvedCode) {
    if (
      lowerMsg.includes('unauthorized') ||
      lowerMsg.includes('password') ||
      lowerMsg.includes('pin') ||
      lowerMsg.includes('auth')
    ) {
      resolvedCode = 'AUTH_FAILED';
    } else if (lowerMsg.includes('quota') || lowerMsg.includes('rate limit')) {
      resolvedCode = 'QUOTA_EXCEEDED';
    } else {
      resolvedCode = 'SERVER_ERROR';
    }
  }

  if (resolvedCode === 'AUTH_FAILED') {
    return '❌ Not deleted — incorrect password. Please check PIN Settings.';
  }
  if (resolvedCode === 'QUOTA_EXCEEDED') {
    return '❌ Not deleted — Google quota limit reached. Please try again shortly.';
  }
  if (resolvedCode === 'NETWORK_ERROR') {
    return '❌ Not deleted — could not reach the server. Check your internet connection.';
  }

  return `❌ Not deleted — server error: ${rawMsg || 'An unexpected error occurred.'}`;
}

/**
 * Notify the application and header about backend sync status.
 */
export function notifySyncStatus(status: 'connected' | 'failed') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('gvtiw_sync_status_changed', { detail: { status } })
    );
  }
}
