import { Link } from "react-router-dom";
import { useGoogleAuth } from "reactHooks/gis/googleAuth.hook";

import { ctrlBtnName } from "services/clientDevice/getPlatform";

import { useRecoilState } from "recoil";
import { leftDrawerSelector } from "state/localState/leftDrawerState";

import { Img } from "components/Atoms/Img/Img";
import { Icon } from "components/Atoms/Icon/Icon";
import { Menu } from "./Menu/Menu";

import "./Header.css";
import { activeFileInfoSelector } from "state/localState/activeFile/activeFileInfoState";
import { capitalize } from "services/byJSTypes/string.service";
import { editorNameByType } from "components/FileViewers/FileViewers.types";

type Props = {
  simpleView?: boolean;
}

export const Header: React.FC<Props> = ({ simpleView }) => {
  const [drawerState, setDraverState] = useRecoilState(leftDrawerSelector);
  const [activeFileInfo, setActiveFileInfo] = useRecoilState(activeFileInfoSelector);

  const { currentUser, login } = useGoogleAuth();

  const isNotRoot = window.location.pathname !== '/';
  const loggedIn = currentUser?.loggedIn;

  const toggleDrawer = () => {
    const nextDrawerState = {
      ...drawerState,
      open: !drawerState.open,
      width: drawerState.width < 100 ? 300 : drawerState.width
    };

    setDraverState(nextDrawerState);
  }

  return (
    <header className="Header">
      <div className="Header__leftPart">
        {!loggedIn && <div className="Header__logo"></div>}

        {simpleView
          ? isNotRoot && <Link to="/" className="BackLink">
              <Icon>arrow_back</Icon>
              Back to App
            </Link>
          : loggedIn && <div
              title={`${drawerState.open ? 'Close' : 'Open'} sidebar (${ctrlBtnName} + B)`}
              onClick={toggleDrawer}
              className="Header__icon-button">
              <Icon size="1.5rem">{drawerState.open ? "toggle_on" : "toggle_off"}</Icon>
            </div>
        }

        <div className="Header__buttons">
          {editorNameByType[activeFileInfo.viewType]}
        </div>
      </div>

      <div className='Header__middlePart'>
      </div>

      {!simpleView &&
        <div className="Header__rightPart">
          <a
            href='https://donatello.to/hoxz'
            rel='noreferrer'
            target='_blank'
            className="Header__donateButton button">
            <Icon size="1.25rem">favorite</Icon>
            Donate
          </a>

          {loggedIn
            ? <Menu />
            : <button
                onClick={login}
                className="Header__loginButton">
                Sign in
              </button>
          }

          {loggedIn && currentUser.userInfo?.picture &&
            <div
              title={currentUser.userInfo.email}
              className="Header__userIcon">
              <Img
                crossOrigin="anonymous"
                onError={(e) => {
                  const getFirstLetterrs = (str: string) => str.split(' ').map(word => word[0]).join('');
                  e.currentTarget.src = `https://placehold.co/28x28/000000/FFFFFF/png?text=${getFirstLetterrs(currentUser.userInfo.name)}`;
                }}
                src={currentUser.userInfo.pictureBase64 || currentUser.userInfo.picture}
                alt={currentUser.userInfo.email} />
            </div>
          }
        </div>
      }
    </header>
  );
}
