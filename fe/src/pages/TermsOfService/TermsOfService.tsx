import { Link } from 'react-router-dom';

import { Header } from 'components/Header/Header';

import './TermsOfService.css';

export const TermsOfService: React.FC = () => {
  const appName = <b>Note Keeper</b>
  const effectiveDate = <span>{new Date('2024-11-15').toLocaleDateString()}</span>;
  const myEmail = <a href="mailto:parubok.sashko@gmil.com">Alex Tans</a>

  return (
    <>
      <Header simpleView />

      <div className="TermsOfService">
        <h2>
          <strong>Terms of Service for {appName}</strong>
        </h2>

        <p>
          <strong>Effective Date:</strong> {effectiveDate}
        </p>

        <p>
          Welcome to {appName} (“we,” “our,” or “us”). These Terms of Service (“Terms”) govern your use of our website and
          application (collectively, the “App”), including any associated services and features. By using the App, you agree to
          these Terms. If you do not agree, please do not use the App.
        </p>

        <h3>
          <strong>1. Use of the App</strong>
        </h3>

        <p>
          1.1 <strong>Eligibility</strong><br/>You must be at least 13 years old (or the minimum legal age
          in your jurisdiction) to use the App. By using the App, you represent and warrant that you meet this
            eligibility requirement.
        </p>

        <p>
          1.2 <strong>Google Account Authentication</strong><br/>You must sign in using a valid Google account to access
          certain features of the App. By signing in, you agree to allow the App to interact with your Google Drive and other
            authorized Google services in accordance with your consent.
        </p>

        <p>
          1.3 <strong>Compliance</strong><br/>You agree to use the App in compliance with these Terms, all applicable laws,
          and any third-party terms, including Google’s Terms of Service and Privacy Policy.
        </p>

        <h3>
          <strong>2. Access to Google Drive</strong>
        </h3>

        <p>
          2.1 <strong>Scope of Access</strong><br/>With your explicit consent, the App accesses your Google Drive to:
        </p>

        <ul>
          <li>View and manage text files you select.</li>
          <li>Perform file operations (e.g., read, update, delete) as requested by you.</li>
        </ul>

        <p>2.2 <strong>Limitations</strong><br/>The App does not access files on your Google Drive without your
        authorization. It operates only within the scope of permissions granted by you.
        </p>

        <p>
          2.3 <strong>Revoking Permissions</strong><br/>You can revoke the App’s access to your Google account at any time
          through your Google account settings. However, doing so may limit the App’s functionality.
        </p>

        <h3>
          <strong>3. User Responsibilities</strong>
        </h3>

        <p>
          3.1 <strong>Account Security</strong><br/>You are responsible for maintaining the confidentiality of your Google account
          credentials and for any activity conducted through your account while using the App.
        </p>

        <p>
          3.2 <strong>Prohibited Activities</strong><br/>You agree not to:
        </p>

        <ul>
          <li>Use the App for unlawful or unauthorized purposes.</li>
          <li>Attempt to gain unauthorized access to the App or other users' data.</li>
          <li>Upload or share files containing malicious code or violating third-party rights.</li>
        </ul>

        <p>
          3.3 <strong>Data Ownership</strong><br/>You retain ownership of all files and data stored in your Google Drive.
          The App does not claim ownership of your files.
        </p>

        <h3>
          <strong>4. Privacy</strong>
        </h3>

        <p>
          Your use of the App is subject to our <Link to="/policy">Privacy Policy</Link>,
          which outlines how we collect, use, and protect your personal information.
        </p>

        <h3>
          <strong>5. Intellectual Property</strong>
        </h3>

        <p>
          5.1 <strong>Our Content</strong><br/>All content, code, and design elements within the App are the
          intellectual property of {appName} or its licensors and are protected by applicable laws.
          You may not copy, modify, or distribute these materials without our permission.
        </p>

        <p>
          5.2 <strong>Your Content</strong><br/>By using the App, you grant us permission to access and process your Google Drive
          files solely to provide the App’s intended functionality.
        </p>

        <h3>
          <strong>6. Service Availability</strong>
        </h3>

        <p>
          We strive to provide reliable access to the App but cannot guarantee uninterrupted service. We reserve
          the right to modify, suspend, or discontinue the App at any time without notice or liability.
        </p>

        <h3>
          <strong>7. Disclaimers</strong>
        </h3>

        <ul>
          <li>The App is provided “as is” and “as available,” without warranties of any kind, express or implied.</li>
          <li>We do not guarantee the accuracy or reliability of the App’s functionality.</li>
          <li>We are not responsible for any loss or damage resulting from your use of the App, including loss of files or data.</li>
        </ul>

        <h3>
          <strong>8. Limitation of Liability</strong>
        </h3>

        <p>
          To the fullest extent permitted by law, {appName} and its affiliates will not be liable for any indirect,
          incidental, special, or consequential damages arising from your use of the App, including but not limited to:
        </p>

        <ul>
          <li>Loss of data or files.</li>
          <li>Unauthorized access to your Google Drive account.</li>
        </ul>

        <h3>
          <strong>9. Termination</strong>
        </h3>

        <p>
          We may suspend or terminate your access to the App at our discretion for any reason, including violations
          of these Terms. Upon termination, your access to the App will cease, but you will retain ownership of your
          Google Drive data.
        </p>

        <h3>
          <strong>10. Changes to These Terms</strong>
        </h3>

        <p>
          We may update these Terms at any time. Changes will be effective upon posting. Continued use of the App
          after changes constitutes acceptance of the updated Terms.
        </p>

        <h3>
          <strong>11. Governing Law</strong>
        </h3>

        <p>
          These Terms are governed by the laws of Ukraine, without regard to its conflict of law principles.
        </p>

        <h3>
          <strong>12. Contact Us</strong>
        </h3>

        <p>
          If you have any questions or concerns about these Terms, please contact us at:
        </p>

        <ul>
          <li>Email: {myEmail}</li>
        </ul>
      </div>
    </>
  );
}
