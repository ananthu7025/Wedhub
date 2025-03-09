// "use server";

// import { redirect } from "next/navigation";
// import { API_ENDPOINTS } from "@/config/api";
// import { clearTokens, setAccessToken, setRefreshToken } from "@/lib/cookies";
// import {
//   ForgotPassResponse,
//   ForgotPasswordTokenResponse,
//   LoginRespClient,
//   LoginResponse,
//   ResendMailResponse,
//   SignupData,
//   SignupResponse,
//   VerifyTokenResponse,
// } from "@/types";
// import {
//   httpPost,
//   ResponseObject,
//   ErrorResponse,
//   httpGet,
//   httpPut,
// } from "@/lib/api";

// // logout action
// export const logoutAction = async () => {
//   clearTokens();
//   redirect("/en/login");
// };

// // login action
// export const loginAction = async (
//   data: object
// ): Promise<ResponseObject<LoginRespClient>> => {
//   const response: ResponseObject<LoginRespClient> = {
//     errors: [],
//     messages: [],
//   };

//   let loginResponse: LoginResponse | undefined;

//   try {
//     const resp = await httpPost<LoginResponse>(API_ENDPOINTS.AUTH.LOGIN, data);

//     loginResponse = resp.data.data;
//     response.data = {
//       fullName: loginResponse?.fullName || "",
//       email: loginResponse?.email || "",
//     };
//   } catch (err) {
//     // get errors
//     const error = err as ErrorResponse;
//     response.errors = error?.response?.data?.errors || [
//       "An unexpected error occurred. Please try again later.",
//     ];
//   }

//   // redirect to the intended destination or default private route if no errors
//   if (response.errors?.length === 0 && !loginResponse?.flags?.isEmailVerified) {
//     if (response.data) response.data.redirect = `/verifymail/${123454545}`;
//   }

//   // if token is present we only need to set this as cookie, need to handle after valid token int
//   if (response.errors?.length === 0) {
//     // set cookies
//     setAccessToken(loginResponse?.authTokens?.token || "abcd");
//     setRefreshToken(loginResponse?.authTokens?.refreshToken || "1234");
//   }

//   return response;
// };

// // forgot password
// export const forgotPassAction = async (data: {
//   email: string;
// }): Promise<ResponseObject<object>> => {
//   const response: ResponseObject<object> = {
//     errors: [],
//     messages: [],
//     data,
//   };

//   try {
//     const res = await httpPost<ForgotPassResponse>(
//       API_ENDPOINTS.AUTH.RESET_PASS_EMAIL,
//       data
//     );

//     response.data = res.data.data;
//     response.messages = res.data.messages;
//   } catch (err) {
//     const error = err as ErrorResponse;
//     response.errors = error?.response?.data?.errors || [
//       "An unexpected error occurred. Please try again later.",
//     ];
//   }

//   return response;
// };

// // confirm password
// export const confirmPassAction = async (data: {
//   token: string;
//   password: string;
// }): Promise<ResponseObject<object>> => {
//   const response: ResponseObject<object> = {
//     errors: [],
//     messages: [],
//     data,
//   };

//   try {
//     const res = await httpPut<ForgotPassResponse>(
//       API_ENDPOINTS.AUTH.CONFIRM_PASS,
//       data
//     );

//     response.data = res?.data?.data;
//     response.messages = res?.data?.messages;
//   } catch (err) {
//     const error = err as ErrorResponse;
//     response.errors = error?.response?.data?.errors || [
//       "An unexpected error occurred. Please try again later.",
//     ];
//   }

//   return response;
// };

// // validate link expiry
// export const validateForgotPasswordToken = async (data: {
//   token: string;
// }): Promise<ResponseObject<{ isExpired: boolean }>> => {
//   const response: ResponseObject<{ isExpired: boolean }> = {
//     errors: [],
//     messages: [],
//     data: { isExpired: false },
//   };

//   try {
//     const { token } = data;
//     const res = await httpGet<ForgotPasswordTokenResponse>(
//       `${API_ENDPOINTS.AUTH.VALIDATE_FORGOT_PASSWORD_TOKEN}?token=${token}`
//     );

//     response.data = res?.data?.data;
//     response.messages = res?.data?.messages;
//   } catch (err) {
//     const error = err as ErrorResponse;
//     response.errors = error?.response?.data?.errors || [
//       "An unexpected error occurred. Please try again later.",
//     ];
//   }

//   return response;
// };

// // signup action
// export const signupAction = async (
//   data: SignupData
// ): Promise<ResponseObject<SignupResponse>> => {
//   const response: ResponseObject<SignupResponse> = {
//     errors: [],
//     messages: [],
//     data: { saveStatus: false, userId: "" },
//   };

//   try {
//     const res = await httpPost<SignupResponse>(API_ENDPOINTS.AUTH.SIGNUP, data);

//     response.data = res?.data?.data;
//   } catch (err) {
//     const error = err as ErrorResponse;
//     response.errors = error?.response?.data?.errors || [
//       "An unexpected error occurred. Please try again later.",
//     ];
//   }

//   return response;
// };

// // verify mail request
// export const verifyMailAction = async (data: {
//   token: string;
// }): Promise<ResponseObject<{ isEmailVerified: boolean }>> => {
//   const response: ResponseObject<{ isEmailVerified: boolean }> = {
//     errors: [],
//     messages: [],
//     data: { isEmailVerified: false },
//   };

//   try {
//     const res = await httpPut<VerifyTokenResponse>(
//       API_ENDPOINTS.AUTH.VERIFYMAIL,
//       data
//     );

//     response.data = res?.data?.data;
//     response.messages = res?.data?.messages;
//   } catch (err) {
//     const error = err as ErrorResponse;
//     response.errors = error?.response?.data?.errors || [
//       "An unexpected error occurred. Please try again later.",
//     ];
//   }

//   return response;
// };

// // resend mail request
// export const resendmailAction = async (data: {
//   id: string;
// }): Promise<ResponseObject<object>> => {
//   const response: ResponseObject<object> = {
//     errors: [],
//     messages: [],
//     data,
//   };

//   try {
//     const res = await httpPost<ResendMailResponse>(
//       API_ENDPOINTS.AUTH.RESENDMAIL,
//       data
//     );

//     response.data = res?.data?.data;
//     response.messages = res?.data?.messages;
//   } catch (err) {
//     const error = err as ErrorResponse;
//     response.errors = error?.response?.data?.errors || [
//       "An unexpected error occurred. Please try again later.",
//     ];
//   }

//   return response;
// };
