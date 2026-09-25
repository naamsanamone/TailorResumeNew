/**
 * useExtensionBridge — React hook for LinkedApply Pro Chrome Extension integration.
 *
 * Detects if the extension is installed, parses URL query params from the extension,
 * and provides methods to communicate with the extension.
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Chrome runtime types for externally_connectable messaging
// Available on web pages when the extension declares externally_connectable
declare global {
  interface Window {
    chrome?: {
      runtime?: {
        sendMessage: (
          extensionId: string,
          message: any,
          callback: (response: any) => void
        ) => void;
        lastError?: { message: string } | null;
      };
    };
  }
}

// The extension ID from Chrome Web Store — update this after publishing
// For unpacked extensions during development, this will be different
const EXTENSION_ID_KEY = 'NEXT_PUBLIC_LINKEDAPPLY_EXTENSION_ID';

interface ExtensionInfo {
  connected: boolean;
  version: string;
  name: string;
}

export interface LinkedApplyJobContext {
  title: string;
  company: string;
  location: string;
  jobId: string;
  description: string;    // The full JD text
  jobLink: string;
  experienceRequired: string;
  source: 'linkedapply-pro';
}

interface ExtensionBridgeState {
  /** Whether the extension is detected and connected */
  extensionDetected: boolean;
  /** Extension info (version, name) */
  extensionInfo: ExtensionInfo | null;
  /** Job context received from extension URL params */
  jobContext: LinkedApplyJobContext | null;
  /** Whether we arrived from the extension (has `from=linkedapply` param) */
  isFromExtension: boolean;
  /** Whether we're currently checking extension connection */
  checking: boolean;
  /** Send tailored resume back to extension (Phase 4b) */
  sendTailoredResume: (data: any) => Promise<boolean>;
  /** Clear the job context (after user has processed it) */
  clearJobContext: () => void;
}

/**
 * Try to detect the LinkedApply Pro extension by sending a PING message.
 * Tries multiple extension IDs (env var, URL param, or common dev IDs).
 */
async function detectExtension(extensionId?: string): Promise<ExtensionInfo | null> {
  // Extension messaging only works in Chrome with the chrome.runtime API
  if (typeof window === 'undefined' || !window.chrome?.runtime?.sendMessage) {
    return null;
  }

  const idsToTry: string[] = [];

  // 1. Explicit extension ID from env
  const envId = process.env[EXTENSION_ID_KEY] || process.env.NEXT_PUBLIC_LINKEDAPPLY_EXTENSION_ID;
  if (envId) idsToTry.push(envId);

  // 2. Extension ID from URL param (set by extension when opening the tab)
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const urlExtId = urlParams.get('extId');
    if (urlExtId && !idsToTry.includes(urlExtId)) idsToTry.push(urlExtId);
  }

  // 3. If provided directly
  if (extensionId && !idsToTry.includes(extensionId)) idsToTry.push(extensionId);

  for (const id of idsToTry) {
    try {
      const response = await new Promise<any>((resolve, reject) => {
        window.chrome!.runtime!.sendMessage(
          id,
          { type: 'PING', timestamp: Date.now() },
          (resp: any) => {
            if (window.chrome?.runtime?.lastError) {
              reject(new Error(window.chrome.runtime.lastError.message));
            } else {
              resolve(resp);
            }
          }
        );
      });

      if (response?.success) {
        return {
          connected: true,
          version: response.version || 'unknown',
          name: response.name || 'LinkedApply Pro',
        };
      }
    } catch {
      // Extension not found with this ID, try next
    }
  }

  return null;
}

/**
 * Parse job context from URL query parameters.
 * The extension encodes the JD as base64 in the `jd` param.
 */
function parseJobContextFromURL(): LinkedApplyJobContext | null {
  if (typeof window === 'undefined') return null;

  const params = new URLSearchParams(window.location.search);
  const from = params.get('from');

  if (from !== 'linkedapply') return null;

  const jdBase64 = params.get('jd');
  let description = '';

  if (jdBase64) {
    try {
      description = decodeURIComponent(escape(atob(jdBase64)));
    } catch (e) {
      console.error('Failed to decode JD from URL:', e);
      description = '';
    }
  }

  // Only return context if we have a description
  if (!description) return null;

  return {
    title: params.get('title') || '',
    company: params.get('company') || '',
    location: params.get('location') || '',
    jobId: params.get('jobId') || '',
    description,
    jobLink: '',  // Not passed in URL for brevity
    experienceRequired: '',
    source: 'linkedapply-pro',
  };
}

export function useExtensionBridge(): ExtensionBridgeState {
  const [extensionDetected, setExtensionDetected] = useState(false);
  const [extensionInfo, setExtensionInfo] = useState<ExtensionInfo | null>(null);
  const [jobContext, setJobContext] = useState<LinkedApplyJobContext | null>(null);
  const [isFromExtension, setIsFromExtension] = useState(false);
  const [checking, setChecking] = useState(true);
  const initialized = useRef(false);

  // Parse URL params and detect extension on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const init = async () => {
      setChecking(true);

      // 1. Check if we came from the extension
      const context = parseJobContextFromURL();
      if (context) {
        setJobContext(context);
        setIsFromExtension(true);

        // Clean URL params without triggering navigation
        const url = new URL(window.location.href);
        url.search = '';
        window.history.replaceState({}, '', url.toString());
      }

      // 2. Try to detect the extension
      const info = await detectExtension();
      if (info) {
        setExtensionDetected(true);
        setExtensionInfo(info);
      }

      setChecking(false);
    };

    init();
  }, []);

  // Send tailored resume back to extension (Phase 4b)
  const sendTailoredResume = useCallback(async (data: any): Promise<boolean> => {
    if (!extensionInfo?.connected) return false;

    const envId = process.env.NEXT_PUBLIC_LINKEDAPPLY_EXTENSION_ID;
    if (!envId) return false;

    try {
      const response = await new Promise<any>((resolve, reject) => {
        window.chrome!.runtime!.sendMessage(
          envId,
          {
            type: 'IMPORT_TAILORED_RESUME',
            payload: data,
            timestamp: Date.now(),
          },
          (resp: any) => {
            if (window.chrome?.runtime?.lastError) {
              reject(new Error(window.chrome.runtime.lastError.message));
            } else {
              resolve(resp);
            }
          }
        );
      });

      return response?.success === true;
    } catch (error) {
      console.error('Failed to send tailored resume to extension:', error);
      return false;
    }
  }, [extensionInfo]);

  const clearJobContext = useCallback(() => {
    setJobContext(null);
    setIsFromExtension(false);
  }, []);

  return {
    extensionDetected,
    extensionInfo,
    jobContext,
    isFromExtension,
    checking,
    sendTailoredResume,
    clearJobContext,
  };
}
