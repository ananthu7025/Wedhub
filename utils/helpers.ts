/* eslint-disable @typescript-eslint/no-explicit-any */
import Contents from "@/config/content";

// generate path with language
export const generatePath = (
  lang: (typeof Contents.languages)[number],
  path: string
) => {
  return `/${lang + path}`;
};

// get isd code from formatted phone number
export const getIsd = (formattedPhone: string) => {
  const phoneSplit = formattedPhone.split(" ");
  return phoneSplit[0].replace("+", "");
};

// get phone number
export const getPhone = (formattedPhone: string) => {
  const phoneSplit = formattedPhone.split(" ");

  if (phoneSplit?.length < 1) return "";

  const rawPhone =
    phoneSplit.slice(1).length > 0
      ? phoneSplit.slice(1).reduce((a, b) => a + b)
      : ""; 
  const phone = rawPhone?.replace(/[\s()-]/g, "");
  return phone;
};

// check for field error
type BasicObject = { [key: string]: any };

export const isError = (errObject: BasicObject, rawField: string): boolean => {
  const splitField = rawField.split(".");

  if (!errObject[splitField[0]]) return false;

  if (splitField.length === 1) {
    return true;
  } else {
    return isError(
      errObject[splitField[0]],
      splitField.slice(1).reduce((a, b) => {
        if (splitField.length === 1) {
          return a + b;
        } else return a + "." + b;
      })
    );
  }
};
