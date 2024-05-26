import { Request, Response } from "express";
import { Contact } from "@prisma/client";
import size from "lodash/size";
import prisma from "../lib/prisma";
import { getPrimaryContacts, getValidQuery, bundleParams } from "../util/utils";

interface RequestPayload {
  email?: string;
  phoneNumber?: number;
}

/**
 * Step 1:  Validate Input Params
 * Step 2:  Find all contacts with the given email or phone number
 * Step 3:  Find if same contact Exists
 * Step 3:  Fiterout All the Primary Contacts and store in primaryContacts array
 * Step 4:  As we are sorting based on createdAt in the begining the 1st element of primaryContacts array will be PrimaryContact
 * Step 5:  If there are 2 or more Primary contacts for a particular userInput update all the contacts to secondary while
 *          Oldest contact remained as “primary”
 * Step 6:  Create a new secondary contact if new information is presen
 * Step 7:  Create a primary contact if no contacts are found
 */

const getConsolidatedContact = async (req: Request, res: Response) => {
  try {
    const { email, phoneNumber: mobileNumber }: RequestPayload = req.body;
    const phoneNumber = mobileNumber ? mobileNumber.toString() : null;

    // Step 1:  Validate Input Params
    if (!email && !phoneNumber) {
      return res
        .status(400)
        .json({ error: "Either email or phoneNumber is required" });
    }

    // Step 2:  Find all contacts with the given email or phone number
    const contacts = await prisma.contact.findMany({
      where: {
        OR: getValidQuery(phoneNumber, email),
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    let primaryContact;

    // Step 3:  Find if same contact Exists
    const similarContact = contacts?.find(
      (e) => e.email === email && e.phoneNumber === phoneNumber
    );

    if (size(contacts)) {
      // Step 4:  As we are sorting based on createdAt in the begining the 1st element of primaryContacts array will be PrimaryContact
      const primaryContacts = await getPrimaryContacts(contacts);

      primaryContact = primaryContacts?.[0] as Contact;
      /**
    * Step 5:  If there are 2 or more Primary contacts for a particular userInput update all the contacts to secondary while
      Oldest contact remained as “primary”
      */
      if (primaryContacts && size(primaryContacts) >= 2 && !similarContact) {
        await prisma.contact.updateMany({
          where: {
            OR: getValidQuery(phoneNumber, email),
            NOT: {
              id: primaryContact.id,
            },
          },
          data: {
            linkPrecedence: "secondary",
            linkedId: primaryContact.id,
          },
        });
      }
      // Step 6:  Create a new secondary contact if new information is present
      else if (
        primaryContacts &&
        size(primaryContacts) == 1 &&
        email &&
        phoneNumber &&
        !similarContact
      ) {
        // create a secondary contact if there was no secondary
        await prisma.contact.create({
          data: {
            email: email,
            phoneNumber: phoneNumber,
            linkedId: primaryContacts[0].id,
            linkPrecedence: "secondary",
          },
        });
      }
    } else {
      // Step 7:  Create a primary contact if no contacts are found
      primaryContact = await prisma.contact.create({
        data: {
          email: email,
          phoneNumber: phoneNumber,
          linkedId: null,
          linkPrecedence: "primary",
        },
      });
    }

    // Get all the contacts after all the updation
    const updatedContacts = await prisma.contact.findMany({
      where: {
        linkedId: primaryContact.id,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Group all the emails and PhoneNumbers, remove duplicates aswell
    const emails = bundleParams(primaryContact, updatedContacts, "email");
    const phoneNumbers = bundleParams(
      primaryContact,
      updatedContacts,
      "phoneNumber"
    );

    const response = {
      contact: {
        primaryContatctId: primaryContact.id,
        emails,
        phoneNumbers,
        secondaryContactIds: updatedContacts
          .filter((c) => c.linkPrecedence === "secondary")
          .map((c) => c.id),
      },
    };
    res.status(200).json(response);
  } catch (error) {
    console.error("Error in getConsolidatedContact: ", error);
    res.status(500).json({ error: "Internal server error", errors: error });
  }
};

export default getConsolidatedContact;
