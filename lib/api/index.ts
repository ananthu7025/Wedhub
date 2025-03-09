/* eslint-disable @typescript-eslint/no-explicit-any */
import http from "@/lib/axios";
import { AxiosResponse } from "axios";
import httpServer from "../axios/api";

// response type
export interface ResponseObject<T> {
  data?: T;
  messages: string[];
  errors: string[];
  red?: string;
}

async function withServerInterceptor<TData>(
  serverAction: () => Promise<AxiosResponse<ResponseObject<TData>>>
): Promise<ResponseObject<TData>> {
  const response: ResponseObject<TData> = {
    errors: [],
    messages: [],
  };

  try {
    const resp = await serverAction();
    response.data = resp.data.data;

    const messages = resp.data.messages;

    if (!messages || (messages && messages.length < 1))
      response.messages = ["Your request was processed successfully."];
    else response.messages = messages;
  } catch (err: unknown) {
    const errorResp = err as ErrorResponse;

    const errors = errorResp?.response?.data?.errors;

    // handle error
    if (!errors || (errors && errors.length < 1))
      response.errors = [
        "An unexpected error occurred. Please try again later.",
      ];
    else response.errors = errors;
  }

  // return handled response
  return response;
}

// http get api
export const httpGet = async <T>(url: string) => {
  return await withServerInterceptor(
    async () => await http.get<ResponseObject<T>>(url)
  );
};

// http post api
export const httpPost = async <T>(
  url: string,
  data?: object,
  config: object = {}
) => {
  return await withServerInterceptor(
    async () => await http.post<ResponseObject<T>>(url, data, config)
  );
};

// http put api
export const httpPut = async <T>(url: string, data: object) => {
  return await withServerInterceptor(
    async () => await http.put<ResponseObject<T>>(url, data)
  );
};

// http delete api
export const httpDelete = async <T>(url: string) => {
  return await withServerInterceptor(
    async () => await http.delete<ResponseObject<T>>(url)
  );
};

export interface ErrorResponse {
  response?: AxiosResponse<ResponseObject<object>>;
}

// access /api routes from server components
export const httpServerGet = <T>(url: string) =>
  httpServer.get<ResponseObject<T>>(url);
