import { createSingletonProvider } from "services/reactProvider/singletonProvider";
import { LocalStorageKeys, useLocalStorage } from "reactHooks/localStorage/localStorage.hook";
import { useCallback, useEffect, useMemo, useRef } from "react";
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

const _useGoogleAuth = () => {
  const setAllStates = useSetRecoilState(allStatesSelector);
  const [drawerState, setDraverState] = useRecoilState(leftDrawerSelector);

  const { items, setItem, getItem, clearLocalStorage } = useLocalStorage();

  const googleSignInRef = useRef(null);

  const currentUser = useMemo<Partial<UserState>>((): Partial<UserState> => {
    return getItem(LocalStorageKeys.CURRENT_USER) || getUserDefaultState();
  }, [items[LocalStorageKeys.CURRENT_USER]]);

  useEffect(() => {
    const currentUser = getItem(LocalStorageKeys.CURRENT_USER) || getUserDefaultState();

    const initTokenCallback = (googleAccessTokenToGD) => {
      googleAccessTokenToGD.receivedAt = new Date().toISOString();
      currentUser.googleAccessTokenToGD = googleAccessTokenToGD;
      currentUser.loggedIn = true;
      currentUser.scopes = googleAccessTokenToGD.scope
        .split(`${GDScopePrefix}`)
        .map(s => s.trim())
        .filter(s => s);

      setItem(LocalStorageKeys.CURRENT_USER, currentUser);
      log.appEvent('GoogleAuth: Access token for Google Drive received', currentUser);

      document.dispatchEvent(new Event('loadFilesFromGoogleDrive'));
    };

    const initGoogleAuth = () => {
      ////////////
      // 1 step //
      ////////////
      // Create sign in and allow access handler
      googleSignInRef.current = window.google.accounts.oauth2.initTokenClient({
        scope: minimalGDscopes.join(' '),
        callback: initTokenCallback,
        client_id: process.env.VITE_GOOGLE_CLIENT_ID,
        include_granted_scopes: true,
        enable_granular_consent: true,
      });
    };

    ////////////
    // 0 step //
    ////////////
    // Load Google script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = initGoogleAuth;
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (currentUser.googleAccessTokenToGD?.access_token) {
      // Try to get user info from Google APIs
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
    } else {
      // Unauthorized. Silent login
      googleSignInRef.current?.requestAccessToken({ propmt: '' });
    }
  }, [currentUser.googleAccessTokenToGD?.access_token, setItem]);

  const requestAdditionalScopes = useCallback(() => {
    if (googleSignInRef.current) {
      googleSignInRef.current.requestAccessToken({
        propmt: 'none',
        scope: AllGDscopes.join(' '),
      });
    }
  }, [googleSignInRef]);

  // Request access token for access Google Drive manually
  const login = useCallback(() => {
    if (googleSignInRef.current) {
      googleSignInRef.current.requestAccessToken({ propmt: '' });
    }
  }, [googleSignInRef]);

  const logout = useCallback(() => {
    clearLocalStorage();
    setAllStates(defaultAllStates); // Reset state in Recoil with selector do nothing
  }, [setAllStates, clearLocalStorage]);

  useEffect(() => {
    const newDrawerState = { ...drawerState };

    if (currentUser.loggedIn) {
      newDrawerState.open = true;
      setDraverState(newDrawerState);
    } else {
      newDrawerState.open = false;
      setDraverState(newDrawerState);
    }
  }, [currentUser.loggedIn]);

  return {
    currentUser,
    login,
    logout,
    requestAdditionalScopes,
  }
}

export const {
  Provider: GoogleAuthProvider,
  useValue: useGoogleAuth,
} = createSingletonProvider(_useGoogleAuth, 'GoogleAuth');
