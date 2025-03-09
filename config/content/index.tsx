import arbContent from "./ar";
import engContent from "./en";
import ContentSchema from "./schema";

const basic = {
  project_description: "OAC Public Portal",
  court_short_name: "OAC",
  court_long_name: "Oman arbitration Centre",
  arb_centre_name: "Oman commercial arbitration centre",
};

// first element will be considered as default
const languages = ["en", "ar"] as const;

const Contents = {
  languages,
  basic,
  content: (lang: (typeof languages)[number]): ContentSchema => {
    switch (lang) {
      case "en":
        return engContent;
      case "ar":
        return arbContent as ContentSchema;
      default:
        return engContent;
    }
  },
};

export default Contents;
