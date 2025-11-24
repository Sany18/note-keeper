export const redirectToBrowserIfPlatformIsNotSupported = () => {
  const userAgent = window.navigator.userAgent.toLowerCase();
  const inAppBrowsers = ['instagram', 'fbav', 'linkedinapp', 'twitter', 'pinterest'];

  if (inAppBrowsers.some(app => userAgent.includes(app))) {
    window.location.href = 'https://sany18.github.io/note-keeper/';
  }
}
