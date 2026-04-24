import { useCallback, useState } from "react";
import { createSingletonProvider } from "../../services/reactProvider/singletonProvider";

import { storagePrefix } from "./storagePrefix.const";
import { getLocalstorageState } from "./getLocalstorageState";

export enum LocalStorageKeys {
  ALL_STATES = 'ALL_STATES',
  APP_STATE = 'APP_STATE',
  APP_VERSION = 'APP_VERSION',
  FILE_CONTENT = 'FILE_CONTENT',
  CURRENT_USER = 'CURRENT_USER',
}

export const _useLocalStorage = () => {
  const [items, setItems] = useState<Record<string, any>>(getLocalstorageState());

  const setItem = useCallback((keyOrObject: string | Record<string, any>, value: any) => {
    if (typeof keyOrObject === 'object') {
      let newState = {};

      Object.keys(keyOrObject).forEach((k) => {
        newState = {...newState, [k]: keyOrObject[k]};
        localStorage.setItem(storagePrefix + k, JSON.stringify(keyOrObject[k]));
      });

      setItems((state) => ({...state, ...newState}));
    } else {
      setItems((state) => ({...state, [keyOrObject]: value}));
      localStorage.setItem(storagePrefix + keyOrObject, JSON.stringify(value));
    }
  }, []);

  const getItem = useCallback((key: string) => {
    return items[key];
  }, [items]);

  const removeItem = useCallback((key: string) => {
    setItems((state) => {
      const newState = {...state};
      delete newState[key];
      return newState;
    });

    localStorage.removeItem(storagePrefix + key);
  }, []);

  const clearLocalStorage = useCallback(() => {
    Object.keys(getLocalstorageState() || {})
      .forEach((key) => removeItem(key));
  }, []);

  return {
    items,
    setItem,
    getItem,
    removeItem,
    clearLocalStorage,
  }
}

export const {
  Provider: LocalStorageProvider,
  useValue: useLocalStorage,
} = createSingletonProvider(_useLocalStorage, 'LocalStorage');
