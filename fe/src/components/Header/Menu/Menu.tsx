import { Link } from "react-router-dom";
import { useRef } from "react";
import { useGoogleAuth } from "reactHooks/gis/googleAuth.hook";
import { useContextMenu } from "reactHooks/contextMenu/contextMenu.hook";

import { Icon } from "components/Atoms/Icon/Icon";

import "./Menu.css";

type Props = {}

export const Menu: React.FC<Props> = ({ }) => {
  const { logout } = useGoogleAuth();

  const menuEl = useRef(null);
  const { menuOpen, toggleMenu } = useContextMenu(menuEl);

  const renderVersion = () => {
    const version = import.meta.env.VITE_VERSION;
    return version ? `version ${version}` : '';
  }

  return <>
    <div
      ref={menuEl}
      title={menuOpen ? '' : 'Open menu'}
      onClick={toggleMenu}
      className="Header__icon-button Menu__toggle">
      <Icon size="1.5rem">
        menu
      </Icon>

      {menuOpen &&
        <div className="HeaderMenu contextMenu">
          <a
            href='https://github.com/Sany18/note-keeper/discussions'
            rel='noreferrer'
            title="Feedback"
            target='_blank'
            className="item">
            <Icon size="1.25rem">feedback</Icon>
            Feedback
          </a>

          <a
            href='https://github.com/Sany18/note-keeper/issues'
            rel='noreferrer'
            title="Report an issue"
            target='_blank'
            className="item">
            <Icon size="1.25rem">bug_report</Icon>
            Report bug
          </a>

          <Link
            to='/policy'
            className="item">
            <Icon size="1.25rem">policy</Icon>
            Privacy Policy
          </Link>

          <Link
            to='/terms-of-service'
            className="item">
            <Icon size="1.25rem">description</Icon>
            Terms of Service
          </Link>

          <div className="Menu__version item">
            <Icon size="1.25rem">commit</Icon>
            {renderVersion()}
          </div>

          <div
            onClick={logout}
            className="item">
            <Icon size="1.25rem">logout</Icon>
            Log out
          </div>
        </div>
      }
    </div>
  </>
}
