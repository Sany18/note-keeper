import { useEffect } from 'react';
import { useAppState } from 'reactHooks/appState/appState.hook';
import { useGoogleAuth } from 'reactHooks/gis/googleAuth.hook';

import { useRecoilState } from 'recoil';

import { sessionSelector } from 'state/sessionState/sessionState';

import { Header } from 'components/Header/Header';
import { Loader } from 'components/Loader/Loader';
import { Explorer } from 'components/Explorer/Explorer';
import { FileViewer } from 'components/FileViewers/FileViewers';

import './App.css';

export const App = () => {
  const [sessionState] = useRecoilState(sessionSelector);

  const { currentUser } = useGoogleAuth();
  const { saveAppState, loadAppState } = useAppState();

  useEffect(() => {
    setTimeout(loadAppState, 0);
  }, []);

  useEffect(() => {
    window.addEventListener('blur', saveAppState);
    window.addEventListener('beforeunload', saveAppState);

    return () => {
      window.removeEventListener('blur', saveAppState);
      window.removeEventListener('beforeunload', saveAppState);
    };
  }, [saveAppState]);

  return (
    <div className="App">
      {sessionState.isAppLoaded
        ? <>
            <Header />

            <div className="Workspace">
              {currentUser.loggedIn && <Explorer />}
              <FileViewer />
            </div>
          </>
        : <Loader />
      }
    </div>
  );
}

export default App;
