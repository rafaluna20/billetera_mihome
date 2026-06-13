import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import fs from "fs"
import path from "path"

if (!getApps().length) {
  try {
    let serviceAccount: any = null;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    } else {
      const jsonPath = path.join(process.cwd(), "src/lib/firebase/serviceAccountKey.json");
      if (fs.existsSync(jsonPath)) {
        const fileContent = fs.readFileSync(jsonPath, "utf8");
        serviceAccount = JSON.parse(fileContent);
      }
    }

    if (serviceAccount) {
      initializeApp({
        credential: cert(serviceAccount)
      })
    } else {
      console.warn("Firebase Admin: No credentials found (neither FIREBASE_SERVICE_ACCOUNT_KEY env var nor serviceAccountKey.json exists).");
      // Fallback to default credentials if available
      initializeApp();
    }
  } catch (error) {
    console.error("Firebase admin initialization error", error)
  }
}

export const adminDb = getFirestore()
