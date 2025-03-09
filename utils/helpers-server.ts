import { headers } from "next/headers";
import Contents from "@/config/content";

// get language on server side
export const getLanguage = () => {
  const headersList = headers();
  const lang = (headersList.get("x-pathname")?.split("/")[1] ||
    Contents.languages[0]) as (typeof Contents.languages)[number];
  return lang;
};

// get content on server side
export const getServerContent = () => {
  const lang = getLanguage();
  return Contents.content(lang);
};
