import { BusinessInfo } from "@/types";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface AuthState {
  loading: boolean;
  businessInfo:BusinessInfo | null;
}
const initialState: AuthState = {
  loading: false,
  businessInfo:null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    updateLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    updateBusinessInfo: (state, action: PayloadAction<BusinessInfo>) => {
      state.businessInfo = action.payload;
    },
  },
});

export const { updateLoading } = authSlice.actions;

export default authSlice.reducer;
