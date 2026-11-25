import { createUserWithEmailAndPassword, getAuth, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, writeBatch } from "firebase/firestore";
import { auth, db, getSecondaryApp } from "@/lib/firebase";
import { Role, UserProfile } from "@/types/inventory";

/** Roles each creator may create (enforced again in firestore.rules). */
export const CREATABLE: Record<Role, Role[]> = {
  admin: ["manager", "noc", "support", "technician"],
  manager: ["support", "technician"],
  noc: [], support: [], technician: [],
};

export async function createStaff(creator: UserProfile, input: {
  email: string; password: string; name: string; phone: string; role: Role;
}) {
  if (!CREATABLE[creator.role].includes(input.role)) throw new Error("You cannot create this role.");
  const secondary = getAuth(getSecondaryApp());
  const cred = await createUserWithEmailAndPassword(secondary, input.email, input.password);
  await signOut(secondary); // admin session on the primary auth is untouched
  const profile: UserProfile = {
    uid: cred.user.uid, name: input.name, email: input.email, phone: input.phone,
    role: input.role, active: true, created_by: creator.uid, created_at: Date.now(),
  };
  await setDoc(doc(db, "users", profile.uid), profile);
  return profile;
}

/** One-time first-admin bootstrap; guarded by settings/bootstrap + firestore.rules. */
export async function bootstrapAdmin(email: string, password: string, name: string, phone = "") {
  if ((await getDoc(doc(db, "settings", "bootstrap"))).exists()) throw new Error("Already initialised.");
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const batch = writeBatch(db);
  batch.set(doc(db, "settings", "bootstrap"), { by: cred.user.uid, at: Date.now() });
  batch.set(doc(db, "users", cred.user.uid), {
    uid: cred.user.uid, name, email, phone, role: "admin", active: true, created_by: "bootstrap", created_at: Date.now(),
  });
  await batch.commit();
}
