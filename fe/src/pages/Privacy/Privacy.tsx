import { Header } from 'components/Header/Header';

import './Privacy.css';

export const Privacy: React.FC = () => {
  const appName = <b>Note Keeper</b>
  const effectiveDate = <span>{new Date('2024-11-29').toLocaleDateString()}</span>;
  const mainLink = <a href="https://note-keeper.space/" target="_blank" rel="noreferrer">note-keeper.space</a>;
  const myEmail = <a href="mailto:parubok.sashko@gmil.com">Alex Tans</a>

  return (
    <>
      <Header simpleView />

      <div className="Policy">
        <h2>
          <strong>Privacy Policy for {appName}</strong>
        </h2>

        <p>
          <strong>Effective Date:</strong> {effectiveDate}
        </p>

        <p>
          {appName} ("we," "our," or "us") operates the {mainLink} web application (the "App").
          This Privacy Policy outlines how we collect, use, and protect the personal information of users who access
          or interact with the App.
        </p>

        <h3>
          <strong>1. Information We Collect</strong>
        </h3>

        <p>We do <b>not</b> collect private information. Our App uses only Google APIs and your browser</p>

        <ul>
          <li>When you sign in using your Google account, your browser store your name, email address, and profile picture from your Google profile.</li>
          <li>Also your browser can save the last edited file and list of file from Google Drive</li>
        </ul>

        <h4>
          <strong>1.2. Google Drive Data</strong>
        </h4>

        <ul>
          <li>With your explicit consent, the App access your Google Drive to read, edit, delete and create files that you choose to interact with through the App.</li>
        </ul>

        <h4>
          <strong>1.3. Automatically Collected Data</strong>
        </h4>

        <ul>
          <li>
            We may collect technical information, such as your browser type, and device information, to improve the App's
            performance and user experience.
          </li>
          <li>
            Any third side doesn't hand in with data transmission, editing, creating, or reading; only you within the App connecting with Google Drive API directly.
          </li>
        </ul>

        <h3>
          <strong>2. Data Retention and Deletion</strong>
        </h3>

        <p>
          We do not store any personal data on our servers.
          All user data is stored locally in your browser. If you wish to delete your data, you can do so by clearing your browser's local storage or click LOG OUT.
          Log out automatically deletes all data from your browser.
          We do not have access to delete your data on your behalf.
        </p>

        <p>
          The App tries to keep the last edited file and list of files from Google Drive in your browser's local storage.
          To remove it all from localstorage click Log out or clear your browser's local storage data.
        </p>

        <h3>
          <strong>3. How The App Use Your Information</strong>
        </h3>

        <p>The App use the information for the following purposes:</p>

        <ol>
          <li>To authenticate and identify you within the App.</li>
          <li>To have a full access and you manage your files on your Google Drive as requested by you.</li>
        </ol>

        <h3>
          <strong>3. How We Share Your Information</strong>
        </h3>

        <p>We do <strong>not</strong> sell, rent, or share your personal information with third parties, except as necessary to:</p>

        <ol>
          <li>Comply with legal obligations.</li>
          <li>Protect the rights, property, or safety of {appName}, our users, or the public.</li>
          <li>Integrate with trusted third-party services required for App functionality, such as Google APIs.</li>
        </ol>

        <h3>
          <strong>4. Data Security</strong>
        </h3>

        <p>We implement industry-standard security measures to protect your information. This includes:</p>

        <ul>
          <li>Using secure tokens for Google API access.</li>
          <li>Restricting data access to authorized personnel only.</li>
        </ul>

        <p>However, no method of transmission or storage is 100% secure, and we cannot guarantee absolute security.</p>

        <h3>
          <strong>5. Your Rights</strong>
        </h3>

        <p>You have the following rights regarding your data:</p>

        <ol>
          <li><strong>Revocation of Consent:</strong> You can revoke the App's access to your Google account at any time via your Google account settings.</li>
        </ol>

        <h3>
          <strong>6. Google API Compliance</strong>
        </h3>

        <p>Our App complies with the <strong>Google API Services User Data Policy</strong>. Specifically:</p>

        <ol>
          <li>We only access Google Drive data with your explicit consent.</li>
          <li>We use your Google Drive data exclusively for the App's functionality (e.g., managing your files).</li>
          <li>We do not use Google Drive data for advertising or unrelated purposes.</li>
        </ol>

        <p>
          For more information, visit the <span> </span>
          <a rel="noopener" target="_new" href='https://developers.google.com/terms/api-services-user-data-policy'>
            Google API Services User Data Policy
          </a>
        </p>

        <h3>
          <strong>7. Third-Party Services</strong>
        </h3>

        <p>
          The App integrates with Google services. By using the App, you agree to Google's Privacy Policy, available
          <span> </span>
          <a rel="noopener" target="_new" href='https://policies.google.com/privacy?hl=en-US'>
            here
          </a>
        </p>

        <h3>
          <strong>8. Changes to This Privacy Policy</strong>
        </h3>

        <p>
          We reserve the right to update this Privacy Policy at any time. Changes will be posted on this page, and the "Effective Date" will
          be updated accordingly. Continued use of the App after any changes constitutes acceptance of the revised Privacy Policy.
        </p>

        <h3>
          <strong>9. Contact Us</strong>
        </h3>

        <p>If you have any questions or concerns about this Privacy Policy, you can contact us at:</p>

        <ul>
          <li>Email: {myEmail}</li>
          {/* <li>Website: [Your Website URL]</li> */}
        </ul>
      </div>
    </>
  );
}
