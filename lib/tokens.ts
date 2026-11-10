import { randomUUID } from "node:crypto";
import { getVerificationTokenByEmail } from "@/data/verification-token";
import { db } from "@/lib/db";

export const generateVerificationToken = async (email: string) => {
  const token = randomUUID();
  const expires = new Date(Date.now() + 3600 * 1000);
  const existingToken = await getVerificationTokenByEmail(email);
  if (existingToken) {
    await db.verificationToken.delete({
      where: { id: existingToken.id },
    });
  }
  const verificationToken = await db.verificationToken.create({
    data: {
      token,
      expires,
      email,
    },
  });
  return verificationToken;
};
