import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import fs from "fs"
import path from "path"

if (!getApps().length) {
  try {
    let serviceAccount: any = null;

    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      } catch (parseError) {
        console.error("Firebase Admin: Error parsing FIREBASE_SERVICE_ACCOUNT_KEY environment variable. It is not valid JSON. Value starts with: " + (process.env.FIREBASE_SERVICE_ACCOUNT_KEY || "").substring(0, 20), parseError);
      }
    }

    if (!serviceAccount) {
      const jsonPath = path.join(process.cwd(), "src/lib/firebase/serviceAccountKey.json");
      if (fs.existsSync(jsonPath)) {
        try {
          const fileContent = fs.readFileSync(jsonPath, "utf8");
          serviceAccount = JSON.parse(fileContent);
        } catch (fileParseError) {
          console.error("Firebase Admin: Error parsing local serviceAccountKey.json file", fileParseError);
        }
      }
    }

    if (serviceAccount) {
      initializeApp({
        credential: cert(serviceAccount)
      })
    } else {
      console.warn("Firebase Admin: No credentials found or parsed successfully. Falling back to application default credentials.");
      initializeApp();
    }
  } catch (error) {
    console.error("Firebase admin initialization error", error);
    // Crucial fallback: ensure we initialize the default app to prevent getFirestore() from crashing at import time
    try {
      if (!getApps().length) {
        initializeApp();
      }
    } catch (fallbackError) {
      console.error("Firebase admin fallback initialization error", fallbackError);
    }
  }
}

export const adminDb = getFirestore()
