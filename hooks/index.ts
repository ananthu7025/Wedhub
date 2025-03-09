import Contents from "@/config/content";
import { AppDispatch, RootState } from "@/store";
import { usePathname } from "next/navigation";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";

// get pathname with language
export function useLanguage() {
  const pathname = usePathname();
  const lang = pathname.split("/")[1] as (typeof Contents.languages)[number];
  return Contents.languages.includes(lang) ? lang : Contents.languages[0];
}

// get content on client side
export function useContent() {
  const lang = useLanguage();
  return Contents.content(lang);
}

// custom hooks for typed redux usage
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
