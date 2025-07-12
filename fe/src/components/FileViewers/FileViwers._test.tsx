import { GapiProvider } from 'reactHooks/gapi/useGapi.hook';
import { render, screen } from '@testing-library/react';
import { providerWrapper } from 'services/reactProvider/providerWrapper';
import { GoogleAuthProvider } from 'reactHooks/gis/googleAuth.hook';
import { LocalStorageProvider } from 'reactHooks/localStorage/localStorage.hook';

import { RecoilRoot } from 'recoil';
import { useRecoilState } from 'recoil';

import { tree } from 'services/tests/treeHelperMock';

import { activeFileInfoSelector, defaultActiveFileInfoState } from '../../state/localState/activeFile/activeFileInfoState';

import { FileViewer } from './FileViewers';

jest.mock('recoil', () => ({
  ...jest.requireActual('recoil'),
  useRecoilState: jest.fn(),
}));

describe('FileViewer Component', () => {
  const mockUseRecoilState = useRecoilState as jest.Mock;
  const mockUseFileList = jest.fn();

  beforeEach(() => {
    mockUseRecoilState.mockImplementation((state) => {
      switch (state) {
        case activeFileInfoSelector:
          const defaultState = defaultActiveFileInfoState;

          return [defaultState, jest.fn()];
        default:
          return [null, jest.fn()];
      }
    });

    mockUseFileList.mockReturnValue({
      activeFile: tree[0],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('shows spinner when file is loading', () => {
    mockUseRecoilState.mockImplementation((state) => {
      // if (state === isLoadingState) return [true, jest.fn()];
      return [state, jest.fn()];
    });

    render(
      providerWrapper(
        RecoilRoot,
        LocalStorageProvider,
        GoogleAuthProvider,
        GapiProvider,
        FileViewer
      )
    );
    expect(screen.getByLabelText('loader')).toBeInTheDocument();
  });
});
