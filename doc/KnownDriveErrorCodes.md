https://content.googleapis.com/drive/v3/files/

403 - Only files with binary content can be downloaded. Use Export with Docs Editors files

401 - Invalid Credentials
How expired token response looks like:
{
  "error": {
    "code": 401,
    "message": "Request had invalid authentication credentials. Expected OAuth 2 access token, login cookie or other valid authentication credential. See https://developers.google.com/identity/sign-in/web/devconsole-project.",
    "errors": [
      {
        "message": "Invalid Credentials",
        "domain": "global",
        "reason": "authError",
        "location": "Authorization",
        "locationType": "header"
      }
    ],
    "status": "UNAUTHENTICATED"
  }
}
