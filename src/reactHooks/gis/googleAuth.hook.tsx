import { createSingletonProvider } from "services/reactProvider/singletonProvider";
import { LocalStorageKeys, useLocalStorage } from "reactHooks/localStorage/localStorage.hook";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getUserInfo } from "services/userInfo/userInfo.service";

import { log } from "services/log/log.service";

import { leftDrawerSelector } from "state/localState/leftDrawerState";
import { useRecoilState, useSetRecoilState } from "recoil";
import { allStatesSelector, defaultAllStates } from "state/localState/allStates";

import { UserState } from "./userState.type";
import { AllGDscopes, GDScopePrefix, minimalGDscopes } from "const/remoteStorageProviders/googleDrive/GDScopes";

const getUserDefaultState = (): UserState => ({
  loggedIn: false,
  userInfo: null,
  googleAccessTokenToGD: null,
  scopes: [],
});

const tokenMaxAge = 55 * 60 * 1000; // 55 min safety window for 1h OAuth token
const silentRefreshCooldownMs = 5000;
const popupBlockedBackoffMs = 60000;

const isTokenExpired = (receivedAt?: string): boolean => {
  if (!receivedAt) return true;

  const tokenIssuedAt = new Date(receivedAt).getTime();
  if (Number.isNaN(tokenIssuedAt)) return true;

  return (Date.now() - tokenIssuedAt) >= tokenMaxAge;
};

const _useGoogleAuth = () => {
  const setAllStates = useSetRecoilState(allStatesSelector);
  const [drawerState, setDraverState] = useRecoilState(leftDrawerSelector);

  const { items, setItem, getItem, clearLocalStorage } = useLocalStorage();

  const googleSignInRef = useRef(null);
  const silentRefreshRef = useRef({
    inProgress: false,
    lastAttemptAt: 0,
    blockedUntil: 0,
  });
  const [googleAuthReady, setGoogleAuthReady] = useState(false);

  const currentUser = useMemo<Partial<UserState>>((): Partial<UserState> => {
    return getItem(LocalStorageKeys.CURRENT_USER) || getUserDefaultState();
  }, [items[LocalStorageKeys.CURRENT_USER]]);

  useEffect(() => {
    const initTokenCallback = (googleAccessTokenToGD) => {
      silentRefreshRef.current.inProgress = false;

      if (googleAccessTokenToGD?.error) {
        log.appEvent('GoogleAuth: Token request returned an error', googleAccessTokenToGD);

        if (googleAccessTokenToGD.error === 'popup_failed_to_open') {
          silentRefreshRef.current.blockedUntil = Date.now() + popupBlockedBackoffMs;
        }

        const storedUser = getItem(LocalStorageKeys.CURRENT_USER) || getUserDefaultState();
        storedUser.loggedIn = false;
        setItem(LocalStorageKeys.CURRENT_USER, storedUser);
        return;
      }

      const storedUser = getItem(LocalStorageKeys.CURRENT_USER) || getUserDefaultState();
      googleAccessTokenToGD.receivedAt = new Date().toISOString();
      storedUser.googleAccessTokenToGD = googleAccessTokenToGD;
      storedUser.loggedIn = true;
      storedUser.scopes = googleAccessTokenToGD.scope
        .split(GDScopePrefix)
        .map(s => s.trim())
        .filter(Boolean);

      setItem(LocalStorageKeys.CURRENT_USER, storedUser);
      log.appEvent('GoogleAuth: Access token received', storedUser);
      document.dispatchEvent(new Event('loadFilesFromGoogleDrive'));
    };

    const initGoogleAuth = () => {
      googleSignInRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: minimalGDscopes.join(' '),
        callback: initTokenCallback,
        include_granted_scopes: true,
        enable_granular_consent: true,
      });

      setGoogleAuthReady(true);
    };

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = initGoogleAuth;
    document.body.appendChild(script);
  }, []);

  const refreshAccessTokenSilently = useCallback(() => {
    if (!googleSignInRef.current) return false;

    const now = Date.now();

    if (silentRefreshRef.current.inProgress) return false;
    if (now < silentRefreshRef.current.blockedUntil) return false;
    if (now - silentRefreshRef.current.lastAttemptAt < silentRefreshCooldownMs) return false;

    silentRefreshRef.current.inProgress = true;
    silentRefreshRef.current.lastAttemptAt = now;

    googleSignInRef.current.requestAccessToken({ prompt: 'none' });
    return true;
  }, []);

  // Refresh stale token on reload before issuing Drive calls
  useEffect(() => {
    if (!googleAuthReady || !currentUser.loggedIn) return;

    const accessToken = currentUser.googleAccessTokenToGD?.access_token;
    const receivedAt = currentUser.googleAccessTokenToGD?.receivedAt;
    const stale = !accessToken || isTokenExpired(receivedAt);

    if (!stale) return;

    setItem(LocalStorageKeys.CURRENT_USER, {
      ...currentUser,
      loggedIn: false,
    });

    refreshAccessTokenSilently();
  }, [
    googleAuthReady,
    currentUser.loggedIn,
    currentUser.googleAccessTokenToGD?.access_token,
    currentUser.googleAccessTokenToGD?.receivedAt,
    refreshAccessTokenSilently,
    setItem,
  ]);

  useEffect(() => {
    if (!currentUser.googleAccessTokenToGD?.access_token) return;
    if (isTokenExpired(currentUser.googleAccessTokenToGD?.receivedAt)) return;

    getUserInfo(currentUser.googleAccessTokenToGD.access_token)
      .then((userInfo) => {
        if (userInfo) {
          const updatedUser = { ...currentUser };
          updatedUser.userInfo = userInfo;
          setItem(LocalStorageKeys.CURRENT_USER, updatedUser);
          log.appEvent('GoogleAuth: User info retrieved and stored', userInfo);
        }
      })
      .catch((error) => {
        log.error('GoogleAuth: Failed to get user info:', error);
      });
  }, [currentUser.googleAccessTokenToGD?.access_token, setItem]);

  const requestAdditionalScopes = useCallback(() => {
    if (googleSignInRef.current) {
      googleSignInRef.current.requestAccessToken({
        prompt: 'none',
        scope: AllGDscopes.join(' '),
      });
    }
  }, []);

  const login = useCallback(() => {
    if (googleSignInRef.current) {
      silentRefreshRef.current.blockedUntil = 0;
      silentRefreshRef.current.inProgress = true;
      silentRefreshRef.current.lastAttemptAt = Date.now();
      googleSignInRef.current.requestAccessToken({ prompt: 'select_account' });
    }
  }, []);

  const logout = useCallback(() => {
    clearLocalStorage();
    setAllStates(defaultAllStates);
  }, [setAllStates, clearLocalStorage]);

  useEffect(() => {
    const newDrawerState = { ...drawerState };
    newDrawerState.open = !!currentUser.loggedIn;
    setDraverState(newDrawerState);
  }, [currentUser.loggedIn]);

  return {
    currentUser,
    login,
    logout,
    requestAdditionalScopes,
    refreshAccessTokenSilently,
  }
}

export const {
  Provider: GoogleAuthProvider,
  useValue: useGoogleAuth,
} = createSingletonProvider(_useGoogleAuth, 'GoogleAuth');
