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
    // Handle token returned via OAuth redirect (hash contains access_token)
    const hash = window.location.hash;
    if (hash.includes('access_token')) {
      const params = new URLSearchParams(hash.slice(1));
      const accessToken = params.get('access_token');
      const scope = params.get('scope') || '';
      const expiresIn = params.get('expires_in');

      if (accessToken) {
        const storedUser = getItem(LocalStorageKeys.CURRENT_USER) || getUserDefaultState();
        storedUser.googleAccessTokenToGD = {
          access_token: accessToken,
          expires_in: Number(expiresIn),
          scope,
          token_type: 'Bearer',
          receivedAt: new Date().toISOString(),
        };
        storedUser.loggedIn = true;
        storedUser.scopes = scope
          .split(GDScopePrefix)
          .map(s => s.trim())
          .filter(Boolean);

        setItem(LocalStorageKeys.CURRENT_USER, storedUser);
        // Clean token from URL so it's not visible or reused on refresh
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        log.appEvent('GoogleAuth: Access token received from redirect', storedUser);
        document.dispatchEvent(new Event('loadFilesFromGoogleDrive'));
      }
    }

    const initGoogleAuth = () => {
      // ux_mode: 'redirect' avoids the popup + storagerelay:// mechanism
      // that Chrome flags as "legacy Google Sign-In".
      // redirect_uri must be registered in Google Cloud Console → OAuth client → Authorized redirect URIs.
      googleSignInRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        scope: minimalGDscopes.join(' '),
        ux_mode: 'redirect',
        redirect_uri: window.location.origin + window.location.pathname,
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
        scope: AllGDscopes.join(' '),
      });
    }
  }, []);

  const login = useCallback(() => {
    if (googleSignInRef.current) {
      googleSignInRef.current.requestAccessToken();
    }
  }, []);

  const logout = useCallback(() => {
    clearLocalStorage();
    setAllStates(defaultAllStates);
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
