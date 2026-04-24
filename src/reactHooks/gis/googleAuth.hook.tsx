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
    const initTokenCallback = (googleAccessTokenToGD) => {
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
    };

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = initGoogleAuth;
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!currentUser.googleAccessTokenToGD?.access_token) return;

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
  }
}

export const {
  Provider: GoogleAuthProvider,
  useValue: useGoogleAuth,
} = createSingletonProvider(_useGoogleAuth, 'GoogleAuth');
