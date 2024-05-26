import { Contact } from "@prisma/client";
import { size } from "lodash";
import prisma from "../lib/prisma";

// Get all the Primary Contacts from the contacts Array for given user params
export const getPrimaryContacts = async (contacts: Contact[]) => {
  const primaryData = contacts.filter((e) => e.linkPrecedence === "primary");
  if (size(primaryData)) return primaryData;
  const secData = contacts.find((e) => e.linkPrecedence === "secondary");
  if (size(secData) && secData && secData.linkedId) {
    return await prisma.contact.findMany({
      where: {
        linkPrecedence: "primary",
        id: secData.linkedId,
      },
    });
  }
};

// Creates a valid query for prisma by removing null values
export const getValidQuery = (
  phoneNumber?: string | null,
  email?: string | null
) => {
  let filters = [];
  if (phoneNumber) {
    filters.push({ phoneNumber });
  }
  if (email) {
    filters.push({ email });
  }
  return filters;
};

// Bundle All emails or PhoneNumbers
export const bundleParams = (
  primaryValue: Contact,
  contacts: Contact[],
  key: "phoneNumber" | "email"
) => {
  return [
    primaryValue[key],
    ...contacts
      .map((contact) => contact[key])
      .filter(
        (value, index, self) =>
          value && value != primaryValue[key] && self.indexOf(value) === index
      ),
  ].filter(Boolean);
};
