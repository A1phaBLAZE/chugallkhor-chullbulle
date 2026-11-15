import fs from 'node:fs';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const configUrl = new URL('../../firebase-applet-config.json', import.meta.url);
const firebaseConfig = fs.existsSync(configUrl)
  ? (JSON.parse(fs.readFileSync(configUrl, 'utf8')) as { projectId?: string })
  : {};

if (!getApps().length) {
  initializeApp({
    projectId:
      firebaseConfig.projectId ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      process.env.GCLOUD_PROJECT,
  });
}

export const adminAuth = getAuth();
