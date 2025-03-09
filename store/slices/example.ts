import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface EmergencyState {
  loading: boolean;
 
}
const initialState: EmergencyState = {
  loading: false,
 
};

const emergencySlice = createSlice({
  name: "emergencyInterim",
  initialState,
  reducers: {
    updateLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const {
  updateLoading,
} = emergencySlice.actions;

export default emergencySlice.reducer;
