import { Link } from 'react-router-dom';
import { useGoogleAuth } from 'reactHooks/gis/googleAuth.hook';

import './WelcomePage.css';

export const WelcomePage: React.FC = () => {
  const { login } = useGoogleAuth();

  return (
    <div className="WelcomePage">
      <h1>Welcome to Note Keeper</h1>

      <p>
        The purpose of the Application is to provide <b>Google Drive</b> as a storage for private notes and documents.<br />
        <b>Easy</b>, <b>secure</b>, <b>fast</b>, <b>cached</b>, <b>crossplatform</b> and <b>free</b> access to your notes.<br />
        ...And all the data is stored in your <b>Google Drive</b>.
      </p>

      <ol>
        <li>
          All data saves on your <b>Google Drive</b><br/>
        </li>
        <li>
          Create notes, save information, and access your files <b>from any device</b> (Windows, Linux, iOS, Mac, Android)<br/>
        </li>
        <li>
          You can open every file via <b>Google Drive</b>. Just press "OPEN IN GOOGLE DRIVE"<br/>
        </li>
        <li>
          Only your direct permission provides access to selected file<br/>
        </li>
        <li>
          You can even remove the application from your <b>Google Account</b> at any time<br/>
          Your data will be safe and sound on your <b>Google Drive</b>
        </li>
      </ol>

      <h2>Plans</h2>
      <ul>
        <li>Disable drag'n'drop on mobile devices</li>
        <li>Add Ukrainian language support</li>
        <li>Add configuration panel~page</li>
        <li>Add 5 recently opened files</li>
      </ul>

      <h2>What's new</h2>
      <ul>
        <li>28/02/2025</li>
        <li>Improved fonts loading</li>
        <li>Added webp support for the Image viewer</li>
        <li>Splitted access rights. From now on, access to user files is optional</li>
      </ul>

      <ul>
        <li>12/01/2025</li>
        <li>Added context menu for left drawer</li>
        <li>Added file upload/move operation (including drag'n'drop)</li>
      </ul>

      <p>
        To start using the app, please sign in with your <span> </span>
        <button
          style={{ margin: '0.5rem' }}
          onClick={login}>
          Google Account
        </button>
      </p>

      <p>
        Using the app you agree to the <Link to='/policy'>Privacy Policy</Link> and <Link to='/terms-of-service'>Terms of Service</Link>
      </p>
    </div>
  );
}
