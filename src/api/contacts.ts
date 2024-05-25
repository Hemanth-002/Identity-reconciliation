import { Request, Response } from "express";
import prisma from "../lib/prisma";

interface RequestPayload {
  email?: string;
  phoneNumber?: number;
}

const getConsolidatedContact = async (req: Request, res: Response) => {
  const { email, phoneNumber: mobileNumber }: RequestPayload = req.body;
  const phoneNumber = mobileNumber ? mobileNumber.toString() : null;

  if (!email && !phoneNumber) {
    return res
      .status(400)
      .json({ error: "Either email or phoneNumber is required" });
  }

  // Find if customer exists or else create a primary customer

  let contacts = await prisma.contact.findMany({
    where: {
      OR: [{ phoneNumber }, { email }],
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  // Cet the PrimaryContact if contacts are present
  let primaryContact;
  if (contacts && contacts.length) {
    primaryContact = contacts.find((e) => e.linkPrecedence === "primary");
  } else {
    primaryContact = await prisma.contact.create({
      data: {
        email: email,
        phoneNumber: phoneNumber,
        linkedId: null,
        linkPrecedence: "primary",
      },
    });
    contacts = [primaryContact];
  }

  const response = {
    contact: {
      primaryContatctId: primaryContact?.id,
      emails: contacts.map((c) => c.email).filter((e) => e),
      phoneNumbers: contacts.map((c) => c.phoneNumber).filter((p) => p),
      secondaryContactIds: contacts
        .filter((c) => c.linkPrecedence === "secondary")
        .map((c) => c.id),
    },
  };

  res.status(200).json(response);
};

export default getConsolidatedContact;
