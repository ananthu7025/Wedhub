"use client";

import { ReactNode } from "react";
import { makeStore } from "./index";
import { Provider } from "react-redux";

const store = makeStore();

export default function StoreProvider({ children }: { children: ReactNode }) {
  return <Provider store={store}>{children}</Provider>;
}
