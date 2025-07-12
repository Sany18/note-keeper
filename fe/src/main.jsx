import { GapiProvider } from 'reactHooks/gapi/useGapi.hook';
import { RouterProvider } from 'react-router-dom';
import { providerWrapper } from 'services/reactProvider/providerWrapper';
import { ExplorerProvider } from 'reactHooks/fileManager/explorer/explorer.hook';
import { ActiveFileProvider } from 'reactHooks/fileManager/activeFile/activeFile.hook';
import { GoogleAuthProvider } from 'reactHooks/gis/googleAuth.hook';
import { LocalStorageProvider } from 'reactHooks/localStorage/localStorage.hook';
import ReactDOM from 'react-dom/client';

import { RecoilRoot } from 'recoil';

import { router } from 'pages/router.tsx';
import registerWorker from '../public/registerWorker';
import SW from '../public/serviceWorker.js?worker&url';

import 'assets/css/index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  providerWrapper(
    LocalStorageProvider,
    RecoilRoot,
    ActiveFileProvider,
    ExplorerProvider,
    GoogleAuthProvider,
    GapiProvider,
    RouterProvider, { router }
  )
);

registerWorker(SW);
