import arbContent from "./ar";
import engContent from "./en";
import ContentSchema from "./schema";

const basic = {
  project_description: "WEDHUB",
  court_short_name: "WEDHUB",
  court_long_name: "WEDHUB",
  arb_centre_name: "WEDHUB",
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
