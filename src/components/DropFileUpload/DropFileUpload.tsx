import { useDropzone } from 'react-dropzone';
import { useUploadFiles } from 'reactHooks/gapi/useUploadFiles.hook';
import { FC, useCallback, useEffect } from 'react';

import { useRecoilState } from 'recoil';

import { appSelector } from 'state/localState/appState';
import { sessionSelector } from 'state/sessionState/sessionState';
import { explorerSelector } from 'state/localState/explorerState';

import { Icon } from 'components/Atoms/Icon/Icon';

import './DropFileUpload.css';

type Props = {
  show?: boolean;
};

export const DropFileUpload: FC<Props> = ({ show }) => {
  const [appState, setAppState] = useRecoilState(appSelector);
  const [filesState, setFilesState] = useRecoilState(explorerSelector);
  const [sessionState, setSessionState] = useRecoilState(sessionSelector);

  const { uploadFiles } = useUploadFiles();

  useEffect(() => {
    setSessionState({ showDropzone: show });
  }, [show]);

  const onDrop = useCallback(acceptedFiles => {
    const parentId = filesState.fileTree?.[0]?.parents[0];

    uploadFiles(acceptedFiles, parentId)
  }, [filesState, uploadFiles])

  const closeDropZone = useCallback((e) => {
    e.stopPropagation();
    setSessionState({ showDropzone: false });
  }, [appState]);

  const {getRootProps, getInputProps, isDragActive} = useDropzone({ onDrop, noClick: true, noKeyboard: true });

  return (<>
    {sessionState.showDropzone &&
      <div
        onClick={() => setSessionState({ showDropzone: false })}
        className={`DropFileUpload__wrapper ${sessionState.showDropzone ? 'show' : 'hide'}`}>
        <div
          className="DropFileUpload"
          {...getRootProps()}>
          <input {...getInputProps()} />

          <button
            onClick={closeDropZone}
            className="DropFileUpload__close button-icon">
            <Icon>close</Icon>
          </button>

          { isDragActive
            ? <div className="DropFileUpload__text">
                <p>Drop the files here to upload to the main folder...</p>
                <Icon size="3rem">cloud_upload</Icon>
              </div>
            : <div className="DropFileUpload__text">
                <p>Drag 'n' drop some files here</p>
                <Icon>add</Icon>
              </div>
          }
        </div>
      </div>
    }
  </>)
}
