import { log } from 'services/log/log.service';

export interface UserInfo {
  email?: string;
  id?: string;
  name?: string;
  picture?: string;
  sub?: string;
}

/**
 * Get user information from Google access token
 * This uses the Google tokeninfo endpoint to get user details
 */
export const getUserInfoFromToken = async (accessToken: string): Promise<UserInfo | null> => {
  try {
    // Use Google's tokeninfo endpoint to get user information
    const response = await fetch(`https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${accessToken}`);

    if (!response.ok) {
      log.error('Failed to get user info from token:', response.status, response.statusText);
      return null;
    }

    const tokenInfo = await response.json();

    // If we have user_id (sub), we can use that as a stable identifier
    if (tokenInfo.user_id || tokenInfo.sub) {
      return {
        id: tokenInfo.user_id || tokenInfo.sub,
        email: tokenInfo.email,
        name: tokenInfo.name,
        picture: tokenInfo.picture,
        sub: tokenInfo.sub,
      };
    }

    log.error('No user ID found in token info:', tokenInfo);
    return null;
  } catch (error) {
    log.error('Error getting user info from token:', error);
    return null;
  }
};

/**
 * Get user information using Google People API
 * This is more reliable but requires additional scope
 */
export const getUserInfoFromPeopleApi = async (accessToken: string): Promise<UserInfo | null> => {
  try {
    const response = await fetch('https://people.googleapis.com/v1/people/me?personFields=names,emailAddresses,photos', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      log.error('Failed to get user info from People API:', response.status, response.statusText);
      return null;
    }

    const userData = await response.json();

    return {
      id: userData.resourceName?.split('/')[1], // Extract ID from resourceName
      email: userData.emailAddresses?.[0]?.value,
      name: userData.names?.[0]?.displayName,
      picture: userData.photos?.[0]?.url,
    };
  } catch (error) {
    log.error('Error getting user info from People API:', error);
    return null;
  }
};

/**
 * Get user information using multiple methods
 * Tries tokeninfo first, then People API as fallback
 */
export const getUserInfo = async (accessToken: string): Promise<UserInfo | null> => {
  // Try tokeninfo first (simpler and doesn't require additional scopes)
  let userInfo = await getUserInfoFromToken(accessToken);

  if (!userInfo) {
    // Fallback to People API
    userInfo = await getUserInfoFromPeopleApi(accessToken);
  }

  return userInfo;
};

/**
 * Generate a stable user hash from user information
 * This should be consistent across sessions for the same user
 */
export const generateUserHash = async (userInfo: UserInfo): Promise<string> => {
  // Use the most stable identifiers available
  const userIdentifier = {
    id: userInfo.id || userInfo.sub,
    email: userInfo.email,
  };

  // Ensure we have at least one stable identifier
  if (!userIdentifier.id && !userIdentifier.email) {
    throw new Error('No stable user identifier available');
  }

  const userString = JSON.stringify(userIdentifier);
  console.log('Generating hash for user:', userIdentifier);

  // Use browser's crypto API for hashing
  const encoder = new TextEncoder();
  const data = encoder.encode(userString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  console.log('Generated user hash:', hashHex.slice(0, 16) + '...');
  return hashHex;
};

/**
 * Generate a fallback hash using access token
 * This is less stable but works when user info is not available
 */
export const generateFallbackHash = async (accessToken: string): Promise<string> => {
  // Use a more stable part of the access token
  // Google access tokens have a predictable structure, use the first part
  const tokenParts = accessToken.split('.');
  const stableTokenPart = tokenParts[0] || accessToken.slice(0, 32);

  console.log('Generating fallback hash from token');

  const encoder = new TextEncoder();
  const data = encoder.encode(stableTokenPart);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  console.log('Generated fallback hash:', hashHex.slice(0, 16) + '...');
  return hashHex;
};
