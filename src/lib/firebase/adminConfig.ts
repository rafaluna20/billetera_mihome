import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import serviceAccount from "./serviceAccountKey.json"

if (!getApps().length) {
  try {
    initializeApp({
      credential: cert(serviceAccount as any)
    })
  } catch (error) {
    console.error("Firebase admin initialization error", error)
  }
}

export const adminDb = getFirestore()
