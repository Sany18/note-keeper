import { useCallback } from "react";
import { useGoogleAuth } from "reactHooks/gis/googleAuth.hook";
import { useActiveFile } from "reactHooks/fileManager/activeFile/activeFile.hook";
import { GoogleAuthError } from "reactHooks/gis/dto/error.dto";
import { LocalStorageKeys, useLocalStorage } from "reactHooks/localStorage/localStorage.hook";

import { log } from "services/log/log.service";

import { GapiError } from "dtos/googleDrive/error.dto";

export const useGapiErrorHandler = () => {
  const { setItem } = useLocalStorage();
  const { currentUser } = useGoogleAuth();
  const { activeFileInfo, setActiveFileInfo } = useActiveFile();

  const checkGDAccessToken = useCallback(() => {
    if (!currentUser.googleAccessTokenToGD?.receivedAt) return;

    const currentTokenReceivedAt = new Date(currentUser.googleAccessTokenToGD?.receivedAt).getTime();
    const currentTime = new Date().getTime();
    const oneHour = 1000 * 60 * 60; // 1 hour

    if (currentTime - currentTokenReceivedAt >= oneHour) {
      currentUser.loggedIn = false;

      setItem(LocalStorageKeys.CURRENT_USER, currentUser);
    }
  }, [currentUser, setItem]);

  const handleError = useCallback((source: string, error: GapiError & GoogleAuthError, message?: string) => {
    const errorMessage = error.result?.error?.message || error.error;
    const errorDetails = error.body || error.details;
    const errorStatusCode = error.status;

    setActiveFileInfo({ error: errorMessage, isFileDownloadingFromRemoteStorage: false });

    // checkGDAccessToken();

    if (errorMessage && errorDetails) {
      if (message) {
        log.error(`${source}:`, message, '|', errorMessage);
      } else {
        log.error(`${source}:`, errorMessage);
      }
    } else {
      log.error(`${source}:`, error);
    }

    if (errorStatusCode === 401 || errorStatusCode === 404) {
      // currentUser.loggedIn = false;

      setItem(LocalStorageKeys.CURRENT_USER, currentUser);
    }

    return errorMessage;
  }, [activeFileInfo, checkGDAccessToken]);

  return {
    handleError,
  }
}
