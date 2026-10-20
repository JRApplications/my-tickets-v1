import { appInstances } from '@wix/app-management';

// Wix bundles backend events separately from Astro, so Astro's virtual env
// module is not available here. Read the configured server secret at runtime.
const MY_APPS_STUDIO_CLIENT_SECRET = process.env.MY_APPS_STUDIO_CLIENT_SECRET;

export default appInstances.onAppInstanceRemoved((event) => {
  console.info('My Tickets app instance removed', {
    instanceId: event.metadata.instanceId ?? null,
  });

  sendNotificationToAppOwner().catch((error) => {
    console.error('Failed to send notification to app owner about app removal', {
      error: error instanceof Error ? error.message : String(error),
      instanceId: event.metadata.instanceId ?? null,
    });
  });
});

const sendNotificationToAppOwner = async () => {
  const notification = {
    "notificationTemplateId": "6377d9ca-c41e-4fb8-9441-90d7d06536fb",
    "dynamicValues": {
      "title": {
        "text": "My Tickets App"
      },
      "message": {
        "text": "A user has removed the My Tickets app from their site."
      }
    }
  };

  const createAuthToken = async () => {
    const body = {
      "client_id": "af53aa77-9c2b-41c7-9de2-72d494ad8dac",
      "client_secret": MY_APPS_STUDIO_CLIENT_SECRET,
      "grant_type": "client_credentials",
      "instance_id": "c09ebd12-b3b4-4a11-a573-be2ced0fd409"
    }

    const response = await fetch('https://www.wixapis.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Wix OAuth2 API rejected the request (${response.status}): ${details}`);
    }

    const data = await response.json();
    return data.access_token;
  }

  const authToken = await createAuthToken();
  if (!authToken) {
    throw new Error('Failed to obtain Wix OAuth2 access token to send notification.');
  }
  const response = await fetch('https://www.wixapis.com/notifications/v3/notify', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(notification),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Wix Notifications API rejected the request (${response.status}): ${details}`);
  }
}
