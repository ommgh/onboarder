import { db } from "@/lib/db";

export const getVerificationTokenByToken = async (token: string) => {
  try {
    const verrificationToken = await db.verificationToken.findUnique({
      where: { token },
    });
    return verrificationToken;
  } catch {
    return null;
  }
};

export const getVerificationTokenByEmail = async (email: string) => {
  try {
    const verrificationToken = await db.verificationToken.findFirst({
      where: { email },
    });
    return verrificationToken;
  } catch {
    return null;
  }
};
