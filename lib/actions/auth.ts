"use server";

import { Register, RegisterResponse } from "@/types";
import { ErrorResponse, httpPost, ResponseObject } from "../api";
import { API_ENDPOINTS } from "@/config/api";
import { setAccessToken, setRefreshToken } from "../cookies";

// save Arbitration Agreement action

export const signupAction = async (
  data: Register
): Promise<ResponseObject<RegisterResponse>> => {
  const response: ResponseObject<RegisterResponse> = {
    errors: [],
    messages: [],
  };

  let RegisterResponseResponse: RegisterResponse | undefined;

  try {
    const resp = await httpPost<RegisterResponse>(
      API_ENDPOINTS.AUTH.BASE_USER,
      data
    );

    RegisterResponseResponse = resp.data;
    response.data = RegisterResponseResponse;

    response.errors = resp.errors;
    response.messages = resp.messages;
  } catch (err) {
    // get errors
    const error = err as ErrorResponse;
    response.errors = error?.response?.data?.errors || [
      "An unexpected error occurred. Please try again later.",
    ];
  }
  // if token is present we only need to set this as cookie
  if (response.errors?.length === 0 && RegisterResponseResponse?.token) {
    // set cookies
    setAccessToken(RegisterResponseResponse?.token);
    setRefreshToken("sssssss", new Date());
  }

  return response;
};


export const sendOtp = async (
    data:{email?:string,otp? : string}
  ): Promise<ResponseObject<RegisterResponse>> => {
    const response: ResponseObject<RegisterResponse> = {
      errors: [],
      messages: [],
    };
  
    let RegisterResponseResponse: RegisterResponse | undefined;
  
    try {
      const resp = await httpPost<RegisterResponse>(
        API_ENDPOINTS.AUTH.OTP_VERIFY,
        data
      );
  
      RegisterResponseResponse = resp.data;
      response.data = RegisterResponseResponse;
  
      response.errors = resp.errors;
      response.messages = resp.messages;
    } catch (err) {
      // get errors
      const error = err as ErrorResponse;
      response.errors = error?.response?.data?.errors || [
        "An unexpected error occurred. Please try again later.",
      ];
    }
    // if token is present we only need to set this as cookie
    if (response.errors?.length === 0 && RegisterResponseResponse?.token) {
      // set cookies
      setAccessToken(RegisterResponseResponse?.token);
      setRefreshToken("sssssss", new Date());
    }
  
    return response;
  };


  export const loginAction = async (
    data:{email?:string,password? : string}
  ): Promise<ResponseObject<RegisterResponse>> => {
    const response: ResponseObject<RegisterResponse> = {
      errors: [],
      messages: [],
    };
  
    let RegisterResponseResponse: RegisterResponse | undefined;
  
    try {
      const resp = await httpPost<RegisterResponse>(
        API_ENDPOINTS.AUTH.LOGIN,
        data
      );
  
      RegisterResponseResponse = resp.data;
      console.log(RegisterResponseResponse,"kjhg");
      response.data = RegisterResponseResponse;
  
      response.errors = resp.errors;
      response.messages = resp.messages;
    } catch (err) {
      // get errors
      const error = err as ErrorResponse;
      response.errors = error?.response?.data?.errors || [
        "An unexpected error occurred. Please try again later.",
      ];
    }
    // if token is present we only need to set this as cookie
    if (response.errors?.length === 0 && RegisterResponseResponse?.token) {
      // set cookies
      setAccessToken(RegisterResponseResponse?.token);
      setRefreshToken("sssssss", new Date());
    }
  
    return response;
  };